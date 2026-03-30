import { useState, useCallback } from "react";
import { database } from "../firebase";
import { ref, push, set, update, serverTimestamp } from "firebase/database";
import { runAgent1, runAgent2, runAgent3, startAgent4 } from "../services/agents";

export const usePipeline = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processIncidentItem = async (base64Str, description) => {
    try {
      const incidentsRef = ref(database, 'incidents');
      const newIncidentRef = push(incidentsRef);
      const incidentId = newIncidentRef.key;

      const initialData = {
        id: incidentId,
        image_url: base64Str, // Full base64 required for UI feed

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
        timestamp: serverTimestamp() // To use real time
      };
      
      // We wrap the DB calls in try/catch to ensure pipeline proceeds even if Firebase errors (e.g. no config)
      const tryUpdateDB = async (data) => {
        try { await update(newIncidentRef, data); } catch (e) { console.error("Firebase update failed:", e); }
      };

      try { await set(newIncidentRef, initialData); } catch (e) { console.error("Firebase set failed:", e); }

      // 1. Agent 1 computes classification
      const a1Result = await runAgent1(base64Str, description);
      
      await tryUpdateDB({
        status: "analysed",
        disaster_type: a1Result.disaster_type,
        confidence: a1Result.confidence,
        zone: a1Result.zone,
        coordinates: a1Result.coordinates,
        // Override the user description with Claude's short description
        description: a1Result.description
      });

      // 2. Agent 2 computes severity
      const a2Result = await runAgent2(base64Str, a1Result);
      await tryUpdateDB({
        severity_block: {
          severity: a2Result.severity,
          priority_score: a2Result.priority_score,
          urgency: a2Result.urgency,
          people_at_risk: a2Result.people_at_risk
        }
      });

      // 3. Agent 3 allocates resources
      const a3Result = await runAgent3(a1Result, a2Result);
      await tryUpdateDB({
        dispatch_plan: a3Result
      });

      // 4. Agent 4 handles tracking via asynchronous loop mapping realtime
      startAgent4(tryUpdateDB, a1Result.coordinates, a2Result.severity, a3Result.eta_minutes);

      return incidentId;
    } catch (e) {
      console.error("Pipeline failure for item:", e);
    }
  };

  const processMultiple = useCallback(async (items) => {
    setIsProcessing(true);
    const promises = items.map(item => processIncidentItem(item.base64, item.description));
    await Promise.all(promises);
    setIsProcessing(false);
  }, []);

  return { processMultiple, isProcessing };
};
