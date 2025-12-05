import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphDataPoint } from './match-display.interfaces';

@Component({
  selector: 'app-run-rate-graph-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './run-rate-graph-view.component.html'
})
export class RunRateGraphViewComponent {
  // Match info
  @Input() format = '';
  @Input() inningsLabel = '';
  
  // Team names
  @Input() firstInningsTeamName = '';
  @Input() secondInningsTeamName = '';
  @Input() battingTeamName = '';
  @Input() battingTeamCode = '';
  @Input() hasSecondInnings = false;
  
  // Current score
  @Input() totalRuns = 0;
  @Input() totalWickets = 0;
  @Input() oversDisplay = '';
  
  // Run rates
  @Input() currentRunRate = '';
  @Input() requiredRunRate = '';
  @Input() projectedScore = 0;
  
  // Chase info
  @Input() isSecondInnings = false;
  @Input() target = 0;
  @Input() runsNeeded = 0;
  @Input() ballsRemaining = 0;
  @Input() oversRemaining = '';
  
  // Stats
  @Input() totalFours = 0;
  @Input() totalSixes = 0;
  @Input() winProbability = 50;
  
  // Graph data
  @Input() firstInningsData: GraphDataPoint[] = [];
  @Input() secondInningsData: GraphDataPoint[] = [];
  @Input() yAxisLabels: number[] = [];
  @Input() oversAxisLabels: number[] = [];
  @Input() xScale = 1;
  @Input() yScale = 1;
  @Input() firstInningsLinePoints = '';
  @Input() secondInningsLinePoints = '';
  @Input() firstInningsAreaPoints = '';
  @Input() secondInningsAreaPoints = '';
}
