const express = require('express');
const { Player, Match, Country } = require('../models');
const auth = require('../middleware/auth');
const { addImageUrl } = require('../utils/imageUrl');

// ESPN Cricinfo to our schema mapping utilities
const mapRole = (playingRoles) => {
  if (!playingRoles || playingRoles.length === 0) return 'batsman';
  
  const role = playingRoles[0].toLowerCase();
  const roleMapping = {
    'opening batter': 'batsman',
    'top-order batter': 'batsman',
    'middle-order batter': 'batsman',
    'batter': 'batsman',
    'wicketkeeper batter': 'wicket-keeper',
    'wicketkeeper': 'wicket-keeper',
    'bowler': 'bowler',
    'allrounder': 'all-rounder',
    'batting allrounder': 'all-rounder',
    'bowling allrounder': 'all-rounder'
  };
  
  return roleMapping[role] || 'batsman';
};

const mapBattingStyle = (styles) => {
  if (!styles || styles.length === 0) return 'right-hand';
  const style = styles[0].toLowerCase();
  return style.includes('left') ? 'left-hand' : 'right-hand';
};

const mapBowlingStyle = (styles) => {
  if (!styles || styles.length === 0) return 'none';
  
  const style = styles[0].toLowerCase();
  
  // Fast bowlers
  if (style.includes('right-arm fast-medium') || style.includes('right-arm medium-fast')) {
    return 'right-arm-fast';
  }
  if (style.includes('right-arm fast')) {
    return 'right-arm-fast';
  }
  if (style.includes('right-arm medium')) {
    return 'right-arm-medium';
  }
  if (style.includes('left-arm fast-medium') || style.includes('left-arm medium-fast')) {
    return 'left-arm-fast';
  }
  if (style.includes('left-arm fast')) {
    return 'left-arm-fast';
  }
  if (style.includes('left-arm medium')) {
    return 'left-arm-medium';
  }
  
  // Spinners
  if (style.includes('offbreak') || style.includes('off-break') || style.includes('off break')) {
    return 'right-arm-off-spin';
  }
  if (style.includes('legbreak') || style.includes('leg-break') || style.includes('leg break')) {
    return 'right-arm-leg-spin';
  }
  if (style.includes('slow left-arm orthodox') || style.includes('left-arm orthodox')) {
    return 'left-arm-orthodox';
  }
  if (style.includes('chinaman') || style.includes('left-arm wrist')) {
    return 'left-arm-chinaman';
  }
  
  return 'none';
};



const router = express.Router();

// GET /api/players - List players with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { country, role, active, gender } = req.query;
    
    const filter = {};
    
    if (country) {
      filter.country = country;
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    
    if (gender) {
      filter.gender = gender;
    }
    
    const players = await Player.find(filter)
      .populate('country', 'name code flagUrl')
      .sort({ name: 1 });
    
    // Add image URLs to each player
    const playersWithImages = players.map(player => addImageUrl(player));
    
    res.json({
      success: true,
      data: playersWithImages
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/players/:id - Get single player
router.get('/:id', async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('country', 'name code flagUrl');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    res.json({
      success: true,
      data: addImageUrl(player)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/players - Create player (protected)
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, country, role, battingStyle, bowlingStyle } = req.body;
    
    const player = new Player({
      name,
      country,
      role,
      battingStyle,
      bowlingStyle
    });
    
    await player.save();
    
    // Populate country before returning
    await player.populate('country', 'name code flagUrl');
    
    res.status(201).json({
      success: true,
      data: addImageUrl(player)
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/players/:id - Update player (protected)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { name, country, role, battingStyle, bowlingStyle, isActive } = req.body;
    
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { name, country, role, battingStyle, bowlingStyle, isActive },
      { new: true, runValidators: true }
    ).populate('country', 'name code flagUrl');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    res.json({
      success: true,
      data: addImageUrl(player)
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/players/:id - Delete player (protected)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    // Check if player is in any match squad
    const matchCount = await Match.countDocuments({
      $or: [
        { 'squads.team1.player': req.params.id },
        { 'squads.team2.player': req.params.id }
      ]
    });
    
    if (matchCount > 0) {
      // Soft delete - just mark as inactive
      const player = await Player.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }
      
      return res.json({
        success: true,
        message: 'Player deactivated (has match history)',
        data: player
      });
    }
    
    // Hard delete if no match history
    const player = await Player.findByIdAndDelete(req.params.id);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/players/bulk-import - Bulk import players from ESPN Cricinfo JSON (protected)
router.post('/bulk-import', auth, async (req, res, next) => {
  try {
    const { countryId, players: espnData } = req.body;
    
    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: 'Country ID is required'
      });
    }
    
    if (!espnData) {
      return res.status(400).json({
        success: false,
        message: 'Players data is required'
      });
    }
    
    // Handle both formats: full ESPN response object OR just the results array
    let espnPlayers;
    if (Array.isArray(espnData)) {
      // Already an array
      espnPlayers = espnData;
    } else if (espnData.results && Array.isArray(espnData.results)) {
      // Full ESPN response object with results array
      espnPlayers = espnData.results;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format: expected an array of players or ESPN response object with results array'
      });
    }
    
    if (espnPlayers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Players array is empty'
      });
    }
    
    // Verify country exists
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      menImported: 0,
      womenImported: 0,
      errors: []
    };
    
    // Process all players with valid gender (M or F)
    const validPlayers = espnPlayers.filter(p => p.gender === 'M' || p.gender === 'F');
    
    for (const espnPlayer of validPlayers) {
      try {
        const playerName = espnPlayer.longName || espnPlayer.name;
        
        if (!playerName) {
          results.skipped++;
          results.errors.push({ name: 'Unknown', reason: 'No name provided' });
          continue;
        }
        
        const playerData = {
          name: playerName,
          country: countryId,
          role: mapRole(espnPlayer.playingRoles),
          battingStyle: mapBattingStyle(espnPlayer.longBattingStyles),
          bowlingStyle: mapBowlingStyle(espnPlayer.longBowlingStyles),
          headshotPath: espnPlayer.headshotImageUrl || espnPlayer.imageUrl || espnPlayer.image?.url || null,
          espnId: espnPlayer.id, // Store ESPN ID for reference
          gender: espnPlayer.gender, // Store gender (M or F)
          isActive: true
        };
        
        // Try to find existing player by name, country, and gender
        const existingPlayer = await Player.findOne({
          name: playerName,
          country: countryId,
          gender: espnPlayer.gender
        });
        
        if (existingPlayer) {
          // Update existing player
          await Player.findByIdAndUpdate(existingPlayer._id, playerData);
          results.updated++;
        } else {
          // Create new player
          const newPlayer = new Player(playerData);
          await newPlayer.save();
          results.created++;
        }
        
        // Track gender counts
        if (espnPlayer.gender === 'M') {
          results.menImported++;
        } else {
          results.womenImported++;
        }
      } catch (playerError) {
        results.skipped++;
        results.errors.push({
          name: espnPlayer.longName || espnPlayer.name || 'Unknown',
          reason: playerError.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/players/bulk-delete/:countryId - Delete all players for a country (protected)
router.delete('/bulk-delete/:countryId', auth, async (req, res, next) => {
  try {
    const { countryId } = req.params;
    
    // Verify country exists
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }
    
    // Check if any players are in match squads
    const playersInMatches = await Player.find({ country: countryId });
    const playerIds = playersInMatches.map(p => p._id);
    
    const matchCount = await Match.countDocuments({
      $or: [
        { 'squads.team1.player': { $in: playerIds } },
        { 'squads.team2.player': { $in: playerIds } }
      ]
    });
    
    if (matchCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete players. Some players are in ${matchCount} match squad(s).`
      });
    }
    
    // Delete all players for this country
    const result = await Player.deleteMany({ country: countryId });
    
    res.json({
      success: true,
      message: `${result.deletedCount} player(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
