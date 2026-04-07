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

// --- COMPONENT ---

export const DispatchScreen = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState({});
  const [resources, setResources] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [systemPhase, setSystemPhase] = useState("ANALYZING"); // "ANALYZING" | "DISPATCHING" | "COMPLETE"
  const [currentDispatchIdx, setCurrentDispatchIdx] = useState(-1);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayer = useRef(null);
  const markersLayer = useRef(null);

  // Fetch Firebase Live Data
  useEffect(() => {
    const incidentsRef = ref(database, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        setIncidents(snapshot.val());
      } else {
        setIncidents({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Compute highest ranked disaster
  const sortedIncidents = Object.values(incidents).sort((a, b) => {
    const pA = a.severity_block?.severity || "PENDING";
    const pB = b.severity_block?.severity || "PENDING";
    const diff = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
    if (diff === 0) {
      const scoreDiff = (b.severity_block?.priority_score || 0) - (a.severity_block?.priority_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.timestamp - a.timestamp;
    }
    return diff;
  });

  const highest = sortedIncidents[0];

  // Map Initialization
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapInstance.current);

    markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    routeLayer.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Agentic Allocation Flow
  useEffect(() => {
    if (!highest) return;

    const runAllocation = async () => {
      setIsScanning(true);
      setIsAllocating(true);
      setSelectedResources([]);
      setSimulationLogs([]);
      setSystemPhase("ANALYZING");
      setCurrentDispatchIdx(-1);

      const lat = highest.coordinates?.lat || highest.lat || 12.9716;
      const lng = highest.coordinates?.lng || highest.lng || 77.5946;

      // 1. Discovery Phase (Overpass API)
      setSystemPhase("ANALYZING");
      
      const updateLog = (msg) => {
        setSimulationLogs(prev => [...prev, { 
          unit: "Rescue Brain", 
          status: msg, 
          timestamp: Date.now() 
        }]);
      };

      const found = await fetchNearbyResourcesOSR(lat, lng, highest, updateLog);
      
      if (!found || found.length === 0) {
        updateLog("No local resources identified.");
        setIsAllocating(false);
        return;
      }
      await new Promise(r => setTimeout(r, 1000));

      // 2. Enrichment Phase (OpenRouteService)
      setSimulationLogs(prev => [...prev, { unit: "GeoBridge", status: "Calculating real road distances (OSR)...", timestamp: Date.now() }]);
      const enriched = await enrichResourcesWithOSR(found, lat, lng);
      setResources(enriched);
      setIsScanning(false);

      await new Promise(r => setTimeout(r, 1500)); 
      setSystemPhase("SELECTING");
      
      // 3. AI Selection (Gemini Agent)
      setSimulationLogs(prev => [...prev, { unit: "Dispatch Agent", status: "Gemini analyzing unit specialization...", timestamp: Date.now() }]);
      const selected = await selectBestResourcesAI(highest, enriched);
      
      if (selected.length === 0) {
        // Fallback to deterministic selection if AI returns empty
        const fallback = selectAgentResources(enriched, highest.disaster_type);
        setSelectedResources(fallback);
      } else {
        setSelectedResources(selected);
      }
      
      await new Promise(r => setTimeout(r, 1000));
      setSystemPhase("DISPATCHING");

      // 3. Step-by-Step Simulation
      for (let i = 0; i < selected.length; i++) {
        setCurrentDispatchIdx(i);
        const resource = selected[i];
        
        // Log Sending Request
        setSimulationLogs(prev => [...prev, { unit: resource.name, status: "Notifying center...", timestamp: Date.now() }]);
        
        await new Promise(r => setTimeout(r, 2500)); // Accepting delay
        
        // Log Accepted
        setSimulationLogs(prev => prev.map(log => 
          log.unit === resource.name ? { ...log, status: "Acknowledge" } : log
        ));

        await new Promise(r => setTimeout(r, 500)); // Short break between units
      }

      setSystemPhase("COMPLETE");
      setIsAllocating(false);
    };

    runAllocation();
  }, [highest?.id]);

  useEffect(() => {
    // Only navigate if we have resources and the AI simulation has reached "COMPLETE"
    if (selectedResources?.length > 0 && systemPhase === "COMPLETE") {
      console.log("Dispatch Brain: Mission confirmed. Initiating handover to Tracking...");
      
      const timer = setTimeout(() => {
        console.log("Dispatch Brain: Navigation Jump to /tracking");
        navigate("/tracking", {
          state: {
            incident: highest,
            resources: selectedResources
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedResources, systemPhase, navigate, highest]);

  return (
    <div className="w-full h-screen grid grid-cols-1 md:grid-cols-3 bg-[#0A0D12] overflow-hidden p-4 gap-4 dispatch-layout">
      
      {/* LEFT PANEL: INCIDENT TELEMETRY */}
      <div className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-left duration-700">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Incident Telemetry</h2>
        
        {!highest ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <span className="text-4xl mb-4">📭</span>
            <p className="text-xs font-mono uppercase tracking-[0.2em]">No incident selected</p>
          </div>
        ) : (
          <>
            <div className="relative rounded-3xl overflow-hidden border border-gray-800 shadow-2xl mb-8 aspect-video group">
              <img src={highest.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="disaster" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="bg-red-500 text-[10px] font-black px-2 py-0.5 rounded text-black uppercase tracking-tighter mr-2">LIVE FEED</span>
                <h1 className="text-white text-2xl font-black tracking-tight capitalize mt-2">{highest.disaster_type}</h1>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-gray-950/60 border border-gray-800 rounded-3xl">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Location</p>
                <p className="text-sm text-blue-400 font-bold tracking-tight mb-4">
                  {highest.location || "Coordinating Tactical Zone..."}
                </p>

                <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Detailed Analysis</p>
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                  {highest.description || "Agent computing context..."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-950/60 border border-gray-800 rounded-3xl">
                  <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Severity</p>
                  <p className={`text-sm font-black ${
                    highest.severity_block?.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'
                  }`}>{highest.severity_block?.severity || "HIGH"}</p>
                </div>
                <div className="p-4 bg-gray-950/60 border border-gray-800 rounded-3xl">
                  <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Confidence</p>
                  <p className="text-sm font-black text-emerald-400">{(highest.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MIDDLE PANEL: AGENTIC AI BRAIN */}
      <div className="flex flex-col h-full bg-gray-900/10 backdrop-blur-3xl border border-gray-800/50 rounded-[2.5rem] p-8 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-bottom duration-700">
        <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Agentic AI Brain</h2>
        
        {!highest ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-12 h-12 border-2 border-gray-800 border-t-blue-500/50 rounded-full mb-6"></div>
            <p className="text-xs font-mono uppercase tracking-[0.2em]">Agentic AI waiting...</p>
          </div>
        ) : systemPhase === "ANALYZING" || systemPhase === "SELECTING" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="space-y-2">
              <p className="text-xs text-gray-100 font-bold tracking-widest uppercase animate-pulse">
                {systemPhase === "ANALYZING" ? "Agentic AI analyzing..." : "Selecting rescue centers..."}
              </p>
              <p className="text-[10px] text-blue-500 font-mono tracking-tighter uppercase opacity-50">Computing optimal response vector...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-1000">
            {/* Selected Units List */}
            <div className="animate-in slide-in-from-bottom duration-500">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Selected Response Centers</p>
              <div className="grid gap-3">
                {selectedResources.map((res, i) => (
                  <div key={i} className="p-4 bg-gray-950/40 border border-gray-800 rounded-3xl flex justify-between items-center group hover:border-blue-500/30 transition-all">
                    <div>
                      <p className="text-[8px] font-black text-blue-500 uppercase mb-1">{res.role?.replace('_', ' ')}</p>
                      <p className="text-sm font-bold text-gray-200">{res.name}</p>
                    </div>
                    <p className="text-[10px] font-black text-white/50 font-mono italic">— {res.distance?.toFixed(1)}km</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispatch Simulation Phase */}
            <div className="pt-8 border-t border-gray-800/50 animate-in fade-in duration-1000 delay-500">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Dispatch Simulation</p>
              <div className="space-y-4 font-mono">
                {simulationLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-4 animate-in slide-in-from-left duration-300">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      log.status === 'Acknowledge' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-blue-500 animate-pulse'
                    }`} />
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400">
                        {log.unit}: {log.status}
                      </p>
                    </div>
                    <div className={`text-[8px] font-black px-2 py-1 rounded-full ${
                      log.status === 'Acknowledge' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {log.status === 'Acknowledge' ? 'ACK' : 'PENDING'}
                    </div>
                  </div>
                ))}
                {systemPhase === "COMPLETE" && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center mt-6 animate-in zoom-in duration-500">
                    <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">All Units En Route • ETA Minimised</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: REAL-TIME DISCOVERY */}
      <div className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 overflow-hidden animate-in fade-in slide-in-from-right duration-700">
        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Nearby Rescue Centers (10km)</h2>
        <p className="text-[10px] text-blue-500 font-mono tracking-tighter uppercase mb-6 animate-pulse">Agentic AI scanning nearby rescue centers...</p>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 -mr-2 space-y-3">
          {!highest ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <span className="text-4xl mb-4">🔍</span>
              <p className="text-xs font-mono uppercase tracking-[0.2em]">Waiting for rescue centers...</p>
            </div>
          ) : isScanning ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <div className="w-10 h-10 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-mono tracking-widest uppercase">Refreshing Discovery Grid...</p>
            </div>
          ) : resources.length > 0 ? (
            resources.map((res, i) => {
              const isSelected = selectedResources.some(s => s.name === res.name);
              return (
                <div key={i} className={`p-4 rounded-3xl border transition-all duration-500 ${
                  isSelected 
                   ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.05)]' 
                   : 'bg-gray-950/40 border-gray-800/60 hover:border-gray-700'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-sm font-bold truncate pr-4 ${isSelected ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {res.name}
                    </h3>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                      isSelected ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {isSelected ? 'SELECTED' : res.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-[10px] font-mono text-gray-500">Vector Distance: {res.distance.toFixed(2)} KM</p>
                    {isSelected && (
                      <span className="text-[10px] font-black text-emerald-500 animate-pulse tracking-tighter">ALLOCATED</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-center opacity-40">
              <p className="text-xs text-gray-600 italic">No tackle assets identified in the search radius.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
