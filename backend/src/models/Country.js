const mongoose = require('mongoose');

// ESPN Cricinfo team ID mapping by country code
const ESPN_TEAM_ID_MAP = {
  'GB': 1, 'UK': 1, 'ENG': 1,  // England
  'AU': 2, 'AUS': 2,            // Australia
  'ZA': 3, 'RSA': 3,            // South Africa
  'WI': 4,                       // West Indies
  'NZ': 5,                       // New Zealand
  'IN': 6, 'IND': 6,            // India
  'PK': 7, 'PAK': 7,            // Pakistan
  'LK': 8, 'SL': 8, 'SRI': 8,   // Sri Lanka
  'ZW': 9, 'ZIM': 9,            // Zimbabwe
  'US': 11, 'USA': 11,          // USA
  'NL': 15, 'NED': 15,          // Netherlands
  'CA': 17, 'CAN': 17,          // Canada
  'BD': 25, 'BAN': 25,          // Bangladesh
  'KE': 26, 'KEN': 26,          // Kenya
  'IE': 29, 'IRE': 29,          // Ireland
  'AF': 40, 'AFG': 40           // Afghanistan
};

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Country name is required'],
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Country code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [2, 'Country code must be at least 2 characters'],
    maxlength: [3, 'Country code cannot exceed 3 characters']
  },
  // ESPN Cricinfo team ID for auto-sync (optional - falls back to code mapping)
  espnTeamId: {
    type: Number,
    default: null
  },
  flagUrl: {
    type: String,
    default: null
  },
  // Animated flag video for overlay on display backgrounds
  flagVideo: {
    type: String,
    default: null
  },
  // Default background for this country (used when country is batting)
  background: {
    type: {
      type: String,
      enum: ['image', 'video', 'none'],
      default: 'none'
    },
    url: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Static method to get ESPN team ID for a country
countrySchema.statics.getEspnTeamId = function(country) {
  // First check if country has explicit espnTeamId set
  if (country.espnTeamId) {
    return country.espnTeamId;
  }
  // Fall back to code mapping
  return ESPN_TEAM_ID_MAP[country.code.toUpperCase()] || null;
};

// Export the mapping for use in other modules
const Country = mongoose.model('Country', countrySchema);
Country.ESPN_TEAM_ID_MAP = ESPN_TEAM_ID_MAP;

module.exports = Country;
