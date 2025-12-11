const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
    maxlength: [100, 'Player name cannot exceed 100 characters']
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: [true, 'Country is required']
  },
  role: {
    type: String,
    enum: {
      values: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'],
      message: '{VALUE} is not a valid role'
    },
    required: [true, 'Player role is required']
  },
  battingStyle: {
    type: String,
    enum: {
      values: ['right-hand', 'left-hand'],
      message: '{VALUE} is not a valid batting style'
    },
    required: [true, 'Batting style is required']
  },
  bowlingStyle: {
    type: String,
    enum: {
      values: [
        'right-arm-fast',
        'right-arm-medium',
        'left-arm-fast',
        'left-arm-medium',
        'right-arm-off-spin',
        'right-arm-leg-spin',
        'left-arm-orthodox',
        'left-arm-chinaman',
        'none'
      ],
      message: '{VALUE} is not a valid bowling style'
    },
    default: 'none'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  headshotPath: {
    type: String,
    default: null
  },
  espnId: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    enum: {
      values: ['M', 'F'],
      message: '{VALUE} is not a valid gender'
    },
    default: 'M'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
playerSchema.index({ country: 1 });
playerSchema.index({ country: 1, name: 1 });
playerSchema.index({ role: 1 });
playerSchema.index({ isActive: 1 });
playerSchema.index({ gender: 1 });
playerSchema.index({ country: 1, gender: 1 });

module.exports = mongoose.model('Player', playerSchema);
