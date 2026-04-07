import floodImg from '../assets/flood.jpg';
import collapseImg from '../assets/collapse.jpg';
import fireImg from '../assets/fire.jpg';

export const getBase64FromUrl = async (url) => {
  try {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to load image for simulation", err);
    return null; 
  }
};

export const predefinedDisasters = [
  {
    id: "flood-demo",
    disaster_type: "flood",
    location: "Mahadevapura, Bangalore",
    coordinates: { lat: 12.9916, lng: 77.6950 },
    description: "Severe flooding in residential streets, people walking through knee-deep water",
    imageAsset: floodImg,
    isPredefined: true
  },
  {
    id: "collapse-demo",
    disaster_type: "building_collapse",
    location: "Babusapalya, Bangalore",
    coordinates: { lat: 13.0250, lng: 77.6632 },
    description: "Partial building collapse, debris blocking road, civilians trapped",
    imageAsset: collapseImg,
    isPredefined: true
  },
  {
    id: "fire-demo",
    disaster_type: "fire",
    location: "Shivani Layout, Bangalore",
    coordinates: { lat: 13.0400, lng: 77.6200 },
    description: "Construction site fire with smoke and flames",
    imageAsset: fireImg,
    isPredefined: true
  }
];
