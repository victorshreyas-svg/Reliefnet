import React, { useEffect, useState, useRef } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import autoAnimate from '@formkit/auto-animate';
import { Target, Zap, Radio, Cpu } from "lucide-react";
import { TerminalLogViewer } from "./TerminalLogViewer";

const PRIORITY_ORDER = {
  "CRITICAL": 1,
  "HIGH": 2,
  "MEDIUM": 3,
  "LOW": 4,
  "PENDING": 5
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30';
    case 'HIGH': return 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30';
    case 'MEDIUM': return 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30';
    case 'LOW': return 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30';
    default: return 'bg-white/5 text-gray-400 border border-white/10';
  }
};

export const AnalysisScreen = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState({});
  const listRefFeed = useRef(null);
  const listRefPriority = useRef(null);

  useEffect(() => {
    listRefFeed.current && autoAnimate(listRefFeed.current);
    listRefPriority.current && autoAnimate(listRefPriority.current);
  }, []);

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

  // Use a single source of truth for both panels to ensure rank consistency
  const sortedIncidents = Object.values(incidents).sort((a, b) => {
    const pA = a.severity_block?.severity || "PENDING";
    const pB = b.severity_block?.severity || "PENDING";
    const diff = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
    if (diff === 0) return b.timestamp - a.timestamp;
    return diff;
  }).slice(0, 3);

  return (
    <div className="w-full h-[calc(100vh-68px)] flex flex-row overflow-hidden bg-[#05070B] font-sans p-4 gap-[14px]">
      
      {/* 1. LEFT PANEL: INCIDENT ANALYSIS (42%) */}
      <div className="w-[42%] flex flex-col h-full bg-[#0B0F17]/50 rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl relative">
        <header className="px-6 py-4 border-b border-white/[0.06] bg-[#0B0F17]/80 flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-black text-[#E6EDF3] uppercase tracking-widest flex items-center gap-2">
              <Radio className="text-[#00E5FF] animate-pulse" size={14} />
              Incident Analysis feed
            </h2>
            <p className="text-[9px] font-bold text-[#9CA3AF] tracking-tighter opacity-40 uppercase">Intelligence Sorted</p>
          </div>
          <span className="text-[10px] font-black text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1 rounded-full border border-[#00E5FF]/25 shadow-inner">
            {sortedIncidents.length} MISSIONS
          </span>
        </header>

        <div ref={listRefFeed} className="flex-1 p-4 space-y-[10px] overflow-hidden">
          {sortedIncidents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
               <Cpu className="animate-spin-slow mb-3" size={32} />
               <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting uplink...</p>
            </div>
          ) : sortedIncidents.map((incident, idx) => {
            const severity = incident.severity_block?.severity || "ANALYZING";
            const typeLower = (incident.disaster_type || "").toLowerCase();
            
            // Centralized Disaster Themes
            const theme = typeLower.includes('fire') 
              ? { prim: "#ff3b3b", glow: "rgba(255,59,59,0.35)", bg: "rgba(255,59,59,0.06)" }
              : (typeLower.includes('collapse') || typeLower.includes('earthquake'))
              ? { prim: "#ff9a2f", glow: "rgba(255,154,47,0.35)", bg: "rgba(255,154,47,0.06)" }
              : { prim: "#00d4ff", glow: "rgba(0,212,255,0.35)", bg: "rgba(0,212,255,0.06)" };

            return (
              <div
                key={incident.id}
                onClick={onNavigate}
                style={{
                  boxShadow: `0 0 40px -20px ${theme.glow}`,
                }}
                className={`flex items-center gap-4 h-[105px] p-4 rounded-3xl cursor-pointer transition-all duration-500 relative group border bg-[#0F1623]/80 border-white/[0.06] hover:bg-[#0F1623]`}
              >
                {/* Visual Left Border Accent */}
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-12 rounded-r-full opacity-60 transition-opacity group-hover:opacity-100" 
                  style={{ backgroundColor: theme.prim, boxShadow: `0 0 10px ${theme.glow}` }} 
                />

                {/* Ranking Badge (#1 #2 #3) */}
                <div 
                  className={`absolute top-2 left-2 z-20 px-3 py-0.5 rounded-full text-[9px] font-black italic border transition-all duration-500 group-hover:scale-110`}
                  style={{ 
                    color: theme.prim, 
                    borderColor: theme.prim, 
                    backgroundColor: theme.bg,
                    boxShadow: `0 0 12px ${theme.glow}`
                  }}
                >
                  #{idx + 1}
                </div>

                <div className="w-14 h-14 flex-shrink-0 bg-black rounded-2xl overflow-hidden border border-white/[0.06] relative">
                  <img src={incident.image_url} className="w-full h-full object-cover grayscale-[0.8] group-hover:grayscale-0 opacity-40 group-hover:opacity-100 transition-all duration-1000" alt="th" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col h-full py-0.5 relative">
                  <div className="flex justify-between items-center mb-1">
                    <h3 
                      className="text-[15px] font-black capitalize truncate leading-none tracking-tight transition-all duration-500"
                      style={{ 
                        color: theme.prim,
                        textShadow: `0 0 8px ${theme.glow}` 
                      }}
                    >
                      {incident.disaster_type === 'building_collapse' ? 'Collapse Disaster' : (incident.disaster_type || "Detecting...").replace('_', ' ')}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm border ${getSeverityColor(severity)}`}>
                      {severity}
                    </span>
                  </div>
                  
                  <p className="text-[10px] font-bold flex items-center gap-1.5 mb-1.5 text-[#9CA3AF]">
                    <span className="opacity-60 text-[12px]">📍</span> {incident.zone || "Resolving Zone..."}
                  </p>
                  
                  <p className="text-[11px] text-gray-400 font-medium line-clamp-1 italic tracking-tight opacity-40 group-hover:opacity-80 transition-opacity mb-2 leading-none">
                     {incident.description || "Agent computing telemetry context..."}
                  </p>
                  
                  <div className="flex items-center justify-between gap-3">
                     <div className="flex-1 rounded-full overflow-hidden border border-white/[0.06] bg-black/50 h-1 relative">
                        <div 
                           className="h-full transition-all duration-1000" 
                           style={{ 
                              width: `${(incident.confidence || 0.85) * 100}%`,
                              backgroundColor: theme.prim,
                              boxShadow: `0 0 10px ${theme.glow}`
                           }} 
                        />
                     </div>
                     <span className="text-[9px] font-black opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: theme.prim }}>
                        {Math.round((incident.confidence || 0.85) * 100)}%
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MIDDLE PANEL: PRIORITY ENGINE (28%) */}
      <div className="w-[28%] flex flex-col h-full bg-[#0B0F17]/40 rounded-2xl border border-white/[0.06] overflow-hidden">
        <header className="px-5 py-4 border-b border-white/[0.06] bg-[#0B0F17]/95">
          <h2 className="text-[11px] font-black text-[#E6EDF3] uppercase tracking-widest flex items-center gap-2">
            <Zap className="text-[#00E5FF]" size={14} />
            AI Priority Algorithm
          </h2>
        </header>

        <div ref={listRefPriority} className="flex-1 p-4 space-y-[10px] overflow-hidden">
          {sortedIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20">
               <div className="w-6 h-6 border-2 border-white/5 border-t-[#00E0FF] rounded-full animate-spin" />
            </div>
          ) : sortedIncidents.map((incident, idx) => {
            const severity = incident.severity_block?.severity || "ANALYZING";
            const typeLower = (incident.disaster_type || "").toLowerCase();
            const theme = typeLower.includes('fire') 
              ? { prim: "#ff3b3b", glow: "rgba(255,59,59,0.35)", bg: "rgba(255,59,59,0.06)" }
              : (typeLower.includes('collapse') || typeLower.includes('earthquake'))
              ? { prim: "#ff9a2f", glow: "rgba(255,154,47,0.35)", bg: "rgba(255,154,47,0.06)" }
              : { prim: "#00d4ff", glow: "rgba(0,212,255,0.35)", bg: "rgba(0,212,255,0.06)" };

            return (
              <div
                key={incident.id}
                className="flex items-center justify-between h-[82px] p-4 rounded-3xl bg-[#0F1623]/40 border border-white/[0.06] transition-all duration-300 hover:bg-[#0F1623]/60 group relative overflow-hidden"
                style={{ boxShadow: `0 0 20px -10px ${theme.glow}` }}
              >
                <div className="flex items-center gap-4 min-w-0 relative z-10">
                  <div 
                    className="text-2xl font-black italic transition-all duration-500"
                    style={{ 
                      color: theme.prim,
                      textShadow: `0 0 10px ${theme.glow}`,
                      opacity: 0.4
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black capitalize truncate mb-1.5 tracking-tight text-[#E6EDF3] group-hover:text-white transition-colors">
                      {incident.disaster_type || "Analysing..."}
                    </h3>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border leading-none block w-fit ${getSeverityColor(severity)}`}>
                      {severity}
                    </span>
                  </div>
                </div>
                
                <div className="text-right relative z-10">
                  <p className="text-[17px] font-black leading-none group-hover:scale-110 transition-transform" style={{ color: theme.prim }}>
                    {incident.severity_block?.priority_score || '--'}
                  </p>
                  <p className="text-[7px] font-bold text-[#9CA3AF] uppercase mt-1 tracking-tighter opacity-40">P-SCORE</p>
                </div>

                {/* Subtle Background Glow */}
                <div className="absolute right-0 bottom-0 w-16 h-16 blur-2xl opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none" style={{ backgroundColor: theme.prim }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. RIGHT PANEL: AGENT STATUS + TERMINAL (30%) */}
      <div className="w-[30%] flex flex-col h-full bg-[#05070B] rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl">
        <div className="p-5 bg-[#0B0F17]/95 border-b border-white/[0.06]">
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black text-[#00E5FF] uppercase tracking-[0.3em] flex items-center gap-2">
              <Target size={12} />
              Mission Status Panel
            </h2>
            <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse shadow-[0_0_5px_#22C55E]" />
          </header>
          
          <div className="space-y-2">
            <AgentRow name="Triage Agent" status="ACTIVE" active={true} />
            <AgentRow name="Priority Engine" status="OPTIMIZING" active={true} />
            <AgentRow name="Resource Estimator" status="READY" active={true} />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-black/40 relative">
           <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#05070B] to-transparent z-10 pointer-events-none" />
           <div className="flex-1 overflow-hidden px-1">
              <TerminalLogViewer />
           </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}</style>
    </div>
  );
};

const AgentRow = ({ name, status, active }) => (
  <div className="flex items-center justify-between px-4 py-2 bg-[#0F1623]/60 rounded-2xl border border-white/[0.06] group hover:border-[#00E5FF]/20 transition-all shadow-inner">
     <div className="flex items-center gap-3">
        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]' : 'bg-gray-700'} ${active && 'animate-pulse'}`} />
        <span className="text-[10px] font-black text-[#E6EDF3] tracking-widest uppercase">{name}</span>
     </div>
     <span className={`text-[9px] font-black tracking-[0.2em] ${active ? 'text-[#00E5FF]' : 'text-gray-500'}`}>{status}</span>
  </div>
);
