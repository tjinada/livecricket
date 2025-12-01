const mongoose = require('mongoose');

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

module.exports = mongoose.model('Country', countrySchema);
