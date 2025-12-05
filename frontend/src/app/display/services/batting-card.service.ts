import { Injectable } from '@angular/core';
import { TeamDisplayService } from './team-display.service';

/**
 * Interface for a DNB (Did Not Bat) player entry
 */
export interface DNBPlayer {
  player: any;
  runs: null;
  balls: null;
  fours: number;
  sixes: number;
  isOut: boolean;
  isNotOut: boolean;
  isDNB: boolean;
  battingOrder: number;
}

/**
 * Service for building batting cards with proper ordering
 * and handling DNB (Did Not Bat) players
 */
@Injectable({
  providedIn: 'root'
})
export class BattingCardService {

  constructor(private teamService: TeamDisplayService) {}

  /**
   * Get batting stats for current innings with DNB players appended
   * Returns batsmen in the ORDER THEY ACTUALLY BATTED, then DNB players
   */
  getBattingStatsWithDNB(innings: any, match: any): any[] {
    if (!innings) return [];
    
    const battingTeamId = innings.battingTeam?._id || innings.battingTeam;
    const squad = this.teamService.getSquadForTeam(battingTeamId, match);
    
    if (!squad) return innings.battingStats || [];
    
    // Get Playing XI
    const playingXI = squad.filter((p: any) => p.isPlayingXI);
    
    if (playingXI.length === 0) return innings.battingStats || [];
    
    // Get actual batting stats sorted by position (order they came to bat)
    const battingStats = [...(innings.battingStats || [])]
      .sort((a: any, b: any) => (a.position || 99) - (b.position || 99));
    
    // Create a set of player IDs who have already batted
    const battedPlayerIds = new Set(
      battingStats.map((stat: any) => (stat.player?._id || stat.player)?.toString())
    );
    
    // Get DNB players (from Playing XI who haven't batted yet)
    const dnbPlayers = this.getDNBPlayers(playingXI, battedPlayerIds);
    
    // Return batted players first (in order they batted), then DNB players
    return [...battingStats, ...dnbPlayers];
  }

  /**
   * Get full batting card for a specific innings index
   * Same as getBattingStatsWithDNB but takes innings index
   */
  getFullBattingCard(inningsIndex: number, match: any): any[] {
    const innings = match?.innings?.[inningsIndex];
    return this.getBattingStatsWithDNB(innings, match);
  }

  /**
   * Get DNB players from Playing XI who haven't batted
   */
  private getDNBPlayers(playingXI: any[], battedPlayerIds: Set<string>): DNBPlayer[] {
    return playingXI
      .filter((p: any) => !battedPlayerIds.has((p.player?._id || p.player)?.toString()))
      .sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99))
      .map((squadPlayer: any) => ({
        player: squadPlayer.player,
        runs: null,
        balls: null,
        fours: 0,
        sixes: 0,
        isOut: false,
        isNotOut: false,
        isDNB: true,
        battingOrder: squadPlayer.battingOrder
      }));
  }

  /**
   * Get list of player names who are yet to bat
   */
  getYetToBatNames(innings: any, match: any, getPlayerNameFn: (player: any) => string): string[] {
    if (!innings) return [];
    
    const battingTeamId = innings.battingTeam?._id || innings.battingTeam;
    const squad = this.teamService.getSquadForTeam(battingTeamId, match);
    
    if (!squad) return [];
    
    const battedIds = new Set(
      innings.battingStats?.map((b: any) => (b.player?._id || b.player)?.toString())
    );
    
    return squad
      .filter((p: any) => p.isPlayingXI && !battedIds.has((p.player?._id || p.player)?.toString()))
      .map((p: any) => getPlayerNameFn(p.player));
  }

  /**
   * Get count of players yet to bat
   */
  getYetToBatCount(battingStats: any[]): number {
    return battingStats.filter((b: any) => b.isDNB).length;
  }

  /**
   * Check if a player is currently at the crease (striker or non-striker)
   */
  isCurrentBatsman(batsman: any, innings: any): boolean {
    const playerId = batsman.player?._id || batsman.player;
    const strikerId = innings?.currentBatsmen?.striker?._id || innings?.currentBatsmen?.striker;
    const nonStrikerId = innings?.currentBatsmen?.nonStriker?._id || innings?.currentBatsmen?.nonStriker;
    
    return this.matchIds(playerId, strikerId) || this.matchIds(playerId, nonStrikerId);
  }

  /**
   * Check if a player is the current striker
   */
  isStriker(batsman: any, innings: any): boolean {
    const playerId = batsman.player?._id || batsman.player;
    const strikerId = innings?.currentBatsmen?.striker?._id || innings?.currentBatsmen?.striker;
    return this.matchIds(playerId, strikerId);
  }

  /**
   * Check if a player is currently batting in a specific innings
   */
  isBatsmanCurrentlyBattingInInnings(batsman: any, inningsIndex: number, match: any): boolean {
    const innings = match?.innings?.[inningsIndex];
    return this.isCurrentBatsman(batsman, innings);
  }

  /**
   * Get top batsmen by runs for an innings
   */
  getTopBatsmen(innings: any, count: number): any[] {
    if (!innings?.battingStats) return [];
    return [...innings.battingStats]
      .sort((a: any, b: any) => (b.runs || 0) - (a.runs || 0))
      .slice(0, count);
  }

  /**
   * Get fall of wickets for an innings
   */
  getFallOfWickets(innings: any): any[] {
    return innings?.fallOfWickets || [];
  }

  /**
   * Helper to match player IDs (handles both string and object IDs)
   */
  private matchIds(id1: any, id2: any): boolean {
    if (!id1 || !id2) return false;
    return id1 === id2 || id1?.toString() === id2?.toString();
  }
}
