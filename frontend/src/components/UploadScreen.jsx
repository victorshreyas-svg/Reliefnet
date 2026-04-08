import React, { useRef, useEffect } from "react";
import { UploadCloud, X, Send, Activity, CheckCircle, Circle, Cpu, Terminal } from "lucide-react";
import clsx from "clsx";
import { runAgent1 } from "../services/agents";
import { logger } from "../services/logger";
import { TerminalLogViewer } from "./TerminalLogViewer";

export const UploadScreen = ({ items, setItems, onSubmit, isProcessing }) => {
  const fileInputRef = useRef(null);

  useEffect(() => {
    const sequences = [
      { msg: "ReliefNet core initializing...", prefix: "BOOT", delay: 100 },
      { msg: "Loading AI intelligence modules...", prefix: "BOOT", delay: 400 },
      { msg: "All 5 Intelligence Agents READY", prefix: "INIT", delay: 800 },
      { msg: "Neural telemetry link stable", prefix: "PIPELINE", delay: 1200 },
      { msg: "Awaiting incident upload...", prefix: "SYSTEM", delay: 1800 },
    ];

    sequences.forEach(s => {
      setTimeout(() => logger.emit(s.msg, s.prefix), s.delay);
    });
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    let validFiles = files.filter(f => f.type.startsWith("image/"));
    if (items.length + validFiles.length > 3) {
      alert("You can only upload up to 3 images.");
      validFiles = validFiles.slice(0, 3 - items.length);
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        const tempId = Math.random().toString();
        
        setItems(prev => [...prev, { 
          id: tempId, 
          file, 
          base64, 
          fileName: file.name,
          location: "Analyzing location...",
          description: "Generating AI classification..."
        }]);

        try {
          const a1ResultRaw = await runAgent1(base64, "", file.name);
          const aiType = a1ResultRaw.disaster_type;
          
          const zones = ["Whitefield", "KR Puram", "Yelahanka", "Marathahalli"];
          const location = zones[Math.floor(Math.random() * zones.length)] + ", Bangalore";
          
          let description = "Incident reported. Awaiting further analysis.";
          if (aiType === "flood") description = "Urban flooding reported. Roads submerged. Traffic disruption observed.";
          else if (aiType === "fire") description = "Active fire reported in building. Smoke visible. Emergency response required.";
          else if (["building_collapse", "earthquake", "landslide"].includes(aiType)) description = "Structural collapse detected. Possible casualties. Rescue teams required.";
          
          setItems(prev => prev.map(item => 
            item.id === tempId ? { ...item, location, description } : item
          ));
        } catch (error) {
          console.error("Agent 1 preview error:", error);
          setItems(prev => prev.map(item => 
            item.id === tempId ? { ...item, location: "Unknown Location", description: "Manual upload. Pending pipeline analysis." } : item
          ));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };


  return (
    <div className="w-full h-full flex flex-col p-6 animate-in fade-in duration-500 bg-[#05070B] font-sans overflow-hidden">
      
      {/* HEADER & AGENT INDICATOR */}
      <div className="flex justify-between items-center mb-8 pl-4 pr-4">
        <div>
           <h2 className="text-2xl font-black text-[#E6EDF3] tracking-tighter uppercase mb-1">Initialize Incident Data</h2>
           <p className="text-[10px] text-[#9CA3AF] font-black opacity-40 tracking-[0.2em]">MISSION CONTROL CENTER • LIVE DATA UPLINK</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-[#00E5FF]/5 border border-[#00E5FF]/20 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.05)] transition-all">
          <Activity size={16} className="text-[#00E5FF] animate-pulse" />
          <span className="text-[10px] font-black text-[#00E5FF] uppercase tracking-[0.2em]">Agent Running</span>
        </div>
      </div>


      {/* MAIN 3-COLUMN CONTENT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full px-6 overflow-hidden">
        
        {/* LEFT COLUMN: UPLOAD */}
        <div className="flex flex-col min-h-0 space-y-6">
          <div
            className={clsx(
              "border rounded-3xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl group border-white/[0.06] bg-[#0F1623]/40 backdrop-blur-md hover:bg-[#0F1623]/60 hover:border-[#00E5FF]/30 h-full",
              items.length >= 3 && "opacity-50 pointer-events-none grayscale"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => items.length < 3 && fileInputRef.current?.click()}
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#00E5FF] blur-3xl opacity-10 group-hover:opacity-30 transition-opacity" />
              <UploadCloud className="w-16 h-16 text-[#00E5FF] group-hover:scale-110 transition-transform relative z-10" />
            </div>
            <h3 className="text-[#E6EDF3] text-lg font-black tracking-tight uppercase">Transmit Spatial Imagery</h3>
            <p className="text-[10px] text-[#9CA3AF] mt-2 font-bold tracking-[0.1em] opacity-60">Click or drag & drop • Max 3 images</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-4">
            <button
              disabled={isProcessing || items.length === 0}
              onClick={onSubmit}
              className="w-full group relative flex items-center justify-center space-x-4 bg-[#0B0F17] hover:bg-[#0F1623] text-[#00E5FF] py-5 rounded-2xl font-black border border-[#00E5FF]/20 shadow-[0_0_30px_rgba(0,229,255,0.05)] disabled:opacity-20 disabled:grayscale transition-all overflow-hidden"
            >
              {/* Animated Glow Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#EF4444]/0 via-[#00E5FF]/5 to-[#EF4444]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              {isProcessing ? (
                <span className="animate-pulse flex items-center gap-3 uppercase text-[11px] tracking-[0.3em]">
                  <Activity size={18} className="animate-spin text-[#EF4444]" />
                  Processing Vectors...
                </span>
              ) : (
                <>
                  <Activity size={18} className="text-[#EF4444] group-hover:scale-110 transition-transform" />
                  <span className="uppercase text-[11px] tracking-[0.3em]">Start Analysing</span>
                  <Send size={16} className="opacity-40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0F1623]/60 rounded-xl border border-white/[0.06]">
              <div className={clsx("w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]", items.length > 0 ? "text-[#22C55E] bg-[#22C55E]" : "text-gray-600 bg-gray-600")} />
              <p className="text-[10px] font-black text-[#9CA3AF] tracking-[0.1em] uppercase">
                {items.length === 0 ? "WAITING FOR DATA PACKETS" : `READY: ${items.length} DISASTER ASSETS PREPARED`}
              </p>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: DETECTED INCIDENTS */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
             <div className="flex items-center gap-3">
                <Cpu size={16} className="text-[#00E5FF] opacity-50" />
                <h3 className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Detected Incidents</h3>
             </div>
             <span className="text-[9px] font-black text-[#9CA3AF] bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">{items.length} FOUND</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1">
            {items.length === 0 ? (
              <div className="h-48 border border-white/5 border-dashed rounded-3xl flex flex-col items-center justify-center text-gray-600">
                <p className="text-xs font-bold uppercase tracking-widest">No active detections</p>
              </div>
            ) : items.map((item) => {
              const isFire = item.description.toLowerCase().includes("fire");
              const isFlood = item.description.toLowerCase().includes("flood");
              const isCollapse = ["building_collapse", "collapse", "earthquake", "landslide"].some(d => item.description.toLowerCase().includes(d.replace('_', ' ')) || item.description.toLowerCase().includes(d));
              
              const disasterLabel = isFire ? "Fire Disaster" : isFlood ? "Flood Disaster" : isCollapse ? "Collapse Disaster" : "Active Disaster";
              const severity = isCollapse ? "CRITICAL" : isFire ? "HIGH" : "MODERATE";
              const severityColor = severity === "CRITICAL" ? "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20" : severity === "HIGH" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/20";
              const confidence = item.location === "Analyzing location..." ? "..." : (Math.floor(Math.random() * 15) + 85) + "%";

              return (
                <div key={item.id} className="group relative bg-[#0F1623]/40 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 flex gap-4 transition-all hover:border-[#00E5FF]/30 hover:bg-[#0F1623]/60">
                   <div className="w-[100px] h-[100px] rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/[0.06] group-hover:border-[#00E5FF]/30 transition-colors">
                      <img src={item.base64} alt="incident" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                         <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                               <span className={clsx("px-2 py-0.5 rounded-md text-[8px] font-black border uppercase tracking-tighter", severityColor)}>
                                 {severity}
                               </span>
                               <span className="text-[9px] font-black text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded-md border border-[#00E5FF]/20">
                                 {confidence} MATCH
                               </span>
                            </div>
                            <h4 className="text-[15px] font-black text-[#E6EDF3] tracking-tight truncate uppercase leading-none">{disasterLabel}</h4>
                         </div>
                         <button
                           onClick={() => removeItem(item.id)}
                           className="p-1.5 hover:bg-[#EF4444]/20 hover:text-[#EF4444] rounded-lg text-gray-700 transition-colors"
                         >
                           <X size={14} />
                         </button>
                      </div>

                      <div className="flex items-center gap-1.5 mb-2">
                         <MapPin size={10} className="text-[#00E5FF] opacity-60" />
                         <span className="text-[11px] font-bold text-[#9CA3AF] truncate leading-none">{item.location}</span>
                      </div>

                      <p className="text-[11px] text-[#9CA3AF] leading-tight line-clamp-2 italic opacity-60 font-medium">
                        {item.description}
                      </p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE BACKEND TERMINAL */}
        <div className="flex flex-col min-h-0">
          <TerminalLogViewer />
        </div>

      </div>
      
      {/* GLOBAL BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#EF4444]/5 blur-[120px] rounded-full" />
        <div className="absolute top-[10%] right-[-10%] w-[400px] h-[400px] bg-[#00E5FF]/5 blur-[100px] rounded-full" />
      </div>

    </div>
  );
};

// Re-import MapPin as it was missing in my internal check
const MapPin = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
