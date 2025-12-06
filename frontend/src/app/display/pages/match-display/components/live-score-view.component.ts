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

  // Highlight mode inputs
  @Input() highlightType: 'four' | 'six' | 'wicket' | 'fifty' | 'hundred' | null = null;
  @Input() highlightData: any = null;

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

  // Highlight helper methods
  get isHighlightMode(): boolean {
    return this.highlightType !== null;
  }

  get highlightBorderClass(): string {
    switch (this.highlightType) {
      case 'four': return 'ring-4 ring-green-500/50';
      case 'six': return 'ring-4 ring-purple-500/50';
      case 'wicket': return 'ring-4 ring-red-500/50';
      case 'fifty': return 'ring-4 ring-yellow-500/50';
      case 'hundred': return 'ring-4 ring-amber-500/50';
      default: return '';
    }
  }

  get highlightGlowClass(): string {
    switch (this.highlightType) {
      case 'four': return 'shadow-[0_0_30px_rgba(34,197,94,0.3)]';
      case 'six': return 'shadow-[0_0_30px_rgba(168,85,247,0.3)]';
      case 'wicket': return 'shadow-[0_0_30px_rgba(239,68,68,0.3)]';
      case 'fifty': return 'shadow-[0_0_30px_rgba(234,179,8,0.3)]';
      case 'hundred': return 'shadow-[0_0_30px_rgba(245,158,11,0.3)]';
      default: return '';
    }
  }

  getHighlightPlayerName(): string {
    if (!this.highlightData) return '';
    return this.highlightData.batsmanName || this.highlightData.playerName || '';
  }

  getHighlightPlayerImage(): string | null {
    if (!this.highlightData) return null;
    const path = this.highlightData.batsmanImage || this.highlightData.playerImage;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${path}`;
  }
}
