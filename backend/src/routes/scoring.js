/**
 * Scoring Routes
 * 
 * Handles all live scoring operations for a match.
 */

const express = require('express');
const auth = require('../middleware/auth');
const scoringEngine = require('../services/scoringEngine');
const { Match } = require('../models');
const { buildImageUrl } = require('../utils/imageUrl');

const router = express.Router();

// Get reference to broadcast function from matches router
let broadcastToMatch = null;

// This will be called from app.js to set the broadcast function
router.setBroadcast = (fn) => {
  broadcastToMatch = fn;
};

/**
 * POST /api/scoring/:matchId/ball
 * Record a ball delivery
 */
router.post('/:matchId/ball', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { runs, extraType, extraRuns, wicket, newBatsman } = req.body;

    const result = await scoringEngine.recordBall(matchId, {
      runs: runs || 0,
      extraType: extraType || null,
      extraRuns: extraRuns,
      wicket: wicket || null,
      newBatsman: newBatsman || null
    });

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      // Regular score update
      broadcastToMatch(matchId, 'score-update', {
        innings: result.innings,
        lastBall: result.ball
      });

      // Special event: SIX hit!
      if (result.ball.isSix) {
        // Get batsman details for display
        const match = await Match.findById(matchId)
          .populate('innings.battingStats.player', 'name headshotPath');
        
        const currentInnings = match?.innings?.[match.currentInnings];
        const batsmanStats = currentInnings?.battingStats?.find(
          s => s.player?._id?.toString() === result.ball.batsman?.toString()
        );
        
        broadcastToMatch(matchId, 'six', {
          batsmanName: batsmanStats?.player?.name || 'Batsman',
          batsmanImage: buildImageUrl(batsmanStats?.player?.headshotPath) || null,
          batsmanRuns: batsmanStats?.runs || 0,
          batsmanBalls: batsmanStats?.balls || 0,
          totalScore: result.innings.totalRuns,
          totalWickets: result.innings.totalWickets
        });
      }

      // Special event: WICKET!
      if (result.ball.isWicket) {
        // Get detailed wicket info for display
        const match = await Match.findById(matchId)
          .populate('innings.battingStats.player', 'name headshotPath')
          .populate('innings.battingStats.dismissal.bowler', 'name headshotPath')
          .populate('innings.battingStats.dismissal.fielder', 'name headshotPath')
          .populate('innings.bowlingStats.player', 'name headshotPath');
        
        const currentInnings = match?.innings?.[match.currentInnings];
        
        // Find dismissed batsman - use dismissedPlayer from ball, or fallback to the batsman who faced the ball
        // (result.ball.batsman is the striker who faced the delivery)
        const dismissedId = result.ball.wicket?.dismissedPlayer?.toString() || result.ball.batsman?.toString();
        const dismissedStats = currentInnings?.battingStats?.find(
          s => s.player?._id?.toString() === dismissedId
        );
        
        // Find bowler
        const bowlerStats = currentInnings?.bowlingStats?.find(
          s => s.player?._id?.toString() === result.ball.bowler?.toString()
        );
        
        // Find fielder name from bowling team (they're in bowlingStats for this innings)
        // or from the squads if not found in bowlingStats
        let fielderName = null;
        if (result.ball.wicket?.fielder) {
          const fielderId = result.ball.wicket.fielder.toString();
          // First try to find in bowling stats
          const fielderInBowlingStats = currentInnings?.bowlingStats?.find(
            s => s.player?._id?.toString() === fielderId
          );
          if (fielderInBowlingStats?.player?.name) {
            fielderName = fielderInBowlingStats.player.name;
          } else {
            // Try to find in squads
            const bowlingTeamId = currentInnings?.bowlingTeam?._id || currentInnings?.bowlingTeam;
            const squad = match.team1?.toString() === bowlingTeamId?.toString() 
              ? match.squads?.team1 
              : match.squads?.team2;
            if (squad) {
              const fielderInSquad = squad.find(
                p => (p.player?._id || p.player)?.toString() === fielderId
              );
              fielderName = fielderInSquad?.player?.name || null;
            }
          }
        }
        
        broadcastToMatch(matchId, 'wicket', {
          dismissedName: dismissedStats?.player?.name || 'Batsman',
          dismissedImage: buildImageUrl(dismissedStats?.player?.headshotPath) || null,
          dismissedRuns: dismissedStats?.runs || 0,
          dismissedBalls: dismissedStats?.balls || 0,
          dismissalType: result.ball.wicket?.type || 'out',
          bowlerName: bowlerStats?.player?.name || 'Bowler',
          bowlerImage: buildImageUrl(bowlerStats?.player?.headshotPath) || null,
          bowlerWickets: bowlerStats?.wickets || 0,
          fielderName: fielderName,
          totalScore: result.innings.totalRuns,
          totalWickets: result.innings.totalWickets
        });
      }

      // Special event: FOUR hit!
      if (result.ball.isFour) {
        const match = await Match.findById(matchId)
          .populate('innings.battingStats.player', 'name headshotPath');
        
        const currentInnings = match?.innings?.[match.currentInnings];
        const batsmanStats = currentInnings?.battingStats?.find(
          s => s.player?._id?.toString() === result.ball.batsman?.toString()
        );
        
        broadcastToMatch(matchId, 'four', {
          batsmanName: batsmanStats?.player?.name || 'Batsman',
          batsmanImage: buildImageUrl(batsmanStats?.player?.headshotPath) || null,
          batsmanRuns: batsmanStats?.runs || 0,
          batsmanBalls: batsmanStats?.balls || 0,
          totalScore: result.innings.totalRuns,
          totalWickets: result.innings.totalWickets
        });
      }

      if (result.isOverComplete) {
        broadcastToMatch(matchId, 'over-complete', {
          innings: result.innings
        });
      }

      if (result.isInningsComplete) {
        broadcastToMatch(matchId, 'innings-complete', {
          innings: result.innings
        });
      }

      if (result.isMatchComplete) {
        broadcastToMatch(matchId, 'match-complete', {
          result: result.result
        });
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/scoring/:matchId/ball/last
 * Undo the last ball
 */
router.delete('/:matchId/ball/last', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const result = await scoringEngine.undoLastBall(matchId);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'score-update', {
        innings: result.innings,
        undone: true,
        removedBall: result.removedBall
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/batsmen/swap
 * Swap striker and non-striker
 */
router.put('/:matchId/batsmen/swap', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const result = await scoringEngine.swapBatsmen(matchId);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'batsmen-change', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/batsmen/replace
 * Replace a batsman (retired hurt, etc.)
 */
router.put('/:matchId/batsmen/replace', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { position, newBatsman, reason } = req.body;

    if (!position || !newBatsman) {
      return res.status(400).json({
        success: false,
        message: 'Position and newBatsman are required'
      });
    }

    if (!['striker', 'nonStriker'].includes(position)) {
      return res.status(400).json({
        success: false,
        message: 'Position must be striker or nonStriker'
      });
    }

    const result = await scoringEngine.replaceBatsman(matchId, position, newBatsman, reason);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'batsmen-change', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/bowler
 * Change the current bowler
 */
router.put('/:matchId/bowler', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { bowler } = req.body;

    if (!bowler) {
      return res.status(400).json({
        success: false,
        message: 'Bowler ID is required'
      });
    }

    const result = await scoringEngine.changeBowler(matchId, bowler);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'bowler-change', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scoring/:matchId/end-innings
 * End the current innings
 */
router.post('/:matchId/end-innings', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { reason } = req.body;

    const result = await scoringEngine.endInnings(matchId, reason);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'innings-complete', {
        innings: result.innings,
        reason: result.reason
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scoring/:matchId/start-second-innings
 * Start the second innings
 */
router.post('/:matchId/start-second-innings', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { striker, nonStriker, bowler } = req.body;

    if (!striker || !nonStriker || !bowler) {
      return res.status(400).json({
        success: false,
        message: 'Striker, nonStriker, and bowler are required'
      });
    }

    const result = await scoringEngine.startSecondInnings(matchId, {
      striker,
      nonStriker,
      bowler
    });

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'innings-start', {
        innings: result.innings,
        target: result.target
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scoring/:matchId/end-match
 * End the match
 */
router.post('/:matchId/end-match', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { result: resultOverride } = req.body;

    const result = await scoringEngine.endMatch(matchId, resultOverride);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'match-complete', {
        result: result.result
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/adjust-score
 * Manually adjust the innings score
 */
router.put('/:matchId/adjust-score', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { runs, wickets, balls, extras } = req.body;

    const result = await scoringEngine.adjustScore(matchId, {
      runs,
      wickets,
      balls,
      extras
    });

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'score-update', {
        innings: result.innings,
        adjustment: true
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/batsman/:playerId/adjust
 * Manually adjust a batsman's stats
 */
router.put('/:matchId/batsman/:playerId/adjust', auth, async (req, res, next) => {
  try {
    const { matchId, playerId } = req.params;
    const { runs, balls, fours, sixes, inningsIndex } = req.body;

    const result = await scoringEngine.adjustBatsmanStats(matchId, playerId, {
      runs,
      balls,
      fours,
      sixes
    }, inningsIndex !== undefined ? inningsIndex : null);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'score-update', {
        innings: result.innings,
        adjustment: true,
        inningsIndex: result.inningsIndex
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/bowler/:playerId/adjust
 * Manually adjust a bowler's stats
 */
router.put('/:matchId/bowler/:playerId/adjust', auth, async (req, res, next) => {
  try {
    const { matchId, playerId } = req.params;
    const { overs, balls, runs, wickets, maidens, wides, noBalls, inningsIndex } = req.body;

    const result = await scoringEngine.adjustBowlerStats(matchId, playerId, {
      overs,
      balls,
      runs,
      wickets,
      maidens,
      wides,
      noBalls
    }, inningsIndex !== undefined ? inningsIndex : null);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'score-update', {
        innings: result.innings,
        adjustment: true,
        inningsIndex: result.inningsIndex
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/batsmen/change
 * Change current batsman (striker or non-striker)
 */
router.put('/:matchId/batsmen/change', auth, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { position, newBatsman } = req.body;

    if (!position || !newBatsman) {
      return res.status(400).json({
        success: false,
        message: 'Position and newBatsman are required'
      });
    }

    if (!['striker', 'nonStriker'].includes(position)) {
      return res.status(400).json({
        success: false,
        message: 'Position must be striker or nonStriker'
      });
    }

    const result = await scoringEngine.changeBatsman(matchId, position, newBatsman);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'batsmen-change', result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/scoring/:matchId/batsman/:playerId/dismissal
 * Toggle batsman's out/not-out status
 */
router.put('/:matchId/batsman/:playerId/dismissal', auth, async (req, res, next) => {
  try {
    const { matchId, playerId } = req.params;
    const { type, bowlerId, fielderId } = req.body;

    // If type is provided, we're marking them out; otherwise toggling to not-out
    const dismissalData = type ? { type, bowlerId, fielderId } : null;

    const result = await scoringEngine.toggleBatsmanDismissal(matchId, playerId, dismissalData);

    // Broadcast update to SSE clients
    if (broadcastToMatch) {
      broadcastToMatch(matchId, 'score-update', {
        innings: result.innings,
        adjustment: true
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scoring/:matchId/stats
 * Get current match statistics
 */
router.get('/:matchId/stats', async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId)
      .populate('team1', 'name code')
      .populate('team2', 'name code')
      .populate('innings.battingTeam', 'name code')
      .populate('innings.bowlingTeam', 'name code')
      .populate('innings.battingStats.player', 'name')
      .populate('innings.bowlingStats.player', 'name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const currentInnings = match.innings[match.currentInnings];
    
    let stats = {
      match: {
        format: match.format,
        status: match.status,
        team1: match.team1,
        team2: match.team2,
        currentInnings: match.currentInnings
      },
      innings: null,
      projections: null
    };

    if (currentInnings) {
      stats.innings = {
        battingTeam: currentInnings.battingTeam,
        bowlingTeam: currentInnings.bowlingTeam,
        totalRuns: currentInnings.totalRuns,
        totalWickets: currentInnings.totalWickets,
        totalBalls: currentInnings.totalBalls,
        overs: scoringEngine.getOversDisplay(currentInnings.totalBalls),
        extras: currentInnings.extras,
        currentRunRate: scoringEngine.calculateCurrentRunRate(
          currentInnings.totalRuns, 
          currentInnings.totalBalls
        ),
        currentOver: currentInnings.currentOver,
        battingStats: currentInnings.battingStats,
        bowlingStats: currentInnings.bowlingStats
      };

      // Add target and required run rate for second innings
      if (match.currentInnings === 1 && match.innings[0]) {
        const target = match.innings[0].totalRuns + 1;
        const runsNeeded = target - currentInnings.totalRuns;
        const ballsRemaining = scoringEngine.getMaxBalls(match.format) - currentInnings.totalBalls;

        stats.innings.target = target;
        stats.innings.runsNeeded = runsNeeded;
        stats.innings.ballsRemaining = ballsRemaining;
        stats.innings.requiredRunRate = scoringEngine.calculateRequiredRunRate(runsNeeded, ballsRemaining);

        stats.projections = {
          winProbability: scoringEngine.calculateWinProbability(match)
        };
      }
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
