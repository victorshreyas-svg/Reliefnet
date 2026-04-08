import React, { useState, useEffect, useRef } from "react";
import { Terminal, Cpu } from "lucide-react";
import { logger } from "../services/logger";

export const TerminalLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = logger.subscribe((log) => {
      setLogs((prevLogs) => {
        const nextLogs = [...prevLogs, log];
        return nextLogs.slice(-200); // Keep only last 200 logs
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="bg-[#111827]/40 border border-[#00E0FF]/15 rounded-3xl p-5 backdrop-blur-md shadow-xl flex flex-col h-full min-h-[350px]">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
        <Terminal size={14} className="text-[#00FF9C]" />
        <h3 className="text-[11px] font-bold text-white tracking-widest uppercase">Pipeline Execution Terminal</h3>
      </div>

      <div className="flex-1 bg-[#020617] rounded-xl p-4 border border-white/5 font-mono text-[10px] text-[#00FF9C] overflow-y-auto scrollbar-hide shadow-inner relative">
        <div className="space-y-1.5 pb-2">
          {logs.length === 0 && (
            <div className="opacity-40 italic">Waiting for telemetry connection...</div>
          )}
          {logs.map((log, i) => {
            // Fade intensity based on distance from the latest log
            const distance = logs.length - 1 - i;
            const opacity = Math.max(0.2, 1 - (distance * 0.08)); 
            
            return (
              <div key={i} className="flex gap-2 leading-relaxed" style={{ opacity }}>
                <span className="opacity-30 shrink-0 select-none">{">"}</span>
                <span className="break-all">{log}</span>
              </div>
            );
          })}
          
          {/* Blinking Cursor Row */}
          <div className="flex gap-2 items-center">
            <span className="opacity-30 shrink-0 select-none">{">"}</span>
            <span className="w-1.5 h-3.5 bg-[#00FF9C] animate-terminal-cursor inline-block" />
          </div>
          
          <div ref={terminalEndRef} />
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-pulse" />
            <span>Telemetry Link Stable</span>
        </div>
        <span>{logs.length} Blocks Cached</span>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes terminal-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-terminal-cursor {
          animation: terminal-cursor 1s step-end infinite;
        }
      `}</style>
    </div>
  );
};
