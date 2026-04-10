import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getORSRoute } from '../services/rescueFinder';
import { rankResourcesByAI } from '../services/agents';
import { 
  MapPin, 
  ShieldCheck
} from 'lucide-react';

const createEmojiIcon = (emoji, size = 28) => {
  return L.divIcon({
    html: `<div style="font-size: ${size}px; display: flex; align-items: center; justify-center; filter: drop-shadow(0 0 8px rgba(0,0,0,0.5));">${emoji}</div>`,
    className: 'custom-emoji-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const getDisasterEmoji = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('fire')) return '🔥';
  if (t.includes('flood')) return '🌊';
  if (t.includes('medical')) return '🏥';
  if (t.includes('building_collapse') || t.includes('earthquake')) return '🏚️';
  return '⚠️';
};

const getResourceEmoji = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('hospital')) return '🚑';
  if (t.includes('fire')) return '🚒';
  if (t.includes('police')) return '🚓';
  if (t.includes('rescue')) return '🚁';
  return '📦';
};

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

import { persistence, STORAGE_KEYS } from '../services/persistence';

export const TrackingScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || persistence.load(STORAGE_KEYS.TRACKING, null);
  
  const [incident] = useState(state?.incident);
  const [baseResources] = useState(state?.resources || []);
  const [enrichedResources, setEnrichedResources] = useState(() => {
    const saved = persistence.load(STORAGE_KEYS.TRACKING, null);
    return saved?.enrichedResources || [];
  });
  const [isRanking, setIsRanking] = useState(false);
  const [loading, setLoading] = useState(!enrichedResources.length);
  const [simulationTime, setSimulationTime] = useState(0);

  // Persistence Save Effect
  useEffect(() => {
    if (incident && enrichedResources.length) {
      persistence.save(STORAGE_KEYS.TRACKING, { incident, resources: baseResources, enrichedResources });
    }
  }, [incident, baseResources, enrichedResources]);

  const [allArrived, setAllArrived] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!incident || !baseResources.length || enrichedResources.length > 0) return;
    const fetchAllData = async () => {
      setLoading(true);
      const enriched = [];
      for (const res of baseResources) {
        const iLat = Number(incident.coordinates?.lat || incident.lat);
        const iLng = Number(incident.coordinates?.lng || incident.lng);
        const rLat = Number(res.lat);
        const rLng = Number(res.lng);
        let route = null;
        try {
          if (!isNaN(rLat) && !isNaN(rLng) && !isNaN(iLat) && !isNaN(iLng)) {
            route = await getORSRoute({ lat: rLat, lng: rLng }, { lat: iLat, lng: iLng });
          }
        } catch (err) { console.warn("Route Fetch Bypass", err); }
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
      setIsRanking(true);
      try {
        const sortedNames = await rankResourcesByAI(incident, enriched);
        const ranked = [...enriched].sort((a, b) => {
          const idxA = sortedNames.indexOf(a.name);
          const idxB = sortedNames.indexOf(b.name);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        setEnrichedResources(ranked);
      } catch (err) { setEnrichedResources(enriched); }
      setIsRanking(false); setLoading(false);
    };
    fetchAllData();
  }, [incident, baseResources]);

  useEffect(() => {
    if (loading || enrichedResources.length === 0) return;
    const interval = setInterval(() => {
      setEnrichedResources(prev => {
        const next = prev.map(res => {
          if (res.progress >= 100) return { ...res, progress: 100, currentEta: 0, status: "ARRIVED" };
          const step = 100 / (res.duration * 5); 
          const nextProgress = Math.min(res.progress + step, 100);
          const nextEta = Math.max(Math.ceil(res.duration * (1 - nextProgress / 100)), 0);
          return { ...res, progress: nextProgress, currentEta: nextEta, status: nextProgress >= 100 ? "ARRIVED" : "EN_ROUTE" };
        });

        const allDone = next.length > 0 && next.every(r => r.status === "ARRIVED");
        if (allDone && !allArrived) {
          setAllArrived(true);
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 3000);
        }
        
        return next;
      });
      setSimulationTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, enrichedResources.length, allArrived]);

  if (!state || !state.incident) {
    return (
      <div className="h-full w-full bg-[#FFFFFF] flex flex-col items-center justify-center font-sans">
        <p className="text-[#6B7280] uppercase tracking-[0.5em] animate-pulse text-xs">Uplinking Mission Telemetry...</p>
      </div>
    );
  }

  const centerLat = Number(incident.coordinates?.lat || incident.lat) || 12.9716;
  const centerLng = Number(incident.coordinates?.lng || incident.lng) || 77.5946;

  const incidentIcon = createEmojiIcon(getDisasterEmoji(incident.disaster_type), 32);

  const getDisasterColor = (type) => {
     const t = (type || "").toLowerCase();
     if (t.includes('fire')) return "#EF4444";
     if (t.includes('flood')) return "#3B82F6";
     if (t.includes('collapse') || t.includes('earthquake')) return "#F59E0B";
     return "#6B7280";
  };

  const getUnitColor = (type) => {
     const t = (type || "").toLowerCase();
     if (t.includes('fire')) return "#EF4444";
     if (t.includes('hospital') || t.includes('medical')) return "#22C55E";
     if (t.includes('police')) return "#3B82F6";
     if (t.includes('rescue')) return "#F59E0B";
     return "#6B7280";
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col bg-[#FFFFFF] font-sans overflow-hidden">
      
      {/* 1. TOP GLOBAL STATUS BAR */}
      <div className="px-10 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
         <div className="flex items-center gap-10">
            <div className="flex flex-col">
               <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Response Phase</span>
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${allArrived ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                  <span className="text-[13px] font-black text-[#111827] uppercase tracking-tight">{allArrived ? 'OBJECTIVES SECURED' : 'LIVE RESPONSE ACTIVE'}</span>
               </div>
            </div>
            <div className="w-px h-8 bg-[#E5E7EB]" />
            <div className="flex items-center gap-4">
               <span className="px-3 py-1 bg-[#F0FDF4] border border-[#22C55E]/30 text-[#22C55E] text-[10px] font-black rounded-full uppercase tracking-widest">Mission: Active</span>
               <span className="px-3 py-1 bg-[#EFF6FF] border border-[#3B82F6]/30 text-[#3B82F6] text-[10px] font-black rounded-full uppercase tracking-widest">Units: {enrichedResources.length}</span>
               <span className={`px-3 py-1 bg-[#F5F3FF] border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] font-black rounded-full uppercase tracking-widest transition-all ${allArrived ? 'opacity-100' : 'opacity-40'}`}>Status: Secured</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.2em]">Regional Command Node: BAN-01</span>
         </div>
      </div>

      <div className="flex-1 grid grid-cols-[380px_1fr_420px] overflow-hidden">
         
         {/* LEFT COLUMN: MISSION TELEMETRY */}
         <div className="border-r border-[#E5E7EB] p-8 overflow-y-auto scrollbar-hide space-y-8">
            <h3 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-4">Mission Telemetry</h3>

            <div className="p-8 bg-white border border-[#E5E7EB] border-l-[8px] rounded-[32px] soft-shadow" style={{ borderLeftColor: getDisasterColor(incident.disaster_type) }}>
               <div className="flex justify-between items-start mb-6">
                  <div className="text-4xl">{getDisasterEmoji(incident.disaster_type)}</div>
                  <span className="text-[10px] font-black text-[#111827] tracking-[0.1em] uppercase">Sector: {incident.zone}</span>
               </div>
               <h4 className="text-2xl font-black text-[#111827] uppercase tracking-tighter mb-4">{incident.disaster_type?.replace('_', ' ')}</h4>
               
               <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">
                     <span>Intelligence Confidence</span>
                     <span className="text-[#111827]">{Math.round((incident.confidence || 0.95) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-full overflow-hidden">
                     <div className="h-full bg-[#111827] transition-all duration-1000" style={{ width: `${(incident.confidence || 0.95) * 100}%` }} />
                  </div>
               </div>
            </div>

            <div className="p-8 bg-white border border-[#E5E7EB] rounded-[32px] soft-shadow space-y-6">
               <h4 className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Fleet Operations</h4>
               <div className="space-y-3">
                  <StatusRow label="Units Engaged" value={`${enrichedResources.length} Assets`} color="#3B82F6" tint="#EFF6FF" />
                  <StatusRow label="Data Link" value="ENCRYPTED" color="#8B5CF6" tint="#F5F3FF" />
                  <StatusRow label="Objective" value={allArrived ? "SECURED" : "PENDING"} color={allArrived ? "#22C55E" : "#EF4444"} tint={allArrived ? "#F0FDF4" : "#FEF2F2"} />
               </div>
            </div>
         </div>

         {/* CENTER COLUMN: LIVE MAP TRACKING */}
         <div className="bg-[#F8FAFC] p-8 flex flex-col overflow-hidden relative border-r border-[#E5E7EB]">
            <h3 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-4 text-center">Live Map Tracking</h3>
            
            <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[48px] p-4 soft-shadow relative overflow-hidden group">
               <MapContainer center={[centerLat, centerLng]} zoom={13} className="h-full w-full rounded-[38px]" zoomControl={false} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  <Marker position={[centerLat, centerLng]} icon={incidentIcon} />
                  {enrichedResources.map((res) => (
                    <React.Fragment key={res.name}>
                        <Marker position={[Number(res.lat), Number(res.lng)]} icon={createEmojiIcon(getResourceEmoji(res.type), 28)}>
                           <Popup className="custom-popup" offset={[0, -5]}>
                              <div className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-[10px] font-black text-[#111827] shadow-xl uppercase tracking-widest">{res.name}</div>
                           </Popup>
                        </Marker>
                        {res.polyline && (
                          <Polyline positions={res.polyline} pathOptions={{ color: res.status === 'ARRIVED' ? '#22C55E' : '#3B82F6', weight: 4, opacity: 0.8, lineCap: 'round', dashArray: res.status === 'ARRIVED' ? '0' : '10, 15', className: 'route-animate' }} />
                        )}
                    </React.Fragment>
                  ))}
                  {!loading && <RecenterMap coords={[[centerLat, centerLng], ...enrichedResources.map(r => [Number(r.lat), Number(r.lng)])]} />}
               </MapContainer>

               {/* MAP OVERLAY BADGE */}
               <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-6 py-2 bg-white/90 backdrop-blur-md border border-[#22C55E]/30 rounded-full shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] font-black text-[#111827] uppercase tracking-widest whitespace-nowrap">Live Response Tracking • AI Telemetry Active</span>
               </div>

               {showBanner && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] pointer-events-none animate-banner-slide">
                     <div className="bg-white/95 backdrop-blur-xl border border-[#22C55E]/50 p-12 rounded-[48px] shadow-2xl flex flex-col items-center gap-4 min-w-[450px] soft-shadow border-t-[8px]">
                        <ShieldCheck size={48} className="text-[#22C55E] mb-2" />
                        <h2 className="text-3xl font-black text-[#111827] tracking-[0.2em] uppercase">Sector Secured</h2>
                        <p className="text-[11px] text-[#22C55E] font-black uppercase tracking-widest">Mission Critical Objectives Complete</p>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* RIGHT COLUMN: ASSET STATUS */}
         <div className="p-8 overflow-y-auto scrollbar-hide space-y-8 bg-white">
            <h3 className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.3em] mb-4">Asset Status</h3>
            
            <div className="space-y-4">
               {!loading ? enrichedResources.map((res) => {
                  const statusColor = res.status === 'ARRIVED' ? '#22C55E' : res.status === 'EN_ROUTE' ? '#F59E0B' : '#3B82F6';
                  const unitColor = getUnitColor(res.type);

                  return (
                     <div key={res.name} className={`p-6 bg-white border rounded-[32px] transition-all duration-500 soft-shadow`} style={{ borderColor: `${statusColor}40`, borderLeft: `8px solid ${statusColor}` }}>
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex gap-4 items-center">
                              <div className="text-3xl p-3 bg-[#F8FAFC] rounded-2xl border border-[#E5E7EB]">{getResourceEmoji(res.type)}</div>
                              <div>
                                 <h4 className="text-[14px] font-black text-[#111827] uppercase tracking-tight">{res.name}</h4>
                                 <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">{res.type.replace('_', ' ')}</span>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="text-[12px] font-black tracking-widest uppercase" style={{ color: statusColor }}>
                                 {res.status === 'ARRIVED' ? 'ARRIVED' : 'EN ROUTE'}
                              </div>
                              {res.status !== 'ARRIVED' && (
                                <div className="text-[10px] font-bold text-[#6B7280] tabular-nums mt-1">ETA {String(res.currentEta).padStart(2, '0')}:{String(Math.floor(simulationTime % 60)).padStart(2, '0')}</div>
                              )}
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                              <span className="text-[#6B7280]">{res.distance} KM</span>
                              <span style={{ color: unitColor }}>{Math.round(res.progress)}%</span>
                           </div>
                           <div className="h-2 w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-full overflow-hidden shadow-inner">
                              <div className="h-full transition-all duration-1000 shadow-sm" style={{ width: `${res.progress}%`, backgroundColor: unitColor }} />
                           </div>
                        </div>
                     </div>
                  );
               }) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                     <div className="w-10 h-10 border-t-4 border-[#111827] rounded-full animate-spin" />
                     <p className="text-[9px] font-bold uppercase tracking-[0.3em]">Synching Sat-Link...</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      <style>{`
        .leaflet-container { background: #FFFFFF !important; }
        .custom-popup .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .custom-popup .leaflet-popup-tip-container { display: none !important; }
        .custom-popup .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .route-animate { stroke-dashoffset: 100; animation: dash 5s linear infinite; }
        @keyframes dash { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
        .animate-banner-slide {
          animation: banner-entry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes banner-entry {
          0% { transform: translate(-50%, calc(-50% - 60px)) scale(0.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const StatusRow = ({ label, value, color, tint }) => (
  <div className="flex items-center justify-between px-5 py-3 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
     <span className="text-[10px] font-bold text-[#6B7280] tracking-widest uppercase">{label}</span>
     <span className="px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-full" style={{ color: color, backgroundColor: tint }}>{value}</span>
  </div>
);
