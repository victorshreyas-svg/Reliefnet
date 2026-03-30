import React from 'react';
import { UploadScreen } from './components/UploadScreen';
import { IncidentList } from './components/IncidentList';
import { IncidentLogs } from './components/IncidentLogs';
import { usePipeline } from './hooks/usePipeline';

function App() {
  const { processMultiple, isProcessing } = usePipeline();

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex flex-col relative pb-16">
      <main className="flex-1 overflow-y-auto">
        <UploadScreen onProcess={processMultiple} isProcessing={isProcessing} />
        <IncidentList />
      </main>
      <IncidentLogs />
    </div>
  );
}

export default App;
