import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-stats-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-stats-view.component.html'
})
export class PlayerStatsViewComponent {
  // Match info
  @Input() format = '';
  @Input() inningsLabel = '';
  
  // Team info
  @Input() battingTeamName = '';
  @Input() bowlingTeamName = '';
  
  // Score
  @Input() totalRuns = 0;
  @Input() totalWickets = 0;
  @Input() oversDisplay = '';
  
  // Selected player
  @Input() selectedPlayer: any = null;
  
  // Player stats from both innings
  @Input() playerBattingStats: any = null;
  @Input() playerBowlingStats: any = null;
  
  // Match context
  @Input() matchStatus = '';
  @Input() team1Name = '';
  @Input() team2Name = '';
  
  // Helper methods
  getPlayerImage(): string | null {
    if (!this.selectedPlayer?.headshotPath) return null;
    // headshotPath already contains transformation params like /f_auto,t_h_100_2x/lsci/path/to/image
    // Replace the small thumbnail transform with a larger one for background display
    const headshotPath = this.selectedPlayer.headshotPath;
    // Use larger transform: t_ds_w_1200 instead of t_h_100_2x
    const largeImagePath = headshotPath.replace(/t_h_100_2x|t_h_100/, 't_ds_w_1200');
    return `https://img1.hscicdn.com/image/upload${largeImagePath}`;
  }
  
  getStrikeRate(): string {
    if (!this.playerBattingStats?.balls || this.playerBattingStats.balls === 0) return '0.00';
    return ((this.playerBattingStats.runs / this.playerBattingStats.balls) * 100).toFixed(2);
  }
  
  getEconomy(): string {
    if (!this.playerBowlingStats) return '-';
    const totalBalls = (this.playerBowlingStats.overs || 0) * 6 + (this.playerBowlingStats.balls || 0);
    if (totalBalls === 0) return '0.00';
    return ((this.playerBowlingStats.runs / totalBalls) * 6).toFixed(2);
  }
  
  getBowlingOvers(): string {
    if (!this.playerBowlingStats) return '0.0';
    return `${this.playerBowlingStats.overs || 0}.${this.playerBowlingStats.balls || 0}`;
  }
  
  getRoleDisplay(): string {
    if (!this.selectedPlayer?.role) return '';
    const roleMap: Record<string, string> = {
      'batsman': 'Batsman',
      'bowler': 'Bowler',
      'all-rounder': 'All-Rounder',
      'wicket-keeper': 'Wicket Keeper'
    };
    return roleMap[this.selectedPlayer.role] || this.selectedPlayer.role;
  }
  
  getBattingStyleDisplay(): string {
    if (!this.selectedPlayer?.battingStyle) return '';
    return this.selectedPlayer.battingStyle === 'right-hand' ? 'Right Hand Bat' : 'Left Hand Bat';
  }
  
  getBowlingStyleDisplay(): string {
    if (!this.selectedPlayer?.bowlingStyle || this.selectedPlayer.bowlingStyle === 'none') return '';
    const styleMap: Record<string, string> = {
      'right-arm-fast': 'Right Arm Fast',
      'right-arm-medium': 'Right Arm Medium',
      'left-arm-fast': 'Left Arm Fast',
      'left-arm-medium': 'Left Arm Medium',
      'right-arm-off-spin': 'Right Arm Off Spin',
      'right-arm-leg-spin': 'Right Arm Leg Spin',
      'left-arm-orthodox': 'Left Arm Orthodox',
      'left-arm-chinaman': 'Left Arm Chinaman'
    };
    return styleMap[this.selectedPlayer.bowlingStyle] || this.selectedPlayer.bowlingStyle;
  }
  
  hasBattingStats(): boolean {
    return this.playerBattingStats && (this.playerBattingStats.balls > 0 || this.playerBattingStats.runs > 0);
  }
  
  hasBowlingStats(): boolean {
    return this.playerBowlingStats && 
           ((this.playerBowlingStats.overs || 0) > 0 || (this.playerBowlingStats.balls || 0) > 0);
  }
}
