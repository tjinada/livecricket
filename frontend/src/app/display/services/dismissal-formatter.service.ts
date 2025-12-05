import { Injectable } from '@angular/core';
import { PlayerCacheService } from './player-cache.service';

/**
 * Service for formatting dismissal text in various formats
 * Pure formatting logic - no state management
 */
@Injectable({
  providedIn: 'root'
})
export class DismissalFormatterService {

  constructor(private playerCacheService: PlayerCacheService) {}

  /**
   * Get full dismissal text (e.g., "c Smith b Jones")
   * Used in detailed views
   */
  getHowOut(batsman: any, isCurrentBatsman: boolean): string {
    if (!batsman.isOut) {
      if (batsman.isNotOut || isCurrentBatsman) return 'not out';
      return 'did not bat';
    }
    
    const d = batsman.dismissal;
    if (!d?.type) return 'out';
    
    switch (d.type) {
      case 'bowled': 
        return `b ${this.playerCacheService.getPlayerName(d.bowler)}`;
      case 'caught':
        const fielder = this.playerCacheService.getPlayerName(d.fielder);
        const bowler = this.playerCacheService.getPlayerName(d.bowler);
        return fielder === bowler ? `c & b ${bowler}` : `c ${fielder} b ${bowler}`;
      case 'lbw': 
        return `lbw b ${this.playerCacheService.getPlayerName(d.bowler)}`;
      case 'run-out': 
        return `run out (${this.playerCacheService.getPlayerName(d.fielder)})`;
      case 'stumped': 
        return `st ${this.playerCacheService.getPlayerName(d.fielder)} b ${this.playerCacheService.getPlayerName(d.bowler)}`;
      case 'hit-wicket': 
        return `hit wicket b ${this.playerCacheService.getPlayerName(d.bowler)}`;
      default: 
        return 'out';
    }
  }

  /**
   * Get very short dismissal abbreviation (e.g., "c", "b", "lbw")
   * Used in compact scorecard views
   */
  getShortHowOut(batsman: any): string {
    if (!batsman.isOut || !batsman.dismissal?.type) return '';
    
    const d = batsman.dismissal;
    switch (d.type) {
      case 'bowled': return 'b';
      case 'caught': return 'c';
      case 'lbw': return 'lbw';
      case 'run-out': return 'r/o';
      case 'stumped': return 'st';
      case 'hit-wicket': return 'hw';
      default: return '';
    }
  }

  /**
   * Get short dismissal text with bowler's last name (e.g., "b Jones", "c b Smith")
   * Used in live-match-summary view
   */
  getShortDismissal(batsman: any, isCurrentBatsman: boolean): string {
    // Handle DNB (Did Not Bat)
    if (batsman.isDNB) {
      return 'DNB';
    }
    
    if (!batsman.isOut) {
      if (batsman.isNotOut || isCurrentBatsman) return 'not out';
      return '';
    }
    
    const d = batsman.dismissal;
    if (!d?.type) return 'out';
    
    const bowlerName = this.playerCacheService.getPlayerName(d.bowler)?.split(' ').pop() || '';
    
    switch (d.type) {
      case 'bowled': return `b ${bowlerName}`;
      case 'caught': return `c b ${bowlerName}`;
      case 'lbw': return `lbw ${bowlerName}`;
      case 'run-out': return 'run out';
      case 'stumped': return `st b ${bowlerName}`;
      case 'hit-wicket': return 'hit wkt';
      default: return 'out';
    }
  }

  /**
   * Get summary dismissal text with fielder info (e.g., "c Smith b Jones", "run out (Smith)")
   * Used in final-match-summary view
   */
  getSummaryDismissal(batsman: any, isCurrentBatsman: boolean): string {
    if (batsman.isDNB) {
      return 'DNB';
    }
    
    if (!batsman.isOut) {
      if (batsman.isNotOut || isCurrentBatsman) return 'not out';
      return '';
    }
    
    const d = batsman.dismissal;
    if (!d?.type) return 'out';
    
    const bowlerName = this.playerCacheService.getPlayerName(d.bowler)?.split(' ').pop() || '';
    const fielderName = this.playerCacheService.getPlayerName(d.fielder)?.split(' ').pop() || '';
    
    switch (d.type) {
      case 'bowled': 
        return `b ${bowlerName}`;
      case 'caught': 
        if (fielderName === bowlerName) return `c & b ${bowlerName}`;
        return `c ${fielderName} b ${bowlerName}`;
      case 'lbw': 
        return `lbw ${bowlerName}`;
      case 'run-out': 
        return fielderName ? `run out (${fielderName})` : 'run out';
      case 'stumped': 
        return `st b ${bowlerName}`;
      case 'hit-wicket': 
        return `hit wkt b ${bowlerName}`;
      default: 
        return 'out';
    }
  }
}
