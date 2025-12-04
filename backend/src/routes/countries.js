const express = require('express');
const { Country, Player, Match } = require('../models');
const auth = require('../middleware/auth');
const { getFlagUrl } = require('../utils/flagUtils');

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

// POST /api/countries - Create country (protected)
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, code, flagUrl } = req.body;
    
    // Auto-populate flagUrl if not provided
    const resolvedFlagUrl = flagUrl || getFlagUrl(code);
    
    const country = new Country({
      name,
      code,
      flagUrl: resolvedFlagUrl
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

// POST /api/countries/auto-populate-flags - Auto-populate flag URLs for countries without flags (protected)
router.post('/auto-populate-flags', auth, async (req, res, next) => {
  try {
    const countries = await Country.find();
    let updated = 0;
    
    for (const country of countries) {
      const flagUrl = getFlagUrl(country.code);
      if (flagUrl && !country.flagUrl) {
        country.flagUrl = flagUrl;
        await country.save();
        updated++;
      }
    }
    
    res.json({
      success: true,
      message: `Auto-populated flag URLs for ${updated} countries`,
      updated
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/countries/refresh-flags - Refresh all flag URLs (overwrites existing) (protected)
router.post('/refresh-flags', auth, async (req, res, next) => {
  try {
    const countries = await Country.find();
    let updated = 0;
    const results = [];
    
    for (const country of countries) {
      const flagUrl = getFlagUrl(country.code);
      if (flagUrl) {
        country.flagUrl = flagUrl;
        await country.save();
        updated++;
        results.push({ code: country.code, name: country.name, flagUrl });
      } else {
        results.push({ code: country.code, name: country.name, flagUrl: null, error: 'No mapping found' });
      }
    }
    
    res.json({
      success: true,
      message: `Refreshed flag URLs for ${updated} countries`,
      updated,
      results
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

// PUT /api/countries/:id - Update country (protected)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { name, code, flagUrl, flagVideo, background } = req.body;
    
    // Auto-populate flagUrl if code is provided but flagUrl is not
    const resolvedFlagUrl = flagUrl !== undefined ? flagUrl : (code ? getFlagUrl(code) : undefined);
    
    const updateData = { name, code };
    if (resolvedFlagUrl !== undefined) {
      updateData.flagUrl = resolvedFlagUrl;
    }
    
    // Handle flagVideo update (animated flag for display overlay)
    if (flagVideo !== undefined) {
      updateData.flagVideo = flagVideo;
    }
    
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
// Query param: ?cascade=true to delete all players as well
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { cascade } = req.query;
    
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
    
    // Check if country has players
    const playerCount = await Player.countDocuments({ country: req.params.id });
    
    if (playerCount > 0 && cascade !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete country. ${playerCount} player(s) are associated with this country. Use cascade=true to delete players as well.`,
        playerCount
      });
    }
    
    // If cascade, delete all players first
    let deletedPlayersCount = 0;
    if (cascade === 'true' && playerCount > 0) {
      const result = await Player.deleteMany({ country: req.params.id });
      deletedPlayersCount = result.deletedCount;
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
      message: deletedPlayersCount > 0 
        ? `Country and ${deletedPlayersCount} player(s) deleted successfully`
        : 'Country deleted successfully',
      deletedPlayersCount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
