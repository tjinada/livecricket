const express = require('express');
const { Match, Ball } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Store SSE clients for live updates
const sseClients = new Map();

// GET /api/matches - List matches with filters
router.get('/', async (req, res, next) => {
  try {
    const { status, team, from, to } = req.query;
    
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (team) {
      filter.$or = [{ team1: team }, { team2: team }];
    }
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
    const matches = await Match.find(filter)
      .populate('team1', 'name code flagUrl flagVideo')
      .populate('team2', 'name code flagUrl flagVideo')
      .populate('toss.winner', 'name code')
      .populate('result.winner', 'name code')
      .sort({ date: -1 });
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matches/:id - Get full match details
router.get('/:id', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1', 'name code flagUrl flagVideo')
      .populate('team2', 'name code flagUrl flagVideo')
      .populate('toss.winner', 'name code')
      .populate('result.winner', 'name code')
      .populate('squads.team1.player', 'name role battingStyle bowlingStyle headshotPath')
      .populate('squads.team2.player', 'name role battingStyle bowlingStyle headshotPath')
      .populate('innings.battingTeam', 'name code flagVideo')
      .populate('innings.bowlingTeam', 'name code flagVideo')
      .populate('innings.currentBatsmen.striker', 'name headshotPath')
      .populate('innings.currentBatsmen.nonStriker', 'name headshotPath')
      .populate('innings.currentBowler', 'name headshotPath')
      .populate('innings.battingStats.player', 'name headshotPath')
      .populate('innings.battingStats.dismissal.bowler', 'name headshotPath')
      .populate('innings.battingStats.dismissal.fielder', 'name headshotPath')
      .populate('innings.bowlingStats.player', 'name headshotPath')
      .populate('innings.fallOfWickets.player', 'name headshotPath');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches - Create match (protected)
router.post('/', auth, async (req, res, next) => {
  try {
    const { format, team1, team2, venue, date } = req.body;
    
    // Validate teams are different
    if (team1 === team2) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 and Team 2 must be different'
      });
    }
    
    const match = new Match({
      format,
      team1,
      team2,
      venue,
      date
    });
    
    await match.save();
    
    // Populate teams before returning
    await match.populate('team1', 'name code flagUrl');
    await match.populate('team2', 'name code flagUrl');
    
    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/matches/:id - Update match details (protected)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Only allow updates for upcoming matches
    if (match.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Can only update upcoming matches'
      });
    }
    
    const { format, team1, team2, venue, date } = req.body;
    
    // Validate teams are different
    if (team1 && team2 && team1 === team2) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 and Team 2 must be different'
      });
    }
    
    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { format, team1, team2, venue, date },
      { new: true, runValidators: true }
    )
      .populate('team1', 'name code flagUrl')
      .populate('team2', 'name code flagUrl');
    
    res.json({
      success: true,
      data: updatedMatch
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/matches/:id/squad - Set squad for both teams (protected)
router.put('/:id/squad', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Can only set squad for upcoming matches'
      });
    }
    
    const { team1, team2 } = req.body;
    
    // Validate playing XI count
    const team1PlayingXI = team1?.filter(p => p.isPlayingXI) || [];
    const team2PlayingXI = team2?.filter(p => p.isPlayingXI) || [];
    
    if (team1PlayingXI.length > 0 && team1PlayingXI.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 must have exactly 11 players in playing XI'
      });
    }
    
    if (team2PlayingXI.length > 0 && team2PlayingXI.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'Team 2 must have exactly 11 players in playing XI'
      });
    }
    
    match.squads.team1 = team1 || [];
    match.squads.team2 = team2 || [];
    
    await match.save();
    
    await match.populate('squads.team1.player', 'name role battingStyle bowlingStyle headshotPath');
    await match.populate('squads.team2.player', 'name role battingStyle bowlingStyle headshotPath');
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/matches/:id/toss - Record toss (protected)
router.put('/:id/toss', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Toss already recorded or match in progress'
      });
    }
    
    const { winner, decision } = req.body;
    
    // Validate winner is one of the teams
    if (winner !== match.team1.toString() && winner !== match.team2.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Toss winner must be one of the teams'
      });
    }
    
    match.toss = { winner, decision };
    await match.save();
    
    await match.populate('toss.winner', 'name code');
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/:id/start - Start match (protected)
router.post('/:id/start', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Match already started or completed'
      });
    }
    
    // Validate toss is recorded
    if (!match.toss.winner || !match.toss.decision) {
      return res.status(400).json({
        success: false,
        message: 'Toss must be recorded before starting the match'
      });
    }
    
    // Validate squads are set
    const team1PlayingXI = match.squads.team1.filter(p => p.isPlayingXI);
    const team2PlayingXI = match.squads.team2.filter(p => p.isPlayingXI);
    
    if (team1PlayingXI.length !== 11 || team2PlayingXI.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'Both teams must have 11 players in playing XI'
      });
    }
    
    const { openingBatsmen, openingBowler } = req.body;
    
    if (!openingBatsmen?.striker || !openingBatsmen?.nonStriker || !openingBowler) {
      return res.status(400).json({
        success: false,
        message: 'Opening batsmen and bowler are required'
      });
    }
    
    // Determine batting team based on toss
    let battingTeam, bowlingTeam;
    if (match.toss.decision === 'bat') {
      battingTeam = match.toss.winner;
      bowlingTeam = match.toss.winner.toString() === match.team1.toString() 
        ? match.team2 
        : match.team1;
    } else {
      bowlingTeam = match.toss.winner;
      battingTeam = match.toss.winner.toString() === match.team1.toString() 
        ? match.team2 
        : match.team1;
    }
    
    // Initialize first innings
    match.innings.push({
      battingTeam,
      bowlingTeam,
      inningsNumber: 1,
      status: 'in-progress',
      currentBatsmen: {
        striker: openingBatsmen.striker,
        nonStriker: openingBatsmen.nonStriker
      },
      currentBowler: openingBowler,
      battingStats: [
        { player: openingBatsmen.striker, position: 1 },
        { player: openingBatsmen.nonStriker, position: 2 }
      ],
      bowlingStats: [
        { player: openingBowler }
      ],
      overs: [],
      partnership: {
        runs: 0,
        balls: 0,
        batsman1: openingBatsmen.striker,
        batsman2: openingBatsmen.nonStriker
      }
    });
    
    match.status = 'live';
    match.currentInnings = 0;
    
    await match.save();
    
    // Populate and return
    await match.populate('team1', 'name code flagUrl');
    await match.populate('team2', 'name code flagUrl');
    await match.populate('innings.battingTeam', 'name code');
    await match.populate('innings.bowlingTeam', 'name code');
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/matches/:id/display-view - Change display view (protected)
router.put('/:id/display-view', auth, async (req, res, next) => {
  try {
    const { view } = req.body;
    
    const validViews = ['score-summary', 'player-stats', 'overall-summary', 'projections'];
    if (!validViews.includes(view)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid display view'
      });
    }
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { displayView: view },
      { new: true }
    );
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Broadcast view change to SSE clients
    broadcastToMatch(req.params.id, 'view-change', { view });
    
    res.json({
      success: true,
      data: { displayView: match.displayView }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/matches/:id - Delete match (protected)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Only allow deletion of upcoming matches
    if (match.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete upcoming matches'
      });
    }
    
    // Check if any balls have been recorded
    const ballCount = await Ball.countDocuments({ match: req.params.id });
    if (ballCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete match with recorded balls'
      });
    }
    
    await Match.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/matches/:id/backgrounds - Update match backgrounds (protected)
router.put('/:id/backgrounds', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    const { useTeamBackground, views } = req.body;
    
    // Initialize backgrounds if not exists
    if (!match.backgrounds) {
      match.backgrounds = {
        useTeamBackground: true,
        views: {}
      };
    }
    
    // Update useTeamBackground flag
    if (typeof useTeamBackground === 'boolean') {
      match.backgrounds.useTeamBackground = useTeamBackground;
    }
    
    // Update view-specific backgrounds
    if (views) {
      const validViews = ['score-summary', 'player-stats', 'overall-summary', 'projections'];
      
      for (const view of validViews) {
        if (views[view]) {
          if (!match.backgrounds.views) {
            match.backgrounds.views = {};
          }
          match.backgrounds.views[view] = {
            type: views[view].type || 'none',
            url: views[view].url || null
          };
        }
      }
    }
    
    await match.save();
    
    // Broadcast background change to display clients
    broadcastToMatch(req.params.id, 'background-change', { backgrounds: match.backgrounds });
    
    res.json({
      success: true,
      data: { backgrounds: match.backgrounds }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matches/:id/live - SSE endpoint for live updates
router.get('/:id/live', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Generate client ID
    const clientId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Add client to subscribers
    if (!sseClients.has(req.params.id)) {
      sseClients.set(req.params.id, new Map());
    }
    sseClients.get(req.params.id).set(clientId, res);
    
    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);
    
    // Send current match state
    res.write(`event: match-state\ndata: ${JSON.stringify({ displayView: match.displayView })}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
      const matchClients = sseClients.get(req.params.id);
      if (matchClients) {
        matchClients.delete(clientId);
        if (matchClients.size === 0) {
          sseClients.delete(req.params.id);
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to broadcast to all SSE clients for a match
function broadcastToMatch(matchId, event, data) {
  const matchClients = sseClients.get(matchId);
  if (matchClients) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    matchClients.forEach((client) => {
      client.write(message);
    });
  }
}

// Export broadcast function for use in scoring routes
router.broadcastToMatch = broadcastToMatch;

// POST /api/matches/:id/notification - Send display notifications
router.post('/:id/notification', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    const { type, data } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Notification type is required'
      });
    }
    
    // Validate notification type
    const validTypes = [
      'third-umpire-start',
      'third-umpire-decision',
      'custom-message',
      'custom-message-dismiss'
    ];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type'
      });
    }
    
    // Broadcast the notification to all display clients
    broadcastToMatch(req.params.id, type, data || {});
    
    res.json({
      success: true,
      message: 'Notification sent'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
