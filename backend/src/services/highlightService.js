/**
 * Highlight Service
 * 
 * Generates highlight sequences from ball-by-ball data for video playback.
 * Focuses on 4s, 6s, wickets, milestone celebrations, and over summaries.
 * 
 * Phase 1 Enhancement: Full historical state tracking
 * - Tracks both batsmen (striker + non-striker) with their stats at each moment
 * - Tracks bowler stats at each moment
 * - Tracks balls faced per batsman historically
 * - Includes current over balls in each highlight
 */

const { Ball, Match } = require('../models');

/**
 * Highlight types and their BASE durations (in milliseconds)
 * These will be adjusted based on importance score
 */
const HIGHLIGHT_DURATIONS = {
  // Phase 6: Intro & Narrative elements
  matchIntro: 5000,      // Match setup card
  inningsIntro: 4000,    // Innings context card
  inningsStart: 3000,    // 0/0 state with opening batsmen/bowler
  chaseSetup: 4000,      // "Team needs X from Y overs"
  
  // Action highlights
  four: 2000,
  six: 2500,
  wicket: 4000,
  fifty: 5000,
  hundred: 6000,
  
  // Summary elements
  overSummary: 8000,
  inningsSummary: 10000,
  matchSummary: 15000
};

/**
 * Importance levels and their duration multipliers
 */
const IMPORTANCE_LEVELS = {
  routine: { minScore: 0, maxScore: 1, multiplier: 1.0, label: 'routine' },
  notable: { minScore: 2, maxScore: 3, multiplier: 1.25, label: 'notable' },
  significant: { minScore: 4, maxScore: 5, multiplier: 1.5, label: 'significant' },
  crucial: { minScore: 6, maxScore: 10, multiplier: 1.75, label: 'crucial' },
  epic: { minScore: 11, maxScore: 999, multiplier: 2.0, label: 'epic' }
};

/**
 * Calculate importance score for a highlight based on match context
 * 
 * @param {Object} params - Parameters for importance calculation
 * @param {string} params.type - Highlight type (four, six, wicket, etc.)
 * @param {Object} params.matchContext - Current match state
 * @param {Object} params.playerStats - Stats of player involved
 * @param {Object} params.flags - Special flags (isFirst, isWinning, etc.)
 * @returns {Object} { score, factors, level, duration }
 */
function calculateImportance(params) {
  const { type, matchContext, playerStats, flags = {} } = params;
  let score = 0;
  const factors = [];

  // ========== MILESTONE BONUSES ==========
  if (type === 'fifty') {
    score += 3;
    factors.push('50 milestone (+3)');
  }
  if (type === 'hundred') {
    score += 5;
    factors.push('100 milestone (+5)');
  }

  // ========== WICKET IMPORTANCE ==========
  if (type === 'wicket') {
    // Key wicket: batsman scored 30+
    if (playerStats?.dismissedRuns >= 30) {
      score += 2;
      factors.push(`Key wicket - ${playerStats.dismissedRuns} runs (+2)`);
    }
    // Very key wicket: batsman scored 50+
    if (playerStats?.dismissedRuns >= 50) {
      score += 1;
      factors.push('Set batsman 50+ (+1)');
    }
    // Bowler milestone: 3rd wicket
    if (playerStats?.bowlerWickets === 3) {
      score += 1;
      factors.push('Bowler 3-wicket haul (+1)');
    }
    // Bowler milestone: 5th wicket
    if (playerStats?.bowlerWickets === 5) {
      score += 2;
      factors.push('Bowler 5-wicket haul (+2)');
    }
  }

  // ========== MATCH SITUATION ==========
  // Death overs (last 5 overs in T20, last 10 in ODI)
  if (matchContext?.isDeathOvers) {
    score += 1;
    factors.push('Death overs (+1)');
  }

  // Powerplay (first 6 overs)
  if (matchContext?.isPowerplay) {
    score += 0.5;
    factors.push('Powerplay (+0.5)');
  }

  // Close chase: required run rate > 10
  if (matchContext?.requiredRunRate > 10) {
    score += 2;
    factors.push(`High RRR ${matchContext.requiredRunRate.toFixed(1)} (+2)`);
  } else if (matchContext?.requiredRunRate > 8) {
    score += 1;
    factors.push(`Tight chase RRR ${matchContext.requiredRunRate.toFixed(1)} (+1)`);
  }

  // Last 2 overs of close chase
  if (matchContext?.isSecondInnings && matchContext?.ballsRemaining <= 12 && matchContext?.runsNeeded <= 30) {
    score += 2;
    factors.push('Final stretch of close chase (+2)');
  }

  // ========== SPECIAL FLAGS ==========
  // First boundary of innings
  if (flags.isFirstBoundary) {
    score += 1;
    factors.push('First boundary (+1)');
  }

  // First wicket of innings
  if (flags.isFirstWicket) {
    score += 1;
    factors.push('First wicket (+1)');
  }

  // Winning runs
  if (flags.isWinningMoment) {
    score += 5;
    factors.push('Winning moment! (+5)');
  }

  // Last ball of innings
  if (flags.isLastBallOfInnings) {
    score += 1;
    factors.push('Last ball of innings (+1)');
  }

  // Partnership breaker (partnership was 50+)
  if (flags.partnershipBroken >= 50) {
    score += 1;
    factors.push(`Partnership of ${flags.partnershipBroken} broken (+1)`);
  }
  if (flags.partnershipBroken >= 100) {
    score += 1;
    factors.push('Century partnership broken (+1)');
  }

  // ========== DETERMINE LEVEL ==========
  let level = IMPORTANCE_LEVELS.routine;
  for (const [key, levelData] of Object.entries(IMPORTANCE_LEVELS)) {
    if (score >= levelData.minScore && score <= levelData.maxScore) {
      level = levelData;
      break;
    }
  }
  // Handle scores above the defined ranges
  if (score > IMPORTANCE_LEVELS.epic.minScore) {
    level = IMPORTANCE_LEVELS.epic;
  }

  // ========== CALCULATE DURATION ==========
  const baseDuration = HIGHLIGHT_DURATIONS[type] || 2000;
  const adjustedDuration = Math.round(baseDuration * level.multiplier);

  return {
    score: Math.round(score * 10) / 10, // Round to 1 decimal
    factors,
    level: level.label,
    baseDuration,
    duration: adjustedDuration
  };
}

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
    .populate('nonStriker', 'name headshotPath')
    .populate('bowler', 'name headshotPath')
    .populate('wicket.dismissedPlayer', 'name headshotPath')
    .populate('wicket.fielder', 'name headshotPath')
    .sort({ sequence: 1 });

  const highlights = [];
  let runningScore = 0;
  let runningWickets = 0;
  let runningBalls = 0;
  
  // ========== PHASE 6: INNINGS INTRO ==========
  // Add innings intro as the first highlight
  const isSecondInnings = inningsNumber === 2;
  
  // Get first innings data for chase context
  let firstInningsTotal = 0;
  let target = 0;
  if (isSecondInnings && match.innings.length > 0) {
    const firstInnings = match.innings.find(i => i.inningsNumber === 1);
    if (firstInnings) {
      firstInningsTotal = firstInnings.totalRuns;
      target = firstInningsTotal + 1;
    }
  }
  
  // Generate appropriate intro based on innings number
  if (inningsNumber === 1) {
    // First innings intro
    highlights.push({
      type: 'inningsIntro',
      duration: HIGHLIGHT_DURATIONS.inningsIntro,
      sequence: -1, // Before all balls
      timestamp: new Date(),
      data: {
        inningsNumber: 1,
        introType: 'batting_first',
        battingTeam: innings.battingTeam?.name || 'Team',
        battingTeamCode: innings.battingTeam?.code || 'TM',
        battingTeamFlag: innings.battingTeam?.flagUrl || null,
        bowlingTeam: innings.bowlingTeam?.name || 'Team',
        bowlingTeamCode: innings.bowlingTeam?.code || 'TM',
        bowlingTeamFlag: innings.bowlingTeam?.flagUrl || null,
        format: match.format,
        totalOvers: match.format === 'T20' ? 20 : 50,
        headline: `${innings.battingTeam?.code || 'TM'} BAT FIRST`,
        subheadline: `${match.format} Match`
      }
    });
  } else if (inningsNumber === 2) {
    // Second innings chase setup
    const requiredRate = (target / (match.format === 'T20' ? 20 : 50)).toFixed(2);
    
    highlights.push({
      type: 'chaseSetup',
      duration: HIGHLIGHT_DURATIONS.chaseSetup,
      sequence: -1,
      timestamp: new Date(),
      data: {
        inningsNumber: 2,
        introType: 'chase',
        battingTeam: innings.battingTeam?.name || 'Team',
        battingTeamCode: innings.battingTeam?.code || 'TM',
        battingTeamFlag: innings.battingTeam?.flagUrl || null,
        bowlingTeam: innings.bowlingTeam?.name || 'Team',
        bowlingTeamCode: innings.bowlingTeam?.code || 'TM',
        bowlingTeamFlag: innings.bowlingTeam?.flagUrl || null,
        target: target,
        targetDisplay: firstInningsTotal,
        totalOvers: match.format === 'T20' ? 20 : 50,
        requiredRunRate: requiredRate,
        format: match.format,
        headline: `TARGET: ${target}`,
        subheadline: `${innings.battingTeam?.code || 'TM'} need ${target} runs from ${match.format === 'T20' ? 20 : 50} overs`,
        narrative: `Required rate: ${requiredRate} per over`
      }
    });
  }
  
  // ========== INNINGS START (0/0 state) ==========
  // Add an "inningsStart" highlight showing 0/0 with opening batsmen and bowler
  // This uses the first ball's players to get the openers
  if (balls.length > 0) {
    const firstBall = balls[0];
    
    // Get opener names and images from the first ball
    const openingStriker = firstBall.batsman;
    const openingNonStriker = firstBall.nonStriker;
    const openingBowler = firstBall.bowler;
    
    // Calculate totalOvers locally for this block
    const matchTotalOvers = match.format === 'T20' ? 20 : 50;
    
    highlights.push({
      type: 'inningsStart',
      duration: HIGHLIGHT_DURATIONS.inningsStart,
      sequence: 0, // After intro, before first ball highlight
      timestamp: new Date(),
      data: {
        inningsNumber: inningsNumber,
        battingTeam: innings.battingTeam?.name || 'Team',
        battingTeamCode: innings.battingTeam?.code || 'TM',
        battingTeamFlag: innings.battingTeam?.flagUrl || null,
        bowlingTeam: innings.bowlingTeam?.name || 'Team',
        format: match.format,
        totalOvers: matchTotalOvers,
        // Score state at 0/0
        scoreAfter: {
          runs: 0,
          wickets: 0,
          overs: '0.0',
          // Striker info
          strikerName: openingStriker?.name || 'Opener',
          strikerImage: openingStriker?.headshotPath || null,
          strikerRuns: 0,
          strikerBalls: 0,
          strikerFours: 0,
          strikerSixes: 0,
          // Non-striker info
          nonStrikerName: openingNonStriker?.name || 'Opener',
          nonStrikerImage: openingNonStriker?.headshotPath || null,
          nonStrikerRuns: 0,
          nonStrikerBalls: 0,
          nonStrikerFours: 0,
          nonStrikerSixes: 0,
          // Bowler info
          bowlerName: openingBowler?.name || 'Bowler',
          bowlerImage: openingBowler?.headshotPath || null,
          bowlerOvers: '0.0',
          bowlerRuns: 0,
          bowlerWickets: 0,
          bowlerFigures: '0-0',
          // Current over balls
          currentOverBalls: [],
          currentOverNumber: 1,
          // Chase data (second innings only)
          inningsNumber: inningsNumber,
          isSecondInnings: isSecondInnings,
          target: isSecondInnings ? target : null,
          runsNeeded: isSecondInnings ? target : null,
          ballsRemaining: isSecondInnings ? (matchTotalOvers * 6) : null,
          totalOvers: matchTotalOvers
        }
      }
    });
  }
  
  // Track cumulative stats for each batsman: { runs, balls, fours, sixes, name, image }
  const batsmanStats = {};
  
  // Track cumulative stats for each bowler: { overs, balls, runs, wickets, name, image }
  const bowlerStats = {};
  
  // Build player lookup from Match data (more reliable for images)
  // This uses the same data source that works for innings summary
  // Include players from ALL innings to cover both batting and bowling teams
  const playerLookup = {};
  console.log('[DEBUG] Building playerLookup from match innings...');
  for (const inn of match.innings || []) {
    console.log(`[DEBUG] Processing innings ${inn.inningsNumber}, battingStats count: ${inn.battingStats?.length}, bowlingStats count: ${inn.bowlingStats?.length}`);
    for (const bs of inn.battingStats || []) {
      if (bs.player?._id) {
        const id = bs.player._id.toString();
        if (!playerLookup[id]) {
          playerLookup[id] = {
            name: bs.player.name,
            headshotPath: bs.player.headshotPath || null
          };
          console.log(`[DEBUG] Added batsman to lookup: ${bs.player.name}, id: ${id}, headshotPath: ${bs.player.headshotPath || 'NULL'}`);
        }
      }
    }
    for (const bws of inn.bowlingStats || []) {
      if (bws.player?._id) {
        const id = bws.player._id.toString();
        if (!playerLookup[id]) {
          playerLookup[id] = {
            name: bws.player.name,
            headshotPath: bws.player.headshotPath || null
          };
          console.log(`[DEBUG] Added bowler to lookup: ${bws.player.name}, id: ${id}, headshotPath: ${bws.player.headshotPath || 'NULL'}`);
        }
      }
    }
  }
  console.log(`[DEBUG] playerLookup has ${Object.keys(playerLookup).length} players`);
  console.log('[DEBUG] playerLookup:', JSON.stringify(playerLookup, null, 2));
  
  // Track current over balls for display
  let currentOverBalls = [];
  let currentOverNumber = 0;
  
  const milestoneCelebrated = {}; // Track which milestones have been celebrated
  
  // ========== PHASE 3: IMPORTANCE TRACKING ==========
  // Track "first" events for importance calculation
  let hadFirstBoundary = false;
  let hadFirstWicket = false;
  
  // Partnership tracking for importance
  let currentPartnershipRuns = 0;
  let currentPartnershipBatsmen = new Set();
  
  // Match format for death overs calculation
  const totalOvers = match.format === 'T20' ? 20 : 50;
  const deathOversStart = match.format === 'T20' ? 16 : 41; // Last 5 for T20, last 10 for ODI
  
  // ========== PHASE 4: PHASE SUMMARY TRACKING ==========
  // Track events per phase for smarter summaries
  let phaseStats = {
    boundaries: 0,      // 4s and 6s in current phase
    wickets: 0,         // Wickets in current phase
    runs: 0,            // Runs in current phase
    startingScore: 0,   // Score at start of phase
    startingWickets: 0, // Wickets at start of phase
    startingOvers: 0    // Overs at start of phase
  };
  
  // Track which phase summaries have been shown
  const phaseSummaryShown = {
    powerplay: false,   // After over 6
    middle: false,      // After over 15 (T20) or 40 (ODI)
    death: false        // After over 20 (T20) or 50 (ODI) - handled by innings summary
  };
  
  // Define phase boundaries based on format
  const powerplayEnd = 6;
  const middleOversEnd = match.format === 'T20' ? 15 : 40;
  
  /**
   * Reset phase stats when entering new phase
   */
  const resetPhaseStats = () => {
    phaseStats = {
      boundaries: 0,
      wickets: 0,
      runs: 0,
      startingScore: runningScore,
      startingWickets: runningWickets,
      startingOvers: Math.floor(runningBalls / 6)
    };
  };
  
  /**
   * Check if current phase had notable events worth summarizing
   * @returns {boolean}
   */
  const phaseWasNotable = () => {
    // Notable if: 2+ boundaries OR 1+ wickets OR high run rate (>8 per over in phase)
    const oversInPhase = Math.floor(runningBalls / 6) - phaseStats.startingOvers;
    const runsInPhase = runningScore - phaseStats.startingScore;
    const runRateInPhase = oversInPhase > 0 ? runsInPhase / oversInPhase : 0;
    
    return phaseStats.boundaries >= 2 || 
           phaseStats.wickets >= 1 || 
           runRateInPhase >= 8 ||
           runsInPhase >= 40; // Or just a lot of runs
  };
  
  /**
   * Helper to get batsman stats object, creating if needed
   * Uses playerLookup for reliable image data (from Match innings stats)
   */
  const getBatsmanStats = (player) => {
    if (!player) return null;
    const id = player._id?.toString() || player.toString();
    if (!batsmanStats[id]) {
      // Prefer image from playerLookup (Match innings data) over Ball populate
      // This is the same data source that works for innings summary
      const lookupData = playerLookup[id];
      const finalImage = lookupData?.headshotPath !== undefined ? lookupData.headshotPath : (player.headshotPath || null);
      console.log(`[DEBUG] getBatsmanStats creating entry for ${player.name || id}:`);
      console.log(`[DEBUG]   - player.headshotPath from Ball: ${player.headshotPath || 'NULL'}`);
      console.log(`[DEBUG]   - lookupData found: ${lookupData ? 'YES' : 'NO'}`);
      console.log(`[DEBUG]   - lookupData.headshotPath: ${lookupData?.headshotPath || 'NULL'}`);
      console.log(`[DEBUG]   - Final image used: ${finalImage || 'NULL'}`);
      batsmanStats[id] = {
        id,
        name: lookupData?.name || player.name || 'Batsman',
        image: finalImage,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0
      };
    }
    return batsmanStats[id];
  };
  
  /**
   * Helper to get bowler stats object, creating if needed
   * Uses playerLookup for reliable image data (from Match innings stats)
   */
  const getBowlerStats = (player) => {
    if (!player) return null;
    const id = player._id?.toString() || player.toString();
    if (!bowlerStats[id]) {
      // Prefer image from playerLookup (Match innings data) over Ball populate
      // This is the same data source that works for innings summary
      const lookupData = playerLookup[id];
      bowlerStats[id] = {
        id,
        name: lookupData?.name || player.name || 'Bowler',
        image: lookupData?.headshotPath !== undefined ? lookupData.headshotPath : (player.headshotPath || null),
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0
      };
    }
    return bowlerStats[id];
  };
  
  /**
   * Helper to format ball for over display
   */
  const formatBallDisplay = (ball) => {
    if (ball.isWicket) return 'W';
    if (ball.extraType === 'wide') return 'Wd';
    if (ball.extraType === 'no-ball') return 'Nb';
    if (ball.extraType === 'bye') return 'B';
    if (ball.extraType === 'leg-bye') return 'Lb';
    if (ball.runs === 0) return '•';
    return ball.runs.toString();
  };
  
  /**
   * Build current match state snapshot for a highlight
   */
  const buildScoreState = (ball, striker, nonStriker, bowler) => {
    const strikerStats = getBatsmanStats(striker);
    const nonStrikerStats = getBatsmanStats(nonStriker);
    const currentBowlerStats = getBowlerStats(bowler);
    
    // Debug log for first few calls
    if (runningBalls <= 6) {
      console.log(`[DEBUG] buildScoreState at ball ${runningBalls}:`);
      console.log(`[DEBUG]   strikerStats.image: ${strikerStats?.image || 'NULL'}`);
      console.log(`[DEBUG]   nonStrikerStats.image: ${nonStrikerStats?.image || 'NULL'}`);
      console.log(`[DEBUG]   currentBowlerStats.image: ${currentBowlerStats?.image || 'NULL'}`);
    }
    
    // Calculate chase data for second innings
    const ballsRemaining = isSecondInnings ? (totalOvers * 6) - runningBalls : 0;
    const runsNeeded = isSecondInnings ? Math.max(0, target - runningScore) : 0;
    
    return {
      runs: runningScore,
      wickets: runningWickets,
      overs: getOversDisplay(runningBalls),
      
      // Striker info
      strikerName: strikerStats?.name || 'Batsman',
      strikerImage: strikerStats?.image || null,
      strikerRuns: strikerStats?.runs || 0,
      strikerBalls: strikerStats?.balls || 0,
      strikerFours: strikerStats?.fours || 0,
      strikerSixes: strikerStats?.sixes || 0,
      
      // Non-striker info
      nonStrikerName: nonStrikerStats?.name || 'Batsman',
      nonStrikerImage: nonStrikerStats?.image || null,
      nonStrikerRuns: nonStrikerStats?.runs || 0,
      nonStrikerBalls: nonStrikerStats?.balls || 0,
      nonStrikerFours: nonStrikerStats?.fours || 0,
      nonStrikerSixes: nonStrikerStats?.sixes || 0,
      
      // Bowler info
      bowlerName: currentBowlerStats?.name || 'Bowler',
      bowlerImage: currentBowlerStats?.image || null,
      bowlerOvers: currentBowlerStats ? `${currentBowlerStats.overs}.${currentBowlerStats.balls}` : '0.0',
      bowlerRuns: currentBowlerStats?.runs || 0,
      bowlerWickets: currentBowlerStats?.wickets || 0,
      bowlerFigures: currentBowlerStats ? `${currentBowlerStats.wickets}-${currentBowlerStats.runs}` : '0-0',
      
      // Current over balls
      currentOverBalls: [...currentOverBalls],
      currentOverNumber: currentOverNumber,
      
      // Chase data (second innings only)
      inningsNumber: inningsNumber,
      isSecondInnings: isSecondInnings,
      target: isSecondInnings ? target : null,
      runsNeeded: isSecondInnings ? runsNeeded : null,
      ballsRemaining: isSecondInnings ? ballsRemaining : null,
      totalOvers: totalOvers
    };
  };
  
  /**
   * Build match context for importance calculation
   */
  const buildMatchContext = () => {
    const currentOver = Math.floor(runningBalls / 6) + 1; // 1-indexed
    const ballsRemaining = isSecondInnings ? (totalOvers * 6) - runningBalls : 0;
    const runsNeeded = isSecondInnings ? Math.max(0, target - runningScore) : 0;
    const requiredRunRate = (isSecondInnings && ballsRemaining > 0) 
      ? (runsNeeded / ballsRemaining) * 6 
      : 0;
    
    return {
      isSecondInnings,
      isPowerplay: currentOver <= 6,
      isDeathOvers: currentOver >= deathOversStart,
      currentOver,
      ballsRemaining,
      runsNeeded,
      requiredRunRate,
      target
    };
  };

  for (const ball of balls) {
    // Track over changes for current over display
    if (ball.overNumber !== currentOverNumber) {
      currentOverNumber = ball.overNumber;
      currentOverBalls = [];
    }
    
    // Get/create stats trackers for players involved
    const strikerStats = getBatsmanStats(ball.batsman);
    const nonStrikerStats = getBatsmanStats(ball.nonStriker);
    const currentBowler = getBowlerStats(ball.bowler);
    
    // Update batsman stats BEFORE creating highlight (so highlight shows stats including this ball)
    if (strikerStats) {
      // Count balls faced (legal deliveries only, excluding wides)
      if (!ball.isExtra || ball.extraType !== 'wide') {
        strikerStats.balls++;
      }
      // Add runs scored by batsman (not byes/leg-byes, but yes for no-balls)
      if (!ball.isExtra || ball.extraType === 'no-ball') {
        strikerStats.runs += ball.runs;
        if (ball.isFour) strikerStats.fours++;
        if (ball.isSix) strikerStats.sixes++;
      }
    }
    
    // Update bowler stats
    if (currentBowler) {
      // Count legal deliveries for overs
      if (!ball.isExtra || ball.extraType === 'bye' || ball.extraType === 'leg-bye') {
        currentBowler.balls++;
        if (currentBowler.balls === 6) {
          currentBowler.overs++;
          currentBowler.balls = 0;
        }
      }
      // Add runs conceded (not byes/leg-byes)
      if (!ball.extraType || ball.extraType === 'wide' || ball.extraType === 'no-ball') {
        currentBowler.runs += ball.totalRuns;
      }
      if (ball.isWicket && ball.wicket?.type !== 'run-out') {
        currentBowler.wickets++;
      }
    }
    
    // Update running totals
    runningScore += ball.totalRuns;
    if (ball.isWicket) {
      runningWickets++;
    }
    // Only count legal deliveries for overs display
    if (!ball.isExtra || ball.extraType === 'bye' || ball.extraType === 'leg-bye') {
      runningBalls++;
    }
    
    // Add ball to current over display
    currentOverBalls.push({
      display: formatBallDisplay(ball),
      runs: ball.totalRuns,
      isWicket: ball.isWicket,
      isFour: ball.isFour,
      isSix: ball.isSix,
      isExtra: ball.isExtra
    });
    
    // ========== PHASE 4: Track phase statistics ==========
    if (ball.isFour || ball.isSix) {
      phaseStats.boundaries++;
    }
    if (ball.isWicket) {
      phaseStats.wickets++;
    }
    
    // Track partnership
    if (ball.batsman) {
      const batsmanId = ball.batsman._id?.toString() || ball.batsman.toString();
      currentPartnershipBatsmen.add(batsmanId);
    }
    if (ball.nonStriker) {
      const nonStrikerId = ball.nonStriker._id?.toString() || ball.nonStriker.toString();
      currentPartnershipBatsmen.add(nonStrikerId);
    }
    currentPartnershipRuns += ball.totalRuns;
    
    // Check for winning moment (2nd innings)
    const isWinningMoment = isSecondInnings && runningScore >= target && (runningScore - ball.totalRuns) < target;
    
    // Check if last ball of innings (all out or overs complete)
    const isLastBall = ball.sequence === balls.length - 1;

    // Add highlight for FOUR
    if (ball.isFour) {
      const isFirstBoundary = !hadFirstBoundary;
      hadFirstBoundary = true;
      
      // Calculate importance
      const importance = calculateImportance({
        type: 'four',
        matchContext: buildMatchContext(),
        playerStats: { batsmanRuns: strikerStats?.runs || 0 },
        flags: {
          isFirstBoundary,
          isWinningMoment,
          isLastBallOfInnings: isLastBall
        }
      });
      
      highlights.push({
        type: 'four',
        duration: importance.duration,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        importance: {
          score: importance.score,
          level: importance.level,
          factors: importance.factors
        },
        data: {
          batsmanName: strikerStats?.name || 'Batsman',
          batsmanImage: strikerStats?.image || null,
          batsmanRuns: strikerStats?.runs || 0,
          batsmanBalls: strikerStats?.balls || 0,
          bowlerName: currentBowler?.name || 'Bowler',
          bowlerImage: currentBowler?.image || null,
          isFirstBoundary,
          isWinningMoment,
          // Full score state
          scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
        }
      });
    }

    // Add highlight for SIX
    if (ball.isSix) {
      const isFirstBoundary = !hadFirstBoundary;
      hadFirstBoundary = true;
      
      // Calculate importance
      const importance = calculateImportance({
        type: 'six',
        matchContext: buildMatchContext(),
        playerStats: { batsmanRuns: strikerStats?.runs || 0 },
        flags: {
          isFirstBoundary,
          isWinningMoment,
          isLastBallOfInnings: isLastBall
        }
      });
      
      highlights.push({
        type: 'six',
        duration: importance.duration,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        importance: {
          score: importance.score,
          level: importance.level,
          factors: importance.factors
        },
        data: {
          batsmanName: strikerStats?.name || 'Batsman',
          batsmanImage: strikerStats?.image || null,
          batsmanRuns: strikerStats?.runs || 0,
          batsmanBalls: strikerStats?.balls || 0,
          bowlerName: currentBowler?.name || 'Bowler',
          bowlerImage: currentBowler?.image || null,
          isFirstBoundary,
          isWinningMoment,
          // Full score state
          scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
        }
      });
    }

    // Add highlight for WICKET
    if (ball.isWicket) {
      const dismissedPlayer = ball.wicket?.dismissedPlayer || ball.batsman;
      const dismissedId = dismissedPlayer?._id?.toString() || dismissedPlayer?.toString();
      const dismissedStats = batsmanStats[dismissedId];
      
      // Get dismissed player image from playerLookup (same source as batsman/bowler images)
      const dismissedLookup = dismissedId ? playerLookup[dismissedId] : null;
      const dismissedImage = dismissedLookup?.headshotPath || dismissedStats?.image || dismissedPlayer?.headshotPath || null;
      
      // Track first wicket and partnership broken
      const isFirstWicket = !hadFirstWicket;
      hadFirstWicket = true;
      const partnershipBroken = currentPartnershipRuns;
      
      // Reset partnership tracking
      currentPartnershipRuns = 0;
      currentPartnershipBatsmen.clear();
      
      // Build dismissal description
      let dismissalDescription = '';
      const dismissalType = ball.wicket?.type || 'out';
      const bowlerName = currentBowler?.name || 'Bowler';
      const fielderName = ball.wicket?.fielder?.name;
      
      switch (dismissalType) {
        case 'bowled':
          dismissalDescription = `b ${bowlerName}`;
          break;
        case 'caught':
          dismissalDescription = fielderName 
            ? `c ${fielderName} b ${bowlerName}`
            : `c & b ${bowlerName}`;
          break;
        case 'lbw':
          dismissalDescription = `lbw b ${bowlerName}`;
          break;
        case 'stumped':
          dismissalDescription = fielderName
            ? `st ${fielderName} b ${bowlerName}`
            : `st b ${bowlerName}`;
          break;
        case 'run-out':
          dismissalDescription = fielderName
            ? `run out (${fielderName})`
            : 'run out';
          break;
        case 'hit-wicket':
          dismissalDescription = `hit wicket b ${bowlerName}`;
          break;
        default:
          dismissalDescription = 'out';
      }
      
      // Calculate importance for wicket
      const importance = calculateImportance({
        type: 'wicket',
        matchContext: buildMatchContext(),
        playerStats: {
          dismissedRuns: dismissedStats?.runs || 0,
          bowlerWickets: currentBowler?.wickets || 0
        },
        flags: {
          isFirstWicket,
          partnershipBroken,
          isLastBallOfInnings: isLastBall
        }
      });
      
      highlights.push({
        type: 'wicket',
        duration: importance.duration,
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        importance: {
          score: importance.score,
          level: importance.level,
          factors: importance.factors
        },
        data: {
          dismissedName: dismissedPlayer?.name || ball.batsman?.name || 'Batsman',
          dismissedImage: dismissedImage,
          dismissedRuns: dismissedStats?.runs || 0,
          dismissedBalls: dismissedStats?.balls || 0,
          dismissedFours: dismissedStats?.fours || 0,
          dismissedSixes: dismissedStats?.sixes || 0,
          dismissalType: dismissalType,
          dismissalDescription: dismissalDescription,
          bowlerName: currentBowler?.name || 'Bowler',
          bowlerImage: currentBowler?.image || null,
          bowlerFigures: currentBowler ? `${currentBowler.wickets}-${currentBowler.runs}` : '0-0',
          bowlerWickets: currentBowler?.wickets || 0,
          fielderName: fielderName || null,
          fielderImage: ball.wicket?.fielder?.headshotPath || null,
          isFirstWicket,
          partnershipBroken,
          // Full score state
          scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
        }
      });
    }

    // Check for milestone celebrations (50, 100)
    const batsmanId = strikerStats?.id;
    if (batsmanId && strikerStats) {
      const score = strikerStats.runs;
      
      // 50 milestone
      if (score >= 50 && !milestoneCelebrated[`${batsmanId}_50`]) {
        milestoneCelebrated[`${batsmanId}_50`] = true;
        
        // Calculate importance for fifty
        const importance = calculateImportance({
          type: 'fifty',
          matchContext: buildMatchContext(),
          playerStats: { batsmanRuns: strikerStats.runs },
          flags: {}
        });
        
        highlights.push({
          type: 'fifty',
          duration: importance.duration,
          sequence: ball.sequence,
          timestamp: ball.timestamp,
          importance: {
            score: importance.score,
            level: importance.level,
            factors: importance.factors
          },
          data: {
            playerName: strikerStats.name,
            playerImage: strikerStats.image,
            runs: strikerStats.runs,
            balls: strikerStats.balls,
            fours: strikerStats.fours,
            sixes: strikerStats.sixes,
            strikeRate: strikerStats.balls > 0 
              ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(1)
              : '0.0',
            // Full score state
            scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
          }
        });
      }

      // 100 milestone
      if (score >= 100 && !milestoneCelebrated[`${batsmanId}_100`]) {
        milestoneCelebrated[`${batsmanId}_100`] = true;
        
        // Calculate importance for hundred
        const importance = calculateImportance({
          type: 'hundred',
          matchContext: buildMatchContext(),
          playerStats: { batsmanRuns: strikerStats.runs },
          flags: {}
        });
        
        highlights.push({
          type: 'hundred',
          duration: importance.duration,
          sequence: ball.sequence,
          timestamp: ball.timestamp,
          importance: {
            score: importance.score,
            level: importance.level,
            factors: importance.factors
          },
          data: {
            playerName: strikerStats.name,
            playerImage: strikerStats.image,
            runs: strikerStats.runs,
            balls: strikerStats.balls,
            fours: strikerStats.fours,
            sixes: strikerStats.sixes,
            strikeRate: strikerStats.balls > 0 
              ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(1)
              : '0.0',
            // Full score state
            scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
          }
        });
      }
    }

    // ========== PHASE 4: Smart Phase Summaries ==========
    // Check for phase boundaries and add summaries only if notable
    const currentOver = Math.floor(runningBalls / 6);
    
    // Powerplay end (after over 6)
    if (runningBalls > 0 && runningBalls % 6 === 0 && currentOver === powerplayEnd && !phaseSummaryShown.powerplay) {
      phaseSummaryShown.powerplay = true;
      
      // Always show powerplay summary as it's a key phase
      const sortedBatsmen = Object.values(batsmanStats)
        .filter(b => b.runs > 0)
        .sort((a, b) => b.runs - a.runs);
      const topScorer = sortedBatsmen[0];
      
      const sortedBowlers = Object.values(bowlerStats)
        .filter(b => b.wickets > 0 || b.runs > 0)
        .sort((a, b) => {
          if (b.wickets !== a.wickets) return b.wickets - a.wickets;
          const aOvers = a.overs + a.balls / 6;
          const bOvers = b.overs + b.balls / 6;
          if (aOvers === 0) return 1;
          if (bOvers === 0) return -1;
          return (a.runs / aOvers) - (b.runs / bOvers);
        });
      const bestBowler = sortedBowlers[0];
      
      highlights.push({
        type: 'overSummary',
        duration: 6000, // Shorter than before
        sequence: ball.sequence,
        timestamp: ball.timestamp,
        data: {
          phaseType: 'powerplay',
          phaseName: 'POWERPLAY',
          oversCompleted: currentOver,
          totalRuns: runningScore,
          totalWickets: runningWickets,
          runRate: (runningScore / currentOver).toFixed(2),
          boundariesInPhase: phaseStats.boundaries,
          wicketsInPhase: phaseStats.wickets,
          battingTeam: innings.battingTeam?.name || 'Team',
          battingTeamCode: innings.battingTeam?.code || 'TM',
          battingTeamFlag: innings.battingTeam?.flagUrl || null,
          topScorer: topScorer ? {
            name: topScorer.name,
            image: topScorer.image,
            runs: topScorer.runs,
            balls: topScorer.balls,
            fours: topScorer.fours,
            sixes: topScorer.sixes
          } : null,
          bestBowler: bestBowler ? {
            name: bestBowler.name,
            image: bestBowler.image,
            wickets: bestBowler.wickets,
            runs: bestBowler.runs,
            overs: `${bestBowler.overs}.${bestBowler.balls}`
          } : null,
          scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
        }
      });
      
      // Reset phase stats for middle overs
      resetPhaseStats();
    }
    
    // Middle overs end (after over 15 for T20, 40 for ODI) - only if notable
    if (runningBalls > 0 && runningBalls % 6 === 0 && currentOver === middleOversEnd && !phaseSummaryShown.middle) {
      phaseSummaryShown.middle = true;
      
      // Only show if phase was notable OR it's been a while since last highlight
      if (phaseWasNotable()) {
        const sortedBatsmen = Object.values(batsmanStats)
          .filter(b => b.runs > 0)
          .sort((a, b) => b.runs - a.runs);
        const topScorer = sortedBatsmen[0];
        
        const sortedBowlers = Object.values(bowlerStats)
          .filter(b => b.wickets > 0 || b.runs > 0)
          .sort((a, b) => {
            if (b.wickets !== a.wickets) return b.wickets - a.wickets;
            const aOvers = a.overs + a.balls / 6;
            const bOvers = b.overs + b.balls / 6;
            if (aOvers === 0) return 1;
            if (bOvers === 0) return -1;
            return (a.runs / aOvers) - (b.runs / bOvers);
          });
        const bestBowler = sortedBowlers[0];
        
        const phaseName = match.format === 'T20' ? 'MIDDLE OVERS' : 'MIDDLE OVERS';
        
        highlights.push({
          type: 'overSummary',
          duration: 5000, // Brief summary
          sequence: ball.sequence,
          timestamp: ball.timestamp,
          data: {
            phaseType: 'middle',
            phaseName: phaseName,
            oversCompleted: currentOver,
            phaseOvers: `${powerplayEnd + 1}-${currentOver}`,
            totalRuns: runningScore,
            totalWickets: runningWickets,
            runsInPhase: runningScore - phaseStats.startingScore,
            wicketsInPhase: runningWickets - phaseStats.startingWickets,
            runRate: (runningScore / currentOver).toFixed(2),
            boundariesInPhase: phaseStats.boundaries,
            battingTeam: innings.battingTeam?.name || 'Team',
            battingTeamCode: innings.battingTeam?.code || 'TM',
            battingTeamFlag: innings.battingTeam?.flagUrl || null,
            topScorer: topScorer ? {
              name: topScorer.name,
              image: topScorer.image,
              runs: topScorer.runs,
              balls: topScorer.balls
            } : null,
            bestBowler: bestBowler ? {
              name: bestBowler.name,
              image: bestBowler.image,
              wickets: bestBowler.wickets,
              runs: bestBowler.runs,
              overs: `${bestBowler.overs}.${bestBowler.balls}`
            } : null,
            scoreAfter: buildScoreState(ball, ball.batsman, ball.nonStriker, ball.bowler)
          }
        });
      }
      
      // Reset phase stats for death overs
      resetPhaseStats();
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
    .populate('team2', 'name code flagUrl')
    .populate('toss.winner', 'name code');

  if (!match) {
    throw new Error('Match not found');
  }

  const highlights = [];
  let totalDuration = 0;

  // ========== PHASE 6: MATCH INTRO ==========
  // Add match intro at the very beginning when showing full match highlights
  if (!inningsNumber) {
    highlights.push({
      type: 'matchIntro',
      duration: HIGHLIGHT_DURATIONS.matchIntro,
      sequence: -100, // Before everything
      timestamp: new Date(),
      data: {
        format: match.format,
        venue: match.venue || 'Cricket Ground',
        date: match.date,
        team1: {
          name: match.team1?.name || 'Team 1',
          code: match.team1?.code || 'T1',
          flagUrl: match.team1?.flagUrl || null
        },
        team2: {
          name: match.team2?.name || 'Team 2',
          code: match.team2?.code || 'T2',
          flagUrl: match.team2?.flagUrl || null
        },
        toss: {
          winner: match.toss?.winner?.name || null,
          winnerCode: match.toss?.winner?.code || null,
          decision: match.toss?.decision || null
        },
        headline: `${match.team1?.code || 'T1'} vs ${match.team2?.code || 'T2'}`,
        subheadline: `${match.format} Match${match.venue ? ' • ' + match.venue : ''}`
      }
    });
  }

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
  calculateImportance,
  HIGHLIGHT_DURATIONS,
  IMPORTANCE_LEVELS
};
