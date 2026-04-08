import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import { fetchNearbyResourcesOSR, getORSRoute, selectAgentResources, enrichResourcesWithOSR } from "../services/rescueFinder";
import { selectBestResourcesAI } from "../services/agents";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PRIORITY_ORDER = {
  "CRITICAL": 1,
  "HIGH": 2,
  "MEDIUM": 3,
  "LOW": 4,
  "PENDING": 5
};

export const DispatchScreen = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState({});
  const [resources, setResources] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);
  const [aiRequirements, setAiRequirements] = useState(null);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [systemPhase, setSystemPhase] = useState("ANALYZING");
  const [currentDispatchIdx, setCurrentDispatchIdx] = useState(-1);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayer = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    const incidentsRef = ref(database, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) setIncidents(snapshot.val());
      else setIncidents({});
    });
    return () => unsubscribe();
  }, []);

  const sortedIncidents = Object.values(incidents).sort((a, b) => {
    const pA = a.severity_block?.severity || "PENDING";
    const pB = b.severity_block?.severity || "PENDING";
    const diff = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
    if (diff === 0) return (b.severity_block?.priority_score || 0) - (a.severity_block?.priority_score || 0) || b.timestamp - a.timestamp;
    return diff;
  });

  const highest = sortedIncidents[0];

  useEffect(() => {
    if (!highest) return;
    const runAllocation = async () => {
      setIsScanning(true); setIsAllocating(true); setSelectedResources([]);
      setAiRequirements(null); setSimulationLogs([]); setSystemPhase("ANALYZING");
      setCurrentDispatchIdx(-1);
      const lat = highest.coordinates?.lat || highest.lat || 12.9716;
      const lng = highest.coordinates?.lng || highest.lng || 77.5946;
      const updateLog = (msg) => setSimulationLogs(prev => [...prev, { unit: "System", status: msg, timestamp: Date.now() }]);
      const found = await fetchNearbyResourcesOSR(lat, lng, highest, updateLog);
      if (!found || found.length === 0) { setIsAllocating(false); return; }
      const enriched = await enrichResourcesWithOSR(found, lat, lng);
      setResources(enriched); setIsScanning(false);
      await new Promise(r => setTimeout(r, 1000)); setSystemPhase("SELECTING");
      const aiResponse = await selectBestResourcesAI(highest, enriched);
      let selected = aiResponse?.selected || selectAgentResources(enriched, highest.disaster_type, highest.severity_block?.severity);
      let uniqueSelected = []; const seenNames = new Set();
      selected.forEach(r => { if(!seenNames.has(r.name)) { uniqueSelected.push({...r, assignedCount: 1}); seenNames.add(r.name); }});
      let finalSelected = [...uniqueSelected];
      setSelectedResources(finalSelected);
      const defaultReqs = {};
      uniqueSelected.forEach(res => {
        const label = res.type === 'fire_station' ? 'Fire Units' : 
                      res.type === 'police' ? 'Police Units' : 
                      res.type === 'hospital' ? 'Medical Units' : 'Rescue Units';
        defaultReqs[label] = (defaultReqs[label] || 0) + 1;
      });
      setAiRequirements(aiResponse?.requirements || defaultReqs);
      await new Promise(r => setTimeout(r, 1000)); setSystemPhase("DISPATCHING");
      for (let i = 0; i < finalSelected.length; i++) {
        setCurrentDispatchIdx(i);
        setSimulationLogs(prev => [...prev, { unit: finalSelected[i].name, status: "Acknowledge", timestamp: Date.now() }]);
        await new Promise(r => setTimeout(r, 1500));
      }
      setSystemPhase("COMPLETE"); setIsAllocating(false);
    };
    runAllocation();
  }, [highest?.id]);

  useEffect(() => {
    if (selectedResources?.length > 0 && systemPhase === "COMPLETE") {
      const timer = setTimeout(() => navigate("/tracking", { state: { incident: highest, resources: selectedResources } }), 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedResources, systemPhase]);

  return (
    <div className="w-full h-screen grid grid-cols-1 md:grid-cols-[400px_1fr] bg-[radial-gradient(circle_at_top_right,_#0B0F17,_#05070B_80%)] overflow-hidden p-6 gap-6">
      
      {/* LEFT PANEL: TELEMETRY (FIXED 400px) */}
      <div className="flex flex-col h-full bg-[#0B0F17]/50 backdrop-blur-2xl border border-white/[0.06] rounded-[2rem] p-6 overflow-y-auto scrollbar-hide shadow-2xl">
        <header className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.03]">
          <h2 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Mission Data</h2>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span><span className="text-[9px] font-black text-[#00E5FF]">LINK ACTIVE</span></div>
        </header>

        {!highest ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10"><Cpu size={40} /><p className="text-[10px] font-bold mt-2">NO DATA</p></div>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] aspect-video group bg-black shadow-inner">
              <img src={highest.image_url} className="w-full h-full object-cover opacity-60 transition-transform group-hover:scale-105 duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070B] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4"><h1 className="text-[#E6EDF3] text-xl font-black capitalize tracking-tight">{highest.disaster_type?.replace('_', ' ')}</h1></div>
            </div>

            <div className="p-5 bg-[#0F1623]/40 border border-white/[0.06] rounded-3xl shadow-inner relative overflow-hidden group">
              <p className="text-[9px] text-[#00E5FF] font-black uppercase tracking-widest mb-2 opacity-50 font-black">Operational Sector</p>
              <p className="text-sm text-[#E6EDF3] font-black tracking-tight mb-4">{highest.location || "Coordinating Area..."}</p>
              <div className="h-px w-full bg-white/[0.03] mb-4" />
              <p className="text-[11px] text-[#9CA3AF] leading-relaxed font-medium italic opacity-60 tracking-tight">{highest.description || "Synthesizing visual context..."}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0F1623]/60 border border-white/[0.06] rounded-2xl text-center">
                <p className="text-[9px] text-[#9CA3AF] font-black uppercase mb-1">Severity</p>
                <p className={`text-sm font-black tracking-widest ${highest.severity_block?.severity === 'CRITICAL' ? 'text-[#EF4444]' : 'text-[#DC2626]'}`}>{highest.severity_block?.severity || "HIGH"}</p>
              </div>
              <div className="p-4 bg-[#0F1623]/60 border border-white/[0.06] rounded-2xl text-center">
                <p className="text-[9px] text-[#9CA3AF] font-black uppercase mb-1">Confidence</p>
                <p className="text-sm font-black text-[#00E5FF] tracking-widest">{(highest.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: AI DECISION CORE */}
      <div className="flex flex-col h-full bg-[#0B0F17]/50 backdrop-blur-2xl border border-white/[0.06] rounded-[2rem] p-8 overflow-y-auto scrollbar-hide shadow-2xl relative">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.03]">
          <h2 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] flex items-center gap-3">
             <span className="w-10 h-px bg-white/10"></span> Decision Infrastructure
          </h2>
          <div className="flex items-center gap-3 bg-[#0F1623]/40 px-3 py-1 rounded-full border border-white/[0.06] shadow-[0_0_10px_rgba(0,229,255,0.05)]"><span className="text-[9px] font-black text-[#00E5FF]">NEURAL ENGINE ACTIVE</span></div>
        </header>

        {systemPhase === "ANALYZING" || systemPhase === "SELECTING" ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
               <div className="absolute inset-0 border border-[#00E5FF] border-t-transparent rounded-full animate-spin opacity-20" />
               <div className="w-12 h-12 bg-black rounded-full border border-white/[0.06] flex items-center justify-center shadow-inner"><Cpu size={24} className="text-[#00E5FF]/40" /></div>
            </div>
            <p className="text-[10px] font-black text-[#9CA3AF]/20 uppercase tracking-[0.4em] animate-pulse">Calculating Resource Vectors</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* COMPACT SECTION 1: UNIT REQUIREMENTS */}
            <div className="space-y-4">
              <div className="flex items-center gap-4"><div className="text-[10px] font-black text-white/10">01</div><h3 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Requirements</h3><div className="flex-1 h-px bg-white/[0.03]"></div></div>
              <div className={`grid gap-4 ${
                ['Fire Units', 'Police Units', 'Medical Units', 'Rescue Units'].filter(u => (aiRequirements?.[u] || 0) > 0).length === 4 ? 'grid-cols-4' :
                ['Fire Units', 'Police Units', 'Medical Units', 'Rescue Units'].filter(u => (aiRequirements?.[u] || 0) > 0).length === 3 ? 'grid-cols-3' :
                ['Fire Units', 'Police Units', 'Medical Units', 'Rescue Units'].filter(u => (aiRequirements?.[u] || 0) > 0).length === 2 ? 'grid-cols-2' :
                'grid-cols-1'
              }`}>
                {['Fire Units', 'Police Units', 'Medical Units', 'Rescue Units']
                  .filter(unit => (aiRequirements?.[unit] || 0) > 0)
                  .map(unit => {
                    const num = aiRequirements?.[unit] || 0;
                    return (
                      <div key={unit} className="p-4 bg-[#0F1623]/60 border border-white/[0.06] rounded-2xl shadow-inner group transition-all hover:bg-[#0F1623]/80 hover:border-[#00E5FF]/30">
                         <p className="text-[9px] text-[#9CA3AF] font-black mb-2 uppercase opacity-40 leading-none tracking-tight">{unit}</p>
                         <p className="text-xl font-black text-[#E6EDF3] leading-none">{num}</p>
                      </div>
                    );
                })}
              </div>
            </div>

            {/* COMPACT SECTION 2: MOBILE RESPONSE CENTERS */}
            <div className="space-y-4">
              <div className="flex items-center gap-4"><div className="text-[10px] font-black text-white/10">02</div><h3 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Allocated Assets</h3><div className="flex-1 h-px bg-white/[0.03]"></div></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {selectedResources.map((res, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-[#0F1623]/60 border border-white/[0.06] rounded-2xl group transition-all hover:bg-[#0F1623]/80 hover:border-[#00E5FF]/30">
                     <div className="w-10 h-10 rounded-xl bg-black border border-white/[0.06] flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                        {res.type === 'fire_station' ? '🚒' : res.type === 'police' ? '🚓' : res.type === 'hospital' ? '🚑' : '🛟'}
                     </div>
                     <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[11px] font-black text-[#E6EDF3] truncate mb-0.5 tracking-tight uppercase">{res.name}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-[#00E5FF] bg-[#00E5FF]/5 px-1.5 py-0.5 rounded border border-[#00E5FF]/10 uppercase tracking-tighter">Verified</span>
                           <span className="text-[9px] font-black text-white/20 uppercase">{res.assignedCount || 1} Unit Allocated</span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COMPACT SECTION 3: DISPATCH STATUS */}
            <div className="space-y-4">
              <div className="flex items-center gap-4"><div className="text-[10px] font-black text-white/10">03</div><h3 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Signal Verification</h3><div className="flex-1 h-px bg-white/[0.03]"></div></div>
              <div className="bg-black/40 border border-white/[0.06] rounded-2xl p-4 shadow-inner space-y-2">
                {selectedResources.map((res, i) => {
                  const disp = simulationLogs.some(l => l.unit === res.name);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#0F1623]/40 rounded-xl border border-white/[0.03]">
                       <div className="flex items-center gap-3"><div className={`w-1.5 h-1.5 rounded-full transition-all ${disp ? 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]' : 'bg-white/10 animate-pulse'}`} /><p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-tighter truncate max-w-[150px]">{res.name}</p></div>
                       <span className={`text-[8px] font-black px-2 py-1 rounded border transition-all ${disp ? 'text-[#22C55E] border-[#22C55E]/20 bg-[#22C55E]/5' : 'text-white/10 border-white/5'}`}>{disp ? 'AUTHENTICATED' : 'WAITING...'}</span>
                    </div>
                  );
                })}
              </div>
              {systemPhase === "COMPLETE" && <div className="text-center pt-4 opacity-40"><p className="text-[9px] font-black text-[#00E5FF] uppercase tracking-[0.5em] animate-pulse">Mission Handover Ready</p></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Cpu = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/>
  </svg>
);
