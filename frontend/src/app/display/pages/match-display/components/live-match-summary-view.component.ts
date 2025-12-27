import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BallDisplay } from './match-display.interfaces';

@Component({
  selector: 'app-live-match-summary-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-match-summary-view.component.html'
})
export class LiveMatchSummaryViewComponent {
  // Match info
  @Input() format = '';
  @Input() inningsLabel = '';
  
  // Team info
  @Input() battingTeamName = '';
  @Input() battingTeamCode = '';
  @Input() bowlingTeamName = '';
  
  // Score
  @Input() totalRuns = 0;
  @Input() totalWickets = 0;
  @Input() oversDisplay = '';
  @Input() currentRunRate = '';
  
  // Current batsmen
  @Input() strikerName = '';
  @Input() strikerImage: string | null = null;
  @Input() strikerRuns = 0;
  @Input() strikerBalls = 0;
  @Input() nonStrikerName = '';
  @Input() nonStrikerImage: string | null = null;
  @Input() nonStrikerRuns = 0;
  @Input() nonStrikerBalls = 0;
  @Input() partnershipRuns = 0;
  @Input() partnershipBalls = 0;
  
  // Batting stats - extended for display
  @Input() battingStats: Array<{
    name: string;
    image: string | null;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    dismissalText: string;
    isCurrentBatsman: boolean;
    isStriker: boolean;
    isDNB: boolean;
  }> = [];
  
  // Current bowler
  @Input() currentBowlerName = '';
  @Input() currentBowlerImage: string | null = null;
  @Input() currentBowlerFigures = '';
  @Input() currentBowlerOvers = '';
  @Input() currentOverBalls: BallDisplay[] = [];
  
  // Bowling stats - extended for display
  @Input() bowlingStats: Array<{
    name: string;
    image: string | null;
    oversDisplay: string;
    runs: number;
    wickets: number;
    economy: string;
    isCurrentBowler: boolean;
    isBestBowler: boolean;
  }> = [];
  
  // Extras
  @Input() totalExtras = 0;
  @Input() extrasBreakdown = '';
  @Input() yetToBatCount = 0;
  
  // Display mode - for innings summary, hide "at the crease" section
  @Input() isInningsSummary = false;
  
  // Stats
  @Input() totalFours = 0;
  @Input() totalSixes = 0;
  @Input() dotBallsPercentage = 0;
  
  // Fall of wickets
  @Input() fallOfWickets: Array<{
    wicketNumber: number;
    runs: number;
    playerName: string;
  }> = [];
  
  // Chase info
  @Input() isSecondInnings = false;
  @Input() target = 0;
  @Input() runsNeeded = 0;
  @Input() ballsRemaining = 0;
  @Input() requiredRunRate = '';

  getBallColorClass(ball: BallDisplay): { [key: string]: boolean } {
    const display = ball.display;
    return {
      'bg-gray-700 text-gray-300': display === '0' || display === '•',
      'bg-green-600 text-white': display === '4',
      'bg-purple-600 text-white': display === '6',
      'bg-red-600 text-white': display === 'W',
      'bg-yellow-600 text-black': display === 'Wd' || display === 'Nb' || display === 'B' || display === 'Lb',
      'bg-blue-600 text-white': !['0', '•', '4', '6', 'W', 'Wd', 'Nb', 'B', 'Lb'].includes(display)
    };
  }
}
