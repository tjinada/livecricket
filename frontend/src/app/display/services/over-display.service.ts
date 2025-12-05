import { Injectable } from '@angular/core';

export interface OverSummary {
  overNumber: number;
  balls: any[];
  runs: number;
}

@Injectable({
  providedIn: 'root'
})
export class OverDisplayService {
  
  constructor() {}

  // ==================== CURRENT OVER ====================

  /**
   * Get balls bowled in the current over
   */
  getCurrentOverBalls(innings: any): any[] {
    return innings?.currentOver || [];
  }

  /**
   * Get remaining balls in the current over as an array for UI placeholders
   */
  getRemainingBallsInOver(innings: any): number[] {
    const currentOver = this.getCurrentOverBalls(innings);
    const bowled = currentOver.filter((b: any) => b.ballNumber !== null).length;
    return Array(Math.max(0, 6 - bowled)).fill(0);
  }

  /**
   * Get total runs scored in the current over
   */
  getCurrentOverRuns(innings: any): number {
    const balls = this.getCurrentOverBalls(innings);
    return balls.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
  }

  /**
   * Get count of legal balls bowled in the current over
   */
  getCurrentOverLegalBalls(innings: any): number {
    const balls = this.getCurrentOverBalls(innings);
    return balls.filter((b: any) => b.ballNumber !== null).length;
  }

  // ==================== BALL DISPLAY ====================

  /**
   * Get CSS classes for ball display based on outcome
   */
  getBallColorClass(ball: any): { [key: string]: boolean } {
    return {
      'bg-red-500 text-white': ball.isWicket,
      'bg-green-500 text-white': !ball.isWicket && ball.display === '4',
      'bg-purple-500 text-white': !ball.isWicket && ball.display === '6',
      'bg-yellow-500 text-black': !ball.isWicket && ball.isExtra,
      'bg-gray-600 text-gray-300': !ball.isWicket && !ball.isExtra && (ball.display === '•' || ball.display === '0' || ball.runs === 0),
      'bg-blue-500 text-white': !ball.isWicket && !ball.isExtra && ball.display !== '4' && ball.display !== '6' && ball.display !== '•' && ball.display !== '0' && ball.runs !== 0
    };
  }

  /**
   * Format ball display text (convert '0' to dot symbol)
   */
  getBallDisplay(ball: any): string {
    if (ball.display === '0') return '•';
    return ball.display || '•';
  }

  // ==================== PREVIOUS OVERS ====================

  /**
   * Get the last N completed overs (excluding current over if in progress)
   */
  getPreviousOvers(innings: any, count: number = 2): OverSummary[] {
    const overs = innings?.overs || [];
    const totalBalls = innings?.totalBalls || 0;
    const currentOverBallCount = totalBalls % 6;
    
    // If we're mid-over, the last item in overs array is the current over
    let completedOvers = overs;
    if (currentOverBallCount > 0 && overs.length > 0) {
      // Current over is in progress, exclude it
      completedOvers = overs.slice(0, -1);
    }
    
    // Get last N completed overs
    const lastN = completedOvers.slice(-count);
    
    return lastN.map((over: any, idx: number) => {
      const overNumber = completedOvers.length - lastN.length + idx + 1;
      const runs = over.balls?.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0) || 0;
      return {
        overNumber,
        balls: over.balls || [],
        runs
      };
    }).filter((o: OverSummary) => o.balls.length > 0);
  }

  /**
   * Get recent overs including context (may include current over)
   */
  getRecentOvers(innings: any, count: number = 3): OverSummary[] {
    const overs = innings?.overs || [];
    
    // Get last N overs (may include current if in progress)
    const recentCompleted = overs.slice(-count).map((over: any, idx: number) => {
      const overNumber = overs.length - (count - idx - 1);
      const runs = over.balls?.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0) || 0;
      return {
        overNumber,
        balls: over.balls || [],
        runs
      };
    });
    
    return recentCompleted.filter((o: OverSummary) => o.balls.length > 0);
  }

  // ==================== OVER STATUS ====================

  /**
   * Check if the current over is complete (6 legal deliveries)
   */
  isOverComplete(innings: any): boolean {
    const totalBalls = innings?.totalBalls || 0;
    return totalBalls % 6 === 0 && totalBalls > 0;
  }

  /**
   * Get current over number (1-indexed)
   */
  getCurrentOverNumber(innings: any): number {
    const totalBalls = innings?.totalBalls || 0;
    return Math.floor(totalBalls / 6) + 1;
  }

  /**
   * Get count of completed overs
   */
  getCompletedOversCount(innings: any): number {
    const totalBalls = innings?.totalBalls || 0;
    return Math.floor(totalBalls / 6);
  }
}
