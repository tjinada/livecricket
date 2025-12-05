import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BallDisplay } from './match-display.interfaces';

@Component({
  selector: 'app-current-partnership-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-partnership-view.component.html'
})
export class CurrentPartnershipViewComponent {
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
  
  // Partnership
  @Input() partnershipRuns = 0;
  @Input() partnershipBalls = 0;
  
  // Striker
  @Input() strikerName = '';
  @Input() strikerImage: string | null = null;
  @Input() strikerBattingStyle = '';
  @Input() strikerRuns = 0;
  @Input() strikerBalls = 0;
  @Input() strikerFours = 0;
  @Input() strikerSixes = 0;
  @Input() strikerSR = '';
  @Input() strikerDots = 0;
  
  // Non-striker
  @Input() nonStrikerName = '';
  @Input() nonStrikerImage: string | null = null;
  @Input() nonStrikerBattingStyle = '';
  @Input() nonStrikerRuns = 0;
  @Input() nonStrikerBalls = 0;
  @Input() nonStrikerFours = 0;
  @Input() nonStrikerSixes = 0;
  @Input() nonStrikerSR = '';
  @Input() nonStrikerDots = 0;
  
  // Bowler
  @Input() bowlerName = '';
  @Input() bowlerImage: string | null = null;
  @Input() bowlerFullFigures = '';
  
  // Over display
  @Input() currentOverBalls: BallDisplay[] = [];
  @Input() remainingBallsInOver: number[] = [];
  
  // Run rates
  @Input() currentRunRate = '';
  @Input() requiredRunRate = '';
  
  // Chase info
  @Input() isSecondInnings = false;
  @Input() runsNeeded = 0;
  @Input() ballsRemaining = 0;

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
