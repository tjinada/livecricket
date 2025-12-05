import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-final-match-summary-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './final-match-summary-view.component.html'
})
export class FinalMatchSummaryViewComponent {
  // Match info
  @Input() format = '';
  @Input() inningsLabel = '';
  @Input() matchStatus = '';
  
  // First innings
  @Input() firstInningsTeam = '';
  @Input() firstInningsFlag: string | null = null;
  @Input() firstInningsRuns = 0;
  @Input() firstInningsWickets = 0;
  @Input() firstInningsOvers = '';
  @Input() firstInningsExtras = 0;
  @Input() firstInningsExtrasBreakdown = '';
  @Input() firstInningsBatsmen: Array<{
    shortName: string;
    image: string | null;
    runs: number;
    balls: number;
    dismissalText: string;
    isOut: boolean;
    isDNB: boolean;
    isCurrentlyBatting: boolean;
  }> = [];
  @Input() firstInningsBowlers: Array<{
    shortName: string;
    wickets: number;
    runs: number;
    oversDisplay: string;
  }> = [];
  
  // Second innings
  @Input() secondInningsTeam = '';
  @Input() secondInningsFlag: string | null = null;
  @Input() secondInningsRuns = 0;
  @Input() secondInningsWickets = 0;
  @Input() secondInningsOvers = '';
  @Input() secondInningsExtras = 0;
  @Input() secondInningsExtrasBreakdown = '';
  @Input() hasSecondInnings = false;
  @Input() secondInningsBatsmen: Array<{
    shortName: string;
    image: string | null;
    runs: number;
    balls: number;
    dismissalText: string;
    isOut: boolean;
    isDNB: boolean;
    isCurrentlyBatting: boolean;
  }> = [];
  @Input() secondInningsBowlers: Array<{
    shortName: string;
    wickets: number;
    runs: number;
    oversDisplay: string;
  }> = [];
  
  // Result/Chase info
  @Input() isSecondInnings = false;
  @Input() winnerTeam = '';
  @Input() winMargin = '';
  @Input() runsNeeded = 0;
  @Input() ballsRemaining = 0;
}
