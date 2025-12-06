/**
 * Highlight Service
 * 
 * Generates highlight sequences from ball-by-ball data for video playback.
 * Focuses on 4s, 6s, wickets, milestone celebrations, and over summaries.
 */

const { Ball, Match } = require('../models');

/**
 * Highlight types and their durations (in milliseconds)
 */
const HIGHLIGHT_DURATIONS = {
  four: 2000,
  six: 2000,
  wicket: 2000,
  fifty: 5000,      // Player milestone
  hundred: 5000,    // Player milestone
  overSummary: 10000, // After every 5 overs
  inningsSummary: 10000,
  matchSummary: 15000
};

/**
 * Generate highlights for an innings
 * 
 * @param {string} matchId - Match ID
 * @param {number} inningsNumber - Innings number (1 or 2)
 * @returns {Promise<Array>} Array of highlight objects
 */
async function generateInningsHighlights(matchId, inningsNumber) {
  const match = await Match.findById(matchId)
    .populate('team1', 'name code flagUrl')
    .populate('team2', 'name code flagUrl')
    .populate('innings.battingTeam', 'name code flagUrl')
    .populate('innings.bowlingTeam', 'name code flagUrl')
    .populate('innings.battingStats.player', 'name headshotPath')
    .populate('innings.battingStats.dismissal.bowler', 'name headshotPath')
    .populate('innings.battingStats.dismissal.fielder', 'name headshotPath')
    .populate('innings.bowlingStats.player', 'name headshotPath');

  if (!match) {
    throw new Error('Match not found');
  }

  const innings = match.innings.find(i => i.inningsNumber === inningsNumber);
  if (!innings) {
    throw new Error(`Innings ${inningsNumber} not found`);
  }

  // Get all balls for this innings
  const balls = await Ball.find({
    match: matchId,
    inningsNumber: inningsNumber
  })
    .populate('batsman', 'name headshotPath')
    .populate('bowler', 'name headshotPath')
    .populate('wicket.dismissedPlayer', 'name headshotPath')
    .populate('wicket.fielder', 'name headshotPath')
    .sort({ sequence: 1 });

  const highlights = [];
  let runningScore = 0;
  let runningWickets = 0;
  let runningBalls = 0;
  const playerScores = {}; // Track cumulative scores for milestones
  const milestoneCelebrated = {}; // Track which milestones have been celebrated

  for (const ball of balls) {
    // Update running totals
    runningScore += ball.totalRuns;
    if (ball.isWicket) {
      runningWickets++;
    }
    // Only count legal deliveries
    if (!ball.isExtra || ball.extraType === 'bye' || ball.extraType === 'leg-bye') {
      runningBalls++;
    }

    const batsmanId = ball.batsman?._id?.toString() || ball.batsman?.toString();
    
    // Track batsman scores for milestones
    if (batsmanId) {
      if (!playerScores[batsmanId]) {
        playerScores[batsmanId] = { runs: 0, name: ball.batsman?.name };
      }
      // Add runs scored by batsman (not byes/leg-byes)
      if (!ball.isExtra || ball.extraType === 'no-ball') {
        playerScores[batsmanId].runs += ball.runs;
      }
    }

    // Add highlight for FOUR
    if (ball.isFour) {
      highlights.push({
        type: 'four',
        duration: HIGHLIGHT_DURATIONS.four,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        data: {
          batsmanName: ball.batsman?.name || 'Batsman',
          batsmanImage: ball.batsman?.headshotPath || null,
          batsmanRuns: playerScores[batsmanId]?.runs || 0,
          bowlerName: ball.bowler?.name || 'Bowler',
          scoreAfter: {
            runs: runningScore,
            wickets: runningWickets,
            overs: getOversDisplay(runningBalls)
          }
        }
      });
    }

    // Add highlight for SIX
    if (ball.isSix) {
      highlights.push({
        type: 'six',
        duration: HIGHLIGHT_DURATIONS.six,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        data: {
          batsmanName: ball.batsman?.name || 'Batsman',
          batsmanImage: ball.batsman?.headshotPath || null,
          batsmanRuns: playerScores[batsmanId]?.runs || 0,
          bowlerName: ball.bowler?.name || 'Bowler',
          scoreAfter: {
            runs: runningScore,
            wickets: runningWickets,
            overs: getOversDisplay(runningBalls)
          }
        }
      });
    }

    // Add highlight for WICKET
    if (ball.isWicket) {
      const dismissedId = ball.wicket?.dismissedPlayer?._id?.toString() || 
                          ball.wicket?.dismissedPlayer?.toString() ||
                          batsmanId;
      
      highlights.push({
        type: 'wicket',
        duration: HIGHLIGHT_DURATIONS.wicket,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        data: {
          dismissedName: ball.wicket?.dismissedPlayer?.name || ball.batsman?.name || 'Batsman',
          dismissedImage: ball.wicket?.dismissedPlayer?.headshotPath || ball.batsman?.headshotPath || null,
          dismissedRuns: playerScores[dismissedId]?.runs || 0,
          dismissalType: ball.wicket?.type || 'out',
          bowlerName: ball.bowler?.name || 'Bowler',
          bowlerImage: ball.bowler?.headshotPath || null,
          fielderName: ball.wicket?.fielder?.name || null,
          scoreAfter: {
            runs: runningScore,
            wickets: runningWickets,
            overs: getOversDisplay(runningBalls)
          }
        }
      });
    }

    // Check for milestone celebrations (50, 100)
    if (batsmanId && playerScores[batsmanId]) {
      const score = playerScores[batsmanId].runs;
      
      // 50 milestone
      if (score >= 50 && !milestoneCelebrated[`${batsmanId}_50`]) {
        milestoneCelebrated[`${batsmanId}_50`] = true;
        
        // Find batting stats for this player
        const batsmanStats = innings.battingStats.find(
          bs => (bs.player?._id?.toString() || bs.player?.toString()) === batsmanId
        );
        
        highlights.push({
          type: 'fifty',
          duration: HIGHLIGHT_DURATIONS.fifty,
          sequence: ball.sequence,
          timestamp: ball.timestamp,
          data: {
            playerName: ball.batsman?.name || 'Batsman',
            playerImage: ball.batsman?.headshotPath || null,
            runs: score,
            balls: batsmanStats?.balls || 0,
            fours: batsmanStats?.fours || 0,
            sixes: batsmanStats?.sixes || 0,
            strikeRate: batsmanStats?.balls > 0 
              ? ((batsmanStats.runs / batsmanStats.balls) * 100).toFixed(1)
              : '0.0',
            scoreAfter: {
              runs: runningScore,
              wickets: runningWickets,
              overs: getOversDisplay(runningBalls)
            }
          }
        });
      }

      // 100 milestone
      if (score >= 100 && !milestoneCelebrated[`${batsmanId}_100`]) {
        milestoneCelebrated[`${batsmanId}_100`] = true;
        
        const batsmanStats = innings.battingStats.find(
          bs => (bs.player?._id?.toString() || bs.player?.toString()) === batsmanId
        );
        
        highlights.push({
          type: 'hundred',
          duration: HIGHLIGHT_DURATIONS.hundred,
          sequence: ball.sequence,
          timestamp: ball.timestamp,
          data: {
            playerName: ball.batsman?.name || 'Batsman',
            playerImage: ball.batsman?.headshotPath || null,
            runs: score,
            balls: batsmanStats?.balls || 0,
            fours: batsmanStats?.fours || 0,
            sixes: batsmanStats?.sixes || 0,
            strikeRate: batsmanStats?.balls > 0 
              ? ((batsmanStats.runs / batsmanStats.balls) * 100).toFixed(1)
              : '0.0',
            scoreAfter: {
              runs: runningScore,
              wickets: runningWickets,
              overs: getOversDisplay(runningBalls)
            }
          }
        });
      }
    }

    // Add over summary after every 5 overs
    const currentOver = Math.floor(runningBalls / 6);
    if (runningBalls > 0 && runningBalls % 6 === 0 && currentOver % 5 === 0) {
      // Find top scorer at this point
      const sortedScorers = Object.entries(playerScores)
        .sort((a, b) => b[1].runs - a[1].runs);
      
      const topScorer = sortedScorers[0];
      const topScorerStats = innings.battingStats.find(
        bs => (bs.player?._id?.toString() || bs.player?.toString()) === topScorer?.[0]
      );

      // Find best bowler at this point
      const currentBowlerStats = innings.bowlingStats
        .filter(bs => bs.wickets > 0 || bs.runs > 0)
        .sort((a, b) => {
          // Sort by wickets first, then by economy
          if (b.wickets !== a.wickets) return b.wickets - a.wickets;
          const aOvers = a.overs + a.balls / 6;
          const bOvers = b.overs + b.balls / 6;
          return (a.runs / aOvers) - (b.runs / bOvers);
        });

      const bestBowler = currentBowlerStats[0];

      highlights.push({
        type: 'overSummary',
        duration: HIGHLIGHT_DURATIONS.overSummary,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        data: {
          oversCompleted: currentOver,
          totalRuns: runningScore,
          totalWickets: runningWickets,
          runRate: (runningScore / currentOver).toFixed(2),
          battingTeam: innings.battingTeam?.name || 'Team',
          battingTeamCode: innings.battingTeam?.code || 'TM',
          battingTeamFlag: innings.battingTeam?.flagUrl || null,
          topScorer: topScorer ? {
            name: topScorerStats?.player?.name || topScorer[1].name,
            image: topScorerStats?.player?.headshotPath || null,
            runs: topScorer[1].runs,
            balls: topScorerStats?.balls || 0
          } : null,
          bestBowler: bestBowler ? {
            name: bestBowler.player?.name || 'Bowler',
            image: bestBowler.player?.headshotPath || null,
            wickets: bestBowler.wickets,
            runs: bestBowler.runs,
            overs: `${bestBowler.overs}.${bestBowler.balls}`
          } : null
        }
      });
    }
  }

  // Add innings summary at the end
  const topBatsmen = innings.battingStats
    .filter(bs => bs.runs > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 3);

  const topBowlers = innings.bowlingStats
    .filter(bs => bs.wickets > 0 || bs.runs > 0)
    .sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.runs - b.runs;
    })
    .slice(0, 3);

  highlights.push({
    type: 'inningsSummary',
    duration: HIGHLIGHT_DURATIONS.inningsSummary,
    sequence: balls.length > 0 ? balls[balls.length - 1].sequence + 1 : 0,
    timestamp: new Date(),
    data: {
      inningsNumber: inningsNumber,
      battingTeam: innings.battingTeam?.name || 'Team',
      battingTeamCode: innings.battingTeam?.code || 'TM',
      battingTeamFlag: innings.battingTeam?.flagUrl || null,
      totalRuns: innings.totalRuns,
      totalWickets: innings.totalWickets,
      overs: getOversDisplay(innings.totalBalls),
      runRate: innings.totalBalls > 0 
        ? ((innings.totalRuns / innings.totalBalls) * 6).toFixed(2)
        : '0.00',
      extras: innings.extras,
      topBatsmen: topBatsmen.map(b => ({
        name: b.player?.name || 'Batsman',
        image: b.player?.headshotPath || null,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        isOut: b.isOut
      })),
      topBowlers: topBowlers.map(b => ({
        name: b.player?.name || 'Bowler',
        image: b.player?.headshotPath || null,
        wickets: b.wickets,
        runs: b.runs,
        overs: `${b.overs}.${b.balls}`
      }))
    }
  });

  return highlights;
}

/**
 * Generate match summary highlights (after match completion)
 * 
 * @param {string} matchId - Match ID
 * @returns {Promise<Object>} Match summary highlight object
 */
async function generateMatchSummary(matchId) {
  const match = await Match.findById(matchId)
    .populate('team1', 'name code flagUrl')
    .populate('team2', 'name code flagUrl')
    .populate('toss.winner', 'name code')
    .populate('result.winner', 'name code')
    .populate('innings.battingTeam', 'name code flagUrl')
    .populate('innings.bowlingTeam', 'name code flagUrl')
    .populate('innings.battingStats.player', 'name headshotPath')
    .populate('innings.bowlingStats.player', 'name headshotPath');

  if (!match) {
    throw new Error('Match not found');
  }

  // Get player of the match (top performer)
  let playerOfMatch = null;
  let potmPerformance = null;

  // Simple logic: highest run scorer or best bowling figures
  const allBatsmen = [];
  const allBowlers = [];

  for (const innings of match.innings) {
    for (const bs of innings.battingStats) {
      if (bs.runs > 0) {
        allBatsmen.push({
          ...bs.toObject(),
          inningsNumber: innings.inningsNumber,
          team: innings.battingTeam
        });
      }
    }
    for (const bws of innings.bowlingStats) {
      if (bws.wickets > 0) {
        allBowlers.push({
          ...bws.toObject(),
          inningsNumber: innings.inningsNumber,
          team: innings.bowlingTeam
        });
      }
    }
  }

  const topBatsman = allBatsmen.sort((a, b) => b.runs - a.runs)[0];
  const topBowler = allBowlers.sort((a, b) => {
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    return a.runs - b.runs;
  })[0];

  // Compare performances to pick POTM
  if (topBatsman && topBowler) {
    // Simple scoring: runs + (wickets * 25)
    const batsmanScore = topBatsman.runs;
    const bowlerScore = topBowler.wickets * 25;
    
    if (batsmanScore >= bowlerScore) {
      playerOfMatch = topBatsman.player;
      potmPerformance = `${topBatsman.runs} runs (${topBatsman.balls} balls)`;
    } else {
      playerOfMatch = topBowler.player;
      potmPerformance = `${topBowler.wickets}/${topBowler.runs} (${topBowler.overs}.${topBowler.balls} ov)`;
    }
  } else if (topBatsman) {
    playerOfMatch = topBatsman.player;
    potmPerformance = `${topBatsman.runs} runs (${topBatsman.balls} balls)`;
  } else if (topBowler) {
    playerOfMatch = topBowler.player;
    potmPerformance = `${topBowler.wickets}/${topBowler.runs} (${topBowler.overs}.${topBowler.balls} ov)`;
  }

  return {
    type: 'matchSummary',
    duration: HIGHLIGHT_DURATIONS.matchSummary,
    data: {
      format: match.format,
      venue: match.venue,
      date: match.date,
      team1: {
        name: match.team1?.name,
        code: match.team1?.code,
        flagUrl: match.team1?.flagUrl
      },
      team2: {
        name: match.team2?.name,
        code: match.team2?.code,
        flagUrl: match.team2?.flagUrl
      },
      toss: {
        winner: match.toss?.winner?.name,
        decision: match.toss?.decision
      },
      innings: match.innings.map(i => ({
        inningsNumber: i.inningsNumber,
        battingTeam: i.battingTeam?.name,
        battingTeamCode: i.battingTeam?.code,
        totalRuns: i.totalRuns,
        totalWickets: i.totalWickets,
        overs: getOversDisplay(i.totalBalls),
        topScorer: i.battingStats
          .sort((a, b) => b.runs - a.runs)[0]
      })),
      result: {
        winner: match.result?.winner?.name,
        winnerCode: match.result?.winner?.code,
        winMargin: match.result?.winMargin,
        winType: match.result?.winType
      },
      playerOfMatch: playerOfMatch ? {
        name: playerOfMatch.name,
        image: playerOfMatch.headshotPath,
        performance: potmPerformance
      } : null
    }
  };
}

/**
 * Generate full video highlight sequence for an innings or match
 * 
 * @param {string} matchId - Match ID
 * @param {Object} options - Options
 * @param {number} options.inningsNumber - Specific innings (1 or 2), or null for both
 * @param {boolean} options.includeMatchSummary - Include match summary at end
 * @returns {Promise<Object>} Complete highlight video data
 */
async function generateHighlightVideo(matchId, options = {}) {
  const { inningsNumber = null, includeMatchSummary = true } = options;

  const match = await Match.findById(matchId)
    .populate('team1', 'name code flagUrl')
    .populate('team2', 'name code flagUrl');

  if (!match) {
    throw new Error('Match not found');
  }

  const highlights = [];
  let totalDuration = 0;

  // Generate highlights for specified innings or all
  if (inningsNumber) {
    const inningsHighlights = await generateInningsHighlights(matchId, inningsNumber);
    highlights.push(...inningsHighlights);
  } else {
    // Generate for all innings
    for (const innings of match.innings) {
      const inningsHighlights = await generateInningsHighlights(matchId, innings.inningsNumber);
      highlights.push(...inningsHighlights);
    }
  }

  // Add match summary if completed and requested
  if (includeMatchSummary && match.status === 'completed') {
    const matchSummary = await generateMatchSummary(matchId);
    highlights.push(matchSummary);
  }

  // Calculate total duration
  totalDuration = highlights.reduce((sum, h) => sum + h.duration, 0);

  return {
    matchId: matchId,
    format: match.format,
    team1: {
      name: match.team1?.name,
      code: match.team1?.code,
      flagUrl: match.team1?.flagUrl
    },
    team2: {
      name: match.team2?.name,
      code: match.team2?.code,
      flagUrl: match.team2?.flagUrl
    },
    highlights: highlights,
    totalHighlights: highlights.length,
    totalDuration: totalDuration,
    formattedDuration: formatDuration(totalDuration)
  };
}

/**
 * Helper to format overs display
 */
function getOversDisplay(totalBalls) {
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return `${overs}.${balls}`;
}

/**
 * Helper to format duration in mm:ss
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  generateInningsHighlights,
  generateMatchSummary,
  generateHighlightVideo,
  HIGHLIGHT_DURATIONS
};
