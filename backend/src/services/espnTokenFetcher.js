/**
 * ESPN Direct Token Fetcher
 * 
 * Generates Akamai EdgeAuth tokens directly using the discovered algorithm,
 * eliminating the need for Puppeteer/browser automation.
 * 
 * Token format: exp=TIMESTAMP~hmac=SIGNATURE
 * - Algorithm: HMAC-SHA256
 * - Key: Hex-encoded secret
 * - Input: URL path with query string
 */

const crypto = require('crypto');

// Akamai EdgeAuth configuration (extracted from ESPN's JavaScript)
const AKAMAI_CONFIG = {
  key: '9ced54a89687e1173e91c1f225fc02abf275a119fda8a41d731d2b04dac95ff5',
  algorithm: 'sha256',
  fieldDelimiter: '~',
  windowSeconds: 60,
  escapeEarly: true
};

// ESPN API base URL
const ESPN_API_BASE = 'https://hs-consumer-api.espncricinfo.com/v1/pages/match';

/**
 * Escape special characters for Akamai token
 * ESPN uses lowercase percent encoding (e.g., %2f not %2F)
 */
function escapeEarly(str) {
  if (!str) return str;
  // encodeURIComponent leaves some chars unencoded, and uses uppercase hex
  // ESPN's _escapeEarly encodes more chars and uses lowercase hex
  let encoded = '';
  for (const char of str) {
    // These characters are safe and don't need encoding
    if (/[A-Za-z0-9._~-]/.test(char)) {
      encoded += char;
    } else {
      // Encode everything else with lowercase hex
      encoded += '%' + char.charCodeAt(0).toString(16).toLowerCase();
    }
  }
  return encoded;
}

/**
 * Generate Akamai EdgeAuth token for a given URL path
 * @param {string} pathWithQuery - The URL path with query string (e.g., "/v1/pages/match/overs/details?lang=en&seriesId=...")
 * @returns {string} The auth token
 */
function generateToken(pathWithQuery) {
  const startTime = Math.floor(Date.now() / 1000);
  const endTime = startTime + AKAMAI_CONFIG.windowSeconds;
  
  // Build token fields
  const tokenFields = [];
  tokenFields.push(`exp=${endTime}`);
  
  // Build HMAC input (includes URL for URL-based tokens)
  const hmacFields = [...tokenFields];
  const escapedPath = AKAMAI_CONFIG.escapeEarly ? escapeEarly(pathWithQuery) : pathWithQuery;
  hmacFields.push(`url=${escapedPath}`);
  
  // Calculate HMAC
  const hmacInput = hmacFields.join(AKAMAI_CONFIG.fieldDelimiter);
  const hmac = crypto.createHmac(AKAMAI_CONFIG.algorithm, Buffer.from(AKAMAI_CONFIG.key, 'hex'));
  hmac.update(hmacInput);
  const signature = hmac.digest('hex');
  
  // Final token
  tokenFields.push(`hmac=${signature}`);
  return tokenFields.join(AKAMAI_CONFIG.fieldDelimiter);
}

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
 * Make a direct ESPN API call with generated token
 */
async function callEspnApi(endpoint, params) {
  // Build the path with query string
  const url = new URL(`${ESPN_API_BASE}/${endpoint}`);
  url.searchParams.set('lang', 'en');
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  // Extract path for token generation (everything after the domain)
  const pathWithQuery = url.pathname + url.search;
  
  // Generate token for this specific endpoint
  const token = generateToken(pathWithQuery);
  
  console.log(`API Call: ${endpoint}`);
  console.log(`  Path: ${pathWithQuery.substring(0, 60)}...`);
  console.log(`  Token: ${token.substring(0, 30)}...`);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Origin': 'https://www.espncricinfo.com',
      'Referer': 'https://www.espncricinfo.com/',
      'x-hsci-auth-token': token,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${text.substring(0, 200)}`);
  }
  
  return await response.json();
}

/**
 * Fetch all match data directly (no browser needed!)
 */
async function fetchMatchData(url, options = {}) {
  const { captureOvers = true } = options;
  
  const capturedData = {
    matchDetails: null,
    oversDetails: null,
    scorecard: null
  };

  try {
    // Extract match IDs from URL
    const ids = extractMatchIds(url);
    if (!ids) {
      return { success: false, error: 'Could not extract match/series IDs from URL' };
    }
    console.log(`\n=== ESPN Direct Fetch (No Browser) ===`);
    console.log(`Series: ${ids.seriesId}, Match: ${ids.matchId}\n`);

    // Fetch scorecard
    try {
      console.log('Fetching scorecard...');
      capturedData.scorecard = await callEspnApi('scorecard', {
        seriesId: ids.seriesId,
        matchId: ids.matchId
      });
      console.log('  ✓ Scorecard fetched\n');
    } catch (e) {
      console.log('  ✗ Scorecard fetch failed:', e.message, '\n');
    }

    // Fetch match details
    try {
      console.log('Fetching match details...');
      capturedData.matchDetails = await callEspnApi('details', {
        seriesId: ids.seriesId,
        matchId: ids.matchId
      });
      console.log('  ✓ Match details fetched\n');
    } catch (e) {
      console.log('  ✗ Match details fetch failed:', e.message, '\n');
    }

    // Fetch overs/ball-by-ball data
    if (captureOvers) {
      try {
        console.log('Fetching overs details (ball-by-ball)...');
        capturedData.oversDetails = await callEspnApi('overs/details', {
          seriesId: ids.seriesId,
          matchId: ids.matchId,
          mode: 'ALL'
        });
        console.log('  ✓ Overs details fetched\n');
      } catch (e) {
        console.log('  ✗ Overs details fetch failed:', e.message, '\n');
      }
    }

    console.log('=== Fetch Complete ===');
    console.log(`  Scorecard: ${capturedData.scorecard ? '✓' : '✗'}`);
    console.log(`  Match Details: ${capturedData.matchDetails ? '✓' : '✗'}`);
    console.log(`  Overs Details: ${capturedData.oversDetails ? '✓' : '✗'}`);

    return {
      success: true,
      data: capturedData,
      matchIds: ids
    };

  } catch (error) {
    console.error('Direct fetch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch only overs/ball-by-ball data
 */
async function fetchOversData(url) {
  try {
    const ids = extractMatchIds(url);
    if (!ids) {
      return { success: false, error: 'Could not extract match/series IDs from URL' };
    }

    const oversDetails = await callEspnApi('overs/details', {
      seriesId: ids.seriesId,
      matchId: ids.matchId,
      mode: 'ALL'
    });

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

  return result;
}

/**
 * Transform captured data to standard format
 */
function transformData(capturedData) {
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
    console.error('Error transforming data:', error);
    result.debug.transformError = error.message;
  }

  return result;
}

module.exports = {
  generateToken,
  escapeEarly,
  callEspnApi,
  fetchMatchData,
  fetchOversData,
  transformData,
  parseOversData,
  extractMatchIds,
  AKAMAI_CONFIG
};
