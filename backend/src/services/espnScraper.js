/**
 * ESPN Cricinfo Scraper Service
 * 
 * Fetches live match data from ESPN Cricinfo using cheerio.
 * Also fetches ball-by-ball commentary data for complete match history.
 * Admin can trigger this to populate match scores and over history.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// ESPN Consumer API base URL
const ESPN_API_BASE = 'https://hs-consumer-api.espncricinfo.com/v1/pages/match';

// Common headers for ESPN API requests - mimicking Chrome browser
const ESPN_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Origin': 'https://www.espncricinfo.com',
  'Referer': 'https://www.espncricinfo.com/',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'Priority': 'u=1, i'
};

/**
 * Extract match ID and series ID from ESPN Cricinfo URL
 * @param {string} url - ESPN Cricinfo match URL
 * @returns {Object|null} Object with matchId and seriesId, or null if not found
 */
function extractMatchIds(url) {
  // URL formats:
  // https://www.espncricinfo.com/series/icc-cricket-world-cup-2023-24-1367856/india-vs-australia-final-1384432/full-scorecard
  // https://www.espncricinfo.com/live-cricket-score/india-vs-australia-1384432
  // https://www.espncricinfo.com/series/1367856/scorecard/1384432/india-vs-australia
  
  try {
    // Try to extract match ID (usually the last number in the URL path)
    const matchIdMatch = url.match(/(\d{6,8})(?:\/[^\/]*)?$/);
    const matchId = matchIdMatch ? matchIdMatch[1] : null;
    
    // Try to extract series ID
    const seriesIdMatch = url.match(/series\/[^\/]*?(\d{6,8})/);
    const seriesId = seriesIdMatch ? seriesIdMatch[1] : null;
    
    if (matchId) {
      return { matchId, seriesId };
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting match IDs from URL:', e.message);
    return null;
  }
}

/**
 * Fetch ball-by-ball commentary data from ESPN API
 * @param {string} matchId - ESPN match ID
 * @param {string} seriesId - ESPN series ID
 * @param {number} inningsNumber - Innings number (1 or 2)
 * @returns {Promise<Array>} Array of ball commentary objects
 */
async function fetchBallByBallCommentary(matchId, seriesId, inningsNumber) {
  const allComments = [];
  let fromInningOver = -1; // Start from beginning
  let hasMore = true;
  let attempts = 0;
  const maxAttempts = 50; // Safety limit to prevent infinite loops
  
  while (hasMore && attempts < maxAttempts) {
    attempts++;
    
    try {
      const url = `${ESPN_API_BASE}/comments?seriesId=${seriesId}&matchId=${matchId}&inningNumber=${inningsNumber}&commentType=ALL&fromInningOver=${fromInningOver}`;
      
      console.log(`Fetching ball-by-ball: ${url}`);
      
      const response = await axios.get(url, {
        headers: ESPN_API_HEADERS,
        timeout: 15000
      });
      
      if (response.status !== 200 || !response.data) {
        console.log(`Unexpected response status: ${response.status}`);
        break;
      }
      
      const data = response.data;
      const comments = data.comments || [];
      
      console.log(`Received ${comments.length} comments for innings ${inningsNumber}, page ${attempts}`);
      
      if (comments.length === 0) {
        break;
      }
      
      // Add comments to our collection
      allComments.push(...comments);
      
      // Check if there's more data
      if (data.nextInningOver !== undefined && data.nextInningOver !== null) {
        fromInningOver = data.nextInningOver;
      } else {
        hasMore = false;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error fetching commentary for innings ${inningsNumber}, attempt ${attempts}:`, error.message);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Headers: ${JSON.stringify(error.response.headers)}`);
        console.error(`  Data: ${typeof error.response.data === 'string' ? error.response.data.substring(0, 200) : JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      break;
    }
  }
  
  // Sort by oversActual to ensure correct order
  allComments.sort((a, b) => (a.oversActual || 0) - (b.oversActual || 0));
  
  return allComments;
}

/**
 * Parse ESPN ball commentary into our ball format
 * @param {Array} comments - Array of ESPN commentary objects
 * @param {number} inningsNumber - Innings number (1 or 2)
 * @returns {Array} Array of parsed ball objects
 */
function parseCommentaryToBalls(comments, inningsNumber) {
  const balls = [];
  
  for (const comment of comments) {
    // Skip non-ball comments (like over summaries, breaks, etc.)
    if (!comment.oversActual && comment.oversActual !== 0) {
      continue;
    }
    
    // Parse oversActual (e.g., 15.3 means over 15, ball 3)
    // ESPN uses decimal format: 15.3 = over 15, ball 3
    const oversActual = parseFloat(comment.oversActual) || 0;
    const overNumber = Math.floor(oversActual);
    const ballInOver = Math.round((oversActual - overNumber) * 10);
    
    // Determine extra type
    let extraType = null;
    let isLegal = true;
    
    if (comment.isWide) {
      extraType = 'wide';
      isLegal = false;
    } else if (comment.isNoball) {
      extraType = 'no-ball';
      isLegal = false;
    } else if (comment.isBye) {
      extraType = 'bye';
    } else if (comment.isLegbye) {
      extraType = 'leg-bye';
    }
    
    // Calculate runs
    const batsmanRuns = comment.batsmanRuns || 0;
    const totalRuns = comment.totalRuns || 0;
    const extraRuns = totalRuns - batsmanRuns;
    
    const ball = {
      inningsNumber,
      overNumber,
      ballInOver,
      oversActual,
      
      // Players (ESPN names - will need to be mapped to local players)
      batsmanName: comment.batsman?.name || comment.batsmanName || null,
      batsmanId: comment.batsman?.id || comment.batsmanPlayerId || null,
      bowlerName: comment.bowler?.name || comment.bowlerName || null,
      bowlerId: comment.bowler?.id || comment.bowlerPlayerId || null,
      nonStrikerName: comment.otherBatsman?.name || null,
      nonStrikerId: comment.otherBatsman?.id || null,
      
      // Runs
      runs: batsmanRuns,
      totalRuns,
      extraRuns,
      
      // Extras
      isExtra: !!extraType,
      extraType,
      isLegal,
      
      // Boundaries
      isFour: !!comment.isFour,
      isSix: !!comment.isSix,
      
      // Wicket
      isWicket: !!comment.isWicket,
      wicketType: comment.dismissalType || null,
      dismissedBatsmanName: comment.dismissedBatsman?.name || null,
      dismissedBatsmanId: comment.dismissedBatsman?.id || null,
      fielderName: comment.fielders?.[0]?.name || null,
      fielderId: comment.fielders?.[0]?.id || null,
      
      // Commentary text (for reference)
      title: comment.title || '',
      commentary: comment.text || comment.shortText || ''
    };
    
    balls.push(ball);
  }
  
  return balls;
}

/**
 * Fetch complete ball-by-ball data for a match
 * @param {string} url - ESPN Cricinfo match URL
 * @returns {Promise<Object>} Object with innings and their ball-by-ball data
 */
async function fetchBallByBallData(url) {
  const ids = extractMatchIds(url);
  
  if (!ids || !ids.matchId) {
    return {
      success: false,
      error: 'Could not extract match ID from URL'
    };
  }
  
  // If we don't have series ID, try to get it from match details
  let { matchId, seriesId } = ids;
  
  if (!seriesId) {
    try {
      // Try to fetch match details to get series ID
      const detailsUrl = `${ESPN_API_BASE}/details?matchId=${matchId}&latest=true`;
      const detailsResponse = await axios.get(detailsUrl, {
        headers: ESPN_API_HEADERS,
        timeout: 15000
      });
      
      if (detailsResponse.data?.match?.series?.objectId) {
        seriesId = detailsResponse.data.match.series.objectId;
      }
    } catch (e) {
      console.error('Error fetching match details for series ID:', e.message);
    }
  }
  
  if (!seriesId) {
    return {
      success: false,
      error: 'Could not determine series ID. Please provide a URL with the series ID included.'
    };
  }
  
  const result = {
    matchId,
    seriesId,
    innings: []
  };
  
  // Fetch ball-by-ball for both innings
  for (const inningsNum of [1, 2]) {
    try {
      const comments = await fetchBallByBallCommentary(matchId, seriesId, inningsNum);
      
      if (comments.length > 0) {
        const balls = parseCommentaryToBalls(comments, inningsNum);
        
        result.innings.push({
          inningsNumber: inningsNum,
          balls,
          totalBalls: balls.filter(b => b.isLegal).length,
          rawCommentCount: comments.length
        });
      }
    } catch (e) {
      console.error(`Error processing innings ${inningsNum}:`, e.message);
    }
  }
  
  return {
    success: true,
    data: result
  };
}

/**
 * Fetch and parse live match data from ESPN Cricinfo URL
 * @param {string} url - ESPN Cricinfo match URL
 * @returns {Promise<Object>} Parsed match data
 */
async function fetchLiveMatchData(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/'
      },
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    if (response.status === 403) {
      return {
        success: false,
        error: 'Access denied by ESPN (403).',
        suggestion: 'Use browser DevTools method instead'
      };
    }

    if (response.status !== 200) {
      return {
        success: false,
        error: `ESPN returned status ${response.status}`
      };
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const result = {
      teams: {},
      innings: [],
      battingTeam: null,
      battingTeamOvers: null,
      target: null,
      matchStatus: null,
      matchState: {
        isStarted: false,
        isLive: false,
        isComplete: false,
        isBreak: false
      },
      recentOvers: null,
      espnIds: extractMatchIds(url), // Include ESPN IDs for ball-by-ball fetching
      debug: {} // Debug info
    };

    // ============================================
    // PARSE MATCH STATUS
    // ============================================
    const statusSelectors = [
      'p.ds-text-tight-s.ds-font-medium.ds-truncate',
      'span.ds-text-tight-s',
      'p[class*="ci-match-status"]'
    ];
    
    for (const selector of statusSelectors) {
      const statusText = $(selector).first().text().trim();
      if (statusText && (statusText.includes('won') || statusText.includes('need') || statusText.includes('trail'))) {
        result.matchStatus = statusText;
        break;
      }
    }

    if (result.matchStatus) {
      const statusLower = result.matchStatus.toLowerCase();
      result.matchState.isComplete = statusLower.includes('won') || statusLower.includes('drawn') || statusLower.includes('no result');
      result.matchState.isStarted = true;
      result.matchState.isLive = !result.matchState.isComplete;
    }

    // ============================================
    // PARSE TARGET
    // ============================================
    const pageText = $('body').text();
    const targetMatch = pageText.match(/T:\s*(\d+)|target\s*[:\s]*(\d+)/i);
    if (targetMatch) {
      result.target = parseInt(targetMatch[1] || targetMatch[2], 10);
    }

    // ============================================
    // FIND ALL TABLES AND CATEGORIZE THEM
    // ============================================
    const allTables = [];
    
    $('table').each((idx, table) => {
      const tableEl = $(table);
      const headers = [];
      
      // Get header text
      tableEl.find('thead th, thead td').each((i, th) => {
        headers.push($(th).text().trim().toUpperCase());
      });
      
      const headerStr = headers.join('|');
      
      // Determine table type
      let tableType = 'unknown';
      if (headerStr.includes('4S') && headerStr.includes('6S') && headerStr.includes('SR')) {
        tableType = 'batting';
      } else if (headerStr.includes('ECON') || (headerStr.includes('O') && headerStr.includes('M') && headerStr.includes('W') && !headerStr.includes('4S'))) {
        tableType = 'bowling';
      }
      
      if (tableType !== 'unknown') {
        allTables.push({
          type: tableType,
          element: tableEl,
          headers: headers
        });
      }
    });

    const battingTables = allTables.filter(t => t.type === 'batting');
    const bowlingTables = allTables.filter(t => t.type === 'bowling');

    result.debug.tablesFound = allTables.length;
    result.debug.tableTypes = allTables.map(t => t.type);
    result.debug.battingTables = battingTables.length;
    result.debug.bowlingTables = bowlingTables.length;

    // ============================================
    // EXTRACT TEAM DATA AND INNINGS DATA FROM EMBEDDED JSON
    // ESPN pages contain structured JSON with team and innings information
    // ============================================
    let matchTeams = []; // Teams from the JSON (in home/away order)
    let jsonInningsData = []; // Innings data from JSON (more reliable than HTML parsing)
    
    $('script').each((i, script) => {
      const scriptContent = $(script).html() || '';
      
      // Only process scripts that contain team/innings data
      if (!scriptContent.includes('"longName"')) return;
      
      try {
        // Extract match and series IDs from JSON if not already found
        if (!result.espnIds) {
          const matchIdMatch = scriptContent.match(/"objectId"\s*:\s*(\d+)/);
          const seriesIdMatch = scriptContent.match(/"series"\s*:\s*\{[^}]*"objectId"\s*:\s*(\d+)/);
          if (matchIdMatch || seriesIdMatch) {
            result.espnIds = {
              matchId: matchIdMatch ? matchIdMatch[1] : null,
              seriesId: seriesIdMatch ? seriesIdMatch[1] : null
            };
          }
        }
        
        // Extract team names
        if (matchTeams.length < 2) {
          const longNamePattern = /"longName"\s*:\s*"([^"]+)"/g;
          let match;
          const foundNames = [];
          
          while ((match = longNamePattern.exec(scriptContent)) !== null) {
            const longName = match[1];
            if (longName && 
                !foundNames.includes(longName) && 
                (longName.includes('Women') || longName.includes('Men') || 
                 longName.match(/^(India|Australia|England|Pakistan|South Africa|New Zealand|West Indies|Sri Lanka|Bangladesh|Afghanistan|Zimbabwe|Ireland|Scotland|Netherlands|Nepal|UAE|Oman|USA|Canada|Kenya|Hong Kong|Papua New Guinea)/i))) {
              foundNames.push(longName);
            }
          }
          
          if (foundNames.length >= 2 && matchTeams.length === 0) {
            matchTeams = foundNames.slice(0, 2);
          }
        }
        
        // Extract innings data from JSON - look for innings blocks
        // The structure has inningNumber followed by team info and then stats
        if (scriptContent.includes('"inningNumber"') && scriptContent.includes('"extras"')) {
          // Split by inningNumber to get each innings block
          const inningBlocks = scriptContent.split(/"inningNumber"\s*:\s*/);
          
          for (let blockIdx = 1; blockIdx < inningBlocks.length; blockIdx++) {
            const block = inningBlocks[blockIdx];
            
            // Extract inning number (first number after split)
            const inningNumMatch = block.match(/^(\d+)/);
            if (!inningNumMatch) continue;
            const inningNum = parseInt(inningNumMatch[1]);
            
            // Skip if we already have this innings
            if (jsonInningsData.find(ji => ji.inningNumber === inningNum)) continue;
            
            // Extract team longName - look for the first longName after team object
            const teamMatch = block.match(/"team"\s*:\s*\{[^}]*"longName"\s*:\s*"([^"]+)"/);
            const teamName = teamMatch ? teamMatch[1] : null;
            if (!teamName) continue;
            
            // Extract runs, wickets, overs (look for these fields at the innings level, not nested)
            // These appear after the team object in the innings
            const runsMatch = block.match(/"runs"\s*:\s*(\d+)/);
            const wicketsMatch = block.match(/"wickets"\s*:\s*(\d+)/);
            const oversMatch = block.match(/"overs"\s*:\s*([\d.]+)/);
            const extrasMatch = block.match(/"extras"\s*:\s*(\d+)/);
            const byesMatch = block.match(/"byes"\s*:\s*(\d+)/);
            const legbyesMatch = block.match(/"legbyes"\s*:\s*(\d+)/);
            const widesMatch = block.match(/"wides"\s*:\s*(\d+)/);
            const noballsMatch = block.match(/"noballs"\s*:\s*(\d+)/);
            
            // Only add if we have the essential fields
            if (runsMatch && wicketsMatch) {
              // Extract current batsmen info (for live matches)
              let currentBatsmen = [];
              
              // Look for inningBatsmen array in this block
              const batsmenBlockMatch = block.match(/"inningBatsmen"\s*:\s*\[([\s\S]*?)\]/);
              if (batsmenBlockMatch) {
                const batsmenBlock = batsmenBlockMatch[1];
                // Split by player objects
                const playerMatches = batsmenBlock.matchAll(/"player"\s*:\s*\{[^}]*"longName"\s*:\s*"([^"]+)"[^}]*\}[\s\S]*?"runs"\s*:\s*(\d+)[\s\S]*?"balls"\s*:\s*(\d+)[\s\S]*?"isOnStrike"\s*:\s*(true|false)/g);
                
                for (const pm of playerMatches) {
                  currentBatsmen.push({
                    name: pm[1],
                    runs: parseInt(pm[2]),
                    balls: parseInt(pm[3]),
                    isOnStrike: pm[4] === 'true'
                  });
                }
              }
              
              // Also try to extract current bowler
              let currentBowler = null;
              const bowlerMatch = block.match(/"inningBowlers"\s*:\s*\[[\s\S]*?"player"\s*:\s*\{[^}]*"longName"\s*:\s*"([^"]+)"/);
              if (bowlerMatch) {
                currentBowler = bowlerMatch[1];
              }
              
              jsonInningsData.push({
                inningNumber: inningNum,
                team: teamName,
                runs: parseInt(runsMatch[1]),
                wickets: parseInt(wicketsMatch[1]),
                overs: oversMatch ? parseFloat(oversMatch[1]) : 0,
                extras: {
                  total: extrasMatch ? parseInt(extrasMatch[1]) : 0,
                  byes: byesMatch ? parseInt(byesMatch[1]) : 0,
                  legByes: legbyesMatch ? parseInt(legbyesMatch[1]) : 0,
                  wides: widesMatch ? parseInt(widesMatch[1]) : 0,
                  noBalls: noballsMatch ? parseInt(noballsMatch[1]) : 0
                },
                currentBatsmen: currentBatsmen,
                currentBowler: currentBowler,
                isCurrent: block.includes('"isCurrent":true') || block.includes('"isCurrent": true')
              });
            }
          }
        }
      } catch (e) {
        console.error('Error parsing ESPN JSON:', e.message);
      }
    });
    
    // Sort innings by number
    jsonInningsData.sort((a, b) => a.inningNumber - b.inningNumber);

    result.debug.teamsFromJson = matchTeams;
    result.debug.jsonInningsData = jsonInningsData;

    // ============================================
    // DETERMINE INNINGS ORDER
    // ESPN scorecard shows batting team first in each innings section
    // We need to find which team batted first
    // ============================================
    let inningsTeams = [];
    
    // Method 1: Look for innings section headers
    // ESPN shows text like "Sri Lanka Women Innings" before each batting section
    const inningsHeaderPattern = /^([A-Za-z\s]+?)\s+(?:1st\s+|2nd\s+)?[Ii]nnings/i;
    
    $('span, div, h2, h3, h4, p').each((i, el) => {
      if (inningsTeams.length >= 2) return;
      
      const text = $(el).text().trim();
      const match = text.match(inningsHeaderPattern);
      
      if (match) {
        let teamName = match[1].trim();
        
        // Validate it's actually a team name (not just "Innings")
        if (teamName.length > 3 && teamName.length < 30) {
          // Try to match with known team names from JSON
          const matchedTeam = matchTeams.find(t => 
            t.toLowerCase().includes(teamName.toLowerCase()) || 
            teamName.toLowerCase().includes(t.toLowerCase())
          );
          
          const finalName = matchedTeam || teamName;
          
          if (!inningsTeams.includes(finalName)) {
            inningsTeams.push(finalName);
          }
        }
      }
    });
    
    // Method 2: Look for team name patterns like "Team (20 ovs maximum)"
    if (inningsTeams.length < 2) {
      $('span, div, p').each((i, el) => {
        if (inningsTeams.length >= 2) return;
        
        const text = $(el).text().trim();
        // Match pattern: "TeamName (... ovs ...)" 
        const match = text.match(/^([A-Za-z\s]+)\s*\(\s*(?:T:\s*\d+\s*runs\s*from\s*)?(\d+(?:\.\d)?)\s*[Oo]v/);
        
        if (match && match[1].length < 30 && match[1].length > 3) {
          let teamName = match[1].trim();
          
          // Try to match with known team names from JSON
          const matchedTeam = matchTeams.find(t => 
            t.toLowerCase().includes(teamName.toLowerCase()) || 
            teamName.toLowerCase().includes(t.toLowerCase())
          );
          
          const finalName = matchedTeam || teamName;
          
          if (!inningsTeams.includes(finalName)) {
            inningsTeams.push(finalName);
          }
        }
      });
    }
    
    // Method 3: Use team order from JSON innings data if available
    if (inningsTeams.length < 2 && jsonInningsData.length >= 2) {
      inningsTeams = jsonInningsData.map(ji => ji.team);
    }
    
    result.debug.inningsTeams = inningsTeams;
    
    // Use innings order if determined, otherwise we'll use team detection per table
    const teamNames = inningsTeams.length >= 2 ? inningsTeams : matchTeams;
    result.debug.teamNamesFound = teamNames;

    // ============================================
    // PARSE INNINGS DATA
    // Process each batting table as an innings
    // ============================================
    battingTables.forEach((battingTable, inningsIdx) => {
      // Try to find the team name for this innings
      let teamName = teamNames[inningsIdx];
      
      // If no team name yet, try to find it from the table's context
      if (!teamName) {
        // Look at content near the batting table for team identification
        const parentDiv = battingTable.element.closest('div');
        const precedingText = parentDiv.prev().text() || '';
        
        // Check if any known team name appears
        for (const team of matchTeams) {
          if (precedingText.includes(team)) {
            teamName = team;
            break;
          }
        }
      }
      
      teamName = teamName || `Innings ${inningsIdx + 1}`;
      const bowlingTable = bowlingTables[inningsIdx]; // Corresponding bowling table
      
      const innings = {
        team: teamName,
        batting: [],
        bowling: [],
        extras: null,
        total: null,
        overs: null
      };

      // Parse batting
      battingTable.element.find('tbody tr').each((rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;
        
        // Get batsman name from first cell
        let batsmanName = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim();
        
        // Skip non-player rows
        const lowerName = batsmanName.toLowerCase();
        if (!batsmanName || lowerName.includes('extra') || lowerName.includes('total') || 
            lowerName.includes('did not bat') || lowerName.includes('fall of wicket')) {
          return;
        }
        
        // Get all cell values
        const cellValues = [];
        cells.each((i, cell) => cellValues.push($(cell).text().trim()));
        
        // Dismissal is usually in the second cell
        const dismissal = cellValues[1] || '';
        
        // Parse numeric values - R, B, M, 4s, 6s, SR
        let runs = 0, balls = 0, fours = 0, sixes = 0, strikeRate = 0;
        
        // ESPN typical layout: Name | Dismissal | R | B | M | 4s | 6s | SR
        // Or sometimes: Name | Dismissal | R | B | 4s | 6s | SR
        if (cellValues.length >= 8) {
          runs = parseInt(cellValues[2], 10) || 0;
          balls = parseInt(cellValues[3], 10) || 0;
          // cellValues[4] might be minutes (M) - skip it
          fours = parseInt(cellValues[5], 10) || 0;
          sixes = parseInt(cellValues[6], 10) || 0;
          strikeRate = parseFloat(cellValues[7]) || 0;
        } else if (cellValues.length >= 7) {
          runs = parseInt(cellValues[2], 10) || 0;
          balls = parseInt(cellValues[3], 10) || 0;
          fours = parseInt(cellValues[4], 10) || 0;
          sixes = parseInt(cellValues[5], 10) || 0;
          strikeRate = parseFloat(cellValues[6]) || 0;
        }
        
        const isNotOut = dismissal.toLowerCase().includes('not out') || dismissal === '';
        
        innings.batting.push({
          name: batsmanName,
          dismissal: dismissal || null,
          runs,
          balls,
          fours,
          sixes,
          strikeRate,
          isNotOut
        });
      });

      // Parse bowling (if we have a corresponding bowling table)
      if (bowlingTable) {
        bowlingTable.element.find('tbody tr').each((rowIdx, row) => {
          const cells = $(row).find('td');
          if (cells.length < 5) return;
          
          let bowlerName = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim();
          
          if (!bowlerName || bowlerName.toLowerCase().includes('total')) return;
          
          const cellValues = [];
          cells.each((i, cell) => cellValues.push($(cell).text().trim()));
          
          // ESPN bowling layout: Name | O | M | R | W | ECON | 0s | 4s | 6s | WD | NB
          const overs = parseFloat(cellValues[1]) || 0;
          const maidens = parseInt(cellValues[2], 10) || 0;
          const runs = parseInt(cellValues[3], 10) || 0;
          const wickets = parseInt(cellValues[4], 10) || 0;
          const economy = parseFloat(cellValues[5]) || 0;
          const dotBalls = parseInt(cellValues[6], 10) || 0;
          
          if (overs > 0) {
            innings.bowling.push({
              name: bowlerName,
              overs,
              maidens,
              runs,
              wickets,
              economy,
              dotBalls
            });
          }
        });
      }

      // Get extras and totals - prefer JSON data (more reliable than HTML parsing)
      const jsonInnings = jsonInningsData.find(ji => 
        ji.team.toLowerCase().includes(teamName.toLowerCase()) || 
        teamName.toLowerCase().includes(ji.team.toLowerCase())
      ) || jsonInningsData[inningsIdx];
      
      if (jsonInnings) {
        // Use JSON data for extras (much more reliable)
        innings.extras = {
          total: jsonInnings.extras.total,
          wides: jsonInnings.extras.wides,
          noBalls: jsonInnings.extras.noBalls,
          byes: jsonInnings.extras.byes,
          legByes: jsonInnings.extras.legByes,
          breakdown: `b ${jsonInnings.extras.byes}, lb ${jsonInnings.extras.legByes}, w ${jsonInnings.extras.wides}, nb ${jsonInnings.extras.noBalls}`
        };
        
        // Use JSON data for total
        innings.total = {
          runs: jsonInnings.runs,
          wickets: jsonInnings.wickets
        };
        
        innings.overs = jsonInnings.overs.toString();
        
        // Add current batsmen info (striker/non-striker) for live matches
        if (jsonInnings.currentBatsmen && jsonInnings.currentBatsmen.length > 0) {
          innings.currentBatsmen = jsonInnings.currentBatsmen;
          // Identify striker and non-striker
          const striker = jsonInnings.currentBatsmen.find(b => b.isOnStrike);
          const nonStriker = jsonInnings.currentBatsmen.find(b => !b.isOnStrike);
          if (striker) innings.striker = striker;
          if (nonStriker) innings.nonStriker = nonStriker;
        }
        
        // Add current bowler for live matches
        if (jsonInnings.currentBowler) {
          innings.currentBowler = jsonInnings.currentBowler;
        }
        
        // Mark if this is the current innings
        innings.isCurrent = jsonInnings.isCurrent || false;
      } else {
        // Fallback: Look for extras near the batting table in HTML
        const parentDiv = battingTable.element.closest('div');
        const parentText = parentDiv.text();
        const extrasMatch = parentText.match(/Extras[:\s]*(\d+)\s*\(([^)]+)\)/i);
        if (extrasMatch) {
          const extrasTotal = parseInt(extrasMatch[1], 10) || 0;
          const breakdown = extrasMatch[2] || '';
          innings.extras = {
            total: extrasTotal,
            breakdown: breakdown,
            ...parseExtras(breakdown)
          };
        }

        // Fallback: Look for total in HTML
        const totalMatch = parentText.match(/Total[^)]*\(([^)]+)\)\s*(\d+)(?:\/(\d+))?/i);
        if (totalMatch) {
          innings.overs = totalMatch[1].trim();
          innings.total = {
            runs: parseInt(totalMatch[2], 10) || 0,
            wickets: parseInt(totalMatch[3], 10) || 10
          };
        }
      }

      // Only add if we found batting data
      if (innings.batting.length > 0) {
        result.innings.push(innings);
        result.teams[teamName] = {
          score: innings.total ? `${innings.total.runs}/${innings.total.wickets}` : null,
          overs: innings.overs
        };
      }
    });

    // Set batting team (last innings team for completed matches)
    if (result.innings.length > 0) {
      const lastInnings = result.innings[result.innings.length - 1];
      result.battingTeam = lastInnings.team;
      result.battingTeamOvers = lastInnings.overs;
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error(`ESPN Scraper error for ${url}:`, error.message);
    
    return {
      success: false,
      error: error.response?.status === 404 
        ? 'Match page not found' 
        : `Failed to fetch match data: ${error.message}`
    };
  }
}

/**
 * Parse score string like "256/4" into runs and wickets
 */
function parseScore(scoreText) {
  if (!scoreText) return { runs: 0, wickets: 0 };
  const match = scoreText.match(/(\d+)(?:\/(\d+))?/);
  if (match) {
    return {
      runs: parseInt(match[1], 10) || 0,
      wickets: parseInt(match[2], 10) || 0
    };
  }
  return { runs: 0, wickets: 0 };
}

/**
 * Parse overs string like "15.3" into total balls
 */
function parseOvers(oversText) {
  if (!oversText) return 0;
  const match = oversText.match(/(\d+)(?:\.(\d))?/);
  if (match) {
    const overs = parseInt(match[1], 10) || 0;
    const balls = parseInt(match[2], 10) || 0;
    return (overs * 6) + balls;
  }
  return 0;
}

/**
 * Parse extras breakdown like "b 4, lb 2, w 5, nb 1"
 */
function parseExtras(extrasText) {
  const result = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
  if (!extrasText) return result;
  
  const wideMatch = extrasText.match(/w\s*(\d+)/i);
  if (wideMatch) result.wides = parseInt(wideMatch[1], 10);
  
  const noBallMatch = extrasText.match(/nb\s*(\d+)/i);
  if (noBallMatch) result.noBalls = parseInt(noBallMatch[1], 10);
  
  const byeMatch = extrasText.match(/\bb\s*(\d+)/i);
  if (byeMatch) result.byes = parseInt(byeMatch[1], 10);
  
  const legByeMatch = extrasText.match(/lb\s*(\d+)/i);
  if (legByeMatch) result.legByes = parseInt(legByeMatch[1], 10);
  
  return result;
}

module.exports = {
  fetchLiveMatchData,
  fetchBallByBallData,
  fetchBallByBallCommentary,
  parseCommentaryToBalls,
  extractMatchIds,
  parseScore,
  parseOvers,
  parseExtras
};
