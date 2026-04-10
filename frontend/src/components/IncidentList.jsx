import React, { useEffect, useState } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";

export const IncidentList = () => {
  const [incidents, setIncidents] = useState({});

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

  const incidentArray = Object.values(incidents).sort((a, b) => b.timestamp - a.timestamp);

  if (incidentArray.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto p-8 space-y-8 bg-[#050505]">
      <div className="flex items-center justify-between mb-8 border-b border-[#1A1A1A] pb-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mission History Archive</h2>
        <span className="bg-[#FF2D2D]/10 text-[#FF2D2D] text-[10px] font-black px-4 py-1.5 rounded-full border border-[#FF2D2D]/20 animate-pulse flex items-center tracking-widest uppercase">
          <span className="w-1.5 h-1.5 bg-[#FF2D2D] rounded-full mr-2 shadow-[0_0_8px_#FF2D2D]"></span>
          Active Feed
        </span>
      </div>
      
      <div className="space-y-6">
        {incidentArray.map((incident) => (
          <div key={incident.id} className="bg-[#0B0B0B] border border-[#1A1A1A] rounded-2xl p-8 flex flex-col md:flex-row gap-8 transition hover:border-[#FF2D2D]/20 group">
            
            <div className="w-full md:w-1/4 flex-shrink-0">
              {incident.image_url ? (
                <img src={incident.image_url} alt="Disaster" className="w-full h-auto aspect-square object-cover rounded-xl border border-[#1A1A1A] grayscale group-hover:grayscale-0 transition-all duration-700" />
              ) : (
                <div className="w-full h-48 bg-black rounded-xl flex items-center justify-center border border-[#1A1A1A] text-zinc-800 text-[10px] font-black uppercase">
                  No Imagery
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">{incident.disaster_type?.replace('_', ' ')}</h3>
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{incident.zone || "Location Coordinating"}</p>
                </div>
                {incident.severity_block ? (
                  <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                    incident.severity_block.severity === 'CRITICAL' ? 'bg-[#FF2D2D] text-white border-[#FF2D2D]' :
                    'bg-black text-[#FF2D2D] border-[#FF2D2D]/30'
                  }`}>
                    {incident.severity_block.severity}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-black text-zinc-700 border border-[#1A1A1A]">
                    Syncing...
                  </span>
                )}
              </div>

              <p className="text-zinc-500 text-xs leading-relaxed italic border-l-2 border-[#1A1A1A] pl-4 font-medium capitalize">
                {incident.description || "Synthesizing mission intelligence parameters..."}
              </p>

              {incident.dispatch_plan ? (
                <div className="p-6 bg-black border border-[#1A1A1A] rounded-xl space-y-4">
                  <header className="flex items-center justify-between border-b border-[#1A1A1A] pb-3 mb-4">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">Resource Allocation</p>
                     <span className="text-[9px] font-black text-[#FF2D2D] uppercase tracking-[0.2em]">{incident.dispatch_plan.status}</span>
                  </header>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                       <span className="text-[#1A1A1A] block text-[8px] font-black uppercase tracking-widest mb-1">Assigned Forces</span>
                       <span className="text-zinc-400 font-black text-[10px] uppercase">{incident.dispatch_plan.teams?.join(", ") || "None"}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[#1A1A1A] block text-[8px] font-black uppercase tracking-widest mb-1">Time to Target</span>
                       <span className="text-white font-black text-sm italic tracking-tighter">{incident.dispatch_plan.eta_minutes} MIN</span>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="p-4 bg-black/40 rounded-xl border border-[#1A1A1A] text-zinc-800 text-[10px] font-black uppercase tracking-widest flex items-center justify-center italic">
                    <span className="animate-pulse mr-3 w-1.5 h-1.5 bg-[#FF2D2D] rounded-full"></span>
                    Synchronizing Analysis Agents...
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
