/**
 * Seed Routes
 * 
 * Admin routes for managing mock data (only available when USE_MOCK_DATA=true)
 */

const express = require('express');
const auth = require('../middleware/auth');
const config = require('../config');
const { seedMockData, reseedMockData, clearData, hasMockData } = require('../seed/mockData');

const router = express.Router();

// Middleware to check if mock data mode is enabled
const checkMockDataMode = (req, res, next) => {
  if (!config.useMockData) {
    return res.status(403).json({
      success: false,
      message: 'Mock data mode is disabled. Set USE_MOCK_DATA=true in .env to enable.'
    });
  }
  next();
};

/**
 * GET /api/seed/status
 * Check seed status
 */
router.get('/status', checkMockDataMode, async (req, res, next) => {
  try {
    const hasData = await hasMockData();
    res.json({
      success: true,
      data: {
        mockDataMode: config.useMockData,
        hasData: hasData
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/seed
 * Seed mock data (only if no data exists)
 */
router.post('/', auth, checkMockDataMode, async (req, res, next) => {
  try {
    const result = await seedMockData();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/seed/reseed
 * Clear and reseed mock data
 */
router.post('/reseed', auth, checkMockDataMode, async (req, res, next) => {
  try {
    const result = await reseedMockData();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/seed
 * Clear all data
 */
router.delete('/', auth, checkMockDataMode, async (req, res, next) => {
  try {
    await clearData();
    res.json({
      success: true,
      message: 'All data cleared'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
