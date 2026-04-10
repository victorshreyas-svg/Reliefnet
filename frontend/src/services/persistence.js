// src/services/persistence.js

export const STORAGE_KEYS = {
  INCIDENTS: 'reliefnet_incidents',
  SELECTED_ID: 'reliefnet_selected',
  ANALYSIS: 'reliefnet_analysis',
  ALLOCATION: 'reliefnet_allocation',
  DISPATCH: 'reliefnet_dispatch',
  DISPATCH_LOGS: 'reliefnet_dispatch_logs',
  TRACKING: 'reliefnet_tracking',
  LOGS: 'reliefnet_logs'
};

export const persistence = {
  save: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Persistence Save Error [${key}]:`, e);
    }
  },

  load: (key, defaultValue = null) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Persistence Load Error [${key}]:`, e);
      return defaultValue;
    }
  },

  clear: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};
