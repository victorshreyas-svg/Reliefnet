import React, { useState, useRef } from "react";
import { UploadCloud, X, Send } from "lucide-react";
import clsx from "clsx";

export const UploadScreen = ({ onProcess, isProcessing }) => {
  const [items, setItems] = useState([]);
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
      reader.onload = (e) => {
        setItems(prev => [...prev, { id: Math.random().toString(), file, base64: e.target.result, description: "" }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  };

  const updateDescription = (id, text) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, description: text } : item));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    onProcess(items);
    setItems([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-3 mb-10 pt-10">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
          ReliefNet
        </h1>
        <p className="text-lg text-gray-400 font-medium tracking-wide">
          Real-Time Disaster Resource Allocation System
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 duration-500 animate-in fade-in slide-in-from-bottom-8">
          {items.map((item) => (
            <div key={item.id} className="group relative bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-gray-700 transition hover:border-gray-600">
              <button
                onClick={() => removeItem(item.id)}
                className="absolute top-3 right-3 p-1.5 focus:outline-none bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
              <img src={item.base64} alt="preview" className="w-full h-48 object-cover" />
              <div className="p-5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Context Notes</label>
                <textarea
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition"
                  placeholder="Add specific details or context..."
                  rows={2}
                  value={item.description}
                  onChange={(e) => updateDescription(item.id, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end pt-6 border-t border-gray-800">
          <button
            disabled={isProcessing}
            onClick={handleSubmit}
            className="group flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold tracking-wide shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
          >
            {isProcessing ? (
              <span className="animate-pulse">Pipeline Running...</span>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span>SUBMIT</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
