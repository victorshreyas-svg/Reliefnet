import React, { useEffect, useState, useRef } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import autoAnimate from '@formkit/auto-animate';
import { Cpu } from "lucide-react";
import { TerminalLogViewer } from "./TerminalLogViewer";
import { runPriorityReasoningAgent } from "../services/agents";

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

import { persistence, STORAGE_KEYS } from "../services/persistence";

export const AnalysisScreen = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState({});
  const [priorityReasoning, setPriorityReasoning] = useState({});
  const listRefFeed = useRef(null);

  // Persistence Save Effect
  useEffect(() => {
    persistence.save(STORAGE_KEYS.ANALYSIS, priorityReasoning);
  }, [priorityReasoning]);

  useEffect(() => {
    listRefFeed.current && autoAnimate(listRefFeed.current);
  }, []);

  useEffect(() => {
    const incidentsRef = ref(database, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) setIncidents(snapshot.val());
      else setIncidents({});
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const allIncidents = Object.values(incidents);
    allIncidents.forEach(async (incident) => {
      if (incident.id && !priorityReasoning[incident.id] && incident.severity_block?.priority_score) {
        try {
          const res = await runPriorityReasoningAgent(incident);
          setPriorityReasoning(prev => ({ ...prev, [incident.id]: res }));
        } catch (err) { console.error("Reasoning error:", err); }
      }
    });
  }, [incidents, priorityReasoning]);

  const allSortedIncidents = Object.values(incidents).sort((a, b) => {
    const pA = a.severity_block?.severity || "PENDING";
    const pB = b.severity_block?.severity || "PENDING";
    const diff = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
    if (diff === 0) return b.timestamp - a.timestamp;
    return diff;
  });

  return (
    <div className="w-full h-[calc(100vh-64px)] grid grid-cols-[450px_1fr_400px] bg-[#FFFFFF] font-sans overflow-hidden">
      
      {/* 1. LEFT PANEL: PRIORITY SCORING CARDS */}
      <div className="flex flex-col h-full border-r border-[#E5E7EB] bg-[#FFFFFF] overflow-hidden">
        <header className="px-8 py-7 border-b border-[#E5E7EB] flex flex-col gap-1">
          <h2 className="text-[11px] font-bold text-[#111827] uppercase tracking-[0.3em]">Scoring Matrix Cards</h2>
          <p className="text-[9px] font-medium text-[#6B7280] uppercase tracking-widest">Tactical Factor Breakdown</p>
        </header>

        <div ref={listRefFeed} className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-hide pb-20 bg-[#F8FAFC]">
          {allSortedIncidents.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center opacity-40">
               <Cpu className="animate-spin mb-4" size={32} />
               <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Awaiting Data Packet...</p>
            </div>
          ) : allSortedIncidents.map((incident) => {
            const theme = DISASTER_THEMES[incident.disaster_type] || DISASTER_THEMES.default;
            const reasoning = priorityReasoning[incident.id];
            const severity = incident.severity_block?.severity || "PENDING";

            return (
              <div
                key={incident.id}
                onClick={onNavigate}
                style={{ backgroundColor: theme.tint, borderColor: `${theme.color}20` }}
                className="p-6 border rounded-[24px] cursor-pointer transition-all hover:scale-[1.02] soft-shadow"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-[13px] font-black text-[#111827] uppercase tracking-tight flex items-center gap-2">
                      <span className="text-lg">{theme.icon}</span> {theme.label}
                    </h4>
                    <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-[0.2em]">{incident.zone || "Identifying sector"}</p>
                  </div>
                  <span 
                    className="text-[8px] font-black text-white px-2.5 py-1 rounded-full uppercase tracking-widest"
                    style={{ backgroundColor: theme.color }}
                  >
                    {severity}
                  </span>
                </div>

                {reasoning && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {reasoning.factors?.map((f, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-[#6B7280]">
                            <span>{f.name.replace('_', ' ')}</span>
                            <span className="text-[#111827]">{f.score}/30</span>
                          </div>
                          <div className="h-0.5 w-full bg-[#111827]/5 rounded-full overflow-hidden">
                             <div 
                               className="h-full transition-all duration-1000" 
                               style={{ width: `${(f.score/30)*100}%`, backgroundColor: theme.color }} 
                             />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-[#111827]/10 flex justify-between items-end">
                       <div>
                          <p className="text-[8px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Priority Index</p>
                          <p className="text-2xl font-black text-[#111827] leading-none">{reasoning.total}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">AI Confidence</p>
                          <p className="text-[13px] font-bold text-[#111827]">{Math.round((incident.confidence || 0.95) * 100)}%</p>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER PANEL: PRIORITY RANKING LIST */}
      <div className="flex flex-col h-full bg-[#FFFFFF] overflow-hidden">
         <header className="px-10 py-7 border-b border-[#E5E7EB] flex flex-col gap-1">
            <h2 className="text-[11px] font-black text-[#111827] uppercase tracking-[0.4em]">Priority Dashboard</h2>
            <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-[0.15em]">AI Multi-Disaster Prioritization Engine</p>
         </header>

         <div className="flex-1 p-10 overflow-y-auto scrollbar-hide space-y-10">
            <div className="space-y-4">
               {allSortedIncidents.map((inc, i) => {
                 const theme = DISASTER_THEMES[inc.disaster_type] || DISASTER_THEMES.default;
                 const score = priorityReasoning[inc.id]?.total || Math.round((inc.severity_block?.priority_score || 0));
                 const severity = inc.severity_block?.severity || "PENDING";

                 return (
                   <div 
                     key={inc.id} 
                     className="relative p-6 bg-white border border-[#E5E7EB] rounded-[24px] hover:border-[#111827]/10 hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between"
                     style={{ borderLeft: `6px solid ${theme.color}` }}
                   >
                      <div className="flex items-center gap-6">
                         <span className="text-2xl font-black text-[#E5E7EB] group-hover:text-[#111827] transition-colors">#{i+1}</span>
                         <div className="text-3xl">{theme.icon}</div>
                         <div>
                            <p className="text-[14px] font-black text-[#111827] uppercase tracking-tight mb-0.5">{theme.label}</p>
                            <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-bold">{inc.zone || "Analyzing Sector"}</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-10">
                         <div className="w-48 space-y-2">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">
                               <span>Impact Magnitude</span>
                               <span className="text-[#111827]">{score}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#F8FAFC] rounded-full overflow-hidden border border-[#E5E7EB]">
                               <div 
                                 className="h-full transition-all duration-1000" 
                                 style={{ width: `${score}%`, backgroundColor: theme.color }} 
                               />
                            </div>
                         </div>
                         <div className="text-center min-w-[80px]">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${severity === 'CRITICAL' ? 'text-[#EF4444] bg-[#FEF2F2]' : severity === 'HIGH' ? 'text-[#F59E0B] bg-[#FFFBEB]' : 'text-[#22C55E] bg-[#F0FDF4]'}`}>
                               {severity === 'CRITICAL' ? 'HIGH PRIORITY' : severity === 'HIGH' ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}
                            </span>
                         </div>
                      </div>
                   </div>
                 );
               })}
            </div>

            {/* AI MISSION SUMMARY */}
            <div className="pt-10 border-t border-[#E5E7EB] space-y-6">
               <h3 className="text-[10px] font-black text-[#6B7280] uppercase tracking-[0.3em]">AI Tactical Summary</h3>
               <div className="p-10 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[40px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <Cpu size={120} />
                  </div>
                  <p className="text-[18px] text-[#111827] leading-relaxed font-bold italic relative z-10">
                    "{allSortedIncidents[0]?.description || "Awaiting multi-vector mission synchronization..."}"
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* 3. RIGHT PANEL: RESOURCE STATUS */}
      <div className="flex flex-col h-full border-l border-[#E5E7EB] bg-[#FFFFFF] overflow-hidden">
         <header className="px-8 py-7 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-[#111827] uppercase tracking-[0.3em]">Neural Status</h2>
         </header>

         <div className="flex-1 p-8 space-y-8 overflow-y-auto scrollbar-hide">
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest px-1">Active Reasoning Agents</h4>
               <AgentRow name="Triage Engine" status="Evaluating" color="#EF4444" />
               <AgentRow name="Resource Weaver" status="Idle" color="#6B7280" />
               <AgentRow name="Vector Sync" status="Standby" color="#3B82F6" />
            </div>

            <div className="space-y-4 pt-10 border-t border-[#E5E7EB]">
               <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest px-1">Tactical Stream</h4>
               <div className="rounded-3xl border border-[#E5E7EB] overflow-hidden bg-white p-1">
                 <TerminalLogViewer />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const AgentRow = ({ name, status, color }) => (
  <div className="flex items-center justify-between px-5 py-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl hover:bg-white transition-all shadow-sm">
     <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-black text-[#111827] uppercase tracking-widest">{name}</span>
     </div>
     <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">{status}</span>
  </div>
);
