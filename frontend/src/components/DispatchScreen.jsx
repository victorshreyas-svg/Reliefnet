import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import { fetchNearbyResourcesOSR, selectAgentResources, enrichResourcesWithOSR } from "../services/rescueFinder";
import { selectBestResourcesAI } from "../services/agents";
import { persistence, STORAGE_KEYS } from "../services/persistence";

const PRIORITY_ORDER = {
  "CRITICAL": 1,
  "HIGH": 2,
  "MEDIUM": 3,
  "LOW": 4,
  "PENDING": 5
};

const DISASTER_THEMES = {
  fire: { color: "#EF4444", icon: "🔥", tint: "#FEF2F2", label: "FIRE INCIDENT" },
  flood: { color: "#3B82F6", icon: "🌊", tint: "#EFF6FF", label: "FLOOD DISASTER" },
  building_collapse: { color: "#F59E0B", icon: "🏚", tint: "#FFFBEB", label: "BUILDING COLLAPSE" },
  earthquake: { color: "#8B5CF6", icon: "🌏", tint: "#F5F3FF", label: "EARTHQUAKE" },
  landslide: { color: "#78350F", icon: "⛰", tint: "#FDF8F6", label: "LANDSLIDE" },
  default: { color: "#6B7280", icon: "⚠️", tint: "#F8FAFC", label: "EMERGENCY SIGNAL" }
};

export const DispatchScreen = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState({});
  const [resources, setResources] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [selectedResources, setSelectedResources] = useState(() => persistence.load(STORAGE_KEYS.ALLOCATION, []));
  const [aiRequirements, setAiRequirements] = useState(() => persistence.load(STORAGE_KEYS.DISPATCH, null));
  const [simulationLogs, setSimulationLogs] = useState(() => persistence.load(STORAGE_KEYS.DISPATCH_LOGS, []));
  
  const [systemPhase, setSystemPhase] = useState(() => persistence.load('reliefnet_phase', "ANALYZING"));
  const [currentDispatchIdx, setCurrentDispatchIdx] = useState(-1);

  // Persistence Save Effect
  useEffect(() => {
    persistence.save(STORAGE_KEYS.ALLOCATION, selectedResources);
    persistence.save(STORAGE_KEYS.DISPATCH, aiRequirements);
    persistence.save(STORAGE_KEYS.DISPATCH_LOGS, simulationLogs);
    persistence.save('reliefnet_phase', systemPhase);
  }, [selectedResources, aiRequirements, simulationLogs, systemPhase]);
  
  useEffect(() => {
    const incidentsRef = ref(database, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        setIncidents(snapshot.val());
      } else {
        setIncidents({});
        setSystemPhase("ANALYZING");
        setSelectedResources([]);
        setAiRequirements(null);
        setSimulationLogs([]);
      }
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
    if (!highest || systemPhase === "COMPLETE") return;
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
  }, [selectedResources, systemPhase, navigate, highest]);

  const theme = DISASTER_THEMES[highest?.disaster_type] || DISASTER_THEMES.default;

  const getReasoningForUnit = (unitType, disasterType) => {
    const type = (disasterType || "").toLowerCase();
    if (unitType === 'Fire Units') {
      if (type.includes('fire')) return "Active structural fire detected. Suppression required.";
      if (type.includes('collapse')) return "Extraction support and fire hazard mitigation.";
      return "General fire & hazard response protocol activated.";
    }
    if (unitType === 'Medical Units') {
      if (type.includes('fire')) return "Trauma and burn care for possible casualties.";
      if (type.includes('flood')) return "Water relocation support and triage teams.";
      return "Medical assessment and emergency casualty care.";
    }
    if (unitType === 'Police Units') {
      if (type.includes('fire') || type.includes('flood')) return "Evacuation control and area perimeter security.";
      return "Law enforcement for zone security and traffic clearance.";
    }
    if (unitType === 'Rescue Units') {
      if (type.includes('flood')) return "Water extraction and stranded civilian rescue.";
      if (type.includes('collapse')) return "Debris clearing and search & rescue operations.";
      return "Specialized disaster response and victim recovery.";
    }
    return "Tactical support allocated by Disaster AI.";
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col bg-[#FFFFFF] font-sans overflow-hidden">
      
      {/* 1. TOP STATUS BAR */}
      <div className="px-10 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
         <div className="flex items-center gap-10">
            <div className="flex flex-col">
               <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Dispatch Status</span>
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${systemPhase === 'COMPLETE' ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />
                  <span className="text-[13px] font-black text-[#111827] uppercase tracking-tight">AI {systemPhase === 'COMPLETE' ? 'DECISION FINALIZED' : systemPhase}</span>
               </div>
            </div>
            <div className="w-px h-8 bg-[#E5E7EB]" />
            <div className="flex flex-col">
               <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">System Mode</span>
               <span className="text-[13px] font-black text-[#111827] uppercase tracking-tight">Autonomous Agentic Dispatch</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Regional Command Node: BAN-01</span>
         </div>
      </div>

      <div className="flex-1 grid grid-cols-[400px_1fr_450px] overflow-hidden">
         
         {/* LEFT COLUMN: INCIDENT SUMMARY */}
         <div className="border-r border-[#E5E7EB] p-8 overflow-y-auto scrollbar-hide space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Incident Overview</h3>
            </div>

            {highest ? (
               <div className="space-y-8">
                  {highest.image_url && (
                    <div className="aspect-video bg-[#F8FAFC] rounded-[32px] border border-[#E5E7EB] overflow-hidden soft-shadow relative group">
                        <img src={highest.image_url} className="w-full h-full object-cover" alt="mission" />
                    </div>
                  )}

                  <div className="p-8 bg-white border border-[#E5E7EB] border-l-[8px] rounded-[32px] soft-shadow" style={{ borderLeftColor: theme.color }}>
                     <div className="flex justify-between items-start mb-6">
                        <div className="text-4xl">{theme.icon}</div>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${highest.severity_block?.severity === 'CRITICAL' ? 'text-[#EF4444] bg-[#FEF2F2]' : 'text-[#6B7280] bg-[#F8FAFC]'}`}>
                           {highest.severity_block?.severity || "PENDING"}
                        </span>
                     </div>

                     <div className="space-y-6">
                        <div>
                           <h4 className="text-2xl font-black text-[#111827] uppercase tracking-tighter mb-1">{theme.label}</h4>
                           <p className="text-[13px] text-[#6B7280] font-bold uppercase tracking-widest">{highest.zone}</p>
                        </div>

                        <div className="pt-4 border-t border-[#E5E7EB]">
                           <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mb-2">Tactical Intelligence</p>
                           <p className="text-[13px] text-[#111827] leading-relaxed font-medium">"{highest.description}"</p>
                        </div>
                     </div>
                  </div>
               </div>
            ) : null}
         </div>

         {/* CENTER COLUMN: AI RESPONSE PLAN */}
         <div className="bg-[#F8FAFC] p-10 overflow-y-auto scrollbar-hide space-y-8 border-r border-[#E5E7EB]">
            <h3 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em] px-2 text-center">AI Response Plan</h3>
            
            <div className="space-y-4">
               {['Fire Units', 'Medical Units', 'Police Units', 'Rescue Units'].map(unit => {
                  const count = aiRequirements?.[unit] || 0;
                  if (count === 0) return null;

                  const unitIcon = unit === 'Fire Units' ? '🚒' : unit === 'Medical Units' ? '🚑' : unit === 'Police Units' ? '🚓' : '🚁';
                  const unitColor = unit === 'Fire Units' ? '#EF4444' : unit === 'Medical Units' ? '#3B82F6' : unit === 'Police Units' ? '#8B5CF6' : '#F59E0B';
                  const unitLabel = unit === 'Fire Units' ? 'Fire Suppression Team' : unit === 'Medical Units' ? 'Medical Support' : unit === 'Police Units' ? 'Police Control' : 'Specialized Rescue';

                  return (
                     <div key={unit} className="p-6 bg-white border border-[#E5E7EB] rounded-[24px] soft-shadow flex items-start gap-5 transition-all hover:scale-[1.02]">
                        <div className="text-3xl p-4 bg-[#F8FAFC] rounded-2xl" style={{ borderLeft: `4px solid ${unitColor}` }}>{unitIcon}</div>
                        <div className="flex-1">
                           <h4 className="text-[14px] font-black text-[#111827] uppercase tracking-tight mb-1">{unitLabel}</h4>
                           <p className="text-[12px] text-[#6B7280] font-medium leading-normal">{getReasoningForUnit(unit, highest?.disaster_type)}</p>
                        </div>
                     </div>
                  );
               })}
            </div>

            <div className="pt-10 flex justify-center">
               <button 
                  disabled={isAllocating || selectedResources.length === 0}
                  className="px-16 py-6 bg-gradient-to-r from-[#EF4444] to-[#DC2626] rounded-full text-white font-black uppercase text-[11px] tracking-[0.4em] transition-all hover:scale-[1.05] active:scale-[0.98] disabled:opacity-20 soft-shadow"
               >
                  {isAllocating ? 'SYNCHRONIZING ASSETS...' : 'CONFIRM DEPLOYMENT'}
               </button>
            </div>
         </div>

         {/* RIGHT COLUMN: ASSIGNED UNITS */}
         <div className="p-8 overflow-y-auto scrollbar-hide space-y-6">
            <h3 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em]">Assigned Response Units</h3>
            
            <div className="space-y-3">
               {selectedResources.map((res, i) => {
                  const acked = simulationLogs.some(l => l.unit === res.name);
                  const icon = res.type === 'fire_station' ? '🚒' : res.type === 'police' ? '🚓' : res.type === 'hospital' ? '🚑' : '🚁';
                  const resColor = res.type === 'fire_station' ? '#EF4444' : res.type === 'police' ? '#8B5CF6' : res.type === 'hospital' ? '#3B82F6' : '#F59E0B';

                  return (
                     <div key={i} className={`flex items-center justify-between p-5 bg-white border border-[#E5E7EB] rounded-[24px] transition-all ${i === currentDispatchIdx ? 'scale-[1.02] border-[#111827] shadow-xl z-10' : 'hover:border-[#111827]/10'}`}>
                        <div className="flex items-center gap-4">
                           <div className="text-2xl" style={{ color: resColor }}>{icon}</div>
                           <div>
                              <p className="text-[13px] font-black text-[#111827] uppercase tracking-tight">{res.name}</p>
                              <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest text-opacity-50 opacity-50">STATUS: NETWORK ACTIVE</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${acked ? 'bg-[#22C55E]' : 'bg-[#E5E7EB] animate-pulse'}`} />
                           <span className={`text-[9px] font-black tracking-widest ${acked ? 'text-[#22C55E]' : 'text-[#E5E7EB]'}`}>{acked ? 'READY' : 'WAITING'}</span>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      </div>
    </div>
  );
};
