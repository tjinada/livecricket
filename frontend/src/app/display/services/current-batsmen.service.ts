import { Injectable } from '@angular/core';
import { PlayerCacheService } from './player-cache.service';

/**
 * CurrentBatsmenService
 * 
 * Handles all logic related to currently batting players (striker and non-striker).
 * Provides methods for:
 * - Getting striker/non-striker info (name, image, stats)
 * - Calculating strike rates and dot balls
 * - Getting batting styles from squad data
 */
@Injectable({
  providedIn: 'root'
})
export class CurrentBatsmenService {

  constructor(private playerCacheService: PlayerCacheService) {}

  // ==================== STRIKER METHODS ====================

  /**
   * Get striker's short name (last name only)
   */
  getStrikerName(innings: any): string {
    const striker = innings?.currentBatsmen?.striker;
    const name = this.playerCacheService.getPlayerName(striker);
    return name?.split(' ').pop() || 'Unknown';
  }

  /**
   * Get striker's full name
   */
  getStrikerFullName(innings: any): string {
    const striker = innings?.currentBatsmen?.striker;
    return this.playerCacheService.getPlayerName(striker);
  }

  /**
   * Get striker's image URL
   */
  getStrikerImage(innings: any): string | null {
    const striker = innings?.currentBatsmen?.striker;
    return this.playerCacheService.getPlayerImage(striker);
  }

  /**
   * Get striker's batting stats from innings data
   */
  getStrikerStats(innings: any): any {
    const strikerId = innings?.currentBatsmen?.striker?._id || 
                      innings?.currentBatsmen?.striker;
    return innings?.battingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === strikerId || id?.toString() === strikerId?.toString();
    });
  }

  /**
   * Get striker's runs
   */
  getStrikerRuns(innings: any): number {
    return this.getStrikerStats(innings)?.runs || 0;
  }

  /**
   * Get striker's balls faced
   */
  getStrikerBalls(innings: any): number {
    return this.getStrikerStats(innings)?.balls || 0;
  }

  /**
   * Get striker's strike rate
   */
  getStrikerSR(innings: any): string {
    const stats = this.getStrikerStats(innings);
    if (!stats?.balls) return '0.00';
    return ((stats.runs / stats.balls) * 100).toFixed(1);
  }

  /**
   * Get striker's dot balls (from stats or estimated)
   */
  getStrikerDots(innings: any): number {
    const stats = this.getStrikerStats(innings);
    if (!stats) return 0;
    if (stats.dotBalls !== undefined) return stats.dotBalls;
    return this.estimateDotBalls(
      stats.runs || 0,
      stats.balls || 0,
      stats.fours || 0,
      stats.sixes || 0
    );
  }

  /**
   * Get striker's batting style from squad data
   */
  getStrikerBattingStyle(innings: any, match: any): string {
    const striker = innings?.currentBatsmen?.striker;
    if (!striker) return '';
    
    // Try to get batting style from player object
    if (striker.battingStyle) return striker.battingStyle;
    
    // Try to find in squad
    return this.getBattingStyleFromSquad(striker, match);
  }

  // ==================== NON-STRIKER METHODS ====================

  /**
   * Get non-striker's short name (last name only)
   */
  getNonStrikerName(innings: any): string {
    const nonStriker = innings?.currentBatsmen?.nonStriker;
    const name = this.playerCacheService.getPlayerName(nonStriker);
    return name?.split(' ').pop() || 'Unknown';
  }

  /**
   * Get non-striker's full name
   */
  getNonStrikerFullName(innings: any): string {
    const nonStriker = innings?.currentBatsmen?.nonStriker;
    return this.playerCacheService.getPlayerName(nonStriker);
  }

  /**
   * Get non-striker's image URL
   */
  getNonStrikerImage(innings: any): string | null {
    const nonStriker = innings?.currentBatsmen?.nonStriker;
    return this.playerCacheService.getPlayerImage(nonStriker);
  }

  /**
   * Get non-striker's batting stats from innings data
   */
  getNonStrikerStats(innings: any): any {
    const nonStrikerId = innings?.currentBatsmen?.nonStriker?._id || 
                         innings?.currentBatsmen?.nonStriker;
    return innings?.battingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === nonStrikerId || id?.toString() === nonStrikerId?.toString();
    });
  }

  /**
   * Get non-striker's runs
   */
  getNonStrikerRuns(innings: any): number {
    return this.getNonStrikerStats(innings)?.runs || 0;
  }

  /**
   * Get non-striker's balls faced
   */
  getNonStrikerBalls(innings: any): number {
    return this.getNonStrikerStats(innings)?.balls || 0;
  }

  /**
   * Get non-striker's strike rate
   */
  getNonStrikerSR(innings: any): string {
    const stats = this.getNonStrikerStats(innings);
    if (!stats?.balls) return '0.00';
    return ((stats.runs / stats.balls) * 100).toFixed(1);
  }

  /**
   * Get non-striker's dot balls (from stats or estimated)
   */
  getNonStrikerDots(innings: any): number {
    const stats = this.getNonStrikerStats(innings);
    if (!stats) return 0;
    if (stats.dotBalls !== undefined) return stats.dotBalls;
    return this.estimateDotBalls(
      stats.runs || 0,
      stats.balls || 0,
      stats.fours || 0,
      stats.sixes || 0
    );
  }

  /**
   * Get non-striker's batting style from squad data
   */
  getNonStrikerBattingStyle(innings: any, match: any): string {
    const nonStriker = innings?.currentBatsmen?.nonStriker;
    if (!nonStriker) return '';
    
    if (nonStriker.battingStyle) return nonStriker.battingStyle;
    
    return this.getBattingStyleFromSquad(nonStriker, match);
  }

  // ==================== PARTNERSHIP METHODS ====================

  /**
   * Get current partnership runs
   */
  getPartnershipRuns(innings: any): number {
    return innings?.partnership?.runs || 0;
  }

  /**
   * Get current partnership balls
   */
  getPartnershipBalls(innings: any): number {
    return innings?.partnership?.balls || 0;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Estimate dot balls when not tracked explicitly
   * Assumes: total_runs = (1s + 2s + 3s) + (4s * 4) + (6s * 6)
   * And: total_balls = dots + 1s + 2s + 3s + 4s + 6s
   */
  private estimateDotBalls(runs: number, balls: number, fours: number, sixes: number): number {
    if (balls === 0) return 0;
    
    // Runs from boundaries
    const boundaryRuns = (fours * 4) + (sixes * 6);
    // Runs from running
    const runningRuns = runs - boundaryRuns;
    
    // Estimate scoring shots (assume average of 1.5 runs per scoring shot for running)
    const estimatedScoringShots = Math.ceil(runningRuns / 1.5);
    
    // Total scoring balls = boundaries + estimated running shots
    const scoringBalls = fours + sixes + estimatedScoringShots;
    
    // Dot balls = total balls - scoring balls
    const dots = Math.max(0, balls - scoringBalls);
    
    return dots;
  }

  /**
   * Get batting style from squad data
   */
  private getBattingStyleFromSquad(player: any, match: any): string {
    const playerId = player._id || player;
    const squad = match?.squads?.team1?.concat(match?.squads?.team2 || []) || [];
    const squadPlayer = squad.find((p: any) => {
      const id = p.player?._id || p.player;
      return id === playerId || id?.toString() === playerId?.toString();
    });
    return squadPlayer?.player?.battingStyle || '';
  }
}
