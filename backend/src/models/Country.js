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
  }
}, {
  timestamps: true
});

// Note: 'unique: true' on code already creates an index, no need for additional index

module.exports = mongoose.model('Country', countrySchema);
