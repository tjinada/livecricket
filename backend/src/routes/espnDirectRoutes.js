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

        // Match current players (striker, non-striker, bowler) for live innings
        // This uses data from transformedData.currentPlayers which is extracted from ESPN livePerformance
        // Note: currentPlayers is only available during ACTIVE LIVE PLAY - not during innings breaks or completed matches
        if (transformedData.currentPlayers && espnInnings.isCurrent) {
          const cp = transformedData.currentPlayers;
          console.log(`  Current players from ESPN livePerformance: Striker=${cp.striker?.name || 'N/A'}, NonStriker=${cp.nonStriker?.name || 'N/A'}, Bowler=${cp.bowler?.name || 'N/A'}`);
          
          // Match striker - verify they're from this innings' batting team
          if (cp.striker?.name) {
            const strikerMatch = matchPlayer(cp.striker.name, squad, match.espnPlayerMappings, localTeam._id);
            if (strikerMatch.player) {
              inningsPreview.striker = {
                espnName: cp.striker.name,
                espnId: cp.striker.espnId,
                runs: cp.striker.runs,
                balls: cp.striker.balls,
                matchedPlayer: strikerMatch.player,
                confidence: strikerMatch.confidence
              };
            }
          }
          
          // Match non-striker
          if (cp.nonStriker?.name) {
            const nonStrikerMatch = matchPlayer(cp.nonStriker.name, squad, match.espnPlayerMappings, localTeam._id);
            if (nonStrikerMatch.player) {
              inningsPreview.nonStriker = {
                espnName: cp.nonStriker.name,
                espnId: cp.nonStriker.espnId,
                runs: cp.nonStriker.runs,
                balls: cp.nonStriker.balls,
                matchedPlayer: nonStrikerMatch.player,
                confidence: nonStrikerMatch.confidence
              };
            }
          }
          
          // Match current bowler (from opposing team)
          if (cp.bowler?.name) {
            const bowlerMatch = matchPlayer(cp.bowler.name, opposingSquad, match.espnPlayerMappings, localTeamInfo.opposingTeamId);
            if (bowlerMatch.player) {
              inningsPreview.currentBowler = {
                espnName: cp.bowler.name,
                espnId: cp.bowler.espnId,
                overs: cp.bowler.overs,
                runs: cp.bowler.runs,
                wickets: cp.bowler.wickets,
                matchedPlayer: bowlerMatch.player,
                confidence: bowlerMatch.confidence
              };
            }
          }
          
          console.log(`  Current players matched: Striker=${inningsPreview.striker?.matchedPlayer?.name || 'N/A'}, NonStriker=${inningsPreview.nonStriker?.matchedPlayer?.name || 'N/A'}, Bowler=${inningsPreview.currentBowler?.matchedPlayer?.name || 'N/A'}`);
        } else if (transformedData.currentPlayers) {
          // Log why we're not matching - helps debug
          console.log(`  Current players available but not applied to this innings: isCurrent=${espnInnings.isCurrent}, team=${espnInnings.team}`);
        }

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
            espnId: espnBatsman.espnId || null,  // Include ESPN ID for ball-by-ball mapping
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
            espnId: espnBowler.espnId || null,  // Include ESPN ID for ball-by-ball mapping
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

  /**
   * POST /api/espn/match/:matchId/validate-squad
   * Validate current match squad against ESPN data
   * Auto-detects mismatches BEFORE syncing to catch issues early
   */
  router.post('/match/:matchId/validate-squad', auth, async (req, res, next) => {
    try {
      const { matchId } = req.params;
      const { espnUrl } = req.body;

      // Get the match with populated teams and squads
      const match = await Match.findById(matchId)
        .populate('team1', 'name shortName code')
        .populate('team2', 'name shortName code')
        .populate('squads.team1.player', 'name role espnId')
        .populate('squads.team2.player', 'name role espnId');

      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      const urlToFetch = espnUrl || match.espnUrl;
      if (!urlToFetch) {
        return res.status(400).json({
          success: false,
          message: 'ESPN URL not provided and not set for this match'
        });
      }

      console.log(`Validating squad for match ${matchId} against ESPN`);

      // Fetch ESPN squad data
      const result = await espnTokenFetcher.fetchSquadsData(urlToFetch);
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

      const validation = {
        isValid: true,
        checkedAt: new Date(),
        teams: [],
        mismatches: [],
        warnings: [],
        summary: {
          totalEspnPlayers: 0,
          totalLocalPlayers: 0,
          exactMatches: 0,
          fuzzyMatches: 0,
          mismatches: 0,
          notInSquad: 0
        }
      };

      // Match ESPN teams to local teams
      const teamMappings = [
        { espnTeam: espnData.teams[0], localTeam: match.team1, squad: match.squads?.team1 || [], squadKey: 'team1' },
        { espnTeam: espnData.teams[1], localTeam: match.team2, squad: match.squads?.team2 || [], squadKey: 'team2' }
      ];

      // Try to match ESPN teams to local teams by name
      for (const mapping of teamMappings) {
        const espnTeamName = normalizeTeamNameForMatching(mapping.espnTeam?.name || '');
        const localTeam1Name = normalizeTeamNameForMatching(match.team1?.name || '');
        const localTeam2Name = normalizeTeamNameForMatching(match.team2?.name || '');
        
        if (espnTeamName.includes(localTeam2Name) || localTeam2Name.includes(espnTeamName)) {
          // Swap if ESPN team 0 matches local team 2
          if (mapping.squadKey === 'team1') {
            mapping.localTeam = match.team2;
            mapping.squad = match.squads?.team2 || [];
            mapping.squadKey = 'team2';
          }
        }
      }

      // Validate each team
      for (const { espnTeam, localTeam, squad, squadKey } of teamMappings) {
        if (!espnTeam || !espnTeam.players) continue;

        const teamValidation = {
          espnTeam: espnTeam.name,
          localTeam: localTeam?.name,
          squadKey,
          players: [],
          issues: []
        };

        // Use the entire squad (we removed Playing XI concept)
        const squadPlayers = squad;
        const genderFilter = espnData.matchInfo?.gender === 'women' ? 'F' : 'M';

        validation.summary.totalEspnPlayers += espnTeam.players.length;
        validation.summary.totalLocalPlayers += squadPlayers.length;

        // Check each ESPN player against local squad
        for (const espnPlayer of espnTeam.players) {
          const normalizedEspnName = normalizePlayerNameForMatching(espnPlayer.name);
          
          let bestMatch = null;
          let bestScore = 0;
          let matchType = 'none';

          // First check by ESPN ID if available
          if (espnPlayer.espnId) {
            const espnIdMatch = squadPlayers.find(p => p.player?.espnId === espnPlayer.espnId);
            if (espnIdMatch) {
              bestMatch = espnIdMatch;
              bestScore = 100;
              matchType = 'espnId';
            }
          }

          // If no ESPN ID match, try name matching
          if (!bestMatch) {
            for (const squadPlayer of squadPlayers) {
              const normalizedLocalName = normalizePlayerNameForMatching(squadPlayer.player?.name || '');
              
              let score = 0;
              let type = 'none';

              if (normalizedEspnName === normalizedLocalName) {
                score = 100;
                type = 'exact';
              } else if (normalizedEspnName.includes(normalizedLocalName) || normalizedLocalName.includes(normalizedEspnName)) {
                score = 80;
                type = 'partial';
              } else {
                const espnParts = normalizedEspnName.split(' ');
                const localParts = normalizedLocalName.split(' ');
                const espnLastName = espnParts[espnParts.length - 1];
                const localLastName = localParts[localParts.length - 1];
                
                if (espnLastName === localLastName && espnLastName.length > 2) {
                  score = 70;
                  type = 'lastName';
                } else {
                  score = calculateSimpleSimilarity(normalizedEspnName, normalizedLocalName);
                  type = score > 50 ? 'fuzzy' : 'none';
                }
              }

              if (score > bestScore) {
                bestScore = score;
                bestMatch = squadPlayer;
                matchType = type;
              }
            }
          }

          const playerValidation = {
            espnName: espnPlayer.name,
            espnId: espnPlayer.espnId,
            matchedPlayer: bestMatch ? {
              id: bestMatch.player?._id,
              name: bestMatch.player?.name,
              espnId: bestMatch.player?.espnId
            } : null,
            matchScore: bestScore,
            matchType,
            isValid: bestScore >= 70 && matchType === 'exact'
          };

          teamValidation.players.push(playerValidation);

          // Track statistics
          if (matchType === 'exact' || matchType === 'espnId') {
            validation.summary.exactMatches++;
          } else if (bestScore >= 70) {
            validation.summary.fuzzyMatches++;
            // Fuzzy match is a potential issue - only flag non-exact matches
            if (matchType !== 'exact' && matchType !== 'espnId') {
              validation.mismatches.push({
                team: localTeam?.name,
                espnName: espnPlayer.name,
                matchedTo: bestMatch?.player?.name || null,
                matchScore: bestScore,
                matchType,
                issue: 'fuzzy_match',
                suggestion: `"${espnPlayer.name}" matched to "${bestMatch?.player?.name}" with ${bestScore}% confidence (${matchType}). Verify this is correct.`
              });
            }
          } else {
            validation.summary.mismatches++;
            validation.isValid = false;
            
            // Find the correct player in the database (not just squad)
            const allPlayers = await Player.find({
              country: localTeam?._id,
              gender: genderFilter
            }).lean();

            let correctPlayer = null;
            for (const p of allPlayers) {
              const normalizedDbName = normalizePlayerNameForMatching(p.name);
              if (normalizedEspnName === normalizedDbName) {
                correctPlayer = p;
                break;
              }
            }

            validation.mismatches.push({
              team: localTeam?.name,
              espnName: espnPlayer.name,
              matchedTo: bestMatch?.player?.name || null,
              matchScore: bestScore,
              matchType,
              issue: bestMatch ? 'wrong_match' : 'not_in_squad',
              correctPlayer: correctPlayer ? {
                id: correctPlayer._id,
                name: correctPlayer.name
              } : null,
              suggestion: correctPlayer 
                ? `Add "${correctPlayer.name}" to the squad.`
                : `"${espnPlayer.name}" not found in squad or database. May need to create this player.`
            });
          }
        }

        // Check for players in local squad but not in ESPN (substitutions, etc.)
        for (const squadPlayer of squadPlayers) {
          const normalizedLocalName = normalizePlayerNameForMatching(squadPlayer.player?.name || '');
          const inEspn = espnTeam.players.some(ep => {
            const normalizedEspnName = normalizePlayerNameForMatching(ep.name);
            return normalizedEspnName === normalizedLocalName || 
                   calculateSimpleSimilarity(normalizedEspnName, normalizedLocalName) >= 80;
          });

          if (!inEspn) {
            validation.warnings.push({
              team: localTeam?.name,
              playerName: squadPlayer.player?.name,
              issue: 'not_in_espn',
              suggestion: `"${squadPlayer.player?.name}" is in your squad but not in ESPN squad. This might be a substitute or incorrect selection.`
            });
          }
        }

        validation.teams.push(teamValidation);
      }

      // Overall validation status
      if (validation.mismatches.length > 0) {
        validation.isValid = false;
      }

      console.log(`Squad validation complete: ${validation.isValid ? 'VALID' : 'ISSUES FOUND'} - ${validation.mismatches.length} mismatches, ${validation.warnings.length} warnings`);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Squad validation error:', error);
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
    .replace(/\(c\)/g, '')           // Remove captain marker
    .replace(/\(vc\)/g, '')          // Remove vice-captain marker
    .replace(/†/g, '')            // Remove wicketkeeper dagger
    .replace(/\*/g, '')               // Remove asterisk
    .replace(/\([^)]+\)/g, '')       // Remove ANY parenthetical text (role, etc.)
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .trim();
}

/**
 * Calculate string similarity using Levenshtein distance
 * This is a proper edit-distance based similarity, not just character counting
 */
function calculateSimpleSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  // Use Levenshtein distance for proper similarity
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

module.exports = { addDirectFetchRoutes, espnTokenFetcher };
