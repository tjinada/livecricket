import { Injectable } from '@angular/core';

export interface GraphDataPoint {
  over: number;
  runs: number;
}

@Injectable({
  providedIn: 'root'
})
export class MatchCalculationsService {

  // ==================== RUN RATE CALCULATIONS ====================

  /**
   * Calculate current run rate
   */
  getCurrentRunRate(totalRuns: number, totalBalls: number): string {
    if (totalBalls === 0) return '0.00';
    return ((totalRuns / totalBalls) * 6).toFixed(2);
  }

  /**
   * Calculate required run rate for chasing team
   */
  getRequiredRunRate(runsNeeded: number, ballsRemaining: number): string {
    if (ballsRemaining <= 0) return '-';
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  }

  /**
   * Calculate strike rate
   */
  getStrikeRate(runs: number, balls: number): string {
    if (!balls) return '0.00';
    return ((runs / balls) * 100).toFixed(2);
  }

  /**
   * Calculate bowler economy rate
   */
  getBowlerEconomy(runs: number, overs: number, balls: number): string {
    const totalBalls = (overs * 6) + balls;
    if (totalBalls === 0) return '0.00';
    return ((runs / totalBalls) * 6).toFixed(2);
  }

  // ==================== TARGET/CHASE CALCULATIONS ====================

  /**
   * Get target score (first innings total + 1)
   */
  getTarget(firstInningsRuns: number): number {
    return firstInningsRuns + 1;
  }

  /**
   * Get runs needed to win
   */
  getRunsNeeded(target: number, currentRuns: number): number {
    return Math.max(0, target - currentRuns);
  }

  /**
   * Get balls remaining in innings
   */
  getBallsRemaining(format: string, totalBalls: number): number {
    const maxBalls = format === 'T20' ? 120 : 300;
    return Math.max(0, maxBalls - totalBalls);
  }

  /**
   * Get overs remaining as display string (e.g., "12.3")
   */
  getOversRemaining(ballsRemaining: number): string {
    return `${Math.floor(ballsRemaining / 6)}.${ballsRemaining % 6}`;
  }

  /**
   * Get overs display from total balls (e.g., "12.3")
   */
  getOversDisplay(totalBalls: number): string {
    return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
  }

  // ==================== PROJECTION CALCULATIONS ====================

  /**
   * Calculate projected score based on current run rate
   */
  getProjectedScore(totalRuns: number, totalBalls: number, format: string): number {
    if (totalBalls === 0) return 0;
    const maxBalls = format === 'T20' ? 120 : 300;
    const runRate = totalRuns / totalBalls;
    return Math.round(runRate * maxBalls);
  }

  /**
   * Calculate win probability for chasing team
   * Returns percentage (0-100)
   */
  getWinProbability(
    runsNeeded: number,
    ballsRemaining: number,
    wicketsInHand: number,
    currentRunRate: number,
    format: string
  ): number {
    if (runsNeeded <= 0) return 100;
    if (wicketsInHand === 0 || ballsRemaining === 0) return 0;

    const requiredRunRate = (runsNeeded / ballsRemaining) * 6;
    
    let probability = 50;
    
    // Adjust based on run rate difference
    const runRateDiff = currentRunRate - requiredRunRate;
    probability += runRateDiff * 8;
    
    // Adjust based on wickets in hand
    probability += (wicketsInHand - 5) * 4;
    
    // Adjust based on balls remaining (more time = more chance)
    const maxBalls = format === 'T20' ? 120 : 300;
    const ballsFactor = ballsRemaining / maxBalls;
    probability = probability * (0.6 + ballsFactor * 0.4);
    
    // Clamp to reasonable range
    return Math.max(5, Math.min(95, Math.round(probability)));
  }

  // ==================== GRAPH DATA CALCULATIONS ====================

  /**
   * Get innings graph data (over-by-over cumulative runs)
   */
  getInningsGraphData(innings: any): GraphDataPoint[] {
    if (!innings) return [];

    const points: GraphDataPoint[] = [];
    const completedOvers = Math.floor((innings.totalBalls || 0) / 6);
    const totalRuns = innings.totalRuns || 0;

    if (completedOvers === 0) return [];

    const overs = innings.overs || [];

    if (overs.length > 0 && overs.length >= completedOvers) {
      // Complete over data available
      let cumulativeRuns = 0;

      overs.forEach((over: any, idx: number) => {
        let overRuns = 0;
        if (typeof over.runs === 'number' && over.runs > 0) {
          overRuns = over.runs;
        } else if (over.balls && over.balls.length > 0) {
          overRuns = over.balls.reduce((sum: number, ball: any) => sum + (ball.runs || 0), 0);
        }
        cumulativeRuns += overRuns;
        points.push({ over: idx + 1, runs: cumulativeRuns });
      });

      // Adjust for discrepancy with actual total
      if (points.length > 0 && totalRuns > 0) {
        const lastPointRuns = points[points.length - 1].runs;
        if (Math.abs(lastPointRuns - totalRuns) > 2) {
          const scaleFactor = totalRuns / lastPointRuns;
          points.forEach(p => {
            p.runs = Math.round(p.runs * scaleFactor);
          });
          points[points.length - 1].runs = totalRuns;
        }
      }
    } else if (overs.length > 0 && overs.length < completedOvers) {
      // Partial data - use actual + interpolate rest
      let cumulativeRuns = 0;

      overs.forEach((over: any, idx: number) => {
        let overRuns = 0;
        if (typeof over.runs === 'number' && over.runs > 0) {
          overRuns = over.runs;
        } else if (over.balls && over.balls.length > 0) {
          overRuns = over.balls.reduce((sum: number, ball: any) => sum + (ball.runs || 0), 0);
        }
        cumulativeRuns += overRuns;
        points.push({ over: idx + 1, runs: cumulativeRuns });
      });

      const remainingRuns = totalRuns - cumulativeRuns;
      const remainingOvers = completedOvers - overs.length;

      if (remainingOvers > 0 && remainingRuns > 0) {
        const avgRunsPerRemainingOver = remainingRuns / remainingOvers;
        for (let i = 1; i <= remainingOvers; i++) {
          cumulativeRuns += avgRunsPerRemainingOver;
          points.push({
            over: overs.length + i,
            runs: Math.round(cumulativeRuns)
          });
        }
      }

      if (points.length > 0) {
        points[points.length - 1].runs = totalRuns;
      }
    } else {
      // No over data - linear interpolation
      const runsPerOver = totalRuns / completedOvers;

      for (let i = 1; i <= completedOvers; i++) {
        points.push({
          over: i,
          runs: Math.round(runsPerOver * i)
        });
      }

      if (points.length > 0) {
        points[points.length - 1].runs = totalRuns;
      }
    }

    return points;
  }

  /**
   * Get Y-axis labels for graph
   */
  getYAxisLabels(maxRuns: number): number[] {
    const step = maxRuns <= 150 ? 25 : maxRuns <= 250 ? 50 : 100;
    const labels = [];
    for (let i = 0; i <= maxRuns; i += step) {
      labels.push(i);
    }
    return labels;
  }

  /**
   * Get overs axis labels for graph
   */
  getOversAxisLabels(format: string): number[] {
    const maxOvers = format === 'T20' ? 20 : 50;
    const step = maxOvers === 20 ? 5 : 10;
    const labels = [];
    for (let i = 0; i <= maxOvers; i += step) {
      labels.push(i);
    }
    return labels;
  }

  /**
   * Get max runs for graph Y-axis (rounded to nearest 50)
   */
  getMaxRunsForGraph(innings: any[], target: number): number {
    const firstMax = innings?.[0]?.totalRuns || 0;
    const secondMax = innings?.[1]?.totalRuns || 0;
    const maxRuns = Math.max(firstMax, secondMax, target, 100);
    return Math.ceil(maxRuns / 50) * 50;
  }

  /**
   * Get X scale factor for graph
   */
  getXScale(format: string, graphWidth: number = 620): number {
    const maxOvers = format === 'T20' ? 20 : 50;
    return graphWidth / maxOvers;
  }

  /**
   * Get Y scale factor for graph
   */
  getYScale(maxRuns: number, graphHeight: number = 320): number {
    return graphHeight / maxRuns;
  }

  /**
   * Convert graph data to SVG polyline points string
   */
  getLinePoints(
    data: GraphDataPoint[],
    xOffset: number,
    yBase: number,
    xScale: number,
    yScale: number
  ): string {
    return data
      .map(p => `${xOffset + (p.over * xScale)},${yBase - (p.runs * yScale)}`)
      .join(' ');
  }

  /**
   * Convert graph data to SVG polygon points string (for area fill)
   */
  getAreaPoints(
    data: GraphDataPoint[],
    xOffset: number,
    yBase: number,
    xScale: number,
    yScale: number
  ): string {
    if (data.length === 0) return '';
    const startX = xOffset + (data[0].over * xScale);
    const endX = xOffset + (data[data.length - 1].over * xScale);
    const linePoints = data
      .map(p => `${xOffset + (p.over * xScale)},${yBase - (p.runs * yScale)}`)
      .join(' ');
    return `${startX},${yBase} ${linePoints} ${endX},${yBase}`;
  }

  // ==================== EXTRAS CALCULATIONS ====================

  /**
   * Calculate total extras from extras object
   */
  getTotalExtras(extras: any): number {
    if (!extras) return 0;
    return (extras.wides || 0) + (extras.noBalls || 0) + (extras.byes || 0) + (extras.legByes || 0);
  }

  /**
   * Format extras breakdown string
   */
  getExtrasBreakdown(extras: any): string {
    if (!extras) return '';
    const parts = [];
    if (extras.wides) parts.push(`W ${extras.wides}`);
    if (extras.noBalls) parts.push(`NB ${extras.noBalls}`);
    if (extras.byes) parts.push(`B ${extras.byes}`);
    if (extras.legByes) parts.push(`LB ${extras.legByes}`);
    return parts.join(', ');
  }

  // ==================== BATTING/BOWLING AGGREGATES ====================

  /**
   * Calculate total fours from batting stats
   */
  getTotalFours(battingStats: any[]): number {
    if (!battingStats) return 0;
    return battingStats.reduce((sum: number, b: any) => sum + (b.fours || 0), 0);
  }

  /**
   * Calculate total sixes from batting stats
   */
  getTotalSixes(battingStats: any[]): number {
    if (!battingStats) return 0;
    return battingStats.reduce((sum: number, b: any) => sum + (b.sixes || 0), 0);
  }

  /**
   * Calculate dot ball percentage
   */
  getDotBallsPercentage(bowlingStats: any[], totalBalls: number): number {
    if (!bowlingStats || totalBalls === 0) return 0;
    const totalDots = bowlingStats.reduce((sum: number, b: any) => sum + (b.dotBalls || 0), 0);
    return Math.round((totalDots / totalBalls) * 100);
  }

  /**
   * Estimate dot balls for a batsman (when not explicitly tracked)
   */
  estimateDotBalls(runs: number, balls: number, fours: number, sixes: number): number {
    if (!balls) return 0;
    const boundaryBalls = (fours || 0) + (sixes || 0);
    const nonBoundaryRuns = runs - ((fours || 0) * 4) - ((sixes || 0) * 6);
    const nonBoundaryBalls = balls - boundaryBalls;
    const scoringNonBoundaryBalls = nonBoundaryRuns > 0 ? Math.min(nonBoundaryRuns, nonBoundaryBalls) : 0;
    return Math.max(0, nonBoundaryBalls - scoringNonBoundaryBalls);
  }
}
