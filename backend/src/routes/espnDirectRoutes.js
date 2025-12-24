/**
 * ESPN Direct Fetch Routes
 * 
 * These routes use direct token generation to fetch ESPN data.
 * NO BROWSER NEEDED - fastest and most reliable method!
 * 
 * This file exports a function that adds routes to an existing router.
 */

const espnTokenFetcher = require('../services/espnTokenFetcher');
const Country = require('../models/Country');
const Player = require('../models/Player');

/**
 * Add direct fetch routes to the ESPN router
 */
function addDirectFetchRoutes(router, auth, Match, matchEspnTeamsToLocal, matchPlayer) {
  
  /**
   * POST /api/espn/direct-fetch
   * Fetch match data directly using self-generated Akamai tokens
   * NO BROWSER NEEDED - fastest and most reliable method!
   */
  router.post('/direct-fetch', auth, async (req, res, next) => {
    try {
      const { url, captureOvers = true } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'ESPN Cricinfo URL is required'
        });
      }

      if (!url.includes('espncricinfo.com') && !url.includes('cricinfo.com')) {
        return res.status(400).json({
          success: false,
          message: 'URL must be from espncricinfo.com'
        });
      }

      console.log(`Direct fetch requested for: ${url}`);
      
      const result = await espnTokenFetcher.fetchMatchData(url, { captureOvers });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      // Transform the captured data to our standard format
      const transformedData = espnTokenFetcher.transformData(result.data);

      res.json({
        success: true,
        data: transformedData,
        rawData: result.data,
        matchIds: result.matchIds,
        fetchMethod: 'direct-token'
      });

    } catch (error) {
      console.error('Direct fetch error:', error);
      next(error);
    }
  });

  /**
   * POST /api/espn/direct-fetch-overs
   * Fetch only overs/ball-by-ball data using direct token generation
   */
  router.post('/direct-fetch-overs', auth, async (req, res, next) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'ESPN Cricinfo URL is required'
        });
      }

      console.log(`Direct fetch overs requested for: ${url}`);
      
      const result = await espnTokenFetcher.fetchOversData(url);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      // Parse the overs data
      let parsedData = null;
      if (result.data.oversDetails) {
        parsedData = espnTokenFetcher.parseOversData(result.data.oversDetails);
      }

      res.json({
        success: true,
        data: parsedData || result.data,
        rawData: result.data,
        matchIds: result.matchIds,
        fetchMethod: 'direct-token'
      });

    } catch (error) {
      console.error('Direct fetch overs error:', error);
      next(error);
    }
  });

  /**
   * POST /api/espn/match/:matchId/direct-preview
   * Fetch ESPN data using direct token generation and return preview with player matching
   * This is the FASTEST method - no browser needed!
   */
  router.post('/match/:matchId/direct-preview', auth, async (req, res, next) => {
    try {
      const { matchId } = req.params;
      const { espnUrl } = req.body;

      // Get the match with populated teams and squads
      const match = await Match.findById(matchId)
        .populate('team1', 'name shortName code')
        .populate('team2', 'name shortName code')
        .populate('squads.team1.player', 'name')
        .populate('squads.team2.player', 'name');

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      // Use provided URL or fall back to match's stored ESPN URL
      const urlToFetch = espnUrl || match.espnUrl;

      if (!urlToFetch) {
        return res.status(400).json({
          success: false,
          message: 'ESPN URL not provided and not set for this match'
        });
      }

      console.log(`Direct preview requested for match ${matchId}`);
      console.log(`Fetching from: ${urlToFetch}`);

      // Fetch ESPN data using direct token generation
      const fetchResult = await espnTokenFetcher.fetchMatchData(urlToFetch, {
        captureOvers: true
      });

      if (!fetchResult.success) {
        return res.status(400).json({
          success: false,
          message: fetchResult.error || 'Failed to fetch ESPN data',
          suggestion: 'Check the URL is correct and try again'
        });
      }

      // Transform to our format
      const transformedData = espnTokenFetcher.transformData(fetchResult.data);

      // Check if we got any useful data - try to extract from scorecard if needed
      if (!transformedData.innings || transformedData.innings.length === 0) {
        if (fetchResult.data.scorecard && fetchResult.data.scorecard.content) {
          const scorecard = fetchResult.data.scorecard.content;
          transformedData.innings = [];
          
          if (scorecard.innings) {
            for (const inn of scorecard.innings) {
              transformedData.innings.push({
                team: inn.team?.longName || inn.team?.name || 'Unknown',
                batting: (inn.inningBatsmen || []).map(b => ({
                  name: b.player?.longName || b.player?.name,
                  runs: b.runs || 0,
                  balls: b.balls || 0,
                  fours: b.fours || 0,
                  sixes: b.sixes || 0,
                  strikeRate: b.strikerate || 0,
                  isNotOut: !b.isOut,
                  dismissal: b.outDescription || null
                })),
                bowling: (inn.inningBowlers || []).map(b => ({
                  name: b.player?.longName || b.player?.name,
                  overs: b.overs || 0,
                  maidens: b.maidens || 0,
                  runs: b.conceded || b.runs || 0,
                  wickets: b.wickets || 0,
                  economy: b.economy || 0,
                  dotBalls: b.dots || 0
                })),
                extras: {
                  total: inn.extras || 0,
                  byes: inn.byes || 0,
                  legByes: inn.legbyes || 0,
                  wides: inn.wides || 0,
                  noBalls: inn.noballs || 0
                },
                total: inn.runs !== undefined ? { runs: inn.runs, wickets: inn.wickets || 0 } : null,
                overs: inn.overs || null
              });
            }
          }
        }
      }

      if (!transformedData.innings || transformedData.innings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract innings data from ESPN',
          debug: {
            capturedApis: Object.keys(fetchResult.data).filter(k => fetchResult.data[k] !== null)
          }
        });
      }

      // Match ESPN teams to local teams
      const espnData = {
        teams: transformedData.teams || {},
        innings: transformedData.innings,
        matchStatus: transformedData.matchStatus,
        target: transformedData.target
      };

      // Build teams object if empty
      if (Object.keys(espnData.teams).length === 0 && espnData.innings.length > 0) {
        for (const inn of espnData.innings) {
          if (inn.team) {
            espnData.teams[inn.team] = { score: inn.total, overs: inn.overs };
          }
        }
      }

      const teamMapping = matchEspnTeamsToLocal(espnData, match);

      if (!teamMapping.matched) {
        return res.status(400).json({
          success: false,
          message: `Could not match ESPN teams to local teams. ESPN teams: ${Object.keys(espnData.teams).join(', ')}. Local teams: ${match.team1.name}, ${match.team2.name}`,
          espnTeams: Object.keys(espnData.teams),
          localTeams: [match.team1.name, match.team2.name]
        });
      }

      // Build preview with player matching
      const preview = {
        matchId: match._id,
        espnUrl: urlToFetch,
        matchStatus: espnData.matchStatus,
        target: espnData.target,
        teamMapping: teamMapping,
        innings: []
      };

      // Process each ESPN innings
      for (const espnInnings of espnData.innings) {
        const localTeamInfo = teamMapping.mapping[espnInnings.team];
        
        if (!localTeamInfo) {
          console.warn(`Could not find local team for ESPN team: ${espnInnings.team}`);
          continue;
        }

        const localTeam = localTeamInfo.team;
        const squadKey = localTeamInfo.squadKey;
        const squad = match.squads[squadKey];
        const opposingSquadKey = squadKey === 'team1' ? 'team2' : 'team1';
        const opposingSquad = match.squads[opposingSquadKey];

        const inningsPreview = {
          espnTeam: espnInnings.team,
          localTeam: {
            _id: localTeam._id,
            name: localTeam.name
          },
          total: espnInnings.total,
          overs: espnInnings.overs,
          extras: espnInnings.extras,
          isCurrent: espnInnings.isCurrent || false,
          striker: null,
          nonStriker: null,
          currentBowler: null,
          batting: [],
          bowling: []
        };

        // Match batsmen
        for (const espnBatsman of (espnInnings.batting || [])) {
          const playerMatch = matchPlayer(
            espnBatsman.name,
            squad,
            match.espnPlayerMappings,
            localTeam._id
          );

          inningsPreview.batting.push({
            espnName: espnBatsman.name,
            espnStats: {
              runs: espnBatsman.runs,
              balls: espnBatsman.balls,
              fours: espnBatsman.fours,
              sixes: espnBatsman.sixes,
              strikeRate: espnBatsman.strikeRate,
              isNotOut: espnBatsman.isNotOut,
              dismissal: espnBatsman.dismissal
            },
            matchedPlayer: playerMatch.player,
            matchType: playerMatch.type,
            confidence: playerMatch.confidence,
            candidates: playerMatch.candidates
          });
        }

        // Match bowlers (from opposing team)
        for (const espnBowler of (espnInnings.bowling || [])) {
          const playerMatch = matchPlayer(
            espnBowler.name,
            opposingSquad,
            match.espnPlayerMappings,
            localTeamInfo.opposingTeamId
          );

          inningsPreview.bowling.push({
            espnName: espnBowler.name,
            espnStats: {
              overs: espnBowler.overs,
              maidens: espnBowler.maidens,
              runs: espnBowler.runs,
              wickets: espnBowler.wickets,
              economy: espnBowler.economy,
              dotBalls: espnBowler.dotBalls
            },
            matchedPlayer: playerMatch.player,
            matchType: playerMatch.type,
            confidence: playerMatch.confidence,
            candidates: playerMatch.candidates
          });
        }

        preview.innings.push(inningsPreview);
      }

      // Store ball-by-ball data if available for later sync
      if (transformedData.ballByBall) {
        preview.ballByBallAvailable = true;
      }

      console.log(`Direct preview complete: ${preview.innings.length} innings found`);

      res.json({
        success: true,
        data: preview,
        fetchMethod: 'direct-token'
      });

    } catch (error) {
      console.error('Direct preview error:', error);
      next(error);
    }
  });

  // ============================================
  // SQUADS FETCHING FOR MATCH CREATION
  // ============================================

  /**
   * POST /api/espn/fetch-squads
   * Fetch match squads from ESPN for use in match creation
   */
  router.post('/fetch-squads', auth, async (req, res, next) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'ESPN Cricinfo URL is required'
        });
      }

      if (!url.includes('espncricinfo.com') && !url.includes('cricinfo.com')) {
        return res.status(400).json({
          success: false,
          message: 'URL must be from espncricinfo.com'
        });
      }

      console.log(`Fetching squads from: ${url}`);
      
      const result = await espnTokenFetcher.fetchSquadsData(url);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to fetch squads data'
        });
      }

      const transformedData = espnTokenFetcher.transformSquadsData(result.data);

      if (!transformedData.teams || transformedData.teams.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract team data from ESPN. The match may not have squads announced yet.',
          debug: {
            teamsFound: transformedData.teams?.length || 0,
            matchInfo: transformedData.matchInfo
          }
        });
      }

      console.log(`Squads fetch complete: ${transformedData.teams.length} teams`);

      res.json({
        success: true,
        data: transformedData,
        rawData: result.data,
        matchIds: result.matchIds,
        fetchMethod: 'direct-token'
      });

    } catch (error) {
      console.error('Fetch squads error:', error);
      next(error);
    }
  });

  /**
   * POST /api/espn/preview-match-creation
   * Preview match creation from ESPN data with player matching
   */
  router.post('/preview-match-creation', auth, async (req, res, next) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'ESPN Cricinfo URL is required'
        });
      }

      console.log(`Preview match creation from: ${url}`);
      
      const result = await espnTokenFetcher.fetchSquadsData(url);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to fetch ESPN data'
        });
      }

      const espnData = espnTokenFetcher.transformSquadsData(result.data);

      if (!espnData.teams || espnData.teams.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract team data from ESPN'
        });
      }

      const countries = await Country.find({}).lean();

      const preview = {
        matchInfo: espnData.matchInfo,
        espnUrl: url,
        scorecardUrl: url.replace(/\/match-squads$/, '/full-scorecard').replace(/\/live-cricket-score$/, '/full-scorecard'),
        teamMapping: [],
        unmatchedPlayers: []
      };

      for (const espnTeam of espnData.teams) {
        const teamPreview = {
          espnTeam: {
            id: espnTeam.espnId,
            name: espnTeam.name,
            shortName: espnTeam.shortName
          },
          localTeam: null,
          localTeamCandidates: [],
          players: []
        };

        const normalizedEspnName = normalizeTeamNameForMatching(espnTeam.name);
        
        for (const country of countries) {
          const normalizedLocalName = normalizeTeamNameForMatching(country.name);
          const normalizedShortName = country.shortName ? normalizeTeamNameForMatching(country.shortName) : null;
          const normalizedCode = country.code ? country.code.toLowerCase() : null;
          
          let score = 0;
          
          if (normalizedEspnName === normalizedLocalName) {
            score = 100;
          } else if (normalizedShortName && normalizedEspnName === normalizedShortName) {
            score = 95;
          } else if (normalizedCode && normalizedEspnName.startsWith(normalizedCode)) {
            score = 90;
          } else if (normalizedEspnName.includes(normalizedLocalName) || normalizedLocalName.includes(normalizedEspnName)) {
            score = 80;
          } else if (normalizedShortName && (normalizedEspnName.includes(normalizedShortName) || normalizedShortName.includes(normalizedEspnName))) {
            score = 75;
          }
          
          if (score > 0) {
            teamPreview.localTeamCandidates.push({
              country: {
                _id: country._id,
                name: country.name,
                shortName: country.shortName,
                code: country.code,
                flagUrl: country.flagUrl
              },
              score
            });
          }
        }

        teamPreview.localTeamCandidates.sort((a, b) => b.score - a.score);
        
        if (teamPreview.localTeamCandidates.length > 0 && teamPreview.localTeamCandidates[0].score >= 70) {
          teamPreview.localTeam = teamPreview.localTeamCandidates[0].country;
        }

        if (teamPreview.localTeam) {
          const genderFilter = espnData.matchInfo.gender === 'women' ? 'F' : 'M';
          const localPlayers = await Player.find({ 
            country: teamPreview.localTeam._id,
            gender: genderFilter
          }).lean();

          for (const espnPlayer of espnTeam.players) {
            const playerPreview = {
              espnPlayer: {
                id: espnPlayer.espnId,
                name: espnPlayer.name,
                isCaptain: espnPlayer.isCaptain,
                isViceCaptain: espnPlayer.isViceCaptain,
                isKeeper: espnPlayer.isKeeper,
                role: espnPlayer.role
              },
              localPlayer: null,
              localPlayerCandidates: [],
              needsCreation: false
            };

            const normalizedEspnPlayerName = normalizePlayerNameForMatching(espnPlayer.name);
            
            for (const localPlayer of localPlayers) {
              const normalizedLocalPlayerName = normalizePlayerNameForMatching(localPlayer.name);
              
              let score = 0;
              let matchType = 'none';
              
              if (normalizedEspnPlayerName === normalizedLocalPlayerName) {
                score = 100;
                matchType = 'exact';
              } else if (normalizedEspnPlayerName.includes(normalizedLocalPlayerName) || normalizedLocalPlayerName.includes(normalizedEspnPlayerName)) {
                score = 80;
                matchType = 'partial';
              } else {
                const espnParts = normalizedEspnPlayerName.split(' ');
                const localParts = normalizedLocalPlayerName.split(' ');
                const espnLastName = espnParts[espnParts.length - 1];
                const localLastName = localParts[localParts.length - 1];
                
                if (espnLastName === localLastName && espnLastName.length > 2) {
                  score = 70;
                  matchType = 'lastName';
                } else {
                  score = calculateSimpleSimilarity(normalizedEspnPlayerName, normalizedLocalPlayerName);
                  matchType = score > 50 ? 'fuzzy' : 'none';
                }
              }
              
              if (score > 0) {
                playerPreview.localPlayerCandidates.push({
                  player: {
                    _id: localPlayer._id,
                    name: localPlayer.name,
                    role: localPlayer.role
                  },
                  score,
                  matchType
                });
              }
            }

            playerPreview.localPlayerCandidates.sort((a, b) => b.score - a.score);
            
            if (playerPreview.localPlayerCandidates.length > 0 && playerPreview.localPlayerCandidates[0].score >= 70) {
              playerPreview.localPlayer = playerPreview.localPlayerCandidates[0].player;
            } else {
              playerPreview.needsCreation = true;
              preview.unmatchedPlayers.push({
                espnName: espnPlayer.name,
                espnId: espnPlayer.espnId,
                teamEspnId: espnTeam.espnId,
                teamName: espnTeam.name,
                localTeamId: teamPreview.localTeam._id,
                isCaptain: espnPlayer.isCaptain,
                isViceCaptain: espnPlayer.isViceCaptain,
                isKeeper: espnPlayer.isKeeper,
                role: espnPlayer.role
              });
            }

            teamPreview.players.push(playerPreview);
          }
        }

        preview.teamMapping.push(teamPreview);
      }

      console.log(`Preview complete: ${preview.teamMapping.length} teams, ${preview.unmatchedPlayers.length} unmatched players`);

      res.json({
        success: true,
        data: preview,
        fetchMethod: 'direct-token'
      });

    } catch (error) {
      console.error('Preview match creation error:', error);
      next(error);
    }
  });

  /**
   * POST /api/espn/create-player
   * Create a new player from ESPN data during match import
   */
  router.post('/create-player', auth, async (req, res, next) => {
    try {
      const { name, countryId, gender, espnId, role, battingStyle, bowlingStyle } = req.body;

      if (!name || !countryId) {
        return res.status(400).json({
          success: false,
          message: 'Player name and country are required'
        });
      }

      // Check if player already exists (case-insensitive)
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingPlayer = await Player.findOne({
        name: { $regex: new RegExp('^' + escapedName + '$', 'i') },
        country: countryId
      });

      if (existingPlayer) {
        return res.json({
          success: true,
          data: existingPlayer,
          message: 'Player already exists'
        });
      }

      // Map ESPN batting style to our format
      // ESPN uses: 'rhb' (right-hand bat), 'lhb' (left-hand bat), 'right-hand bat', 'left-hand bat'
      let normalizedBattingStyle = battingStyle || 'right-hand';
      if (normalizedBattingStyle) {
        const lowerStyle = normalizedBattingStyle.toLowerCase();
        if (lowerStyle.includes('left') || lowerStyle === 'lhb') {
          normalizedBattingStyle = 'left-hand';
        } else {
          normalizedBattingStyle = 'right-hand';
        }
      }

      // Map ESPN bowling style to our format
      // ESPN uses various formats like 'rmf', 'ob', 'sla', etc.
      let normalizedBowlingStyle = 'none';
      if (bowlingStyle) {
        const lowerBowling = bowlingStyle.toLowerCase();
        if (lowerBowling.includes('fast') || lowerBowling === 'rf' || lowerBowling === 'rmf' || lowerBowling === 'rfm') {
          normalizedBowlingStyle = 'right-arm-fast';
        } else if (lowerBowling === 'lf' || lowerBowling === 'lmf' || lowerBowling === 'lfm') {
          normalizedBowlingStyle = 'left-arm-fast';
        } else if (lowerBowling.includes('medium') || lowerBowling === 'rm' || lowerBowling === 'rsm') {
          normalizedBowlingStyle = 'right-arm-medium';
        } else if (lowerBowling === 'lm' || lowerBowling === 'lsm') {
          normalizedBowlingStyle = 'left-arm-medium';
        } else if (lowerBowling.includes('off') || lowerBowling === 'ob') {
          normalizedBowlingStyle = 'right-arm-off-spin';
        } else if (lowerBowling.includes('leg') || lowerBowling === 'lb' || lowerBowling === 'lbg') {
          normalizedBowlingStyle = 'right-arm-leg-spin';
        } else if (lowerBowling.includes('orthodox') || lowerBowling === 'sla') {
          normalizedBowlingStyle = 'left-arm-orthodox';
        } else if (lowerBowling.includes('chinaman') || lowerBowling === 'lws') {
          normalizedBowlingStyle = 'left-arm-chinaman';
        }
      }

      // Map role from ESPN format
      // ESPN uses: 'batting allrounder', 'bowling allrounder', 'allrounder', 'bowler', 'batter', etc.
      let normalizedRole = role || 'batsman';
      if (normalizedRole) {
        const lowerRole = normalizedRole.toLowerCase();
        if (lowerRole.includes('wicket') || lowerRole.includes('keeper')) {
          normalizedRole = 'wicket-keeper';
        } else if (lowerRole.includes('allrounder') || lowerRole.includes('all-rounder')) {
          normalizedRole = 'all-rounder';
        } else if (lowerRole.includes('bowl')) {
          normalizedRole = 'bowler';
        } else {
          normalizedRole = 'batsman';
        }
      }

      const newPlayer = new Player({
        name,
        country: countryId,
        gender: gender || 'M',
        role: normalizedRole,
        battingStyle: normalizedBattingStyle,
        bowlingStyle: normalizedBowlingStyle,
        espnId: espnId || null
      });

      await newPlayer.save();
      await newPlayer.populate('country', 'name code');

      console.log(`Created new player: ${newPlayer.name} (${newPlayer.country.name})`);

      res.json({
        success: true,
        data: newPlayer,
        message: 'Player created successfully'
      });

    } catch (error) {
      console.error('Create player error:', error);
      next(error);
    }
  });

  return router;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeTeamNameForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s*(women|men|w|m)\s*$/i, '')
    .replace(/\s*(women's|men's)\s*/i, '')
    .replace(/-w$|-m$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePlayerNameForMatching(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\(c\)/g, '')
    .replace(/†/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimpleSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  
  return Math.round((matches / longer.length) * 100);
}

module.exports = { addDirectFetchRoutes, espnTokenFetcher };
