/**
 * ESPN Mock Service
 * 
 * Provides mock ESPN data for testing without requiring live matches.
 * Supports multiple scenarios for testing different match states.
 * 
 * Environment Variables:
 *   ESPN_MOCK_ENABLED=true     - Enable mock mode
 *   ESPN_MOCK_SCENARIO=live    - Default scenario
 * 
 * Scenarios:
 *   - start: Match not started (squads only, no scorecard)
 *   - live-1: First innings in progress (13.2 overs)
 *   - live-2: Second innings in progress (6.0 overs)
 *   - completed: Full completed match
 */

const fs = require('fs');
const path = require('path');

// Mock configuration
const MOCK_DATA_DIR = path.join(__dirname, 'data');

// Base match data (loaded from file or defaults)
let baseMatchData = null;

/**
 * Load mock data from JSON file
 */
function loadMockData(filename) {
  const filePath = path.join(MOCK_DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

/**
 * Save mock data to JSON file
 */
function saveMockData(filename, data) {
  const filePath = path.join(MOCK_DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Get list of available mock scenarios
 */
function getAvailableMocks() {
  return [
    { id: 'start', name: 'Match Not Started', description: 'Squads announced, match not begun' },
    { id: 'live-1', name: 'Live - 1st Innings', description: '1st innings at 13.2 overs' },
    { id: 'live-2', name: 'Live - 2nd Innings', description: '2nd innings at 6.0 overs, chasing target' },
    { id: 'completed', name: 'Completed Match', description: 'Full completed match with all data' }
  ];
}

/**
 * Get current scenario from environment
 */
function getCurrentScenario() {
  return process.env.ESPN_MOCK_SCENARIO || 'completed';
}

/**
 * Load base match data from completed match file
 */
function getBaseMatchData() {
  if (!baseMatchData) {
    baseMatchData = loadMockData('direct-preview.json');
  }
  return baseMatchData;
}

/**
 * Generate mock preview-match-creation response
 * This is for creating a new match from ESPN - always returns full squads
 */
function generatePreviewMatchCreation(options = {}) {
  const mockData = loadMockData('preview-match-creation.json');
  if (mockData) {
    return mockData;
  }
  
  // Fallback to default mock
  return {
    success: true,
    data: {
      matchInfo: {
        title: "Mock T20I",
        seriesName: "Mock Series 2025",
        date: new Date().toISOString(),
        venue: "Mock Stadium",
        format: "t20",
        gender: "women",
        matchNumber: 1
      },
      espnUrl: "https://mock.espncricinfo.com/match-squads",
      scorecardUrl: "https://mock.espncricinfo.com/full-scorecard",
      teamMapping: [],
      unmatchedPlayers: []
    },
    fetchMethod: 'mock'
  };
}

/**
 * Generate mock direct-preview response based on scenario
 */
function generateDirectPreview(matchId, options = {}) {
  const scenario = options.scenario || getCurrentScenario();
  console.log(`[MOCK] Generating direct-preview for scenario: ${scenario}`);
  
  switch (scenario) {
    case 'start':
      return generateStartScenario(matchId);
    case 'live-1':
    case 'live':  // 'live' defaults to live-1
      return generateLiveInnings1Scenario(matchId);
    case 'live-2':
      return generateLiveInnings2Scenario(matchId);
    case 'completed':
    default:
      return generateCompletedScenario(matchId);
  }
}

/**
 * Scenario: Match Not Started
 * - Squads available
 * - No innings data
 * - Match status: "Match starts at..."
 */
function generateStartScenario(matchId) {
  const base = getBaseMatchData();
  
  return {
    success: true,
    data: {
      matchId: matchId,
      espnUrl: "https://mock.espncricinfo.com/full-scorecard",
      matchStatus: "Match starts at 7:00 PM IST",
      target: null,
      teamMapping: base?.data?.teamMapping || { matched: true, mapping: {} },
      innings: [],  // No innings data yet
      ballByBallAvailable: false,
      _mock: true,
      _scenario: 'start'
    },
    fetchMethod: 'mock'
  };
}

/**
 * Scenario: Live - 1st Innings at 13.2 overs
 * - Sri Lanka Women batting
 * - Score: 89/5 (13.2 ov)
 * - Current batters and bowler set
 */
function generateLiveInnings1Scenario(matchId) {
  const base = getBaseMatchData();
  if (!base?.data?.innings?.[0]) {
    return generateStartScenario(matchId);
  }
  
  const fullInnings1 = base.data.innings[0];
  
  // Create partial batting - only batters who would have batted by 13.2 overs
  // Typically 5-6 batters in 13 overs with 5 wickets fallen
  const partialBatting = fullInnings1.batting.slice(0, 6).map((bat, idx) => {
    if (idx < 4) {
      // First 4 batters - out
      return { ...bat };
    } else if (idx === 4) {
      // Striker - not out, reduced stats
      return {
        ...bat,
        espnStats: {
          ...bat.espnStats,
          runs: 23,
          balls: 18,
          fours: 2,
          sixes: 1,
          isNotOut: true,
          dismissal: null
        }
      };
    } else {
      // Non-striker - not out, reduced stats
      return {
        ...bat,
        espnStats: {
          ...bat.espnStats,
          runs: 12,
          balls: 14,
          fours: 1,
          sixes: 0,
          isNotOut: true,
          dismissal: null
        }
      };
    }
  });
  
  // Partial bowling - bowlers who have bowled
  const partialBowling = fullInnings1.bowling.slice(0, 4).map((bowl, idx) => ({
    ...bowl,
    espnStats: {
      ...bowl.espnStats,
      overs: idx === 0 ? 3 : idx === 1 ? 4 : idx === 2 ? 3.2 : 3,
      maidens: idx === 1 ? 1 : 0,
      runs: Math.floor(bowl.espnStats.runs * 0.6),
      wickets: Math.min(bowl.espnStats.wickets, idx === 0 ? 2 : 1)
    }
  }));
  
  const innings1 = {
    ...fullInnings1,
    total: { runs: 89, wickets: 5 },
    overs: "13.2",
    isCurrent: true,
    batting: partialBatting,
    bowling: partialBowling,
    extras: {
      total: 8,
      byes: 1,
      legByes: 2,
      wides: 4,
      noBalls: 1
    },
    striker: {
      espnName: partialBatting[4]?.espnName || "Batter 5",
      runs: 23,
      balls: 18,
      matchedPlayer: partialBatting[4]?.matchedPlayer
    },
    nonStriker: {
      espnName: partialBatting[5]?.espnName || "Batter 6",
      runs: 12,
      balls: 14,
      matchedPlayer: partialBatting[5]?.matchedPlayer
    },
    currentBowler: {
      espnName: partialBowling[2]?.espnName || "Bowler 3",
      overs: 3.2,
      runs: 24,
      wickets: 1,
      matchedPlayer: partialBowling[2]?.matchedPlayer
    }
  };
  
  return {
    success: true,
    data: {
      matchId: matchId,
      espnUrl: "https://mock.espncricinfo.com/full-scorecard",
      matchStatus: "Sri Lanka Women 89/5 (13.2 ov)",
      target: null,
      teamMapping: base.data.teamMapping,
      innings: [innings1],
      ballByBallAvailable: true,
      currentPlayers: {
        striker: innings1.striker,
        nonStriker: innings1.nonStriker,
        bowler: innings1.currentBowler
      },
      _mock: true,
      _scenario: 'live-1'
    },
    fetchMethod: 'mock'
  };
}

/**
 * Scenario: Live - 2nd Innings at 6.0 overs
 * - India Women batting, chasing 113
 * - Score: 58/1 (6.0 ov)
 * - 1st innings complete
 */
function generateLiveInnings2Scenario(matchId) {
  const base = getBaseMatchData();
  if (!base?.data?.innings) {
    return generateStartScenario(matchId);
  }
  
  // Full first innings (completed)
  const innings1 = base.data.innings[0];
  
  // Partial second innings
  const fullInnings2 = base.data.innings[1];
  
  // Only 2 batters so far (1 out, 1 in)
  const partialBatting = fullInnings2.batting.slice(0, 2).map((bat, idx) => {
    if (idx === 0) {
      // First batter - out for 32
      return {
        ...bat,
        espnStats: {
          ...bat.espnStats,
          runs: 32,
          balls: 19,
          fours: 5,
          sixes: 1,
          isNotOut: false,
          dismissal: "c Chamari Athapaththu b Sugandika Kumari"
        }
      };
    } else {
      // Current striker - not out
      return {
        ...bat,
        espnStats: {
          ...bat.espnStats,
          runs: 18,
          balls: 14,
          fours: 2,
          sixes: 0,
          isNotOut: true,
          dismissal: null
        }
      };
    }
  });
  
  // Add third batter (non-striker)
  if (fullInnings2.batting[2]) {
    partialBatting.push({
      ...fullInnings2.batting[2],
      espnStats: {
        ...fullInnings2.batting[2].espnStats,
        runs: 5,
        balls: 3,
        fours: 1,
        sixes: 0,
        isNotOut: true,
        dismissal: null
      }
    });
  }
  
  // Partial bowling
  const partialBowling = fullInnings2.bowling.slice(0, 3).map((bowl, idx) => ({
    ...bowl,
    espnStats: {
      ...bowl.espnStats,
      overs: idx === 0 ? 2 : idx === 1 ? 2 : 2,
      maidens: 0,
      runs: idx === 0 ? 22 : idx === 1 ? 18 : 15,
      wickets: idx === 0 ? 1 : 0
    }
  }));
  
  const innings2 = {
    ...fullInnings2,
    total: { runs: 58, wickets: 1 },
    overs: "6.0",
    isCurrent: true,
    batting: partialBatting,
    bowling: partialBowling,
    extras: {
      total: 3,
      byes: 0,
      legByes: 1,
      wides: 2,
      noBalls: 0
    },
    striker: {
      espnName: partialBatting[1]?.espnName || "Batter 2",
      runs: 18,
      balls: 14,
      matchedPlayer: partialBatting[1]?.matchedPlayer
    },
    nonStriker: {
      espnName: partialBatting[2]?.espnName || "Batter 3",
      runs: 5,
      balls: 3,
      matchedPlayer: partialBatting[2]?.matchedPlayer
    },
    currentBowler: {
      espnName: partialBowling[2]?.espnName || "Bowler 3",
      overs: 2,
      runs: 15,
      wickets: 0,
      matchedPlayer: partialBowling[2]?.matchedPlayer
    }
  };
  
  // Mark first innings as not current
  const completedInnings1 = {
    ...innings1,
    isCurrent: false
  };
  
  return {
    success: true,
    data: {
      matchId: matchId,
      espnUrl: "https://mock.espncricinfo.com/full-scorecard",
      matchStatus: "India Women need 55 runs in 84 balls",
      target: 113,
      teamMapping: base.data.teamMapping,
      innings: [completedInnings1, innings2],
      ballByBallAvailable: true,
      currentPlayers: {
        striker: innings2.striker,
        nonStriker: innings2.nonStriker,
        bowler: innings2.currentBowler
      },
      _mock: true,
      _scenario: 'live-2'
    },
    fetchMethod: 'mock'
  };
}

/**
 * Scenario: Completed Match
 * - Full scorecard with both innings
 * - Result declared
 */
function generateCompletedScenario(matchId) {
  const base = getBaseMatchData();
  if (!base) {
    // Return minimal completed match if no data file
    return {
      success: true,
      data: {
        matchId: matchId,
        espnUrl: "https://mock.espncricinfo.com/full-scorecard",
        matchStatus: "India Women won by 8 wickets",
        target: 113,
        teamMapping: { matched: true, mapping: {} },
        innings: [],
        ballByBallAvailable: true,
        _mock: true,
        _scenario: 'completed'
      },
      fetchMethod: 'mock'
    };
  }
  
  // Return full data with matchId updated
  const data = JSON.parse(JSON.stringify(base.data));
  data.matchId = matchId;
  data._mock = true;
  data._scenario = 'completed';
  
  // Mark all innings as not current (match is over)
  if (data.innings) {
    data.innings.forEach(inn => {
      inn.isCurrent = false;
    });
  }
  
  return {
    success: true,
    data: data,
    fetchMethod: 'mock'
  };
}

/**
 * Generate mock squads data
 */
function generateSquadsData(options = {}) {
  const mockData = loadMockData('preview-match-creation.json');
  if (mockData?.data?.teamMapping) {
    return {
      success: true,
      data: {
        matchInfo: mockData.data.matchInfo,
        teams: mockData.data.teamMapping.map(tm => ({
          name: tm.espnTeam?.name,
          shortName: tm.espnTeam?.shortName,
          espnId: tm.espnTeam?.id,
          players: tm.players?.map(p => ({
            name: p.espnPlayer?.name,
            espnId: p.espnPlayer?.id,
            isCaptain: p.espnPlayer?.isCaptain,
            isKeeper: p.espnPlayer?.isKeeper,
            role: p.espnPlayer?.role
          })) || []
        }))
      },
      fetchMethod: 'mock'
    };
  }
  
  return {
    success: true,
    data: {
      matchInfo: { title: "Mock Match", format: "t20", gender: "women" },
      teams: []
    },
    fetchMethod: 'mock'
  };
}

/**
 * Generate mock full-sync response based on scenario
 */
function generateFullSyncResponse(matchId, scenario) {
  const currentScenario = scenario || getCurrentScenario();
  
  switch (currentScenario) {
    case 'start':
      return {
        success: true,
        message: '[MOCK] Match not started - no data to sync',
        data: {
          matchId: matchId,
          lastEspnSync: new Date(),
          stats: {
            ballsDeleted: 0,
            ballsCreated: 0,
            inningsSynced: 0,
            oversBuilt: 0,
            ballByBallAvailable: false
          },
          innings: [],
          _mock: true,
          _scenario: 'start'
        }
      };
      
    case 'live-1':
    case 'live':
      return {
        success: true,
        message: '[MOCK] 1st innings sync simulated',
        data: {
          matchId: matchId,
          lastEspnSync: new Date(),
          stats: {
            ballsDeleted: 0,
            ballsCreated: 80,
            inningsSynced: 1,
            oversBuilt: 13,
            ballByBallAvailable: true
          },
          innings: [
            {
              inningsNumber: 1,
              battingTeam: 'Sri Lanka Women',
              totalRuns: 89,
              totalWickets: 5,
              totalBalls: 80,
              overs: '13.2',
              status: 'in-progress',
              battingStatsCount: 6,
              bowlingStatsCount: 4,
              completedOvers: 13
            }
          ],
          _mock: true,
          _scenario: 'live-1'
        }
      };
      
    case 'live-2':
      return {
        success: true,
        message: '[MOCK] 2nd innings sync simulated',
        data: {
          matchId: matchId,
          lastEspnSync: new Date(),
          stats: {
            ballsDeleted: 0,
            ballsCreated: 156,
            inningsSynced: 2,
            oversBuilt: 26,
            ballByBallAvailable: true
          },
          innings: [
            {
              inningsNumber: 1,
              battingTeam: 'Sri Lanka Women',
              totalRuns: 112,
              totalWickets: 7,
              totalBalls: 120,
              overs: '20.0',
              status: 'completed',
              battingStatsCount: 8,
              bowlingStatsCount: 6,
              completedOvers: 20
            },
            {
              inningsNumber: 2,
              battingTeam: 'India Women',
              totalRuns: 58,
              totalWickets: 1,
              totalBalls: 36,
              overs: '6.0',
              status: 'in-progress',
              battingStatsCount: 3,
              bowlingStatsCount: 3,
              completedOvers: 6
            }
          ],
          _mock: true,
          _scenario: 'live-2'
        }
      };
      
    case 'completed':
    default:
      return {
        success: true,
        message: '[MOCK] Completed match sync simulated',
        data: {
          matchId: matchId,
          lastEspnSync: new Date(),
          stats: {
            ballsDeleted: 0,
            ballsCreated: 200,
            inningsSynced: 2,
            oversBuilt: 33,
            ballByBallAvailable: true
          },
          innings: [
            {
              inningsNumber: 1,
              battingTeam: 'Sri Lanka Women',
              totalRuns: 112,
              totalWickets: 7,
              totalBalls: 120,
              overs: '20.0',
              status: 'completed',
              battingStatsCount: 8,
              bowlingStatsCount: 6,
              completedOvers: 20
            },
            {
              inningsNumber: 2,
              battingTeam: 'India Women',
              totalRuns: 115,
              totalWickets: 2,
              totalBalls: 80,
              overs: '13.2',
              status: 'completed',
              battingStatsCount: 3,
              bowlingStatsCount: 4,
              completedOvers: 13
            }
          ],
          _mock: true,
          _scenario: 'completed'
        }
      };
  }
}

/**
 * Check if mock mode is enabled
 */
function isMockEnabled() {
  return process.env.ESPN_MOCK_ENABLED === 'true';
}

module.exports = {
  loadMockData,
  saveMockData,
  getAvailableMocks,
  getCurrentScenario,
  generatePreviewMatchCreation,
  generateDirectPreview,
  generateSquadsData,
  generateFullSyncResponse,
  isMockEnabled,
  MOCK_DATA_DIR
};
