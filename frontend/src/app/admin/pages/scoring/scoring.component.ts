import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';

@Component({
  selector: 'app-scoring',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div>
      <div class="flex items-center gap-4 mb-6">
        <a routerLink="/admin/matches" class="text-gray-500 hover:text-gray-700">
          ← Back to Matches
        </a>
        <h2 class="text-2xl font-bold text-gray-800">Live Scoring</h2>
      </div>

      @if (loading) {
        <div class="text-center py-12">
          <p class="text-gray-500">Loading match...</p>
        </div>
      } @else if (!match) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500">Match not found</p>
        </div>
      } @else {
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-center mb-8">
            <h3 class="text-xl font-semibold">
              {{ match.team1?.name }} vs {{ match.team2?.name }}
            </h3>
            <p class="text-gray-500">{{ match.format }} • {{ match.venue }}</p>
          </div>

          @if (match.status === 'live' && match.innings && match.innings.length > 0) {
            <div class="text-center py-8 bg-green-50 rounded-lg mb-6">
              <p class="text-6xl font-bold text-green-800">
                {{ getCurrentScore() }}
              </p>
              <p class="text-xl text-green-600 mt-2">
                ({{ getOvers() }} overs)
              </p>
            </div>

            <div class="text-center py-8">
              <p class="text-gray-600 text-lg mb-4">
                🚧 Full scoring interface coming in Phase 9 🚧
              </p>
              <p class="text-gray-500">
                For now, you can test the scoring API directly or view the match display.
              </p>
              <a 
                [href]="'/display/' + match._id" 
                target="_blank"
                class="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                View Match Display →
              </a>
            </div>
          } @else {
            <div class="text-center py-8">
              <p class="text-gray-500">Match is not live</p>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class ScoringComponent implements OnInit {
  matchId: string = '';
  match: Match | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private matchService: MatchService
  ) {}

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    if (this.matchId) {
      this.loadMatch();
    }
  }

  loadMatch() {
    this.matchService.getById(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getCurrentScore(): string {
    if (!this.match?.innings || this.match.innings.length === 0) return '0/0';
    const innings = this.match.innings[this.match.currentInnings || 0];
    return `${innings?.totalRuns || 0}/${innings?.totalWickets || 0}`;
  }

  getOvers(): string {
    if (!this.match?.innings || this.match.innings.length === 0) return '0.0';
    const innings = this.match.innings[this.match.currentInnings || 0];
    const totalBalls = innings?.totalBalls || 0;
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    return `${overs}.${balls}`;
  }
}
