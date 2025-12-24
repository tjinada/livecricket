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
  let encoded = '';
  for (const char of str) {
    if (/[A-Za-z0-9._~-]/.test(char)) {
      encoded += char;
    } else {
      encoded += '%' + char.charCodeAt(0).toString(16).toLowerCase();
    }
  }
  return encoded;
}

/**
 * Generate Akamai EdgeAuth token for a given URL path
 */
function generateToken(pathWithQuery) {
  const startTime = Math.floor(Date.now() / 1000);
  const endTime = startTime + AKAMAI_CONFIG.windowSeconds;
  
  const tokenFields = [];
  tokenFields.push(`exp=${endTime}`);
  
  const hmacFields = [...tokenFields];
  const escapedPath = AKAMAI_CONFIG.escapeEarly ? escapeEarly(pathWithQuery) : pathWithQuery;
  hmacFields.push(`url=${escapedPath}`);
  
  const hmacInput = hmacFields.join(AKAMAI_CONFIG.fieldDelimiter);
  const hmac = crypto.createHmac(AKAMAI_CONFIG.algorithm, Buffer.from(AKAMAI_CONFIG.key, 'hex'));
  hmac.update(hmacInput);
  const signature = hmac.digest('hex');
  
  tokenFields.push(`hmac=${signature}`);
  return tokenFields.join(AKAMAI_CONFIG.fieldDelimiter);
}

/**
 * Extract match ID and series ID from ESPN URL
 */
function extractMatchIds(url) {
  try {
    const match = url.match(/series\/[^\/]+-(\d+)\/[^\/]+-(\d+)/);
    if (match) {
      return { seriesId: match[1], matchId: match[2] };
    }
    
    const directMatch = url.match(/series\/(\d+)\/scorecard\/(\d+)/);
    if (directMatch) {
      return { seriesId: directMatch[1], matchId: directMatch[2] };
    }
    
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
  const url = new URL(`${ESPN_API_BASE}/${endpoint}`);
  url.searchParams.set('lang', 'en');
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  const pathWithQuery = url.pathname + url.search;
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
    const ids = extractMatchIds(url);
    if (!ids) {
      return { success: false, error: 'Could not extract match/series IDs from URL' };
    }
    console.log(`\n=== ESPN Direct Fetch (No Browser) ===`);
    console.log(`Series: ${ids.seriesId}, Match: ${ids.matchId}\n`);

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
 * Fetch ball-by-ball commentary for a specific innings
 */
async function fetchCommentary(seriesId, matchId, inningsNumber) {
  try {
    const comments = await callEspnApi('comments', {
      seriesId,
      matchId,
      inningNumber: inningsNumber,
      commentType: 'ALL',
      fromInningOver: -1
    });
    return { success: true, data: comments };
  } catch (error) {
    console.error(`Commentary fetch error for innings ${inningsNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Parse overs data from ESPN API response
 * 
 * The ESPN overs/details API returns data in this structure:
 * {
 *   inningOvers: [
 *     {
 *       inningNumber: 1,
 *       stats: [
 *         {
 *           overNumber: 1,
 *           overRuns: 5,
 *           balls: [
 *             { ballNumber: 1, batsmanRuns: 1, ... },
 *             { ballNumber: 2, batsmanRuns: 4, ... },
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
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

  // Handle inningOvers format - this is the actual ESPN API format
  // Balls are inside inningOvers[].stats[].balls[]
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
        
        // Extract over summary
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

        // Extract individual balls from stats.balls[] - THIS IS THE KEY!
        if (stat.balls && Array.isArray(stat.balls)) {
          for (const ball of stat.balls) {
            parsedInnings.balls.push({
              // Ball identification
              inningsNumber: inning.inningNumber,
              overNumber: ball.overNumber || overNumber,
              ballInOver: ball.ballNumber,
              oversActual: ball.oversActual,
              oversUnique: ball.oversUnique,
              
              // Player IDs (ESPN uses numeric IDs)
              batsmanId: ball.batsmanPlayerId,
              bowlerId: ball.bowlerPlayerId,
              nonStrikerId: ball.nonStrikerPlayerId,
              dismissedBatsmanId: ball.outPlayerId || null,
              
              // Runs
              runs: ball.batsmanRuns || 0,
              totalRuns: ball.totalRuns || 0,
              extraRuns: (ball.totalRuns || 0) - (ball.batsmanRuns || 0),
              
              // Extras breakdown
              wides: ball.wides || 0,
              noBalls: ball.noballs || 0,
              byes: ball.byes || 0,
              legByes: ball.legbyes || 0,
              penalties: ball.penalties || 0,
              
              // Extra flags
              isExtra: (ball.wides > 0) || (ball.noballs > 0) || (ball.byes > 0) || (ball.legbyes > 0),
              extraType: ball.wides > 0 ? 'wide' : ball.noballs > 0 ? 'no-ball' : ball.byes > 0 ? 'bye' : ball.legbyes > 0 ? 'leg-bye' : null,
              isLegal: !(ball.wides > 0) && !(ball.noballs > 0),
              
              // Scoring flags
              isFour: ball.isFour || false,
              isSix: ball.isSix || false,
              isWicket: ball.isWicket || false,
              wicketType: ball.dismissalType || null,
              
              // Running totals
              totalInningRuns: ball.totalInningRuns,
              totalInningWickets: ball.totalInningWickets,
              
              // Timing
              timestamp: ball.timestamp,
              
              // Wagon wheel / pitch map data
              wagonX: ball.wagonX,
              wagonY: ball.wagonY,
              wagonZone: ball.wagonZone,
              pitchLine: ball.pitchLine,
              pitchLength: ball.pitchLength,
              shotType: ball.shotType,
              shotControl: ball.shotControl,
              
              // Text descriptions
              batsmanStatText: ball.batsmanStatText,
              bowlerStatText: ball.bowlerStatText
            });
          }
        }
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

          // Extras - in ESPN data, individual extras (byes, legbyes, wides, noballs) 
          // are at the top level of innings, not nested under 'extras'
          inningsData.extras = {
            total: innings.extras || 0,  // 'extras' is just the total number
            byes: innings.byes || 0,
            legByes: innings.legbyes || 0,
            wides: innings.wides || 0,
            noBalls: innings.noballs || 0
          };

          if (innings.runs !== undefined) {
            inningsData.total = { runs: innings.runs, wickets: innings.wickets || 0 };
          }

          result.innings.push(inningsData);
        }
      }
    }

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
  fetchCommentary,
  transformData,
  parseOversData,
  extractMatchIds,
  AKAMAI_CONFIG
};
