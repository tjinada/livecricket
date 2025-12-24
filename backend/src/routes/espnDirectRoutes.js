/**
 * ESPN Direct Fetch Routes
 * 
 * These routes use direct token generation to fetch ESPN data.
 * NO BROWSER NEEDED - fastest and most reliable method!
 * 
 * This file exports a function that adds routes to an existing router.
 */

const espnTokenFetcher = require('../services/espnTokenFetcher');

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
                extras: inn.extras ? {
                  total: inn.extras.total || 0,
                  byes: inn.extras.byes || 0,
                  legByes: inn.extras.legbyes || 0,
                  wides: inn.extras.wides || 0,
                  noBalls: inn.extras.noballs || 0
                } : null,
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

  return router;
}

module.exports = { addDirectFetchRoutes, espnTokenFetcher };
