/**
 * ESPN Data Routes
 * 
 * Provides endpoints for fetching cricket data from ESPN Cricinfo.
 * Admin can trigger these to populate or update match data.
 * 
 * Two methods available:
 * 1. URL Scraping (may be blocked by ESPN's bot detection)
 * 2. JSON Paste (reliable - admin pastes JSON from DevTools)
 */

const express = require('express');
const auth = require('../middleware/auth');
const espnScraper = require('../services/espnScraper');
const Match = require('../models/Match');
const Country = require('../models/Country');

const router = express.Router();

/**
 * POST /api/espn/fetch-match
 * Fetch live match data from ESPN Cricinfo URL
 */
router.post('/fetch-match', auth, async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'ESPN Cricinfo URL is required'
      });
    }

    if (!url.includes('espncricinfo.com') && !url.includes('cricinfo.com')) {
      return res.status(400).json({
        success: false,
        message: 'URL must be from espncricinfo.com'
      });
    }

    const result = await espnScraper.fetchLiveMatchData(url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        suggestion: result.suggestion || 'Try using the JSON paste method instead'
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/espn/parse-json
 * Parse ESPN JSON data that was manually copied from DevTools
 */
router.post('/parse-json', auth, async (req, res, next) => {
  try {
    let { json } = req.body;

    if (!json) {
      return res.status(400).json({
        success: false,
        message: 'JSON data is required'
      });
    }

    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format'
        });
      }
    }

    const result = parseEspnJson(json);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/espn/match/:matchId/preview
 * Fetch ESPN data and return preview with player matching for a specific match
 */
router.get('/match/:matchId/preview', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;

    // Get the match with populated teams and squads
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .populate('squads.team1.player', 'name')
      .populate('squads.team2.player', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (!match.espnUrl) {
      return res.status(400).json({
        success: false,
        message: 'ESPN URL not set for this match'
      });
    }

    // Fetch ESPN data
    const espnResult = await espnScraper.fetchLiveMatchData(match.espnUrl);

    if (!espnResult.success) {
      return res.status(400).json({
        success: false,
        message: espnResult.error,
        suggestion: espnResult.suggestion
      });
    }

    const espnData = espnResult.data;

    // Match ESPN teams to local teams
    const teamMapping = matchEspnTeamsToLocal(espnData, match);

    if (!teamMapping.matched) {
      return res.status(400).json({
        success: false,
        message: `Could not match ESPN teams to local teams. ESPN teams: ${Object.keys(espnData.teams).join(', ')}. Local teams: ${match.team1.name}, ${match.team2.name}`,
        espnTeams: Object.keys(espnData.teams),
        localTeams: [match.team1.name, match.team2.name]
      });
    }

    // Build preview with player matching
    const preview = {
      matchId: match._id,
      espnUrl: match.espnUrl,
      matchStatus: espnData.matchStatus,
      target: espnData.target,
      teamMapping: teamMapping,
      innings: []
    };

    // Process each ESPN innings
    for (const espnInnings of espnData.innings) {
      const localTeamInfo = teamMapping.mapping[espnInnings.team];
      
      if (!localTeamInfo) {
        console.warn(`Could not find local team for ESPN team: ${espnInnings.team}`);
        continue;
      }

      const localTeam = localTeamInfo.team;
      const squadKey = localTeamInfo.squadKey;
      const squad = match.squads[squadKey];
      const opposingSquadKey = squadKey === 'team1' ? 'team2' : 'team1';
      const opposingSquad = match.squads[opposingSquadKey];

      const inningsPreview = {
        espnTeam: espnInnings.team,
        localTeam: {
          _id: localTeam._id,
          name: localTeam.name
        },
        total: espnInnings.total,
        overs: espnInnings.overs,
        extras: espnInnings.extras,
        batting: [],
        bowling: []
      };

      // Match batsmen
      for (const espnBatsman of espnInnings.batting) {
        const playerMatch = matchPlayer(
          espnBatsman.name,
          squad,
          match.espnPlayerMappings,
          localTeam._id
        );

        inningsPreview.batting.push({
          espnName: espnBatsman.name,
          espnStats: {
            runs: espnBatsman.runs,
            balls: espnBatsman.balls,
            fours: espnBatsman.fours,
            sixes: espnBatsman.sixes,
            strikeRate: espnBatsman.strikeRate,
            isNotOut: espnBatsman.isNotOut,
            dismissal: espnBatsman.dismissal
          },
          matchedPlayer: playerMatch.player,
          matchType: playerMatch.type, // 'exact', 'normalized', 'fuzzy', 'manual', 'none'
          confidence: playerMatch.confidence,
          candidates: playerMatch.candidates // For manual selection when not matched
        });
      }

      // Match bowlers (from opposing team)
      for (const espnBowler of espnInnings.bowling) {
        const playerMatch = matchPlayer(
          espnBowler.name,
          opposingSquad,
          match.espnPlayerMappings,
          localTeamInfo.opposingTeamId
        );

        inningsPreview.bowling.push({
          espnName: espnBowler.name,
          espnStats: {
            overs: espnBowler.overs,
            maidens: espnBowler.maidens,
            runs: espnBowler.runs,
            wickets: espnBowler.wickets,
            economy: espnBowler.economy,
            dotBalls: espnBowler.dotBalls
          },
          matchedPlayer: playerMatch.player,
          matchType: playerMatch.type,
          confidence: playerMatch.confidence,
          candidates: playerMatch.candidates
        });
      }

      preview.innings.push(inningsPreview);
    }

    res.json({
      success: true,
      data: preview
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/espn/match/:matchId/sync
 * Apply ESPN data to match after admin confirmation
 */
router.post('/match/:matchId/sync', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerMappings, inningsData } = req.body;

    // playerMappings: { espnName: playerId, ... } - manual mappings from admin
    // inningsData: array of innings with matched players to sync

    const match = await Match.findById(matchId)
      .populate('team1', 'name')
      .populate('team2', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Save any new manual player mappings
    if (playerMappings && Object.keys(playerMappings).length > 0) {
      for (const [espnName, mapping] of Object.entries(playerMappings)) {
        // Check if mapping already exists
        const existingIndex = match.espnPlayerMappings.findIndex(
          m => m.espnName === espnName
        );

        if (existingIndex >= 0) {
          match.espnPlayerMappings[existingIndex].player = mapping.playerId;
          match.espnPlayerMappings[existingIndex].team = mapping.teamId;
        } else {
          match.espnPlayerMappings.push({
            espnName,
            player: mapping.playerId,
            team: mapping.teamId
          });
        }
      }
    }

    // Update each innings
    for (const syncInnings of inningsData) {
      const { localTeamId, batting, bowling, total, extras } = syncInnings;

      // Find matching innings in our match
      let matchInnings = match.innings.find(
        inn => inn.battingTeam.toString() === localTeamId
      );

      if (!matchInnings) {
        // Create new innings if doesn't exist
        const battingTeamIsTeam1 = match.team1._id.toString() === localTeamId;
        matchInnings = {
          battingTeam: localTeamId,
          bowlingTeam: battingTeamIsTeam1 ? match.team2._id : match.team1._id,
          inningsNumber: match.innings.length + 1,
          totalRuns: 0,
          totalWickets: 0,
          totalBalls: 0,
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          status: 'not-started',
          battingStats: [],
          bowlingStats: []
        };
        match.innings.push(matchInnings);
        matchInnings = match.innings[match.innings.length - 1];
      }

      // Update totals
      if (total) {
        matchInnings.totalRuns = total.runs;
        matchInnings.totalWickets = total.wickets;
        
        // Calculate total balls from overs if available
        if (syncInnings.overs) {
          const oversMatch = syncInnings.overs.match(/(\d+)(?:\.(\d))?/);
          if (oversMatch) {
            const overs = parseInt(oversMatch[1], 10) || 0;
            const balls = parseInt(oversMatch[2], 10) || 0;
            matchInnings.totalBalls = (overs * 6) + balls;
          }
        }
      }

      // Update extras
      if (extras) {
        // Parse extras breakdown if it's a string
        if (extras.breakdown) {
          const parsed = espnScraper.parseExtras(extras.breakdown);
          matchInnings.extras.wides = parsed.wides;
          matchInnings.extras.noBalls = parsed.noBalls;
          matchInnings.extras.byes = parsed.byes;
          matchInnings.extras.legByes = parsed.legByes;
        } else if (typeof extras === 'object') {
          matchInnings.extras.wides = extras.wides || 0;
          matchInnings.extras.noBalls = extras.noBalls || 0;
          matchInnings.extras.byes = extras.byes || 0;
          matchInnings.extras.legByes = extras.legByes || 0;
        }
      }

      // Update batting stats
      for (const batSync of batting) {
        if (!batSync.playerId) continue; // Skip unmatched

        let batStats = matchInnings.battingStats.find(
          bs => bs.player.toString() === batSync.playerId
        );

        if (!batStats) {
          batStats = {
            player: batSync.playerId,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            isNotOut: false,
            position: matchInnings.battingStats.length + 1
          };
          matchInnings.battingStats.push(batStats);
          batStats = matchInnings.battingStats[matchInnings.battingStats.length - 1];
        }

        // Update only changed values
        batStats.runs = batSync.runs;
        batStats.balls = batSync.balls;
        batStats.fours = batSync.fours;
        batStats.sixes = batSync.sixes;
        batStats.isOut = !batSync.isNotOut;
        batStats.isNotOut = batSync.isNotOut;
      }

      // Update bowling stats
      for (const bowlSync of bowling) {
        if (!bowlSync.playerId) continue; // Skip unmatched

        let bowlStats = matchInnings.bowlingStats.find(
          bs => bs.player.toString() === bowlSync.playerId
        );

        if (!bowlStats) {
          bowlStats = {
            player: bowlSync.playerId,
            overs: 0,
            balls: 0,
            runs: 0,
            wickets: 0,
            maidens: 0,
            dotBalls: 0
          };
          matchInnings.bowlingStats.push(bowlStats);
          bowlStats = matchInnings.bowlingStats[matchInnings.bowlingStats.length - 1];
        }

        // Convert overs to balls
        const oversFloat = parseFloat(bowlSync.overs) || 0;
        const fullOvers = Math.floor(oversFloat);
        const partialBalls = Math.round((oversFloat - fullOvers) * 10);
        const totalBalls = (fullOvers * 6) + partialBalls;

        bowlStats.overs = oversFloat;
        bowlStats.balls = totalBalls;
        bowlStats.runs = bowlSync.runs;
        bowlStats.wickets = bowlSync.wickets;
        bowlStats.maidens = bowlSync.maidens || 0;
        bowlStats.dotBalls = bowlSync.dotBalls || 0;
      }

      // Update innings status
      if (matchInnings.totalWickets >= 10 || syncInnings.isComplete) {
        matchInnings.status = 'completed';
      } else if (matchInnings.totalBalls > 0) {
        matchInnings.status = 'in-progress';
      }
    }

    // Update match status
    if (match.innings.some(inn => inn.status === 'in-progress')) {
      match.status = 'live';
    } else if (match.innings.length === 2 && match.innings.every(inn => inn.status === 'completed')) {
      match.status = 'completed';
    }

    // Update last sync timestamp
    match.lastEspnSync = new Date();

    await match.save();

    res.json({
      success: true,
      message: 'Match updated from ESPN data',
      data: {
        matchId: match._id,
        lastEspnSync: match.lastEspnSync,
        innings: match.innings.map(inn => ({
          battingTeam: inn.battingTeam,
          totalRuns: inn.totalRuns,
          totalWickets: inn.totalWickets,
          status: inn.status
        }))
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/espn/match/:matchId/url
 * Set or update ESPN URL for a match
 */
router.patch('/match/:matchId/url', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { espnUrl } = req.body;

    if (espnUrl && !espnUrl.includes('espncricinfo.com') && !espnUrl.includes('cricinfo.com')) {
      return res.status(400).json({
        success: false,
        message: 'URL must be from espncricinfo.com'
      });
    }

    const match = await Match.findByIdAndUpdate(
      matchId,
      { espnUrl: espnUrl || null },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.json({
      success: true,
      message: espnUrl ? 'ESPN URL updated' : 'ESPN URL removed',
      data: { espnUrl: match.espnUrl }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/espn/test
 */
router.get('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'ESPN data service is available',
    endpoints: {
      'POST /api/espn/fetch-match': 'Fetch data from ESPN URL',
      'GET /api/espn/match/:matchId/preview': 'Preview ESPN sync for a match',
      'POST /api/espn/match/:matchId/sync': 'Apply ESPN data to match',
      'PATCH /api/espn/match/:matchId/url': 'Set ESPN URL for match'
    }
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Match ESPN team names to local teams
 */
function matchEspnTeamsToLocal(espnData, match) {
  const espnTeams = Object.keys(espnData.teams);
  const result = {
    matched: false,
    mapping: {}
  };

  const team1Name = match.team1.name.toLowerCase();
  const team1Short = match.team1.shortName?.toLowerCase();
  const team2Name = match.team2.name.toLowerCase();
  const team2Short = match.team2.shortName?.toLowerCase();

  for (const espnTeamName of espnTeams) {
    const espnLower = espnTeamName.toLowerCase();

    // Check team1
    if (espnLower.includes(team1Name) || team1Name.includes(espnLower) ||
        (team1Short && (espnLower.includes(team1Short) || team1Short.includes(espnLower)))) {
      result.mapping[espnTeamName] = {
        team: match.team1,
        squadKey: 'team1',
        opposingTeamId: match.team2._id
      };
    }
    // Check team2
    else if (espnLower.includes(team2Name) || team2Name.includes(espnLower) ||
             (team2Short && (espnLower.includes(team2Short) || team2Short.includes(espnLower)))) {
      result.mapping[espnTeamName] = {
        team: match.team2,
        squadKey: 'team2',
        opposingTeamId: match.team1._id
      };
    }
  }

  result.matched = Object.keys(result.mapping).length >= espnTeams.length;
  return result;
}

/**
 * Match ESPN player name to local squad
 */
function matchPlayer(espnName, squad, manualMappings, teamId) {
  const result = {
    player: null,
    type: 'none',
    confidence: 0,
    candidates: []
  };

  if (!squad || squad.length === 0) {
    return result;
  }

  // Normalize ESPN name (remove captain/keeper markers)
  const normalizedEspn = normalizePlayerName(espnName);

  // 1. Check manual mappings first
  const manualMapping = manualMappings?.find(
    m => m.espnName === espnName && m.team.toString() === teamId.toString()
  );
  if (manualMapping) {
    const player = squad.find(s => s.player._id.toString() === manualMapping.player.toString());
    if (player) {
      return {
        player: { _id: player.player._id, name: player.player.name },
        type: 'manual',
        confidence: 100,
        candidates: []
      };
    }
  }

  // Build candidates list with similarity scores
  for (const squadPlayer of squad) {
    const playerName = squadPlayer.player.name;
    const normalizedLocal = normalizePlayerName(playerName);
    
    let score = 0;
    let matchType = 'none';

    // Exact match
    if (normalizedEspn === normalizedLocal) {
      score = 100;
      matchType = 'exact';
    }
    // Partial match (one name contains the other)
    else if (normalizedEspn.includes(normalizedLocal) || normalizedLocal.includes(normalizedEspn)) {
      score = 80;
      matchType = 'partial';
    }
    // Last name match
    else {
      const espnParts = normalizedEspn.split(' ');
      const localParts = normalizedLocal.split(' ');
      const espnLastName = espnParts[espnParts.length - 1];
      const localLastName = localParts[localParts.length - 1];
      
      if (espnLastName === localLastName && espnLastName.length > 2) {
        score = 70;
        matchType = 'lastName';
      }
      // Fuzzy match
      else {
        score = calculateSimilarity(normalizedEspn, normalizedLocal);
        matchType = score > 50 ? 'fuzzy' : 'none';
      }
    }

    if (score > 0) {
      result.candidates.push({
        player: { _id: squadPlayer.player._id, name: squadPlayer.player.name },
        score,
        matchType
      });
    }
  }

  // Sort candidates by score
  result.candidates.sort((a, b) => b.score - a.score);

  // If best match is good enough, use it
  if (result.candidates.length > 0 && result.candidates[0].score >= 70) {
    result.player = result.candidates[0].player;
    result.type = result.candidates[0].matchType;
    result.confidence = result.candidates[0].score;
  }

  return result;
}

/**
 * Normalize player name for matching
 */
function normalizePlayerName(name) {
  return name
    .toLowerCase()
    .replace(/\(c\)/g, '')      // Remove captain marker
    .replace(/†/g, '')          // Remove wicketkeeper marker
    .replace(/\*/g, '')         // Remove asterisk
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();
}

/**
 * Calculate string similarity (simple Levenshtein-based)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Parse various ESPN JSON response formats
 */
function parseEspnJson(json) {
  const result = {
    teams: {},
    innings: [],
    battingTeam: null,
    matchStatus: null,
    matchState: {
      isStarted: false,
      isLive: false,
      isComplete: false
    },
    target: null
  };

  try {
    if (json.match) {
      result.matchStatus = json.match.statusText || json.match.status;
      result.matchState.isLive = json.match.state === 'LIVE';
      result.matchState.isComplete = json.match.state === 'COMPLETE';
      result.matchState.isStarted = result.matchState.isLive || result.matchState.isComplete;
    }

    if (json.innings && Array.isArray(json.innings)) {
      json.innings.forEach(innings => {
        const inn = {
          team: innings.team?.name || 'Unknown',
          batting: [],
          bowling: [],
          extras: null,
          total: null,
          overs: null
        };

        if (innings.batsmen || innings.inningBatsmen) {
          (innings.batsmen || innings.inningBatsmen).forEach(b => {
            inn.batting.push({
              name: b.player?.longName || b.player?.name || b.name,
              runs: b.runs || 0,
              balls: b.balls || 0,
              fours: b.fours || 0,
              sixes: b.sixes || 0,
              strikeRate: b.strikeRate || 0,
              isNotOut: !b.isOut,
              dismissal: b.outDescription || null
            });
          });
        }

        if (innings.bowlers || innings.inningBowlers) {
          (innings.bowlers || innings.inningBowlers).forEach(b => {
            inn.bowling.push({
              name: b.player?.longName || b.player?.name || b.name,
              overs: b.overs || 0,
              maidens: b.maidens || 0,
              runs: b.conceded || b.runs || 0,
              wickets: b.wickets || 0,
              economy: b.economy || 0,
              dotBalls: b.dots || 0
            });
          });
        }

        result.innings.push(inn);
      });
    }
  } catch (e) {
    console.error('Error parsing ESPN JSON:', e);
  }

  return result;
}

module.exports = router;
