/**
 * Highlight Configuration
 * Centralized timing and behavior settings for highlight videos and live notifications
 */

const defaults = {
  // Duration settings (in milliseconds)
  durations: {
    // Scoring event overlay durations
    four: 2000,
    six: 2000,
    wicket: 2500,
    fifty: 3000,
    hundred: 4000,
    
    // Gap between consecutive overlay notifications
    overlayGap: 2000,
    
    // Intro and summary screen durations
    matchIntro: 5000,
    teamLineup: 6000,
    inningsIntro: 4000,
    inningsStart: 3000,
    chaseSetup: 4000,
    phaseSummary: 6000,
    inningsSummary: 10000,
    matchResult: 6000,
    matchSummary: 10000
  },
  
  // Live notification settings
  liveNotifications: {
    displayDuration: 2000,    // How long each notification displays
    cooldownDuration: 2000,   // Gap between notifications
    maxQueueSize: 10          // Maximum pending notifications
  },
  
  // Phase settings by format
  phases: {
    T20: {
      powerplayEnd: 6,
      middleOversEnd: 15,
      deathOversStart: 16,
      totalOvers: 20
    },
    ODI: {
      powerplayEnd: 10,
      middleOversEnd: 40,
      deathOversStart: 41,
      totalOvers: 50
    }
  },
  
  // Notable thresholds for phase summaries
  notableThresholds: {
    minBoundaries: 4,
    minWickets: 2,
    minRunRate: 10,
    minPhaseRuns: 50
  },
  
  // Importance level settings
  importance: {
    applyMultipliers: false,  // Whether to apply duration multipliers
    levels: {
      routine: { minScore: 0, maxScore: 20, multiplier: 1.0 },
      notable: { minScore: 20, maxScore: 40, multiplier: 1.2 },
      significant: { minScore: 40, maxScore: 60, multiplier: 1.4 },
      crucial: { minScore: 60, maxScore: 80, multiplier: 1.6 },
      epic: { minScore: 80, maxScore: 100, multiplier: 2.0 }
    }
  },
  
  // Player component settings
  player: {
    progressUpdateInterval: 50,  // Progress bar update frequency (ms)
    transitionDuration: {
      crossfade: 300,
      major: 500
    }
  }
};

// Current configuration (starts with defaults)
let currentConfig = JSON.parse(JSON.stringify(defaults));

/**
 * Get the full configuration
 */
function getConfig() {
  return JSON.parse(JSON.stringify(currentConfig));
}

/**
 * Get duration settings
 */
function getDurations() {
  return { ...currentConfig.durations };
}

/**
 * Get live notification settings
 */
function getLiveNotificationSettings() {
  return { ...currentConfig.liveNotifications };
}

/**
 * Get phase settings for a format
 */
function getPhaseSettings(format) {
  const key = format?.toUpperCase() === 'ODI' ? 'ODI' : 'T20';
  return { ...currentConfig.phases[key] };
}

/**
 * Get notable thresholds
 */
function getNotableThresholds() {
  return { ...currentConfig.notableThresholds };
}

/**
 * Get importance levels
 */
function getImportanceLevels() {
  return JSON.parse(JSON.stringify(currentConfig.importance));
}

/**
 * Get player settings
 */
function getPlayerSettings() {
  return JSON.parse(JSON.stringify(currentConfig.player));
}

/**
 * Update configuration (deep merge)
 */
function updateConfig(updates) {
  if (updates.durations) {
    currentConfig.durations = { ...currentConfig.durations, ...updates.durations };
  }
  if (updates.liveNotifications) {
    currentConfig.liveNotifications = { ...currentConfig.liveNotifications, ...updates.liveNotifications };
  }
  if (updates.phases) {
    if (updates.phases.T20) {
      currentConfig.phases.T20 = { ...currentConfig.phases.T20, ...updates.phases.T20 };
    }
    if (updates.phases.ODI) {
      currentConfig.phases.ODI = { ...currentConfig.phases.ODI, ...updates.phases.ODI };
    }
  }
  if (updates.notableThresholds) {
    currentConfig.notableThresholds = { ...currentConfig.notableThresholds, ...updates.notableThresholds };
  }
  if (updates.importance) {
    currentConfig.importance = { ...currentConfig.importance, ...updates.importance };
  }
  if (updates.player) {
    currentConfig.player = { ...currentConfig.player, ...updates.player };
  }
  return getConfig();
}

/**
 * Reset configuration to defaults
 */
function resetConfig() {
  currentConfig = JSON.parse(JSON.stringify(defaults));
  return getConfig();
}

/**
 * Validate configuration values
 */
function validateConfig(config) {
  const errors = [];
  
  if (config.durations) {
    const d = config.durations;
    const minDuration = 500;
    const maxDuration = 60000;
    
    for (const [key, value] of Object.entries(d)) {
      if (typeof value !== 'number' || value < minDuration || value > maxDuration) {
        errors.push(`durations.${key} must be between ${minDuration}ms and ${maxDuration}ms`);
      }
    }
  }
  
  if (config.liveNotifications) {
    const ln = config.liveNotifications;
    if (ln.displayDuration !== undefined && (ln.displayDuration < 500 || ln.displayDuration > 10000)) {
      errors.push('liveNotifications.displayDuration must be between 500ms and 10000ms');
    }
    if (ln.cooldownDuration !== undefined && (ln.cooldownDuration < 0 || ln.cooldownDuration > 10000)) {
      errors.push('liveNotifications.cooldownDuration must be between 0ms and 10000ms');
    }
    if (ln.maxQueueSize !== undefined && (ln.maxQueueSize < 1 || ln.maxQueueSize > 50)) {
      errors.push('liveNotifications.maxQueueSize must be between 1 and 50');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get default configuration
 */
function getDefaults() {
  return JSON.parse(JSON.stringify(defaults));
}

// Legacy exports for backward compatibility
const HIGHLIGHT_DURATIONS = new Proxy({}, {
  get(target, prop) {
    return getDurations()[prop];
  }
});

const IMPORTANCE_LEVELS = new Proxy({}, {
  get(target, prop) {
    return getImportanceLevels().levels[prop];
  }
});

module.exports = {
  getConfig,
  getDurations,
  getLiveNotificationSettings,
  getPhaseSettings,
  getNotableThresholds,
  getImportanceLevels,
  getPlayerSettings,
  updateConfig,
  resetConfig,
  validateConfig,
  getDefaults,
  // Legacy exports
  HIGHLIGHT_DURATIONS,
  IMPORTANCE_LEVELS
};
