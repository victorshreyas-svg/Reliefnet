import React, { useState, useEffect, useRef } from "react";
import { Terminal, Cpu } from "lucide-react";
import { logger } from "../services/logger";

import { persistence, STORAGE_KEYS } from "../services/persistence";

export const TerminalLogViewer = () => {
  const [logs, setLogs] = useState(() => persistence.load(STORAGE_KEYS.LOGS, []));
  const terminalEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = logger.subscribe((log) => {
      setLogs((prevLogs) => {
        const nextLogs = [...prevLogs, log].slice(-200); // Keep only last 200 logs
        persistence.save(STORAGE_KEYS.LOGS, nextLogs);
        return nextLogs;
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
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 flex flex-col h-full min-h-[350px] overflow-hidden">
      <div className="flex items-center gap-2 mb-4 border-b border-[#E5E7EB] pb-4">
        <Terminal size={14} className="text-[#3B82F6]" />
        <h3 className="text-[10px] font-bold text-[#111827] tracking-[0.2em] uppercase">Tactical Logic Stream</h3>
      </div>

      <div className="flex-1 bg-[#F8FAFC] rounded-xl p-5 border border-[#E5E7EB] font-mono text-[10px] text-[#6B7280] overflow-y-auto scrollbar-hide relative">
        <div className="space-y-1.5 pb-2">
          {logs.length === 0 && (
            <div className="opacity-40 italic">Awaiting Telemetry Link...</div>
          )}
          {logs.map((log, i) => {
            const distance = logs.length - 1 - i;
            const opacity = Math.max(0.2, 1 - (distance * 0.08)); 
            
            return (
              <div key={i} className="flex gap-2 leading-relaxed" style={{ opacity }}>
                <span className="text-[#6B7280] opacity-50 shrink-0 select-none">[{i.toString().padStart(3, '0')}]</span>
                <span className="break-all text-[#111827] font-medium">{log}</span>
              </div>
            );
          })}
          
          <div className="flex gap-2 items-center">
            <span className="text-[#6B7280] opacity-50 shrink-0 select-none">[{logs.length.toString().padStart(3, '0')}]</span>
            <span className="w-1 h-3 bg-[#3B82F6] animate-terminal-cursor inline-block" />
          </div>
          
          <div ref={terminalEndRef} />
        </div>
      </div>
      
      <div className="mt-5 flex items-center justify-between text-[8px] font-bold text-[#6B7280] uppercase tracking-widest px-1">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-sm" />
            <span>Mission Sync: Stable</span>
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
