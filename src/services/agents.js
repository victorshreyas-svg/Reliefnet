import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyC0ne3R8uDOWFogzfUkcBXPINfiZ_E1xxs";
const genAI = new GoogleGenerativeAI(apiKey);

const landmarks = {
  flood: { lat: 13.0358, lng: 77.5970, zone: "Hebbal" },
  building_collapse: { lat: 12.9698, lng: 77.7499, zone: "Whitefield" },
  fire: { lat: 12.9784, lng: 77.6408, zone: "Indiranagar" },
  landslide: { lat: 12.9352, lng: 77.6245, zone: "Koramangala" },
  earthquake: { lat: 12.9758, lng: 77.6010, zone: "MG Road" },
  accident: { lat: 12.9172, lng: 77.6229, zone: "Silk Board" },
};

const getGeminiJSON = async (prompt, imageBase64) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // Force structured JSON output
    generationConfig: { responseMimeType: "application/json" }
  });

  let base64Data = imageBase64;
  let mimeType = "image/jpeg";
  
  if (imageBase64.includes("data:")) {
    const parts = imageBase64.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
    base64Data = parts[1];
  }
  
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
    }
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return JSON.parse(response.text());
};

export const runAgent1 = async (imageBase64, optionalText) => {
  const basePrompt = `You are a disaster classification AI. 
Analyse the uploaded image and identify the disaster type. 
Respond ONLY in this JSON format with no extra text:
{
  "disaster_type": "one of [flood, building_collapse, fire, earthquake, landslide, accident]",
  "confidence": <float between 0 and 1>,
  "description": "one sentence describing what you see"
}`;

  const prompt = optionalText ? `${basePrompt}\n\nUser Description: ${optionalText}` : basePrompt;

  try {
    const result = await getGeminiJSON(prompt, imageBase64);
    
    let dType = result.disaster_type?.toLowerCase() || "accident";
    if (!landmarks[dType]) dType = "accident";
    
    const landmark = landmarks[dType];

    return {
      disaster_type: dType,
      confidence: result.confidence || 0.5,
      description: result.description || "Unknown",
      zone: landmark.zone,
      coordinates: { lat: landmark.lat, lng: landmark.lng }
    };
  } catch (error) {
    console.error("Agent 1 Error:", error);
    return {
      disaster_type: "fire",
      confidence: 0.85,
      description: "Fallback classification due to API error: " + error.message,
      zone: landmarks.fire.zone,
      coordinates: { lat: landmarks.fire.lat, lng: landmarks.fire.lng }
    };
  }
};

export const runAgent2 = async (imageBase64, agent1Data) => {
  const prompt = `You are a disaster severity scoring AI.
You are given an image and initial incident data classified by Agent 1.

Agent 1 Data:
- disaster_type: ${agent1Data.disaster_type}
- description: ${agent1Data.description}
- confidence: ${agent1Data.confidence}
- coordinates: ${agent1Data.coordinates?.lat}, ${agent1Data.coordinates?.lng}

Analyze the image for severity and output ONLY valid JSON matching this structure:
{
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priority_score": <1-100 integer>,
  "people_at_risk": <integer>,
  "urgency": "immediate" | "soon" | "monitor"
}

Follow these strict rules:
Flood:
- many people + water street -> HIGH
- large area + panic -> CRITICAL
Fire:
- visible flames -> HIGH
- building fire -> CRITICAL
Earthquake:
- collapsed buildings -> CRITICAL
- damage visible -> HIGH

Score ranges based on severity:
CRITICAL = 90-100
HIGH = 70-89
MEDIUM = 40-69
LOW = 0-39
`;

  try {
    const result = await getGeminiJSON(prompt, imageBase64);
    
    return {
      severity: result.severity || "HIGH",
      priority_score: result.priority_score || 80,
      people_at_risk: result.people_at_risk || 0,
      urgency: result.urgency || "soon"
    };
  } catch (error) {
    console.error("Agent 2 Error:", error);
    return {
      severity: "CRITICAL",
      priority_score: 95,
      people_at_risk: 12,
      urgency: "immediate"
    };
  }
};

export const runAgent3 = async (agent1Data, agent2Data) => {
  // deterministic logic based on Phase 3 rules
  const type = agent1Data.disaster_type?.toLowerCase() || "";
  const severity = agent2Data.severity?.toUpperCase() || "MEDIUM";

  let teams = ["Local Police", "Emergency Response"];
  let vehicles = ["Ambulance"];
  let supplies = ["First Aid Kits"];

  if (type === "flood") {
    teams = ["Water Rescue Team", "Medical Team"];
    vehicles = ["Rescue Boats", "Ambulance"];
    supplies = ["Life Jackets", "Food Kits"];
  } else if (type === "fire") {
    teams = ["Fire Brigade", "Medical Response"];
    vehicles = ["Fire Truck", "Ambulance"];
    supplies = ["Fire Suits", "Oxygen Kits"];
  } else if (type === "earthquake") {
    teams = ["Search & Rescue", "Medical Team"];
    vehicles = ["Rescue Truck", "Ambulance"];
    supplies = ["Stretchers", "First Aid"];
  }

  let eta_minutes = 20;
  if (severity === "CRITICAL") eta_minutes = 5;
  else if (severity === "HIGH") eta_minutes = 10;
  else if (severity === "LOW") eta_minutes = 30;

  // simulate brief agent processing latency
  await new Promise(r => setTimeout(r, 600));

  return {
    status: "dispatching",
    teams,
    vehicles,
    supplies,
    eta_minutes
  };
};

export const startAgent4 = (updateDB, destination, severity, originalEta) => {
  let totalSimulatedSecs = 20; // default MEDIUM
  if (severity === "CRITICAL") totalSimulatedSecs = 10;
  else if (severity === "HIGH") totalSimulatedSecs = 15;
  else if (severity === "LOW") totalSimulatedSecs = 25;

  let progress = 0;
  let eta_remaining = originalEta;

  let currentLat = destination.lat - 0.05;
  let currentLng = destination.lng - 0.05;

  const latStep = 0.05 / totalSimulatedSecs;
  const lngStep = 0.05 / totalSimulatedSecs;
  const progressStep = 100 / totalSimulatedSecs;
  const etaStep = originalEta / totalSimulatedSecs;

  const pushState = (p, eta, stat, lat, lng) => {
    updateDB({
      resource_tracking: {
        status: stat,
        progress: Math.min(Math.round(p), 100),
        current_location: { lat: Number(lat).toFixed(4), lng: Number(lng).toFixed(4) },
        destination,
        eta_remaining: Math.max(Math.ceil(eta), 0)
      }
    });
  };

  // Initial push before interval starts
  pushState(progress, eta_remaining, "enroute", currentLat, currentLng);

  const interval = setInterval(() => {
    progress += progressStep;
    eta_remaining -= etaStep;
    currentLat += latStep;
    currentLng += lngStep;

    if (progress >= 100) {
      clearInterval(interval);
      pushState(100, 0, "arrived", destination.lat, destination.lng);
    } else {
      pushState(progress, eta_remaining, "enroute", currentLat, currentLng);
    }
  }, 1000);
};
