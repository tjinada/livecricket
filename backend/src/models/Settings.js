const mongoose = require('mongoose');

// Schema for default view backgrounds
// These are the base backgrounds that flags get overlaid on
const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Static method to get a setting by key
settingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting
settingsSchema.statics.setSetting = async function(key, value, description = null) {
  const update = { value };
  if (description) update.description = description;
  
  return this.findOneAndUpdate(
    { key },
    { $set: update },
    { upsert: true, new: true }
  );
};

// Pre-defined setting keys for type safety
const SETTING_KEYS = {
  DEFAULT_BACKGROUNDS: 'defaultBackgrounds'  // Stores base backgrounds per view
};

/*
  Structure of DEFAULT_BACKGROUNDS value:
  {
    'score-summary': { type: 'video', url: '/uploads/backgrounds/...' },
    'player-stats': { type: 'image', url: '/uploads/backgrounds/...' },
    'overall-summary': { type: 'video', url: '/uploads/backgrounds/...' },
    'projections': { type: 'video', url: '/uploads/backgrounds/...' }
  }
*/

module.exports = mongoose.model('Settings', settingsSchema);
module.exports.SETTING_KEYS = SETTING_KEYS;
