// src/services/logger.js

class Logger {
  constructor() {
    this.listeners = new Set();
  }

  emit(message, prefix = "AI") {
    const log = `[${prefix}] ${message}`;
    console.log(log); // Also log to console for debugging
    this.listeners.forEach(listener => listener(log));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const logger = new Logger();
