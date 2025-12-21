const express = require('express');
const { Match, Ball } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Store SSE clients for live updates
const sseClients = new Map();

// Store update version per match (increments on each broadcast)
// This allows clients to detect missed updates
const matchVersions = new Map();

// Heartbeat interval (15 seconds) - more frequent for better detection
const HEARTBEAT_INTERVAL = 15000;

// Get current version for a match
function getMatchVersion(matchId) {
  if (!matchVersions.has(matchId)) {
    matchVersions.set(matchId, 0);
  }
  return matchVersions.get(matchId);
}

// Increment and return new version for a match
function incrementMatchVersion(matchId) {
  const newVersion = getMatchVersion(matchId) + 1;
  matchVersions.set(matchId, newVersion);
  return newVersion;
}

// Send heartbeat to all connected clients
setInterval(() => {
  sseClients.forEach((clients, matchId) => {
    const version = getMatchVersion(matchId);
    clients.forEach((client, clientId) => {
      try {
        client.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now(), version })}\n\n`);
      } catch (error) {
        // Client disconnected, remove from list
        clients.delete(clientId);
        if (clients.size === 0) {
          sseClients.delete(matchId);
        }
      }
    });
  });
}, HEARTBEAT_INTERVAL);

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
      .populate('innings.battingTeam', 'name code flagUrl flagVideo')
      .populate('innings.bowlingTeam', 'name code flagUrl flagVideo')
      .populate('innings.currentBatsmen.striker', 'name headshotPath')
      .populate('innings.currentBatsmen.nonStriker', 'name headshotPath')
      .populate('innings.currentBowler', 'name headshotPath')
      .populate('innings.battingStats.player', 'name headshotPath')
      .populate('innings.battingStats.dismissal.bowler', 'name headshotPath')
      .populate('innings.battingStats.dismissal.fielder', 'name headshotPath')
      .populate('innings.bowlingStats.player', 'name headshotPath')
      .populate('innings.fallOfWickets.player', 'name headshotPath')
      .populate('selectedPlayerForStats', 'name role battingStyle bowlingStyle headshotPath');
    
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
    const { format, team1, team2, venue, date, gender, title } = req.body;
    
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
      date,
      gender: gender || 'men',
      title: title || null  // Will be generated on frontend if not provided
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
    
    const { format, team1, team2, venue, date, title } = req.body;
    
    // Validate teams are different
    if (team1 && team2 && team1 === team2) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 and Team 2 must be different'
      });
    }
    
    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { format, team1, team2, venue, date, title },
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

// PUT /api/matches/:id/title - Update match title (protected, works for any match status)
router.put('/:id/title', auth, async (req, res, next) => {
  try {
    const { title } = req.body;
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { title },
      { new: true, runValidators: true }
    )
      .populate('team1', 'name code flagUrl')
      .populate('team2', 'name code flagUrl');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Broadcast title change to display clients
    broadcastToMatch(req.params.id, 'title-change', { title: match.title });
    
    res.json({
      success: true,
      data: match
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
    
    // Validate squad size (min 11, max 15 per team)
    if (team1 && team1.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 squad cannot exceed 15 players'
      });
    }
    
    if (team2 && team2.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Team 2 squad cannot exceed 15 players'
      });
    }
    
    // Validate minimum squad size (at least 11 players per team)
    if (team1 && team1.length > 0 && team1.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'Team 1 must have at least 11 players in squad'
      });
    }
    
    if (team2 && team2.length > 0 && team2.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'Team 2 must have at least 11 players in squad'
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
    
    // Validate squads are set (minimum 11 players per team)
    const team1Squad = match.squads.team1 || [];
    const team2Squad = match.squads.team2 || [];
    
    if (team1Squad.length < 11 || team2Squad.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'Both teams must have at least 11 players in squad'
      });
    }
    
    const { openingBatsmen, openingBowler } = req.body;
    
    // Opening batsmen and bowler are optional - can be set later in scoring screen
    const hasStriker = openingBatsmen?.striker;
    const hasNonStriker = openingBatsmen?.nonStriker;
    const hasBowler = openingBowler;
    
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
    
    // Build batting stats array based on what's provided
    const battingStats = [];
    if (hasStriker) {
      battingStats.push({ player: openingBatsmen.striker, position: 1 });
    }
    if (hasNonStriker) {
      battingStats.push({ player: openingBatsmen.nonStriker, position: 2 });
    }
    
    // Build bowling stats array based on what's provided
    const bowlingStats = [];
    if (hasBowler) {
      bowlingStats.push({ player: openingBowler });
    }
    
    // Build partnership object (only if both batsmen are set)
    const partnership = (hasStriker && hasNonStriker) ? {
      runs: 0,
      balls: 0,
      batsman1: openingBatsmen.striker,
      batsman2: openingBatsmen.nonStriker
    } : null;
    
    // Initialize first innings
    match.innings.push({
      battingTeam,
      bowlingTeam,
      inningsNumber: 1,
      status: 'in-progress',
      currentBatsmen: {
        striker: hasStriker ? openingBatsmen.striker : null,
        nonStriker: hasNonStriker ? openingBatsmen.nonStriker : null
      },
      currentBowler: hasBowler ? openingBowler : null,
      battingStats,
      bowlingStats,
      overs: [],
      partnership
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
    const { view, selectedPlayer, innings } = req.body;
    
    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary', 'player-stats', 'highlight-video', 'starting-xi-team1', 'starting-xi-team2', 'toss-screen'];
    if (!validViews.includes(view)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid display view'
      });
    }
    
    // Build update object
    const updateData = { displayView: view };
    
    // If switching to player-stats view and a player is provided, set it
    if (view === 'player-stats' && selectedPlayer) {
      updateData.selectedPlayerForStats = selectedPlayer;
    }
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('selectedPlayerForStats', 'name role battingStyle bowlingStyle headshotPath');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Broadcast view change to SSE clients
    const broadcastData = { view };
    if (view === 'player-stats' && match.selectedPlayerForStats) {
      broadcastData.selectedPlayer = match.selectedPlayerForStats;
    }
    // Include innings parameter for highlight-video view
    if (view === 'highlight-video' && innings !== undefined) {
      broadcastData.innings = innings;
    }
    broadcastToMatch(req.params.id, 'view-change', broadcastData);
    
    res.json({
      success: true,
      data: { 
        displayView: match.displayView,
        selectedPlayerForStats: match.selectedPlayerForStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/matches/:id/selected-player - Set selected player for player-stats view (protected)
router.put('/:id/selected-player', auth, async (req, res, next) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is required'
      });
    }
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { selectedPlayerForStats: playerId },
      { new: true }
    ).populate('selectedPlayerForStats', 'name role battingStyle bowlingStyle headshotPath');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    // Broadcast selected player change to SSE clients
    broadcastToMatch(req.params.id, 'player-stats-change', { 
      selectedPlayer: match.selectedPlayerForStats 
    });
    
    res.json({
      success: true,
      data: { selectedPlayerForStats: match.selectedPlayerForStats }
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
    
    // Delete all associated ball records
    const ballDeleteResult = await Ball.deleteMany({ match: req.params.id });
    
    // Delete the match
    await Match.findByIdAndDelete(req.params.id);
    
    // Clean up SSE clients for this match
    if (sseClients.has(req.params.id)) {
      sseClients.delete(req.params.id);
    }
    if (matchVersions.has(req.params.id)) {
      matchVersions.delete(req.params.id);
    }
    
    res.json({
      success: true,
      message: `Match deleted successfully${ballDeleteResult.deletedCount > 0 ? ` (${ballDeleteResult.deletedCount} ball records removed)` : ''}`
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
      const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary'];
      
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
    
    // Get current version for this match
    const version = getMatchVersion(req.params.id);
    
    // Send initial connection event with version
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, version })}\n\n`);
    
    // Send current match state with version
    res.write(`event: match-state\ndata: ${JSON.stringify({ 
      displayView: match.displayView,
      _version: version,
      _timestamp: Date.now()
    })}\n\n`);
    
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
  if (matchClients && matchClients.size > 0) {
    // Increment version on each broadcast
    const version = incrementMatchVersion(matchId);
    const enrichedData = { ...data, _version: version, _timestamp: Date.now() };
    const message = `event: ${event}\ndata: ${JSON.stringify(enrichedData)}\n\n`;
    
    matchClients.forEach((client, clientId) => {
      try {
        client.write(message);
      } catch (error) {
        // Client disconnected during write, remove it
        console.log(`SSE: Removing disconnected client ${clientId}`);
        matchClients.delete(clientId);
        if (matchClients.size === 0) {
          sseClients.delete(matchId);
        }
      }
    });
  }
}

// Export broadcast function and version getter for use in scoring routes
router.broadcastToMatch = broadcastToMatch;
router.getMatchVersion = getMatchVersion;

// PUT /api/matches/:id/substitute - Substitute a player in the squad (protected)
router.put('/:id/substitute', auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    if (match.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot substitute in a completed match'
      });
    }
    
    const { team, playerOut, playerIn } = req.body;
    
    if (!team || !playerOut || !playerIn) {
      return res.status(400).json({
        success: false,
        message: 'Team, playerOut, and playerIn are required'
      });
    }
    
    if (team !== 'team1' && team !== 'team2') {
      return res.status(400).json({
        success: false,
        message: 'Invalid team'
      });
    }
    
    const squad = match.squads[team];
    
    // Find the player to replace (from Playing XI)
    const playerOutIndex = squad.findIndex(p => 
      p.player.toString() === playerOut
    );
    
    if (playerOutIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Player to replace not found in squad'
      });
    }
    
    // Check if playerOut is in Playing XI
    if (!squad[playerOutIndex].isPlayingXI) {
      return res.status(400).json({
        success: false,
        message: 'Player to replace must be in Playing XI'
      });
    }
    
    // Find the replacement player (should be a reserve in the squad)
    const playerInIndex = squad.findIndex(p => p.player.toString() === playerIn);
    
    if (playerInIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Replacement player not found in squad reserves'
      });
    }
    
    // Check if playerIn is a reserve (not in Playing XI)
    if (squad[playerInIndex].isPlayingXI) {
      return res.status(400).json({
        success: false,
        message: 'Replacement player must be a reserve (not already in Playing XI)'
      });
    }
    
    // Swap their positions: playerOut becomes reserve, playerIn becomes Playing XI
    const outgoingBattingOrder = squad[playerOutIndex].battingOrder;
    const incomingBattingOrder = squad[playerInIndex].battingOrder;
    
    // PlayerOut moves to reserves with the reserve's batting order
    squad[playerOutIndex].isPlayingXI = false;
    squad[playerOutIndex].battingOrder = incomingBattingOrder;
    
    // PlayerIn moves to Playing XI with the Playing XI batting order
    squad[playerInIndex].isPlayingXI = true;
    squad[playerInIndex].battingOrder = outgoingBattingOrder;
    
    // Update current innings if player is on field
    if (match.status === 'live' && match.innings && match.innings.length > 0) {
      const currentInnings = match.innings[match.currentInnings];
      
      if (currentInnings) {
        // Check if the player being replaced is currently batting
        if (currentInnings.currentBatsmen?.striker?.toString() === playerOut) {
          currentInnings.currentBatsmen.striker = playerIn;
        }
        if (currentInnings.currentBatsmen?.nonStriker?.toString() === playerOut) {
          currentInnings.currentBatsmen.nonStriker = playerIn;
        }
        
        // Check if the player being replaced is currently bowling
        if (currentInnings.currentBowler?.toString() === playerOut) {
          currentInnings.currentBowler = playerIn;
        }
        
        // Update batting stats if player has batted
        const battingStatIndex = currentInnings.battingStats?.findIndex(
          bs => bs.player?.toString() === playerOut
        );
        if (battingStatIndex !== -1 && battingStatIndex !== undefined) {
          currentInnings.battingStats[battingStatIndex].player = playerIn;
        }
        
        // Update bowling stats if player has bowled
        const bowlingStatIndex = currentInnings.bowlingStats?.findIndex(
          bs => bs.player?.toString() === playerOut
        );
        if (bowlingStatIndex !== -1 && bowlingStatIndex !== undefined) {
          currentInnings.bowlingStats[bowlingStatIndex].player = playerIn;
        }
        
        // Update partnership reference
        if (currentInnings.partnership?.batsman1?.toString() === playerOut) {
          currentInnings.partnership.batsman1 = playerIn;
        }
        if (currentInnings.partnership?.batsman2?.toString() === playerOut) {
          currentInnings.partnership.batsman2 = playerIn;
        }
      }
    }
    
    await match.save();
    
    // Populate and return
    await match.populate('squads.team1.player', 'name role battingStyle bowlingStyle headshotPath');
    await match.populate('squads.team2.player', 'name role battingStyle bowlingStyle headshotPath');
    
    // Broadcast update to SSE clients
    broadcastToMatch(req.params.id, 'squad-change', { team, playerOut, playerIn });
    
    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
});

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

// GET /api/matches/:id/sync-check - Lightweight sync check endpoint
// Returns current version and last update timestamp for fast sync verification
router.get('/:id/sync-check', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .select('updatedAt status displayView');
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }
    
    const version = getMatchVersion(req.params.id);
    
    res.json({
      success: true,
      data: {
        version,
        updatedAt: match.updatedAt,
        status: match.status,
        displayView: match.displayView,
        serverTime: Date.now()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
