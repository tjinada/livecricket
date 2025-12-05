import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlayerCacheService {
  private playerNameCache: Map<string, string> = new Map();
  private playerImageCache: Map<string, string> = new Map();

  private readonly ESPN_CDN_BASE = 'https://img1.hscicdn.com/image/upload';

  /**
   * Build caches from match data for quick player lookups
   */
  buildCacheFromMatch(match: any): void {
    if (!match) return;

    const cachePlayer = (player: any) => {
      if (!player) return;
      const playerId = player._id || player;
      if (playerId && player.name) {
        this.playerNameCache.set(playerId.toString(), player.name);
      }
      if (playerId && player.headshotPath) {
        const fullUrl = this.buildImageUrl(player.headshotPath);
        if (fullUrl) {
          this.playerImageCache.set(playerId.toString(), fullUrl);
        }
      }
    };

    const cacheFromSquad = (squad: any[]) => {
      if (!squad) return;
      squad.forEach(p => cachePlayer(p.player));
    };

    // Cache from squads
    cacheFromSquad(match.squads?.team1);
    cacheFromSquad(match.squads?.team2);

    // Cache from innings data
    match.innings?.forEach((inn: any) => {
      cachePlayer(inn.currentBatsmen?.striker);
      cachePlayer(inn.currentBatsmen?.nonStriker);
      cachePlayer(inn.currentBowler);
      inn.battingStats?.forEach((bs: any) => cachePlayer(bs.player));
      inn.bowlingStats?.forEach((bs: any) => cachePlayer(bs.player));
      inn.fallOfWickets?.forEach((fow: any) => cachePlayer(fow.player));
    });
  }

  /**
   * Get player name from player object or ID
   */
  getPlayerName(player: any): string {
    if (!player) return 'Unknown';
    if (player.name) return player.name;
    const playerId = player._id || player;
    return this.playerNameCache.get(playerId?.toString()) || 'Unknown';
  }

  /**
   * Get shortened player name (last name only)
   */
  getShortPlayerName(player: any): string {
    const name = this.getPlayerName(player);
    return name?.split(' ').pop() || 'Unknown';
  }

  /**
   * Get player image URL from player object or ID
   */
  getPlayerImage(player: any): string | null {
    if (!player) return null;

    // Check for headshotPath and build full URL
    if (player.headshotPath) {
      return this.buildImageUrl(player.headshotPath);
    }

    // Check for already-built imageUrl
    if (player.imageUrl) {
      return player.imageUrl;
    }

    // Try to find in cache if player is just an ID
    const playerId = player._id || player;
    return this.playerImageCache.get(playerId?.toString()) || null;
  }

  /**
   * Build full ESPN CDN URL from relative path
   */
  private buildImageUrl(headshotPath: string): string | null {
    if (!headshotPath) return null;

    // If it's already a full URL, return as-is
    if (headshotPath.startsWith('http')) {
      return headshotPath;
    }

    // Build full URL from relative path
    return `${this.ESPN_CDN_BASE}${headshotPath}`;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.playerNameCache.clear();
    this.playerImageCache.clear();
  }
}
