import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverDisplay, BallDisplay } from './match-display.interfaces';

@Component({
  selector: 'app-live-score-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-score-view.component.html'
})
export class LiveScoreViewComponent {
  // Match info
  @Input() format = '';
  @Input() inningsLabel = '';
  
  // Team info
  @Input() battingTeamName = '';
  @Input() battingTeamCode = '';
  @Input() battingTeamFlag: string | null = null;
  @Input() bowlingTeamName = '';
  
  // Score
  @Input() totalRuns = 0;
  @Input() totalWickets = 0;
  @Input() oversDisplay = '';
  @Input() isSecondInnings = false;
  @Input() runsNeeded = 0;
  @Input() ballsRemaining = 0;
  
  // Striker
  @Input() strikerName = '';
  @Input() strikerImage: string | null = null;
  @Input() strikerRuns = 0;
  @Input() strikerBalls = 0;
  @Input() strikerSR = '';
  
  // Non-striker
  @Input() nonStrikerName = '';
  @Input() nonStrikerImage: string | null = null;
  @Input() nonStrikerRuns = 0;
  @Input() nonStrikerBalls = 0;
  @Input() nonStrikerSR = '';
  
  // Bowler
  @Input() bowlerName = '';
  @Input() bowlerImage: string | null = null;
  @Input() bowlerFigures = '';
  @Input() bowlerOvers = '';
  
  // Partnership
  @Input() partnershipRuns = 0;
  @Input() partnershipBalls = 0;
  
  // Overs display
  @Input() previousOvers: OverDisplay[] = [];
  @Input() currentOverBalls: BallDisplay[] = [];
  @Input() remainingBallsInOver: number[] = [];
  
  // Stats
  @Input() lastWicket: string | null = null;
  @Input() currentRunRate = '';
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
