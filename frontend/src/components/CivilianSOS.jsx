import React, { useState, useRef, useEffect } from 'react';
import { sosBridge } from '../services/sosBridge';
import { Shield, CheckCircle2, UploadCloud, Activity, Send, X, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

export const CivilianSOS = () => {
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [view, setView] = useState('sos'); // 'sos' or 'success'
  const [sending, setSending] = useState(false);
  const [tempItems, setTempItems] = useState([]);
  const fileInputRef = useRef(null);

  const handleSOSClick = () => {
    if (!networkAvailable) {
      alert("Mode: Offline. Emergency transmission requires active network link.");
      return;
    }

    setSending(true);
    // Remote trigger the dashboard automation
    sosBridge.triggerSimulation();
    
    setTimeout(() => {
      setSending(false);
      setView('success');
      // Briefly show success then close to return focus to dashboard
      setTimeout(() => window.close(), 3000);
    }, 1200);
  };

  const processFiles = (files) => {
    let validFiles = files.filter(f => f.type.startsWith("image/"));
    if (tempItems.length + validFiles.length > 3) {
      alert("Maximum 3 snapshots allowed.");
      validFiles = validFiles.slice(0, 3 - tempItems.length);
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        const tempId = Math.random().toString();
        
        const newItem = { 
          id: tempId, 
          base64, 
          fileName: file.name,
          location: "Bangalore Region",
          description: "Packet transmitted. Syncing with HQ..."
        };
        
        setTempItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleManualSubmit = () => {
    if (tempItems.length === 0) return;
    setSending(true);
    
    // Transmit all items in the current batch
    tempItems.forEach(item => {
      sosBridge.sendManualUpload(item);
    });

    setTimeout(() => {
      setSending(false);
      setView('success');
      // Briefly show success then close to return focus to dashboard
      setTimeout(() => window.close(), 3000);
    }, 1200);
  };

  const removeItem = (id) => {
    setTempItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white font-sans flex flex-col selection:bg-[#FF2D2D]/30 overflow-hidden">
      
      {/* HEADER */}
      <header className="px-8 py-6 bg-black border-b border-[#FF2D2D]/20 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2D2D] to-[#800000] flex items-center justify-center shadow-[0_0_20px_rgba(255,45,45,0.3)]">
              <Shield size={24} className="text-white" />
           </div>
           <div>
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">ReliefNet</h1>
              <p className="text-[10px] font-bold text-[#FF2D2D] uppercase tracking-[0.2em] opacity-80">Civilian Emergency Interface</p>
           </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 bg-[#1A1A1A] px-4 py-2 rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full ${networkAvailable ? 'bg-[#10B981] shadow-[0_0_10px_#10B981]' : 'bg-[#FF2D2D] shadow-[0_0_10px_#FF2D2D]'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                 {networkAvailable ? 'Network Available' : 'Sync Mode'}
              </span>
           </div>
           <button 
             onClick={() => setNetworkAvailable(!networkAvailable)}
             className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center p-1 ${networkAvailable ? 'bg-[#10B981]/20' : 'bg-[#FF2D2D]/20'}`}
           >
              <div className={`w-4 h-4 rounded-full transition-transform duration-300 ${networkAvailable ? 'translate-x-6 bg-[#10B981]' : 'translate-x-0 bg-[#FF2D2D]'}`} />
           </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden">
         
         <div className="max-w-6xl w-full h-full flex flex-col items-center justify-center">
            
            {view === 'sos' && (
               <div className="w-full flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-12 lg:gap-20 animate-in fade-in duration-700">
                  
                  {/* LEFT COLUMN: SOS TRIGGER */}
                  <div className="w-full lg:w-1/3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/5 pb-12 lg:pb-0 lg:pr-20">
                     <div className="text-center mb-8">
                        <h2 className="text-sm font-black text-[#FF2D2D] uppercase tracking-[0.4em] mb-2">Primary Uplink</h2>
                        <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest opacity-40">Immediate Command Signal</p>
                     </div>

                     <button 
                       onClick={handleSOSClick}
                       className="group relative w-72 h-72 rounded-full bg-[#FF2D2D] border-[14px] border-black shadow-[0_0_80px_rgba(255,45,45,0.4)] flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                     >
                        <div className="absolute inset-0 rounded-full border-4 border-[#FF2D2D] animate-ping opacity-20" />
                        <span className="text-7xl font-black tracking-tighter mb-1 select-none">SOS</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 select-none">Send Signal</span>
                     </button>
                  </div>

                  {/* RIGHT COLUMN: MANUAL REPORTING */}
                  <div className="w-full lg:w-2/3 flex flex-col gap-8 py-4">
                     <div className="flex flex-col gap-2">
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Detailed Analysis</h2>
                        <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest opacity-40">Capture scene image for neural verification</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full min-h-[350px]">
                        {/* UPLOAD BOX */}
                        <div 
                           onDragOver={(e) => e.preventDefault()}
                           onDrop={(e) => { e.preventDefault(); processFiles(Array.from(e.dataTransfer.files)); }}
                           onClick={() => tempItems.length < 3 && fileInputRef.current?.click()}
                           className={clsx(
                              "flex-1 border-2 border-dashed rounded-[3rem] p-10 flex flex-col items-center justify-center transition-all cursor-pointer group bg-[#1A1A1A]/40 hover:bg-[#1A1A1A]/80 border-white/5 hover:border-[#FF2D2D]/40 shadow-2xl",
                              tempItems.length >= 3 && "opacity-40 cursor-not-allowed grayscale"
                           )}
                        >
                           <UploadCloud className="w-16 h-16 text-[#FF2D2D] mb-6 group-hover:scale-110 transition-transform opacity-80" />
                           <span className="text-lg font-black uppercase tracking-tight mb-2">Transmit Image</span>
                           <span className="text-[10px] text-[#9CA3AF] font-bold tracking-[0.2em] opacity-40">Drop file or click to browse</span>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => processFiles(Array.from(e.target.files))} />
                        </div>

                        {/* DATA FEED */}
                        <div className="flex flex-col gap-4">
                           <div className="flex flex-col gap-4 h-full">
                              <div className="flex items-center justify-between px-6 py-4 bg-black/40 rounded-3xl border border-white/5">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Report Queue</span>
                                 <div className="flex items-center gap-2">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", tempItems.length > 0 ? "bg-[#10B981] animate-pulse" : "bg-white/10")} />
                                    <span className="text-[11px] font-black text-white">{tempItems.length} / 03 PACKETS</span>
                                 </div>
                              </div>
                              
                              <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[180px] pr-2 scrollbar-hide">
                                 {tempItems.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center border border-white/5 border-dashed rounded-[2.5rem] opacity-20 text-[10px] font-black uppercase tracking-[0.2em]">
                                       No reports queued...
                                    </div>
                                 ) : (
                                    tempItems.map(item => (
                                       <div key={item.id} className="flex bg-[#1A1A1A]/60 rounded-3xl p-4 border border-white/5 animate-in slide-in-from-bottom-4 duration-300">
                                          <div className="w-14 h-14 rounded-2xl bg-black overflow-hidden flex-shrink-0 border border-white/10">
                                             <img src={item.base64} className="w-full h-full object-cover" alt="upload residue" />
                                          </div>
                                          <div className="flex-1 min-w-0 px-5 flex flex-col justify-center">
                                             <div className="flex justify-between items-start mb-1">
                                                <p className="text-[10px] font-black truncate text-white uppercase">{item.fileName}</p>
                                                <button onClick={() => removeItem(item.id)} className="text-[#9CA3AF] hover:text-[#FF2D2D] transition-colors"><X size={14} /></button>
                                             </div>
                                             <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-widest opacity-60 italic">Awaiting Submission</p>
                                          </div>
                                       </div>
                                    ))
                                 )}
                              </div>

                              <button 
                                onClick={handleManualSubmit}
                                disabled={tempItems.length === 0}
                                className="w-full flex items-center justify-center gap-4 bg-white/5 hover:bg-[#10B981]/10 text-white hover:text-[#10B981] py-5 rounded-[2rem] border border-white/10 hover:border-[#10B981]/40 font-black uppercase text-[12px] tracking-[0.3em] transition-all disabled:opacity-20 disabled:grayscale group"
                              >
                                 <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                 Submit Report
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {view === 'success' && (
               <div className="flex flex-col items-center max-w-lg text-center animate-in fade-in zoom-in duration-700">
                  <div className="w-24 h-24 rounded-full bg-[#10B981]/10 border-2 border-[#10B981] flex items-center justify-center text-[#10B981] mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                     <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tight mb-4 text-white">Transmission Successful</h2>
                  <p className="text-[#9CA3AF] font-medium leading-relaxed mb-10 px-8">
                     Telemetry link established. Your incident report has been registered. The command dashboard is now recalculating resources.
                  </p>
                  
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-4">
                     <div className="h-full bg-[#10B981] animate-progress-shrink" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black text-[#10B981] uppercase tracking-[0.4em] opacity-80">
                      <Activity size={12} className="animate-pulse" />
                      Automatic Tab Re-Focus in progress...
                  </div>
               </div>
            )}
         </div>

         {sending && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
               <div className="w-20 h-20 border-4 border-[#FF2D2D] border-t-transparent rounded-full animate-spin mb-8" />
               <p className="text-[10px] font-black text-[#FF2D2D] uppercase tracking-[0.5em] animate-pulse">Establishing Neural Link...</p>
            </div>
         )}
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 px-8 py-8 text-center border-t border-white/5 bg-black/40 backdrop-blur-xl">
         <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.4em] max-w-xl mx-auto leading-relaxed opacity-60">
            Secure emergency channel active. All imagery is encrypted and transmitted directly to the reliefnet command infrastructure.
         </p>
      </footer>

      <style>{`
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-progress-shrink {
          animation: progress-shrink 3s linear forwards;
        }
      `}</style>
    </div>
  );
};
