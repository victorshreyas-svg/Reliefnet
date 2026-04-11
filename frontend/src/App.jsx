import React, { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { UploadScreen } from './components/UploadScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { DispatchScreen } from './components/DispatchScreen';
import { TrackingScreen } from './components/TrackingScreen';
import { CivilianSOS } from './components/CivilianSOS';
import { usePipeline } from './hooks/usePipeline';
import { sosBridge } from './services/sosBridge';
import { getBase64FromUrl, predefinedDisasters } from './services/simulationData';
import { runAgent1 } from './services/agents';
import { Play, UploadCloud } from 'lucide-react';
import { logger } from './services/logger';

import { persistence, STORAGE_KEYS } from './services/persistence';

function App() {
  const { processMultiple, isProcessing } = usePipeline();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize from persistence
  const [items, setItems] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Persistence Save Effect
  React.useEffect(() => {
    persistence.save(STORAGE_KEYS.INCIDENTS, items);
  }, [items]);

  // Session Restore Indicator
  // Session Management: Start Fresh on Every Run
  React.useEffect(() => {
    persistence.clear();
    if (items.length > 0) {
      setSessionRestored(true);
      const timer = setTimeout(() => setSessionRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []); // Only on mount

  // 1. Define handlers first to avoid hoisting/initialization issues
  const handleStartSimulation = useCallback(async () => {
    persistence.clear(); // Fresh start
    setIsSimulating(true);
    navigate('/');
    const wait = (ms) => new Promise(res => setTimeout(res, ms));
    
    // Clear items first
    setItems([]);
    await wait(500);

    let loadedItems = [];
    
    for (let i = 0; i < predefinedDisasters.length; i++) {
      const disaster = predefinedDisasters[i];
      const base64 = await getBase64FromUrl(disaster.imageAsset);
      if (base64) {
        loadedItems.push({
          id: Math.random().toString(),
          file: null,
          fileName: disaster.imageAsset,
          base64,
          description: disaster.description,
          location: disaster.location,
          isPredefined: disaster.isPredefined
        });
      }
    }
    
    setItems(loadedItems);
    setIsSimulating(false);
  }, [navigate]);

  const handleSubmit = useCallback(async () => {
    if (items.length === 0) return;
    
    setTimeout(async () => {
      navigate('/analysis');
      await processMultiple(items);
      // Allow user to see sorting finish before jumping to dispatch
      setTimeout(() => {
        setItems([]);
        navigate('/dispatch');
      }, 5000);
    }, 1200);
  }, [items, navigate, processMultiple]);

  const handleFilesSelected = useCallback(async (files) => {
    const newItems = [];
    
    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      const tempId = Math.random().toString();
      const initialItem = {
        id: tempId,
        file,
        fileName: file.name,
        base64,
        location: "Calculating coordinates...",
        description: "Initiating AI visual assessment...",
        isPredefined: false
      };
      
      setItems(prev => [...prev, initialItem]);

      // Immediate Detection
      try {
        const result = await runAgent1(base64, "", file.name);
        const zones = ["Whitefield", "KR Puram", "Yelahanka", "Marathahalli", "Electronic City", "Jayanagar"];
        const randomLoc = zones[Math.floor(Math.random() * zones.length)] + ", Bangalore";
        
        setItems(prev => prev.map(item => 
          item.id === tempId ? { 
            ...item, 
            location: randomLoc, 
            description: result.reasoning || result.description || "Analysis ready for pipeline." 
          } : item
        ));
      } catch (err) {
        console.error("Local detection failed:", err);
      }
    }
  }, []);

  // 2. LISTEN FOR EXTERNAL SOS SIGNALS
  React.useEffect(() => {
    const unsub = sosBridge.onSignal(async (signal) => {
      // 1. Single SOS Alert Transmission
      if (signal.type === 'SOS_ALERT') {
        const sosData = signal.data;
        const newItem = {
          id: sosData.id || Math.random().toString(),
          file: null,
          fileName: sosData.imageAsset || 'external_sos.jpg',
          base64: sosData.base64,
          description: sosData.description,
          location: sosData.location,
          isPredefined: true
        };
        
        setItems([newItem]);
        
        setTimeout(async () => {
          navigate('/analysis');
          await processMultiple([newItem]);
          setTimeout(() => {
            setItems([]);
            navigate('/dispatch');
          }, 5000);
        }, 500);
      }
      
      // 2. Remote Simulation Trigger
      if (signal.type === 'TRIGGER_SIMULATION') {
        logger.emit("Remote simulation trigger received from SOS interface");
        handleStartSimulation();
      }

      // 3. Remote Manual Upload
      if (signal.type === 'MANUAL_UPLOAD') {
        const uploadData = signal.data;
        const newItem = {
          id: uploadData.id || Math.random().toString(),
          file: null,
          fileName: uploadData.fileName || 'custom_upload.jpg',
          base64: uploadData.base64,
          location: "Analyzing Remote Telemetry...",
          description: "Initiating AI classification...",
          isPredefined: false
        };
        
        logger.emit(`External data packet received: ${newItem.fileName}`);
        setItems(prev => [...prev, newItem]);

        // Immediate Auto-Detection for remote uploads too
        try {
           const result = await runAgent1(newItem.base64, "", newItem.fileName);
           const zones = ["Whitefield", "KR Puram", "Yelahanka", "Marathahalli", "Electronic City"];
           const randomLoc = zones[Math.floor(Math.random() * zones.length)] + ", Bangalore";
           
           setItems(prev => prev.map(item => 
             item.id === newItem.id ? { 
               ...item, 
               location: randomLoc, 
               description: result.reasoning || result.description || "Analysis complete." 
             } : item
           ));
        } catch (err) {
           console.error("Remote detection failed:", err);
        }
      }
    });
    return unsub;
  }, [navigate, processMultiple, handleStartSimulation]);

  // Derive current page from path for UI header logic
  const isUpload = location.pathname === '/';

  // Determine Pipeline Step
  let currentStep = 0;
  if (location.pathname === '/analysis') currentStep = 1;
  if (location.pathname === '/dispatch') currentStep = 2; // Allocation & Dispatch are same screen
  if (location.pathname === '/tracking') currentStep = 4;

  const PIPELINE_STEPS = ["Intake", "Analysis", "Allocation", "Dispatch", "Tracking"];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col relative pb-0">
      
      {/* GLOBAL HEADER */}
      <header className="h-[64px] flex items-center justify-between px-8 border-b border-[#E5E7EB] bg-[#FFFFFF] z-50">
        <div className="flex items-center">
          <h1 
            className="text-2xl font-black tracking-tighter text-[#111827] cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              persistence.clear();
              navigate('/');
              setItems([]);
            }}
          >
            RELIEFNET
          </h1>
          {sessionRestored && (
            <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-[#F0FDF4] border border-[#22C55E]/20 rounded-full animate-in fade-in slide-in-from-left-2 duration-500">
               <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
               <span className="text-[9px] font-black text-[#22C55E] uppercase tracking-widest">Session Restored</span>
            </div>
          )}
        </div>

        {/* CENTER NAVIGATION */}
        <nav className="hidden lg:flex items-center space-x-8">
          {PIPELINE_STEPS.map((step, idx) => {
             const routes = ['/', '/analysis', '/dispatch', '/dispatch', '/tracking'];
             const isActive = location.pathname === routes[idx] || (location.pathname === '/dispatch' && (idx === 2 || idx === 3));
             return (
               <button
                 key={step}
                 onClick={() => idx <= 4 && navigate(routes[idx])}
                 className={`text-[12px] font-bold uppercase tracking-[0.15em] transition-all ${isActive ? 'text-[#EF4444] border-b-2 border-[#EF4444] pb-5 translate-y-[2px]' : 'text-[#6B7280] hover:text-[#111827] pb-5'}`}
               >
                 {step}
               </button>
             );
          })}
        </nav>

        {/* STATUS BADGES */}
        <div className="hidden xl:flex items-center space-x-4">
           <StatusBadge label="AI ACTIVE" color="#22C55E" />
           <StatusBadge label="NETWORK ONLINE" color="#3B82F6" />
           <StatusBadge label="AGENTS READY" color="#6366F1" />
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        <Routes>
          <Route path="/" element={
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
                <UploadScreen 
                  items={items} 
                  setItems={setItems} 
                  onSubmit={handleSubmit} 
                  onFilesSelected={handleFilesSelected}
                  isProcessing={isProcessing} 
                />
            </div>
          } />
          <Route path="/analysis" element={
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
               <AnalysisScreen onNavigate={() => navigate('/dispatch')} />
            </div>
          } />
          <Route path="/dispatch" element={
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
              <DispatchScreen />
            </div>
          } />
          <Route path="/tracking" element={
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
              <TrackingScreen />
            </div>
          } />
          <Route path="/sos" element={
            <CivilianSOS />
          } />
        </Routes>
      </main>
    </div>
  );
}

const StatusBadge = ({ label, color }) => (
  <div className="flex items-center gap-2 px-3 py-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-full">
     <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
     <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest whitespace-nowrap">{label}</span>
  </div>
);

export default App;
