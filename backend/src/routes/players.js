const express = require('express');
const { Player, Match } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/players - List players with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { country, role, active } = req.query;
    
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
    
    const players = await Player.find(filter)
      .populate('country', 'name code flagUrl')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: players
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
      data: player
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
      data: player
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
      data: player
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

module.exports = router;
