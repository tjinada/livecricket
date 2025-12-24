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
const Ball = require('../models/Ball');
const Country = require('../models/Country');
const { getOversDisplay, getBallDisplay } = require('../services/scoringEngine');

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
 * POST /api/espn/fetch-ball-by-ball
 * Fetch ball-by-ball commentary data from ESPN API
 */
router.post('/fetch-ball-by-ball', auth, async (req, res, next) => {
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

    const result = await espnScraper.fetchBallByBallData(url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
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
 * POST /api/espn/parse-ball-by-ball-json
 * Parse ball-by-ball commentary JSON that was manually copied from browser DevTools
 * Admin captures the response from: https://hs-consumer-api.espncricinfo.com/v1/pages/match/comments?...
 */
router.post('/parse-ball-by-ball-json', auth, async (req, res, next) => {
  try {
    let { json, inningsNumber } = req.body;

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

    // Parse the comments into our ball format
    const comments = json.comments || [];
    
    if (comments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No ball commentary found in the JSON'
      });
    }

    const balls = espnScraper.parseCommentaryToBalls(comments, inningsNumber || 1);

    res.json({
      success: true,
      data: {
        inningsNumber: inningsNumber || 1,
        balls,
        totalBalls: balls.filter(b => b.isLegal).length,
        rawCommentCount: comments.length
      }
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
      .populate('team1', 'name shortName code')
      .populate('team2', 'name shortName code')
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
        isCurrent: espnInnings.isCurrent || false,
        // Current batsmen info for live matches
        striker: espnInnings.striker ? {
          espnName: espnInnings.striker.name,
          runs: espnInnings.striker.runs,
          balls: espnInnings.striker.balls,
          matchedPlayer: matchPlayer(espnInnings.striker.name, squad, match.espnPlayerMappings, localTeam._id).player
        } : null,
        nonStriker: espnInnings.nonStriker ? {
          espnName: espnInnings.nonStriker.name,
          runs: espnInnings.nonStriker.runs,
          balls: espnInnings.nonStriker.balls,
          matchedPlayer: matchPlayer(espnInnings.nonStriker.name, squad, match.espnPlayerMappings, localTeam._id).player
        } : null,
        currentBowler: espnInnings.currentBowler ? {
          espnName: espnInnings.currentBowler,
          matchedPlayer: matchPlayer(espnInnings.currentBowler, opposingSquad, match.espnPlayerMappings, localTeamInfo.opposingTeamId).player
        } : null,
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
      const { localTeamId, batting, bowling, total, extras, striker, nonStriker, currentBowler } = syncInnings;

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

        // Convert overs to balls properly
        // ESPN overs come as integers for complete overs (3 = 3.0 overs = 18 balls)
        // or as decimals for partial overs (3.4 = 3 overs 4 balls = 22 balls)
        const oversValue = bowlSync.overs;
        let fullOvers, partialBalls, totalBalls;
        
        if (Number.isInteger(oversValue)) {
          // Complete overs: 3 means 3.0 overs = 18 balls
          fullOvers = oversValue;
          partialBalls = 0;
          totalBalls = fullOvers * 6;
        } else {
          // Partial overs: 3.4 means 3 overs and 4 balls = 22 balls
          const oversFloat = parseFloat(oversValue) || 0;
          fullOvers = Math.floor(oversFloat);
          // Get the decimal part and convert - 3.4 -> 4 balls (not 0.4 * 10 = 4)
          partialBalls = Math.round((oversFloat - fullOvers) * 10);
          // Ensure partial balls is valid (0-5)
          if (partialBalls > 5) partialBalls = 5;
          totalBalls = (fullOvers * 6) + partialBalls;
        }

        // Store overs as complete overs and balls as partial balls (0-5)
        // This is the correct format for cricket stats display
        bowlStats.overs = fullOvers;
        bowlStats.balls = partialBalls;  // Partial balls (0-5), NOT total balls
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
      
      // Update current batsmen (striker/non-striker) for live matches
      if (striker && striker.playerId) {
        matchInnings.currentBatsmen = matchInnings.currentBatsmen || {};
        matchInnings.currentBatsmen.striker = striker.playerId;
      }
      if (nonStriker && nonStriker.playerId) {
        matchInnings.currentBatsmen = matchInnings.currentBatsmen || {};
        matchInnings.currentBatsmen.nonStriker = nonStriker.playerId;
      }
      if (currentBowler && currentBowler.playerId) {
        matchInnings.currentBowler = currentBowler.playerId;
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
      'POST /api/espn/fetch-ball-by-ball': 'Fetch ball-by-ball commentary from ESPN API',
      'GET /api/espn/match/:matchId/preview': 'Preview ESPN sync for a match',
      'POST /api/espn/match/:matchId/sync': 'Apply ESPN data to match (stats only)',
      'POST /api/espn/match/:matchId/full-sync': 'Complete replace from ESPN (stats + ball-by-ball)',
      'PATCH /api/espn/match/:matchId/url': 'Set ESPN URL for match'
    }
  });
});

/**
 * POST /api/espn/match/:matchId/full-sync
 * COMPLETE REPLACE: Fetch ESPN data and completely replace all match data including ball-by-ball history
 * This is the "one button to do it all" - syncs everything from ESPN
 */
router.post('/match/:matchId/full-sync', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerMappings, inningsData } = req.body;

    // playerMappings: { espnName: { playerId, teamId }, ... } - manual mappings from admin
    // inningsData: array of innings data with matched players from preview

    const match = await Match.findById(matchId)
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('squads.team1.player', 'name')
      .populate('squads.team2.player', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Save any new manual player mappings
    if (playerMappings && Object.keys(playerMappings).length > 0) {
      for (const [espnName, mapping] of Object.entries(playerMappings)) {
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

    // ============================================
    // STEP 0: FETCH BALL-BY-BALL DATA FROM ESPN
    // ============================================
    let espnBallData = null;
    if (match.espnUrl) {
      console.log('Attempting to fetch ball-by-ball data from ESPN...');
      try {
        const ballResult = await espnScraper.fetchBallByBallData(match.espnUrl);
        if (ballResult.success && ballResult.data && ballResult.data.innings && ballResult.data.innings.length > 0) {
          espnBallData = ballResult.data;
          console.log(`✓ Fetched ${espnBallData.innings.length} innings of ball-by-ball data`);
        } else {
          console.log('Ball-by-ball data not available (ESPN API blocked or no data)');
        }
      } catch (e) {
        console.log('Ball-by-ball fetch failed:', e.message);
      }
    }

    // Build a player name to ID mapping for ball-by-ball data
    // This maps ESPN player names to local player IDs
    const playerNameToId = new Map();
    
    // From manual mappings
    if (playerMappings) {
      for (const [espnName, mapping] of Object.entries(playerMappings)) {
        playerNameToId.set(espnName.toLowerCase(), mapping.playerId);
      }
    }
    
    // From existing player mappings in match
    if (match.espnPlayerMappings) {
      for (const mapping of match.espnPlayerMappings) {
        playerNameToId.set(mapping.espnName.toLowerCase(), mapping.player.toString());
      }
    }
    
    // From innings data batting/bowling
    for (const innings of inningsData) {
      for (const bat of (innings.batting || [])) {
        if (bat.playerId && bat.espnName) {
          playerNameToId.set(bat.espnName.toLowerCase(), bat.playerId);
        }
      }
      for (const bowl of (innings.bowling || [])) {
        if (bowl.playerId && bowl.espnName) {
          playerNameToId.set(bowl.espnName.toLowerCase(), bowl.playerId);
        }
      }
    }

    // ============================================
    // STEP 1: DELETE ALL EXISTING BALL RECORDS
    // ============================================
    const deletedBalls = await Ball.deleteMany({ match: matchId });
    console.log(`Deleted ${deletedBalls.deletedCount} existing ball records for match ${matchId}`);

    // ============================================
    // STEP 2: CLEAR AND REBUILD INNINGS DATA
    // ============================================
    
    // Track stats for response
    const syncStats = {
      ballsDeleted: deletedBalls.deletedCount,
      ballsCreated: 0,
      inningsSynced: 0,
      oversBuilt: 0,
      ballByBallAvailable: !!espnBallData
    };

    // Process each innings from the preview data
    for (let inningsIdx = 0; inningsIdx < inningsData.length; inningsIdx++) {
      const syncInnings = inningsData[inningsIdx];
      const { localTeamId, batting, bowling, total, overs, extras, striker, nonStriker, currentBowler } = syncInnings;
      const inningsNumber = inningsIdx + 1;

      // Find or create matching innings in our match
      let matchInnings = match.innings.find(
        inn => inn.battingTeam.toString() === localTeamId
      );

      if (!matchInnings) {
        // Create new innings
        const battingTeamIsTeam1 = match.team1._id.toString() === localTeamId;
        matchInnings = {
          battingTeam: localTeamId,
          bowlingTeam: battingTeamIsTeam1 ? match.team2._id : match.team1._id,
          inningsNumber: inningsNumber,
          totalRuns: 0,
          totalWickets: 0,
          totalBalls: 0,
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          status: 'not-started',
          currentBatsmen: { striker: null, nonStriker: null },
          currentBowler: null,
          lastBowler: null,
          battingStats: [],
          bowlingStats: [],
          currentOver: [],
          overs: [],
          fallOfWickets: [],
          partnership: { runs: 0, balls: 0, batsman1: null, batsman2: null }
        };
        match.innings.push(matchInnings);
        matchInnings = match.innings[match.innings.length - 1];
      } else {
        // COMPLETE REPLACE: Clear existing stats
        matchInnings.battingStats = [];
        matchInnings.bowlingStats = [];
        matchInnings.currentOver = [];
        matchInnings.overs = [];
        matchInnings.fallOfWickets = [];
        matchInnings.partnership = { runs: 0, balls: 0, batsman1: null, batsman2: null };
      }

      // ============================================
      // STEP 2a: UPDATE INNINGS TOTALS FROM ESPN
      // ============================================
      if (total) {
        matchInnings.totalRuns = total.runs;
        matchInnings.totalWickets = total.wickets;
      }

      // Calculate total balls from overs
      if (overs) {
        const oversMatch = String(overs).match(/(\d+)(?:\.(\d))?/);
        if (oversMatch) {
          const fullOvers = parseInt(oversMatch[1], 10) || 0;
          const partialBalls = parseInt(oversMatch[2], 10) || 0;
          matchInnings.totalBalls = (fullOvers * 6) + partialBalls;
        }
      }

      // Update extras
      if (extras) {
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

      // ============================================
      // STEP 2b: REBUILD BATTING STATS
      // ============================================
      for (const batSync of batting) {
        if (!batSync.playerId) continue;

        matchInnings.battingStats.push({
          player: batSync.playerId,
          runs: batSync.runs || 0,
          balls: batSync.balls || 0,
          fours: batSync.fours || 0,
          sixes: batSync.sixes || 0,
          isOut: !batSync.isNotOut,
          isNotOut: batSync.isNotOut || false,
          dismissal: batSync.dismissal ? {
            type: batSync.dismissal.type || null,
            bowler: batSync.dismissal.bowlerId || null,
            fielder: batSync.dismissal.fielderId || null
          } : { type: null, bowler: null, fielder: null },
          position: matchInnings.battingStats.length + 1
        });

        // Build fall of wickets for dismissed batsmen
        if (!batSync.isNotOut && batSync.runs !== undefined) {
          matchInnings.fallOfWickets.push({
            wicketNumber: matchInnings.fallOfWickets.length + 1,
            runs: matchInnings.totalRuns, // Approximation
            balls: matchInnings.totalBalls,
            player: batSync.playerId,
            overs: getOversDisplay(matchInnings.totalBalls)
          });
        }
      }

      // ============================================
      // STEP 2c: REBUILD BOWLING STATS
      // ============================================
      for (const bowlSync of bowling) {
        if (!bowlSync.playerId) continue;

        const oversValue = bowlSync.overs;
        let fullOvers, partialBalls;
        
        if (Number.isInteger(oversValue)) {
          fullOvers = oversValue;
          partialBalls = 0;
        } else {
          const oversFloat = parseFloat(oversValue) || 0;
          fullOvers = Math.floor(oversFloat);
          partialBalls = Math.round((oversFloat - fullOvers) * 10);
          if (partialBalls > 5) partialBalls = 5;
        }

        matchInnings.bowlingStats.push({
          player: bowlSync.playerId,
          overs: fullOvers,
          balls: partialBalls,
          runs: bowlSync.runs || 0,
          wickets: bowlSync.wickets || 0,
          wides: bowlSync.wides || 0,
          noBalls: bowlSync.noBalls || 0,
          maidens: bowlSync.maidens || 0,
          dotBalls: bowlSync.dotBalls || 0
        });
      }

      // ============================================
      // STEP 2d: SET CURRENT PLAYERS (for live matches)
      // ============================================
      if (striker && striker.playerId) {
        matchInnings.currentBatsmen.striker = striker.playerId;
      }
      if (nonStriker && nonStriker.playerId) {
        matchInnings.currentBatsmen.nonStriker = nonStriker.playerId;
      }
      if (currentBowler && currentBowler.playerId) {
        matchInnings.currentBowler = currentBowler.playerId;
      }

      // Set partnership for current batsmen
      if (matchInnings.currentBatsmen.striker && matchInnings.currentBatsmen.nonStriker) {
        matchInnings.partnership = {
          runs: 0,
          balls: 0,
          batsman1: matchInnings.currentBatsmen.striker,
          batsman2: matchInnings.currentBatsmen.nonStriker
        };
      }

      // ============================================
      // STEP 2e: CREATE BALL RECORDS FROM ESPN DATA
      // ============================================
      // Get ball-by-ball data for this innings from ESPN
      const espnInningsBalls = espnBallData?.innings?.find(i => i.inningsNumber === inningsNumber);
      
      if (espnInningsBalls && espnInningsBalls.balls && espnInningsBalls.balls.length > 0) {
        console.log(`Processing ${espnInningsBalls.balls.length} balls for innings ${inningsNumber}`);
        
        const ballDocuments = [];
        let sequence = 0;
        let currentOverNumber = -1;
        let currentOverBalls = [];
        let runningScore = 0;
        let runningWickets = 0;

        for (const espnBall of espnInningsBalls.balls) {
          sequence++;
          
          // Update running totals
          runningScore += espnBall.totalRuns || 0;
          if (espnBall.isWicket) runningWickets++;
          
          // Parse overs (e.g., 15.3 = over 15, ball 3)
          const overNumber = espnBall.overNumber !== undefined ? espnBall.overNumber : Math.floor(espnBall.oversActual || 0);
          const ballInOver = espnBall.ballInOver !== undefined ? espnBall.ballInOver : Math.round(((espnBall.oversActual || 0) - overNumber) * 10);
          
          // Map ESPN player names to local player IDs
          const batsmanId = espnBall.batsmanName ? playerNameToId.get(espnBall.batsmanName.toLowerCase()) : null;
          const bowlerId = espnBall.bowlerName ? playerNameToId.get(espnBall.bowlerName.toLowerCase()) : null;
          const nonStrikerId = espnBall.nonStrikerName ? playerNameToId.get(espnBall.nonStrikerName.toLowerCase()) : null;
          const dismissedBatsmanId = espnBall.dismissedBatsmanName ? playerNameToId.get(espnBall.dismissedBatsmanName.toLowerCase()) : null;
          const fielderId = espnBall.fielderName ? playerNameToId.get(espnBall.fielderName.toLowerCase()) : null;

          const ballDoc = new Ball({
            match: matchId,
            inningsNumber: inningsNumber,
            overNumber: overNumber,
            ballNumber: ballInOver || 1,
            sequence: sequence,
            bowler: bowlerId || null,
            batsman: batsmanId || null,
            nonStriker: nonStrikerId || null,
            runs: espnBall.runs || 0,
            isExtra: espnBall.isExtra || false,
            extraType: espnBall.extraType || null,
            extraRuns: espnBall.extraRuns || 0,
            totalRuns: espnBall.totalRuns || espnBall.runs || 0,
            isFour: espnBall.isFour || false,
            isSix: espnBall.isSix || false,
            isWicket: espnBall.isWicket || false,
            wicket: espnBall.isWicket ? {
              type: espnBall.wicketType || 'bowled',
              dismissedPlayer: dismissedBatsmanId || null,
              fielder: fielderId || null
            } : undefined,
            scoreAfter: {
              runs: runningScore,
              wickets: runningWickets,
              overs: getOversDisplay(sequence)
            }
          });

          ballDocuments.push(ballDoc);

          // Build over summary for display
          if (overNumber !== currentOverNumber) {
            // Save previous over if exists
            if (currentOverBalls.length > 0 && currentOverNumber >= 0) {
              const overRuns = currentOverBalls.reduce((sum, b) => sum + (b.runs || 0), 0);
              const overWickets = currentOverBalls.filter(b => b.isWicket).length;
              matchInnings.overs.push({
                overNumber: currentOverNumber + 1,
                bowler: currentOverBalls[0]?.bowler || null,
                balls: currentOverBalls,
                runs: overRuns,
                wickets: overWickets
              });
              syncStats.oversBuilt++;
            }
            currentOverNumber = overNumber;
            currentOverBalls = [];
          }

          // Add to current over
          currentOverBalls.push({
            ballNumber: espnBall.isLegal !== false ? ballInOver : null,
            runs: espnBall.totalRuns || espnBall.runs || 0,
            isExtra: espnBall.isExtra || false,
            extraType: espnBall.extraType || null,
            isWicket: espnBall.isWicket || false,
            display: getBallDisplay({
              runs: espnBall.runs || 0,
              extraType: espnBall.extraType,
              extraRuns: espnBall.extraRuns || 0,
              totalRuns: espnBall.totalRuns || espnBall.runs || 0,
              isWicket: espnBall.isWicket || false
            }),
            batsman: batsmanId,
            bowler: bowlerId
          });
        }

        // Save final over
        if (currentOverBalls.length > 0) {
          const legalBalls = currentOverBalls.filter(b => b.ballNumber !== null).length;
          const isCompleteOver = legalBalls >= 6;
          
          if (isCompleteOver) {
            const overRuns = currentOverBalls.reduce((sum, b) => sum + (b.runs || 0), 0);
            const overWickets = currentOverBalls.filter(b => b.isWicket).length;
            matchInnings.overs.push({
              overNumber: currentOverNumber + 1,
              bowler: currentOverBalls[0]?.bowler || null,
              balls: currentOverBalls,
              runs: overRuns,
              wickets: overWickets
            });
            syncStats.oversBuilt++;
          } else {
            // Current over in progress
            matchInnings.currentOver = currentOverBalls;
          }
        }

        // Bulk insert ball documents
        if (ballDocuments.length > 0) {
          await Ball.insertMany(ballDocuments);
          syncStats.ballsCreated += ballDocuments.length;
          console.log(`Created ${ballDocuments.length} ball records for innings ${inningsNumber}`);
        }
      } else {
        console.log(`No ball-by-ball data available for innings ${inningsNumber}`);
      }

      // Update innings status
      if (matchInnings.totalWickets >= 10 || syncInnings.isComplete) {
        matchInnings.status = 'completed';
      } else if (matchInnings.totalBalls > 0) {
        matchInnings.status = 'in-progress';
      }

      syncStats.inningsSynced++;
    }

    // ============================================
    // STEP 3: UPDATE MATCH STATUS
    // ============================================
    if (match.innings.some(inn => inn.status === 'in-progress')) {
      match.status = 'live';
    } else if (match.innings.length === 2 && match.innings.every(inn => inn.status === 'completed')) {
      match.status = 'completed';
      
      // Calculate result
      const firstInningsRuns = match.innings[0].totalRuns;
      const secondInningsRuns = match.innings[1].totalRuns;

      if (secondInningsRuns > firstInningsRuns) {
        match.result = {
          winner: match.innings[1].battingTeam,
          winMargin: `${10 - match.innings[1].totalWickets} wickets`,
          winType: 'wickets'
        };
      } else if (firstInningsRuns > secondInningsRuns) {
        match.result = {
          winner: match.innings[0].battingTeam,
          winMargin: `${firstInningsRuns - secondInningsRuns} runs`,
          winType: 'runs'
        };
      } else {
        match.result = {
          winner: null,
          winMargin: 'Match Tied',
          winType: 'tie'
        };
      }
    }

    // Update last sync timestamp
    match.lastEspnSync = new Date();

    await match.save();

    res.json({
      success: true,
      message: 'Match completely replaced from ESPN data',
      data: {
        matchId: match._id,
        lastEspnSync: match.lastEspnSync,
        stats: syncStats,
        innings: match.innings.map(inn => ({
          inningsNumber: inn.inningsNumber,
          battingTeam: inn.battingTeam,
          totalRuns: inn.totalRuns,
          totalWickets: inn.totalWickets,
          totalBalls: inn.totalBalls,
          overs: getOversDisplay(inn.totalBalls),
          status: inn.status,
          battingStatsCount: inn.battingStats.length,
          bowlingStatsCount: inn.bowlingStats.length,
          completedOvers: inn.overs?.length || 0
        }))
      }
    });

  } catch (error) {
    console.error('Full sync error:', error);
    next(error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Common cricket team name abbreviations and variations
 * Maps abbreviations/short names to full country names
 */
const TEAM_NAME_ALIASES = {
  // Standard abbreviations
  'ind': ['india', 'ind'],
  'aus': ['australia', 'aus'],
  'eng': ['england', 'eng'],
  'pak': ['pakistan', 'pak'],
  'sa': ['south africa', 'sa', 'rsa'],
  'nz': ['new zealand', 'nz'],
  'wi': ['west indies', 'wi', 'windies'],
  'sl': ['sri lanka', 'sl'],
  'ban': ['bangladesh', 'ban'],
  'afg': ['afghanistan', 'afg'],
  'zim': ['zimbabwe', 'zim'],
  'ire': ['ireland', 'ire'],
  'sco': ['scotland', 'sco'],
  'ned': ['netherlands', 'ned', 'holland'],
  'nep': ['nepal', 'nep'],
  'uae': ['uae', 'united arab emirates'],
  'oman': ['oman'],
  'usa': ['usa', 'united states'],
  'can': ['canada', 'can'],
  'ken': ['kenya', 'ken'],
  'hk': ['hong kong', 'hk'],
  'png': ['papua new guinea', 'png'],
  // Full names map to themselves
  'india': ['india', 'ind'],
  'australia': ['australia', 'aus'],
  'england': ['england', 'eng'],
  'pakistan': ['pakistan', 'pak'],
  'south africa': ['south africa', 'sa', 'rsa'],
  'new zealand': ['new zealand', 'nz'],
  'west indies': ['west indies', 'wi', 'windies'],
  'sri lanka': ['sri lanka', 'sl'],
  'bangladesh': ['bangladesh', 'ban'],
  'afghanistan': ['afghanistan', 'afg'],
  'zimbabwe': ['zimbabwe', 'zim'],
  'ireland': ['ireland', 'ire'],
  'scotland': ['scotland', 'sco'],
  'netherlands': ['netherlands', 'ned', 'holland'],
  'nepal': ['nepal', 'nep']
};

/**
 * Normalize team name by removing common suffixes and extracting core name
 */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .replace(/\s*(women|men|w|m)\s*$/i, '') // Remove Women/Men suffix
    .replace(/\s*(women's|men's)\s*/i, '') // Remove Women's/Men's
    .replace(/-w$|-m$/i, '') // Remove -W or -M suffix
    .trim();
}

/**
 * Check if two team names refer to the same country
 */
function teamsMatch(espnName, localName, localShortName, localCode) {
  const espnNorm = normalizeTeamName(espnName);
  const localNorm = normalizeTeamName(localName);
  const localShortNorm = localShortName ? normalizeTeamName(localShortName) : null;
  const localCodeNorm = localCode ? localCode.toLowerCase() : null;
  
  // Direct match after normalization
  if (espnNorm === localNorm) return true;
  if (localShortNorm && espnNorm === localShortNorm) return true;
  if (localCodeNorm && espnNorm === localCodeNorm) return true;
  
  // Check if one contains the other
  if (espnNorm.includes(localNorm) || localNorm.includes(espnNorm)) return true;
  if (localShortNorm && (espnNorm.includes(localShortNorm) || localShortNorm.includes(espnNorm))) return true;
  
  // Check if ESPN name starts with local code (e.g., "SL Women" starts with "SL")
  if (localCodeNorm && espnNorm.startsWith(localCodeNorm)) return true;
  
  // Check alias mappings
  // Find all aliases for the ESPN team name
  const espnAliases = TEAM_NAME_ALIASES[espnNorm] || [];
  const localAliases = TEAM_NAME_ALIASES[localNorm] || [];
  const localShortAliases = localShortNorm ? (TEAM_NAME_ALIASES[localShortNorm] || []) : [];
  const localCodeAliases = localCodeNorm ? (TEAM_NAME_ALIASES[localCodeNorm] || []) : [];
  
  // Check if any ESPN alias matches local name or its aliases
  for (const alias of espnAliases) {
    if (alias === localNorm) return true;
    if (localShortNorm && alias === localShortNorm) return true;
    if (localCodeNorm && alias === localCodeNorm) return true;
    if (localAliases.includes(alias)) return true;
    if (localShortAliases.includes(alias)) return true;
    if (localCodeAliases.includes(alias)) return true;
  }
  
  // Check if local name's aliases match ESPN
  for (const alias of localAliases) {
    if (alias === espnNorm) return true;
    if (espnAliases.includes(alias)) return true;
  }
  
  // Check short name aliases too
  for (const alias of localShortAliases) {
    if (alias === espnNorm) return true;
    if (espnAliases.includes(alias)) return true;
  }
  
  // Check code aliases
  for (const alias of localCodeAliases) {
    if (alias === espnNorm) return true;
    if (espnAliases.includes(alias)) return true;
  }
  
  return false;
}

/**
 * Match ESPN team names to local teams
 */
function matchEspnTeamsToLocal(espnData, match) {
  const espnTeams = Object.keys(espnData.teams);
  const result = {
    matched: false,
    mapping: {}
  };

  const team1Name = match.team1.name;
  const team1Short = match.team1.shortName;
  const team1Code = match.team1.code;
  const team2Name = match.team2.name;
  const team2Short = match.team2.shortName;
  const team2Code = match.team2.code;

  for (const espnTeamName of espnTeams) {
    // Check team1
    if (teamsMatch(espnTeamName, team1Name, team1Short, team1Code)) {
      result.mapping[espnTeamName] = {
        team: match.team1,
        squadKey: 'team1',
        opposingTeamId: match.team2._id
      };
    }
    // Check team2
    else if (teamsMatch(espnTeamName, team2Name, team2Short, team2Code)) {
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
