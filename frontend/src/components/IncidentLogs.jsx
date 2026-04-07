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
      "fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-2xl transition-all duration-300 z-50",
      isExpanded ? "h-96" : "h-14"
    )}>
      <div 
        className="h-14 flex items-center justify-between px-6 cursor-pointer hover:bg-gray-800 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5 text-green-400" />
          <span className="font-semibold text-gray-200 uppercase tracking-wider text-sm">Real-Time Global State</span>
          {Object.keys(incidents).length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {Object.keys(incidents).length} incidents
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {isExpanded ? "Click to collapse" : "Click to expand"}
        </span>
      </div>

      <div className={clsx(
        "p-4 bg-[#0a0f14] overflow-auto h-[calc(100%-3.5rem)] text-sm font-mono relative",
        !isExpanded && "hidden"
      )}>
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-6 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 transition"
          title="Copy JSON"
        >
          <Copy className="w-4 h-4" />
        </button>
        <pre className="text-green-400 whitespace-pre-wrap">
          {Object.keys(incidents).length > 0 
            ? JSON.stringify(incidents, null, 2) 
            : "// No incidents recorded yet..."
          }
        </pre>
      </div>
    </div>
  );
};
