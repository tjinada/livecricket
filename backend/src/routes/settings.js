const express = require('express');
const router = express.Router();
const { Settings } = require('../models');
const { SETTING_KEYS } = require('../models/Settings');
const { 
  getConfig, 
  updateConfig, 
  resetConfig 
} = require('../config/highlightConfig');

// GET /api/settings/backgrounds - Get default backgrounds for all views
router.get('/backgrounds', async (req, res) => {
  try {
    const backgrounds = await Settings.getSetting(SETTING_KEYS.DEFAULT_BACKGROUNDS, {
      'live-score': { type: 'none', url: null },
      'live-match-summary': { type: 'none', url: null },
      'run-rate-graph': { type: 'none', url: null },
      'current-partnership': { type: 'none', url: null },
      'final-match-summary': { type: 'none', url: null },
      'player-stats': { type: 'none', url: null }
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
    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary', 'player-stats'];
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

    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary', 'player-stats'];
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

    const validViews = ['live-score', 'live-match-summary', 'run-rate-graph', 'current-partnership', 'final-match-summary', 'player-stats'];
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

// ==================== HIGHLIGHT CONFIG ENDPOINTS ====================

/**
 * GET /api/settings/highlights
 * Get current highlight configuration
 */
router.get('/highlights', async (req, res) => {
  try {
    const config = getConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching highlight config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch highlight configuration',
      error: error.message
    });
  }
});

/**
 * PUT /api/settings/highlights
 * Update highlight configuration
 * Body can contain partial updates - only specified fields will be updated
 * 
 * Example body:
 * {
 *   "durations": {
 *     "four": 3000,
 *     "six": 4000
 *   },
 *   "overlayGap": {
 *     "duration": 2500
 *   }
 * }
 */
router.put('/highlights', async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No configuration updates provided'
      });
    }
    
    const updatedConfig = updateConfig(updates);
    
    res.json({
      success: true,
      message: 'Highlight configuration updated successfully',
      data: updatedConfig
    });
  } catch (error) {
    console.error('Error updating highlight config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update highlight configuration',
      error: error.message
    });
  }
});

/**
 * POST /api/settings/highlights/reset
 * Reset highlight configuration to defaults
 */
router.post('/highlights/reset', async (req, res) => {
  try {
    const defaultConfig = resetConfig();
    
    res.json({
      success: true,
      message: 'Highlight configuration reset to defaults',
      data: defaultConfig
    });
  } catch (error) {
    console.error('Error resetting highlight config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset highlight configuration',
      error: error.message
    });
  }
});

/**
 * PUT /api/settings/highlights/durations
 * Update only duration settings
 * 
 * Example body:
 * {
 *   "four": 3000,
 *   "six": 4000,
 *   "wicket": 5000
 * }
 */
router.put('/highlights/durations', async (req, res) => {
  try {
    const durations = req.body;
    
    if (!durations || Object.keys(durations).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No duration updates provided'
      });
    }
    
    const updatedConfig = updateConfig({ durations });
    
    res.json({
      success: true,
      message: 'Highlight durations updated successfully',
      data: updatedConfig.durations
    });
  } catch (error) {
    console.error('Error updating highlight durations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update highlight durations',
      error: error.message
    });
  }
});

/**
 * PUT /api/settings/highlights/overlay-gap
 * Update overlay gap settings
 * 
 * Example body:
 * {
 *   "duration": 2500,
 *   "applyToTypes": ["four", "six", "wicket"]
 * }
 */
router.put('/highlights/overlay-gap', async (req, res) => {
  try {
    const overlayGap = req.body;
    
    if (!overlayGap || Object.keys(overlayGap).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No overlay gap updates provided'
      });
    }
    
    const updatedConfig = updateConfig({ overlayGap });
    
    res.json({
      success: true,
      message: 'Overlay gap settings updated successfully',
      data: updatedConfig.overlayGap
    });
  } catch (error) {
    console.error('Error updating overlay gap settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update overlay gap settings',
      error: error.message
    });
  }
});

/**
 * PUT /api/settings/highlights/live-notifications
 * Update live scoring notification settings
 * 
 * Example body:
 * {
 *   "duration": 3000,
 *   "cooldownBetween": 2000
 * }
 */
router.put('/highlights/live-notifications', async (req, res) => {
  try {
    const liveNotifications = req.body;
    
    if (!liveNotifications || Object.keys(liveNotifications).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No live notification updates provided'
      });
    }
    
    const updatedConfig = updateConfig({ liveNotifications });
    
    res.json({
      success: true,
      message: 'Live notification settings updated successfully',
      data: updatedConfig.liveNotifications
    });
  } catch (error) {
    console.error('Error updating live notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update live notification settings',
      error: error.message
    });
  }
});

module.exports = router;
