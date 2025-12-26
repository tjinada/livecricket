/**
 * Mock Management Routes
 * 
 * Provides endpoints to manage mock state during development/testing.
 * 
 * Endpoints:
 *   GET  /api/espn/mock/scenarios    - List available scenarios
 *   GET  /api/espn/mock/current      - Get current scenario and state
 *   POST /api/espn/mock/scenario     - Change scenario (updates env var for session)
 *   GET  /api/espn/mock/preview      - Preview what data would be returned
 */

const express = require('express');
const mockService = require('./espnMockService');

const router = express.Router();

// Store the current scenario in memory (survives hot reloads but not server restarts)
let sessionScenario = null;

/**
 * Override getCurrentScenario to use session scenario if set
 */
function getEffectiveScenario() {
  return sessionScenario || process.env.ESPN_MOCK_SCENARIO || 'completed';
}

// Monkey-patch the mock service to use our session scenario
const originalGetCurrentScenario = mockService.getCurrentScenario;
mockService.getCurrentScenario = function() {
  return sessionScenario || originalGetCurrentScenario();
};

/**
 * GET /api/espn/mock/scenarios
 * List all available mock scenarios
 */
router.get('/scenarios', (req, res) => {
  const scenarios = mockService.getAvailableMocks();
  const current = getEffectiveScenario();
  
  res.json({
    success: true,
    data: {
      current: current,
      available: scenarios,
      mockEnabled: mockService.isMockEnabled()
    }
  });
});

/**
 * GET /api/espn/mock/current
 * Get current mock state and scenario
 */
router.get('/current', (req, res) => {
  const scenario = getEffectiveScenario();
  
  res.json({
    success: true,
    data: {
      mockEnabled: mockService.isMockEnabled(),
      scenario: scenario,
      envScenario: process.env.ESPN_MOCK_SCENARIO,
      sessionScenario: sessionScenario,
      description: getScenarioDescription(scenario)
    }
  });
});

/**
 * POST /api/espn/mock/scenario
 * Change the current scenario for this session
 * Body: { scenario: "live-1" | "live-2" | "start" | "completed" }
 */
router.post('/scenario', (req, res) => {
  const { scenario } = req.body;
  
  const validScenarios = ['start', 'live', 'live-1', 'live-2', 'completed'];
  if (!validScenarios.includes(scenario)) {
    return res.status(400).json({
      success: false,
      message: `Invalid scenario. Valid options: ${validScenarios.join(', ')}`
    });
  }
  
  // Normalize 'live' to 'live-1'
  sessionScenario = scenario === 'live' ? 'live-1' : scenario;
  
  console.log(`[MOCK] Scenario changed to: ${sessionScenario}`);
  
  res.json({
    success: true,
    message: `Scenario changed to: ${sessionScenario}`,
    data: {
      scenario: sessionScenario,
      description: getScenarioDescription(sessionScenario)
    }
  });
});

/**
 * POST /api/espn/mock/reset
 * Reset to default scenario from environment
 */
router.post('/reset', (req, res) => {
  sessionScenario = null;
  const defaultScenario = process.env.ESPN_MOCK_SCENARIO || 'completed';
  
  console.log(`[MOCK] Reset to default scenario: ${defaultScenario}`);
  
  res.json({
    success: true,
    message: `Reset to default scenario: ${defaultScenario}`,
    data: {
      scenario: defaultScenario,
      description: getScenarioDescription(defaultScenario)
    }
  });
});

/**
 * GET /api/espn/mock/preview
 * Preview what data would be returned for current scenario
 * Query params: ?endpoint=direct-preview&matchId=xxx
 */
router.get('/preview', (req, res) => {
  const { endpoint = 'direct-preview', matchId = 'preview-match-id' } = req.query;
  const scenario = getEffectiveScenario();
  
  let previewData;
  
  switch (endpoint) {
    case 'direct-preview':
      previewData = mockService.generateDirectPreview(matchId, { scenario });
      break;
    case 'preview-match-creation':
      previewData = mockService.generatePreviewMatchCreation();
      break;
    case 'squads':
      previewData = mockService.generateSquadsData();
      break;
    case 'full-sync':
      previewData = mockService.generateFullSyncResponse(matchId, scenario);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: `Unknown endpoint: ${endpoint}. Valid: direct-preview, preview-match-creation, squads, full-sync`
      });
  }
  
  res.json({
    success: true,
    data: {
      endpoint,
      scenario,
      preview: previewData
    }
  });
});

/**
 * GET /api/espn/mock/status
 * Quick status check for mock system
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      mockEnabled: mockService.isMockEnabled(),
      scenario: getEffectiveScenario(),
      endpoints: {
        'GET /scenarios': 'List available scenarios',
        'GET /current': 'Get current scenario state',
        'POST /scenario': 'Change scenario { scenario: "live-1" }',
        'POST /reset': 'Reset to default scenario',
        'GET /preview': 'Preview mock data'
      }
    }
  });
});

/**
 * Helper: Get human-readable scenario description
 */
function getScenarioDescription(scenario) {
  const descriptions = {
    'start': 'Match not started - squads announced, no play yet',
    'live': '1st innings in progress at 13.2 overs',
    'live-1': '1st innings in progress - SL Women 89/5 (13.2 ov)',
    'live-2': '2nd innings in progress - IND Women 58/1 (6.0 ov) chasing 113',
    'completed': 'Match completed - IND Women won by 8 wickets'
  };
  return descriptions[scenario] || 'Unknown scenario';
}

module.exports = router;
