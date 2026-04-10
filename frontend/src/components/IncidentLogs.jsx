import React, { useEffect, useState } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import { Terminal, Copy } from "lucide-react";
import clsx from "clsx";

export const IncidentLogs = () => {
  const [incidents, setIncidents] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const incidentsRef = ref(database, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        setIncidents(snapshot.val());
      } else {
        setIncidents({});
      }
    }, (error) => {
      console.warn("Firebase rules or connection error:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(incidents, null, 2));
  };

  return (
    <div className={clsx(
      "fixed bottom-0 left-0 right-0 bg-black border-t border-[#1A1A1A] shadow-2xl transition-all duration-300 z-50 font-black",
      isExpanded ? "h-96" : "h-14"
    )}>
      <div 
        className="h-14 flex items-center justify-between px-6 cursor-pointer hover:bg-zinc-900 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <Terminal className="w-5 h-5 text-[#FF2D2D]" />
          <span className="text-[10px] text-white uppercase tracking-[0.3em]">Neural State Telemetry</span>
          {Object.keys(incidents).length > 0 && (
            <span className="bg-[#FF2D2D] text-white text-[9px] font-black px-2.5 py-0.5 rounded shadow-[0_0_10px_#FF2D2D]">
              {Object.keys(incidents).length} NODES ACTIVE
            </span>
          )}
        </div>
        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">
          {isExpanded ? "TERMINATE LINK" : "ESTABLISH LINK"}
        </span>
      </div>

      <div className={clsx(
        "p-6 bg-[#050505] overflow-auto h-[calc(100%-3.5rem)] text-[11px] font-mono relative",
        !isExpanded && "hidden"
      )}>
        <button 
          onClick={handleCopy}
          className="absolute top-6 right-8 p-2 bg-black border border-[#1A1A1A] hover:border-[#FF2D2D]/40 rounded text-zinc-600 transition-all"
          title="Copy RAW Data"
        >
          <Copy className="w-4 h-4" />
        </button>
        <pre className="text-white/80 whitespace-pre-wrap leading-relaxed">
          {Object.keys(incidents).length > 0 
            ? JSON.stringify(incidents, null, 2) 
            : "// MISSION_DATA_EMPTY"
          }
        </pre>
      </div>
    </div>
  );
};
