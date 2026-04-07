
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

/**
 * PREDEFINED MOCK DATA FOR DEMO LOCATIONS
 */
const MOCK_LOCATION_RESOURCES = {
  "babusapalya": [
    { name: "KR Puram Fire Station", type: "fire_station", distance: 2.1, lat: 13.0115, lng: 77.7050 },
    { name: "Banaswadi Fire Station", type: "fire_station", distance: 3.4, lat: 13.0031, lng: 77.6322 },
    { name: "Vydehi Hospital Emergency", type: "hospital", distance: 4.2, lat: 12.9757, lng: 77.7284 },
    { name: "Aster CMI Hospital Emergency", type: "hospital", distance: 6.8, lat: 13.0597, lng: 77.5925 },
    { name: "Banaswadi Police Station", type: "police", distance: 2.8, lat: 13.0094, lng: 77.6418 },
    { name: "Ramamurthy Nagar Police Station", type: "police", distance: 3.9, lat: 13.0121, lng: 77.6775 },
    { name: "BBMP Disaster Response East", type: "government", distance: 5.1, lat: 13.0016, lng: 77.6853 },
    { name: "Civil Defence Bangalore East", type: "rescue", distance: 7.2, lat: 12.9912, lng: 77.7024 }
  ],
  "shivani": [
    { name: "Mahadevapura Fire Station", type: "fire_station", distance: 1.8, lat: 12.9922, lng: 77.6908 },
    { name: "Whitefield Fire Station", type: "fire_station", distance: 3.2, lat: 12.9698, lng: 77.7499 },
    { name: "Manipal Hospital Whitefield", type: "hospital", distance: 2.6, lat: 12.9866, lng: 77.7314 },
    { name: "Columbia Asia Whitefield", type: "hospital", distance: 3.8, lat: 12.9691, lng: 77.7468 },
    { name: "Whitefield Police Station", type: "police", distance: 2.9, lat: 12.9698, lng: 77.7499 },
    { name: "Marathahalli Police Station", type: "police", distance: 4.5, lat: 12.9591, lng: 77.6974 },
    { name: "BBMP Emergency Unit Mahadevapura", type: "government", distance: 3.1, lat: 12.9915, lng: 77.6934 },
    { name: "KSDRF Bangalore Unit", type: "rescue", distance: 8.3, lat: 13.0110, lng: 77.7121 }
  ],
  "mahadevapura": [
    { name: "Mahadevapura Fire Station", type: "fire_station", distance: 1.5, lat: 12.9922, lng: 77.6908 },
    { name: "Whitefield Fire Station", type: "fire_station", distance: 2.9, lat: 12.9698, lng: 77.7499 },
    { name: "Vydehi Hospital Emergency", type: "hospital", distance: 2.1, lat: 12.9757, lng: 77.7284 },
    { name: "Manipal Hospital Whitefield", type: "hospital", distance: 3.0, lat: 12.9866, lng: 77.7314 },
    { name: "Whitefield Police Station", type: "police", distance: 2.7, lat: 12.9698, lng: 77.7499 },
    { name: "Bellandur Police Station", type: "police", distance: 4.9, lat: 12.9304, lng: 77.6784 },
    { name: "BBMP Flood Response Team", type: "government", distance: 1.9, lat: 12.9935, lng: 77.6954 },
    { name: "NDRF Support Unit", type: "rescue", distance: 12.0, lat: 13.1007, lng: 77.5963 }
  ]
};

/**
 * FALLBACK MOCK DATASET (FOR UNDEFINED LOCATIONS)
 */
export const fallbackMockLocations = {
  KR_PURAM: {
    location: "KR Puram",
    lat: 13.0086,
    lng: 77.6956,
    resources: [
      { name: "KR Puram Fire Station", type: "fire_station", distance: 1.2, lat: 13.0125, lng: 77.7056 },
      { name: "Mahadevapura Fire Station", type: "fire_station", distance: 4.3, lat: 12.9912, lng: 77.7123 },
      { name: "Vydehi Hospital Emergency", type: "hospital", distance: 6.1, lat: 12.9756, lng: 77.7289, has_emergency: true },
      { name: "Manipal Hospital Whitefield", type: "hospital", distance: 7.2, lat: 12.9892, lng: 77.7467, has_emergency: true },
      { name: "KR Puram Police Station", type: "police", distance: 1.5, lat: 13.0012, lng: 77.6912 },
      { name: "Ramamurthy Nagar Police Station", type: "police", distance: 3.4, lat: 13.0189, lng: 77.6789 },
      { name: "BBMP Disaster Response East", type: "rescue", distance: 5.1, lat: 13.0212, lng: 77.7123 },
      { name: "Civil Defence Bangalore East", type: "rescue", distance: 6.8, lat: 13.0345, lng: 77.7345 },
      { name: "BBMP Flood Response Unit", type: "government", distance: 4.9, lat: 13.0156, lng: 77.7156 }, 
      { name: "KSDRF Bangalore Unit", type: "rescue", distance: 8.2, lat: 13.0456, lng: 77.7567 }
    ]
  },
  WHITEFIELD: {
    location: "Whitefield",
    lat: 12.9698,
    lng: 77.7499,
    resources: [
      { name: "Whitefield Fire Station", type: "fire_station", distance: 1.4, lat: 12.9734, lng: 77.7512 },
      { name: "Mahadevapura Fire Station", type: "fire_station", distance: 3.2, lat: 12.9912, lng: 77.7123 },
      { name: "Manipal Hospital Whitefield", type: "hospital", distance: 1.1, lat: 12.9892, lng: 77.7467, has_emergency: true },
      { name: "Vydehi Hospital Emergency", type: "hospital", distance: 2.3, lat: 12.9756, lng: 77.7289, has_emergency: true },
      { name: "Whitefield Police Station", type: "police", distance: 1.8, lat: 12.9656, lng: 77.7345 },
      { name: "Kadugodi Police Station", type: "police", distance: 3.0, lat: 12.9812, lng: 77.7678 },
      { name: "KSDRF Bangalore Unit", type: "rescue", distance: 8.4, lat: 13.0456, lng: 77.7567 },
      { name: "Civil Defence Whitefield", type: "rescue", distance: 5.7, lat: 12.9545, lng: 77.7678 },
      { name: "BBMP Flood Response Unit", type: "government", distance: 4.3, lat: 12.9456, lng: 77.7567 }, 
      { name: "NDRF Support Unit", type: "rescue", distance: 12.1, lat: 13.0123, lng: 77.7890 }
    ]
  },
  MARATHAHALLI: {
    location: "Marathahalli",
    lat: 12.9591,
    lng: 77.6974,
    resources: [
      { name: "Marathahalli Fire Station", type: "fire_station", distance: 1.3, lat: 12.9512, lng: 77.7012 },
      { name: "HAL Airport Fire Station", type: "fire_station", distance: 4.2, lat: 12.9412, lng: 77.6712 },
      { name: "Manipal Hospital HAL", type: "hospital", distance: 3.1, lat: 12.9567, lng: 77.6812, has_emergency: true },
      { name: "Cloudnine Hospital", type: "hospital", distance: 2.4, lat: 12.9645, lng: 77.7123, has_emergency: true },
      { name: "Marathahalli Police Station", type: "police", distance: 1.0, lat: 12.9556, lng: 77.6912 },
      { name: "Bellandur Police Station", type: "police", distance: 2.8, lat: 12.9234, lng: 77.6712 },
      { name: "Civil Defence Bangalore East", type: "rescue", distance: 7.9, lat: 13.0345, lng: 77.7345 },
      { name: "BBMP Disaster Response Unit", type: "government", distance: 5.4, lat: 12.9712, lng: 77.6812 },
      { name: "Bellandur Flood Response Team", type: "rescue", distance: 3.9, lat: 12.9123, lng: 77.6612 }, 
      { name: "KSDRF Bangalore Unit", type: "rescue", distance: 9.3, lat: 13.0456, lng: 77.7567 }
    ]
  },
  YELAHANKA: {
    location: "Yelahanka",
    lat: 13.1007,
    lng: 77.5963,
    resources: [
      { name: "Yelahanka Fire Station", type: "fire_station", distance: 1.6, lat: 13.1023, lng: 77.5912 },
      { name: "Hebbal Fire Station", type: "fire_station", distance: 8.3, lat: 13.0345, lng: 77.5812 },
      { name: "Aster CMI Hospital Emergency", type: "hospital", distance: 6.5, lat: 13.0612, lng: 77.5912, has_emergency: true },
      { name: "Baptist Hospital Emergency", type: "hospital", distance: 7.8, lat: 13.0312, lng: 77.5967, has_emergency: true },
      { name: "Yelahanka Police Station", type: "police", distance: 1.4, lat: 13.1112, lng: 77.6012 },
      { name: "Kogilu Police Station", type: "police", distance: 3.1, lat: 13.1234, lng: 77.6212 },
      { name: "NDRF Yelahanka Battalion", type: "rescue", distance: 4.0, lat: 13.1345, lng: 77.6123 },
      { name: "Civil Defence Yelahanka", type: "rescue", distance: 5.6, lat: 13.0912, lng: 77.5812 },
      { name: "BBMP Flood Response Unit", type: "government", distance: 6.2, lat: 13.1512, lng: 77.6312 }, 
      { name: "KSDRF Karnataka Unit", type: "rescue", distance: 9.5, lat: 13.1812, lng: 77.6512 }
    ]
  }
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
  
  // 1. Hard Blacklist (Reject specialty-only clinics)
  const blacklist = [
    "eye", "vision", "cataract", "ophthalmology",
    "dental", "dentistry", "orthodontic",
    "hair", "scalp", "skin", "cosmetic", "derma",
    "geriatric", "fertility", "ivf", "birth center",
    "poly clinic", "ayurvedic", "homeo", "wellness", "spa", "yoga",
    "physiotherapy", "rehab", "diagnostics", "pathology",
    "imaging", "scan", "small specialty", "private clinic",
    "bbmp", "commissioner", "registrar", "corporation", "office", "electricity", "bescom", "bda", "ward office"
  ];

  // 2. High-priority Whitelist (Always allowed even if keywords collide)
  const whitelist = ["fire", "police", "rescue", "disaster", "brigade", "ambulance", "sdma", "ndrf"];

  if (t === "fire_station" || t === "police") return true;
  if (whitelist.some(p => n.includes(p))) return true;

  // 3. Specialty Clinic Rejection
  if (blacklist.some(p => n.includes(p))) {
    // Exception: If it explicitly says "Multi Speciality" or "General", it might be okay
    if (!(n.includes("multi speciality") || n.includes("general hospital"))) {
      return false;
    }
  }

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
    "speciality hospital",
    "emergency",
    "trauma",
    "icu",
    "government hospital",
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
  const query = `[out:json][timeout:15];(node["amenity"="hospital"](around:${radius},${lat},${lng});node["amenity"="fire_station"](around:${radius},${lat},${lng});node["amenity"="police"](around:${radius},${lat},${lng}););out body;`;
  
  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
  ];

  // HACKATHON RACING: Launch parallel requests and take the FASTEST success
  const fetchFromMirror = async (mirrorUrl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s hard timeout
    
    try {
      const url = `${mirrorUrl}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`${mirrorUrl} error`);
      
      const data = await response.json();
      const results = (data.elements || [])
        .map(el => {
          let type = el.tags.amenity || el.tags.office || "rescue";
          return {
            name: el.tags.name || `${type.replace('_', ' ')} (Discovered)`,
            type: type,
            lat: el.lat,
            lng: el.lon,
            distance: calculateDistance(lat, lng, el.lat, el.lon),
            has_emergency: checkHospitalCapability(el.tags.name)
          };
        })
        .filter(res => isValidEmergencyCenter(res.name, res.type));

      return results;
    } catch (err) {
      throw err;
    }
  };

  // Race mirrors in bundles for speed
  for (let i = 0; i < mirrors.length; i += 2) {
    const racePool = [
      fetchFromMirror(mirrors[i]),
      fetchFromMirror(mirrors[i+1] || mirrors[0])
    ];

    try {
      const result = await Promise.any(racePool);
      if (result && result.length > 0) return result;
    } catch (err) {
      if (onStatusUpdate) onStatusUpdate(`Mirror segment failed, racing next pair...`);
    }
  }

  return [];
};

/* 
 * fetch real rescue centers using OpenRouteService POI API
 * @param {number} lat
 * @param {number} lng
 * @param {Object} incident
 */
export const fetchNearbyResourcesOSR = async (lat, lng, incident, onStatusUpdate = null) => {
  const dLat = Number(lat);
  const dLng = Number(lng);
  
  if (!isNaN(dLat) && !isNaN(dLng) && dLat !== 0) {
    // 1. FAST LOCAL SEARCH (10KM)
    if (onStatusUpdate) onStatusUpdate("Scanning tactical perimeter (10KM)...");
    let dynamicResults = await fetchOverpassResources(dLat, dLng, 10000, onStatusUpdate);
    
    if (dynamicResults && dynamicResults.length > 0) {
      if (onStatusUpdate) onStatusUpdate(`Located ${dynamicResults.length} responders.`);
      return dynamicResults;
    }

    // 2. AUTO-EXPANSION (20KM) IF 10KM IS EMPTY
    if (onStatusUpdate) onStatusUpdate("Expanding grid to 20KM distance...");
    dynamicResults = await fetchOverpassResources(dLat, dLng, 20000, onStatusUpdate);
    
    if (dynamicResults && dynamicResults.length > 0) {
      if (onStatusUpdate) onStatusUpdate(`Located ${dynamicResults.length} responders in expanded perimeter.`);
      return dynamicResults;
    }

    if (onStatusUpdate) onStatusUpdate("Search exhausted. Contacting Central HQ.");
  }

  return [];
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
      .slice(0, 8); // Top 8 of each type
    candidates = [...candidates, ...subset];
  });

  // If we have sparse results, grab additional general closest ones
  if (candidates.length < 15) {
    const general = resources
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15);
    candidates = [...candidates, ...general];
  }

  // Deduplicate by name + coordinates to ensure unique nodes
  const uniqueCandidates = Array.from(
    new Map(candidates.map(item => [item.name + item.lat + item.lng, item])).values()
  ).slice(0, 30); // Hard cap at 30 OSR calls for speed

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
 */
export const selectAgentResources = (resources, incidentType) => {
  if (!resources || resources.length === 0) return [];

  const type = (incidentType || "").toLowerCase();

  /**
   * STRICT BALANCED RESPONSE (1 Center Per Required Category)
   */
  const rescueCategories = {
    fire: ["fire_station", "hospital", "police"],
    flood: ["rescue", "police", "hospital"],
    building_collapse: ["fire_station", "hospital", "police"],
    emergency: ["rescue", "hospital", "police"]
  };

  const needed = rescueCategories[type] || rescueCategories["emergency"];
  const selected = [];

  // Pick exactly ONE (the closest) from each required category
  needed.forEach(cat => {
    const pool = resources.filter(r => r.type === cat);
    if (pool.length > 0) {
      const closest = pool.sort((a, b) => {
        const distA = (a.duration || a.distance || 999);
        const distB = (b.duration || b.distance || 999);
        return distA - distB;
      })[0];
      selected.push({ ...closest, role: cat });
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