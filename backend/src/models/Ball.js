const mongoose = require('mongoose');

const ballSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  inningsNumber: {
    type: Number,
    enum: [1, 2],
    required: true
  },
  
  // Over and Ball tracking
  overNumber: {
    type: Number,
    required: true,
    min: 0
  },
  ballNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  sequence: {
    type: Number,
    required: true
  },
  
  // Players involved
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  batsman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  nonStriker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  
  // Runs
  runs: {
    type: Number,
    default: 0,
    min: 0,
    max: 7
  },
  
  // Extras
  isExtra: {
    type: Boolean,
    default: false
  },
  extraType: {
    type: String,
    enum: ['wide', 'no-ball', 'bye', 'leg-bye', null],
    default: null
  },
  extraRuns: {
    type: Number,
    default: 0
  },
  
  // Total runs from this delivery
  totalRuns: {
    type: Number,
    default: 0
  },
  
  // Boundaries
  isFour: {
    type: Boolean,
    default: false
  },
  isSix: {
    type: Boolean,
    default: false
  },
  
  // Wicket
  isWicket: {
    type: Boolean,
    default: false
  },
  wicket: {
    type: {
      type: String,
      enum: ['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket', null],
      default: null
    },
    dismissedPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    fielder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    }
  },
  
  // Match state snapshot after this ball
  scoreAfter: {
    runs: Number,
    wickets: Number,
    overs: String
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
ballSchema.index({ match: 1 });
ballSchema.index({ match: 1, inningsNumber: 1 });
ballSchema.index({ match: 1, sequence: -1 });
ballSchema.index({ match: 1, inningsNumber: 1, overNumber: 1 });

module.exports = mongoose.model('Ball', ballSchema);
