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
              @if (match.result) {
                <p class="mt-2 text-xl font-semibold">
                  @if (match.result.winner) {
                    {{ match.result.winner.name }} won by {{ match.result.winMargin }}
                  } @else {
                    {{ match.result.winMargin }}
                  }
                </p>
              }
            } @else {
              <span class="inline-block mt-2 px-3 py-1 bg-yellow-500/20 rounded-full text-sm">
                UPCOMING
              </span>
            }
          </div>

          <!-- Score Display -->
          @if (currentInnings) {
            <div class="bg-white/10 backdrop-blur rounded-xl p-8 text-center mb-6">
              <p class="text-green-200 mb-2">{{ getBattingTeamName() }}</p>
              <p class="text-6xl font-bold mb-2">
                {{ currentInnings.totalRuns }}/{{ currentInnings.totalWickets }}
              </p>
              <p class="text-2xl text-green-200">
                ({{ getOversDisplay(currentInnings.totalBalls) }} overs)
              </p>
              
              @if (match.currentInnings === 1 && match.innings[0]) {
                <div class="mt-4 text-green-300">
                  <p>Target: {{ match.innings[0].totalRuns + 1 }}</p>
                  <p>Need {{ (match.innings[0].totalRuns + 1) - currentInnings.totalRuns }} runs from {{ getRemainingBalls() }} balls</p>
                </div>
              }
            </div>

            <!-- Current Batsmen -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="bg-white/10 rounded-lg p-4">
                <p class="text-green-300 text-sm">Striker</p>
                <p class="font-semibold text-lg">{{ getStrikerName() }} *</p>
                <p class="text-green-200">{{ getStrikerStats() }}</p>
              </div>
              <div class="bg-white/10 rounded-lg p-4">
                <p class="text-green-300 text-sm">Non-Striker</p>
                <p class="font-semibold text-lg">{{ getNonStrikerName() }}</p>
                <p class="text-green-200">{{ getNonStrikerStats() }}</p>
              </div>
            </div>

            <!-- Current Bowler -->
            <div class="bg-white/10 rounded-lg p-4 mb-6">
              <p class="text-green-300 text-sm">Bowler</p>
              <p class="font-semibold text-lg">{{ getCurrentBowlerName() }}</p>
              <p class="text-green-200">{{ getCurrentBowlerStats() }}</p>
            </div>

            <!-- Current Over -->
            @if (currentInnings.currentOver && currentInnings.currentOver.length > 0) {
              <div class="bg-white/10 rounded-lg p-4 mb-6">
                <p class="text-green-300 text-sm mb-2">This Over</p>
                <div class="flex gap-2 flex-wrap">
                  @for (ball of currentInnings.currentOver; track $index) {
                    <span class="w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold"
                      [class]="getBallClass(ball)">
                      {{ ball.display }}
                    </span>
                  }
                </div>
              </div>
            }

            <!-- Run Rate Info -->
            <div class="bg-white/10 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p class="text-green-300 text-sm">Current Run Rate</p>
                  <p class="text-2xl font-bold">{{ getCurrentRunRate() }}</p>
                </div>
                @if (match.currentInnings === 1) {
                  <div>
                    <p class="text-green-300 text-sm">Required Run Rate</p>
                    <p class="text-2xl font-bold">{{ getRequiredRunRate() }}</p>
                  </div>
                }
              </div>
            </div>
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
  private playerNameCache: Map<string, string> = new Map();

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
          this.buildPlayerNameCache();
        } else {
          this.error = 'Match not found';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading match:', err);
        this.error = 'Failed to load match';
        this.loading = false;
      }
    });
  }

  reloadMatch() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.buildPlayerNameCache();
        }
      }
    });
  }

  buildPlayerNameCache() {
    if (!this.match) return;
    
    // Cache player names from squads
    const cacheFromSquad = (squad: any[]) => {
      if (!squad) return;
      squad.forEach(p => {
        const playerId = p.player?._id || p.player;
        const playerName = p.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
    };

    cacheFromSquad(this.match.squads?.team1);
    cacheFromSquad(this.match.squads?.team2);

    // Cache from batting/bowling stats
    this.match.innings?.forEach((inn: any) => {
      inn.battingStats?.forEach((bs: any) => {
        const playerId = bs.player?._id || bs.player;
        const playerName = bs.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
      inn.bowlingStats?.forEach((bs: any) => {
        const playerId = bs.player?._id || bs.player;
        const playerName = bs.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
    });
  }

  connectSSE() {
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);

    // Reload full match data on any update
    this.eventSource.addEventListener('score-update', () => this.reloadMatch());
    this.eventSource.addEventListener('wicket', () => this.reloadMatch());
    this.eventSource.addEventListener('over-complete', () => this.reloadMatch());
    this.eventSource.addEventListener('innings-complete', () => this.reloadMatch());
    this.eventSource.addEventListener('innings-start', () => this.reloadMatch());
    this.eventSource.addEventListener('match-complete', () => this.reloadMatch());
    this.eventSource.addEventListener('batsmen-change', () => this.reloadMatch());
    this.eventSource.addEventListener('bowler-change', () => this.reloadMatch());
    this.eventSource.addEventListener('view-change', () => this.reloadMatch());
    
    this.eventSource.addEventListener('match-state', (event: any) => {
      const data = JSON.parse(event.data);
      if (data.displayView && this.match) {
        this.match.displayView = data.displayView;
      }
      this.reloadMatch();
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
    if (this.match?.innings?.length > 0 && this.match.currentInnings !== undefined) {
      return this.match.innings[this.match.currentInnings];
    }
    return null;
  }

  getPlayerName(player: any): string {
    if (!player) return 'Not set';
    if (player.name) return player.name;
    const playerId = player._id || player;
    if (this.playerNameCache.has(playerId?.toString())) {
      return this.playerNameCache.get(playerId.toString())!;
    }
    return 'Unknown';
  }

  getBattingTeamName(): string {
    const innings = this.currentInnings;
    if (!innings) return '';
    return innings.battingTeam?.name || 'Unknown Team';
  }

  getOversDisplay(totalBalls: number): string {
    if (!totalBalls && totalBalls !== 0) return '0.0';
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    return `${overs}.${balls}`;
  }

  getStrikerName(): string {
    const innings = this.currentInnings;
    if (!innings?.currentBatsmen?.striker) return 'Not set';
    return this.getPlayerName(innings.currentBatsmen.striker);
  }

  getStrikerStats(): string {
    const innings = this.currentInnings;
    if (!innings?.currentBatsmen?.striker) return '';
    
    const strikerId = innings.currentBatsmen.striker._id || innings.currentBatsmen.striker;
    const stats = innings.battingStats?.find((s: any) => {
      const playerId = s.player?._id || s.player;
      return playerId === strikerId || playerId?.toString() === strikerId?.toString();
    });
    
    if (!stats) return '0 (0)';
    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    return `${stats.runs} (${stats.balls}) SR: ${sr}`;
  }

  getNonStrikerName(): string {
    const innings = this.currentInnings;
    if (!innings?.currentBatsmen?.nonStriker) return 'Not set';
    return this.getPlayerName(innings.currentBatsmen.nonStriker);
  }

  getNonStrikerStats(): string {
    const innings = this.currentInnings;
    if (!innings?.currentBatsmen?.nonStriker) return '';
    
    const nonStrikerId = innings.currentBatsmen.nonStriker._id || innings.currentBatsmen.nonStriker;
    const stats = innings.battingStats?.find((s: any) => {
      const playerId = s.player?._id || s.player;
      return playerId === nonStrikerId || playerId?.toString() === nonStrikerId?.toString();
    });
    
    if (!stats) return '0 (0)';
    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    return `${stats.runs} (${stats.balls}) SR: ${sr}`;
  }

  getCurrentBowlerName(): string {
    const innings = this.currentInnings;
    if (!innings?.currentBowler) return 'Not set';
    return this.getPlayerName(innings.currentBowler);
  }

  getCurrentBowlerStats(): string {
    const innings = this.currentInnings;
    if (!innings?.currentBowler) return '';
    
    const bowlerId = innings.currentBowler._id || innings.currentBowler;
    const stats = innings.bowlingStats?.find((s: any) => {
      const playerId = s.player?._id || s.player;
      return playerId === bowlerId || playerId?.toString() === bowlerId?.toString();
    });
    
    if (!stats) return '0-0-0-0';
    const overs = stats.overs || 0;
    const balls = stats.balls || 0;
    const oversDisplay = balls > 0 ? `${overs}.${balls}` : `${overs}`;
    const totalBalls = overs * 6 + balls;
    const econ = totalBalls > 0 
      ? (stats.runs / (totalBalls / 6)).toFixed(2)
      : '0.00';
    return `${oversDisplay}-${stats.maidens}-${stats.runs}-${stats.wickets} (Econ: ${econ})`;
  }

  getCurrentRunRate(): string {
    const innings = this.currentInnings;
    if (!innings || innings.totalBalls === 0) return '0.00';
    const overs = innings.totalBalls / 6;
    return (innings.totalRuns / overs).toFixed(2);
  }

  getRequiredRunRate(): string {
    if (!this.match || this.match.currentInnings !== 1 || !this.match.innings[0]) return '-';
    
    const target = this.match.innings[0].totalRuns + 1;
    const currentRuns = this.currentInnings?.totalRuns || 0;
    const runsNeeded = target - currentRuns;
    const ballsRemaining = this.getRemainingBalls();
    
    if (ballsRemaining <= 0) return '-';
    const oversRemaining = ballsRemaining / 6;
    return (runsNeeded / oversRemaining).toFixed(2);
  }

  getRemainingBalls(): number {
    const maxBalls = this.match?.format === 'T20' ? 120 : 300;
    const ballsBowled = this.currentInnings?.totalBalls || 0;
    return maxBalls - ballsBowled;
  }

  getBallClass(ball: any): string {
    if (ball.isWicket) return 'bg-red-500 text-white';
    if (ball.display === '4') return 'bg-blue-500 text-white';
    if (ball.display === '6') return 'bg-purple-500 text-white';
    if (ball.isExtra) return 'bg-yellow-500 text-black';
    if (ball.display === '•' || ball.runs === 0) return 'bg-gray-500 text-white';
    return 'bg-green-500 text-white';
  }
}
