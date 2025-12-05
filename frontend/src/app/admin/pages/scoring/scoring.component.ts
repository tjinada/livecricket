import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';
import { ScoringService, BallData } from '../../../core/services/scoring.service';
import { PlayerService } from '../../../core/services/player.service';
import { Player } from '../../../core/models';
import { BackgroundSettingsComponent, BackgroundSettings } from '../../components/background-settings/background-settings.component';

type ModalType = 'none' | 'wicket' | 'extras' | 'changeBowler' | 'endInnings' | 'secondInnings' | 'endMatch' | 'undo' | 'substitute' | 'playerStats';

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
            <!-- Connection Status Indicator -->
            <div 
              class="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              [ngClass]="{
                'bg-green-100 text-green-700': isDisplayConnected,
                'bg-red-100 text-red-700 animate-pulse': !isDisplayConnected
              }"
            >
              <span 
                class="w-2 h-2 rounded-full"
                [ngClass]="{
                  'bg-green-500': isDisplayConnected,
                  'bg-red-500': !isDisplayConnected
                }"
              ></span>
              {{ isDisplayConnected ? 'Live' : 'Reconnecting...' }}
            </div>
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
      } @else if (match.status === 'completed') {
        <!-- Completed Match View - Display Controls Still Available -->
        <div class="max-w-3xl mx-auto px-4 py-6">
          <!-- Match Result Header -->
          <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow p-6 text-white mb-6">
            <div class="text-center">
              <p class="text-green-200 text-sm mb-2">Match Completed</p>
              <h2 class="text-2xl font-bold mb-2">
                {{ match.team1?.name }} vs {{ match.team2?.name }}
              </h2>
              @if (match.result?.winner) {
                <p class="text-xl">
                  {{ match.result!.winner.name }} won
                  @if (match.result!.winMargin) {
                    <span>by {{ match.result!.winMargin }} {{ match.result!.winType }}</span>
                  }
                </p>
              }
            </div>
          </div>

          <!-- Innings Summary -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <h3 class="font-semibold text-gray-800 mb-4">Match Summary</h3>
            <div class="space-y-3">
              @for (innings of match.innings; track $index) {
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p class="font-medium text-gray-800">{{ getTeamNameById(innings.battingTeam) }}</p>
                    <p class="text-sm text-gray-500">Innings {{ $index + 1 }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xl font-bold text-gray-800">
                      {{ innings.totalRuns }}/{{ innings.totalWickets }}
                    </p>
                    <p class="text-sm text-gray-500">({{ getOversDisplayForInnings(innings) }} overs)</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Display Control -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-semibold text-gray-800">Display View Control</h3>
              <button 
                (click)="showBackgroundSettings = true"
                class="text-sm text-purple-600 hover:text-purple-800"
              >
                🎨 Backgrounds
              </button>
            </div>
            <p class="text-sm text-gray-500 mb-3">Control what is shown on the public display</p>
            <select 
              [(ngModel)]="displayView"
              (change)="changeDisplayView()"
              class="w-full px-3 py-2 border rounded-lg"
            >
              <option value="live-score">Live Score</option>
              <option value="live-match-summary">Live Match Summary</option>
              <option value="run-rate-graph">Run Rate Graph</option>
              <option value="current-partnership">Current Partnership</option>
              <option value="final-match-summary">Final Match Summary</option>
              <option value="player-stats">Player Stats</option>
            </select>

          </div>

          <!-- Display Overlays for Completed Match -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <h3 class="font-semibold text-gray-800 mb-3">Display Overlays</h3>
            
            <!-- Third Umpire -->
            <div class="mb-4">
              <p class="text-sm text-gray-600 mb-2">3rd Umpire Decision</p>
              <div class="grid grid-cols-3 gap-2">
                <button 
                  (click)="startThirdUmpire()"
                  [disabled]="thirdUmpireActive"
                  class="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
                >
                  ⏳ Review
                </button>
                <button 
                  (click)="thirdUmpireOut()"
                  [disabled]="!thirdUmpireActive"
                  class="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  OUT
                </button>
                <button 
                  (click)="thirdUmpireNotOut()"
                  [disabled]="!thirdUmpireActive"
                  class="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  NOT OUT
                </button>
              </div>
            </div>
            
            <!-- Custom Message -->
            <div>
              <p class="text-sm text-gray-600 mb-2">Custom Message</p>
              <div class="flex gap-2 mb-2">
                <input 
                  type="text" 
                  [(ngModel)]="customMessageText"
                  placeholder="Enter message..."
                  class="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  (click)="showCustomMessage()"
                  [disabled]="!customMessageText"
                  class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  📢 Show
                </button>
                <button 
                  (click)="dismissCustomMessage()"
                  class="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                >
                  ✖ Dismiss
                </button>
              </div>
            </div>
          </div>

          <!-- View Display Link -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <h3 class="font-semibold text-gray-800 mb-3">Display Screen</h3>
            <a 
              [href]="'/display/' + matchId" 
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <span>Open Display View</span>
              <span>→</span>
            </a>
          </div>

          <!-- Back to Matches -->
          <div class="text-center">
            <a routerLink="/admin/matches" class="text-gray-600 hover:text-gray-800">
              ← Back to Matches
            </a>
          </div>
        </div>

        <!-- Background Settings Modal for Completed Match -->
        @if (showBackgroundSettings) {
          <app-background-settings
            [matchId]="matchId"
            [currentSettings]="match.backgrounds"
            (close)="showBackgroundSettings = false"
            (saved)="saveBackgroundSettings($event)"
          ></app-background-settings>
        }
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

          <!-- First Innings Complete - Start Second Innings -->
          @if (isFirstInningsCompleteAwaitingSecond()) {
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-green-600 text-xl">🏏</span>
                  <div>
                    <p class="text-green-800 font-semibold">First Innings Complete!</p>
                    <p class="text-green-700 text-sm">{{ getFirstInningsSummary() }} - Target: {{ getTarget() }}</p>
                  </div>
                </div>
                <button 
                  (click)="openSecondInningsModal()"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Start Second Innings
                </button>
              </div>
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

              <!-- Playing XI -->
              <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="font-semibold text-gray-800">Playing XI</h3>
                  <button 
                    (click)="openSubstituteModal()"
                    class="text-sm text-blue-600 hover:text-blue-800"
                  >
                    🔄 Substitute
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <!-- Team 1 -->
                  <div>
                    <h4 class="text-sm font-medium text-gray-600 mb-2 pb-1 border-b">
                      {{ match.team1?.name }}
                      @if (isTeam1Batting()) {
                        <span class="text-green-600 text-xs ml-1">(Batting)</span>
                      } @else {
                        <span class="text-blue-600 text-xs ml-1">(Bowling)</span>
                      }
                    </h4>
                    <div class="space-y-1">
                      @for (player of getTeam1PlayingXI(); track getPlayerId(player); let i = $index) {
                        <div 
                          class="flex items-center gap-2 text-sm py-1 px-2 rounded"
                          [class.bg-green-50]="isPlayerOnField(player, 'team1')"
                          [class.bg-red-50]="isPlayerOut(player)"
                        >
                          <span class="text-gray-400 text-xs w-4">{{ player.battingOrder || (i + 1) }}</span>
                          <span 
                            class="flex-1 truncate"
                            [class.font-medium]="isPlayerOnField(player, 'team1')"
                            [class.text-green-700]="isPlayerOnField(player, 'team1')"
                            [class.text-red-400]="isPlayerOut(player)"
                            [class.line-through]="isPlayerOut(player)"
                          >
                            {{ getSquadPlayerName(player) }}
                          </span>
                          @if (isStriker(player)) {
                            <span class="text-green-600 text-xs font-medium">striker</span>
                          }
                          @if (isNonStriker(player)) {
                            <span class="text-gray-500 text-xs">non-striker</span>
                          }
                          @if (isBowling(player)) {
                            <span class="text-blue-600 text-xs font-medium">bowling</span>
                          }
                          @if (isPlayerOut(player)) {
                            <span class="text-red-500 text-xs">out</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  <!-- Team 2 -->
                  <div>
                    <h4 class="text-sm font-medium text-gray-600 mb-2 pb-1 border-b">
                      {{ match.team2?.name }}
                      @if (!isTeam1Batting()) {
                        <span class="text-green-600 text-xs ml-1">(Batting)</span>
                      } @else {
                        <span class="text-blue-600 text-xs ml-1">(Bowling)</span>
                      }
                    </h4>
                    <div class="space-y-1">
                      @for (player of getTeam2PlayingXI(); track getPlayerId(player); let i = $index) {
                        <div 
                          class="flex items-center gap-2 text-sm py-1 px-2 rounded"
                          [class.bg-green-50]="isPlayerOnField(player, 'team2')"
                          [class.bg-red-50]="isPlayerOut(player)"
                        >
                          <span class="text-gray-400 text-xs w-4">{{ player.battingOrder || (i + 1) }}</span>
                          <span 
                            class="flex-1 truncate"
                            [class.font-medium]="isPlayerOnField(player, 'team2')"
                            [class.text-green-700]="isPlayerOnField(player, 'team2')"
                            [class.text-red-400]="isPlayerOut(player)"
                            [class.line-through]="isPlayerOut(player)"
                          >
                            {{ getSquadPlayerName(player) }}
                          </span>
                          @if (isStriker(player)) {
                            <span class="text-green-600 text-xs font-medium">striker</span>
                          }
                          @if (isNonStriker(player)) {
                            <span class="text-gray-500 text-xs">non-striker</span>
                          }
                          @if (isBowling(player)) {
                            <span class="text-blue-600 text-xs font-medium">bowling</span>
                          }
                          @if (isPlayerOut(player)) {
                            <span class="text-red-500 text-xs">out</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
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
                    (click)="openSubstituteModal()"
                    [disabled]="processing"
                    class="w-full h-10 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    🔄 Substitute Player
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
                  <option value="live-score">Live Score</option>
                  <option value="live-match-summary">Live Match Summary</option>
                  <option value="run-rate-graph">Run Rate Graph</option>
                  <option value="current-partnership">Current Partnership</option>
                  <option value="final-match-summary">Final Match Summary</option>
                  <option value="player-stats">Player Stats</option>
                </select>
              </div>

              <!-- Display Overlays -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Display Overlays</h3>
                
                <!-- Third Umpire -->
                <div class="mb-4">
                  <p class="text-sm text-gray-600 mb-2">3rd Umpire Decision</p>
                  <div class="grid grid-cols-3 gap-2">
                    <button 
                      (click)="startThirdUmpire()"
                      [disabled]="thirdUmpireActive"
                      class="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
                    >
                      ⏳ Review
                    </button>
                    <button 
                      (click)="thirdUmpireOut()"
                      [disabled]="!thirdUmpireActive"
                      class="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      OUT
                    </button>
                    <button 
                      (click)="thirdUmpireNotOut()"
                      [disabled]="!thirdUmpireActive"
                      class="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      NOT OUT
                    </button>
                  </div>
                </div>
                
                <!-- Custom Message -->
                <div>
                  <p class="text-sm text-gray-600 mb-2">Custom Message</p>
                  <div class="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      [(ngModel)]="customMessageText"
                      placeholder="Enter message..."
                      class="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      (click)="showCustomMessage()"
                      [disabled]="!customMessageText"
                      class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      📢 Show
                    </button>
                    <button 
                      (click)="dismissCustomMessage()"
                      class="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                    >
                      ✖ Dismiss
                    </button>
                  </div>
                </div>
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
                      <option [value]="getPlayerId(player)">
                        #{{ player.battingOrder }} - {{ getSquadPlayerName(player) }}
                      </option>
                    }
                  </select>
                  <p class="text-xs text-gray-500 mt-1">Sorted by batting order (auto-selected next in line)</p>
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
                      #{{ player.battingOrder }} - {{ getSquadPlayerName(player) }}
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
                      #{{ player.battingOrder }} - {{ getSquadPlayerName(player) }}
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

      <!-- Substitute Player Modal -->
      @if (activeModal === 'substitute') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Substitute Player</h3>
            </div>
            <div class="p-4 space-y-4">
              <p class="text-sm text-gray-500">Replace a player in the playing XI with another player from the country.</p>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Team</label>
                <select 
                  [(ngModel)]="substituteForm.team"
                  (change)="onSubstituteTeamChange()"
                  class="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Team</option>
                  <option value="team1">{{ match?.team1?.name }}</option>
                  <option value="team2">{{ match?.team2?.name }}</option>
                </select>
              </div>

              @if (substituteForm.team) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Player Out</label>
                  <select 
                    [(ngModel)]="substituteForm.playerOut"
                    (change)="onPlayerOutChange()"
                    class="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Player to Replace</option>
                    @for (player of getPlayingXIForTeam(substituteForm.team); track getPlayerId(player)) {
                      <option [value]="getPlayerId(player)">
                        {{ getSquadPlayerName(player) }}
                      </option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Player In</label>
                  @if (loadingSubstitutes) {
                    <div class="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500">
                      Loading available players...
                    </div>
                  } @else {
                    <select 
                      [(ngModel)]="substituteForm.playerIn"
                      class="w-full px-3 py-2 border rounded-lg"
                      [disabled]="!substituteForm.playerOut"
                    >
                      <option value="">Select Replacement Player</option>
                      @for (player of availableSubstitutes; track player._id) {
                        <option [value]="player._id">
                          {{ player.name }}
                        </option>
                      }
                    </select>
                    @if (availableSubstitutes.length === 0 && substituteForm.team) {
                      <p class="text-xs text-orange-600 mt-1">No other players available from this country</p>
                    }
                  }
                </div>
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
                (click)="confirmSubstitute()"
                [disabled]="processing || !substituteForm.team || !substituteForm.playerOut || !substituteForm.playerIn"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ processing ? 'Substituting...' : 'Confirm Substitute' }}
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

      <!-- Player Stats Selection Modal -->
      @if (activeModal === 'playerStats') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Select Player for Stats Display</h3>
            </div>
            <div class="p-4">
              <p class="text-sm text-gray-500 mb-4">Choose a player to display their stats on the display screen</p>
              
              <!-- Team 1 Players -->
              <div class="mb-4">
                <h4 class="font-medium text-gray-700 mb-2">{{ match?.team1?.name }}</h4>
                <div class="grid grid-cols-2 gap-2">
                  @for (player of getAllTeam1Players(); track getPlayerId(player)) {
                    <button 
                      (click)="selectPlayerForStats(getPlayerId(player))"
                      class="p-2 rounded-lg border text-left text-sm hover:bg-gray-50"
                      [class.border-blue-500]="selectedPlayerForStats === getPlayerId(player)"
                      [class.bg-blue-50]="selectedPlayerForStats === getPlayerId(player)"
                    >
                      <span class="font-medium">{{ getSquadPlayerName(player) }}</span>
                      <span class="text-xs text-gray-500 block">{{ getPlayerRole(player) }}</span>
                    </button>
                  }
                </div>
              </div>
              
              <!-- Team 2 Players -->
              <div>
                <h4 class="font-medium text-gray-700 mb-2">{{ match?.team2?.name }}</h4>
                <div class="grid grid-cols-2 gap-2">
                  @for (player of getAllTeam2Players(); track getPlayerId(player)) {
                    <button 
                      (click)="selectPlayerForStats(getPlayerId(player))"
                      class="p-2 rounded-lg border text-left text-sm hover:bg-gray-50"
                      [class.border-blue-500]="selectedPlayerForStats === getPlayerId(player)"
                      [class.bg-blue-50]="selectedPlayerForStats === getPlayerId(player)"
                    >
                      <span class="font-medium">{{ getSquadPlayerName(player) }}</span>
                      <span class="text-xs text-gray-500 block">{{ getPlayerRole(player) }}</span>
                    </button>
                  }
                </div>
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
                (click)="confirmPlayerStatsSelection()"
                [disabled]="processing || !selectedPlayerForStats"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ processing ? 'Saving...' : 'Show Player Stats' }}
              </button>
            </div>
          </div>
        </div>
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
  displayView = 'live-score';

  activeModal: ModalType = 'none';

  // Wicket form
  wicketForm = {
    type: '' as string,
    fielder: '',
    runs: 0,
    newBatsman: ''
  };
  wicketError = '';

  // Substitute form
  substituteForm = {
    team: '' as 'team1' | 'team2' | '',
    playerOut: '',
    playerIn: ''
  };
  availableSubstitutes: Player[] = [];
  loadingSubstitutes = false;

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

  // Display overlay controls
  thirdUmpireActive = false;
  customMessageText = '';

  // SSE connection
  private eventSource: EventSource | null = null;
  isDisplayConnected = true;
  private reconnectAttempts = 0;
  private lastHeartbeat = Date.now();
  private heartbeatCheckInterval: any = null;

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
    private scoringService: ScoringService,
    private playerService: PlayerService
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
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
    }
  }

  loadMatch() {
    this.loading = true;
    this.matchService.getById(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'live-score';
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
            this.displayView = this.match.displayView || 'live-score';
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
    
    // Track connection state
    this.eventSource.addEventListener('connected', () => {
      this.isDisplayConnected = true;
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      this.startHeartbeatCheck();
    });
    
    // Handle heartbeat
    this.eventSource.addEventListener('heartbeat', () => {
      this.lastHeartbeat = Date.now();
      this.isDisplayConnected = true;
    });

    this.eventSource.addEventListener('match-state', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('score-update', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('wicket', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('over-complete', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('innings-complete', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch().then(() => {
        if (this.match && 
            this.match.currentInnings === 0 && 
            this.match.innings && 
            this.match.innings[0]?.status === 'completed' &&
            this.match.status === 'live') {
          this.prepareSecondInningsModal();
          this.activeModal = 'secondInnings';
        }
      });
    });

    this.eventSource.addEventListener('innings-start', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('match-complete', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('batsmen-change', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.addEventListener('bowler-change', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    this.eventSource.onerror = () => {
      this.isDisplayConnected = false;
      this.scheduleReconnect();
    };
  }
  
  private startHeartbeatCheck() {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
    }
    
    // Check every 45 seconds if we've received a heartbeat (server sends every 30s)
    this.heartbeatCheckInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      // If no heartbeat for 60 seconds, connection is likely dead
      if (timeSinceLastHeartbeat > 60000) {
        this.isDisplayConnected = false;
        this.disconnectSSE();
        this.scheduleReconnect();
      }
    }, 45000);
  }
  
  private scheduleReconnect() {
    if (this.reconnectAttempts >= 10) {
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.reloadMatch();
      this.connectSSE();
    }, delay);
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
    const playingXI = squad?.filter((p: any) => p.isPlayingXI) || [];
    // Sort by batting order
    return playingXI.sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
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
      
      // Auto-select next batsman based on batting order
      if (!this.isLastWicket()) {
        const availableBatsmen = this.getAvailableBatsmen();
        if (availableBatsmen.length > 0) {
          // Sort by batting order and pick the first one
          const sortedAvailable = [...availableBatsmen].sort((a, b) => 
            (a.battingOrder || 99) - (b.battingOrder || 99)
          );
          const nextBatsman = sortedAvailable[0];
          if (nextBatsman) {
            this.wicketForm.newBatsman = this.getPlayerId(nextBatsman);
          }
        }
      }
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

  // Substitute player methods
  openSubstituteModal(): void {
    this.substituteForm = { team: '', playerOut: '', playerIn: '' };
    this.availableSubstitutes = [];
    this.activeModal = 'substitute';
  }

  onSubstituteTeamChange(): void {
    this.substituteForm.playerOut = '';
    this.substituteForm.playerIn = '';
    this.availableSubstitutes = [];
    
    if (this.substituteForm.team) {
      this.loadAvailableSubstitutes();
    }
  }

  onPlayerOutChange(): void {
    this.substituteForm.playerIn = '';
  }

  loadAvailableSubstitutes(): void {
    const countryId = this.substituteForm.team === 'team1' 
      ? (this.match?.team1?._id || '') 
      : (this.match?.team2?._id || '');
    
    if (!countryId) {
      this.availableSubstitutes = [];
      return;
    }

    this.loadingSubstitutes = true;
    this.playerService.getAll({ country: countryId, isActive: true }).subscribe({
      next: (response) => {
        if (response.success) {
          // Filter out players already in the squad
          const squad = this.getSquadForTeam(this.substituteForm.team);
          const squadPlayerIds = squad.map((p: any) => this.getPlayerId(p));
          this.availableSubstitutes = response.data
            .filter((player: Player) => !squadPlayerIds.includes(player._id))
            .sort((a: Player, b: Player) => a.name.localeCompare(b.name));
        }
        this.loadingSubstitutes = false;
      },
      error: () => {
        this.availableSubstitutes = [];
        this.loadingSubstitutes = false;
      }
    });
  }

  getSquadForTeam(team: 'team1' | 'team2' | ''): any[] {
    if (!this.match || !team) return [];
    const squad = team === 'team1' ? this.match.squads?.team1 : this.match.squads?.team2;
    return squad || [];
  }

  getPlayingXIForTeam(team: 'team1' | 'team2' | ''): any[] {
    return this.getSquadForTeam(team).filter((p: any) => p.isPlayingXI);
  }

  // Playing XI display helpers
  isTeam1Batting(): boolean {
    if (!this.match || !this.currentInnings) return false;
    const battingTeamId = this.currentInnings.battingTeam?._id || this.currentInnings.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    return battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
  }

  getTeam1PlayingXI(): any[] {
    const squad = this.match?.squads?.team1?.filter((p: any) => p.isPlayingXI) || [];
    return squad.sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  getTeam2PlayingXI(): any[] {
    const squad = this.match?.squads?.team2?.filter((p: any) => p.isPlayingXI) || [];
    return squad.sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  isPlayerOnField(player: any, team: 'team1' | 'team2'): boolean {
    const playerId = this.getPlayerId(player);
    if (!playerId || !this.currentInnings) return false;
    
    const isTeam1Batting = this.isTeam1Batting();
    const isBattingTeam = (team === 'team1' && isTeam1Batting) || (team === 'team2' && !isTeam1Batting);
    
    if (isBattingTeam) {
      // Check if player is one of the current batsmen
      const strikerId = this.currentInnings.currentBatsmen?.striker?._id || this.currentInnings.currentBatsmen?.striker;
      const nonStrikerId = this.currentInnings.currentBatsmen?.nonStriker?._id || this.currentInnings.currentBatsmen?.nonStriker;
      return playerId === strikerId?.toString() || playerId === nonStrikerId?.toString();
    } else {
      // Check if player is the current bowler
      const bowlerId = this.currentInnings.currentBowler?._id || this.currentInnings.currentBowler;
      return playerId === bowlerId?.toString();
    }
  }

  isStriker(player: any): boolean {
    const playerId = this.getPlayerId(player);
    if (!playerId || !this.currentInnings) return false;
    const strikerId = this.currentInnings.currentBatsmen?.striker?._id || this.currentInnings.currentBatsmen?.striker;
    return playerId === strikerId?.toString();
  }

  isNonStriker(player: any): boolean {
    const playerId = this.getPlayerId(player);
    if (!playerId || !this.currentInnings) return false;
    const nonStrikerId = this.currentInnings.currentBatsmen?.nonStriker?._id || this.currentInnings.currentBatsmen?.nonStriker;
    return playerId === nonStrikerId?.toString();
  }

  isBowling(player: any): boolean {
    const playerId = this.getPlayerId(player);
    if (!playerId || !this.currentInnings) return false;
    const bowlerId = this.currentInnings.currentBowler?._id || this.currentInnings.currentBowler;
    return playerId === bowlerId?.toString();
  }

  isPlayerOut(player: any): boolean {
    const playerId = this.getPlayerId(player);
    if (!playerId || !this.currentInnings) return false;
    
    // Check if player has a dismissal in batting stats
    const battingStat = this.currentInnings.battingStats?.find((bs: any) => {
      const bsPlayerId = bs.player?._id || bs.player;
      return bsPlayerId === playerId || bsPlayerId?.toString() === playerId;
    });
    
    return battingStat?.dismissal?.type ? true : false;
  }

  confirmSubstitute(): void {
    if (!this.substituteForm.team || !this.substituteForm.playerOut || !this.substituteForm.playerIn) {
      return;
    }

    this.processing = true;
    this.error = '';

    this.matchService.substitutePlayer(this.matchId, {
      team: this.substituteForm.team,
      playerOut: this.substituteForm.playerOut,
      playerIn: this.substituteForm.playerIn
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to substitute player';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to substitute player';
        this.processing = false;
      }
    });
  }

  isFirstInningsCompleteAwaitingSecond(): boolean {
    // Check if first innings is complete but second innings hasn't started
    return this.match?.status === 'live' &&
           this.match?.currentInnings === 0 &&
           this.match?.innings?.[0]?.status === 'completed' &&
           (!this.match?.innings?.[1] || this.match.innings.length === 1);
  }

  getFirstInningsSummary(): string {
    const innings = this.match?.innings?.[0];
    if (!innings) return '';
    const teamName = this.getTeamNameById(innings.battingTeam);
    return `${teamName}: ${innings.totalRuns}/${innings.totalWickets} (${this.getOversDisplayForInnings(innings)})`;
  }

  getTeamNameById(teamId: any): string {
    if (!this.match || !teamId) return 'Unknown';
    const id = teamId._id || teamId;
    const team1Id = this.match.team1?._id || this.match.team1;
    if (id === team1Id || id?.toString() === team1Id?.toString()) {
      return this.match.team1?.name || 'Team 1';
    }
    return this.match.team2?.name || 'Team 2';
  }

  getOversDisplayForInnings(innings: any): string {
    if (!innings) return '0.0';
    const totalBalls = innings.totalBalls || 0;
    return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
  }

  openSecondInningsModal(): void {
    this.prepareSecondInningsModal();
    this.activeModal = 'secondInnings';
  }

  getAvailableBatsmen(): any[] {
    if (!this.currentInnings?.battingStats) return this.battingTeamPlayers;
    const battedPlayerIds = this.currentInnings.battingStats.map((b: any) => {
      const id = b.player?._id || b.player;
      return id?.toString();
    });
    const available = this.battingTeamPlayers.filter((p: any) => {
      const playerId = this.getPlayerId(p);
      return !battedPlayerIds.includes(playerId?.toString());
    });
    // Sort by batting order
    return available.sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
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
    
    // Auto-select openers based on batting order
    const sortedBatsmen = [...this.secondBattingTeamPlayers].sort((a, b) => 
      (a.battingOrder || 99) - (b.battingOrder || 99)
    );
    
    // Pre-select batting order #1 as striker
    const opener1 = sortedBatsmen.find(p => p.battingOrder === 1);
    if (opener1) {
      this.secondInningsForm.striker = this.getPlayerId(opener1);
    }
    
    // Pre-select batting order #2 as non-striker
    const opener2 = sortedBatsmen.find(p => p.battingOrder === 2);
    if (opener2) {
      this.secondInningsForm.nonStriker = this.getPlayerId(opener2);
    }
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
    // If player-stats is selected, open the player selection modal instead of changing view directly
    if (this.displayView === 'player-stats') {
      this.openPlayerStatsModal();
      return;
    }
    
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

  // Display Overlay Controls
  startThirdUmpire() {
    this.thirdUmpireActive = true;
    this.matchService.sendNotification(this.matchId, 'third-umpire-start', {}).subscribe({
      error: (err) => {
        this.error = err.error?.message || 'Failed to start 3rd umpire review';
        this.thirdUmpireActive = false;
      }
    });
  }

  thirdUmpireOut() {
    // Get current striker's info for the OUT decision display
    const striker = this.currentInnings?.currentBatsmen?.striker;
    const strikerStats = this.currentInnings?.battingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      const strikerId = striker?._id || striker;
      return id === strikerId || id?.toString() === strikerId?.toString();
    });
    
    const dismissedData: any = {
      decision: 'out',
      dismissedName: striker?.name || strikerStats?.player?.name || 'Batsman',
      dismissedImage: this.buildPlayerImageUrl(striker?.headshotPath || strikerStats?.player?.headshotPath),
      dismissedRuns: strikerStats?.runs || 0,
      dismissedBalls: strikerStats?.balls || 0
    };
    
    this.matchService.sendNotification(this.matchId, 'third-umpire-decision', dismissedData).subscribe({
      next: () => {
        this.thirdUmpireActive = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send decision';
      }
    });
  }

  thirdUmpireNotOut() {
    this.matchService.sendNotification(this.matchId, 'third-umpire-decision', { decision: 'not-out' }).subscribe({
      next: () => {
        this.thirdUmpireActive = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send decision';
      }
    });
  }

  showCustomMessage() {
    if (!this.customMessageText.trim()) return;
    this.matchService.sendNotification(this.matchId, 'custom-message', { message: this.customMessageText }).subscribe({
      error: (err) => {
        this.error = err.error?.message || 'Failed to show custom message';
      }
    });
  }

  dismissCustomMessage() {
    this.matchService.sendNotification(this.matchId, 'custom-message-dismiss', {}).subscribe({
      next: () => {
        this.customMessageText = '';
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to dismiss message';
      }
    });
  }

  // Helper to build ESPN image URL from headshotPath
  buildPlayerImageUrl(headshotPath: string | undefined): string | null {
    if (!headshotPath) return null;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${headshotPath}`;
  }

  // Player Stats View Selection
  selectedPlayerForStats: string = '';

  openPlayerStatsModal(): void {
    // Pre-select the current player if already set
    this.selectedPlayerForStats = this.match?.selectedPlayerForStats?._id || 
                                   this.match?.selectedPlayerForStats || '';
    this.activeModal = 'playerStats';
  }

  selectPlayerForStats(playerId: string): void {
    this.selectedPlayerForStats = playerId;
  }

  confirmPlayerStatsSelection(): void {
    if (!this.selectedPlayerForStats) return;

    this.processing = true;
    this.error = '';

    // Set display view to player-stats and set the selected player
    this.matchService.setDisplayView(this.matchId, 'player-stats', this.selectedPlayerForStats).subscribe({
      next: (response) => {
        if (response.success) {
          this.displayView = 'player-stats';
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to set player stats view';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to set player stats view';
        this.processing = false;
      }
    });
  }

  getAllTeam1Players(): any[] {
    return this.match?.squads?.team1?.filter((p: any) => p.isPlayingXI) || [];
  }

  getAllTeam2Players(): any[] {
    return this.match?.squads?.team2?.filter((p: any) => p.isPlayingXI) || [];
  }

  getPlayerRole(squadPlayer: any): string {
    const role = squadPlayer?.player?.role;
    if (!role) return '';
    const roleMap: Record<string, string> = {
      'batsman': 'Batsman',
      'bowler': 'Bowler',
      'all-rounder': 'All-Rounder',
      'wicket-keeper': 'WK'
    };
    return roleMap[role] || role;
  }
}
