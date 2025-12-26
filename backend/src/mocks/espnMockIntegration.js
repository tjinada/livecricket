/**
 * ESPN Mock Integration
 * 
 * Intercepts ESPN API calls when mock mode is enabled.
 * Supports multiple scenarios for testing different match states.
 * 
 * Environment Variables:
 *   ESPN_MOCK_ENABLED=true     - Enable mock mode
 *   ESPN_MOCK_SCENARIO=live-1  - Scenario to use
 * 
 * Scenarios:
 *   - start:     Match not started (squads only)
 *   - live-1:    1st innings in progress (13.2 overs)
 *   - live-2:    2nd innings in progress (6.0 overs)
 *   - completed: Full completed match
 */

const mockService = require('./espnMockService');

/**
 * Middleware to intercept ESPN requests in mock mode
 */
function mockMiddleware(req, res, next) {
  // Skip if mock mode is disabled
  if (!mockService.isMockEnabled()) {
    return next();
  }
  
  // Debug logging
  console.log(`[MOCK DEBUG] req.path=${req.path}, req.originalUrl=${req.originalUrl}`);
  
  // Only intercept certain endpoints
  const mockableEndpoints = [
    '/preview-match-creation',
    '/direct-preview',
    '/direct-fetch',
    '/fetch-squads',
    '/fetch-match',
    '/browser-fetch',
    '/browser-fetch-overs',
    '/direct-fetch-overs',
    '/validate-squad',
    '/full-sync'
  ];
  
  const path = req.path;
  const isMockable = mockableEndpoints.some(ep => path.includes(ep));
  
  if (!isMockable) {
    return next();
  }
  
  const scenario = mockService.getCurrentScenario();
  console.log(`[MOCK] Intercepting ${req.method} ${path} (scenario: ${scenario})`);
  
  // Handle specific endpoints
  if (path.includes('/preview-match-creation')) {
    return handlePreviewMatchCreation(req, res);
  }
  
  if (path.includes('/direct-preview')) {
    return handleDirectPreview(req, res);
  }
  
  if (path.includes('/direct-fetch') && !path.includes('overs')) {
    return handleDirectFetch(req, res);
  }
  
  if (path.includes('/fetch-squads')) {
    return handleFetchSquads(req, res);
  }
  
  if (path.includes('/validate-squad')) {
    return handleValidateSquad(req, res);
  }
  
  if (path.includes('/full-sync')) {
    return handleFullSync(req, res, next);
  }
  
  // For other endpoints, pass through with warning
  console.log(`[MOCK] No specific handler for ${path}, passing through`);
  return next();
}

/**
 * Handle /preview-match-creation mock
 */
function handlePreviewMatchCreation(req, res) {
  console.log('[MOCK] Returning preview-match-creation mock data');
  const mockData = mockService.generatePreviewMatchCreation();
  return res.json(mockData);
}

/**
 * Handle /direct-preview mock
 * Returns scenario-appropriate scorecard data
 */
function handleDirectPreview(req, res) {
  const matchId = req.params.matchId || 'mock-match-id';
  const scenario = mockService.getCurrentScenario();
  console.log(`[MOCK] Returning direct-preview for match ${matchId}, scenario: ${scenario}`);
  
  const mockData = mockService.generateDirectPreview(matchId, { scenario });
  return res.json(mockData);
}

/**
 * Handle /direct-fetch mock
 */
function handleDirectFetch(req, res) {
  console.log('[MOCK] Returning direct-fetch mock data');
  const scenario = mockService.getCurrentScenario();
  
  // Use the direct-preview generator as it has the same structure
  const mockData = mockService.generateDirectPreview('mock-match', { scenario });
  return res.json(mockData);
}

/**
 * Handle /fetch-squads mock
 */
function handleFetchSquads(req, res) {
  console.log('[MOCK] Returning fetch-squads mock data');
  const mockData = mockService.generateSquadsData();
  return res.json(mockData);
}

/**
 * Handle /validate-squad mock
 * Returns scenario-appropriate validation
 */
function handleValidateSquad(req, res) {
  const scenario = mockService.getCurrentScenario();
  console.log(`[MOCK] Returning validate-squad mock (scenario: ${scenario})`);
  
  // For 'start' scenario, no players have batted yet
  const isStart = scenario === 'start';
  
  return res.json({
    success: true,
    data: {
      isValid: true,
      checkedAt: new Date(),
      teams: [],
      mismatches: [],
      warnings: isStart ? [{
        issue: 'match_not_started',
        suggestion: 'Match has not started yet - squad validation will be more accurate once play begins'
      }] : [],
      summary: {
        totalEspnPlayers: 30,
        totalLocalPlayers: 30,
        exactMatches: 30,
        fuzzyMatches: 0,
        mismatches: 0,
        notInSquad: 0
      },
      _mock: true,
      _scenario: scenario
    }
  });
}

/**
 * Handle /full-sync mock
 * 
 * IMPORTANT: In mock mode, we let the full-sync pass through to the real handler!
 * This is because:
 * 1. The mock data (direct-preview) already provided fake ESPN data
 * 2. The frontend built the sync request from that mock data
 * 3. The actual sync should execute to update the database with the mock data
 * 
 * The mock only intercepts the ESPN *fetching* - not the sync itself.
 */
function handleFullSync(req, res, next) {
  const matchId = req.params.matchId || 'mock-match-id';
  const scenario = mockService.getCurrentScenario();
  console.log(`[MOCK] full-sync for match ${matchId} - PASSING THROUGH to real handler (scenario: ${scenario})`);
  console.log('[MOCK] This will actually update the database with the mock ESPN data');
  
  // Pass through to real handler - the sync request contains mock data from direct-preview
  return next();
}

/**
 * Apply mock middleware to ESPN router
 * @deprecated Use mockMiddleware directly with router.use()
 */
function applyMockMiddleware(router) {
  router.use(mockMiddleware);
  
  // Add mock management routes
  const mockRoutes = require('./mockRoutes');
  router.use('/mock', mockRoutes);
  
  console.log(`✓ ESPN Mock integration loaded (enabled: ${mockService.isMockEnabled()}, scenario: ${mockService.getCurrentScenario()})`);
  
  return router;
}

module.exports = {
  mockMiddleware,
  applyMockMiddleware,
  mockService
};
