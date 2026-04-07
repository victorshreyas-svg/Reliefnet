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
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">Live Incident Feed</h2>
        <span className="bg-red-500/20 text-red-500 text-xs font-bold px-3 py-1 rounded-full animate-pulse flex items-center">
          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          LIVE UPDATES
        </span>
      </div>
      
      <div className="space-y-6">
        {incidentArray.map((incident) => (
          <div key={incident.id} className="bg-gray-800/80 backdrop-blur-md border border-gray-700/80 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row gap-6 transition hover:border-gray-600">
            
            <div className="w-full md:w-1/3 flex-shrink-0">
              {incident.image_url?.startsWith("data:image") ? (
                <img src={incident.image_url} alt="Disaster" className="w-full h-auto max-h-56 object-cover rounded-xl border border-gray-700" />
              ) : (
                <div className="w-full h-48 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700 text-gray-500 text-sm">
                  Placeholder Image
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-extrabold text-white capitalize">{incident.disaster_type}</h3>
                  <p className="text-gray-400 text-sm mt-1">{incident.zone} • {incident.coordinates?.lat}, {incident.coordinates?.lng}</p>
                </div>
                {incident.severity_block ? (
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg ${
                    incident.severity_block.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                    incident.severity_block.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                    incident.severity_block.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                    'bg-green-500/20 text-green-400 border border-green-500/50'
                  }`}>
                    {incident.severity_block.severity} ({incident.severity_block.priority_score})
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-gray-700/50 text-gray-400 border border-gray-600">
                    Analyzing...
                  </span>
                )}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-gray-600 pl-3">
                {incident.description || (incident.status === 'pending' ? "Agent 1 processing image context..." : "")}
              </p>

              {incident.dispatch_plan ? (
                <div className="mt-4 p-5 bg-gradient-to-br from-gray-900/80 to-gray-800/50 rounded-xl border border-blue-500/30 shadow-inner space-y-4">
                  <div className="flex items-center font-bold text-white text-lg border-b border-gray-700/50 pb-2">
                    <span className="mr-3 text-xl">🚑</span> 
                    Dispatch Status: <span className="ml-2 text-blue-400 uppercase tracking-wide text-sm bg-blue-500/10 px-2 py-0.5 rounded">{incident.dispatch_plan.status}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                    <div className="flex items-start">
                      <span className="mr-3 text-lg">👨‍🚒</span>
                      <div>
                        <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Teams assigned</span>
                        <span className="text-gray-100 font-medium">{incident.dispatch_plan.teams?.join(", ") || "None"}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <span className="mr-3 text-lg">🚒</span>
                      <div>
                        <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Vehicles assigned</span>
                        <span className="text-gray-100 font-medium">{incident.dispatch_plan.vehicles?.join(", ") || "None"}</span>
                      </div>
                    </div>

                    <div className="flex items-start sm:col-span-2">
                      <span className="mr-3 text-lg">⏱</span>
                      <div>
                        <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">ETA</span>
                        <span className="font-extrabold text-orange-400 text-base">{incident.dispatch_plan.eta_minutes} minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="mt-4 p-4 bg-gray-900/30 rounded-xl border border-gray-700 text-gray-500 text-sm font-medium flex items-center">
                    <span className="animate-pulse mr-2 w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Waiting for Resource Dispatch Agent...
                 </div>
              )}

              {incident.resource_tracking && (
                <div className="mt-4 p-5 bg-gradient-to-br from-gray-900/80 to-gray-800/50 rounded-xl border border-green-500/30 shadow-inner">
                  {incident.resource_tracking.status === 'arrived' ? (
                    <div className="flex flex-col space-y-2">
                       <div className="flex items-center font-bold text-green-400 text-lg border-b border-gray-700/50 pb-2">
                         <span className="mr-3 text-xl">✅</span> Resources Arrived
                       </div>
                       <div className="text-sm mt-2">
                         <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] block mb-1">Status</span>
                         <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded">arrived</span>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                       <div className="flex items-center font-bold text-white text-lg border-b border-gray-700/50 pb-2">
                         <span className="mr-3 text-xl">🚑</span> Resource Movement
                       </div>
                       <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                         <div>
                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Status</span>
                            <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded uppercase text-xs tracking-wide">{incident.resource_tracking.status}</span>
                         </div>
                         <div>
                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">ETA Remaining</span>
                            <span className="font-extrabold text-orange-400 text-base">{incident.resource_tracking.eta_remaining} minutes</span>
                         </div>
                         <div className="col-span-2">
                            <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Updating Location</span>
                            <span className="text-gray-200 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                              {incident.resource_tracking.current_location.lat}, {incident.resource_tracking.current_location.lng}
                            </span>
                         </div>
                       </div>
                       
                       <div className="mt-3 w-full bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                          <div className="bg-gradient-to-r from-blue-500 to-green-400 h-3 rounded-full transition-all duration-1000 ease-linear shadow-lg" style={{ width: `${incident.resource_tracking.progress}%` }}></div>
                       </div>
                       <div className="text-right text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">
                         Progress: {incident.resource_tracking.progress}%
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
