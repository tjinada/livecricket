import { Injectable } from '@angular/core';
import { MatchCalculationsService } from './match-calculations.service';

/**
 * Service for bowling card related logic
 * Handles current bowler, bowling stats, and best bowler calculations
 */
@Injectable({
  providedIn: 'root'
})
export class BowlerCardService {

  constructor(private calcService: MatchCalculationsService) {}

  /**
   * Get all bowling stats for current innings
   */
  getBowlingStats(innings: any): any[] {
    return innings?.bowlingStats || [];
  }

  /**
   * Get current bowler stats from innings
   */
  getCurrentBowlerStats(innings: any): any {
    const bowlerId = innings?.currentBowler?._id || innings?.currentBowler;
    if (!bowlerId) return null;
    
    return innings?.bowlingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === bowlerId || id?.toString() === bowlerId?.toString();
    }) || null;
  }

  /**
   * Get current bowler figures (wickets-runs format)
   */
  getCurrentBowlerFigures(innings: any): string {
    const stats = this.getCurrentBowlerStats(innings);
    if (!stats) return '0-0';
    return `${stats.wickets || 0}-${stats.runs || 0}`;
  }

  /**
   * Get current bowler full figures (wickets-runs with overs)
   */
  getCurrentBowlerFullFigures(innings: any): string {
    const stats = this.getCurrentBowlerStats(innings);
    if (!stats) return '0-0 (0.0 ov)';
    return `${stats.wickets || 0}-${stats.runs || 0} (${stats.overs || 0}.${stats.balls || 0} ov)`;
  }

  /**
   * Get current bowler overs display
   */
  getCurrentBowlerOvers(innings: any): string {
    const stats = this.getCurrentBowlerStats(innings);
    if (!stats) return '0.0';
    return `${stats.overs || 0}.${stats.balls || 0}`;
  }

  /**
   * Check if a bowler is the current bowler
   */
  isCurrentBowler(bowler: any, innings: any): boolean {
    const playerId = bowler.player?._id || bowler.player;
    const bowlerId = innings?.currentBowler?._id || innings?.currentBowler;
    if (!playerId || !bowlerId) return false;
    return playerId === bowlerId || playerId?.toString() === bowlerId?.toString();
  }

  /**
   * Get best bowler (most wickets, then least runs)
   */
  getBestBowler(innings: any): any {
    const bowlingStats = innings?.bowlingStats || [];
    if (bowlingStats.length === 0) return null;
    
    return [...bowlingStats].sort((a: any, b: any) => {
      // Primary sort: most wickets
      if ((b.wickets || 0) !== (a.wickets || 0)) {
        return (b.wickets || 0) - (a.wickets || 0);
      }
      // Secondary sort: least runs
      return (a.runs || 0) - (b.runs || 0);
    })[0];
  }

  /**
   * Check if a bowler is the best bowler
   */
  isBestBowler(bowler: any, innings: any): boolean {
    const best = this.getBestBowler(innings);
    if (!best) return false;
    const playerId = bowler.player?._id || bowler.player;
    const bestId = best.player?._id || best.player;
    return playerId === bestId || playerId?.toString() === bestId?.toString();
  }

  /**
   * Get top bowlers sorted by wickets (then by runs)
   */
  getTopBowlers(innings: any, count: number): any[] {
    if (!innings?.bowlingStats) return [];
    return [...innings.bowlingStats]
      .sort((a: any, b: any) => {
        if ((b.wickets || 0) !== (a.wickets || 0)) {
          return (b.wickets || 0) - (a.wickets || 0);
        }
        return (a.runs || 0) - (b.runs || 0);
      })
      .slice(0, count);
  }

  /**
   * Get summary bowlers for a specific innings index
   */
  getSummaryBowlers(inningsIndex: number, count: number, match: any): any[] {
    const innings = match?.innings?.[inningsIndex];
    return this.getTopBowlers(innings, count);
  }

  /**
   * Get bowler overs display string
   */
  getBowlerOversDisplay(bowler: any): string {
    return `${bowler.overs || 0}.${bowler.balls || 0}`;
  }

  /**
   * Get bowler economy rate
   */
  getBowlerEconomy(bowler: any): string {
    return this.calcService.getBowlerEconomy(
      bowler.runs || 0, 
      bowler.overs || 0, 
      bowler.balls || 0
    );
  }

  /**
   * Get top bowlers for a specific innings (for opposite team's bowling)
   */
  getTopBowlersForInnings(inningsIndex: number, count: number, match: any): any[] {
    const innings = match?.innings?.[inningsIndex];
    return this.getTopBowlers(innings, count);
  }
}
