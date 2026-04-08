import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { UploadScreen } from './components/UploadScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { DispatchScreen } from './components/DispatchScreen';
import { TrackingScreen } from './components/TrackingScreen';
import { usePipeline } from './hooks/usePipeline';
import { getBase64FromUrl, predefinedDisasters } from './services/simulationData';
import { Play } from 'lucide-react';
import { logger } from './services/logger';

function App() {
  const { processMultiple, isProcessing } = usePipeline();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Derive current page from path for UI header logic
  const isUpload = location.pathname === '/';

  const handleStartSimulation = async () => {
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
  };

  const handleSubmit = async () => {
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
  };

  // Determine Pipeline Step
  let currentStep = 0;
  if (location.pathname === '/analysis') currentStep = 1;
  if (location.pathname === '/dispatch') currentStep = 2; // Allocation & Dispatch are same screen
  if (location.pathname === '/tracking') currentStep = 4;

  const PIPELINE_STEPS = ["Upload", "Analysis", "Allocation", "Dispatch", "Tracking"];

  return (
    <div className="min-h-screen bg-[#05070B] text-[#E6EDF3] flex flex-col relative pb-0 transition-colors duration-700">
      
      {/* GLOBAL HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0B0F17]/80 backdrop-blur-3xl z-50 shadow-[0_0_20px_rgba(0,229,255,0.02)]">
        <div className="flex items-center space-x-8">
          <h1 
            className="text-2xl font-black tracking-tighter bg-gradient-to-r from-[#EF4444] to-[#00E5FF] text-transparent bg-clip-text cursor-pointer hover:opacity-80 transition-opacity drop-shadow-[0_0_10px_rgba(0,229,255,0.2)]"
            onClick={() => {
              navigate('/');
              setItems([]);
            }}
          >
            ReliefNet
          </h1>

          {/* PIPELINE PROGRESS INDICATOR */}
          <div className="hidden md:flex items-center space-x-2 bg-[#0F1623]/80 px-4 py-1.5 rounded-full border border-white/[0.06] shadow-inner">
             {PIPELINE_STEPS.map((step, idx) => {
                const isActive = location.pathname === '/dispatch' ? idx <= 3 : idx <= currentStep;
                return (
                   <React.Fragment key={step}>
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all duration-500 ${isActive ? 'text-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_0_10px_rgba(0,229,255,0.1)]' : 'text-[#9CA3AF]'}`}>
                      {step}
                    </div>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <div className={`h-px w-3 ${isActive ? 'bg-[#00E5FF]/30' : 'bg-white/[0.04]'}`} />
                    )}
                  </React.Fragment>
                );
             })}
          </div>
        </div>
        
        {isUpload && (
          <button
            onClick={handleStartSimulation}
            disabled={isSimulating || isProcessing}
            style={{
              background: 'linear-gradient(135deg, #3d0000 0%, #2b0000 100%)',
              borderColor: '#ff2a2a66',
            }}
            className="group relative flex items-center justify-center px-8 py-2.5 rounded-md border-[0.5px] transition-all duration-300 active:scale-[0.98] disabled:opacity-30 disabled:grayscale animate-sos-pulse hover:brightness-125"
          >
            {/* INSET GLOW EFFECT */}
            <div className="absolute inset-0 rounded-md shadow-[inset_0_0_15px_rgba(255,42,42,0.3)] pointer-events-none" />
            
            {/* METALLIC FINISH OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

            {isSimulating ? (
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 border-2 border-[#ff2a2a] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#ff2a2a] text-[11px] font-black uppercase tracking-[2px] animate-pulse">Engaging...</span>
              </div>
            ) : (
              <div className="relative flex items-center space-x-3">
                {/* EMERGENCY INDICATOR LIGHT */}
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff2a2a] shadow-[0_0_10px_#ff2a2a] animate-pulse" />
                <span className="text-[#ff2a2a] text-[13px] font-black uppercase tracking-[3px] drop-shadow-[0_0_8px_rgba(255,42,42,0.5)]">
                  SOS
                </span>
              </div>
            )}

            {/* HOVER DANGER LIGHT */}
            <div className="absolute -inset-[2px] border border-[#ff2a2a]/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        <Routes>
          <Route path="/" element={
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
               <UploadScreen 
                 items={items} 
                 setItems={setItems} 
                 onSubmit={handleSubmit} 
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
        </Routes>
      </main>
    </div>
  );
}

export default App;
