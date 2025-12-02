const mongoose = require('mongoose');

// Sub-schema for squad player
const squadPlayerSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  isPlayingXI: {
    type: Boolean,
    default: false
  },
  battingOrder: {
    type: Number,
    min: 1,
    max: 11,
    default: null
  }
}, { _id: false });

// Sub-schema for batting statistics
const battingStatsSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  isNotOut: { type: Boolean, default: false },
  dismissal: {
    type: {
      type: String,
      enum: ['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket', null],
      default: null
    },
    bowler: {
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
  position: { type: Number }
}, { _id: false });

// Sub-schema for bowling statistics
const bowlingStatsSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  wides: { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  dotBalls: { type: Number, default: 0 }
}, { _id: false });

// Sub-schema for current over ball display
const overBallSchema = new mongoose.Schema({
  ballNumber: Number,
  runs: Number,
  isExtra: Boolean,
  extraType: String,
  isWicket: Boolean,
  display: String
}, { _id: false });

// Sub-schema for completed over
const completedOverSchema = new mongoose.Schema({
  overNumber: Number,
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  balls: [overBallSchema],
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 }
}, { _id: false });

// Sub-schema for partnership
const partnershipSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  batsman1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  batsman2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }
}, { _id: false });

// Sub-schema for fall of wickets
const fallOfWicketSchema = new mongoose.Schema({
  wicketNumber: Number,
  runs: Number,
  balls: Number,
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  overs: String
}, { _id: false });

// Sub-schema for innings
const inningsSchema = new mongoose.Schema({
  battingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  bowlingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  inningsNumber: {
    type: Number,
    enum: [1, 2],
    required: true
  },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalBalls: { type: Number, default: 0 },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  currentBatsmen: {
    striker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    },
    nonStriker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null
    }
  },
  currentBowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  lastBowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  battingStats: [battingStatsSchema],
  bowlingStats: [bowlingStatsSchema],
  currentOver: [overBallSchema],
  overs: [completedOverSchema],
  fallOfWickets: [fallOfWicketSchema],
  partnership: partnershipSchema
}, { _id: true });

// Sub-schema for background configuration
const backgroundSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'none'],
    default: 'none'
  },
  url: {
    type: String,
    default: null
  }
}, { _id: false });

// Sub-schema for view-specific backgrounds
const viewBackgroundsSchema = new mongoose.Schema({
  'score-summary': backgroundSchema,
  'player-stats': backgroundSchema,
  'overall-summary': backgroundSchema,
  'projections': backgroundSchema,
  'partnership': backgroundSchema
}, { _id: false });

// Main Match Schema
const matchSchema = new mongoose.Schema({
  format: {
    type: String,
    enum: {
      values: ['T20', 'ODI'],
      message: '{VALUE} is not a valid match format'
    },
    required: [true, 'Match format is required']
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: [true, 'Team 1 is required']
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: [true, 'Team 2 is required']
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true,
    maxlength: [200, 'Venue cannot exceed 200 characters']
  },
  date: {
    type: Date,
    required: [true, 'Match date is required']
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming'
  },
  toss: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      default: null
    },
    decision: {
      type: String,
      enum: ['bat', 'bowl', null],
      default: null
    }
  },
  squads: {
    team1: [squadPlayerSchema],
    team2: [squadPlayerSchema]
  },
  innings: [inningsSchema],
  currentInnings: {
    type: Number,
    default: 0
  },
  result: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      default: null
    },
    winMargin: {
      type: String,
      default: null
    },
    winType: {
      type: String,
      enum: ['runs', 'wickets', 'tie', 'no-result', null],
      default: null
    }
  },
  displayView: {
    type: String,
    enum: ['score-summary', 'player-stats', 'overall-summary', 'projections', 'partnership'],
    default: 'score-summary'
  },
  // Background configuration per view
  // Priority: match-specific > batting team default > none
  backgrounds: {
    useTeamBackground: {
      type: Boolean,
      default: true  // If true, falls back to batting team's background
    },
    views: viewBackgroundsSchema
  }
}, {
  timestamps: true
});

// Indexes for faster queries
matchSchema.index({ status: 1 });
matchSchema.index({ date: -1 });
matchSchema.index({ team1: 1, team2: 1 });

// Virtual for target (second innings)
matchSchema.virtual('target').get(function() {
  if (this.innings && this.innings.length > 0 && this.currentInnings === 1) {
    return this.innings[0].totalRuns + 1;
  }
  return null;
});

// Virtual for overs display
matchSchema.methods.getOversDisplay = function(totalBalls) {
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return `${overs}.${balls}`;
};

// Ensure virtuals are included in JSON
matchSchema.set('toJSON', { virtuals: true });
matchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Match', matchSchema);
