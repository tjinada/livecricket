import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-match-display',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-green-800 to-green-900 text-white p-4">
      @if (loading) {
        <div class="flex items-center justify-center h-screen">
          <p class="text-xl">Loading match...</p>
        </div>
      } @else if (error) {
        <div class="flex flex-col items-center justify-center h-screen">
          <p class="text-xl text-red-300 mb-4">{{ error }}</p>
          <a routerLink="/display" class="text-green-300 hover:text-white">← Back to matches</a>
        </div>
      } @else if (match) {
        <!-- Match Header -->
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-8">
            <a routerLink="/display" class="text-green-300 hover:text-white text-sm">← All Matches</a>
            <h1 class="text-3xl font-bold mt-4">{{ match.team1?.name }} vs {{ match.team2?.name }}</h1>
            <p class="text-green-200">{{ match.format }} • {{ match.venue }}</p>
            
            @if (match.status === 'live') {
              <span class="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-red-500/20 rounded-full text-sm">
                <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
            } @else if (match.status === 'completed') {
              <span class="inline-block mt-2 px-3 py-1 bg-gray-500/20 rounded-full text-sm">
                COMPLETED
              </span>
            } @else {
              <span class="inline-block mt-2 px-3 py-1 bg-yellow-500/20 rounded-full text-sm">
                UPCOMING
              </span>
            }
          </div>

          <!-- Score Display -->
          @if (currentInnings) {
            <div class="bg-white/10 backdrop-blur rounded-xl p-8 text-center mb-6">
              <p class="text-green-200 mb-2">{{ currentInnings.battingTeam?.name }}</p>
              <p class="text-6xl font-bold mb-2">
                {{ currentInnings.totalRuns }}/{{ currentInnings.totalWickets }}
              </p>
              <p class="text-2xl text-green-200">
                ({{ getOversDisplay(currentInnings.totalBalls) }} overs)
              </p>
              
              @if (match.currentInnings === 1 && match.innings[0]) {
                <p class="mt-4 text-green-300">
                  Target: {{ match.innings[0].totalRuns + 1 }} | 
                  Need {{ (match.innings[0].totalRuns + 1) - currentInnings.totalRuns }} runs
                </p>
              }
            </div>

            <!-- Current Batsmen -->
            @if (currentInnings.currentBatsmen?.striker || currentInnings.currentBatsmen?.nonStriker) {
              <div class="grid grid-cols-2 gap-4 mb-6">
                @if (currentInnings.currentBatsmen?.striker) {
                  <div class="bg-white/10 rounded-lg p-4">
                    <p class="text-green-300 text-sm">Striker</p>
                    <p class="font-semibold">{{ getBatsmanName(currentInnings.currentBatsmen.striker) }} *</p>
                    <p class="text-green-200">{{ getBatsmanStats(currentInnings.currentBatsmen.striker) }}</p>
                  </div>
                }
                @if (currentInnings.currentBatsmen?.nonStriker) {
                  <div class="bg-white/10 rounded-lg p-4">
                    <p class="text-green-300 text-sm">Non-Striker</p>
                    <p class="font-semibold">{{ getBatsmanName(currentInnings.currentBatsmen.nonStriker) }}</p>
                    <p class="text-green-200">{{ getBatsmanStats(currentInnings.currentBatsmen.nonStriker) }}</p>
                  </div>
                }
              </div>
            }

            <!-- Current Bowler -->
            @if (currentInnings.currentBowler) {
              <div class="bg-white/10 rounded-lg p-4 mb-6">
                <p class="text-green-300 text-sm">Bowler</p>
                <p class="font-semibold">{{ getBowlerName(currentInnings.currentBowler) }}</p>
                <p class="text-green-200">{{ getBowlerStats(currentInnings.currentBowler) }}</p>
              </div>
            }
          } @else {
            <div class="bg-white/10 backdrop-blur rounded-xl p-8 text-center">
              <p class="text-green-200">Match has not started yet</p>
              @if (match.toss?.winner) {
                <p class="mt-2">
                  {{ match.toss.winner.name }} won the toss and chose to {{ match.toss.decision }}
                </p>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class MatchDisplayComponent implements OnInit, OnDestroy {
  matchId: string = '';
  match: any = null;
  loading = true;
  error = '';
  private eventSource: EventSource | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    if (this.matchId) {
      this.loadMatch();
      this.connectSSE();
    } else {
      this.error = 'Invalid match ID';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.disconnectSSE();
  }

  loadMatch() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
        } else {
          this.error = 'Match not found';
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load match';
        this.loading = false;
      }
    });
  }

  connectSSE() {
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);

    this.eventSource.addEventListener('score-update', (event: any) => {
      const data = JSON.parse(event.data);
      if (data.innings) {
        this.match.innings[this.match.currentInnings] = data.innings;
      }
    });

    this.eventSource.addEventListener('match-state', (event: any) => {
      const data = JSON.parse(event.data);
      if (data.displayView) {
        this.match.displayView = data.displayView;
      }
    });

    this.eventSource.onerror = () => {
      console.log('SSE connection error, reconnecting...');
      this.disconnectSSE();
      setTimeout(() => this.connectSSE(), 3000);
    };
  }

  disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  get currentInnings() {
    if (this.match?.innings?.length > 0) {
      return this.match.innings[this.match.currentInnings];
    }
    return null;
  }

  getOversDisplay(totalBalls: number): string {
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    return `${overs}.${balls}`;
  }

  getBatsmanName(playerId: string): string {
    const innings = this.currentInnings;
    if (!innings) return 'Unknown';
    
    const stats = innings.battingStats?.find((s: any) => 
      s.player?._id === playerId || s.player === playerId
    );
    return stats?.player?.name || 'Unknown';
  }

  getBatsmanStats(playerId: string): string {
    const innings = this.currentInnings;
    if (!innings) return '';
    
    const stats = innings.battingStats?.find((s: any) => 
      s.player?._id === playerId || s.player === playerId
    );
    if (!stats) return '';
    
    return `${stats.runs} (${stats.balls})`;
  }

  getBowlerName(playerId: string): string {
    const innings = this.currentInnings;
    if (!innings) return 'Unknown';
    
    const stats = innings.bowlingStats?.find((s: any) => 
      s.player?._id === playerId || s.player === playerId
    );
    return stats?.player?.name || 'Unknown';
  }

  getBowlerStats(playerId: string): string {
    const innings = this.currentInnings;
    if (!innings) return '';
    
    const stats = innings.bowlingStats?.find((s: any) => 
      s.player?._id === playerId || s.player === playerId
    );
    if (!stats) return '';
    
    const overs = stats.overs + (stats.balls > 0 ? `.${stats.balls}` : '');
    return `${overs}-${stats.maidens}-${stats.runs}-${stats.wickets}`;
  }
}
