/**
 * ESPN Cricinfo Scraper Service
 * 
 * Fetches live match data from ESPN Cricinfo using cheerio.
 * Admin can trigger this to populate match scores.
 */

const axios = require('axios');
const cheerio = require('cheerio');

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
    // EXTRACT TEAM DATA FROM EMBEDDED JSON
    // ESPN pages contain structured JSON with team information
    // ============================================
    let matchTeams = []; // Teams from the JSON (in home/away order)
    
    $('script').each((i, script) => {
      const scriptContent = $(script).html() || '';
      
      // Only process scripts that contain team data
      if (!scriptContent.includes('"longName"') || matchTeams.length >= 2) return;
      
      try {
        // Look for team objects with longName field
        // Pattern matches: "team": {..., "longName": "Team Name", ...}
        const longNamePattern = /"longName"\s*:\s*"([^"]+)"/g;
        let match;
        const foundNames = [];
        
        while ((match = longNamePattern.exec(scriptContent)) !== null) {
          const longName = match[1];
          // Filter for team-like names (countries/regions with Women/Men suffix or known cricket nations)
          if (longName && 
              !foundNames.includes(longName) && 
              (longName.includes('Women') || longName.includes('Men') || 
               longName.match(/^(India|Australia|England|Pakistan|South Africa|New Zealand|West Indies|Sri Lanka|Bangladesh|Afghanistan|Zimbabwe|Ireland|Scotland|Netherlands|Nepal|UAE|Oman|USA|Canada|Kenya|Hong Kong|Papua New Guinea)/i))) {
            foundNames.push(longName);
          }
        }
        
        // Take first two unique team names found
        if (foundNames.length >= 2 && matchTeams.length === 0) {
          matchTeams = foundNames.slice(0, 2);
        }
      } catch (e) {
        console.error('Error parsing team JSON:', e.message);
      }
    });

    result.debug.teamsFromJson = matchTeams;

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
    
    // Method 3: If we have matchTeams but couldn't determine batting order,
    // we'll assign teams to innings based on table parsing (handled below)
    
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

      // Look for extras near the batting table
      const parentDiv = battingTable.element.closest('div');
      const parentText = parentDiv.text();
      const extrasMatch = parentText.match(/Extras[:\s]*(\d+)\s*\(([^)]+)\)/i) ||
                          parentText.match(/\(([^)]*(?:lb|nb|w|b)[^)]*)\)\s*(\d+)/i);
      if (extrasMatch) {
        innings.extras = {
          total: parseInt(extrasMatch[1], 10) || parseInt(extrasMatch[2], 10) || 0,
          breakdown: extrasMatch[2] || extrasMatch[1] || ''
        };
      }

      // Look for total
      const totalMatch = parentText.match(/Total[^)]*\(([^)]+)\)\s*(\d+)(?:\/(\d+))?/i);
      if (totalMatch) {
        innings.overs = totalMatch[1].trim();
        innings.total = {
          runs: parseInt(totalMatch[2], 10) || 0,
          wickets: parseInt(totalMatch[3], 10) || 10
        };
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
  parseScore,
  parseOvers,
  parseExtras
};
