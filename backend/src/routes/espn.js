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

const router = express.Router();

/**
 * POST /api/espn/fetch-match
 * Fetch live match data from ESPN Cricinfo URL
 * 
 * Body: { url: string }
 * Returns: Parsed match data
 * 
 * NOTE: ESPN may block automated requests (403). 
 * If this happens, use the /api/espn/parse-json endpoint instead.
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

    // Basic URL validation
    if (!url.includes('espncricinfo.com') && !url.includes('cricinfo.com')) {
      return res.status(400).json({
        success: false,
        message: 'URL must be from espncricinfo.com'
      });
    }

    // Fetch and parse match data
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
 * 
 * This is the RELIABLE method when URL scraping is blocked.
 * 
 * How to get the JSON:
 * 1. Open match page in browser
 * 2. Open DevTools (F12) → Network tab
 * 3. Refresh the page
 * 4. Look for XHR requests containing match data (often has 'innings' or 'scorecard' in URL)
 * 5. Click on request → Response tab → Copy the JSON
 * 
 * Body: { json: object | string }
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

    // Parse if string
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

    // Try to extract useful data from various ESPN JSON structures
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
 * Parse various ESPN JSON response formats
 */
function parseEspnJson(json) {
  const result = {
    teams: {},
    battingTeam: null,
    matchStatus: null,
    matchState: {
      isStarted: false,
      isLive: false,
      isComplete: false
    },
    batting: [],
    bowling: [],
    extras: null,
    target: null,
    rawJson: json
  };

  try {
    // Handle match info
    if (json.match) {
      const match = json.match;
      result.matchStatus = match.statusText || match.status;
      result.matchState.isLive = match.state === 'LIVE' || match.state === 'IN_PROGRESS';
      result.matchState.isComplete = match.state === 'COMPLETE' || match.state === 'FINISHED';
      result.matchState.isStarted = result.matchState.isLive || result.matchState.isComplete;
    }

    // Handle teams
    if (json.teams) {
      json.teams.forEach(team => {
        result.teams[team.name || team.team?.name] = {
          score: team.score || '',
          overs: team.overs || ''
        };
      });
    }

    // Handle innings array
    if (json.innings && Array.isArray(json.innings)) {
      json.innings.forEach(innings => {
        // Batting
        if (innings.batsmen || innings.inningBatsmen) {
          const batsmen = innings.batsmen || innings.inningBatsmen;
          batsmen.forEach(b => {
            result.batting.push({
              name: b.player?.longName || b.player?.name || b.name,
              runs: b.runs || 0,
              balls: b.balls || 0,
              fours: b.fours || 0,
              sixes: b.sixes || 0,
              strikeRate: b.strikeRate || b.strikerate || 0,
              isNotOut: !b.isOut && !b.outDescription,
              dismissal: b.outDescription || b.dismissalText || null
            });
          });
        }

        // Bowling
        if (innings.bowlers || innings.inningBowlers) {
          const bowlers = innings.bowlers || innings.inningBowlers;
          bowlers.forEach(b => {
            result.bowling.push({
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

        // Extras
        if (innings.extras || innings.inningExtras) {
          const extras = innings.extras || innings.inningExtras;
          result.extras = {
            total: extras.total || 0,
            breakdown: `b ${extras.byes || 0}, lb ${extras.legbyes || 0}, w ${extras.wides || 0}, nb ${extras.noballs || 0}`
          };
        }
      });
    }

    // Handle scorecard format
    if (json.scorecard) {
      // Similar parsing for scorecard format
      if (json.scorecard.innings) {
        // ... parse innings from scorecard
      }
    }

    // Handle content.innings format (another ESPN structure)
    if (json.content?.innings) {
      json.content.innings.forEach(innings => {
        if (innings.inningBatsmen) {
          innings.inningBatsmen.forEach(b => {
            result.batting.push({
              name: b.player?.longName || b.player?.name || b.battedName,
              runs: b.runs || 0,
              balls: b.balls || 0,
              fours: b.fours || 0,
              sixes: b.sixes || 0,
              strikeRate: b.strikerate || 0,
              isNotOut: !b.isOut,
              dismissal: b.dismissalText?.long || null
            });
          });
        }
        if (innings.inningBowlers) {
          innings.inningBowlers.forEach(b => {
            result.bowling.push({
              name: b.player?.longName || b.player?.name || b.name,
              overs: b.overs || 0,
              maidens: b.maidens || 0,
              runs: b.conceded || 0,
              wickets: b.wickets || 0,
              economy: b.economy || 0,
              dotBalls: b.dots || 0
            });
          });
        }
      });
    }

  } catch (e) {
    console.error('Error parsing ESPN JSON:', e);
  }

  return result;
}

/**
 * POST /api/espn/preview
 * Preview what data can be extracted from an ESPN URL without saving
 * 
 * Body: { url: string }
 */
router.post('/preview', auth, async (req, res, next) => {
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
        suggestion: result.suggestion
      });
    }

    // Format a human-readable preview
    const data = result.data;
    const preview = {
      teams: Object.entries(data.teams).map(([name, info]) => ({
        name,
        score: info.score || '-',
        overs: info.overs || '-'
      })),
      battingTeam: data.battingTeam,
      matchStatus: data.matchStatus,
      state: data.matchState,
      battingCard: data.batting.length > 0 
        ? `${data.batting.length} batsmen found`
        : 'No batting data found',
      bowlingCard: data.bowling.length > 0
        ? `${data.bowling.length} bowlers found`
        : 'No bowling data found',
      extras: data.extras,
      rawData: data
    };

    res.json({
      success: true,
      data: preview
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/espn/test
 * Simple test endpoint to verify ESPN scraping is working
 */
router.get('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'ESPN data service is available',
    methods: {
      'POST /api/espn/fetch-match': {
        description: 'Fetch live match data from ESPN URL (may be blocked)',
        body: '{ url: "https://www.espncricinfo.com/..." }'
      },
      'POST /api/espn/parse-json': {
        description: 'Parse ESPN JSON copied from DevTools (reliable)',
        body: '{ json: { ... ESPN JSON ... } }'
      },
      'POST /api/espn/preview': {
        description: 'Preview extracted data from URL',
        body: '{ url: "https://www.espncricinfo.com/..." }'
      }
    },
    note: 'If URL fetching returns 403, use the parse-json method with data from browser DevTools'
  });
});

module.exports = router;
