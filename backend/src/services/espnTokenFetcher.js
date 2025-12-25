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

        if (stat.balls && Array.isArray(stat.balls)) {
          for (const ball of stat.balls) {
            parsedInnings.balls.push({
              inningsNumber: inning.inningNumber,
              overNumber: ball.overNumber || overNumber,
              ballInOver: ball.ballNumber,
              oversActual: ball.oversActual,
              oversUnique: ball.oversUnique,
              batsmanId: ball.batsmanPlayerId,
              bowlerId: ball.bowlerPlayerId,
              nonStrikerId: ball.nonStrikerPlayerId,
              dismissedBatsmanId: ball.outPlayerId || null,
              runs: ball.batsmanRuns || 0,
              totalRuns: ball.totalRuns || 0,
              extraRuns: (ball.totalRuns || 0) - (ball.batsmanRuns || 0),
              wides: ball.wides || 0,
              noBalls: ball.noballs || 0,
              byes: ball.byes || 0,
              legByes: ball.legbyes || 0,
              penalties: ball.penalties || 0,
              isExtra: (ball.wides > 0) || (ball.noballs > 0) || (ball.byes > 0) || (ball.legbyes > 0),
              extraType: ball.wides > 0 ? 'wide' : ball.noballs > 0 ? 'no-ball' : ball.byes > 0 ? 'bye' : ball.legbyes > 0 ? 'leg-bye' : null,
              isLegal: !(ball.wides > 0) && !(ball.noballs > 0),
              isFour: ball.isFour || false,
              isSix: ball.isSix || false,
              isWicket: ball.isWicket || false,
              wicketType: ball.dismissalType || null,
              totalInningRuns: ball.totalInningRuns,
              totalInningWickets: ball.totalInningWickets,
              timestamp: ball.timestamp,
              wagonX: ball.wagonX,
              wagonY: ball.wagonY,
              wagonZone: ball.wagonZone,
              pitchLine: ball.pitchLine,
              pitchLength: ball.pitchLength,
              shotType: ball.shotType,
              shotControl: ball.shotControl,
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
                espnId: batsman.player?.id || batsman.player?.objectId || null,  // Include ESPN player ID
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
                espnId: bowler.player?.id || bowler.player?.objectId || null,  // Include ESPN player ID
                overs: bowler.overs || 0,
                maidens: bowler.maidens || 0,
                runs: bowler.conceded || bowler.runs || 0,
                wickets: bowler.wickets || 0,
                economy: bowler.economy || 0,
                dotBalls: bowler.dots || 0
              });
            }
          }

          inningsData.extras = {
            total: innings.extras || 0,
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

/**
 * Fetch squad/team list data for a match
 * 
 * ESPN API endpoint: /v1/pages/match/squad-players
 * Returns: match info + content.matchPlayers.teamPlayers[] with full squad info
 */
async function fetchSquadsData(url) {
  try {
    const ids = extractMatchIds(url);
    if (!ids) {
      return { success: false, error: 'Could not extract match/series IDs from URL' };
    }

    console.log(`\n=== ESPN Direct Squads Fetch ===`);
    console.log(`Series: ${ids.seriesId}, Match: ${ids.matchId}\n`);

    // Use the correct endpoint: squad-players (with hyphen)
    let squadsData = null;
    try {
      console.log('Fetching squad-players data...');
      squadsData = await callEspnApi('squad-players', {
        seriesId: ids.seriesId,
        matchId: ids.matchId
      });
      console.log('  ✓ Squad-players data fetched\n');
    } catch (e) {
      console.log('  ✗ Squad-players fetch failed:', e.message);
    }

    console.log('=== Squads Fetch Complete ===');

    return {
      success: true,
      data: {
        squads: squadsData
      },
      matchIds: ids
    };

  } catch (error) {
    console.error('Squads fetch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Transform squads data to a usable format
 * 
 * ESPN squad-players API returns:
 * {
 *   match: { title, teams[], series, ground, format, ... },
 *   content: {
 *     matchPlayers: {
 *       teamPlayers: [
 *         { team: {...}, players: [{player: {...}, playerRoleType: 'C'|'VC'|'WK'|'P', ...}] }
 *       ]
 *     }
 *   }
 * }
 */
function transformSquadsData(capturedData) {
  const result = {
    matchInfo: {
      title: null,
      seriesName: null,
      date: null,
      venue: null,
      format: null,
      gender: null,
      matchNumber: null
    },
    teams: []
  };

  try {
    const squadsResponse = capturedData.squads;
    if (!squadsResponse) {
      console.log('  No squads data available');
      return result;
    }

    // Extract match info from the match object
    const match = squadsResponse.match;
    if (match) {
      result.matchInfo.title = match.title || match.slug || null;
      result.matchInfo.seriesName = match.series?.longName || match.series?.name || null;
      result.matchInfo.date = match.startDate || match.startTime || null;
      result.matchInfo.venue = match.ground?.longName || match.ground?.name || null;
      result.matchInfo.format = match.format?.toLowerCase() || null;
      
      // Detect gender from series name or team names
      const seriesName = (match.series?.longName || match.series?.name || '').toLowerCase();
      const title = (match.title || '').toLowerCase();
      if (seriesName.includes('women') || title.includes('women')) {
        result.matchInfo.gender = 'women';
      } else {
        result.matchInfo.gender = 'men';
      }
      
      // Extract match number from title (e.g., "3rd T20I")
      const matchNumMatch = (match.title || '').match(/(\d+)(?:st|nd|rd|th)\s*(T20I?|ODI|Test)/i);
      if (matchNumMatch) {
        result.matchInfo.matchNumber = parseInt(matchNumMatch[1]);
      }

      // Extract teams from match.teams for basic info
      if (match.teams && Array.isArray(match.teams)) {
        for (const teamData of match.teams) {
          const team = teamData.team || teamData;
          result.teams.push({
            espnId: team.id || team.objectId,
            name: team.longName || team.name,
            shortName: team.abbreviation || team.name?.substring(0, 3).toUpperCase(),
            players: []
          });
        }
      }
    }

    // Extract players from content.matchPlayers.teamPlayers
    const content = squadsResponse.content;
    if (content?.matchPlayers?.teamPlayers && Array.isArray(content.matchPlayers.teamPlayers)) {
      console.log(`  Found ${content.matchPlayers.teamPlayers.length} teams in teamPlayers`);
      
      for (const teamData of content.matchPlayers.teamPlayers) {
        const teamId = teamData.team?.id || teamData.team?.objectId;
        const teamName = teamData.team?.longName || teamData.team?.name;
        
        // Find existing team or create new one
        let teamIndex = result.teams.findIndex(t => t.espnId === teamId);
        if (teamIndex < 0 && teamName) {
          // Try matching by name
          teamIndex = result.teams.findIndex(t => 
            t.name.toLowerCase().includes(teamName.toLowerCase().replace(' women', '').replace(' men', '')) ||
            teamName.toLowerCase().includes(t.name.toLowerCase().replace(' women', '').replace(' men', ''))
          );
        }
        if (teamIndex < 0 && teamName) {
          result.teams.push({
            espnId: teamId,
            name: teamName,
            shortName: teamData.team?.abbreviation || teamName?.substring(0, 3).toUpperCase(),
            players: []
          });
          teamIndex = result.teams.length - 1;
        }
        
        if (teamIndex >= 0 && teamData.players && Array.isArray(teamData.players)) {
          result.teams[teamIndex].players = teamData.players.map(p => {
            const player = p.player || p;
            const roleType = p.playerRoleType || '';
            return {
              espnId: player.id || player.objectId,
              name: player.longName || player.name,
              role: player.playingRoles?.[0] || player.battingStyles?.[0] || null,
              isCaptain: roleType === 'C',
              isViceCaptain: roleType === 'VC',
              isKeeper: roleType === 'WK' || roleType.includes('WK')
            };
          });
          console.log(`    Team ${result.teams[teamIndex].name}: ${result.teams[teamIndex].players.length} players`);
        }
      }
    }

  } catch (error) {
    console.error('Error transforming squads data:', error);
  }

  return result;
}

/**
 * Fetch players from ESPN player search API
 * 
 * ESPN API endpoint: /v1/pages/player/search
 * Supports pagination (40 records per page)
 */
/**
 * Fetch players for a team from ESPN player search API
 * Uses the exact URL format that works: /v1/pages/player/search
 */
async function fetchPlayersForTeam(espnTeamId, options = {}) {
  const { page = 1 } = options;
  
  try {
    // Build URL with exact parameters that work
    const url = new URL('https://hs-consumer-api.espncricinfo.com/v1/pages/player/search');
    
    // These exact parameters work - order matters for some APIs
    url.searchParams.set('mode', 'BOTH');
    url.searchParams.set('page', page.toString());
    url.searchParams.set('records', '40');
    url.searchParams.set('filterActive', 'true');
    url.searchParams.set('filterTeamId', espnTeamId.toString());
    url.searchParams.set('filterFormatLevel', 'INTERNATIONAL');
    url.searchParams.set('sort', 'ALPHA_ASC');
    
    const pathWithQuery = url.pathname + url.search;
    const token = generateToken(pathWithQuery);
    
    console.log(`Fetching players page ${page} for team ${espnTeamId}...`);
    console.log(`URL: ${url.toString()}`);
    console.log(`Token: ${token.substring(0, 40)}...`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
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
      console.log(`API response (${response.status}):`, text.substring(0, 500));
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${text.substring(0, 200)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching players for team ${espnTeamId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all players for a team
 * Uses player search API with pagination
 * Returns preview data (counts) or full data based on previewOnly flag
 */
async function fetchAllPlayersForTeam(espnTeamId, options = {}) {
  const { previewOnly = false } = options;
  const recordsPerPage = 40;
  
  try {
    // Fetch first page to get total count
    const firstResponse = await fetchPlayersForTeam(espnTeamId, { page: 1 });
    
    // Debug: log response structure
    console.log('ESPN API response keys:', Object.keys(firstResponse));
    
    // Extract players from response - try different possible structures
    const extractPlayers = (response) => {
      if (response.results && Array.isArray(response.results)) {
        return response.results;
      } else if (response.players && Array.isArray(response.players)) {
        return response.players;
      } else if (response.content?.results) {
        return response.content.results;
      }
      return [];
    };
    
    let allPlayers = extractPlayers(firstResponse);
    const total = firstResponse.total || allPlayers.length;
    const totalPages = Math.ceil(total / recordsPerPage);
    
    console.log(`Found ${total} total players across ${totalPages} pages (first page: ${allPlayers.length})`);
    
    // Count by gender
    const countGenders = (players) => {
      const men = players.filter(p => p.gender === 'M').length;
      const women = players.filter(p => p.gender === 'F').length;
      return { men, women };
    };
    
    if (previewOnly) {
      const genderCounts = countGenders(allPlayers);
      // Estimate total counts based on first page ratio
      const ratio = total / allPlayers.length || 1;
      return {
        success: true,
        preview: true,
        total,
        totalPages,
        estimatedMen: Math.round(genderCounts.men * ratio),
        estimatedWomen: Math.round(genderCounts.women * ratio),
        samplePlayers: allPlayers.slice(0, 5).map(p => ({
          name: p.longName || p.name || p.title,
          gender: p.gender
        }))
      };
    }
    
    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        const pageResponse = await fetchPlayersForTeam(espnTeamId, { page });
        const pagePlayers = extractPlayers(pageResponse);
        allPlayers = allPlayers.concat(pagePlayers);
        console.log(`Page ${page}/${totalPages}: ${pagePlayers.length} players (total: ${allPlayers.length})`);
      } catch (pageError) {
        console.warn(`Error fetching page ${page}:`, pageError.message);
      }
    }
    
    const genderCounts = countGenders(allPlayers);
    
    return {
      success: true,
      preview: false,
      total: allPlayers.length,
      totalPages,
      men: genderCounts.men,
      women: genderCounts.women,
      players: allPlayers
    };
    
  } catch (error) {
    console.error('Error fetching all players:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateToken,
  escapeEarly,
  callEspnApi,
  fetchMatchData,
  fetchOversData,
  fetchSquadsData,
  fetchCommentary,
  transformData,
  transformSquadsData,
  parseOversData,
  extractMatchIds,
  fetchPlayersForTeam,
  fetchAllPlayersForTeam,
  AKAMAI_CONFIG
};
