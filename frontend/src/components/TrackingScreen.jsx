import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
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
  Zap,
  TrendingUp,
  Cpu,
  Brain,
  Users
} from 'lucide-react';

const createEmojiIcon = (emoji, color = '#3b82f6') => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full animate-ping opacity-40" style="background-color: ${color}4d;"></div>
        <div class="absolute w-10 h-10 border-2 rounded-full animate-[spin_3s_linear_infinite] opacity-20" style="border-color: ${color}; border-top-color: white;"></div>
        <div style="background: ${color}20; border: 2px solid ${color}; width: 42px; height: 42px;" class="rounded-full flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-md relative z-10 transition-transform">
          ${emoji}
        </div>
      </div>
    `,
    className: 'custom-emoji-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
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

export const TrackingScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  
  const [incident] = useState(state?.incident);
  const [baseResources] = useState(state?.resources || []);
  const [enrichedResources, setEnrichedResources] = useState([]);
  const [isRanking, setIsRanking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulationTime, setSimulationTime] = useState(0);

  useEffect(() => {
    if (!incident || !baseResources.length) return;
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
      setEnrichedResources(prev => prev.map(res => {
        if (res.progress >= 100) return { ...res, progress: 100, currentEta: 0, status: "ARRIVED" };
        const step = 100 / (res.duration * 5); 
        const nextProgress = Math.min(res.progress + step, 100);
        const nextEta = Math.max(Math.ceil(res.duration * (1 - nextProgress / 100)), 0);
        return { ...res, progress: nextProgress, currentEta: nextEta, status: nextProgress >= 100 ? "ARRIVED" : "EN_ROUTE" };
      }));
      setSimulationTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, enrichedResources.length]);

  if (!state || !state.incident) {
    return (
      <div className="h-full w-full bg-[#0A0F1F] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Establishing Telemetry Link...</p>
      </div>
    );
  }

  const centerLat = Number(incident.coordinates?.lat || incident.lat) || 12.9716;
  const centerLng = Number(incident.coordinates?.lng || incident.lng) || 77.5946;

  const incidentIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-16 h-16 bg-red-500/20 rounded-full animate-ping opacity-30"></div>
        <div class="relative w-12 h-12 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-2xl shadow-[0_0_25px_rgba(239,68,68,0.5)]">
          ${incident.disaster_type?.toLowerCase().includes('fire') ? '🔥' : incident.disaster_type?.toLowerCase().includes('flood') ? '🌊' : '🏢'}
        </div>
      </div>
    `,
    className: 'incident-marker',
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });

  return (
    <div className="w-full h-[calc(100vh-68px)] flex flex-row overflow-hidden bg-[#05070B] font-sans p-4 gap-4 selection:bg-[#00E5FF]/30">
      
      {/* 1. LEFT SIDEBAR: DISASTER TELEMETRY */}
      <aside className="w-[400px] h-full flex flex-col bg-[#0B0F17]/50 backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl relative flex-shrink-0">
        <header className="px-6 py-5 border-b border-white/[0.06] bg-[#0B0F17]/80 flex items-center justify-between">
          <div>
            <h2 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert className="text-[#EF4444] animate-pulse" size={12} />
              Incident Telemetry
            </h2>
            <p className="text-[9px] font-bold text-[#9CA3AF] tracking-tighter opacity-40 uppercase">Satellite Uplink Active</p>
          </div>
          <div className="flex items-center gap-2 bg-[#EF4444]/10 px-3 py-1 rounded-full border border-[#EF4444]/25">
             <div className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
             <span className="text-[9px] font-black text-[#EF4444] uppercase tracking-tighter">LIVE FEED</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
          {/* Tactical Identity Card */}
          <div className="p-6 bg-[#0F1623]/40 border border-white/[0.06] rounded-3xl relative overflow-hidden group shadow-inner">
            <div className="flex justify-between items-start mb-4">
              <div className="min-w-0">
                <p className="text-[9px] text-[#00E5FF] font-black mb-1.5 opacity-50 uppercase tracking-[0.15em] leading-none">Detection Report</p>
                <h3 className="text-2xl font-black text-[#E6EDF3] capitalize leading-none tracking-tight group-hover:text-[#00E5FF] transition-colors">{incident.disaster_type?.replace('_', ' ')}</h3>
              </div>
              <div className="text-right">
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-widest ${incident.severity_block?.severity === 'CRITICAL' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'}`}>
                  {incident.severity_block?.severity || 'HIGH'}
                </div>
                <p className="text-[8px] text-[#9CA3AF] font-bold mt-1.5 uppercase opacity-40">Severity</p>
              </div>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-[9px] font-black text-[#9CA3AF] mb-2 uppercase tracking-tight opacity-60">
                     <span>Neural Confidence</span>
                     <span className="text-[#00E5FF]">{Math.round((incident.confidence || 0.94) * 100)}%</span>
                  </div>
                  <div className="h-1 w-full bg-black rounded-full overflow-hidden border border-white/[0.03]">
                     <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] shadow-[0_0_10px_rgba(0,229,255,0.3)]" style={{ width: `${(incident.confidence || 0.94) * 100}%` }} />
                  </div>
               </div>
            </div>
          </div>

          {/* Location & Geospatial Card */}
          <div className="p-5 bg-[#0F1623]/20 border border-white/[0.03] rounded-3xl relative group">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 rounded-2xl bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/20 shadow-inner group-hover:scale-105 transition-transform"><MapPin className="text-[#00E5FF]" size={18} /></div>
               <div className="min-w-0">
                  <p className="text-[9px] text-[#9CA3AF] font-black uppercase tracking-widest leading-none mb-1.5 opacity-40">Verified Sector</p>
                  <h4 className="text-sm font-black text-[#E6EDF3] truncate leading-none uppercase tracking-tight">{incident.zone}</h4>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.03]">
               <div>
                  <p className="text-[8px] text-[#9CA3AF] font-black mb-1.5 uppercase tracking-tighter opacity-40">Risk Assessment</p>
                  <p className="text-[11px] font-black text-[#EF4444] capitalize">{incident.severity_block?.risk_level || 'Extreme'}</p>
               </div>
               <div>
                  <p className="text-[8px] text-[#9CA3AF] font-black mb-1.5 uppercase tracking-tighter opacity-40">Est. Victims</p>
                  <p className="text-[11px] font-black text-[#E6EDF3] tracking-wider">{incident.severity_block?.estimated_victims || '40-60'}</p>
               </div>
            </div>
          </div>

          {/* AI Cognitive Assessment Card */}
          <div className="p-5 bg-[#0F1623]/20 border border-white/[0.03] rounded-3xl relative overflow-hidden group">
             <div className="flex items-center gap-2 mb-3">
                <Brain className="text-[#7C3AED] group-hover:rotate-12 transition-transform" size={14} />
                <p className="text-[9px] text-[#9CA3AF] font-black uppercase tracking-widest opacity-40">AI Decision Logic</p>
             </div>
             <p className="text-[11px] text-[#9CA3AF] font-medium leading-relaxed italic border-l-2 border-[#7C3AED]/30 pl-4">
                {incident.severity_block?.reasoning || "Autonomous units deployed based on thermal signature and structural stability metrics."}
             </p>
          </div>

          {/* Operational Status Card */}
          <div className="p-5 bg-[#0B0F17]/60 border border-white/[0.06] rounded-3xl shadow-inner relative overflow-hidden">
             <header className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.03]">
                <div className="flex items-center gap-2">
                   <Zap className="text-[#00E5FF]" size={14} />
                   <h4 className="text-[10px] font-black text-[#E6EDF3] uppercase tracking-widest">Fleet Telemetry</h4>
                </div>
                <div className="text-[8px] font-black text-[#22C55E] flex items-center gap-1.5 uppercase italic"><div className="w-1 h-1 rounded-full bg-[#22C55E] animate-pulse" />Active</div>
             </header>
             <div className="space-y-2">
                <StatusRow label="Assigned Assets" value={`${enrichedResources.length} Units`} />
                <StatusRow label="Tactical Link" value="ENCRYPTED" color="#00E5FF" />
                <StatusRow label="Mission Status" value="SEARCH & RESCUE" />
             </div>
          </div>
        </div>
      </aside>

      {/* 2. CENTER PANEL: TACTICAL MAP */}
      <main className="flex-1 relative bg-[#0B0F17]/30 border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl group">
        <MapContainer center={[centerLat, centerLng]} zoom={13} className="h-full w-full" zoomControl={false} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
          <Marker position={[centerLat, centerLng]} icon={incidentIcon} />
          {enrichedResources.map((res, idx) => (
            <React.Fragment key={res.name}>
              <Marker position={[Number(res.lat), Number(res.lng)]} icon={createEmojiIcon(getResourceEmoji(res.type), res.status === 'ARRIVED' ? '#10b981' : '#00E5FF')}>
                <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent className="custom-tooltip">
                   <div className="bg-[#0B0F17]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[9px] font-black text-[#E6EDF3] shadow-xl uppercase tracking-widest">{res.name}</div>
                </Tooltip>
              </Marker>
              {res.polyline && (
                <Polyline positions={res.polyline} pathOptions={{ color: res.status === 'ARRIVED' ? '#10b981' : '#00E5FF', weight: 4, opacity: 0.6, lineCap: 'round', dashArray: res.status === 'ARRIVED' ? '0' : '8, 12', className: 'route-animate' }} />
              )}
            </React.Fragment>
          ))}
          {!loading && <RecenterMap coords={[[centerLat, centerLng], ...enrichedResources.map(r => [Number(r.lat), Number(r.lng)])]} />}
        </MapContainer>

        {/* Floating Intelligence Overlay */}
        <div className="absolute top-6 right-6 z-[1000] transition-transform duration-500 group-hover:scale-105 pointer-events-none">
          <div className="bg-[#0B0F17]/80 backdrop-blur-3xl border border-white/[0.1] p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 border-l-[#00E5FF] border-l-4 min-w-[340px]">
             <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] border border-[#00E5FF]/20 shadow-inner ring-1 ring-white/5"><Navigation size={22} className="animate-pulse" /></div>
             <div className="flex-1 min-w-0 pr-4">
               <p className="text-[9px] text-[#9CA3AF] font-black mb-0.5 uppercase opacity-40 tracking-[0.2em] leading-none">Intelligence Sector</p>
               <p className="text-base font-black text-[#E6EDF3] truncate uppercase tracking-tight">{incident.zone}</p>
             </div>
             <div className="pl-6 border-l border-white/[0.06]">
                <p className="text-[9px] text-[#9CA3AF] font-black mb-0.5 uppercase opacity-40 tracking-[0.2em] leading-none">Security</p>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse shadow-[0_0_10px_#22C55E]" />
                   <span className="text-[10px] font-black text-[#22C55E] uppercase italic">ENCRYPTED</span>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR: ASSET STREAM */}
      <aside className="w-[400px] h-full flex flex-col bg-[#0B0F17]/50 backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl relative flex-shrink-0">
         <header className="px-6 py-5 border-b border-white/[0.06] bg-[#0B0F17]/80 flex items-center justify-between">
          <div>
            <h2 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="text-[#00E5FF]" size={12} />
              Asset Inventory
            </h2>
            <p className="text-[9px] font-bold text-[#9CA3AF] tracking-tighter opacity-40 uppercase">Real-time Deployment Stream</p>
          </div>
          {isRanking && <div className="w-3 h-3 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />}
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
          {!loading ? enrichedResources.map((res, idx) => (
            <div key={res.name} className={`p-5 rounded-3xl border transition-all duration-500 relative overflow-hidden group ${res.status === 'ARRIVED' ? 'bg-[#22C55E]/5 border-[#22C55E]/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : 'bg-[#0F1623]/40 border-white/[0.06] hover:bg-[#0F1623]/60 hover:border-[#00E5FF]/20 shadow-inner'}`}>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${res.status === 'ARRIVED' ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' : 'bg-black border-white/[0.06] text-[#00E5FF] shadow-inner'}`}>
                    <span className="text-xl drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">{getResourceEmoji(res.type)}</span>
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <h4 className="text-[13px] font-black text-[#E6EDF3] truncate leading-none mb-1.5 tracking-tight uppercase group-hover:text-[#00E5FF] transition-colors">{res.name}</h4>
                    <span className="text-[8px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] leading-none opacity-40">{res.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-black italic tracking-tighter leading-none ${res.status === 'ARRIVED' ? 'text-[#22C55E] animate-pulse' : 'text-[#00E5FF]'}`}>
                    {res.status === 'ARRIVED' ? '00:00' : `${String(res.currentEta).padStart(2, '0')}:${String(Math.floor(simulationTime % 60)).padStart(2, '0')}`}
                  </div>
                  <p className="text-[8px] text-[#9CA3AF] font-bold mt-1.5 uppercase opacity-40 tracking-widest">ARRIVAL ETA</p>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] transition-all">
                  <span className="text-[#9CA3AF] opacity-40">{res.distance} KM DIS</span>
                  <span className={res.status === 'ARRIVED' ? 'text-[#22C55E]' : 'text-[#00E5FF]'}>{Math.round(res.progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden p-[1.5px] border border-white/[0.03]">
                   <div className={`h-full transition-all duration-1000 rounded-full ${res.status === 'ARRIVED' ? 'bg-[#22C55E] shadow-[0_0_10px_#22C55E]' : 'bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] shadow-[0_0_10px_rgba(0,229,255,0.3)]'}`} style={{ width: `${res.progress}%` }} />
                </div>
              </div>
              
              {/* Background Glow Decal */}
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-[40px] opacity-10 transition-opacity duration-700 group-hover:opacity-20 ${res.status === 'ARRIVED' ? 'bg-[#22C55E]' : 'bg-[#00E5FF]'}`} />
            </div>
          )) : (
            <div className="space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 w-full rounded-3xl bg-[#0B0F17]/40 animate-pulse border border-white/[0.06]" />
              ))}
            </div>
          )}
        </div>
      </aside>

      <style>{`
        .leaflet-container { background: #05070B !important; }
        .custom-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
        .custom-tooltip::before { display: none; }
        .route-animate { stroke-dashoffset: 100; animation: dash 5s linear infinite; }
        @keyframes dash { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
        @keyframes flow-glow { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; } 
      `}</style>
    </div>
  );
};

const StatusRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between px-4 py-2 bg-[#0F1623]/60 rounded-2xl border border-white/[0.06] group hover:border-[#00E5FF]/20 transition-all shadow-inner">
     <span className="text-[10px] font-black text-[#9CA3AF] tracking-widest uppercase opacity-60">{label}</span>
     <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: color || '#E6EDF3' }}>{value}</span>
  </div>
);

