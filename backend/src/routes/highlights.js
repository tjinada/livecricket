/**
 * Highlights Routes
 * 
 * API endpoints for generating and retrieving match highlight videos.
 */

const express = require('express');
const highlightService = require('../services/highlightService');

const router = express.Router();

/**
 * GET /api/highlights/:matchId
 * Generate full highlight video data for a match
 * 
 * Query params:
 * - innings: Specific innings number (1 or 2), or omit for all
 * - includeMatchSummary: Include match summary (default: true)
 */
router.get('/:matchId', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { innings, includeMatchSummary } = req.query;

    const options = {
      inningsNumber: innings ? parseInt(innings, 10) : null,
      includeMatchSummary: includeMatchSummary !== 'false'
    };

    const highlightVideo = await highlightService.generateHighlightVideo(matchId, options);

    res.json({
      success: true,
      data: highlightVideo
    });
  } catch (error) {
    if (error.message === 'Match not found' || 
        error.message.includes('Innings') && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * GET /api/highlights/:matchId/innings/:inningsNumber
 * Generate highlight data for a specific innings only
 */
router.get('/:matchId/innings/:inningsNumber', async (req, res, next) => {
  try {
    const { matchId, inningsNumber } = req.params;

    const highlights = await highlightService.generateInningsHighlights(
      matchId, 
      parseInt(inningsNumber, 10)
    );

    // Calculate total duration
    const totalDuration = highlights.reduce((sum, h) => sum + h.duration, 0);

    res.json({
      success: true,
      data: {
        matchId,
        inningsNumber: parseInt(inningsNumber, 10),
        highlights,
        totalHighlights: highlights.length,
        totalDuration,
        formattedDuration: formatDuration(totalDuration)
      }
    });
  } catch (error) {
    if (error.message === 'Match not found' || 
        error.message.includes('Innings') && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * GET /api/highlights/:matchId/summary
 * Get match summary only (for completed matches)
 */
router.get('/:matchId/summary', async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const summary = await highlightService.generateMatchSummary(matchId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    if (error.message === 'Match not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * GET /api/highlights/:matchId/stats
 * Get highlight statistics (counts of 4s, 6s, wickets, etc.)
 */
router.get('/:matchId/stats', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { innings } = req.query;

    const options = {
      inningsNumber: innings ? parseInt(innings, 10) : null,
      includeMatchSummary: false
    };

    const highlightVideo = await highlightService.generateHighlightVideo(matchId, options);

    // Calculate stats
    const stats = {
      fours: 0,
      sixes: 0,
      wickets: 0,
      fifties: 0,
      hundreds: 0,
      overSummaries: 0
    };

    for (const h of highlightVideo.highlights) {
      switch (h.type) {
        case 'four':
          stats.fours++;
          break;
        case 'six':
          stats.sixes++;
          break;
        case 'wicket':
          stats.wickets++;
          break;
        case 'fifty':
          stats.fifties++;
          break;
        case 'hundred':
          stats.hundreds++;
          break;
        case 'overSummary':
          stats.overSummaries++;
          break;
      }
    }

    res.json({
      success: true,
      data: {
        matchId,
        stats,
        totalHighlights: highlightVideo.totalHighlights,
        totalDuration: highlightVideo.totalDuration,
        formattedDuration: highlightVideo.formattedDuration
      }
    });
  } catch (error) {
    if (error.message === 'Match not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * Helper to format duration in mm:ss
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = router;
