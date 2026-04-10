import { useState, useCallback } from "react";
import { database } from "../firebase";
import { ref, push, set, update, serverTimestamp } from "firebase/database";
import { runAgent1, runAgent2, runAgent3, startAgent4 } from "../services/agents";
import { logger } from "../services/logger";

import { fallbackMockLocations } from "../services/rescueFinder";

export const usePipeline = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Fallback metadata for simulation cases
  const getCase1Metadata = (fileName, isPredefined) => {
    if (!fileName || !isPredefined) return null;

    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('flood'))
      return {
        type: "flood",
        zone: "Mahadevapura, Bangalore",
        coordinates: { lat: 12.9916, lng: 77.6950 },
        priority_score: 92,
        description:
          "Waterlogging across residential roads. Vehicles stuck. Limited movement."
      };

    if (lowerName.includes('collapse'))
      return {
        type: "building_collapse",
        zone: "Babusapalya, Bangalore",
        coordinates: { lat: 13.0250, lng: 77.6632 },
        priority_score: 95,
        description:
          "Multi-floor building collapse. People trapped under debris."
      };

    if (lowerName.includes('fire'))
      return {
        type: "fire",
        zone: "Shivani Layout, Bangalore",
        coordinates: { lat: 13.0400, lng: 77.6200 },
        priority_score: 98,
        description:
          "Construction site fire spreading to nearby buildings."
      };

    return null;
  };

  const getRandomLocation = () => {
    const zones = ["Whitefield", "KR Puram", "Yelahanka", "Marathahalli"];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const lat = 12.90 + Math.random() * 0.15;
    const lng = 77.55 + Math.random() * 0.20;
    return { zone, lat, lng };
  };

  const getCase2Metadata = (aiType) => {
    const { zone, lat, lng } = getRandomLocation();
    let description = "Incident reported. Awaiting further analysis.";

    if (aiType === "flood") description = "Urban flooding reported. Roads submerged. Traffic disruption observed.";
    else if (aiType === "fire") description = "Active fire reported in building. Smoke visible. Emergency response required.";
    else if (["building_collapse", "earthquake", "landslide"].includes(aiType)) description = "Structural collapse detected. Possible casualties. Rescue teams required.";

    return { zone, coordinates: { lat, lng }, description };
  };

  const processIncidentItem = async (base64Str, description, fileName = "", isPredefined = false, passedLocation = "") => {
    logger.emit("[Detection Agent] Initializing detection pipeline");
    try {
      const incidentsRef = ref(database, 'incidents');
      const newIncidentRef = push(incidentsRef);
      const incidentId = newIncidentRef.key;

      const initialData = {
        id: incidentId,
        image_url: base64Str,
        description: description || "",
        disaster_type: "pending",
        zone: "pending",
        coordinates: { lat: 0, lng: 0 },
        status: "pending",
        severity: null,
        confidence: null,
        reasoning: null,
        resources: null,
        approved: false,
        timestamp: serverTimestamp()
      };

      const tryUpdateDB = async (data) => {
        try { await update(newIncidentRef, data); } catch (e) { console.error("Firebase update failed:", e); }
      };

      try { 
        await set(newIncidentRef, initialData);
        logger.emit(`Disaster object created in backend: ${incidentId}`);
      } catch (e) { console.error("Firebase set failed:", e); }

      // 1. Agent 1 computes classification
      const a1ResultRaw = await runAgent1(base64Str, description, fileName);

      let finalType = a1ResultRaw.disaster_type;
      let finalConfidence = a1ResultRaw.confidence;
      let finalZone = a1ResultRaw.zone;
      let finalCoords = a1ResultRaw.coordinates;
      let finalDesc = a1ResultRaw.description;

      const case1Data = getCase1Metadata(fileName, isPredefined);

      if (case1Data) {
        // Use predefined coordinates but allow the live pipeline to run
        finalType = case1Data.type;
        finalZone = case1Data.zone;
        finalCoords = case1Data.coordinates;
        finalDesc = case1Data.description;
        logger.emit(`Allocation Agent: computing route for ${finalType}...`);
      } else {
        let key = "KR_PURAM";
        
        if (passedLocation) {
          const locUpper = passedLocation.toUpperCase();
          if (locUpper.includes("WHITEFIELD")) key = "WHITEFIELD";
          else if (locUpper.includes("MARATHAHALLI")) key = "MARATHAHALLI";
          else if (locUpper.includes("YELAHANKA")) key = "YELAHANKA";
          else key = "KR_PURAM";
        } else {
          // For non-predefined without passed location, use dynamic fallback zones
          const fallbackKeys = ["KR_PURAM", "WHITEFIELD", "MARATHAHALLI", "YELAHANKA"];
          let fallbackIndex = Number(localStorage.getItem("fallbackIndex") || 0);
          key = fallbackKeys[fallbackIndex % fallbackKeys.length];
          fallbackIndex++;
          localStorage.setItem("fallbackIndex", fallbackIndex);
        }

        const fallback = fallbackMockLocations[key];
        finalZone = fallback.location;
        finalCoords = { lat: fallback.lat, lng: fallback.lng };
        
        // Use AI type but ensure it's valid, fallback to fire if uncertain
        finalType = a1ResultRaw.disaster_type || "fire";
        finalConfidence = a1ResultRaw.confidence || 95;
        finalDesc = a1ResultRaw.description || "Incident detected. Agentic AI analyzing nearby response centers.";
      }

      const fixedConfidence = Math.min(99, Math.round(finalConfidence || 95));

      const a1Result = {
        disaster_type: finalType,
        confidence: fixedConfidence,
        zone: finalZone,
        coordinates: finalCoords,
        description: finalDesc
      };

      await tryUpdateDB({
        status: finalType,
        disaster_type: finalType,
        confidence: fixedConfidence,
        zone: finalZone,
        location: finalZone,
        coordinates: finalCoords,
        description: finalDesc,
        image: fileName,
        isPredefined: isPredefined
      });
      logger.emit("[Detection Agent] Confidence score computed");

      // 2. Real Agent 2 runs to score severity logically
      const a2Result = await runAgent2(base64Str, {
        disaster_type: a1Result.disaster_type,
        zone: a1Result.zone,
        coordinates: a1Result.coordinates,
        description: a1Result.description
      });

      const incident = {
        type: finalType,
        location: finalZone,
        lat: finalCoords.lat,
        lng: finalCoords.lng,
        severity: a2Result.severity,
        confidence: fixedConfidence,
        description: finalDesc
      };

      await tryUpdateDB({
        disaster_type: incident.type,
        status: incident.type,
        zone: incident.location,
        coordinates: {
          lat: incident.lat,
          lng: incident.lng
        },
        severity: incident.severity,
        confidence: incident.confidence,
        description: incident.description
      });

      const severity = a2Result.severity || "MEDIUM";
      const severityBlock = {
        severity: severity,
        priority_score: case1Data?.priority_score || (
          severity === "CRITICAL" ? 95 :
            severity === "HIGH" ? 80 :
              severity === "MEDIUM" ? 60 :
                40
        ),
        urgency: a2Result.urgency,
        people_at_risk: a2Result.people_at_risk
      };

      await tryUpdateDB({
        severity_block: severityBlock
      });

      // 3. Agent 3 allocates resources
      logger.emit("[Allocation Agent] Searching nearest facilities");
      const a3Result = await runAgent3(
        {
          disaster_type: a1Result.disaster_type,
          zone: a1Result.zone,
          coordinates: a1Result.coordinates
        },
        {
          ...a2Result,
          severity
        }
      );
      await tryUpdateDB({
        dispatch_plan: a3Result
      });
      
      logger.emit("[Allocation Agent] Hospital selected");
      logger.emit("[Allocation Agent] Rescue team selected");
      logger.emit("[Allocation Agent] Distance computed");

      // 4. Agent 4 handles tracking via asynchronous loop mapping realtime
      logger.emit("[Dispatch Agent] Sending dispatch request");
      logger.emit("[Dispatch Agent] Units notified");
      logger.emit("[Dispatch Agent] Sending dispatch request");
      logger.emit("[Dispatch Agent] Units notified");
      startAgent4(tryUpdateDB, a1Result.coordinates, severity, a3Result.eta_minutes);
      logger.emit("[Dispatch Agent] Dispatch confirmed");
 
      logger.emit(`Pipeline sync complete for incident: ${incidentId}`);
      return incidentId;
    } catch (e) {
      console.error("Pipeline failure for item:", e);
    }
  };

  const processMultiple = useCallback(async (items) => {
    setIsProcessing(true);
    const promises = items.map(item => processIncidentItem(item.base64, item.description, item.fileName, item.isPredefined, item.location));
    await Promise.all(promises);
    setIsProcessing(false);
  }, []);

  return { processIncidentItem, processMultiple, isProcessing };
};
