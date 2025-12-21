/**
 * Scoring Engine Service
 * 
 * Handles all cricket scoring logic including:
 * - Ball recording and validation
 * - Batsman/bowler statistics updates
 * - Strike rotation
 * - Wicket handling
 * - Innings/match completion detection
 * - Undo functionality
 */

const { Match, Ball } = require('../models');
const config = require('../config');

/**
 * Get maximum balls for a match format
 */
function getMaxBalls(format) {
  return config.match.formats[format]?.maxBalls || 120;
}

/**
 * Convert total balls to overs display string (e.g., "12.4")
 */
function getOversDisplay(totalBalls) {
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return `${overs}.${balls}`;
}

/**
 * Get display string for a ball (used in over display)
 */
function getBallDisplay(ballData) {
  if (ballData.isWicket) {
    return 'W';
  }
  if (ballData.extraType === 'wide') {
    return ballData.extraRuns > 1 ? `${ballData.extraRuns}Wd` : 'Wd';
  }
  if (ballData.extraType === 'no-ball') {
    return ballData.totalRuns > 1 ? `${ballData.totalRuns}Nb` : 'Nb';
  }
  if (ballData.extraType === 'bye') {
    return `${ballData.runs}B`;
  }
  if (ballData.extraType === 'leg-bye') {
    return `${ballData.runs}Lb`;
  }
  if (ballData.runs === 0) {
    return '•';
  }
  return ballData.runs.toString();
}

/**
 * Calculate current run rate
 */
function calculateCurrentRunRate(totalRuns, totalBalls) {
  if (totalBalls === 0) return 0;
  const overs = totalBalls / 6;
  return (totalRuns / overs).toFixed(2);
}

/**
 * Calculate required run rate (for second innings)
 */
function calculateRequiredRunRate(runsNeeded, ballsRemaining) {
  if (ballsRemaining <= 0) return 0;
  const oversRemaining = ballsRemaining / 6;
  return (runsNeeded / oversRemaining).toFixed(2);
}

/**
 * Calculate simple win probability based on run rates and wickets
 */
function calculateWinProbability(match) {
  if (match.currentInnings !== 1 || !match.innings[1]) {
    return null;
  }

  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];
  const target = firstInnings.totalRuns + 1;
  const runsNeeded = target - secondInnings.totalRuns;
  const ballsRemaining = getMaxBalls(match.format) - secondInnings.totalBalls;
  const wicketsInHand = 10 - secondInnings.totalWickets;

  if (runsNeeded <= 0) return 100; // Already won
  if (wicketsInHand === 0 || ballsRemaining === 0) return 0; // Already lost

  const requiredRunRate = (runsNeeded / ballsRemaining) * 6;
  const currentRunRate = secondInnings.totalBalls > 0 
    ? (secondInnings.totalRuns / secondInnings.totalBalls) * 6 
    : 0;

  let probability = 50;

  // Adjust for run rate difference
  const runRateDiff = currentRunRate - requiredRunRate;
  probability += runRateDiff * 8;

  // Adjust for wickets in hand
  probability += (wicketsInHand - 5) * 4;

  // Adjust for balls remaining (more balls = more opportunity)
  const ballsFactor = ballsRemaining / getMaxBalls(match.format);
  probability = probability * (0.6 + ballsFactor * 0.4);

  // Clamp between 5% and 95%
  return Math.max(5, Math.min(95, Math.round(probability)));
}

/**
 * Record a ball delivery
 */
async function recordBall(matchId, ballData) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'live') {
    throw new Error('Match is not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings || innings.status !== 'in-progress') {
    throw new Error('No innings in progress');
  }

  if (!innings.currentBatsmen.striker || !innings.currentBatsmen.nonStriker) {
    throw new Error('Batsmen not set');
  }

  if (!innings.currentBowler) {
    throw new Error('Bowler not set');
  }

  // Determine if this is a legal delivery
  const isWide = ballData.extraType === 'wide';
  const isNoBall = ballData.extraType === 'no-ball';
  const isLegalDelivery = !isWide && !isNoBall;

  // Calculate ball/over numbers
  const currentOverBalls = innings.totalBalls % 6;
  const currentOver = Math.floor(innings.totalBalls / 6);
  
  // For legal deliveries, ball number is 1-6
  // For extras (wide/no-ball), ball number stays the same
  const ballNumber = isLegalDelivery ? currentOverBalls + 1 : currentOverBalls || 6;
  const overNumber = isLegalDelivery ? currentOver : (currentOverBalls === 0 && innings.totalBalls > 0 ? currentOver - 1 : currentOver);

  // Get sequence number (total deliveries including extras)
  const lastBall = await Ball.findOne({ match: matchId, inningsNumber: innings.inningsNumber })
    .sort({ sequence: -1 });
  const sequence = (lastBall?.sequence || 0) + 1;

  // Calculate runs
  const runs = ballData.runs || 0;
  const extraRuns = ballData.extraRuns || (isWide || isNoBall ? 1 : 0);
  const totalRuns = runs + extraRuns;

  // Create ball record
  const ball = new Ball({
    match: matchId,
    inningsNumber: innings.inningsNumber,
    overNumber: overNumber,
    ballNumber: ballNumber,
    sequence: sequence,
    bowler: innings.currentBowler,
    batsman: innings.currentBatsmen.striker,
    nonStriker: innings.currentBatsmen.nonStriker,
    runs: runs,
    isExtra: !!ballData.extraType,
    extraType: ballData.extraType || null,
    extraRuns: extraRuns,
    totalRuns: totalRuns,
    isFour: runs === 4 && !ballData.extraType,
    isSix: runs === 6 && !ballData.extraType,
    isWicket: !!ballData.wicket,
    wicket: ballData.wicket ? {
      type: ballData.wicket.type,
      dismissedPlayer: ballData.wicket.dismissedPlayer,
      fielder: ballData.wicket.fielder || null
    } : undefined,
    scoreAfter: {
      runs: innings.totalRuns + totalRuns,
      wickets: innings.totalWickets + (ballData.wicket ? 1 : 0),
      overs: getOversDisplay(innings.totalBalls + (isLegalDelivery ? 1 : 0))
    }
  });

  await ball.save();

  // Update innings totals
  innings.totalRuns += totalRuns;
  if (isLegalDelivery) {
    innings.totalBalls += 1;
  }

  // Update partnership
  if (!innings.partnership) {
    innings.partnership = {
      runs: 0,
      balls: 0,
      batsman1: innings.currentBatsmen.striker,
      batsman2: innings.currentBatsmen.nonStriker
    };
  }
  innings.partnership.runs += totalRuns;
  if (isLegalDelivery) {
    innings.partnership.balls += 1;
  }

  // Update extras
  if (isWide) {
    innings.extras.wides += extraRuns;
  } else if (isNoBall) {
    innings.extras.noBalls += extraRuns;
  } else if (ballData.extraType === 'bye') {
    innings.extras.byes += runs;
  } else if (ballData.extraType === 'leg-bye') {
    innings.extras.legByes += runs;
  }

  // Update batsman stats
  const batsmanStats = innings.battingStats.find(
    s => s.player.toString() === innings.currentBatsmen.striker.toString()
  );
  
  if (batsmanStats) {
    // Runs only count for batsman if not bye/leg-bye
    if (!['bye', 'leg-bye'].includes(ballData.extraType)) {
      batsmanStats.runs += runs;
      if (runs === 4 && !ballData.extraType) batsmanStats.fours += 1;
      if (runs === 6 && !ballData.extraType) batsmanStats.sixes += 1;
    }
    // Ball faced only if not wide
    if (!isWide) {
      batsmanStats.balls += 1;
    }
  }

  // Update bowler stats
  const bowlerStats = innings.bowlingStats.find(
    s => s.player.toString() === innings.currentBowler.toString()
  );
  
  if (bowlerStats) {
    // Runs conceded (not byes/leg-byes)
    if (!['bye', 'leg-bye'].includes(ballData.extraType)) {
      bowlerStats.runs += totalRuns;
    }
    // Track wides and no-balls separately
    if (isWide) {
      bowlerStats.wides += extraRuns;
    } else if (isNoBall) {
      bowlerStats.noBalls += extraRuns;
    }
    // Legal delivery counts
    if (isLegalDelivery) {
      bowlerStats.balls += 1;
      if (totalRuns === 0) {
        bowlerStats.dotBalls += 1;
      }
    }
  }

  // Update current over display
  innings.currentOver.push({
    ballNumber: isLegalDelivery ? ballNumber : null,
    runs: totalRuns,
    isExtra: !!ballData.extraType,
    extraType: ballData.extraType,
    isWicket: !!ballData.wicket,
    display: getBallDisplay({
      runs,
      extraType: ballData.extraType,
      extraRuns,
      totalRuns,
      isWicket: !!ballData.wicket
    })
  });

  // Handle wicket
  if (ballData.wicket) {
    innings.totalWickets += 1;

    // Determine who is out
    const dismissedPlayerId = ballData.wicket.dismissedPlayer || innings.currentBatsmen.striker;
    const dismissedStats = innings.battingStats.find(
      s => s.player.toString() === dismissedPlayerId.toString()
    );

    if (dismissedStats) {
      dismissedStats.isOut = true;
      dismissedStats.dismissal = {
        type: ballData.wicket.type,
        bowler: ['bowled', 'caught', 'lbw', 'stumped', 'hit-wicket'].includes(ballData.wicket.type) 
          ? innings.currentBowler 
          : null,
        fielder: ballData.wicket.fielder || null
      };
    }

    // Add to fall of wickets
    innings.fallOfWickets.push({
      wicketNumber: innings.totalWickets,
      runs: innings.totalRuns,
      balls: innings.totalBalls,
      player: dismissedPlayerId,
      overs: getOversDisplay(innings.totalBalls)
    });

    // Credit bowler with wicket (except run-out)
    if (bowlerStats && ballData.wicket.type !== 'run-out') {
      bowlerStats.wickets += 1;
    }

    // Set new batsman if provided
    if (ballData.newBatsman) {
      const isStrikerOut = dismissedPlayerId.toString() === innings.currentBatsmen.striker.toString();
      
      if (isStrikerOut) {
        innings.currentBatsmen.striker = ballData.newBatsman;
      } else {
        innings.currentBatsmen.nonStriker = ballData.newBatsman;
      }

      // Add new batsman to batting stats if not already there
      const existingStats = innings.battingStats.find(
        s => s.player.toString() === ballData.newBatsman.toString()
      );
      
      if (!existingStats) {
        innings.battingStats.push({
          player: ballData.newBatsman,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          position: innings.battingStats.length + 1
        });
      }

      // Reset partnership for new batsman
      innings.partnership = {
        runs: 0,
        balls: 0,
        batsman1: innings.currentBatsmen.striker,
        batsman2: innings.currentBatsmen.nonStriker
      };
    }
  }

  // Handle strike rotation
  // Strike changes on odd runs actually run by batsmen
  // - 1 run = rotate, 2 runs = stay, 3 runs = rotate
  // - Wide/No-ball with 0 additional runs = stay (penalty doesn't count for rotation)
  // - Wide/No-ball with 1 additional run = rotate
  // - Wide/No-ball with 2 additional runs = stay
  // - Bye/Leg-bye follow same odd/even rule based on runs
  const isStrikerOut = ballData.wicket && 
    (ballData.wicket.dismissedPlayer?.toString() === innings.currentBatsmen.striker.toString() ||
     (!ballData.wicket.dismissedPlayer && ballData.wicket.type !== 'run-out'));

  // For wides/no-balls, only consider additional runs (not the penalty) for rotation
  // For normal deliveries, consider the runs scored
  // For byes/leg-byes, consider the runs
  let runsForRotation = runs;
  if (isWide) {
    // Wide: only the additional runs matter for rotation (extraRuns includes penalty, so use runs)
    // If extraRuns = 1 (just penalty, 0 additional), stay
    // If extraRuns = 2 (1 penalty + 1 run), rotate
    runsForRotation = extraRuns - 1; // Subtract the 1-run penalty
  } else if (isNoBall) {
    // No-ball: runs scored by batsman count for rotation
    // The penalty (1 run) doesn't cause rotation
    runsForRotation = runs;
  }
  
  const shouldRotateStrike = !isStrikerOut && runsForRotation % 2 === 1;
  
  if (shouldRotateStrike) {
    const temp = innings.currentBatsmen.striker;
    innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
    innings.currentBatsmen.nonStriker = temp;
  }

  // Check for over completion
  let isOverComplete = false;
  if (isLegalDelivery && innings.totalBalls % 6 === 0) {
    isOverComplete = true;

    // Calculate maiden
    const overBalls = innings.currentOver.filter(b => b.ballNumber !== null);
    const overRuns = overBalls.reduce((sum, b) => sum + (b.isExtra ? 0 : b.runs), 0);
    if (overRuns === 0 && overBalls.length === 6 && bowlerStats) {
      bowlerStats.maidens += 1;
    }

    // Update bowler overs
    if (bowlerStats) {
      bowlerStats.overs += 1;
      bowlerStats.balls = 0;
    }

    // Save completed over to overs array
    const completedOverNumber = Math.floor((innings.totalBalls - 1) / 6) + 1;
    const overWickets = innings.currentOver.filter(b => b.isWicket).length;
    if (!innings.overs) {
      innings.overs = [];
    }
    innings.overs.push({
      overNumber: completedOverNumber,
      bowler: innings.currentBowler,
      balls: [...innings.currentOver],
      runs: overRuns + innings.currentOver.filter(b => b.isExtra).reduce((sum, b) => sum + b.runs, 0),
      wickets: overWickets
    });

    // Rotate strike at end of over (only if not already rotated due to odd runs on last ball)
    // And only if no wicket fell on the last ball
    if (!ballData.wicket && !shouldRotateStrike) {
      const temp = innings.currentBatsmen.striker;
      innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
      innings.currentBatsmen.nonStriker = temp;
    }

    // Save last bowler and clear current over
    innings.lastBowler = innings.currentBowler;
    innings.currentBowler = null;
    innings.currentOver = [];
  }

  // Check for innings completion
  let isInningsComplete = false;
  const maxBalls = getMaxBalls(match.format);

  // Check all end conditions
  if (innings.totalWickets >= 10) {
    isInningsComplete = true;
  } else if (innings.totalBalls >= maxBalls) {
    isInningsComplete = true;
  } else if (match.currentInnings === 1) {
    // Second innings - check if target achieved
    const target = match.innings[0].totalRuns + 1;
    if (innings.totalRuns >= target) {
      isInningsComplete = true;
    }
  }

  if (isInningsComplete) {
    innings.status = 'completed';
    
    // Mark not-out batsmen
    innings.battingStats.forEach(stat => {
      if (!stat.isOut && stat.balls > 0) {
        stat.isNotOut = true;
      }
    });
  }

  // Save match
  await match.save();

  // Check if match is complete
  let isMatchComplete = false;
  if (isInningsComplete) {
    if (match.currentInnings === 1) {
      // Second innings complete - match is over
      isMatchComplete = true;
      match.status = 'completed';
      
      // Calculate result
      const firstInningsRuns = match.innings[0].totalRuns;
      const secondInningsRuns = innings.totalRuns;
      const target = firstInningsRuns + 1;

      if (secondInningsRuns >= target) {
        // Batting team (second innings) wins
        match.result = {
          winner: innings.battingTeam,
          winMargin: `${10 - innings.totalWickets} wickets`,
          winType: 'wickets'
        };
      } else if (secondInningsRuns === firstInningsRuns) {
        // Tie
        match.result = {
          winner: null,
          winMargin: 'Match Tied',
          winType: 'tie'
        };
      } else {
        // Bowling team (first innings) wins
        match.result = {
          winner: innings.bowlingTeam,
          winMargin: `${firstInningsRuns - secondInningsRuns} runs`,
          winType: 'runs'
        };
      }
      
      await match.save();
    }
  }

  return {
    ball: ball.toObject(),
    innings: innings.toObject(),
    isOverComplete,
    isInningsComplete,
    isMatchComplete,
    result: isMatchComplete ? match.result : null
  };
}

/**
 * Undo the last ball
 */
async function undoLastBall(matchId) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'live') {
    throw new Error('Match is not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings) {
    throw new Error('No innings found');
  }

  // Find the last ball
  const lastBall = await Ball.findOne({ 
    match: matchId, 
    inningsNumber: innings.inningsNumber 
  }).sort({ sequence: -1 });

  if (!lastBall) {
    throw new Error('No balls to undo');
  }

  // Revert innings totals
  innings.totalRuns -= lastBall.totalRuns;
  
  const isLegalDelivery = !['wide', 'no-ball'].includes(lastBall.extraType);
  if (isLegalDelivery) {
    innings.totalBalls -= 1;
  }

  // Revert extras
  if (lastBall.extraType === 'wide') {
    innings.extras.wides -= lastBall.extraRuns;
  } else if (lastBall.extraType === 'no-ball') {
    innings.extras.noBalls -= lastBall.extraRuns;
  } else if (lastBall.extraType === 'bye') {
    innings.extras.byes -= lastBall.runs;
  } else if (lastBall.extraType === 'leg-bye') {
    innings.extras.legByes -= lastBall.runs;
  }

  // Revert batsman stats
  const batsmanStats = innings.battingStats.find(
    s => s.player.toString() === lastBall.batsman.toString()
  );
  
  if (batsmanStats) {
    if (!['bye', 'leg-bye'].includes(lastBall.extraType)) {
      batsmanStats.runs -= lastBall.runs;
      if (lastBall.isFour) batsmanStats.fours -= 1;
      if (lastBall.isSix) batsmanStats.sixes -= 1;
    }
    if (lastBall.extraType !== 'wide') {
      batsmanStats.balls -= 1;
    }
  }

  // Revert bowler stats
  const bowlerStats = innings.bowlingStats.find(
    s => s.player.toString() === lastBall.bowler.toString()
  );
  
  if (bowlerStats) {
    if (!['bye', 'leg-bye'].includes(lastBall.extraType)) {
      bowlerStats.runs -= lastBall.totalRuns;
    }
    if (lastBall.extraType === 'wide') {
      bowlerStats.wides -= lastBall.extraRuns;
    } else if (lastBall.extraType === 'no-ball') {
      bowlerStats.noBalls -= lastBall.extraRuns;
    }
    if (isLegalDelivery) {
      bowlerStats.balls -= 1;
      if (lastBall.totalRuns === 0) {
        bowlerStats.dotBalls -= 1;
      }
    }
    
    // Handle over boundary (if we're undoing first ball of an over)
    if (isLegalDelivery && innings.totalBalls % 6 === 5) {
      // We're going back to the previous over
      bowlerStats.overs -= 1;
      bowlerStats.balls = 5;
    }
  }

  // Revert wicket
  if (lastBall.isWicket) {
    innings.totalWickets -= 1;

    // Remove from fall of wickets
    innings.fallOfWickets.pop();

    // Revert batsman dismissal
    const dismissedStats = innings.battingStats.find(
      s => s.player.toString() === lastBall.wicket.dismissedPlayer.toString()
    );
    if (dismissedStats) {
      dismissedStats.isOut = false;
      dismissedStats.isNotOut = false;
      dismissedStats.dismissal = { type: null, bowler: null, fielder: null };
    }

    // Revert bowler wicket (if applicable)
    if (bowlerStats && lastBall.wicket.type !== 'run-out') {
      bowlerStats.wickets -= 1;
    }

    // Remove new batsman from current position
    // (This is tricky - we need to figure out who was batting before)
  }

  // Restore batsmen positions
  innings.currentBatsmen.striker = lastBall.batsman;
  innings.currentBatsmen.nonStriker = lastBall.nonStriker;

  // Restore bowler
  innings.currentBowler = lastBall.bowler;

  // Remove last entry from current over display
  if (innings.currentOver.length > 0) {
    innings.currentOver.pop();
  } else {
    // We need to reconstruct the previous over
    const previousOverBalls = await Ball.find({
      match: matchId,
      inningsNumber: innings.inningsNumber,
      overNumber: lastBall.overNumber
    }).sort({ sequence: 1 });

    // Exclude the ball we're removing
    const remainingBalls = previousOverBalls.filter(b => b.sequence !== lastBall.sequence);
    
    innings.currentOver = remainingBalls.map(b => ({
      ballNumber: !['wide', 'no-ball'].includes(b.extraType) ? b.ballNumber : null,
      runs: b.totalRuns,
      isExtra: b.isExtra,
      extraType: b.extraType,
      isWicket: b.isWicket,
      display: getBallDisplay(b)
    }));
  }

  // If innings was completed, revert it
  if (innings.status === 'completed') {
    innings.status = 'in-progress';
    
    // Revert not-out status
    innings.battingStats.forEach(stat => {
      stat.isNotOut = false;
    });
  }

  // Delete the ball record
  await Ball.findByIdAndDelete(lastBall._id);

  // Save match
  await match.save();

  return {
    removedBall: lastBall.toObject(),
    innings: innings.toObject()
  };
}

/**
 * Swap striker and non-striker
 */
async function swapBatsmen(matchId) {
  const match = await Match.findById(matchId);
  
  if (!match || match.status !== 'live') {
    throw new Error('Match not found or not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings || innings.status !== 'in-progress') {
    throw new Error('No innings in progress');
  }

  const temp = innings.currentBatsmen.striker;
  innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
  innings.currentBatsmen.nonStriker = temp;

  await match.save();

  return {
    striker: innings.currentBatsmen.striker,
    nonStriker: innings.currentBatsmen.nonStriker
  };
}

/**
 * Replace a batsman (retired hurt, etc.)
 */
async function replaceBatsman(matchId, position, newBatsmanId, reason = 'retired-hurt') {
  const match = await Match.findById(matchId);
  
  if (!match || match.status !== 'live') {
    throw new Error('Match not found or not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings || innings.status !== 'in-progress') {
    throw new Error('No innings in progress');
  }

  const oldBatsmanId = position === 'striker' 
    ? innings.currentBatsmen.striker 
    : innings.currentBatsmen.nonStriker;

  // Mark old batsman as retired (not out)
  const oldStats = innings.battingStats.find(
    s => s.player.toString() === oldBatsmanId.toString()
  );
  if (oldStats && reason === 'retired-hurt') {
    oldStats.isNotOut = true;
  }

  // Set new batsman
  if (position === 'striker') {
    innings.currentBatsmen.striker = newBatsmanId;
  } else {
    innings.currentBatsmen.nonStriker = newBatsmanId;
  }

  // Add new batsman to stats if not exists
  const existingStats = innings.battingStats.find(
    s => s.player.toString() === newBatsmanId.toString()
  );
  
  if (!existingStats) {
    innings.battingStats.push({
      player: newBatsmanId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      position: innings.battingStats.length + 1
    });
  }

  await match.save();

  return {
    oldBatsman: oldBatsmanId,
    newBatsman: newBatsmanId,
    position,
    reason
  };
}

/**
 * Change the current bowler
 */
async function changeBowler(matchId, newBowlerId) {
  const match = await Match.findById(matchId);
  
  if (!match || match.status !== 'live') {
    throw new Error('Match not found or not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings || innings.status !== 'in-progress') {
    throw new Error('No innings in progress');
  }

  // Validate not same as last bowler
  if (innings.lastBowler && innings.lastBowler.toString() === newBowlerId.toString()) {
    throw new Error('Bowler cannot bowl consecutive overs');
  }

  // Check if bowler is in playing XI of bowling team
  const bowlingTeamSquad = match.team1.toString() === innings.bowlingTeam.toString()
    ? match.squads.team1
    : match.squads.team2;

  const isInPlayingXI = bowlingTeamSquad.some(
    p => p.player.toString() === newBowlerId.toString() && p.isPlayingXI
  );

  if (!isInPlayingXI) {
    throw new Error('Bowler is not in playing XI');
  }

  innings.currentBowler = newBowlerId;

  // Add bowler to stats if not exists
  const existingStats = innings.bowlingStats.find(
    s => s.player.toString() === newBowlerId.toString()
  );
  
  if (!existingStats) {
    innings.bowlingStats.push({
      player: newBowlerId,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
      maidens: 0,
      dotBalls: 0
    });
  }

  await match.save();

  return {
    currentBowler: newBowlerId
  };
}

/**
 * End the current innings
 */
async function endInnings(matchId, reason = 'all-out') {
  const match = await Match.findById(matchId);
  
  if (!match || match.status !== 'live') {
    throw new Error('Match not found or not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings || innings.status !== 'in-progress') {
    throw new Error('No innings in progress');
  }

  innings.status = 'completed';

  // Mark current batsmen as not out
  const strikerStats = innings.battingStats.find(
    s => s.player.toString() === innings.currentBatsmen.striker?.toString()
  );
  const nonStrikerStats = innings.battingStats.find(
    s => s.player.toString() === innings.currentBatsmen.nonStriker?.toString()
  );

  if (strikerStats && !strikerStats.isOut) strikerStats.isNotOut = true;
  if (nonStrikerStats && !nonStrikerStats.isOut) nonStrikerStats.isNotOut = true;

  await match.save();

  return {
    innings: innings.toObject(),
    reason
  };
}

/**
 * Start the second innings
 */
async function startSecondInnings(matchId, { striker, nonStriker, bowler }) {
  const match = await Match.findById(matchId);
  
  if (!match || match.status !== 'live') {
    throw new Error('Match not found or not live');
  }

  if (match.currentInnings !== 0) {
    throw new Error('First innings not complete or second innings already started');
  }

  const firstInnings = match.innings[0];
  if (firstInnings.status !== 'completed') {
    throw new Error('First innings is not complete');
  }

  // Create second innings
  const secondInnings = {
    battingTeam: firstInnings.bowlingTeam,
    bowlingTeam: firstInnings.battingTeam,
    inningsNumber: 2,
    totalRuns: 0,
    totalWickets: 0,
    totalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    status: 'in-progress',
    currentBatsmen: {
      striker: striker,
      nonStriker: nonStriker
    },
    currentBowler: bowler,
    lastBowler: null,
    battingStats: [
      { player: striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, position: 1 },
      { player: nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, position: 2 }
    ],
    bowlingStats: [
      { player: bowler, overs: 0, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, maidens: 0, dotBalls: 0 }
    ],
    currentOver: [],
    overs: [],
    fallOfWickets: [],
    partnership: {
      runs: 0,
      balls: 0,
      batsman1: striker,
      batsman2: nonStriker
    }
  };

  match.innings.push(secondInnings);
  match.currentInnings = 1;

  await match.save();

  return {
    innings: secondInnings,
    target: firstInnings.totalRuns + 1
  };
}

/**
 * End the match
 */
async function endMatch(matchId, resultOverride = null) {
  const match = await Match.findById(matchId);
  
  if (!match || match.status !== 'live') {
    throw new Error('Match not found or not live');
  }

  match.status = 'completed';

  // Mark current innings as complete
  const currentInnings = match.innings[match.currentInnings];
  if (currentInnings && currentInnings.status === 'in-progress') {
    currentInnings.status = 'completed';
  }

  // Calculate result if not provided
  if (resultOverride) {
    match.result = resultOverride;
  } else if (match.innings.length === 2) {
    const firstInningsRuns = match.innings[0].totalRuns;
    const secondInningsRuns = match.innings[1].totalRuns;

    if (secondInningsRuns > firstInningsRuns) {
      match.result = {
        winner: match.innings[1].battingTeam,
        winMargin: `${10 - match.innings[1].totalWickets} wickets`,
        winType: 'wickets'
      };
    } else if (firstInningsRuns > secondInningsRuns) {
      match.result = {
        winner: match.innings[0].battingTeam,
        winMargin: `${firstInningsRuns - secondInningsRuns} runs`,
        winType: 'runs'
      };
    } else {
      match.result = {
        winner: null,
        winMargin: 'Match Tied',
        winType: 'tie'
      };
    }
  } else {
    match.result = {
      winner: null,
      winMargin: 'No Result',
      winType: 'no-result'
    };
  }

  await match.save();

  return {
    match: match.toObject(),
    result: match.result
  };
}

/**
 * Manually set the innings score to specific values
 * Allows admin to correct mistakes by directly setting runs, wickets, balls, and extras
 */
async function adjustScore(matchId, newValues) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'live') {
    throw new Error('Match is not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings) {
    throw new Error('No innings found');
  }

  const { runs, wickets, balls, extras } = newValues;

  // Set total runs to the new value
  if (typeof runs === 'number' && runs >= 0) {
    innings.totalRuns = runs;
  }

  // Set total wickets to the new value
  if (typeof wickets === 'number' && wickets >= 0) {
    innings.totalWickets = Math.min(10, wickets);
  }

  // Set total balls (legal deliveries) to the new value
  if (typeof balls === 'number' && balls >= 0) {
    const maxBalls = getMaxBalls(match.format);
    innings.totalBalls = Math.min(maxBalls, balls);
  }

  // Set extras to new values
  if (extras) {
    if (typeof extras.wides === 'number' && extras.wides >= 0) {
      innings.extras.wides = extras.wides;
    }
    if (typeof extras.noBalls === 'number' && extras.noBalls >= 0) {
      innings.extras.noBalls = extras.noBalls;
    }
    if (typeof extras.byes === 'number' && extras.byes >= 0) {
      innings.extras.byes = extras.byes;
    }
    if (typeof extras.legByes === 'number' && extras.legByes >= 0) {
      innings.extras.legByes = extras.legByes;
    }
  }

  await match.save();

  return {
    innings: innings.toObject()
  };
}

/**
 * Manually adjust a batsman's stats
 */
async function adjustBatsmanStats(matchId, playerId, adjustments) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'live') {
    throw new Error('Match is not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings) {
    throw new Error('No innings found');
  }

  const batsmanStats = innings.battingStats.find(
    s => s.player.toString() === playerId.toString()
  );

  if (!batsmanStats) {
    throw new Error('Batsman not found in current innings');
  }

  const { runs, balls, fours, sixes } = adjustments;

  // Track old runs to update innings total
  const oldRuns = batsmanStats.runs;

  if (typeof runs === 'number') {
    batsmanStats.runs = Math.max(0, runs);
    // Update innings total runs
    innings.totalRuns = Math.max(0, innings.totalRuns + (runs - oldRuns));
  }
  if (typeof balls === 'number') {
    batsmanStats.balls = Math.max(0, balls);
  }
  if (typeof fours === 'number') {
    batsmanStats.fours = Math.max(0, fours);
  }
  if (typeof sixes === 'number') {
    batsmanStats.sixes = Math.max(0, sixes);
  }

  await match.save();

  return {
    batsmanStats: batsmanStats,
    innings: innings.toObject()
  };
}

/**
 * Manually adjust a bowler's stats
 */
async function adjustBowlerStats(matchId, playerId, adjustments) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'live') {
    throw new Error('Match is not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings) {
    throw new Error('No innings found');
  }

  const bowlerStats = innings.bowlingStats.find(
    s => s.player.toString() === playerId.toString()
  );

  if (!bowlerStats) {
    throw new Error('Bowler not found in current innings');
  }

  const { overs, balls, runs, wickets, maidens, wides, noBalls } = adjustments;

  if (typeof overs === 'number') {
    bowlerStats.overs = Math.max(0, overs);
  }
  if (typeof balls === 'number') {
    bowlerStats.balls = Math.max(0, Math.min(5, balls));
  }
  if (typeof runs === 'number') {
    bowlerStats.runs = Math.max(0, runs);
  }
  if (typeof wickets === 'number') {
    bowlerStats.wickets = Math.max(0, wickets);
  }
  if (typeof maidens === 'number') {
    bowlerStats.maidens = Math.max(0, maidens);
  }
  if (typeof wides === 'number') {
    bowlerStats.wides = Math.max(0, wides);
  }
  if (typeof noBalls === 'number') {
    bowlerStats.noBalls = Math.max(0, noBalls);
  }

  await match.save();

  return {
    bowlerStats: bowlerStats,
    innings: innings.toObject()
  };
}

/**
 * Change current batsman (striker or non-striker) to a different player
 * Used to correct mistakes when wrong batsman was selected
 */
async function changeBatsman(matchId, position, newBatsmanId) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'live') {
    throw new Error('Match is not live');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings || innings.status !== 'in-progress') {
    throw new Error('No innings in progress');
  }

  if (!['striker', 'nonStriker'].includes(position)) {
    throw new Error('Position must be striker or nonStriker');
  }

  // Verify new batsman is in the batting team's playing XI
  const battingTeamSquad = match.team1.toString() === innings.battingTeam.toString()
    ? match.squads.team1
    : match.squads.team2;

  const isInPlayingXI = battingTeamSquad.some(
    p => p.player.toString() === newBatsmanId.toString() && p.isPlayingXI
  );

  if (!isInPlayingXI) {
    throw new Error('Player is not in batting team playing XI');
  }

  // Check if the new batsman is already batting (as the other position)
  const otherPosition = position === 'striker' ? 'nonStriker' : 'striker';
  const otherBatsmanId = innings.currentBatsmen[otherPosition]?.toString();
  
  if (otherBatsmanId === newBatsmanId.toString()) {
    throw new Error('This player is already batting at the other end');
  }

  // Check if the new batsman is already out
  const newBatsmanStats = innings.battingStats.find(
    s => s.player.toString() === newBatsmanId.toString()
  );
  
  if (newBatsmanStats?.isOut) {
    throw new Error('This player is already out');
  }

  // Get old batsman ID for reference
  const oldBatsmanId = innings.currentBatsmen[position];

  // Set new batsman
  innings.currentBatsmen[position] = newBatsmanId;

  // Add new batsman to batting stats if not already there
  if (!newBatsmanStats) {
    innings.battingStats.push({
      player: newBatsmanId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      position: innings.battingStats.length + 1
    });
  }

  // Update partnership
  innings.partnership = {
    runs: 0,
    balls: 0,
    batsman1: innings.currentBatsmen.striker,
    batsman2: innings.currentBatsmen.nonStriker
  };

  await match.save();

  return {
    oldBatsman: oldBatsmanId,
    newBatsman: newBatsmanId,
    position,
    currentBatsmen: innings.currentBatsmen
  };
}

/**
 * Toggle batsman's dismissal status (out <-> not out)
 * If currently out, clears dismissal and decrements wicket count
 * If not out, allows setting a dismissal type
 */
async function toggleBatsmanDismissal(matchId, playerId, dismissalData = null) {
  const match = await Match.findById(matchId);
  
  if (!match) {
    throw new Error('Match not found');
  }

  const innings = match.innings[match.currentInnings];
  
  if (!innings) {
    throw new Error('No innings found');
  }

  const batsmanStats = innings.battingStats.find(
    s => s.player.toString() === playerId.toString()
  );

  if (!batsmanStats) {
    throw new Error('Batsman not found in current innings');
  }

  const wasOut = batsmanStats.isOut;

  if (wasOut) {
    // Player was out, make them not out
    const oldDismissal = batsmanStats.dismissal;
    
    batsmanStats.isOut = false;
    batsmanStats.isNotOut = false;
    batsmanStats.dismissal = { type: null, bowler: null, fielder: null };
    
    // Decrement total wickets
    innings.totalWickets = Math.max(0, innings.totalWickets - 1);
    
    // Remove from fall of wickets
    const fowIndex = innings.fallOfWickets.findIndex(
      f => f.player.toString() === playerId.toString()
    );
    if (fowIndex !== -1) {
      innings.fallOfWickets.splice(fowIndex, 1);
      // Re-number remaining wickets
      innings.fallOfWickets.forEach((fow, idx) => {
        fow.wicketNumber = idx + 1;
      });
    }

    // If a bowler got credit for this wicket, remove it
    if (oldDismissal?.bowler && oldDismissal.type !== 'run-out') {
      const bowlerStats = innings.bowlingStats.find(
        s => s.player.toString() === oldDismissal.bowler.toString()
      );
      if (bowlerStats) {
        bowlerStats.wickets = Math.max(0, bowlerStats.wickets - 1);
      }
    }
  } else {
    // Player was not out, mark them as out
    if (!dismissalData?.type) {
      throw new Error('Dismissal type is required when marking player out');
    }

    batsmanStats.isOut = true;
    batsmanStats.isNotOut = false;
    batsmanStats.dismissal = {
      type: dismissalData.type,
      bowler: dismissalData.bowlerId || null,
      fielder: dismissalData.fielderId || null
    };
    
    // Increment total wickets
    innings.totalWickets = Math.min(10, innings.totalWickets + 1);
    
    // Add to fall of wickets
    innings.fallOfWickets.push({
      wicketNumber: innings.totalWickets,
      runs: innings.totalRuns,
      balls: innings.totalBalls,
      player: playerId,
      overs: getOversDisplay(innings.totalBalls)
    });

    // Credit bowler with wicket (except run-out)
    if (dismissalData.bowlerId && dismissalData.type !== 'run-out') {
      const bowlerStats = innings.bowlingStats.find(
        s => s.player.toString() === dismissalData.bowlerId.toString()
      );
      if (bowlerStats) {
        bowlerStats.wickets += 1;
      }
    }
  }

  await match.save();

  return {
    wasOut,
    isNowOut: batsmanStats.isOut,
    batsmanStats,
    innings: innings.toObject()
  };
}

module.exports = {
  recordBall,
  undoLastBall,
  swapBatsmen,
  replaceBatsman,
  changeBowler,
  endInnings,
  startSecondInnings,
  endMatch,
  adjustScore,
  adjustBatsmanStats,
  adjustBowlerStats,
  changeBatsman,
  toggleBatsmanDismissal,
  getOversDisplay,
  getBallDisplay,
  calculateCurrentRunRate,
  calculateRequiredRunRate,
  calculateWinProbability,
  getMaxBalls
};
