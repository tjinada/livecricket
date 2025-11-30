import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';
import { ScoringService, BallData } from '../../../core/services/scoring.service';
import { BackgroundSettingsComponent, BackgroundSettings } from '../../components/background-settings/background-settings.component';

type ModalType = 'none' | 'wicket' | 'extras' | 'changeBowler' | 'endInnings' | 'secondInnings' | 'endMatch' | 'undo';

@Component({
  selector: 'app-scoring',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BackgroundSettingsComponent],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a routerLink="/admin/matches" class="text-gray-500 hover:text-gray-700">
              ← Back
            </a>
            <h1 class="text-lg font-bold text-gray-800">Live Scoring</h1>
          </div>
          <div class="flex items-center gap-3">
            <a 
              [href]="'/display/' + matchId" 
              target="_blank"
              class="text-sm text-green-600 hover:text-green-800"
            >
              View Display →
            </a>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="flex items-center justify-center h-64">
          <p class="text-gray-500">Loading match...</p>
        </div>
      } @else if (!match) {
        <div class="flex items-center justify-center h-64">
          <p class="text-gray-500">Match not found</p>
        </div>
      } @else if (match.status !== 'live') {
        <div class="flex items-center justify-center h-64 flex-col gap-4">
          <p class="text-gray-500">Match is not live</p>
          <a routerLink="/admin/matches" class="text-green-600 hover:text-green-800">
            Go to Matches
          </a>
        </div>
      } @else {
        <div class="max-w-7xl mx-auto px-4 py-6">
          <!-- Match Header -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-xl font-bold text-gray-800">
                  {{ match.team1?.name }} vs {{ match.team2?.name }}
                </h2>
                <p class="text-gray-500 text-sm">{{ match.format }} • {{ match.venue }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">
                  {{ getBattingTeamName() }} Innings
                </p>
                @if (currentInnings && match.currentInnings === 1) {
                  <p class="text-sm text-green-600 font-medium">
                    Target: {{ getTarget() }}
                  </p>
                }
              </div>
            </div>
          </div>

          <!-- Bowler Not Set Warning -->
          @if (needsBowler) {
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-yellow-600 text-xl">⚠️</span>
                <p class="text-yellow-800">New over! Please select a bowler to continue scoring.</p>
              </div>
              <button 
                (click)="openModal('changeBowler')"
                class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Select Bowler
              </button>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Score & Batsmen -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Main Score Display -->
              <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow p-6 text-white">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="text-green-200 text-sm mb-1">{{ getBattingTeamName() }}</p>
                    <p class="text-5xl font-bold">
                      {{ currentInnings?.totalRuns || 0 }}/{{ currentInnings?.totalWickets || 0 }}
                    </p>
                    <p class="text-xl text-green-200 mt-1">
                      ({{ getOversDisplay() }} overs)
                    </p>
                  </div>
                  <div class="text-right">
                    <div class="bg-white/20 rounded-lg px-4 py-2">
                      <p class="text-sm text-green-200">CRR</p>
                      <p class="text-2xl font-bold">{{ getCurrentRunRate() }}</p>
                    </div>
                    @if (match.currentInnings === 1) {
                      <div class="bg-white/20 rounded-lg px-4 py-2 mt-2">
                        <p class="text-sm text-green-200">RRR</p>
                        <p class="text-2xl font-bold">{{ getRequiredRunRate() }}</p>
                      </div>
                    }
                  </div>
                </div>

                <!-- Target Info (2nd Innings) -->
                @if (match.currentInnings === 1) {
                  <div class="mt-4 pt-4 border-t border-white/20">
                    <p class="text-green-200">
                      Need <span class="text-white font-bold">{{ getRunsNeeded() }}</span> runs from 
                      <span class="text-white font-bold">{{ getBallsRemaining() }}</span> balls
                    </p>
                  </div>
                }
              </div>

              <!-- Current Batsmen -->
              <div class="bg-white rounded-lg shadow">
                <div class="p-4 border-b flex justify-between items-center">
                  <h3 class="font-semibold text-gray-800">Batsmen</h3>
                  <button 
                    (click)="swapBatsmen()"
                    [disabled]="processing"
                    class="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                  >
                    ⇄ Swap Strike
                  </button>
                </div>
                <div class="divide-y">
                  @if (strikerStats) {
                    <div class="p-4 flex justify-between items-center bg-green-50">
                      <div class="flex items-center gap-3">
                        <span class="text-green-600 font-bold">*</span>
                        <div>
                          <p class="font-medium text-gray-800">{{ getPlayerName(currentInnings?.currentBatsmen?.striker) }}</p>
                          <p class="text-xs text-gray-500">Striker</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="text-xl font-bold text-gray-800">
                          {{ strikerStats.runs || 0 }}<span class="text-sm text-gray-500">({{ strikerStats.balls || 0 }})</span>
                        </p>
                        <p class="text-xs text-gray-500">
                          4s: {{ strikerStats.fours || 0 }} | 6s: {{ strikerStats.sixes || 0 }} | SR: {{ getStrikeRate(strikerStats) }}
                        </p>
                      </div>
                    </div>
                  }
                  @if (nonStrikerStats) {
                    <div class="p-4 flex justify-between items-center">
                      <div class="flex items-center gap-3">
                        <span class="text-gray-400">○</span>
                        <div>
                          <p class="font-medium text-gray-800">{{ getPlayerName(currentInnings?.currentBatsmen?.nonStriker) }}</p>
                          <p class="text-xs text-gray-500">Non-Striker</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="text-xl font-bold text-gray-800">
                          {{ nonStrikerStats.runs || 0 }}<span class="text-sm text-gray-500">({{ nonStrikerStats.balls || 0 }})</span>
                        </p>
                        <p class="text-xs text-gray-500">
                          4s: {{ nonStrikerStats.fours || 0 }} | 6s: {{ nonStrikerStats.sixes || 0 }} | SR: {{ getStrikeRate(nonStrikerStats) }}
                        </p>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Current Bowler -->
              <div class="bg-white rounded-lg shadow">
                <div class="p-4 border-b flex justify-between items-center">
                  <h3 class="font-semibold text-gray-800">Bowler</h3>
                  <button 
                    (click)="openModal('changeBowler')"
                    [disabled]="processing"
                    class="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                  >
                    Change Bowler
                  </button>
                </div>
                @if (currentBowlerStats) {
                  <div class="p-4 flex justify-between items-center">
                    <div>
                      <p class="font-medium text-gray-800">{{ getPlayerName(currentInnings?.currentBowler) }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold text-gray-800">
                        {{ currentBowlerStats.wickets || 0 }}-{{ currentBowlerStats.runs || 0 }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ getBowlerOvers(currentBowlerStats) }} ov | M: {{ currentBowlerStats.maidens || 0 }} | Econ: {{ getEconomy(currentBowlerStats) }}
                      </p>
                    </div>
                  </div>
                } @else {
                  <div class="p-4 text-center text-gray-500">
                    <p>No bowler selected</p>
                    <button 
                      (click)="openModal('changeBowler')"
                      class="mt-2 text-green-600 hover:text-green-800"
                    >
                      Select Bowler
                    </button>
                  </div>
                }
              </div>

              <!-- This Over -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">This Over</h3>
                <div class="flex gap-2 flex-wrap">
                  @for (ball of currentInnings?.currentOver || []; track $index) {
                    <div 
                      class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      [class.bg-gray-200]="ball.display === '0' || ball.display === '•'"
                      [class.text-gray-600]="ball.display === '0' || ball.display === '•'"
                      [class.bg-green-500]="ball.display === '4'"
                      [class.text-white]="ball.display === '4' || ball.display === '6' || ball.display === 'W'"
                      [class.bg-purple-500]="ball.display === '6'"
                      [class.bg-red-500]="ball.display === 'W'"
                      [class.bg-yellow-400]="ball.display?.includes('Wd') || ball.display?.includes('Nb')"
                      [class.text-yellow-800]="ball.display?.includes('Wd') || ball.display?.includes('Nb')"
                      [class.bg-blue-200]="!['0', '•', '4', '6', 'W'].includes(ball.display) && !ball.display?.includes('Wd') && !ball.display?.includes('Nb')"
                      [class.text-blue-800]="!['0', '•', '4', '6', 'W'].includes(ball.display) && !ball.display?.includes('Wd') && !ball.display?.includes('Nb')"
                    >
                      {{ ball.display === '0' ? '•' : ball.display }}
                    </div>
                  }
                  @for (i of getRemainingBalls(); track i) {
                    <div class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">
                      -
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Right Column: Scoring Controls -->
            <div class="space-y-6">
              <!-- Run Buttons -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Runs</h3>
                <div class="grid grid-cols-4 gap-2">
                  @for (run of [0, 1, 2, 3]; track run) {
                    <button 
                      (click)="recordRuns(run)"
                      [disabled]="processing || needsBowler"
                      class="h-14 rounded-lg font-bold text-xl transition-all disabled:opacity-50"
                      [class.bg-gray-100]="run === 0"
                      [class.hover:bg-gray-200]="run === 0"
                      [class.text-gray-700]="run === 0"
                      [class.bg-blue-100]="run > 0 && run < 4"
                      [class.hover:bg-blue-200]="run > 0 && run < 4"
                      [class.text-blue-700]="run > 0 && run < 4"
                    >
                      {{ run }}
                    </button>
                  }
                </div>
                <div class="grid grid-cols-3 gap-2 mt-2">
                  <button 
                    (click)="recordRuns(4)"
                    [disabled]="processing || needsBowler"
                    class="h-14 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xl disabled:opacity-50"
                  >
                    4
                  </button>
                  <button 
                    (click)="recordRuns(5)"
                    [disabled]="processing || needsBowler"
                    class="h-14 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-xl disabled:opacity-50"
                  >
                    5
                  </button>
                  <button 
                    (click)="recordRuns(6)"
                    [disabled]="processing || needsBowler"
                    class="h-14 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold text-xl disabled:opacity-50"
                  >
                    6
                  </button>
                </div>
              </div>

              <!-- Extras -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Extras</h3>
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    (click)="openExtrasModal('wide')"
                    [disabled]="processing || needsBowler"
                    class="h-12 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium disabled:opacity-50"
                  >
                    Wide
                  </button>
                  <button 
                    (click)="openExtrasModal('no-ball')"
                    [disabled]="processing || needsBowler"
                    class="h-12 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium disabled:opacity-50"
                  >
                    No Ball
                  </button>
                  <button 
                    (click)="recordExtras('bye', 1)"
                    [disabled]="processing || needsBowler"
                    class="h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    Bye
                  </button>
                  <button 
                    (click)="recordExtras('leg-bye', 1)"
                    [disabled]="processing || needsBowler"
                    class="h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    Leg Bye
                  </button>
                </div>
              </div>

              <!-- Wicket -->
              <div class="bg-white rounded-lg shadow p-4">
                <button 
                  (click)="openModal('wicket')"
                  [disabled]="processing || needsBowler"
                  class="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xl disabled:opacity-50"
                >
                  🏏 WICKET
                </button>
              </div>

              <!-- Actions -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Actions</h3>
                <div class="space-y-2">
                  <button 
                    (click)="openModal('undo')"
                    [disabled]="processing"
                    class="w-full h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    ↩ Undo Last Ball
                  </button>
                  <button 
                    (click)="openModal('endInnings')"
                    [disabled]="processing"
                    class="w-full h-10 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    End Innings
                  </button>
                  <button 
                    (click)="openModal('endMatch')"
                    [disabled]="processing"
                    class="w-full h-10 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    End Match
                  </button>
                </div>
              </div>

              <!-- Display Control -->
              <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="font-semibold text-gray-800">Display View</h3>
                  <button 
                    (click)="showBackgroundSettings = true"
                    class="text-sm text-purple-600 hover:text-purple-800"
                  >
                    🎨 Backgrounds
                  </button>
                </div>
                <select 
                  [(ngModel)]="displayView"
                  (change)="changeDisplayView()"
                  class="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="score-summary">Score Summary</option>
                  <option value="player-stats">Player Stats</option>
                  <option value="overall-summary">Overall Summary</option>
                  <option value="projections">Projections</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Error Display -->
          @if (error) {
            <div class="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
              {{ error }}
              <button (click)="error = ''" class="ml-2 font-bold">×</button>
            </div>
          }
        </div>
      }

      <!-- Wicket Modal -->
      @if (activeModal === 'wicket') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Record Wicket</h3>
            </div>
            <div class="p-4 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Dismissal Type</label>
                <div class="grid grid-cols-2 gap-2">
                  @for (type of dismissalTypes; track type.value) {
                    <button 
                      (click)="wicketForm.type = type.value"
                      class="p-3 rounded-lg border text-sm font-medium transition-all"
                      [class.border-red-500]="wicketForm.type === type.value"
                      [class.bg-red-50]="wicketForm.type === type.value"
                      [class.text-red-700]="wicketForm.type === type.value"
                    >
                      {{ type.label }}
                    </button>
                  }
                </div>
              </div>

              @if (needsFielder()) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Fielder</label>
                  <select 
                    [(ngModel)]="wicketForm.fielder"
                    class="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Fielder</option>
                    @for (player of bowlingTeamPlayers; track getPlayerId(player)) {
                      <option [value]="getPlayerId(player)">{{ getSquadPlayerName(player) }}</option>
                    }
                  </select>
                </div>
              }

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Runs scored on this ball</label>
                <div class="flex gap-2">
                  @for (r of [0, 1, 2, 3]; track r) {
                    <button 
                      (click)="wicketForm.runs = r"
                      class="flex-1 p-2 rounded-lg border text-sm font-medium"
                      [class.border-green-500]="wicketForm.runs === r"
                      [class.bg-green-50]="wicketForm.runs === r"
                    >
                      {{ r }}
                    </button>
                  }
                </div>
              </div>

              @if (!isLastWicket()) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">New Batsman</label>
                  <select 
                    [(ngModel)]="wicketForm.newBatsman"
                    class="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select New Batsman</option>
                    @for (player of getAvailableBatsmen(); track getPlayerId(player)) {
                      <option [value]="getPlayerId(player)">{{ getSquadPlayerName(player) }}</option>
                    }
                  </select>
                </div>
              } @else {
                <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p class="text-red-700 text-sm font-medium">This is the final wicket - innings will end.</p>
                </div>
              }

              @if (wicketError) {
                <p class="text-red-600 text-sm">{{ wicketError }}</p>
              }
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="confirmWicket()"
                [disabled]="processing || !wicketForm.type || (!wicketForm.newBatsman && !isLastWicket())"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {{ processing ? 'Recording...' : 'Record Wicket' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Extras Modal -->
      @if (activeModal === 'extras') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">{{ extrasForm.type === 'wide' ? 'Wide' : 'No Ball' }}</h3>
            </div>
            <div class="p-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Additional Runs</label>
              <div class="grid grid-cols-5 gap-2">
                @for (r of [0, 1, 2, 3, 4]; track r) {
                  <button 
                    (click)="extrasForm.runs = r"
                    class="p-3 rounded-lg border text-lg font-medium"
                    [class.border-yellow-500]="extrasForm.runs === r"
                    [class.bg-yellow-50]="extrasForm.runs === r"
                  >
                    {{ r }}
                  </button>
                }
              </div>
              <p class="text-sm text-gray-500 mt-2">
                Total: {{ 1 + extrasForm.runs }} 
                (1 + {{ extrasForm.runs }} runs)
              </p>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="confirmExtras()"
                [disabled]="processing"
                class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                {{ processing ? 'Recording...' : 'Confirm' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Change Bowler Modal -->
      @if (activeModal === 'changeBowler') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">{{ needsBowler ? 'Select Bowler for New Over' : 'Change Bowler' }}</h3>
            </div>
            <div class="p-4">
              <p class="text-sm text-gray-500 mb-4">Select a bowler for the next over</p>
              <div class="space-y-2">
                @for (player of getAvailableBowlers(); track getPlayerId(player)) {
                  <button 
                    (click)="selectedBowler = getPlayerId(player)"
                    class="w-full p-3 rounded-lg border text-left flex justify-between items-center"
                    [class.border-green-500]="selectedBowler === getPlayerId(player)"
                    [class.bg-green-50]="selectedBowler === getPlayerId(player)"
                  >
                    <span class="font-medium">{{ getSquadPlayerName(player) }}</span>
                    <span class="text-sm text-gray-500">
                      {{ getBowlerStatsDisplay(getPlayerId(player)) }}
                    </span>
                  </button>
                }
              </div>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              @if (!needsBowler) {
                <button 
                  (click)="closeModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              }
              <button 
                (click)="confirmChangeBowler()"
                [disabled]="processing || !selectedBowler"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {{ processing ? 'Changing...' : 'Confirm' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- End Innings Modal -->
      @if (activeModal === 'endInnings') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">End Innings</h3>
            </div>
            <div class="p-4">
              <p class="text-gray-600 mb-4">
                Are you sure you want to end the current innings?
              </p>
              <p class="text-lg font-bold text-gray-800">
                {{ getBattingTeamName() }}: {{ currentInnings?.totalRuns }}/{{ currentInnings?.totalWickets }}
                ({{ getOversDisplay() }})
              </p>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="confirmEndInnings()"
                [disabled]="processing"
                class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {{ processing ? 'Ending...' : 'End Innings' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Second Innings Modal -->
      @if (activeModal === 'secondInnings') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Start Second Innings</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="bg-green-50 p-4 rounded-lg text-center">
                <p class="text-sm text-green-600">Target</p>
                <p class="text-3xl font-bold text-green-700">{{ getTarget() }}</p>
                <p class="text-sm text-green-600">{{ getSecondBattingTeamName() }} need to score</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Opening Striker</label>
                <select 
                  [(ngModel)]="secondInningsForm.striker"
                  class="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Striker</option>
                  @for (player of secondBattingTeamPlayers; track getPlayerId(player)) {
                    <option 
                      [value]="getPlayerId(player)" 
                      [disabled]="getPlayerId(player) === secondInningsForm.nonStriker"
                    >
                      {{ getSquadPlayerName(player) }}
                    </option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Opening Non-Striker</label>
                <select 
                  [(ngModel)]="secondInningsForm.nonStriker"
                  class="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Non-Striker</option>
                  @for (player of secondBattingTeamPlayers; track getPlayerId(player)) {
                    <option 
                      [value]="getPlayerId(player)"
                      [disabled]="getPlayerId(player) === secondInningsForm.striker"
                    >
                      {{ getSquadPlayerName(player) }}
                    </option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Opening Bowler</label>
                <select 
                  [(ngModel)]="secondInningsForm.bowler"
                  class="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Bowler</option>
                  @for (player of secondBowlingTeamPlayers; track getPlayerId(player)) {
                    <option [value]="getPlayerId(player)">{{ getSquadPlayerName(player) }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="confirmStartSecondInnings()"
                [disabled]="processing || !secondInningsForm.striker || !secondInningsForm.nonStriker || !secondInningsForm.bowler"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {{ processing ? 'Starting...' : 'Start Innings' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- End Match Modal -->
      @if (activeModal === 'endMatch') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">End Match</h3>
            </div>
            <div class="p-4">
              <p class="text-gray-600 mb-4">
                Are you sure you want to end the match? This action cannot be undone.
              </p>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="confirmEndMatch()"
                [disabled]="processing"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {{ processing ? 'Ending...' : 'End Match' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Undo Confirmation Modal -->
      @if (activeModal === 'undo') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Undo Last Ball</h3>
            </div>
            <div class="p-4">
              <p class="text-gray-600">
                Are you sure you want to undo the last ball?
              </p>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="confirmUndo()"
                [disabled]="processing"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {{ processing ? 'Undoing...' : 'Undo' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Background Settings Modal -->
      @if (showBackgroundSettings) {
        <app-background-settings
          [matchId]="matchId"
          [currentSettings]="match?.backgrounds"
          (close)="showBackgroundSettings = false"
          (saved)="saveBackgroundSettings($event)"
        ></app-background-settings>
      }
    </div>
  `
})
export class ScoringComponent implements OnInit, OnDestroy {
  matchId = '';
  match: Match | null = null;
  loading = true;
  processing = false;
  error = '';
  displayView = 'score-summary';

  activeModal: ModalType = 'none';

  // Wicket form
  wicketForm = {
    type: '' as string,
    fielder: '',
    runs: 0,
    newBatsman: ''
  };
  wicketError = '';

  // Extras form
  extrasForm = {
    type: '' as 'wide' | 'no-ball',
    runs: 0
  };

  // Change bowler
  selectedBowler = '';

  // Second innings form
  secondInningsForm = {
    striker: '',
    nonStriker: '',
    bowler: ''
  };

  // SSE connection
  private eventSource: EventSource | null = null;

  // Player name cache
  private playerNameCache: Map<string, string> = new Map();

  dismissalTypes = [
    { value: 'bowled', label: 'Bowled' },
    { value: 'caught', label: 'Caught' },
    { value: 'lbw', label: 'LBW' },
    { value: 'run-out', label: 'Run Out' },
    { value: 'stumped', label: 'Stumped' },
    { value: 'hit-wicket', label: 'Hit Wicket' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private scoringService: ScoringService
  ) {}

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    if (this.matchId) {
      this.loadMatch();
      this.connectSSE();
    }
  }

  ngOnDestroy() {
    this.disconnectSSE();
  }

  loadMatch() {
    this.loading = true;
    this.matchService.getById(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'score-summary';
          this.buildPlayerNameCache();
          
          // Auto-open bowler selection if needed
          if (this.needsBowler && this.activeModal === 'none') {
            this.openModal('changeBowler');
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  reloadMatch(): Promise<void> {
    return new Promise((resolve) => {
      this.matchService.getById(this.matchId).subscribe({
        next: (response) => {
          if (response.success) {
            this.match = response.data;
            this.displayView = this.match.displayView || 'score-summary';
            this.buildPlayerNameCache();
            
            // Auto-open bowler selection if needed
            if (this.needsBowler && this.activeModal === 'none') {
              this.openModal('changeBowler');
            }
          }
          resolve();
        },
        error: () => {
          resolve();
        }
      });
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

    // Cache from batting stats
    this.match.innings?.forEach(inn => {
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
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);

    this.eventSource.addEventListener('match-state', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('score-update', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('wicket', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('over-complete', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('innings-complete', (event: any) => {
      this.reloadMatch().then(() => {
        if (this.match && this.match.currentInnings === 0 && this.match.innings && this.match.innings[0]?.isComplete) {
          this.prepareSecondInningsModal();
          this.activeModal = 'secondInnings';
        }
      });
    });

    this.eventSource.addEventListener('innings-start', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('match-complete', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('batsmen-change', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.addEventListener('bowler-change', (event: any) => {
      this.reloadMatch();
    });

    this.eventSource.onerror = () => {
      setTimeout(() => this.connectSSE(), 3000);
    };
  }

  disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Getters
  get currentInnings() {
    if (!this.match?.innings || this.match.innings.length === 0) return null;
    return this.match.innings[this.match.currentInnings || 0];
  }

  get needsBowler(): boolean {
    // Don't need a bowler if innings is complete or match is not live
    if (this.currentInnings?.status === 'completed' || this.match?.status !== 'live') {
      return false;
    }
    return this.currentInnings && !this.currentInnings.currentBowler;
  }

  get strikerStats() {
    if (!this.currentInnings?.battingStats || !this.currentInnings.currentBatsmen?.striker) return null;
    const strikerId = this.currentInnings.currentBatsmen.striker?._id || this.currentInnings.currentBatsmen.striker;
    return this.currentInnings.battingStats.find((b: any) => {
      const playerId = b.player?._id || b.player;
      return playerId === strikerId || playerId?.toString() === strikerId?.toString();
    });
  }

  get nonStrikerStats() {
    if (!this.currentInnings?.battingStats || !this.currentInnings.currentBatsmen?.nonStriker) return null;
    const nonStrikerId = this.currentInnings.currentBatsmen.nonStriker?._id || this.currentInnings.currentBatsmen.nonStriker;
    return this.currentInnings.battingStats.find((b: any) => {
      const playerId = b.player?._id || b.player;
      return playerId === nonStrikerId || playerId?.toString() === nonStrikerId?.toString();
    });
  }

  get currentBowlerStats() {
    if (!this.currentInnings?.bowlingStats || !this.currentInnings.currentBowler) return null;
    const bowlerId = this.currentInnings.currentBowler?._id || this.currentInnings.currentBowler;
    return this.currentInnings.bowlingStats.find((b: any) => {
      const playerId = b.player?._id || b.player;
      return playerId === bowlerId || playerId?.toString() === bowlerId?.toString();
    });
  }

  get bowlingTeamPlayers() {
    if (!this.match || !this.currentInnings) return [];
    const battingTeamId = this.currentInnings.battingTeam?._id || this.currentInnings.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1Batting = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1Batting ? this.match.squads?.team2 : this.match.squads?.team1;
    return squad?.filter((p: any) => p.isPlayingXI) || [];
  }

  get battingTeamPlayers() {
    if (!this.match || !this.currentInnings) return [];
    const battingTeamId = this.currentInnings.battingTeam?._id || this.currentInnings.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1Batting = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1Batting ? this.match.squads?.team1 : this.match.squads?.team2;
    return squad?.filter((p: any) => p.isPlayingXI) || [];
  }

  get secondBattingTeamPlayers() {
    if (!this.match) return [];
    const firstInnings = this.match.innings?.[0];
    const firstBattingTeamId = firstInnings?.battingTeam?._id || firstInnings?.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1BattedFirst = firstBattingTeamId === team1Id || firstBattingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1BattedFirst ? this.match.squads?.team2 : this.match.squads?.team1;
    return squad?.filter((p: any) => p.isPlayingXI) || [];
  }

  get secondBowlingTeamPlayers() {
    if (!this.match) return [];
    const firstInnings = this.match.innings?.[0];
    const firstBattingTeamId = firstInnings?.battingTeam?._id || firstInnings?.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1BattedFirst = firstBattingTeamId === team1Id || firstBattingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1BattedFirst ? this.match.squads?.team1 : this.match.squads?.team2;
    return squad?.filter((p: any) => p.isPlayingXI) || [];
  }

  // Helper to get player name from ID
  getPlayerName(player: any): string {
    if (!player) return 'Unknown';
    // If it's already a populated object with name
    if (player.name) return player.name;
    // If it's an object with _id
    const playerId = player._id || player;
    // Check cache
    if (this.playerNameCache.has(playerId?.toString())) {
      return this.playerNameCache.get(playerId.toString())!;
    }
    return 'Unknown';
  }

  getSquadPlayerName(squadPlayer: any): string {
    if (!squadPlayer) return 'Unknown';
    return squadPlayer.player?.name || 'Unknown';
  }

  getPlayerId(squadPlayer: any): string {
    if (!squadPlayer) return '';
    return squadPlayer.player?._id || squadPlayer.player || '';
  }

  // Display helpers
  getBattingTeamName(): string {
    if (!this.match || !this.currentInnings) return '';
    const battingTeamId = this.currentInnings.battingTeam?._id || this.currentInnings.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    return battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString()
      ? this.match.team1?.name
      : this.match.team2?.name;
  }

  getSecondBattingTeamName(): string {
    if (!this.match) return '';
    const firstInnings = this.match.innings?.[0];
    const battingTeamId = firstInnings?.battingTeam?._id || firstInnings?.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    return battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString()
      ? this.match.team2?.name
      : this.match.team1?.name;
  }

  getOversDisplay(): string {
    if (!this.currentInnings) return '0.0';
    const totalBalls = this.currentInnings.totalBalls || 0;
    return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
  }

  getCurrentRunRate(): string {
    if (!this.currentInnings || !this.currentInnings.totalBalls) return '0.00';
    const crr = (this.currentInnings.totalRuns / this.currentInnings.totalBalls) * 6;
    return crr.toFixed(2);
  }

  getRequiredRunRate(): string {
    if (!this.match || this.match.currentInnings !== 1) return '-';
    const target = this.getTarget();
    const runsNeeded = target - (this.currentInnings?.totalRuns || 0);
    const maxBalls = this.match.format === 'T20' ? 120 : 300;
    const ballsRemaining = maxBalls - (this.currentInnings?.totalBalls || 0);
    if (ballsRemaining <= 0) return '-';
    const rrr = (runsNeeded / ballsRemaining) * 6;
    return rrr.toFixed(2);
  }

  getTarget(): number {
    if (!this.match?.innings || this.match.innings.length === 0) return 0;
    return (this.match.innings[0]?.totalRuns || 0) + 1;
  }

  getRunsNeeded(): number {
    const target = this.getTarget();
    return Math.max(0, target - (this.currentInnings?.totalRuns || 0));
  }

  getBallsRemaining(): number {
    const maxBalls = this.match?.format === 'T20' ? 120 : 300;
    return Math.max(0, maxBalls - (this.currentInnings?.totalBalls || 0));
  }

  getStrikeRate(batsman: any): string {
    if (!batsman?.balls) return '0.00';
    return ((batsman.runs / batsman.balls) * 100).toFixed(2);
  }

  getBowlerOvers(bowler: any): string {
    if (!bowler) return '0.0';
    const overs = bowler.overs || 0;
    const balls = bowler.balls || 0;
    return `${overs}.${balls}`;
  }

  getEconomy(bowler: any): string {
    if (!bowler) return '0.00';
    const totalBalls = (bowler.overs || 0) * 6 + (bowler.balls || 0);
    if (totalBalls === 0) return '0.00';
    return ((bowler.runs / totalBalls) * 6).toFixed(2);
  }

  getRemainingBalls(): number[] {
    const ballsInOver = (this.currentInnings?.currentOver?.length || 0);
    const remaining = 6 - ballsInOver;
    return Array(remaining > 0 ? remaining : 0).fill(0);
  }

  isOverComplete(): boolean {
    const balls = this.currentInnings?.totalBalls || 0;
    return balls % 6 === 0 && balls > 0;
  }

  // Scoring actions
  recordRuns(runs: number) {
    if (this.needsBowler) {
      this.openModal('changeBowler');
      return;
    }

    this.processing = true;
    this.error = '';

    const ballData: BallData = { runs };

    this.scoringService.recordBall(this.matchId, ballData).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'Failed to record ball';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to record ball';
        this.processing = false;
      }
    });
  }

  openExtrasModal(type: 'wide' | 'no-ball') {
    if (this.needsBowler) {
      this.openModal('changeBowler');
      return;
    }
    this.extrasForm = { type, runs: 0 };
    this.activeModal = 'extras';
  }

  recordExtras(type: 'bye' | 'leg-bye', runs: number) {
    if (this.needsBowler) {
      this.openModal('changeBowler');
      return;
    }

    this.processing = true;
    this.error = '';

    const ballData: BallData = {
      runs: runs,
      extraType: type,
      extraRuns: 0
    };

    this.scoringService.recordBall(this.matchId, ballData).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'Failed to record extras';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to record extras';
        this.processing = false;
      }
    });
  }

  confirmExtras() {
    this.processing = true;
    this.error = '';

    const ballData: BallData = {
      runs: this.extrasForm.type === 'no-ball' ? this.extrasForm.runs : 0,
      extraType: this.extrasForm.type,
      extraRuns: 1 + this.extrasForm.runs
    };

    this.scoringService.recordBall(this.matchId, ballData).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to record extras';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to record extras';
        this.processing = false;
      }
    });
  }

  swapBatsmen() {
    this.processing = true;
    this.error = '';

    this.scoringService.swapBatsmen(this.matchId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.error = response.message || 'Failed to swap batsmen';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to swap batsmen';
        this.processing = false;
      }
    });
  }

  // Modal methods
  openModal(type: ModalType) {
    this.activeModal = type;
    if (type === 'wicket') {
      this.wicketForm = { type: '', fielder: '', runs: 0, newBatsman: '' };
      this.wicketError = '';
    } else if (type === 'changeBowler') {
      this.selectedBowler = '';
    }
  }

  closeModal() {
    this.activeModal = 'none';
  }

  needsFielder(): boolean {
    return ['caught', 'run-out', 'stumped'].includes(this.wicketForm.type);
  }

  isLastWicket(): boolean {
    // It's the last wicket if 9 wickets have already fallen (this will be the 10th)
    return (this.currentInnings?.totalWickets || 0) >= 9;
  }

  getAvailableBatsmen(): any[] {
    if (!this.currentInnings?.battingStats) return this.battingTeamPlayers;
    const battedPlayerIds = this.currentInnings.battingStats.map((b: any) => {
      const id = b.player?._id || b.player;
      return id?.toString();
    });
    return this.battingTeamPlayers.filter((p: any) => {
      const playerId = this.getPlayerId(p);
      return !battedPlayerIds.includes(playerId?.toString());
    });
  }

  confirmWicket() {
    if (!this.wicketForm.type) {
      this.wicketError = 'Please select dismissal type';
      return;
    }
    if (this.needsFielder() && !this.wicketForm.fielder) {
      this.wicketError = 'Please select fielder';
      return;
    }
    if (!this.wicketForm.newBatsman && !this.isLastWicket()) {
      this.wicketError = 'Please select new batsman';
      return;
    }

    this.processing = true;
    this.wicketError = '';

    const ballData: BallData = {
      runs: this.wicketForm.runs,
      wicket: {
        type: this.wicketForm.type as any,
        fielder: this.wicketForm.fielder || undefined
      },
      newBatsman: this.wicketForm.newBatsman || null
    };

    this.scoringService.recordBall(this.matchId, ballData).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.wicketError = response.message || 'Failed to record wicket';
        }
        this.processing = false;
      },
      error: (err) => {
        this.wicketError = err.error?.message || 'Failed to record wicket';
        this.processing = false;
      }
    });
  }

  getAvailableBowlers(): any[] {
    const lastBowlerId = this.currentInnings?.lastBowler?._id || this.currentInnings?.lastBowler;
    return this.bowlingTeamPlayers.filter((p: any) => {
      const playerId = this.getPlayerId(p);
      return playerId !== lastBowlerId && 
             playerId?.toString() !== lastBowlerId?.toString();
    });
  }

  getBowlerStatsDisplay(playerId: string): string {
    const bowlerStats = this.currentInnings?.bowlingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === playerId || id?.toString() === playerId?.toString();
    });
    if (!bowlerStats) return 'No overs yet';
    return `${this.getBowlerOvers(bowlerStats)} - ${bowlerStats.wickets}/${bowlerStats.runs}`;
  }

  confirmChangeBowler() {
    if (!this.selectedBowler) return;

    this.processing = true;
    this.error = '';

    this.scoringService.changeBowler(this.matchId, this.selectedBowler).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedBowler = '';
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to change bowler';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to change bowler';
        this.processing = false;
      }
    });
  }

  confirmUndo() {
    this.processing = true;
    this.error = '';

    this.scoringService.undoLastBall(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to undo';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to undo';
        this.processing = false;
      }
    });
  }

  confirmEndInnings() {
    this.processing = true;
    this.error = '';

    this.scoringService.endInnings(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          // If first innings, prepare second innings
          if (this.match && this.match.currentInnings === 0) {
            this.prepareSecondInningsModal();
            this.activeModal = 'secondInnings';
          }
        } else {
          this.error = response.message || 'Failed to end innings';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to end innings';
        this.processing = false;
      }
    });
  }

  prepareSecondInningsModal() {
    this.secondInningsForm = { striker: '', nonStriker: '', bowler: '' };
  }

  confirmStartSecondInnings() {
    if (!this.secondInningsForm.striker || !this.secondInningsForm.nonStriker || !this.secondInningsForm.bowler) {
      return;
    }

    this.processing = true;
    this.error = '';

    this.scoringService.startSecondInnings(this.matchId, {
      openingBatsmen: {
        striker: this.secondInningsForm.striker,
        nonStriker: this.secondInningsForm.nonStriker
      },
      openingBowler: this.secondInningsForm.bowler
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to start second innings';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to start second innings';
        this.processing = false;
      }
    });
  }

  confirmEndMatch() {
    this.processing = true;
    this.error = '';

    this.scoringService.endMatch(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.router.navigate(['/admin/matches']);
        } else {
          this.error = response.message || 'Failed to end match';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to end match';
        this.processing = false;
      }
    });
  }

  changeDisplayView() {
    this.matchService.setDisplayView(this.matchId, this.displayView).subscribe({
      error: (err) => {
        this.error = err.error?.message || 'Failed to change display view';
      }
    });
  }

  // Background settings
  showBackgroundSettings = false;

  saveBackgroundSettings(settings: BackgroundSettings) {
    this.matchService.updateBackgrounds(this.matchId, settings).subscribe({
      next: (response) => {
        if (response.success) {
          this.showBackgroundSettings = false;
        } else {
          this.error = 'Failed to update backgrounds';
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update backgrounds';
      }
    });
  }
}
