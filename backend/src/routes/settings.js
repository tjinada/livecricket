const express = require('express');
const router = express.Router();
const { Settings } = require('../models');
const { SETTING_KEYS } = require('../models/Settings');

// GET /api/settings/backgrounds - Get default backgrounds for all views
router.get('/backgrounds', async (req, res) => {
  try {
    const backgrounds = await Settings.getSetting(SETTING_KEYS.DEFAULT_BACKGROUNDS, {
      'live-score': { type: 'none', url: null },
      'live-match-summary': { type: 'none', url: null },
      'run-rate-graph': { type: 'none', url: null },
      'current-partnership': { type: 'none', url: null },
      'final-match-summary': { type: 'none', url: null }
    });

    res.json({
      success: true,
      data: backgrounds
    });
  } catch (error) {
    console.error('Error fetching default backgrounds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default backgrounds',
      error: error.message
    });
  }
});

// PUT /api/settings/backgrounds - Update default backgrounds
router.put('/backgrounds', async (req, res) => {
  try {
    const { backgrounds } = req.body;

    if (!backgrounds) {
      return res.status(400).json({
        success: false,
        message: 'Backgrounds data is required'
      });
    }

    // Validate structure
    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary'];
    const validTypes = ['image', 'video', 'none'];

    for (const view of validViews) {
      if (backgrounds[view]) {
        if (backgrounds[view].type && !validTypes.includes(backgrounds[view].type)) {
          return res.status(400).json({
            success: false,
            message: `Invalid background type for ${view}. Must be one of: ${validTypes.join(', ')}`
          });
        }
      }
    }

    // Merge with existing backgrounds
    const existing = await Settings.getSetting(SETTING_KEYS.DEFAULT_BACKGROUNDS, {});
    const merged = { ...existing, ...backgrounds };

    await Settings.setSetting(
      SETTING_KEYS.DEFAULT_BACKGROUNDS,
      merged,
      'Default base backgrounds for each display view (flags overlay on top)'
    );

    res.json({
      success: true,
      message: 'Default backgrounds updated successfully',
      data: merged
    });
  } catch (error) {
    console.error('Error updating default backgrounds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update default backgrounds',
      error: error.message
    });
  }
});

// PUT /api/settings/backgrounds/:view - Update single view background
router.put('/backgrounds/:view', async (req, res) => {
  try {
    const { view } = req.params;
    const { type, url } = req.body;

    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary'];
    if (!validViews.includes(view)) {
      return res.status(400).json({
        success: false,
        message: `Invalid view. Must be one of: ${validViews.join(', ')}`
      });
    }

    const validTypes = ['image', 'video', 'none'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid background type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const existing = await Settings.getSetting(SETTING_KEYS.DEFAULT_BACKGROUNDS, {});
    existing[view] = { type: type || 'none', url: url || null };

    await Settings.setSetting(
      SETTING_KEYS.DEFAULT_BACKGROUNDS,
      existing,
      'Default base backgrounds for each display view (flags overlay on top)'
    );

    res.json({
      success: true,
      message: `Background for ${view} updated successfully`,
      data: existing
    });
  } catch (error) {
    console.error('Error updating view background:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update view background',
      error: error.message
    });
  }
});

// DELETE /api/settings/backgrounds/:view - Remove background for a view
router.delete('/backgrounds/:view', async (req, res) => {
  try {
    const { view } = req.params;

    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary'];
    if (!validViews.includes(view)) {
      return res.status(400).json({
        success: false,
        message: `Invalid view. Must be one of: ${validViews.join(', ')}`
      });
    }

    const existing = await Settings.getSetting(SETTING_KEYS.DEFAULT_BACKGROUNDS, {});
    existing[view] = { type: 'none', url: null };

    await Settings.setSetting(SETTING_KEYS.DEFAULT_BACKGROUNDS, existing);

    res.json({
      success: true,
      message: `Background for ${view} removed successfully`,
      data: existing
    });
  } catch (error) {
    console.error('Error removing view background:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove view background',
      error: error.message
    });
  }
});

module.exports = router;
