import React, { useState, useEffect, useRef } from "react";
import { X, Activity, Send, Cpu, UploadCloud, MapPin as MapPinIcon, ShieldCheck, Zap } from "lucide-react";
import clsx from "clsx";
import { logger } from "../services/logger";
import { TerminalLogViewer } from "./TerminalLogViewer";

const getDisasterDisplayName = (item) => {
  const name = (item.fileName || '').toLowerCase();
  const type = (item.disaster_type || '').toLowerCase();

  if (type.includes('fire') || name.includes('fire')) return { label: 'FIRE INCIDENT', icon: '🔥' };
  if (type.includes('flood') || name.includes('flood')) return { label: 'FLOOD DISASTER', icon: '🌊' };
  if (type.includes('collapse') || name.includes('collapse')) return { label: 'BUILDING COLLAPSE', icon: '🏚' };
  return { label: 'EMERGENCY SIGNAL', icon: '⚠️' };
};

import { persistence, STORAGE_KEYS } from "../services/persistence";

export const UploadScreen = ({ items, setItems, onSubmit, onFilesSelected, isProcessing }) => {
  const fileInputRef = useRef(null);
  const [selectedId, setSelectedId] = useState(() => persistence.load(STORAGE_KEYS.SELECTED_ID, null));

  // Persistence Save Effect
  useEffect(() => {
    persistence.save(STORAGE_KEYS.SELECTED_ID, selectedId);
  }, [selectedId]);

  // Auto-selection of first item (only if none selected and items exist)
  useEffect(() => {
    if (items.length > 0 && !selectedId) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  useEffect(() => {
    const sequences = [
      { msg: "ReliefNet Command Center initializing...", prefix: "BOOT", delay: 100 },
      { msg: "Connecting to Global Emergency Feeds...", prefix: "LINK", delay: 400 },
      { msg: "Intelligence Pipeline: ONLINE", prefix: "SYSTEM", delay: 800 },
      { msg: "Monitoring for incoming SOS signals...", prefix: "READY", delay: 1200 },
    ];
    sequences.forEach(s => {
      setTimeout(() => logger.emit(s.msg, s.prefix), s.delay);
    });
  }, []);

  const removeItem = (e, id) => {
    e.stopPropagation();
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files) onFilesSelected(Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) onFilesSelected(Array.from(e.dataTransfer.files));
  };

  const selectedItem = items.find(it => it.id === selectedId) || null;

  return (
    <div className="w-full h-[calc(100vh-64px)] grid grid-cols-[380px_1fr_380px] bg-[#FFFFFF] font-sans overflow-hidden">
      
      {/* 1. LEFT PANEL: INCOMING INCIDENTS */}
      <div className="flex flex-col h-full border-r border-[#E5E7EB] bg-[#FFFFFF] overflow-hidden">
        <header className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between bg-white z-10">
          <h2 className="text-[11px] font-bold text-[#111827] uppercase tracking-[0.2em]">Incoming Incidents</h2>
          <span className="text-[10px] font-bold text-[#6B7280] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E5E7EB]">
            {items.length} ACTIVE
          </span>
        </header>

        <div className="flex-1 p-6 space-y-3 overflow-y-auto scrollbar-hide pb-20 bg-[#F1F5F9]">
          {items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-2xl mx-1 bg-white/50">
               <Activity className="animate-pulse mb-4 text-[#6B7280]" size={32} />
               <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Monitoring Signals...</p>
            </div>
          ) : items.map((item) => {
            const { label, icon } = getDisasterDisplayName(item);
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedId(item.id)}
                className={clsx(
                  "group p-4 rounded-xl transition-all cursor-pointer border",
                  selectedId === item.id 
                    ? "bg-white border-[#E5E7EB] border-l-4 border-l-[#EF4444] soft-shadow scale-[1.02]" 
                    : "bg-[#F1F5F9] border-transparent hover:bg-white/60"
                )}
              >
                 <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white border border-[#E5E7EB] overflow-hidden flex-shrink-0">
                       <img src={item.base64} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="intake" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[10px] font-black text-[#111827] uppercase truncate tracking-tight">{icon} {label}</h4>
                          <button onClick={(e) => removeItem(e, item.id)} className="text-[#6B7280] hover:text-[#EF4444] transition-colors"><X size={12}/></button>
                       </div>
                       <p className="text-[9px] text-[#6B7280] font-bold uppercase tracking-widest leading-none mb-2 truncate">{item.location}</p>
                       <div className="flex items-center gap-2">
                          <span className="text-[7px] font-bold text-[#EF4444] bg-[#FEE2E2] px-1.5 py-0.5 rounded uppercase tracking-widest border border-[#EF4444]/20">RECEIVED</span>
                          <span className="text-[7px] font-bold text-[#6B7280] uppercase tracking-widest opacity-40">MOBILE APP</span>
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER PANEL: INTELLIGENCE PREVIEW */}
      <div className="flex flex-col h-full bg-[#FFFFFF] overflow-hidden relative">
         <header className="px-8 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-[#111827] uppercase tracking-[0.2em]">Intelligence Preview</h2>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest italic opacity-60">Command Center Link Active</span>
            </div>
         </header>

         <div className="hidden">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple hidden />
         </div>

         <div 
            className="flex-1 p-10 overflow-y-auto scrollbar-hide flex flex-col items-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
         >
            {!selectedItem ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-sm">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center">
                     <Activity size={32} className="text-[#E5E7EB] animate-pulse" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-[0.3em]">Sector Monitoring</h3>
                     <p className="text-xs text-[#6B7280] font-medium leading-relaxed italic opacity-60">"Waiting for incoming emergency signal from regional telemetry nodes..."</p>
                  </div>
               </div>
            ) : (
               <div key={selectedId} className="w-full space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
                  <div className="aspect-video bg-[#F1F5F9] rounded-[48px] border border-[#E5E7EB] overflow-hidden soft-shadow relative group">
                     <img src={selectedItem.base64} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[6000ms]" alt="preview" />
                     <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-white via-white/40 to-transparent">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="text-[10px] font-black text-[#EF4444] uppercase tracking-[0.4em]">Operational Target</span>
                        </div>
                        <h3 className="text-4xl font-black text-[#111827] uppercase tracking-tighter mb-1">
                           {getDisasterDisplayName(selectedItem).icon} {getDisasterDisplayName(selectedItem).label}
                        </h3>
                        <p className="text-sm font-bold text-[#6B7280] tracking-[0.1em] uppercase">{selectedItem.location}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                     <InfoDetail label="Status" value="RECEIVED" color="#EF4444" />
                     <InfoDetail label="Time" value={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} color="#111827" />
                     <InfoDetail label="Source" value="Mobile App" color="#3B82F6" />
                     <InfoDetail label="Confidence" value="98.4%" color="#22C55E" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full px-4">
                     <StatusCard 
                        icon={<Send size={18} />} 
                        label="INCIDENT SOURCE" 
                        value="VERIFIED MOBILE APP" 
                     />
                     <StatusCard 
                        icon={<Activity size={18} />} 
                        label="SIGNAL STATUS" 
                        value="ACTIVE CONNECTION" 
                     />
                     <StatusCard 
                        icon={<Cpu size={18} />} 
                        label="AI STATUS" 
                        value="READY FOR ANALYSIS" 
                     />
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* 3. RIGHT PANEL: AI RESPONSE PIPELINE */}
      <div className="flex flex-col h-full border-l border-[#E5E7EB] bg-[#FFFFFF] overflow-hidden">
         <header className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between bg-white z-10">
            <h2 className="text-[11px] font-bold text-[#111827] uppercase tracking-[0.2em]">AI Response Pipeline</h2>
         </header>

         <div className="flex-1 p-6 space-y-8 overflow-y-auto scrollbar-hide">
             <div className="space-y-4">
                <h4 className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest px-1">Tactical Analysis Stream</h4>
                <div className="rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#FFFFFF] p-1">
                  <TerminalLogViewer />
                </div>
             </div>

             <div className="pt-6 border-t border-[#E5E7EB]">
                <button
                  disabled={isProcessing || items.length === 0}
                  onClick={onSubmit}
                  className="w-full relative py-6 bg-[#EF4444] rounded-2xl text-white font-bold uppercase text-xs tracking-[0.3em] overflow-hidden transition-all hover:bg-[#DC2626] active:scale-[0.98] disabled:opacity-20 soft-shadow"
                >
                  {isProcessing ? "ANALYZING TACTICAL DATA..." : "START ANALYSIS"}
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};

const InfoDetail = ({ label, value, color }) => (
   <div className="space-y-1">
      <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">{label}</p>
      <p className="text-[14px] font-black uppercase tracking-tight" style={{ color }}>{value}</p>
   </div>
);

const StatusCard = ({ icon, label, value }) => (
   <div className="p-6 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[32px] flex items-center gap-5 soft-shadow transition-transform hover:scale-[1.02]">
      <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#3B82F6] shadow-sm">
         {icon}
      </div>
      <div className="min-w-0">
         <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-[0.2em] mb-1">{label}</p>
         <p className="text-[11px] font-black text-[#111827] uppercase tracking-tight truncate">{value}</p>
      </div>
   </div>
);
