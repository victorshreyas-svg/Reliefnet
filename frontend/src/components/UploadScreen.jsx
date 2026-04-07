import React, { useRef } from "react";
import { UploadCloud, X, Send } from "lucide-react";
import clsx from "clsx";
import { runAgent1 } from "../services/agents";

export const UploadScreen = ({ items, setItems, onSubmit, isProcessing }) => {
  const fileInputRef = useRef(null);

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
        
        // Add item immediately with loading state
        setItems(prev => [...prev, { 
          id: tempId, 
          file, 
          base64, 
          fileName: file.name,
          location: "Analyzing location...",
          description: "Generating AI classification..."
        }]);

        try {
          // Silent Agent 1 call
          const a1ResultRaw = await runAgent1(base64, "");
          const aiType = a1ResultRaw.disaster_type;
          
          // Generate mock metadata for Case 2
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
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 flex-1 overflow-y-auto">
      <div className="text-center space-y-3 mb-10 pt-10">
        <h2 className="text-4xl font-extrabold tracking-tight text-white">
          Upload Incident Data
        </h2>
        <p className="text-md text-gray-400 font-medium tracking-wide">
          Submit images to instantly trigger the AI pipeline.
        </p>
      </div>

      <div
        className={clsx("border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all hover:border-blue-500 cursor-pointer shadow-lg",
          items.length >= 3 ? "opacity-50 pointer-events-none border-gray-700 bg-gray-900/50" : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => items.length < 3 && fileInputRef.current?.click()}
      >
        <UploadCloud className="w-14 h-14 text-blue-400 mb-4" />
        <p className="text-gray-200 text-lg font-semibold">Click or drag & drop to upload images</p>
        <p className="text-sm text-gray-500 mt-2 font-medium">Maximum 3 files (JPEG, PNG)</p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8">
          {items.map((item) => (
            <div key={item.id} className="group relative bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              <button
                onClick={() => removeItem(item.id)}
                className="absolute top-3 right-3 p-1.5 focus:outline-none bg-black/60 hover:bg-red-500 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative h-48 w-full bg-gray-900">
                <img src={item.base64} alt="preview" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-gray-900/90 to-transparent p-4 text-white">
                   <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Location</p>
                   <p className="text-sm font-medium truncate">{item.location}</p>
                </div>
              </div>
              <div className="p-5 min-h-[100px]">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">AI Description</label>
                <p className="text-sm text-gray-200 leading-relaxed border-l-2 border-gray-600 pl-3">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end pt-6 border-t border-gray-800 pb-10">
          <button
            disabled={isProcessing}
            onClick={onSubmit}
            className="group flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-4 rounded-xl font-bold tracking-wide shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
          >
            {isProcessing ? (
              <span className="animate-pulse">Starting Pipeline...</span>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span>SUBMIT TO PIPELINE</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
