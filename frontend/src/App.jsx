import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { UploadScreen } from './components/UploadScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { DispatchScreen } from './components/DispatchScreen';
import { TrackingScreen } from './components/TrackingScreen';
import { usePipeline } from './hooks/usePipeline';
import { getBase64FromUrl, predefinedDisasters } from './services/simulationData';
import { Play } from 'lucide-react';

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
    navigate('/analysis');
    await processMultiple(items);
    // Allow user to see sorting finish before jumping to dispatch
    setTimeout(() => {
      setItems([]);
      navigate('/dispatch');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col relative pb-0">
      
      {/* GLOBAL HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm z-50">
        <h1 
          className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text cursor-pointer"
          onClick={() => {
            navigate('/');
            setItems([]);
          }}
        >
          ReliefNet
        </h1>
        
        {isUpload && (
          <button
            onClick={handleStartSimulation}
            disabled={isSimulating || isProcessing}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition shadow-lg border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? (
              <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div><span className="text-blue-400 animate-pulse">Loading...</span></>
            ) : (
              <><Play className="w-4 h-4 text-purple-400" /><span>Start Simulation</span></>
            )}
          </button>
        )}
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={
            <UploadScreen 
              items={items} 
              setItems={setItems} 
              onSubmit={handleSubmit} 
              isProcessing={isProcessing} 
            />
          } />
          <Route path="/analysis" element={
            <AnalysisScreen onNavigate={() => navigate('/dispatch')} />
          } />
          <Route path="/dispatch" element={
            <div className="page flex-1 overflow-hidden">
              <DispatchScreen />
            </div>
          } />
          <Route path="/tracking" element={
            <TrackingScreen />
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
