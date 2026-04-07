import React, { useEffect, useState, useRef } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import autoAnimate from '@formkit/auto-animate';
import { fetchNearbyResourcesOSR } from "../services/rescueFinder";

const PRIORITY_ORDER = {
  "CRITICAL": 1,
  "HIGH": 2,
  "MEDIUM": 3,
  "LOW": 4,
  "PENDING": 5
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500/20 text-red-400 border border-red-500/50';
    case 'HIGH': return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
    case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
    case 'LOW': return 'bg-green-500/20 text-green-400 border border-green-500/50';
    default: return 'bg-gray-700/50 text-gray-400 border border-gray-600';
  }
};

const getSeverityGlow = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/40';
    case 'HIGH': return 'shadow-[0_0_20px_rgba(249,115,22,0.3)] border-orange-500/40';
    case 'MEDIUM': return 'shadow-[0_0_20px_rgba(234,179,8,0.3)] border-yellow-500/40';
    case 'LOW': return 'shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-500/40';
    default: return 'shadow-lg border-gray-700/50';
  }
};

export const AnalysisScreen = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState({});

  const listRefFeed = useRef(null);
  const listRefPriority = useRef(null);

  useEffect(() => {
    listRefFeed.current && autoAnimate(listRefFeed.current);
    listRefPriority.current && autoAnimate(listRefPriority.current);
  }, [listRefFeed, listRefPriority]);

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

  const getRecentIncidents = () => {
    return Object.values(incidents).sort((a, b) => b.timestamp - a.timestamp);
  };

  const getPriorityIncidents = () => {
    return Object.values(incidents).sort((a, b) => {
      const pA = a.severity_block?.severity || "PENDING";
      const pB = b.severity_block?.severity || "PENDING";
      const diff = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
      if (diff === 0) return b.timestamp - a.timestamp;
      return diff;
    });
  };

  const recentIncidents = getRecentIncidents();
  const priorityIncidents = getPriorityIncidents();

  return (
    <div className="w-full h-[calc(100vh-68px)] flex flex-col md:flex-row overflow-hidden bg-[#0A0D12]">

      {/* LEFT PANEL (65%) - Uploaded Disasters List */}
      <div className="w-full md:w-[65%] flex flex-col h-full border-b md:border-b-0 md:border-r border-gray-800/80 bg-gradient-to-br from-gray-900/40 to-[#0A0D12] shadow-2xl z-10">
        <div className="px-8 py-5 border-b border-gray-800/80 bg-gray-900/80 backdrop-blur-md z-10 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm flex items-center gap-3">
            <span className="text-2xl">📡</span> Live Incident Feed
          </h2>
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30 shadow-inner">
            {recentIncidents.length} Detected
          </span>
        </div>

        <div ref={listRefFeed} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-hide pb-20">
          {recentIncidents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 mt-20">
              <span className="text-6xl animate-pulse mb-4">🌍</span>
              <p className="text-xl font-medium">Awaiting incoming telemetry...</p>
            </div>
          ) : recentIncidents.map(incident => {
            const severity = incident.severity_block?.severity || "ANALYZING";
            return (
              <div
                key={incident.id}
                onClick={onNavigate}
                className={`p-5 rounded-3xl cursor-pointer backdrop-blur-xl bg-gray-800/40 border transition-all duration-300 flex flex-col sm:flex-row gap-6 shadow-xl hover:bg-gray-800/60 hover:scale-[1.01] ${getSeverityGlow(severity)}`}
              >
                {/* Small Image Left */}
                <div className="w-full sm:w-[240px] h-[160px] flex-shrink-0 relative overflow-hidden rounded-2xl border border-gray-700 bg-black">
                  <img
                    src={incident.image_url}
                    className="w-full h-full object-cover"
                    alt="incident"
                  />
                  {severity === "ANALYZING" && (
                    <div className="absolute top-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </div>
                  )}
                </div>

                {/* Info Right */}
                <div className="flex-1 flex flex-col min-w-0 pr-2">
                  <h3 className="text-2xl font-extrabold text-white capitalize truncate drop-shadow-sm mb-1">
                    {incident.disaster_type || "Awaiting Classification"}
                  </h3>

                  <p className="text-sm text-gray-300 font-medium leading-relaxed line-clamp-2 mt-1 mb-3">
                    {incident.description || "Agent computing context..."}
                  </p>

                  <div className="flex items-center text-xs font-semibold text-gray-400 tracking-wide mb-4">
                    <span className="mr-1.5 text-base">📍</span>
                    <span className="truncate">{incident.zone || "Locating..."}</span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest relative z-10 block ${getSeverityColor(severity)}`}>
                        {severity}
                      </span>
                    </div>

                    {incident.confidence && (
                      <span className="text-[11px] font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/30 whitespace-nowrap">
                        Confidence: {Math.round(incident.confidence * 100)}%
                      </span>
                    )}

                    {incident.severity_block?.priority_score && (
                      <span className="text-[11px] font-bold text-gray-300 bg-gray-900 border border-gray-700 shadow-inner px-2 py-1 rounded-md whitespace-nowrap">
                        Score: <strong className="text-white ml-1">{incident.severity_block.priority_score}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL (35%) - AI Agent Priority Sorting */}
      <div className="w-full md:w-[35%] bg-[#0f141d] flex flex-col h-full shadow-2xl relative z-20">
        <div className="px-6 py-5 border-b border-gray-800/80 bg-gray-900/95 backdrop-blur-md z-10 shadow-lg">
          <h2 className="text-lg font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text drop-shadow-sm flex items-center justify-between">
            Agentic AI Priority Sorting
            <span className="text-xl">🤖</span>
          </h2>
        </div>

        <div ref={listRefPriority} className="flex-1 overflow-y-auto p-5 space-y-4 pb-20">



          {priorityIncidents.length === 0 ? (
            <div className="text-gray-600 text-center py-10 text-sm flex flex-col items-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              Queue Empty
            </div>
          ) : priorityIncidents.map(incident => {
            const severity = incident.severity_block?.severity || "ANALYZING";
            return (
              <div
                key={incident.id}
                className={`flex gap-3.5 p-3 rounded-2xl transition-all duration-300 shadow-md transform hover:-translate-y-0.5 bg-gray-800/50 hover:bg-gray-800/80 ${getSeverityGlow(severity)}`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={incident.image_url}
                    alt="thumbnail"
                    className="w-14 h-14 object-cover rounded-xl border border-gray-700 shadow-inner opacity-90"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
                  <h3 className="text-xs font-bold text-white capitalize truncate leading-tight drop-shadow-sm mb-1.5">
                    {incident.disaster_type || "Pending..."}
                  </h3>

                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase truncate shadow-sm ${getSeverityColor(severity)}`}>
                      {severity}
                    </span>
                    {incident.severity_block?.priority_score && (
                      <span className="text-[10px] font-mono text-gray-400 font-semibold bg-gray-900/80 px-1.5 py-0.5 rounded border border-gray-700/50">
                        {incident.severity_block.priority_score} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
