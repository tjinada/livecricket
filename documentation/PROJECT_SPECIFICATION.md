# Live Cricket Application - Project Specification

## Table of Contents

1. [Overview](#1-overview)
2. [Technical Stack](#2-technical-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Backend API Specification](#5-backend-api-specification)
6. [Scoring Engine](#6-scoring-engine)
7. [Admin View](#7-admin-view)
8. [Display UI View](#8-display-ui-view)
9. [Real-time Updates](#9-real-time-updates)
10. [Authentication](#10-authentication)
11. [Docker Configuration](#11-docker-configuration)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Overview

### 1.1 Purpose

A full-stack cricket scoring application designed for live match management and public display. The application serves two distinct user interfaces:

- **Admin View**: Match management, live scoring, and configuration
- **Display UI View**: Public-facing match visualization controlled by admin

### 1.2 Supported Match Formats

- T20 (20 overs per innings)
- ODI (50 overs per innings)

### 1.3 Design Principles

The application follows these core principles:

- **KISS** (Keep It Simple, Stupid): Avoid unnecessary complexity
- **YAGNI** (You Aren't Gonna Need It): Only implement features that are required
- **SOLID**: Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion

---

## 2. Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend Framework | Angular |
| Frontend Styling | Tailwind CSS |
| Backend Framework | Express.js (Node.js) |
| Database | MongoDB with Mongoose ODM |
| Real-time Communication | Server-Sent Events (SSE) |
| Authentication | JWT with config-based credentials |
| Containerization | Docker |

### 2.1 Why These Choices?

**MongoDB**: Flexible schema for complex nested match data, good for rapid development, and handles the document-oriented nature of cricket match data well.

**Tailwind CSS**: Utility-first approach allows rapid UI development without context-switching to CSS files.

**Server-Sent Events**: Simpler than WebSocket for one-way server-to-client updates (which is all we need for live score broadcasting).

**Single Docker Container**: Simplifies deployment by bundling frontend and backend together.

---

## 3. Project Structure

```
livecricket/
├── documentation/
│   └── PROJECT_SPECIFICATION.md
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js              # Configuration (DB, auth, JWT)
│   │   ├── models/
│   │   │   ├── Country.js            # Country schema
│   │   │   ├── Player.js             # Player schema
│   │   │   ├── Match.js              # Match schema (main entity)
│   │   │   └── Ball.js               # Ball-by-ball records
│   │   ├── routes/
│   │   │   ├── auth.js               # Authentication routes
│   │   │   ├── countries.js          # Country CRUD
│   │   │   ├── players.js            # Player CRUD
│   │   │   ├── matches.js            # Match management
│   │   │   └── scoring.js            # Live scoring endpoints
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification middleware
│   │   ├── services/
│   │   │   └── scoringEngine.js      # Core scoring logic
│   │   └── app.js                    # Express application entry
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                 # Core services, guards, interceptors
│   │   │   ├── shared/               # Shared components, pipes, directives
│   │   │   ├── admin/                # Admin module
│   │   │   └── display/              # Display UI module
│   │   ├── environments/
│   │   └── styles.css                # Tailwind imports
│   ├── angular.json
│   ├── tailwind.config.js
│   └── package.json
├── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 4. Database Schema

### 4.1 Country Collection

Stores cricket-playing nations.

```javascript
{
  _id: ObjectId,
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 2,
    maxlength: 3
    // Examples: "IND", "AUS", "ENG", "NZ"
  },
  flagUrl: {
    type: String,
    default: null
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `code` (unique)

### 4.2 Player Collection

Stores player information linked to countries.

```javascript
{
  _id: ObjectId,
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: ObjectId,
    ref: 'Country',
    required: true
  },
  role: {
    type: String,
    enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'],
    required: true
  },
  battingStyle: {
    type: String,
    enum: ['right-hand', 'left-hand'],
    required: true
  },
  bowlingStyle: {
    type: String,
    enum: ['right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium', 
           'right-arm-off-spin', 'right-arm-leg-spin', 'left-arm-orthodox', 
           'left-arm-chinaman', 'none'],
    default: 'none'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `country`, `{ country: 1, name: 1 }`

### 4.3 Match Collection

Main entity storing all match-related data including innings and statistics.

```javascript
{
  _id: ObjectId,
  
  // Match Setup
  format: {
    type: String,
    enum: ['T20', 'ODI'],
    required: true
  },
  team1: {
    type: ObjectId,
    ref: 'Country',
    required: true
  },
  team2: {
    type: ObjectId,
    ref: 'Country',
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming'
  },
  
  // Toss
  toss: {
    winner: {
      type: ObjectId,
      ref: 'Country'
    },
    decision: {
      type: String,
      enum: ['bat', 'bowl']
    }
  },
  
  // Squad Selection
  squads: {
    team1: [{
      player: {
        type: ObjectId,
        ref: 'Player'
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
    }],
    team2: [{
      player: {
        type: ObjectId,
        ref: 'Player'
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
    }]
  },
  
  // Innings Data
  innings: [{
    battingTeam: {
      type: ObjectId,
      ref: 'Country'
    },
    bowlingTeam: {
      type: ObjectId,
      ref: 'Country'
    },
    inningsNumber: {
      type: Number,
      enum: [1, 2]
    },
    totalRuns: {
      type: Number,
      default: 0
    },
    totalWickets: {
      type: Number,
      default: 0
    },
    totalBalls: {
      type: Number,
      default: 0
    },
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
    
    // Current State
    currentBatsmen: {
      striker: { type: ObjectId, ref: 'Player' },
      nonStriker: { type: ObjectId, ref: 'Player' }
    },
    currentBowler: {
      type: ObjectId,
      ref: 'Player'
    },
    lastBowler: {
      type: ObjectId,
      ref: 'Player'
    },
    
    // Batting Statistics
    battingStats: [{
      player: { type: ObjectId, ref: 'Player' },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      isOut: { type: Boolean, default: false },
      isNotOut: { type: Boolean, default: false },
      dismissal: {
        type: {
          type: String,
          enum: ['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket', null]
        },
        bowler: { type: ObjectId, ref: 'Player' },
        fielder: { type: ObjectId, ref: 'Player' }
      },
      position: { type: Number } // Batting order position
    }],
    
    // Bowling Statistics
    bowlingStats: [{
      player: { type: ObjectId, ref: 'Player' },
      overs: { type: Number, default: 0 },    // Complete overs
      balls: { type: Number, default: 0 },     // Balls in current over
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      dotBalls: { type: Number, default: 0 }
    }],
    
    // Over-by-over tracking for current over display
    currentOver: [{
      ballNumber: Number,
      runs: Number,
      isExtra: Boolean,
      extraType: String,
      isWicket: Boolean,
      display: String  // e.g., "1", "4", "W", "Wd", "•"
    }],
    
    // Fall of wickets
    fallOfWickets: [{
      wicketNumber: Number,
      runs: Number,
      balls: Number,
      player: { type: ObjectId, ref: 'Player' },
      overs: String  // Display format "12.4"
    }]
  }],
  
  // Current innings index (0 or 1)
  currentInnings: {
    type: Number,
    default: 0
  },
  
  // Match Result
  result: {
    winner: { type: ObjectId, ref: 'Country' },
    winMargin: String,  // e.g., "5 wickets", "23 runs"
    winType: {
      type: String,
      enum: ['runs', 'wickets', 'tie', 'no-result', null]
    }
  },
  
  // Display Control
  displayView: {
    type: String,
    enum: ['score-summary', 'player-stats', 'overall-summary', 'projections'],
    default: 'score-summary'
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: `status`, `date`, `{ team1: 1, team2: 1 }`

### 4.4 Ball Collection

Detailed ball-by-ball history for each match (separate collection for query efficiency).

```javascript
{
  _id: ObjectId,
  match: {
    type: ObjectId,
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
    type: Number,      // 0-indexed (0 = first over)
    required: true
  },
  ballNumber: {
    type: Number,      // 1-6 for legal deliveries
    required: true
  },
  sequence: {
    type: Number,      // Sequential number including extras
    required: true
  },
  
  // Players involved
  bowler: {
    type: ObjectId,
    ref: 'Player',
    required: true
  },
  batsman: {
    type: ObjectId,
    ref: 'Player',
    required: true
  },
  nonStriker: {
    type: ObjectId,
    ref: 'Player',
    required: true
  },
  
  // Runs
  runs: {
    type: Number,
    default: 0,
    min: 0,
    max: 6
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
      enum: ['bowled', 'caught', 'lbw', 'run-out', 'stumped', 'hit-wicket', null]
    },
    dismissedPlayer: { type: ObjectId, ref: 'Player' },
    fielder: { type: ObjectId, ref: 'Player' }
  },
  
  // Match state snapshot after this ball
  scoreAfter: {
    runs: Number,
    wickets: Number,
    overs: String  // Display format "12.4"
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes**: `match`, `{ match: 1, inningsNumber: 1 }`, `{ match: 1, sequence: -1 }`

---

## 5. Backend API Specification

### 5.1 Base URL

```
/api
```

### 5.2 Authentication Endpoints

#### POST /api/auth/login

Authenticate admin user.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

#### GET /api/auth/verify

Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "valid": true
}
```

### 5.3 Country Endpoints

All country endpoints (except GET) require authentication.

#### GET /api/countries

List all countries.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "India",
      "code": "IND",
      "flagUrl": "/flags/ind.png"
    }
  ]
}
```

#### POST /api/countries 🔒

Create a new country.

**Request Body:**
```json
{
  "name": "India",
  "code": "IND",
  "flagUrl": "/flags/ind.png"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "India",
    "code": "IND",
    "flagUrl": "/flags/ind.png"
  }
}
```

#### PUT /api/countries/:id 🔒

Update a country.

**Request Body:**
```json
{
  "name": "India",
  "flagUrl": "/flags/india-new.png"
}
```

#### DELETE /api/countries/:id 🔒

Delete a country. Fails if country has associated players or matches.

### 5.4 Player Endpoints

All player endpoints (except GET) require authentication.

#### GET /api/players

List players with optional filtering.

**Query Parameters:**
- `country` (ObjectId): Filter by country
- `role` (string): Filter by role
- `active` (boolean): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Virat Kohli",
      "country": {
        "_id": "...",
        "name": "India",
        "code": "IND"
      },
      "role": "batsman",
      "battingStyle": "right-hand",
      "bowlingStyle": "right-arm-medium",
      "isActive": true
    }
  ]
}
```

#### POST /api/players 🔒

Create a new player.

**Request Body:**
```json
{
  "name": "Virat Kohli",
  "country": "country_id_here",
  "role": "batsman",
  "battingStyle": "right-hand",
  "bowlingStyle": "right-arm-medium"
}
```

#### PUT /api/players/:id 🔒

Update a player.

#### DELETE /api/players/:id 🔒

Delete a player. Soft delete (sets isActive to false) if player has match history.

### 5.5 Match Endpoints

#### GET /api/matches

List matches with filtering.

**Query Parameters:**
- `status` (string): 'upcoming', 'live', 'completed'
- `team` (ObjectId): Filter by team
- `from` (date): Start date
- `to` (date): End date

#### GET /api/matches/:id

Get full match details with populated references.

#### POST /api/matches 🔒

Create a new match.

**Request Body:**
```json
{
  "format": "T20",
  "team1": "country_id",
  "team2": "country_id",
  "venue": "Melbourne Cricket Ground",
  "date": "2024-12-25T14:00:00Z"
}
```

#### PUT /api/matches/:id 🔒

Update match details (only for upcoming matches).

#### PUT /api/matches/:id/squad 🔒

Set squad for both teams.

**Request Body:**
```json
{
  "team1": [
    {
      "player": "player_id",
      "isPlayingXI": true,
      "battingOrder": 1
    }
  ],
  "team2": [
    {
      "player": "player_id",
      "isPlayingXI": true,
      "battingOrder": 1
    }
  ]
}
```

#### PUT /api/matches/:id/toss 🔒

Record toss result.

**Request Body:**
```json
{
  "winner": "country_id",
  "decision": "bat"
}
```

#### POST /api/matches/:id/start 🔒

Start the match. Initializes first innings based on toss.

**Request Body:**
```json
{
  "openingBatsmen": {
    "striker": "player_id",
    "nonStriker": "player_id"
  },
  "openingBowler": "player_id"
}
```

#### PUT /api/matches/:id/display-view 🔒

Change the display view.

**Request Body:**
```json
{
  "view": "player-stats"
}
```

#### DELETE /api/matches/:id 🔒

Delete a match (only upcoming matches with no balls recorded).

### 5.6 Scoring Endpoints

All scoring endpoints require authentication.

#### POST /api/matches/:id/ball 🔒

Record a ball delivery.

**Request Body (Normal delivery):**
```json
{
  "runs": 4
}
```

**Request Body (Wide):**
```json
{
  "runs": 0,
  "extra": {
    "type": "wide",
    "runs": 1
  }
}
```

**Request Body (Wicket - Caught):**
```json
{
  "runs": 0,
  "wicket": {
    "type": "caught",
    "dismissedPlayer": "player_id",
    "fielder": "player_id"
  },
  "newBatsman": "player_id"
}
```

**Request Body (Wicket - Run out on non-striker end):**
```json
{
  "runs": 1,
  "wicket": {
    "type": "run-out",
    "dismissedPlayer": "non_striker_player_id",
    "fielder": "player_id"
  },
  "newBatsman": "player_id"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "ball": { /* ball document */ },
    "innings": { /* updated innings state */ },
    "isOverComplete": false,
    "isInningsComplete": false
  }
}
```

#### DELETE /api/matches/:id/ball/last 🔒

Undo the last ball. Returns error if no balls to undo.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "removedBall": { /* removed ball document */ },
    "innings": { /* reverted innings state */ }
  }
}
```

#### PUT /api/matches/:id/batsmen 🔒

Swap or change batsmen.

**Request Body (Swap):**
```json
{
  "action": "swap"
}
```

**Request Body (Replace retired/injured batsman):**
```json
{
  "action": "replace",
  "position": "striker",
  "newBatsman": "player_id",
  "reason": "retired-hurt"
}
```

#### PUT /api/matches/:id/bowler 🔒

Change current bowler.

**Request Body:**
```json
{
  "bowler": "player_id"
}
```

**Validation:**
- Cannot bowl consecutive overs
- Must be from playing XI

#### POST /api/matches/:id/end-innings 🔒

End current innings early (declaration or rain).

**Request Body:**
```json
{
  "reason": "declaration"
}
```

#### POST /api/matches/:id/start-second-innings 🔒

Start second innings.

**Request Body:**
```json
{
  "openingBatsmen": {
    "striker": "player_id",
    "nonStriker": "player_id"
  },
  "openingBowler": "player_id"
}
```

#### POST /api/matches/:id/end-match 🔒

End the match and calculate result.

### 5.7 Live Data Endpoint

#### GET /api/matches/:id/live

Server-Sent Events stream for real-time updates.

**Event Types:**

```
event: score-update
data: {"innings": {...}, "lastBall": {...}}

event: wicket
data: {"dismissal": {...}, "innings": {...}}

event: over-complete
data: {"overSummary": {...}, "innings": {...}}

event: innings-complete
data: {"innings": {...}, "result": null}

event: match-complete
data: {"result": {...}}

event: view-change
data: {"view": "player-stats"}
```

---

## 6. Scoring Engine

### 6.1 Overview

The scoring engine is the heart of the application. It handles all ball-by-ball processing and automatically manages complex cricket rules.

### 6.2 Ball Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    BALL RECORDING FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. VALIDATE                                                 │
│     ├── Is match live?                                       │
│     ├── Is innings in progress?                              │
│     ├── Are both batsmen set?                                │
│     └── Is bowler set?                                       │
│                                                              │
│  2. CALCULATE OVER/BALL                                      │
│     ├── If legal delivery: increment ball count              │
│     └── If wide/no-ball: don't increment legal balls         │
│                                                              │
│  3. UPDATE BATSMAN STATS                                     │
│     ├── Add runs (except byes/leg-byes)                      │
│     ├── Increment balls faced (except wides)                 │
│     ├── Track fours (runs === 4 && not extra)               │
│     └── Track sixes (runs === 6 && not extra)               │
│                                                              │
│  4. UPDATE BOWLER STATS                                      │
│     ├── Add runs conceded (except byes/leg-byes)             │
│     ├── Increment balls (if legal delivery)                  │
│     ├── Track wides/no-balls separately                      │
│     └── Track dot balls (totalRuns === 0 && legal)          │
│                                                              │
│  5. UPDATE INNINGS TOTALS                                    │
│     ├── Add total runs                                       │
│     ├── Update extras breakdown                              │
│     └── Increment total balls (if legal)                     │
│                                                              │
│  6. HANDLE STRIKE ROTATION                                   │
│     ├── Odd runs: swap striker/non-striker                   │
│     └── End of over: swap striker/non-striker                │
│                                                              │
│  7. HANDLE WICKET (if applicable)                            │
│     ├── Mark batsman as out                                  │
│     ├── Record dismissal details                             │
│     ├── Add to fall of wickets                               │
│     ├── Increment total wickets                              │
│     ├── Set new batsman                                      │
│     └── Award wicket to bowler (if applicable)               │
│                                                              │
│  8. CHECK OVER COMPLETION                                    │
│     ├── If 6 legal balls: mark over complete                 │
│     ├── Check for maiden (0 runs off bat in over)           │
│     ├── Save last bowler                                     │
│     └── Clear current over array                             │
│                                                              │
│  9. CHECK INNINGS END CONDITIONS                             │
│     ├── 10 wickets fallen                                    │
│     ├── Overs complete (120 balls T20, 300 balls ODI)       │
│     └── Target achieved (2nd innings)                        │
│                                                              │
│  10. BROADCAST UPDATE via SSE                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Strike Rotation Rules

| Scenario | Action |
|----------|--------|
| Odd runs (1, 3, 5) | Swap striker and non-striker |
| Even runs (0, 2, 4, 6) | No change |
| End of over | Swap striker and non-striker |
| Wicket (non-striker run out) | New batsman becomes non-striker |
| Wicket (striker out) | New batsman becomes striker |

### 6.4 Extra Runs Handling

| Extra Type | Runs to Team | Runs to Batsman | Balls to Batsman | Balls to Bowler | Runs to Bowler |
|------------|--------------|-----------------|------------------|-----------------|----------------|
| Wide | Yes (+1 + any runs) | No | No | No | Yes |
| No-ball | Yes (+1 + any runs) | Yes (if off bat) | Yes | No | Yes |
| Bye | Yes | No | Yes | Yes | No |
| Leg-bye | Yes | No | Yes | Yes | No |

### 6.5 Wicket Types and Credits

| Wicket Type | Bowler Gets Wicket | Requires Fielder |
|-------------|-------------------|------------------|
| Bowled | Yes | No |
| Caught | Yes | Yes (can be bowler) |
| LBW | Yes | No |
| Stumped | Yes | Yes (wicket-keeper) |
| Hit-wicket | Yes | No |
| Run-out | No | Yes |

### 6.6 Calculations

#### Strike Rate (Batsman)
```
strikeRate = (runs / ballsFaced) × 100
```

#### Economy Rate (Bowler)
```
economyRate = runsConceded / oversBoled
// Where oversBoled = completedOvers + (ballsInCurrentOver / 6)
```

#### Current Run Rate
```
currentRunRate = totalRuns / oversBowled
```

#### Required Run Rate (2nd Innings)
```
runsNeeded = target - currentScore
oversRemaining = totalOvers - oversBowled
requiredRunRate = runsNeeded / oversRemaining
```

#### Overs Display Format
```
oversDisplay = Math.floor(totalBalls / 6) + "." + (totalBalls % 6)
// Example: 73 balls = "12.1"
```

### 6.7 Win Projection (Simple Algorithm)

```javascript
function calculateWinProbability(match) {
  const innings = match.innings[1]; // Second innings
  const target = match.innings[0].totalRuns + 1;
  const runsNeeded = target - innings.totalRuns;
  const ballsRemaining = getMaxBalls(match.format) - innings.totalBalls;
  const wicketsInHand = 10 - innings.totalWickets;
  
  // Base probability from run rate comparison
  const requiredRunRate = (runsNeeded / ballsRemaining) * 6;
  const currentRunRate = (innings.totalRuns / innings.totalBalls) * 6;
  
  let probability = 50; // Start at 50%
  
  // Adjust for run rate
  const runRateDiff = currentRunRate - requiredRunRate;
  probability += runRateDiff * 10; // +/- 10% per run rate difference
  
  // Adjust for wickets in hand
  probability += (wicketsInHand - 5) * 5; // +/- 5% per wicket from average
  
  // Adjust for balls remaining
  const ballsFactor = ballsRemaining / getMaxBalls(match.format);
  probability = probability * (0.5 + ballsFactor * 0.5);
  
  // Clamp between 5% and 95%
  return Math.max(5, Math.min(95, probability));
}
```

---

## 7. Admin View

### 7.1 Module Structure

```
admin/
├── admin-routing.module.ts
├── admin.module.ts
├── components/
│   ├── admin-layout/
│   │   ├── admin-layout.component.ts
│   │   ├── admin-layout.component.html
│   │   └── sidebar/
│   └── header/
├── pages/
│   ├── login/
│   ├── dashboard/
│   ├── countries/
│   │   ├── country-list/
│   │   └── country-form/
│   ├── players/
│   │   ├── player-list/
│   │   └── player-form/
│   └── matches/
│       ├── match-list/
│       ├── match-create/
│       ├── squad-selection/
│       ├── toss-entry/
│       ├── live-scoring/
│       └── display-control/
└── services/
    └── admin.service.ts
```

### 7.2 Page Specifications

#### 7.2.1 Login Page

Simple login form with username and password fields. Stores JWT in localStorage on successful login.

#### 7.2.2 Dashboard

- Quick stats: Total countries, players, matches
- Live matches list with quick access to scoring
- Recent completed matches
- Upcoming matches

#### 7.2.3 Countries Management

- List view with search
- Add/Edit modal or separate page
- Delete with confirmation (blocked if has players)

#### 7.2.4 Players Management

- List view with country filter and search
- Role filter tabs
- Add/Edit form with country dropdown
- Bulk import (future enhancement)

#### 7.2.5 Match Setup Flow

```
1. Create Match
   └── Select teams, format, venue, date
   
2. Squad Selection
   ├── Select 15-18 players per team from country roster
   └── Mark 11 as playing XI with batting order
   
3. Toss Entry
   ├── Select toss winner
   └── Select decision (bat/bowl)
   
4. Start Match
   ├── Select opening batsmen (striker, non-striker)
   └── Select opening bowler
```

#### 7.2.6 Live Scoring Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  INDIA vs AUSTRALIA                                                  │
│  T20 Match • Mumbai                                    [End Match]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INNINGS 1 of 2                                                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  INDIA                                                       │   │
│  │  145/3 (16.2 overs)                                         │   │
│  │                                                              │   │
│  │  CRR: 8.87                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │  BATTING                 │  │  BOWLING                 │        │
│  │                          │  │                          │        │
│  │  * V Kohli    67 (45)   │  │  M Starc                 │        │
│  │    SR: 148.89           │  │  3.2 - 0 - 34 - 2        │        │
│  │                          │  │  Econ: 10.20             │        │
│  │    R Pant     23 (18)   │  │                          │        │
│  │    SR: 127.78           │  │  [Change Bowler]         │        │
│  │                          │  │                          │        │
│  │  [Swap Batsmen]          │  │                          │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                      │
│  THIS OVER: • 1 4 W •                                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     SCORING BUTTONS                          │   │
│  │                                                              │   │
│  │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │   │
│  │   │  0  │ │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │  │   │
│  │   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │   │
│  │                                                              │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │   │  WIDE   │ │ NO BALL │ │   BYE   │ │ LEG BYE │          │   │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│  │                                                              │   │
│  │   ┌───────────────────┐                                     │   │
│  │   │      WICKET       │                                     │   │
│  │   └───────────────────┘                                     │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────┐  ┌─────────────────────────────────────────────┐  │
│  │ UNDO LAST   │  │ Display: ○Score ○Stats ○Summary ○Projection │  │
│  └─────────────┘  └─────────────────────────────────────────────┘  │
│                                                                      │
│  [End Innings]                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 7.2.7 Wicket Recording Modal

```
┌─────────────────────────────────────────┐
│           RECORD WICKET                  │
├─────────────────────────────────────────┤
│                                          │
│  Dismissal Type:                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Bowled  │ │ Caught  │ │   LBW   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ Run Out │ │ Stumped │ │Hit Wicket │ │
│  └─────────┘ └─────────┘ └───────────┘ │
│                                          │
│  Who is out? (for run-out)              │
│  ○ V Kohli (striker)                    │
│  ○ R Pant (non-striker)                 │
│                                          │
│  Fielder: [Dropdown - M Starc     ▼]    │
│                                          │
│  New Batsman: [Dropdown - S Iyer  ▼]    │
│                                          │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   Cancel    │  │   Confirm   │       │
│  └─────────────┘  └─────────────┘       │
│                                          │
└─────────────────────────────────────────┘
```

---

## 8. Display UI View

### 8.1 Module Structure

```
display/
├── display-routing.module.ts
├── display.module.ts
├── components/
│   ├── display-container/          # Main wrapper with SSE connection
│   ├── score-summary/              # Main scoreboard view
│   ├── player-stats/               # Batting & bowling cards
│   ├── overall-summary/            # Both innings comparison
│   ├── projections/                # Win probability & charts
│   └── shared/
│       ├── team-score-card/
│       ├── batsman-card/
│       ├── bowler-card/
│       └── over-display/
└── services/
    └── live-data.service.ts        # SSE connection management
```

### 8.2 View Specifications

#### 8.2.1 Score Summary View

Primary view showing current match state.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                        INDIA vs AUSTRALIA                            │
│                          T20 • Mumbai                                │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                            ┌───────┐                                 │
│                            │ INDIA │                                 │
│                            └───────┘                                 │
│                                                                      │
│                          145 / 3                                     │
│                         (16.2 overs)                                 │
│                                                                      │
│                      CRR: 8.87  |  RRR: 10.23                       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────┐    ┌─────────────────────────┐       │
│   │  V Kohli*       67(45)  │    │  M Starc                │       │
│   │  4x4  2x6   SR: 148.89  │    │  3.2-0-34-2            │       │
│   ├─────────────────────────┤    │  Econ: 10.20            │       │
│   │  R Pant         23(18)  │    │                         │       │
│   │  2x4  1x6   SR: 127.78  │    │                         │       │
│   └─────────────────────────┘    └─────────────────────────┘       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   THIS OVER    │ • │ 1 │ 4 │ W │ • │   │                            │
│                                                                      │
│   LAST OVER    │ 1 │ 2 │ • │ 4 │ 1 │ 1 │  = 9 runs                  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Partnership: 45 runs (32 balls)                                   │
│   Last wicket: KL Rahul c Carey b Cummins 34(28)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 8.2.2 Player Stats View

Detailed batting and bowling statistics.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PLAYER STATISTICS                            │
├──────────────────────────────┬──────────────────────────────────────┤
│         BATTING              │            BOWLING                    │
├──────────────────────────────┼──────────────────────────────────────┤
│                              │                                       │
│  V Kohli*      67  45  6  2  │  M Starc     3.2  0  34  2  10.20   │
│  R Pant        23  18  2  1  │  P Cummins   4    0  28  1   7.00   │
│  KL Rahul   c  34  28  4  1  │  A Zampa     4    0  32  0   8.00   │
│  R Sharma   b  12  10  2  0  │  G Maxwell   3    0  24  0   8.00   │
│  H Pandya      DNB           │  M Marsh     2    0  22  0  11.00   │
│  R Jadeja      DNB           │                                       │
│  ...                         │                                       │
│                              │                                       │
│  Extras: 9 (W 4, NB 2, B 3)  │                                       │
│                              │                                       │
│  TOTAL: 145/3 (16.2 ov)      │                                       │
│                              │                                       │
├──────────────────────────────┴──────────────────────────────────────┤
│                         FALL OF WICKETS                              │
│  1-23 (R Sharma, 3.2)  2-67 (KL Rahul, 9.4)  3-100 (?, 12.1)       │
└─────────────────────────────────────────────────────────────────────┘
```

#### 8.2.3 Overall Summary View

Both innings comparison (shown after match or during second innings).

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MATCH SUMMARY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AUSTRALIA - 1st Innings                                            │
│  ─────────────────────────                                          │
│  178/6 (20 overs)                                                   │
│                                                                      │
│  Top Scorer: D Warner 67(41)                                        │
│  Best Bowler: J Bumrah 4-0-24-3                                     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INDIA - 2nd Innings (Target: 179)                                  │
│  ─────────────────────────────────                                  │
│  145/3 (16.2 overs)                                                 │
│                                                                      │
│  Need 34 runs from 22 balls                                         │
│  Required Rate: 9.27                                                │
│                                                                      │
│  Top Scorer: V Kohli 67*(45)                                        │
│  Best Bowler: M Starc 3.2-0-34-2                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 8.2.4 Projections View

Win probability and run rate analysis.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       WIN PROJECTION                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│     INDIA                                    AUSTRALIA               │
│                                                                      │
│      62%  ████████████░░░░░░░░  38%                                 │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                       RUN RATE COMPARISON                            │
│                                                                      │
│   12 ┤                                                               │
│   10 ┤          ╭───╮     RRR                                       │
│    8 ┤    ╭─────╯   ╰───────────────                                │
│    6 ┤╭───╯                         CRR                             │
│    4 ┤                                                               │
│    2 ┤                                                               │
│    0 └──────────────────────────────────────                        │
│        0  2  4  6  8  10 12 14 16 18 20                             │
│                      OVERS                                           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PROJECTED SCORE: 172/5                                            │
│   Based on current run rate                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Real-time Update Behavior

- Score changes: Smooth number transition animation
- Wicket: Brief highlight animation
- Boundary: Flash effect on score
- View change: Fade transition between views
- Connection lost: Show reconnecting indicator

---

## 9. Real-time Updates

### 9.1 Server-Sent Events Implementation

#### Backend (Express)

```javascript
// routes/matches.js
router.get('/:id/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const matchId = req.params.id;
  
  // Add client to subscribers
  const clientId = addSubscriber(matchId, res);
  
  // Send initial state
  sendEvent(res, 'connected', { clientId });
  
  // Handle disconnect
  req.on('close', () => {
    removeSubscriber(matchId, clientId);
  });
});
```

#### Frontend (Angular Service)

```typescript
// services/live-data.service.ts
@Injectable({ providedIn: 'root' })
export class LiveDataService {
  private eventSource: EventSource | null = null;
  private matchData$ = new BehaviorSubject<MatchData | null>(null);
  
  connect(matchId: string): Observable<MatchData> {
    this.disconnect();
    
    this.eventSource = new EventSource(`/api/matches/${matchId}/live`);
    
    this.eventSource.addEventListener('score-update', (event) => {
      const data = JSON.parse(event.data);
      this.matchData$.next(data);
    });
    
    // Handle other event types...
    
    return this.matchData$.asObservable();
  }
  
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
```

### 9.2 Event Types

| Event | Trigger | Data |
|-------|---------|------|
| `connected` | Client connects | `{ clientId }` |
| `score-update` | Any ball recorded | Full innings state |
| `wicket` | Wicket falls | Dismissal details + innings |
| `over-complete` | Over ends | Over summary + innings |
| `innings-complete` | Innings ends | Full innings summary |
| `match-complete` | Match ends | Result details |
| `view-change` | Admin changes display | New view name |
| `batsmen-change` | Batsmen swapped/changed | Current batsmen |
| `bowler-change` | Bowler changed | Current bowler |

---

## 10. Authentication

### 10.1 Configuration

```javascript
// config/index.js
module.exports = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'cricket123'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '24h'
  }
};
```

### 10.2 JWT Structure

```javascript
{
  "sub": "admin",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### 10.3 Auth Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};
```

### 10.4 Frontend Auth Guard

```typescript
// guards/auth.guard.ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    
    this.router.navigate(['/admin/login']);
    return false;
  }
}
```

---

## 11. Docker Configuration

### 11.1 Dockerfile

```dockerfile
# Stage 1: Build Angular frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build --prod

# Stage 2: Build Express backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-build /app/backend ./

# Copy frontend build to backend's public folder
COPY --from=frontend-build /app/frontend/dist/livecricket ./public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "src/app.js"]
```

### 11.2 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: livecricket-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/livecricket
      - JWT_SECRET=${JWT_SECRET:-change-this-secret}
      - ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-cricket123}
    depends_on:
      mongo:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - livecricket-network

  mongo:
    image: mongo:7
    container_name: livecricket-mongo
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - livecricket-network

volumes:
  mongo_data:

networks:
  livecricket-network:
    driver: bridge
```

### 11.3 .env.example

```env
# Application
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb://mongo:27017/livecricket

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Optional
LOG_LEVEL=info
```

### 11.4 Running the Application

```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 12. Implementation Phases

### Phase 1: Project Setup & Foundation

**Duration**: Foundation phase

**Tasks**:
1. Initialize Express.js project with folder structure
2. Set up MongoDB connection with Mongoose
3. Create all Mongoose models (Country, Player, Match, Ball)
4. Set up configuration management
5. Create base Express app with middleware
6. Initialize Angular project
7. Configure Tailwind CSS
8. Set up project for Docker

**Deliverables**:
- Working Express server with MongoDB connection
- All Mongoose models defined
- Angular project with Tailwind configured
- Basic Dockerfile and docker-compose.yml

---

### Phase 2: Authentication & Basic CRUD

**Duration**: Low effort

**Tasks**:
1. Implement JWT authentication
2. Create auth middleware
3. Build login endpoint
4. Create Country CRUD endpoints
5. Create Player CRUD endpoints
6. Add input validation

**Deliverables**:
- Working authentication system
- Country and Player APIs fully functional
- Input validation on all endpoints

---

### Phase 3: Match Management APIs

**Duration**: Medium effort

**Tasks**:
1. Create Match CRUD endpoints
2. Implement squad selection endpoint
3. Build toss recording endpoint
4. Create match start endpoint
5. Implement display view control endpoint

**Deliverables**:
- Complete match lifecycle management
- Squad selection working
- Match initialization working

---

### Phase 4: Scoring Engine

**Duration**: High effort (core logic)

**Tasks**:
1. Build scoring engine service
2. Implement ball recording logic
3. Handle all extra types (wide, no-ball, bye, leg-bye)
4. Implement wicket recording with all dismissal types
5. Build strike rotation logic
6. Implement over completion handling
7. Build innings completion detection
8. Create undo functionality
9. Implement statistics calculations

**Deliverables**:
- Fully functional scoring engine
- All cricket rules properly implemented
- Undo capability working

---

### Phase 5: Real-time Updates

**Duration**: Low effort

**Tasks**:
1. Implement SSE endpoint
2. Create subscriber management
3. Build event broadcasting system
4. Handle client disconnection

**Deliverables**:
- Working SSE connection
- Real-time updates broadcasting

---

### Phase 6: Angular Setup & Admin Shell

**Duration**: Medium effort

**Tasks**:
1. Set up Angular routing
2. Create admin module with lazy loading
3. Build admin layout component
4. Implement authentication service
5. Create auth guard
6. Build HTTP interceptor for JWT
7. Create login page

**Deliverables**:
- Angular app structure complete
- Authentication flow working
- Admin layout with navigation

---

### Phase 7: Admin - Countries & Players

**Duration**: Low effort

**Tasks**:
1. Build country list component
2. Create country form component
3. Build player list component with filters
4. Create player form component
5. Implement delete confirmations

**Deliverables**:
- Countries management fully functional
- Players management fully functional

---

### Phase 8: Admin - Match Setup

**Duration**: Medium effort

**Tasks**:
1. Build match list component
2. Create match creation form
3. Build squad selection interface
4. Create toss entry component
5. Build match start flow

**Deliverables**:
- Complete match setup flow
- Squad selection working
- Match can be started

---

### Phase 9: Admin - Live Scoring

**Duration**: High effort

**Tasks**:
1. Build live scoring layout
2. Create scoring buttons component
3. Implement wicket modal
4. Build batsman change interface
5. Create bowler change interface
6. Implement undo button
7. Build display view selector
8. Create end innings/match buttons
9. Handle all edge cases

**Deliverables**:
- Fully functional scoring interface
- All scoring scenarios handled
- Display control working

---

### Phase 10: Display UI

**Duration**: Medium effort

**Tasks**:
1. Create display module
2. Build SSE connection service
3. Create score summary view
4. Build player stats view
5. Create overall summary view
6. Build projections view
7. Implement view transitions
8. Add animations

**Deliverables**:
- All four display views working
- Real-time updates displaying
- Smooth animations

---

### Phase 11: Docker Configuration

**Duration**: Low effort

**Tasks**:
1. Finalize Dockerfile
2. Test multi-stage build
3. Configure docker-compose
4. Test full deployment
5. Document deployment process

**Deliverables**:
- Working Docker deployment
- Documentation complete

---

### Phase 12: Testing & Polish

**Duration**: Medium effort

**Tasks**:
1. Test all scoring scenarios
2. Test edge cases (super over, tie, etc.)
3. Fix bugs
4. Optimize performance
5. Add loading states
6. Improve error handling
7. Final UI polish

**Deliverables**:
- Stable, tested application
- Good UX with proper feedback
- Production-ready code

---

## Appendix A: Cricket Rules Reference

### A.1 Overs

- T20: Maximum 20 overs per innings (120 legal deliveries)
- ODI: Maximum 50 overs per innings (300 legal deliveries)
- Each over consists of 6 legal deliveries
- Wides and no-balls are not counted as legal deliveries

### A.2 Innings End Conditions

1. All 10 wickets fallen
2. Maximum overs bowled
3. Target achieved (2nd innings)
4. Declaration (rare in limited overs)

### A.3 Dismissal Types

| Type | Description | Bowler Gets Credit |
|------|-------------|-------------------|
| Bowled | Ball hits stumps | Yes |
| Caught | Ball caught before bouncing | Yes |
| LBW | Leg Before Wicket | Yes |
| Run Out | Batsman short of crease while running | No |
| Stumped | Keeper removes bails while batsman out of crease | Yes |
| Hit Wicket | Batsman hits own stumps | Yes |

### A.4 Extras

| Type | Runs | Re-bowl | Counts as Ball Faced |
|------|------|---------|---------------------|
| Wide | 1+ | Yes | No |
| No Ball | 1+ | Yes | Yes (if runs scored) |
| Bye | Runs taken | No | Yes |
| Leg Bye | Runs taken | No | Yes |

---

## Appendix B: API Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not allowed to perform action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Server error |

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| CRR | Current Run Rate |
| RRR | Required Run Rate |
| SR | Strike Rate |
| Econ | Economy Rate |
| DNB | Did Not Bat |
| Playing XI | 11 players selected to play |
| Powerplay | Fielding restriction overs |
| Maiden | Over with no runs scored |
| Duck | Batsman out for 0 runs |

---

*Document Version: 1.0*
*Last Updated: 2024*
