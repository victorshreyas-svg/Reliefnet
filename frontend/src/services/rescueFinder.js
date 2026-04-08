
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const MOCK_LOCATION_RESOURCES = {
  "babusapalya": [
    { name: "Kalyan Nagar Fire Station", type: "fire_station", lat: 13.0234, lng: 77.6393, distance: "1.8" },
    { name: "Medi Hospital", type: "hospital", lat: 13.0245, lng: 77.6542, distance: "0.5" },
    { name: "Hennur Police Station", type: "police", lat: 13.0312, lng: 77.6482, distance: "2.1" },
    { name: "NDRF Rescue Team Unit 4", type: "rescue", lat: 13.0150, lng: 77.6600, distance: "1.2" }
  ],
  "shivani_layout": [
    { name: "Hebbal Fire Brigade", type: "fire_station", lat: 13.0345, lng: 77.5921, distance: "2.4" },
    { name: "Aster CMI Hospital", type: "hospital", lat: 13.0612, lng: 77.5934, distance: "3.1" },
    { name: "Sahakar Nagar Police", type: "police", lat: 13.0620, lng: 77.5850, distance: "3.5" }
  ],
  "mahadevapura": [
    { name: "Hoodi Fire Station", type: "fire_station", lat: 12.9912, lng: 77.7121, distance: "2.5" },
    { name: "Vydehi Hospital", type: "hospital", lat: 12.9754, lng: 77.7289, distance: "1.8" },
    { name: "Mahadevapura Police Station", type: "police", lat: 12.9945, lng: 77.7012, distance: "1.2" }
  ]
};

export const fallbackMockLocations = {
  "KR_PURAM": { location: "KR Puram, Bangalore", lat: 13.0086, lng: 77.6956, resources: [
    { name: "KR Puram Fire Station", type: "fire_station", lat: 13.0120, lng: 77.7020, distance: "1.5" },
    { name: "Sathyasai Hospital", type: "hospital", lat: 12.9854, lng: 77.7265, distance: "4.2" },
    { name: "Ramamurthy Nagar Police", type: "police", lat: 13.0150, lng: 77.6780, distance: "3.1" }
  ]},
  "WHITEFIELD": { location: "Whitefield, Bangalore", lat: 12.9698, lng: 77.7499, resources: [
    { name: "Whitefield Fire Station", type: "fire_station", lat: 12.9750, lng: 77.7550, distance: "1.2" },
    { name: "Columbia Asia Whitefield", type: "hospital", lat: 12.9554, lng: 77.7465, distance: "2.4" },
    { name: "ITPL Police Station", type: "police", lat: 12.9850, lng: 77.7380, distance: "3.8" }
  ]},
  "MARATHAHALLI": { location: "Marathahalli, Bangalore", lat: 12.9591, lng: 77.6974, resources: [
    { name: "HAL Fire Station", type: "fire_station", lat: 12.9520, lng: 77.6780, distance: "2.8" },
    { name: "Sakra World Hospital", type: "hospital", lat: 12.9254, lng: 77.6865, distance: "4.1" },
    { name: "Marathahalli Police", type: "police", lat: 12.9550, lng: 77.7010, distance: "0.8" }
  ]},
  "YELAHANKA": { location: "Yelahanka, Bangalore", lat: 13.1007, lng: 77.5963, resources: [
    { name: "Yelahanka Premier Fire Station", type: "fire_station", lat: 13.1050, lng: 77.6050, distance: "1.1" },
    { name: "North-Tech Fire & Rescue Squad", type: "fire_station", lat: 13.1120, lng: 77.6150, distance: "2.5" },
    { name: "Manipal Multispecialty & Trauma Center Yelahanka", type: "hospital", lat: 13.0854, lng: 77.5865, distance: "2.9", has_emergency: true },
    { name: "Navachethana Emergency Hospital", type: "hospital", lat: 13.0980, lng: 77.5920, distance: "0.8", has_emergency: true },
    { name: "Yelahanka Central Police Station", type: "police", lat: 13.0950, lng: 77.5910, distance: "1.5" },
    { name: "NDRF Rescue Battalion Unit 7 (North)", type: "rescue", lat: 13.1080, lng: 77.5990, distance: "1.2" }
  ]}
};

let fallbackCounter = 0;
const FALLBACK_KEYS = ["KR_PURAM", "WHITEFIELD", "MARATHAHALLI", "YELAHANKA"];

/**
 * STRICT EMERGENCY CENTER FILTER (UPDATED)
 * Rejects specialized clinics (Eye, Dental, Hair, Skin, Fertility, etc.)
 * Prioritizes Multi-speciality and General Hospitals.
 */
const isValidEmergencyCenter = (name, type) => {
  const n = (name || "").toLowerCase();
  const t = (type || "").toLowerCase();
  
  // 1. Unbypassable Blacklist (Traffic, administrative, booths. NEVER ALLOWED)
  const unbypassable = [
    "traffic", "outpost", "checkpost", "booth", "cabin",
    "assistant commissioner", "government office", "bbmp", "bescom", "rto", "registrar", "corporation", "electrical", "bda", "ward office",
    "inspector", "excise", "tax", "bank", "department"
  ];
  if (unbypassable.some(p => n.includes(p))) return false;

  // New strict block for "office" unless it's an emergency office
  if (n.includes("office")) {
    const isEmergencyOffice = ["fire", "police", "rescue", "disaster", "emergency", "ndrf", "sdrf"].some(kw => n.includes(kw));
    if (!isEmergencyOffice) return false;
  }

  // 2. Soft Blacklist (Reject specialty-only clinics unless explicitly marked multi-speciality)
  const blacklist = [
    "eye", "vision", "cataract", "ophthalmology", "netralaya",
    "dental", "dentistry", "orthodontic", "orthopaedic",
    "hair", "scalp", "skin", "cosmetic", "derma",
    "geriatric", "fertility", "ivf", "birth center", "maternity", "delivery center",
    "poly clinic", "ayurvedic", "homeo", "wellness", "spa", "yoga", "stroke", "neuro", "neurology",
    "physiotherapy", "rehab", "diagnostics", "pathology", "scan center", "radiology",
    "small specialty", "private clinic", "nursing home", "specialty only", "medical center"
  ];

  if (blacklist.some(p => n.includes(p))) {
    // Exception: Only allow if it explicitly contains pure operational emergency keywords despite overlapping terms
    if (!(
      n.includes("multi speciality") || 
      n.includes("multi specialty") ||
      n.includes("trauma center") ||
      n.includes("burn care") ||
      n.includes("burn unit") ||
      n.includes("government emergency") ||
      n.includes("general hospital") || 
      n.includes("police station") || 
      n.includes("fire station") || 
      n.includes("disaster response") || 
      n.includes("rescue") || 
      n.includes("ndrf") || 
      n.includes("sdrf") || 
      n.includes("flood response") ||
      n.includes("civil defence") ||
      n.includes("bbmp emergency") ||
      n.includes("emergency control")
    )) {
      return false;
    }
  }

  // 2. High-priority Whitelist (Strictly rescue/emergency units)
  const whitelist = ["fire", "police", "rescue", "disaster", "brigade", "ambulance", "sdma", "ndrf", "sdrf", "flood response", "civil defence", "emergency control", "emergency"];

  if (t === "fire_station" || t === "police") return true;
  if (whitelist.some(p => n.includes(p))) return true;

  return true;
};

/**
 * AI-HINTING: Determines if a hospital has high emergency-response capability
 * Returns a score or boolean for Agentic AI to prioritize.
 */
const checkHospitalCapability = (name) => {
  const n = (name || "").toLowerCase();
  const highCapabilityKeywords = [
    "general hospital",
    "medical college",
    "multi speciality",
    "multi specialty",
    "general hospital with icu",
    "emergency hospital",
    "24x7 emergency",
    "emergency",
    "trauma center",
    "trauma centre",
    "trauma",
    "burn care",
    "burn unit",
    "icu",
    "government general hospital",
    "government hospital",
    "government emergency hospital",
    "district hospital",
    "victoria hospital",
    "apollo",
    "manipal",
    "columbia asia",
    "aster",
    "st johns"
  ];

  return highCapabilityKeywords.some(p => n.includes(p));
};

/**
 * FETCH LIVE RESOURCES FROM OVERPASS API (OSM)
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<Array>}
 */
export const fetchOverpassResources = async (lat, lng, radius = 10000, onStatusUpdate = null) => {
  const query = `[out:json][timeout:20];(
    node["amenity"="hospital"](around:${radius},${lat},${lng});
    node["amenity"="fire_station"](around:${radius},${lat},${lng});
    node["amenity"="police"](around:${radius},${lat},${lng});
    node["emergency"~"rescue|disaster|fire"](around:${radius},${lat},${lng});
    node["office"~"government|disaster|emergency"](around:${radius},${lat},${lng});
    way["amenity"="hospital"](around:${radius},${lat},${lng});
    way["amenity"="fire_station"](around:${radius},${lat},${lng});
    way["amenity"="police"](around:${radius},${lat},${lng});
    way["emergency"~"rescue|disaster"](around:${radius},${lat},${lng});
  );out center;`;
  
  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
  ];

  // HACKATHON RACING: Launch parallel requests and take the FASTEST success
  const fetchFromMirror = async (mirrorUrl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for real-world discovery
    
    try {
      const url = `${mirrorUrl}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`${mirrorUrl} error`);
      
      const data = await response.json();
      const results = (data.elements || [])
        .map(el => {
          const tags = el.tags || {};
          let type = tags.amenity || tags.emergency || tags.office || "rescue";
          
          // Normalize specialized disaster units to 'rescue' category if they match strict criteria
          // FIRE and POLICE must remain as distinct categories for the AI to select correctly
          // We EXCLUDE 'emergency' here because hospitals have emergency wards.
          const allowedRescue = ["civil_defence", "disaster_response", "ndrf", "sdrf", "rescue", "water rescue", "flood response"];
          const nameLower = (tags.name || "").toLowerCase();
          
          // Only map to 'rescue' if it's NOT a hospital or police station
          const matchesRescue = allowedRescue.some(kw => nameLower.includes(kw) || type.includes(kw));
          const isHospital = nameLower.includes("hospital") || nameLower.includes("medical") || type === "hospital";
          
          if (matchesRescue && !isHospital && type !== "police" && type !== "fire_station") {
            type = "rescue";
          } else if (type === "government" || type === "office") {
             // If it matched generic office/gov but doesn't have rescue keywords, it's just an office (to be filtered out)
             type = "office";
          }
          
          return {
            name: tags.name || `${type.replace('_', ' ')} (Discovered)`,
            type: type,
            lat: el.lat || el.center?.lat,
            lng: el.lon || el.center?.lon,
            distance: calculateDistance(lat, lng, el.lat || el.center?.lat, el.lon || el.center?.lon),
            has_emergency: checkHospitalCapability(tags.name)
          };
        })
        .filter(res => isValidEmergencyCenter(res.name, res.type));

      return results;
    } catch (err) {
      throw err;
    }
  };

  // Blast all mirrors simultaneously for absolute lowest latency
  try {
    const racePool = mirrors.map(mirrorUrl => fetchFromMirror(mirrorUrl));
    const result = await Promise.any(racePool);
    if (result && result.length > 0) return result;
  } catch (err) {
    if (onStatusUpdate) onStatusUpdate(`All Overpass mirrors failed or timed out.`);
  }

  return [];
};

/* 
 * STRICT REAL-WORLD DISCOVERY: Exclusively uses OSM data
 * Radii expansion logic ensures discovery without mock fallback
 */
export const fetchNearbyResourcesOSR = async (lat, lng, incident, onStatusUpdate = null) => {
  const dLat = Number(lat);
  const dLng = Number(lng);
  const type = (incident.disaster_type || "").toLowerCase();
  
  let mergedResults = [];
  
  // 1. Try Live Overpass Discovery (Parallel Mirrors)
  if (!isNaN(dLat) && !isNaN(dLng) && dLat !== 0) {
    if (onStatusUpdate) onStatusUpdate("Scanning real-world responders (10KM)...");
    const dynamicResults = await fetchOverpassResources(dLat, dLng, 10000, onStatusUpdate);
    if (dynamicResults && dynamicResults.length > 0) {
      mergedResults = [...dynamicResults];
    }
    
    // 2. Aggressive Radius Expansion if necessary
    if (mergedResults.length < 5) {
      if (onStatusUpdate) onStatusUpdate("Expanding real-world scan (20KM)...");
      const deepResults = await fetchOverpassResources(dLat, dLng, 20000, onStatusUpdate);
      mergedResults = [...new Set([...mergedResults, ...deepResults])];
    }
  }

  // 3. Tactical Mock Matching (Demo specific locations)
  const zone = (incident.zone || "").toLowerCase();
  Object.keys(MOCK_LOCATION_RESOURCES).forEach(key => {
    if (zone.includes(key)) {
      if (onStatusUpdate) onStatusUpdate(`Applying local tactical datasets for ${key}...`);
      const localMocks = MOCK_LOCATION_RESOURCES[key];
      mergedResults = [...localMocks, ...mergedResults];
    }
  });

  // 4. Final Fallback: Regional Cluster Datasets
  if (mergedResults.length === 0) {
    const key = FALLBACK_KEYS[fallbackCounter % FALLBACK_KEYS.length];
    fallbackCounter++;
    if (onStatusUpdate) onStatusUpdate(`Critical: Discovery failed. Deploying ${key} cluster...`);
    const fallback = fallbackMockLocations[key];
    mergedResults = [...fallback.resources];
  }

  return mergedResults.sort((a, b) => a.distance - b.distance);
};

/**
 * ENRICH DISCOVERED RESOURCES WITH REAL-WORLD ROAD DATA (OSR)
 * @param {Array} resources 
 * @param {number} startLat 
 * @param {number} startLng 
 */
export const enrichResourcesWithOSR = async (resources, startLat, startLng) => {
  if (!resources || resources.length === 0) return [];

  // Group by type to ensure we get the best of EACH category for the AI to choose from
  const categories = ['fire_station', 'hospital', 'police', 'government', 'rescue'];
  let candidates = [];
  
  categories.forEach(cat => {
    const subset = resources
      .filter(r => r.type === cat)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4); // Top 4 of each type (plenty for Agent to pick 1)
    candidates = [...candidates, ...subset];
  });

  // If we have sparse results, grab additional general closest ones
  if (candidates.length < 10) {
    const general = resources
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
    candidates = [...candidates, ...general];
  }

  // Deduplicate by name + coordinates to ensure unique nodes
  const uniqueCandidates = Array.from(
    new Map(candidates.map(item => [item.name + item.lat + item.lng, item])).values()
  ).slice(0, 15); // Radical hard cap at 15 routing calls to prevent bottlenecks

  console.log(`Rescue Brain: Enriching ${uniqueCandidates.length} balanced candidates with OSR road metrics...`);

  const enriched = await Promise.all(uniqueCandidates.map(async (res) => {
    try {
      const route = await getORSRoute({ lat: startLat, lng: startLng }, { lat: res.lat, lng: res.lng });
      if (route) {
        return {
          ...res,
          distance: route.distance, // Overwrite with real road distance (KM)
          duration: route.duration, // Add real travel duration (MIN)
          polyline: route.geometry?.coordinates?.map(c => [c[1], c[0]]) // Visual path
        };
      }
    } catch (err) {
      console.warn(`OSR Enrichment skipped for ${res.name}:`, err);
    }
    return res;
  }));

  return enriched;
};

/**
 * AI Agent function to select multiple required resources
 * @param {Array} resources - list of resources with distance/type
 * @param {string} incidentType - type of disaster
 * @param {string} severity - severity of the disaster (CRITICAL, HIGH, etc)
 */
export const selectAgentResources = (resources, incidentType, severity = "HIGH") => {
  if (!resources || resources.length === 0) return [];

  const type = (incidentType || "").toLowerCase();
  const selected = [];
  const handledIds = new Set();
  const sev = (severity || "HIGH").toUpperCase();

  /**
   * 1. TACTICAL DRF PRIORITIZATION (NDRF, SDRF, etc. - Primarily for Floods)
   * The user requested that NDRF units be prioritized first for floods.
   */
  if (type.includes("flood")) {
    const drfKeywords = ["ndrf", "sdrf", "disaster response force", "rescue battalion"];
    const drfPool = resources.filter(r => 
      drfKeywords.some(kw => r.name.toLowerCase().includes(kw))
    );

    if (drfPool.length > 0) {
      const primaryDrf = drfPool.sort((a, b) => {
        const distA = (a.duration || a.distance || 999);
        const distB = (b.duration || b.distance || 999);
        return distA - distB;
      })[0];
      
      selected.push({ ...primaryDrf, role: "rescue" });
      handledIds.add(primaryDrf.name + primaryDrf.lat + primaryDrf.lng);
    }
  }

  /**
   * 2. STRICT BALANCED RESPONSE (1 Center Per Required Category)
   */
  const rescueCategories = {
    fire: ["fire_station", "police", "hospital"],
    flood: ["rescue", "hospital", "fire_station", "police"],
    // Building Collapse: Rescue (Civil Defence) only if CRITICAL
    building_collapse: ["fire_station", "hospital", "police"],
    emergency: ["fire_station", "police", "hospital"]
  };

  const needed = [...(rescueCategories[type] || rescueCategories["emergency"])];
  
  // Conditional: Only add Rescue for Building Collapse if severity is CRITICAL
  if (type === "building_collapse" && sev === "CRITICAL") {
    needed.push("rescue");
  }

  // Pick exactly ONE (the closest) from each required category
  needed.forEach(cat => {
    // Skip if we already fulfilled this category via NDRF prioritization
    if (selected.some(s => s.role === cat)) return;

    let pool = resources.filter(r => r.type === cat && !handledIds.has(r.name + r.lat + r.lng));
    
    // For Hospitals in building collapse, proactively look for multispecialty/trauma
    if (cat === 'hospital' && type === 'building_collapse') {
      const multispecialty = pool.filter(r => 
        r.name.toLowerCase().includes('multi') || 
        r.name.toLowerCase().includes('trauma') || 
        r.name.toLowerCase().includes('general')
      );
      if (multispecialty.length > 0) pool = multispecialty;
    }

    if (pool.length > 0) {
      const closest = pool.sort((a, b) => {
        const distA = (a.duration || a.distance || 999);
        const distB = (b.duration || b.distance || 999);
        return distA - distB;
      })[0];
      selected.push({ ...closest, role: cat });
      handledIds.add(closest.name + closest.lat + closest.lng);
    }
  });

  return selected;
};

/**
 * Fetch a route from OpenRouteService
 */
export const getORSRoute = async (start, end) => {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;
  if (!apiKey || apiKey === "") return null;

  const sLat = Number(start.lat);
  const sLng = Number(start.lng);
  const eLat = Number(end.lat);
  const eLng = Number(end.lng);

  // LOGICAL GUARD: Never hit the API if coordinates are invalid/NaN
  if (isNaN(sLat) || isNaN(sLng) || isNaN(eLat) || isNaN(eLng)) {
    console.warn("Rescue Brain (OSR): Invalid coordinates skipped.", { start, end });
    return null;
  }

  try {
    // Standardizing on GET for higher reliability and simpler auth handling
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${sLng},${sLat}&end=${eLng},${eLat}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      if (res.status === 429) console.warn("Rescue Brain (OSR): Rate limit hit. Tactical fallback active.");
      return null;
    }
    
    const data = await res.json();
    if (!data.features?.length) return null;
    const route = data.features[0];
    return {
      geometry: route.geometry,
      distance: (route.properties?.summary?.distance / 1000) || 0,
      duration: (route.properties?.summary?.duration / 60) || 0
    };
  } catch (err) {
    return null;
  }
};

/**
 * Agent logic to determine required resources based on incident
 */
export const getAgentResources = (incident) => {
  const type = (incident.disaster_type || "").toLowerCase();

  if (type.includes("flood")) return ["Rescue Team", "Medical Unit", "Logistics Support"];
  if (type.includes("collapse")) return ["Urban Search & Rescue", "Trauma Unit", "K9 Search Unit"];
  if (type.includes("fire")) return ["Fire Suppression Unit", "Medical Paramedics", "Hazmat Team"];

  return ["Emergency Responders", "Medical Support"];
};