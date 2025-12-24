/**
 * ESPN Browser-Based Data Fetcher
 * 
 * Strategy: Load ESPN page once to capture the x-hsci-auth-token,
 * then make direct API calls with that token (bypasses Akamai).
 * 
 * The token format is: exp=TIMESTAMP~hmac=SIGNATURE
 * It's generated client-side by ESPN's JavaScript.
 */

const puppeteer = require('puppeteer');

// ESPN API base URL
const ESPN_API_BASE = 'https://hs-consumer-api.espncricinfo.com/v1/pages/match';

/**
 * Extract match ID and series ID from ESPN URL
 */
function extractMatchIds(url) {
  try {
    // Pattern: /series/name-SERIESID/match-name-MATCHID/
    const match = url.match(/series\/[^\/]+-(\d+)\/[^\/]+-(\d+)/);
    if (match) {
      return { seriesId: match[1], matchId: match[2] };
    }
    
    // Pattern: /series/SERIESID/scorecard/MATCHID
    const directMatch = url.match(/series\/(\d+)\/scorecard\/(\d+)/);
    if (directMatch) {
      return { seriesId: directMatch[1], matchId: directMatch[2] };
    }
    
    // Try to extract any 7-digit numbers
    const numbers = url.match(/(\d{7})/g);
    if (numbers && numbers.length >= 2) {
      return { seriesId: numbers[0], matchId: numbers[1] };
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting match IDs:', e.message);
    return null;
  }
}

/**
 * Build the full scorecard URL from any ESPN URL
 */
function buildScorecardUrl(url) {
  if (url.includes('/full-scorecard')) return url;
  if (url.includes('/scorecard')) return url.replace('/scorecard', '/full-scorecard');
  if (url.match(/-\d+$/)) return url + '/full-scorecard';
  return url;
}

/**
 * Launch browser and capture the x-hsci-auth-token from any API request
 */
async function captureAuthToken(url, options = {}) {
  const { headless = true, timeout = 30000 } = options;
  
  let browser = null;
  let authToken = null;
  
  try {
    console.log('Launching browser to capture auth token...');
    
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Mask automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    await page.setRequestInterception(true);

    // Capture the auth token from any ESPN API request
    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['x-hsci-auth-token'] && !authToken) {
        authToken = headers['x-hsci-auth-token'];
        console.log('  ✓ Captured auth token:', authToken.substring(0, 30) + '...');
      }
      request.continue();
    });

    const scorecardUrl = buildScorecardUrl(url);
    console.log(`Loading page: ${scorecardUrl}`);
    
    await page.goto(scorecardUrl, {
      waitUntil: 'networkidle2',
      timeout: timeout
    });

    // Wait a bit more to ensure we capture the token
    await new Promise(resolve => setTimeout(resolve, 2000));

    // If we didn't capture from requests, try to extract from page context
    if (!authToken) {
      console.log('Attempting to extract token from page context...');
      authToken = await page.evaluate(() => {
        // ESPN sometimes stores the token in window or a global variable
        if (window.__HSCI_AUTH_TOKEN__) return window.__HSCI_AUTH_TOKEN__;
        if (window.hsciAuthToken) return window.hsciAuthToken;
        
        // Try to find it in script tags or localStorage
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const match = script.textContent?.match(/x-hsci-auth-token['":\s]+['"]([^'"]+)['"]/);
          if (match) return match[1];
        }
        
        return null;
      });
    }

    return {
      success: !!authToken,
      token: authToken,
      error: authToken ? null : 'Could not capture auth token'
    };

  } catch (error) {
    console.error('Error capturing auth token:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

/**
 * Make a direct ESPN API call with the auth token
 */
async function callEspnApi(endpoint, params, authToken) {
  const url = new URL(`${ESPN_API_BASE}/${endpoint}`);
  
  // Add common params
  url.searchParams.set('lang', 'en');
  
  // Add provided params
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  console.log(`API Call: ${endpoint} - ${url.toString().substring(0, 80)}...`);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Origin': 'https://www.espncricinfo.com',
      'Referer': 'https://www.espncricinfo.com/',
      'x-hsci-auth-token': authToken,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Main function: Fetch all match data using auth token approach
 */
async function fetchMatchDataViaBrowser(url, options = {}) {
  const { headless = true, timeout = 45000, captureOvers = true } = options;
  
  const capturedData = {
    matchDetails: null,
    oversDetails: null,
    scorecard: null,
    innings: null,
    authToken: null
  };

  try {
    // Step 1: Extract match IDs from URL
    const ids = extractMatchIds(url);
    if (!ids) {
      return { success: false, error: 'Could not extract match/series IDs from URL' };
    }
    console.log(`Extracted IDs - Series: ${ids.seriesId}, Match: ${ids.matchId}`);

    // Step 2: Capture auth token by loading the page
    const tokenResult = await captureAuthToken(url, { headless, timeout });
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error || 'Failed to capture auth token' };
    }
    
    capturedData.authToken = tokenResult.token;
    console.log('\n--- Making direct API calls with captured token ---\n');

    // Step 3: Make direct API calls
    try {
      // Get scorecard data
      console.log('Fetching scorecard...');
      capturedData.scorecard = await callEspnApi('scorecard', {
        seriesId: ids.seriesId,
        matchId: ids.matchId
      }, tokenResult.token);
      console.log('  ✓ Scorecard fetched');
    } catch (e) {
      console.log('  ✗ Scorecard fetch failed:', e.message);
    }

    try {
      // Get match details
      console.log('Fetching match details...');
      capturedData.matchDetails = await callEspnApi('details', {
        seriesId: ids.seriesId,
        matchId: ids.matchId
      }, tokenResult.token);
      console.log('  ✓ Match details fetched');
    } catch (e) {
      console.log('  ✗ Match details fetch failed:', e.message);
    }

    if (captureOvers) {
      try {
        // Get overs/ball-by-ball data (the key API!)
        console.log('Fetching overs details (ball-by-ball)...');
        capturedData.oversDetails = await callEspnApi('overs/details', {
          seriesId: ids.seriesId,
          matchId: ids.matchId,
          mode: 'ALL'
        }, tokenResult.token);
        console.log('  ✓ Overs details fetched');
      } catch (e) {
        console.log('  ✗ Overs details fetch failed:', e.message);
      }
    }

    console.log('\n--- Fetch complete ---');
    console.log(`  Scorecard: ${capturedData.scorecard ? '✓' : '✗'}`);
    console.log(`  Match Details: ${capturedData.matchDetails ? '✓' : '✗'}`);
    console.log(`  Overs Details: ${capturedData.oversDetails ? '✓' : '✗'}`);

    return {
      success: true,
      data: capturedData,
      matchIds: ids
    };

  } catch (error) {
    console.error('Browser fetch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch only overs/ball-by-ball data
 */
async function fetchOversDataViaBrowser(url, options = {}) {
  const { headless = true, timeout = 30000 } = options;

  try {
    const ids = extractMatchIds(url);
    if (!ids) {
      return { success: false, error: 'Could not extract match/series IDs from URL' };
    }

    const tokenResult = await captureAuthToken(url, { headless, timeout });
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error };
    }

    const oversDetails = await callEspnApi('overs/details', {
      seriesId: ids.seriesId,
      matchId: ids.matchId,
      mode: 'ALL'
    }, tokenResult.token);

    return {
      success: true,
      data: { oversDetails },
      matchIds: ids
    };

  } catch (error) {
    console.error('Overs fetch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Parse overs data from ESPN API response
 */
function parseOversData(oversData) {
  const result = { innings: [], matchInfo: null };
  
  if (!oversData) return result;

  if (oversData.match) {
    result.matchInfo = {
      id: oversData.match.objectId,
      status: oversData.match.status,
      statusText: oversData.match.statusText
    };
  }

  // Handle inningOvers format (from overs/details API)
  if (oversData.inningOvers) {
    for (const inning of oversData.inningOvers) {
      const parsedInnings = {
        inningsNumber: inning.inningNumber,
        team: inning.team?.longName || inning.team?.name || `Innings ${inning.inningNumber}`,
        overs: [],
        balls: []
      };

      for (const stat of (inning.stats || [])) {
        const overNumber = stat.overNumber;
        
        parsedInnings.overs.push({
          overNumber,
          overRuns: stat.overRuns || 0,
          overWickets: stat.overWickets || 0,
          totalRuns: stat.totalRuns || 0,
          totalWickets: stat.totalWickets || 0,
          totalBalls: stat.totalBalls || 0,
          isComplete: stat.isComplete || false,
          overRunRate: stat.overRunRate || 0,
          bowlers: stat.bowlers || []
        });
      }

      result.innings.push(parsedInnings);
    }
  }

  // Handle content.innings format (from other APIs)
  if (oversData.content?.innings) {
    for (const [inningsNum, inningsData] of Object.entries(oversData.content.innings)) {
      const parsedInnings = {
        inningsNumber: parseInt(inningsNum),
        team: inningsData.team?.longName || inningsData.team?.name,
        overs: [],
        balls: []
      };

      for (const over of (inningsData.overs || [])) {
        parsedInnings.overs.push({
          overNumber: over.overNumber,
          balls: (over.balls || []).map(ball => ({
            ballNumber: ball.ballNumber,
            totalRuns: ball.totalRuns || 0,
            batsmanRuns: ball.batsmanRuns || 0,
            isFour: ball.isFour || false,
            isSix: ball.isSix || false,
            isWicket: ball.isWicket || false,
            isWide: ball.isWide || false,
            isNoBall: ball.isNoBall || false,
            batsmanName: ball.batsman?.longName || ball.batsman?.name,
            bowlerName: ball.bowler?.longName || ball.bowler?.name
          }))
        });
      }

      result.innings.push(parsedInnings);
    }
  }

  return result;
}

/**
 * Transform captured data to our standard format
 */
function transformBrowserData(capturedData) {
  const result = {
    teams: {},
    innings: [],
    matchStatus: null,
    matchState: { isStarted: false, isLive: false, isComplete: false },
    target: null,
    ballByBall: null,
    debug: {}
  };

  try {
    // Process match details
    if (capturedData.matchDetails) {
      const match = capturedData.matchDetails.match || capturedData.matchDetails;
      result.matchStatus = match.statusText || match.status;
      result.matchState.isStarted = match.state !== 'PRE';
      result.matchState.isLive = match.state === 'LIVE';
      result.matchState.isComplete = match.state === 'COMPLETE' || match.state === 'POST';
      
      if (match.teams) {
        for (const team of match.teams) {
          result.teams[team.team?.longName || team.team?.name] = {
            score: team.score || null,
            overs: team.scoreInfo || null
          };
        }
      }
    }

    // Process scorecard
    if (capturedData.scorecard) {
      const scorecard = capturedData.scorecard.content || capturedData.scorecard;
      
      if (scorecard.innings) {
        for (const innings of scorecard.innings) {
          const inningsData = {
            team: innings.team?.longName || innings.team?.name || 'Unknown',
            inningsNumber: innings.inningNumber,
            batting: [],
            bowling: [],
            extras: null,
            total: null,
            overs: innings.overs || null
          };

          if (innings.inningBatsmen) {
            for (const batsman of innings.inningBatsmen) {
              inningsData.batting.push({
                name: batsman.player?.longName || batsman.player?.name,
                espnId: batsman.player?.id,
                runs: batsman.runs || 0,
                balls: batsman.balls || 0,
                fours: batsman.fours || 0,
                sixes: batsman.sixes || 0,
                strikeRate: batsman.strikerate || 0,
                isNotOut: !batsman.isOut,
                dismissal: batsman.outDescription || null
              });
            }
          }

          if (innings.inningBowlers) {
            for (const bowler of innings.inningBowlers) {
              inningsData.bowling.push({
                name: bowler.player?.longName || bowler.player?.name,
                espnId: bowler.player?.id,
                overs: bowler.overs || 0,
                maidens: bowler.maidens || 0,
                runs: bowler.conceded || bowler.runs || 0,
                wickets: bowler.wickets || 0,
                economy: bowler.economy || 0,
                dotBalls: bowler.dots || 0
              });
            }
          }

          if (innings.extras) {
            inningsData.extras = {
              total: innings.extras.total || 0,
              byes: innings.extras.byes || 0,
              legByes: innings.extras.legbyes || 0,
              wides: innings.extras.wides || 0,
              noBalls: innings.extras.noballs || 0
            };
          }

          if (innings.runs !== undefined) {
            inningsData.total = { runs: innings.runs, wickets: innings.wickets || 0 };
          }

          result.innings.push(inningsData);
        }
      }
    }

    // Process overs details
    if (capturedData.oversDetails) {
      result.ballByBall = parseOversData(capturedData.oversDetails);
    }

  } catch (error) {
    console.error('Error transforming browser data:', error);
    result.debug.transformError = error.message;
  }

  return result;
}

async function isPuppeteerAvailable() {
  try {
    require.resolve('puppeteer');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  fetchMatchDataViaBrowser,
  fetchOversDataViaBrowser,
  captureAuthToken,
  callEspnApi,
  transformBrowserData,
  parseOversData,
  extractMatchIds,
  buildScorecardUrl,
  isPuppeteerAvailable
};
