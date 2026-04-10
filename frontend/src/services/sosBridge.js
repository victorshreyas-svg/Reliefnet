// src/services/sosBridge.js

const CHANNEL_NAME = 'reliefnet_sos_channel';

class SOSBridge {
  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
  }

  /**
   * Send an emergency payload to the main dashboard
   * @param {Object} payload { id, base64, description, location, isPredefined }
   */
  sendSOS(payload) {
    this.channel.postMessage({
      type: 'SOS_ALERT',
      data: payload,
      timestamp: Date.now()
    });
  }

  /**
   * Remote trigger for the simulation loading logic
   */
  triggerSimulation() {
    this.channel.postMessage({
      type: 'TRIGGER_SIMULATION',
      timestamp: Date.now()
    });
  }

  /**
   * Transmit a manual file upload from the civilian tab to the dashboard
   */
  sendManualUpload(payload) {
    this.channel.postMessage({
      type: 'MANUAL_UPLOAD',
      data: payload,
      timestamp: Date.now()
    });
  }

  /**
   * Listen for incoming signals on the main dashboard
   * @param {Function} callback 
   */
  onSignal(callback) {
    const listener = (event) => {
      callback(event.data);
    };
    this.channel.addEventListener('message', listener);
    return () => this.channel.removeEventListener('message', listener);
  }
}

export const sosBridge = new SOSBridge();
