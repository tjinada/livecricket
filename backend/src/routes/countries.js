const express = require('express');
const { Country, Player, Match } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/countries - List all countries
router.get('/', async (req, res, next) => {
  try {
    const countries = await Country.find().sort({ name: 1 });
    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/countries/:id - Get single country
router.get('/:id', async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }
    res.json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/countries - Create country (protected)
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, code, flagUrl } = req.body;
    
    const country = new Country({
      name,
      code,
      flagUrl
    });
    
    await country.save();
    
    res.status(201).json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/countries/:id - Update country (protected)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { name, code, flagUrl, background } = req.body;
    
    const updateData = { name, code, flagUrl };
    
    // Handle background update
    if (background) {
      updateData.background = {
        type: background.type || 'none',
        url: background.url || null
      };
    }
    
    const country = await Country.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }
    
    res.json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/countries/:id - Delete country (protected)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    // Check if country has players
    const playerCount = await Player.countDocuments({ country: req.params.id });
    if (playerCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete country. ${playerCount} player(s) are associated with this country.`
      });
    }
    
    // Check if country is in any match
    const matchCount = await Match.countDocuments({
      $or: [{ team1: req.params.id }, { team2: req.params.id }]
    });
    if (matchCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete country. ${matchCount} match(es) are associated with this country.`
      });
    }
    
    const country = await Country.findByIdAndDelete(req.params.id);
    
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Country deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
