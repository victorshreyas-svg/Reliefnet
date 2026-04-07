import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getORSRoute, selectAgentResources } from '../services/rescueFinder';
import { rankResourcesByAI } from '../services/agents';
import { 
  Activity, 
  Navigation, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  ShieldCheck,
  AlertTriangle,
  Zap,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

// --- CUSTOM EMOJI MARKERS ---
const createEmojiIcon = (emoji, color = '#3b82f6') => {
  return L.divIcon({
    html: `
      <div style="
        background: ${color}20;
        border: 2px solid ${color};
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        box-shadow: 0 0 15px ${color}40;
        backdrop-filter: blur(4px);
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-emoji-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

const getResourceEmoji = (type) => {
  if (!type) return '📦';
  switch (type.toLowerCase()) {
    case 'hospital': return '🚑';
    case 'fire_station': return '🚒';
    case 'police': return '🚓';
    case 'rescue': return '🚁';
    default: return '📦';
  }
};

// --- HELPER COMPONENT TO RECENTER MAP ---
const RecenterMap = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  }, [coords, map]);
  return null;
};

export const TrackingScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  
  // 0. Diagnostic Mounting Log
  useEffect(() => {
    console.log("Tracking Brain: Component Mounting. State Received:", {
      hasState: !!state,
      incident: state?.incident ? "VALID" : "MISSING",
      resourceCount: state?.resources?.length || 0
    });
  }, [state]);

  // Guard for direct access
  useEffect(() => {
    if (!state || !state.incident || !state.resources) {
      console.warn("Tracking Brain: Data Incomplete. Redirecting to home zone.");
      const timer = setTimeout(() => navigate("/"), 2000);
      return () => clearTimeout(timer);
    }
  }, [state, navigate]);

  const [incident] = useState(state?.incident);
  const [baseResources] = useState(state?.resources || []);
  
  const [enrichedResources, setEnrichedResources] = useState([]);
  const [isRanking, setIsRanking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulationTime, setSimulationTime] = useState(0);

  // 1. Fetch Routes & Metrics
  useEffect(() => {
    if (!incident || !baseResources.length) return;

    const fetchAllData = async () => {
      setLoading(true);
      const enriched = [];
      
      for (const res of baseResources) {
        // PROTECTIVE COORDINATE BRIDGE: Handle both nested and flat coordinate formats
        const iLat = Number(incident.coordinates?.lat || incident.lat);
        const iLng = Number(incident.coordinates?.lng || incident.lng);
        const rLat = Number(res.lat);
        const rLng = Number(res.lng);

        let route = null;
        try {
          // Verify we have valid numbers before calling OSR
          if (!isNaN(rLat) && !isNaN(rLng) && !isNaN(iLat) && !isNaN(iLng)) {
            route = await getORSRoute(
              { lat: rLat, lng: rLng },
              { lat: iLat, lng: iLng }
            );
          } else {
            console.warn(`Rescue Brain: Missing coordinates for mission unit ${res.name}. Skipping routing.`);
          }
        } catch (err) {
          console.warn(`Route Fetch Bypass: ${res.name} (API failure)`, err);
        }
        
        // Push even if route is null, providing defaults for distance/duration
        // FALLBACK: If route is null, create a direct straight line [start, end]
        // ONLY create fallback if we have valid numerical coordinates to prevent Leaflet NaN crashes
        const hasValidCoords = !isNaN(rLat) && !isNaN(rLng) && !isNaN(iLat) && !isNaN(iLng);
        const fallbackPolyline = hasValidCoords ? [[rLat, rLng], [iLat, iLng]] : null;

        enriched.push({
          ...res,
          distance: route ? route.distance.toFixed(1) : (res.distance || "2.5"),
          duration: route ? Math.ceil(route.duration) : (res.duration || 10),
          polyline: route ? (route.geometry?.coordinates?.map(c => [c[1], c[0]]) || fallbackPolyline) : fallbackPolyline,
          currentEta: route ? Math.ceil(route.duration) : (res.duration || 10),
          progress: 0,
          status: "EN_ROUTE"
        });
      }

      // 2. AI Ranking
      setIsRanking(true);
      try {
        const sortedNames = await rankResourcesByAI(incident, enriched);
        const ranked = [...enriched].sort((a, b) => {
          const idxA = sortedNames.indexOf(a.name);
          const idxB = sortedNames.indexOf(b.name);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        setEnrichedResources(ranked);
      } catch (err) {
        setEnrichedResources(enriched);
      }
      
      setIsRanking(false);
      setLoading(false);
    };

    fetchAllData();
  }, [incident, baseResources]);

  // 3. Live Simulation (Progress & ETA)
  useEffect(() => {
    if (loading || enrichedResources.length === 0) return;

    const interval = setInterval(() => {
      setEnrichedResources(prev => prev.map(res => {
        if (res.progress >= 100) return { ...res, progress: 100, currentEta: 0, status: "ARRIVED" };
        
        // Dynamic speed based on distance
        const step = 100 / (res.duration * 5); // Simulated mission length
        const nextProgress = Math.min(res.progress + step, 100);
        const nextEta = Math.max(Math.ceil(res.duration * (1 - nextProgress / 100)), 0);
        
        return {
          ...res,
          progress: nextProgress,
          currentEta: nextEta,
          status: nextProgress >= 100 ? "ARRIVED" : "EN_ROUTE"
        };
      }));
      setSimulationTime(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, enrichedResources.length]);

  if (!state || !state.incident) {
    return (
      <div className="h-screen w-full bg-[#0A0D12] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Waiting for mission telemetry...</p>
      </div>
    );
  }

  const requiredUnits = Array.isArray(selectAgentResources(enrichedResources, incident?.disaster_type || incident?.type)) 
    ? selectAgentResources(enrichedResources, incident?.disaster_type || incident?.type).map(r => r.name) 
    : [];
  
  // Force Numerical Coordinates ONLY after we know incident exists
  const centerLat = Number(incident.coordinates?.lat || incident.lat || 12.9716);
  const centerLng = Number(incident.coordinates?.lng || incident.lng || 77.5946);

  // Incident icon with pulse
  const incidentIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 bg-red-500/30 rounded-full animate-ping"></div>
        <div class="relative w-10 h-10 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-xl shadow-xl">
          🔥
        </div>
      </div>
    `,
    className: 'incident-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  return (
    <div className="flex h-screen w-full bg-[#06080A] overflow-hidden text-white font-sans selection:bg-blue-500/30">
      
      {/* LEFT PANEL: 440px */}
      <div className="w-[440px] h-full flex flex-col border-r border-white/5 bg-[#0A0D12]/80 backdrop-blur-3xl z-20 shadow-2xl relative">
        
        {/* TOP SECTION: STRATEGIC OVERVIEW */}
        <div className="p-7 space-y-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                 <ShieldAlert className="text-red-500" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase leading-none">Mission Control</h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 text-blue-400">OPS ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${loading ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              {loading ? 'Analyzing' : 'Ready'}
            </div>
          </div>

          {/* GLOBAL MISSION PROGRESS */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global progress</p>
              <p className="text-xs font-black text-blue-400">
                {Math.round(enrichedResources.reduce((acc, r) => acc + r.progress, 0) / (enrichedResources.length || 1))}%
              </p>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
               <div 
                 className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                 style={{ width: `${enrichedResources.reduce((acc, r) => acc + r.progress, 0) / (enrichedResources.length || 1)}%` }}
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
              <p className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-wider">Disaster Type</p>
              <h3 className="text-sm font-black capitalize text-blue-400">{incident.disaster_type || incident.type}</h3>
            </div>
            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
              <p className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-wider">Severity</p>
              <h3 className={`text-sm font-black ${incident.severity === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`}>{incident.severity}</h3>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Assigned Sector</p>
                <h2 className="text-xl font-black text-white">{incident.zone}</h2>
              </div>
              <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black uppercase border border-blue-500/30">
                {incident.confidence}% Conf
              </div>
            </div>
            
            <div className="pt-3 border-t border-white/10">
              <p className="text-[9px] text-slate-500 font-bold uppercase mb-2 text-blue-400 tracking-widest">AI Dispatch Proposal (Agent 3)</p>
              <div className="flex flex-wrap gap-2 text-white">
                {(incident.teams || requiredUnits).map(unit => (
                  <span key={unit} className="px-2 py-1 bg-white/5 text-[9px] font-bold rounded-lg border border-white/10 shadow-sm">
                    {unit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: MISSION TRACKING */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-7 py-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Active Dispatch units</h3>
              {isRanking && <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />}
            </div>
            <TrendingUp size={14} className="text-blue-500" />
          </div>

          {!loading ? enrichedResources.map((res, idx) => (
            <div key={res.name} className="p-[1px] rounded-2xl bg-gradient-to-br from-white/10 to-transparent shadow-xl group">
              <div className="p-5 bg-[#0D1117] rounded-[15px] space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Zap size={18} fill={res.status === 'ARRIVED' ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-100">{res.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">{res.type.replace('_', ' ')}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[9px] font-bold text-blue-500/80 uppercase">Priority {idx + 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1.5 font-mono font-black text-sm ${res.status === 'ARRIVED' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      <Clock size={14} />
                      {res.status === 'ARRIVED' ? '00:00' : `${String(res.currentEta).padStart(2, '0')}:${String(Math.floor(simulationTime % 60)).padStart(2, '0')}`}
                    </div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">EST. Arrival</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-gray-500">Distance</span>
                    <span className="text-gray-300">{res.distance} km</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-900 rounded-full border border-white/5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full bg-gradient-to-r ${res.status === 'ARRIVED' ? 'from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'from-blue-600 to-indigo-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}
                      style={{ width: `${res.progress}%` }}
                    />
                  </div>
                </div>
                
                {res.status === 'ARRIVED' ? (
                  <div className="absolute top-0 right-0 p-2">
                    <ShieldCheck className="text-emerald-500/30" size={40} strokeWidth={1} />
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-gray-600 uppercase">
                    <span>En Route</span>
                    <ChevronRight size={10} />
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="space-y-4 pt-10">
               {[1,2,3].map(i => (
                 <div key={i} className="h-24 w-full rounded-2xl bg-white/5 animate-pulse" />
               ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: LEAFLET MAP */}
      <div className="flex-1 h-full relative z-10">
        <MapContainer 
          center={[centerLat, centerLng]} 
          zoom={13} 
          className="h-full w-full"
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          />
          
          {/* INCIDENT MARKER */}
          <Marker position={[centerLat, centerLng]} icon={incidentIcon}>
            <Popup className="custom-popup">
              <div className="p-1 font-sans">
                <p className="text-[10px] font-black text-red-500 uppercase">Active Incident Zone</p>
                <p className="text-sm font-bold text-gray-900">{incident.zone}</p>
              </div>
            </Popup>
          </Marker>

          {/* RESOURCE MARKERS & ROUTES */}
          {enrichedResources.map((res, idx) => {
            const rLat = Number(res.lat);
            const rLng = Number(res.lng);
            
            // RENDER SAFETY: Final check before attempting Map render
            if (isNaN(rLat) || isNaN(rLng)) return null;

            return (
              <React.Fragment key={res.name}>
                <Marker 
                  position={[rLat, rLng]} 
                  icon={createEmojiIcon(getResourceEmoji(res.type), res.status === 'ARRIVED' ? '#10b981' : '#3b82f6')}
                >
                  <Popup>
                    <div className="p-1 font-sans">
                      <p className="text-[10px] font-black text-blue-500 uppercase">Unit: {res.name}</p>
                      <p className="text-xs font-medium text-gray-700">Type: {res.type ? res.type.replace('_', ' ') : 'Specialist'}</p>
                    </div>
                  </Popup>
                </Marker>
                
                {/* STATIC ROUTE POLYLINE (Final NaN protection) */}
                {res.polyline && res.polyline.length > 0 && !res.polyline.flat().some(n => isNaN(n)) && (
                  <Polyline 
                    positions={res.polyline} 
                    pathOptions={{ 
                      color: res.status === 'ARRIVED' ? '#10b981' : (idx === 0 ? '#3b82f6' : '#6366f1'), 
                      weight: idx === 0 ? 8 : 6, // #1 gets thicker path, others get strong paths
                      opacity: idx === 0 ? 0.9 : 0.85, // Highly visible routes for all units
                      lineCap: 'round',
                      dashArray: res.status === 'ARRIVED' ? '0' : (idx === 0 ? '0' : '10, 15'),
                      className: idx === 0 ? 'mission-optimal-path' : 'mission-secondary-path'
                    }} 
                  >
                    <Popup>
                      <div className="text-[10px] font-bold uppercase p-1">
                        {idx === 0 ? '⭐ AI Optimized Route' : 'Alternative Response Vector'}
                      </div>
                    </Popup>
                  </Polyline>
                )}
              </React.Fragment>
            );
          })}

          {/* AUTO-CENTER TO FIT ALL ASSETS */}
          {!loading && <RecenterMap coords={[
            [centerLat, centerLng],
            ...enrichedResources.map(r => [Number(r.lat), Number(r.lng)])
          ]} />}
        </MapContainer>

        {/* MAP OVERLAY: STATUS UI */}
        <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-3">
          <div className="bg-[#0A0D12]/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
               <MapPin size={24} />
             </div>
             <div>
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Active Sector</p>
               <p className="text-sm font-black uppercase tracking-tight text-white">{incident.zone}</p>
             </div>
             <div className="ml-4 pl-4 border-l border-white/10">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Response status</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-black text-emerald-500 uppercase">SECURE</p>
                </div>
             </div>
          </div>
          
          <div className="bg-[#0A0D12]/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Activity size={18} className="text-blue-500 animate-pulse" />
               <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Mission Telemetry Link Active</p>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-container {
          background: #0D1117 !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #0D1117;
          color: #fff;
          border-radius: 12px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .custom-popup .text-gray-900 {
          color: #fff !important;
        }
        .leaflet-popup-tip {
          background: #0D1117;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-dash {
          stroke-dasharray: 10, 15;
          animation: dash 20s linear infinite;
        }
      `}</style>
    </div>
  );
};
