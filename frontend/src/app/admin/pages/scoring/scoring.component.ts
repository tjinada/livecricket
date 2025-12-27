import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';
import { ScoringService, BallData } from '../../../core/services/scoring.service';
import { PlayerService } from '../../../core/services/player.service';
import { Player } from '../../../core/models';
import { BackgroundSettingsComponent, BackgroundSettings } from '../../components/background-settings/background-settings.component';
import { HighlightSettingsComponent } from '../../components/highlight-settings/highlight-settings.component';

type ModalType = 'none' | 'wicket' | 'extras' | 'changeBowler' | 'endInnings' | 'secondInnings' | 'endMatch' | 'undo' | 'substitute' | 'playerStats' | 'highlightVideo' | 'adjustScore' | 'changeBatsman' | 'adjustBatsman' | 'adjustBowler' | 'manageBatsmen' | 'manageBowlers' | 'editBall';

@Component({
  selector: 'app-scoring',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BackgroundSettingsComponent, HighlightSettingsComponent],
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
              [href]="'/admin/editor/' + matchId" 
              target="_blank"
              class="text-sm text-amber-600 hover:text-amber-800"
              title="Open Match Editor in new window"
            >
              📝 Editor
            </a>
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
      } @else if (match.status === 'completed' && !showFullScoringView) {
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
                <p class="text-xl mb-4">
                  {{ match.result!.winner.name }} won
                  @if (match.result!.winMargin) {
                    <span>by {{ match.result!.winMargin }} {{ match.result!.winType }}</span>
                  }
                </p>
              }
              <!-- Button to go to full scoring view -->
              <button 
                (click)="showFullScoringView = true"
                class="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <span>🏏</span>
                <span>Open Scoring Interface</span>
              </button>
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
              <option value="toss-screen">Toss Result</option>
              <option value="starting-xi-team1">Starting XI - {{ match.team1?.name }}</option>
              <option value="starting-xi-team2">Starting XI - {{ match.team2?.name }}</option>
              <option value="live-score">Live Score</option>
              <option value="player-stats">Player Stats</option>
              <option value="current-partnership">Current Partnership</option>
              <option value="run-rate-graph">Run Rate Graph</option>
              <option value="live-match-summary">Live Match Summary</option>
              <option value="final-match-summary">Final Match Summary</option>
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

          <!-- Highlight Video -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-semibold text-gray-800">🎬 Match Highlights</h3>
              <button 
                (click)="showHighlightSettings = true"
                class="text-sm text-purple-600 hover:text-purple-800"
              >
                ⚙️ Timing Settings
              </button>
            </div>
            <p class="text-sm text-gray-500 mb-3">Play a highlight video of 4s, 6s, wickets, and milestones</p>
            <div class="space-y-2">
              <button 
                (click)="openHighlightVideoModal()"
                class="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium flex items-center justify-center gap-2"
              >
                <span>▶</span>
                <span>Play Highlight Video</span>
              </button>
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

          <!-- Match Editor - View Ball-by-Ball History -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <h3 class="font-semibold text-gray-800 mb-3">📊 Match Details & Ball History</h3>
            <p class="text-sm text-gray-500 mb-3">View detailed ball-by-ball history, over summaries, and player stats</p>
            <div class="flex gap-2">
              <a 
                [routerLink]="['/admin/editor', matchId]"
                class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <span>📝</span>
                <span>Open Match Editor</span>
                <span>→</span>
              </a>
              <button 
                (click)="showFullScoringView = true"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <span>🏏</span>
                <span>View Scoring Details</span>
              </button>
            </div>
          </div>

          <!-- Over History Section (Collapsible) -->
          <div class="bg-white rounded-lg shadow mb-6">
            <button 
              (click)="showCompletedMatchOverHistory = !showCompletedMatchOverHistory"
              class="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-gray-800">📜 Over-by-Over History</h3>
                <span class="text-xs text-gray-500">(Click to {{ showCompletedMatchOverHistory ? 'hide' : 'show' }})</span>
              </div>
              <span class="text-gray-400 text-lg">{{ showCompletedMatchOverHistory ? '▲' : '▼' }}</span>
            </button>
            @if (showCompletedMatchOverHistory) {
              <div class="px-4 pb-4">
                <!-- Innings Selector -->
                <div class="mb-4">
                  <select 
                    [(ngModel)]="selectedCompletedInningsIndex"
                    class="px-3 py-2 border rounded-lg text-sm"
                  >
                    @for (innings of match.innings; track $index) {
                      <option [value]="$index">
                        {{ getTeamNameById(innings.battingTeam) }} - {{ innings.totalRuns }}/{{ innings.totalWickets }} ({{ getOversDisplayForInnings(innings) }} ov)
                      </option>
                    }
                  </select>
                </div>

                <!-- Overs Display -->
                @if (getCompletedMatchOvers().length > 0) {
                  <div class="space-y-3 max-h-96 overflow-y-auto">
                    @for (over of getCompletedMatchOvers(); track $index) {
                      <div class="border rounded-lg p-3 bg-gray-50">
                        <div class="flex justify-between items-center mb-2">
                          <span class="text-sm font-medium text-gray-700">Over {{ over.overNumber || ($index + 1) }}</span>
                          <div class="flex items-center gap-2">
                            <span class="text-xs bg-gray-200 px-2 py-0.5 rounded">{{ over.runs || 0 }} runs</span>
                            @if (over.wickets && over.wickets > 0) {
                              <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{{ over.wickets }}W</span>
                            }
                          </div>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                          @for (ball of over.balls || []; track $index) {
                            <div 
                              class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
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
                              [title]="'Ball ' + ($index + 1) + ': ' + (ball.display || ball.runs || 0)"
                            >
                              {{ ball.display === '0' ? '•' : (ball.display || ball.runs || '•') }}
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-gray-500 text-sm text-center py-4">No over history available for this innings</p>
                }
              </div>
            }
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
      } @else if (match.status !== 'live' && !(match.status === 'completed' && showFullScoringView)) {
        <div class="flex items-center justify-center h-64 flex-col gap-4">
          <p class="text-gray-500">Match is not live</p>
          <a routerLink="/admin/matches" class="text-green-600 hover:text-green-800">
            Go to Matches
          </a>
        </div>
      } @else {
        <div class="max-w-7xl mx-auto px-4 py-6">
          <!-- Match Completed Banner (shown when continuing to edit a completed match) -->
          @if (match.status === 'completed') {
            <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow p-4 mb-6 flex items-center justify-between">
              <div class="flex items-center gap-3 text-white">
                <span class="text-2xl">🏆</span>
                <div>
                  <p class="font-semibold">Match Completed</p>
                  @if (match.result?.winner) {
                    <p class="text-green-200 text-sm">{{ match.result!.winner.name }} won by {{ match.result!.winMargin }} {{ match.result!.winType }}</p>
                  }
                </div>
              </div>
              <button 
                (click)="showFullScoringView = false"
                class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
              >
                View Match Summary
              </button>
            </div>
          }

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
                <!-- Manual Innings Selector -->
                @if (match.innings && match.innings.length > 1) {
                  <div class="flex items-center gap-2 mb-1">
                    <label class="text-xs text-gray-400">View:</label>
                    <select 
                      [(ngModel)]="viewInningsIndex"
                      class="text-sm px-2 py-1 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-green-500"
                    >
                      @for (inn of match.innings; track $index) {
                        <option [value]="$index">
                          {{ $index === 0 ? '1st' : '2nd' }} Inn - {{ getTeamNameById(inn.battingTeam) }}
                          @if ($index === match.currentInnings) { (Live) }
                        </option>
                      }
                    </select>
                    @if (viewInningsIndex !== match.currentInnings) {
                      <button 
                        (click)="viewInningsIndex = match.currentInnings ?? 0"
                        class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        ↩ Back to Live
                      </button>
                    }
                  </div>
                }
                <p class="text-sm text-gray-500">
                  {{ getViewingBattingTeamName() }} Innings
                  @if (viewInningsIndex !== match.currentInnings) {
                    <span class="text-amber-600">(viewing)</span>
                  }
                </p>
                @if (viewingInnings && match.currentInnings === 1 && viewInningsIndex === 1) {
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
                    <div class="flex items-center gap-3">
                      <p class="text-5xl font-bold">
                        {{ currentInnings?.totalRuns || 0 }}/{{ currentInnings?.totalWickets || 0 }}
                      </p>
                      <button 
                        (click)="openAdjustScoreModal()"
                        [disabled]="processing"
                        class="px-3 py-1.5 bg-white/30 hover:bg-white/40 rounded-lg disabled:opacity-50 transition-colors text-white text-sm font-medium"
                        title="Adjust Score"
                      >
                        Edit
                      </button>
                    </div>
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
                  @if (strikerStats && nonStrikerStats) {
                    <button 
                      (click)="swapBatsmen()"
                      [disabled]="processing"
                      class="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                    >
                      ⇄ Swap Strike
                    </button>
                  }
                </div>
                <div class="divide-y">
                  <!-- Striker -->
                  <div class="p-4" [class.bg-green-50]="strikerStats">
                    <div class="flex items-center gap-3">
                      <span class="font-bold" [class.text-green-600]="strikerStats" [class.text-yellow-600]="!strikerStats">*</span>
                      <div class="flex-1">
                        <label class="text-xs text-gray-500 mb-1 block">Striker</label>
                        <select 
                          [ngModel]="getCurrentStrikerId()"
                          (ngModelChange)="changeStriker($event)"
                          [disabled]="processing"
                          class="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          [class.border-yellow-300]="!strikerStats"
                          [class.border-gray-300]="strikerStats"
                        >
                          <option value="">-- Select Striker --</option>
                          @for (player of getBatsmenOptionsForDropdown('striker'); track player.id) {
                            <option 
                              [value]="player.id"
                              [disabled]="player.isOut"
                            >
                              {{ player.displayText }}
                            </option>
                          }
                        </select>
                      </div>
                      @if (strikerStats) {
                        <div class="text-right">
                          <p class="text-xl font-bold text-gray-800">
                            {{ strikerStats.runs || 0 }}<span class="text-sm text-gray-500">({{ strikerStats.balls || 0 }})</span>
                          </p>
                          <p class="text-xs text-gray-500">
                            4s: {{ strikerStats.fours || 0 }} | 6s: {{ strikerStats.sixes || 0 }} | SR: {{ getStrikeRate(strikerStats) }}
                          </p>
                        </div>
                        <button 
                          (click)="openAdjustBatsmanModal(currentInnings?.currentBatsmen?.striker?._id || currentInnings?.currentBatsmen?.striker)"
                          class="p-1 text-gray-400 hover:text-gray-600"
                          title="Adjust stats"
                        >
                          ✏️
                        </button>
                      }
                    </div>
                  </div>
                  <!-- Non-Striker -->
                  <div class="p-4" [class.bg-gray-50]="nonStrikerStats">
                    <div class="flex items-center gap-3">
                      <span [class.text-gray-400]="nonStrikerStats" [class.text-yellow-600]="!nonStrikerStats">○</span>
                      <div class="flex-1">
                        <label class="text-xs text-gray-500 mb-1 block">Non-Striker</label>
                        <select 
                          [ngModel]="getCurrentNonStrikerId()"
                          (ngModelChange)="changeNonStriker($event)"
                          [disabled]="processing"
                          class="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          [class.border-yellow-300]="!nonStrikerStats"
                          [class.border-gray-300]="nonStrikerStats"
                        >
                          <option value="">-- Select Non-Striker --</option>
                          @for (player of getBatsmenOptionsForDropdown('nonStriker'); track player.id) {
                            <option 
                              [value]="player.id"
                              [disabled]="player.isOut"
                            >
                              {{ player.displayText }}
                            </option>
                          }
                        </select>
                      </div>
                      @if (nonStrikerStats) {
                        <div class="text-right">
                          <p class="text-xl font-bold text-gray-800">
                            {{ nonStrikerStats.runs || 0 }}<span class="text-sm text-gray-500">({{ nonStrikerStats.balls || 0 }})</span>
                          </p>
                          <p class="text-xs text-gray-500">
                            4s: {{ nonStrikerStats.fours || 0 }} | 6s: {{ nonStrikerStats.sixes || 0 }} | SR: {{ getStrikeRate(nonStrikerStats) }}
                          </p>
                        </div>
                        <button 
                          (click)="openAdjustBatsmanModal(currentInnings?.currentBatsmen?.nonStriker?._id || currentInnings?.currentBatsmen?.nonStriker)"
                          class="p-1 text-gray-400 hover:text-gray-600"
                          title="Adjust stats"
                        >
                          ✏️
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Current Bowler -->
              <div class="bg-white rounded-lg shadow">
                <div class="p-4 border-b flex justify-between items-center">
                  <h3 class="font-semibold text-gray-800">Bowler</h3>
                </div>
                <div class="p-4" [class.bg-yellow-50]="!currentBowlerStats">
                  <div class="flex items-center gap-3">
                    <span class="text-lg" [class.text-green-600]="currentBowlerStats" [class.text-yellow-600]="!currentBowlerStats">🎯</span>
                    <div class="flex-1">
                      <label class="text-xs text-gray-500 mb-1 block">Bowler</label>
                      <select 
                        [ngModel]="getCurrentBowlerId()"
                        (ngModelChange)="changeBowlerInline($event)"
                        [disabled]="processing"
                        class="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        [class.border-yellow-300]="!currentBowlerStats"
                        [class.border-gray-300]="currentBowlerStats"
                      >
                        <option value="">-- Select Bowler --</option>
                        @for (player of getBowlerOptionsForDropdown(); track player.id) {
                          <option 
                            [value]="player.id"
                            [disabled]="player.isBowledLastOver"
                          >
                            {{ player.displayText }}
                          </option>
                        }
                      </select>
                    </div>
                    @if (currentBowlerStats) {
                      <div class="text-right">
                        <p class="text-lg font-bold text-gray-800">
                          {{ currentBowlerStats.wickets || 0 }}-{{ currentBowlerStats.runs || 0 }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{ getBowlerOvers(currentBowlerStats) }} ov | M: {{ currentBowlerStats.maidens || 0 }} | Econ: {{ getEconomy(currentBowlerStats) }}
                        </p>
                      </div>
                      <button 
                        (click)="openAdjustBowlerModal(currentInnings?.currentBowler?._id || currentInnings?.currentBowler)"
                        class="p-1 text-gray-400 hover:text-gray-600"
                        title="Adjust stats"
                      >
                        ✏️
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- This Over -->
              <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="font-semibold text-gray-800">This Over</h3>
                  <span class="text-xs text-gray-400">Click ball to edit</span>
                </div>
                <div class="flex gap-2 flex-wrap">
                  @for (ball of currentInnings?.currentOver || []; track $index) {
                    <button 
                      (click)="openEditBallModal($index)"
                      class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all"
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
                      title="Ball {{ $index + 1 }}: {{ ball.display }} - Click to edit"
                    >
                      {{ ball.display === '0' ? '•' : ball.display }}
                    </button>
                  }
                  @for (i of getRemainingBalls(); track i) {
                    <div class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">
                      -
                    </div>
                  }
                </div>
              </div>

              <!-- Recent Overs (collapsible, last 5 overs) -->
              @if (getRecentOvers().length > 0) {
                <div class="bg-white rounded-lg shadow">
                  <button 
                    (click)="showRecentOvers = !showRecentOvers"
                    class="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold text-gray-800">Recent Overs</h3>
                      <span class="text-xs text-gray-500">(Last {{ getRecentOvers().length }})</span>
                    </div>
                    <span class="text-gray-400">{{ showRecentOvers ? '▲' : '▼' }}</span>
                  </button>
                  @if (showRecentOvers) {
                    <div class="px-4 pb-4 space-y-3">
                      <p class="text-xs text-gray-400">Click any ball to edit</p>
                      @for (over of getRecentOvers(); track over.overIndex) {
                        <div class="border rounded-lg p-3 bg-gray-50">
                          <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-medium text-gray-700">Over {{ over.overNumber }}</span>
                            <div class="flex items-center gap-2">
                              <span class="text-xs bg-gray-200 px-2 py-0.5 rounded">{{ over.runs }} runs</span>
                              @if (over.wickets > 0) {
                                <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{{ over.wickets }}W</span>
                              }
                            </div>
                          </div>
                          <div class="flex gap-2 flex-wrap">
                            @for (ball of over.balls; track $index) {
                              <button 
                                (click)="openEditCompletedOverBallModal(over.overIndex, $index)"
                                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all"
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
                                title="Ball {{ $index + 1 }}: {{ ball.display }} - Click to edit"
                              >
                                {{ ball.display === '0' ? '•' : ball.display }}
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Playing XI & Reserves -->
              <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="font-semibold text-gray-800">Playing XI</h3>
                  <button 
                    (click)="openSubstituteModal()"
                    class="text-sm text-blue-600 hover:text-blue-800"
                    [class.opacity-50]="!hasReserves()"
                    [disabled]="!hasReserves()"
                    [title]="hasReserves() ? 'Substitute player from reserves' : 'No reserves available'"
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
                    <!-- Team 1 Reserves -->
                    @if (getTeam1Reserves().length > 0) {
                      <div class="mt-3 pt-2 border-t border-dashed border-orange-200">
                        <h5 class="text-xs font-medium text-orange-600 mb-1">Reserves</h5>
                        <div class="space-y-1">
                          @for (player of getTeam1Reserves(); track getPlayerId(player)) {
                            <div class="flex items-center gap-2 text-sm py-1 px-2 rounded bg-orange-50/50">
                              <span class="text-orange-400 text-xs w-4">{{ player.battingOrder }}</span>
                              <span class="flex-1 truncate text-orange-700">{{ getSquadPlayerName(player) }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
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
                    <!-- Team 2 Reserves -->
                    @if (getTeam2Reserves().length > 0) {
                      <div class="mt-3 pt-2 border-t border-dashed border-orange-200">
                        <h5 class="text-xs font-medium text-orange-600 mb-1">Reserves</h5>
                        <div class="space-y-1">
                          @for (player of getTeam2Reserves(); track getPlayerId(player)) {
                            <div class="flex items-center gap-2 text-sm py-1 px-2 rounded bg-orange-50/50">
                              <span class="text-orange-400 text-xs w-4">{{ player.battingOrder }}</span>
                              <span class="flex-1 truncate text-orange-700">{{ getSquadPlayerName(player) }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
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
                    (click)="openManageBatsmenModal()"
                    [disabled]="processing"
                    class="w-full h-10 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    🏏 Manage All Batsmen
                  </button>
                  <button 
                    (click)="openManageBowlersModal()"
                    [disabled]="processing"
                    class="w-full h-10 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    🎯 Manage All Bowlers
                  </button>
                  <button 
                    (click)="forceNewOver()"
                    [disabled]="processing || needsBowler"
                    class="w-full h-10 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium disabled:opacity-50"
                    title="End the current over early and start a new one"
                  >
                    ⏭️ Force New Over
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
                  <option value="toss-screen">Toss Result</option>
                  <option value="starting-xi-team1">Starting XI - {{ match.team1?.name }}</option>
                  <option value="starting-xi-team2">Starting XI - {{ match.team2?.name }}</option>
                  <option value="live-score">Live Score</option>
                  <option value="player-stats">Player Stats</option>
                  <option value="current-partnership">Current Partnership</option>
                  <option value="run-rate-graph">Run Rate Graph</option>
                  <option value="live-match-summary">Live Match Summary</option>
                  <option value="final-match-summary">Final Match Summary</option>
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

              <!-- Match Highlights -->
              <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="font-semibold text-gray-800">🎬 Match Highlights</h3>
                  <button 
                    (click)="showHighlightSettings = true"
                    class="text-sm text-purple-600 hover:text-purple-800"
                  >
                    ⚙️ Timing
                  </button>
                </div>
                <p class="text-xs text-gray-500 mb-3">Play highlights up to current score</p>
                <button 
                  (click)="openHighlightVideoModal()"
                  class="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <span>▶</span>
                  <span>Play Highlights</span>
                </button>
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
              <p class="text-sm text-gray-500">Replace a player in the Playing XI with a reserve player.</p>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Team</label>
                <select 
                  [(ngModel)]="substituteForm.team"
                  (change)="onSubstituteTeamChange()"
                  class="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Team</option>
                  @if (getTeam1Reserves().length > 0) {
                    <option value="team1">{{ match?.team1?.name }} ({{ getTeam1Reserves().length }} reserves)</option>
                  }
                  @if (getTeam2Reserves().length > 0) {
                    <option value="team2">{{ match?.team2?.name }} ({{ getTeam2Reserves().length }} reserves)</option>
                  }
                </select>
              </div>

              @if (substituteForm.team) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Player Out (from Playing XI)</label>
                  <select 
                    [(ngModel)]="substituteForm.playerOut"
                    (change)="onPlayerOutChange()"
                    class="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Player to Replace</option>
                    @for (player of getPlayingXIForTeam(substituteForm.team); track getPlayerId(player)) {
                      <option [value]="getPlayerId(player)">
                        #{{ player.battingOrder }} - {{ getSquadPlayerName(player) }}
                      </option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Player In (from Reserves)</label>
                  <select 
                    [(ngModel)]="substituteForm.playerIn"
                    class="w-full px-3 py-2 border rounded-lg"
                    [disabled]="!substituteForm.playerOut"
                  >
                    <option value="">Select Reserve Player</option>
                    @for (player of getReservesForTeam(substituteForm.team); track getPlayerId(player)) {
                      <option [value]="getPlayerId(player)">
                        #{{ player.battingOrder }} - {{ getSquadPlayerName(player) }}
                      </option>
                    }
                  </select>
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

      <!-- Highlight Settings Modal -->
      @if (showHighlightSettings) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 class="text-lg font-semibold">⚙️ Highlight Timing Settings</h3>
              <button 
                (click)="showHighlightSettings = false"
                class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div class="p-4">
              <app-highlight-settings></app-highlight-settings>
            </div>
          </div>
        </div>
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
                <div class="space-y-1">
                  @for (player of getAllTeam1Players(); track getPlayerId(player)) {
                    <button 
                      (click)="selectPlayerForStats(getPlayerId(player))"
                      class="w-full p-2 rounded-lg border text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                      [class.border-blue-500]="selectedPlayerForStats === getPlayerId(player)"
                      [class.bg-blue-50]="selectedPlayerForStats === getPlayerId(player)"
                    >
                      <div>
                        <span class="font-medium">{{ getSquadPlayerName(player) }}</span>
                        <span class="text-xs text-gray-500 ml-2">{{ getPlayerRole(player) }}</span>
                      </div>
                      <div class="flex gap-2 text-xs">
                        @if (getPlayerBattingStatsDisplay(getPlayerId(player))) {
                          <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            🏏 {{ getPlayerBattingStatsDisplay(getPlayerId(player)) }}
                          </span>
                        }
                        @if (getPlayerBowlingStatsDisplay(getPlayerId(player))) {
                          <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            ⚾ {{ getPlayerBowlingStatsDisplay(getPlayerId(player)) }}
                          </span>
                        }
                        @if (!getPlayerBattingStatsDisplay(getPlayerId(player)) && !getPlayerBowlingStatsDisplay(getPlayerId(player))) {
                          <span class="text-gray-400">No stats yet</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              </div>
              
              <!-- Team 2 Players -->
              <div>
                <h4 class="font-medium text-gray-700 mb-2">{{ match?.team2?.name }}</h4>
                <div class="space-y-1">
                  @for (player of getAllTeam2Players(); track getPlayerId(player)) {
                    <button 
                      (click)="selectPlayerForStats(getPlayerId(player))"
                      class="w-full p-2 rounded-lg border text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                      [class.border-blue-500]="selectedPlayerForStats === getPlayerId(player)"
                      [class.bg-blue-50]="selectedPlayerForStats === getPlayerId(player)"
                    >
                      <div>
                        <span class="font-medium">{{ getSquadPlayerName(player) }}</span>
                        <span class="text-xs text-gray-500 ml-2">{{ getPlayerRole(player) }}</span>
                      </div>
                      <div class="flex gap-2 text-xs">
                        @if (getPlayerBattingStatsDisplay(getPlayerId(player))) {
                          <span class="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            🏏 {{ getPlayerBattingStatsDisplay(getPlayerId(player)) }}
                          </span>
                        }
                        @if (getPlayerBowlingStatsDisplay(getPlayerId(player))) {
                          <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            ⚾ {{ getPlayerBowlingStatsDisplay(getPlayerId(player)) }}
                          </span>
                        }
                        @if (!getPlayerBattingStatsDisplay(getPlayerId(player)) && !getPlayerBowlingStatsDisplay(getPlayerId(player))) {
                          <span class="text-gray-400">No stats yet</span>
                        }
                      </div>
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

      <!-- Highlight Video Modal -->
      @if (activeModal === 'highlightVideo') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">🎬 Play Highlight Video</h3>
            </div>
            <div class="p-4 space-y-4">
              <p class="text-sm text-gray-500">Select which highlights to play on the display screen.</p>
              
              <div class="space-y-3">
                @if (match && match.innings && match.innings[0]) {
                  <button 
                    (click)="playHighlightVideo(1)"
                    [disabled]="processing"
                    class="w-full p-4 rounded-lg border-2 text-left hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold text-gray-800">1st Innings Highlights</p>
                        <p class="text-sm text-gray-500">{{ getTeamNameById(match.innings[0].battingTeam) }}: {{ match.innings[0].totalRuns }}/{{ match.innings[0].totalWickets }}</p>
                      </div>
                      <span class="text-purple-600 text-xl">▶</span>
                    </div>
                  </button>
                }
                
                @if (match && match.innings && match.innings[1]) {
                  <button 
                    (click)="playHighlightVideo(2)"
                    [disabled]="processing"
                    class="w-full p-4 rounded-lg border-2 text-left hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold text-gray-800">2nd Innings Highlights</p>
                        <p class="text-sm text-gray-500">{{ getTeamNameById(match.innings[1].battingTeam) }}: {{ match.innings[1].totalRuns }}/{{ match.innings[1].totalWickets }}</p>
                      </div>
                      <span class="text-purple-600 text-xl">▶</span>
                    </div>
                  </button>
                }
                
                @if (match && match.innings && match.innings.length >= 1) {
                  <button 
                    (click)="playHighlightVideo(null)"
                    [disabled]="processing"
                    class="w-full p-4 rounded-lg border-2 border-purple-500 bg-purple-50 text-left hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold text-purple-700">Full Match Highlights</p>
                        <p class="text-sm text-purple-600">All 4s, 6s, wickets, and milestones</p>
                      </div>
                      <span class="text-purple-600 text-xl">▶▶</span>
                    </div>
                  </button>
                }
              </div>
            </div>
            <div class="p-4 border-t flex justify-end">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Adjust Score Modal -->
      @if (activeModal === 'adjustScore') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">✏️ Adjust Score</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p class="text-amber-800 text-sm">
                  Edit the values below to set the correct score.
                </p>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Total Runs</label>
                  <input 
                    type="number" 
                    [(ngModel)]="scoreAdjustForm.runs"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Wickets</label>
                  <input 
                    type="number" 
                    [(ngModel)]="scoreAdjustForm.wickets"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Balls</label>
                  <input 
                    type="number" 
                    [(ngModel)]="scoreAdjustForm.balls"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">Extras</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">Wides</label>
                    <input 
                      type="number" 
                      [(ngModel)]="scoreAdjustForm.extras.wides"
                      class="w-full px-2 py-1 border rounded text-center text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">No Balls</label>
                    <input 
                      type="number" 
                      [(ngModel)]="scoreAdjustForm.extras.noBalls"
                      class="w-full px-2 py-1 border rounded text-center text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">Byes</label>
                    <input 
                      type="number" 
                      [(ngModel)]="scoreAdjustForm.extras.byes"
                      class="w-full px-2 py-1 border rounded text-center text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">Leg Byes</label>
                    <input 
                      type="number" 
                      [(ngModel)]="scoreAdjustForm.extras.legByes"
                      class="w-full px-2 py-1 border rounded text-center text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
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
                (click)="confirmAdjustScore()"
                [disabled]="processing"
                class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {{ processing ? 'Saving...' : 'Save Score' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Change Batsman Modal -->
      @if (activeModal === 'changeBatsman') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">🏏 Change Batsman</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p class="text-indigo-800 text-sm">
                  Replace a current batsman with another player from the batting team.
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Which position to change?</label>
                <div class="grid grid-cols-2 gap-3">
                  <button 
                    (click)="changeBatsmanForm.position = 'striker'"
                    class="p-3 rounded-lg border text-left"
                    [class.border-indigo-500]="changeBatsmanForm.position === 'striker'"
                    [class.bg-indigo-50]="changeBatsmanForm.position === 'striker'"
                  >
                    <p class="font-medium text-gray-800">Striker</p>
                    <p class="text-sm text-gray-500">{{ getPlayerName(currentInnings?.currentBatsmen?.striker) }}</p>
                    <p class="text-xs text-gray-400">{{ strikerStats?.runs || 0 }}({{ strikerStats?.balls || 0 }})</p>
                  </button>
                  <button 
                    (click)="changeBatsmanForm.position = 'nonStriker'"
                    class="p-3 rounded-lg border text-left"
                    [class.border-indigo-500]="changeBatsmanForm.position === 'nonStriker'"
                    [class.bg-indigo-50]="changeBatsmanForm.position === 'nonStriker'"
                  >
                    <p class="font-medium text-gray-800">Non-Striker</p>
                    <p class="text-sm text-gray-500">{{ getPlayerName(currentInnings?.currentBatsmen?.nonStriker) }}</p>
                    <p class="text-xs text-gray-400">{{ nonStrikerStats?.runs || 0 }}({{ nonStrikerStats?.balls || 0 }})</p>
                  </button>
                </div>
              </div>

              @if (changeBatsmanForm.position) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Select New Batsman</label>
                  <select 
                    [(ngModel)]="changeBatsmanForm.newBatsman"
                    class="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Player</option>
                    @for (player of getAvailableBatsmenForChange(); track getPlayerId(player)) {
                      <option [value]="getPlayerId(player)">
                        #{{ player.battingOrder }} - {{ getSquadPlayerName(player) }}
                      </option>
                    }
                  </select>
                  <p class="text-xs text-gray-500 mt-1">Shows players not currently batting and not out</p>
                </div>
              }

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
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
                (click)="confirmChangeBatsman()"
                [disabled]="processing || !changeBatsmanForm.position || !changeBatsmanForm.newBatsman"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {{ processing ? 'Changing...' : 'Change Batsman' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Adjust Batsman Stats Modal -->
      @if (activeModal === 'adjustBatsman') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Adjust {{ adjustBatsmanForm.playerName }}'s Stats</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Runs</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBatsmanForm.runs"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Balls</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBatsmanForm.balls"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Fours</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBatsmanForm.fours"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Sixes</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBatsmanForm.sixes"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
              </div>

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
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
                (click)="confirmAdjustBatsman()"
                [disabled]="processing"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {{ processing ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Adjust Bowler Stats Modal -->
      @if (activeModal === 'adjustBowler') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Adjust {{ adjustBowlerForm.playerName }}'s Stats</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Overs</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.overs"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Balls (0-5)</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.balls"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                    max="5"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Runs</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.runs"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Wickets</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.wickets"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Maidens</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.maidens"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Wides</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.wides"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">No Balls</label>
                  <input 
                    type="number" 
                    [(ngModel)]="adjustBowlerForm.noBalls"
                    class="w-full px-3 py-2 border rounded-lg text-center"
                    min="0"
                  />
                </div>
              </div>

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
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
                (click)="confirmAdjustBowler()"
                [disabled]="processing"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ processing ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Manage All Batsmen Modal -->
      @if (activeModal === 'manageBatsmen') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">🏏 Manage All Batsmen</h3>
            </div>
            <div class="p-4 space-y-4">
              <!-- Innings Tabs -->
              @if (hasInnings(1)) {
                <div class="flex border-b">
                  <button 
                    (click)="selectedManageInnings = 0"
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                    [class.border-purple-600]="selectedManageInnings === 0"
                    [class.text-purple-600]="selectedManageInnings === 0"
                    [class.border-transparent]="selectedManageInnings !== 0"
                    [class.text-gray-500]="selectedManageInnings !== 0"
                  >
                    {{ getInningsLabel(0) }}
                  </button>
                  <button 
                    (click)="selectedManageInnings = 1"
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                    [class.border-purple-600]="selectedManageInnings === 1"
                    [class.text-purple-600]="selectedManageInnings === 1"
                    [class.border-transparent]="selectedManageInnings !== 1"
                    [class.text-gray-500]="selectedManageInnings !== 1"
                  >
                    {{ getInningsLabel(1) }}
                  </button>
                </div>
              }

              <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p class="text-purple-800 text-sm">
                  View all batsmen who have batted. Toggle their out/not-out status or adjust their stats.
                  @if (selectedManageInnings !== match?.currentInnings) {
                    <span class="block mt-1 text-purple-600 font-medium">Viewing completed innings.</span>
                  }
                </p>
              </div>

              @if (getAllBatsmenWithStats().length === 0) {
                <div class="text-center text-gray-500 py-8">
                  <p>No batsmen have batted yet in this innings.</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (batsman of getAllBatsmenWithStats(); track batsman.playerId) {
                    <div 
                      class="p-3 rounded-lg border flex items-center justify-between"
                      [class.bg-red-50]="batsman.isOut"
                      [class.border-red-200]="batsman.isOut"
                      [class.bg-green-50]="!batsman.isOut"
                      [class.border-green-200]="!batsman.isOut"
                    >
                      <div class="flex items-center gap-3">
                        <div>
                          <p class="font-medium text-gray-800">{{ batsman.name }}</p>
                          <p class="text-sm text-gray-500">
                            {{ batsman.runs }} ({{ batsman.balls }}) | 
                            4s: {{ batsman.fours }} | 6s: {{ batsman.sixes }} | 
                            SR: {{ batsman.strikeRate }}
                          </p>
                          @if (batsman.isOut && batsman.dismissalType) {
                            <p class="text-xs text-red-600">
                              {{ formatDismissal(batsman.dismissalType) }}
                            </p>
                          }
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        @if (batsman.isOut) {
                          <button 
                            (click)="toggleDismissal(batsman.playerId, false)"
                            [disabled]="processing"
                            class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark Not Out
                          </button>
                        } @else {
                          <button 
                            (click)="openMarkOutDialog(batsman.playerId, batsman.name)"
                            [disabled]="processing || isCurrentBatsman(batsman.playerId)"
                            class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                            [title]="isCurrentBatsman(batsman.playerId) ? 'Cannot mark current batsman as out here - use wicket button' : 'Mark as out'"
                          >
                            Mark Out
                          </button>
                        }
                        <button 
                          (click)="openAdjustBatsmanModal(batsman.playerId, batsman.inningsIndex)"
                          class="p-1.5 text-gray-400 hover:text-gray-600"
                          title="Adjust stats"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Mark Out Sub-dialog -->
              @if (markOutDialogOpen) {
                <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 class="font-medium text-red-800 mb-3">Mark {{ markOutForm.playerName }} as Out</h4>
                  <div class="space-y-3">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Dismissal Type</label>
                      <div class="grid grid-cols-3 gap-2">
                        @for (type of dismissalTypes; track type.value) {
                          <button 
                            (click)="markOutForm.type = type.value"
                            class="p-2 rounded-lg border text-xs font-medium transition-all"
                            [class.border-red-500]="markOutForm.type === type.value"
                            [class.bg-red-100]="markOutForm.type === type.value"
                            [class.text-red-700]="markOutForm.type === type.value"
                          >
                            {{ type.label }}
                          </button>
                        }
                      </div>
                    </div>
                    @if (['caught', 'stumped'].includes(markOutForm.type)) {
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fielder (optional)</label>
                        <select 
                          [(ngModel)]="markOutForm.fielderId"
                          class="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">Select Fielder</option>
                          @for (player of bowlingTeamPlayers; track getPlayerId(player)) {
                            <option [value]="getPlayerId(player)">{{ getSquadPlayerName(player) }}</option>
                          }
                        </select>
                      </div>
                    }
                    <div class="flex gap-2 justify-end">
                      <button 
                        (click)="closeMarkOutDialog()"
                        class="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        (click)="confirmMarkOut()"
                        [disabled]="processing || !markOutForm.type"
                        class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {{ processing ? 'Saving...' : 'Confirm Out' }}
                      </button>
                    </div>
                  </div>
                </div>
              }

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
              }
            </div>
            <div class="p-4 border-t flex justify-end">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Manage All Bowlers Modal -->
      @if (activeModal === 'manageBowlers') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">🎯 Manage All Bowlers</h3>
            </div>
            <div class="p-4 space-y-4">
              <!-- Innings Tabs -->
              @if (hasInnings(1)) {
                <div class="flex border-b">
                  <button 
                    (click)="selectedManageInnings = 0"
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                    [class.border-indigo-600]="selectedManageInnings === 0"
                    [class.text-indigo-600]="selectedManageInnings === 0"
                    [class.border-transparent]="selectedManageInnings !== 0"
                    [class.text-gray-500]="selectedManageInnings !== 0"
                  >
                    {{ getInningsLabel(0) }}
                  </button>
                  <button 
                    (click)="selectedManageInnings = 1"
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                    [class.border-indigo-600]="selectedManageInnings === 1"
                    [class.text-indigo-600]="selectedManageInnings === 1"
                    [class.border-transparent]="selectedManageInnings !== 1"
                    [class.text-gray-500]="selectedManageInnings !== 1"
                  >
                    {{ getInningsLabel(1) }}
                  </button>
                </div>
              }

              <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p class="text-indigo-800 text-sm">
                  View all bowlers who have bowled. Adjust their stats as needed.
                  @if (selectedManageInnings !== match?.currentInnings) {
                    <span class="block mt-1 text-indigo-600 font-medium">Viewing completed innings.</span>
                  }
                </p>
              </div>

              @if (getAllBowlersWithStats().length === 0) {
                <div class="text-center text-gray-500 py-8">
                  <p>No bowlers have bowled yet in this innings.</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (bowler of getAllBowlersWithStats(); track bowler.playerId) {
                    <div 
                      class="p-3 rounded-lg border flex items-center justify-between"
                      [class.bg-blue-50]="isCurrentBowler(bowler.playerId)"
                      [class.border-blue-300]="isCurrentBowler(bowler.playerId)"
                      [class.bg-gray-50]="!isCurrentBowler(bowler.playerId)"
                      [class.border-gray-200]="!isCurrentBowler(bowler.playerId)"
                    >
                      <div class="flex items-center gap-3">
                        <div>
                          <p class="font-medium text-gray-800">
                            {{ bowler.name }}
                            @if (isCurrentBowler(bowler.playerId)) {
                              <span class="text-xs text-blue-600 ml-1">(bowling)</span>
                            }
                          </p>
                          <p class="text-sm text-gray-500">
                            {{ bowler.overs }}.{{ bowler.balls }} - {{ bowler.wickets }}/{{ bowler.runs }} | 
                            M: {{ bowler.maidens }} | Econ: {{ bowler.economy }}
                          </p>
                          <p class="text-xs text-gray-400">
                            Wd: {{ bowler.wides }} | Nb: {{ bowler.noBalls }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button 
                          (click)="openAdjustBowlerModal(bowler.playerId, bowler.inningsIndex)"
                          class="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
              }
            </div>
            <div class="p-4 border-t flex justify-end">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Edit Ball Modal -->
      @if (activeModal === 'editBall') {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">
                Edit Ball {{ editBallForm.ballIndex + 1 }}
                @if (editBallForm.overIndex >= 0) {
                  <span class="text-sm font-normal text-gray-500">(Over {{ editBallForm.overIndex + 1 }})</span>
                } @else {
                  <span class="text-sm font-normal text-gray-500">(Current Over)</span>
                }
              </h3>
              <p class="text-sm text-gray-500">Current: {{ editBallForm.currentDisplay }}</p>
            </div>
            <div class="p-4 space-y-4">
              <!-- Quick Options -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ball Type</label>
                <div class="grid grid-cols-4 gap-2">
                  <button 
                    (click)="setEditBallType('dot')"
                    class="p-3 rounded-lg border text-center font-bold transition-all"
                    [class.border-blue-500]="editBallForm.type === 'dot'"
                    [class.bg-blue-50]="editBallForm.type === 'dot'"
                  >
                    •
                  </button>
                  @for (r of [1, 2, 3]; track r) {
                    <button 
                      (click)="setEditBallRuns(r)"
                      class="p-3 rounded-lg border text-center font-bold transition-all"
                      [class.border-blue-500]="editBallForm.type === 'runs' && editBallForm.runs === r"
                      [class.bg-blue-50]="editBallForm.type === 'runs' && editBallForm.runs === r"
                    >
                      {{ r }}
                    </button>
                  }
                </div>
                <div class="grid grid-cols-4 gap-2 mt-2">
                  <button 
                    (click)="setEditBallRuns(4)"
                    class="p-3 rounded-lg border text-center font-bold bg-green-100 hover:bg-green-200 transition-all"
                    [class.border-green-500]="editBallForm.type === 'runs' && editBallForm.runs === 4"
                    [class.bg-green-200]="editBallForm.type === 'runs' && editBallForm.runs === 4"
                  >
                    4
                  </button>
                  <button 
                    (click)="setEditBallRuns(5)"
                    class="p-3 rounded-lg border text-center font-bold transition-all"
                    [class.border-blue-500]="editBallForm.type === 'runs' && editBallForm.runs === 5"
                    [class.bg-blue-50]="editBallForm.type === 'runs' && editBallForm.runs === 5"
                  >
                    5
                  </button>
                  <button 
                    (click)="setEditBallRuns(6)"
                    class="p-3 rounded-lg border text-center font-bold bg-purple-100 hover:bg-purple-200 transition-all"
                    [class.border-purple-500]="editBallForm.type === 'runs' && editBallForm.runs === 6"
                    [class.bg-purple-200]="editBallForm.type === 'runs' && editBallForm.runs === 6"
                  >
                    6
                  </button>
                  <button 
                    (click)="setEditBallType('wicket')"
                    class="p-3 rounded-lg border text-center font-bold bg-red-100 hover:bg-red-200 transition-all"
                    [class.border-red-500]="editBallForm.type === 'wicket'"
                    [class.bg-red-200]="editBallForm.type === 'wicket'"
                  >
                    W
                  </button>
                </div>
              </div>

              <!-- Extras -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Extras</label>
                <div class="grid grid-cols-4 gap-2">
                  <button 
                    (click)="setEditBallType('wide')"
                    class="p-2 rounded-lg border text-center text-sm font-medium bg-yellow-50 hover:bg-yellow-100 transition-all"
                    [class.border-yellow-500]="editBallForm.type === 'wide'"
                    [class.bg-yellow-200]="editBallForm.type === 'wide'"
                  >
                    Wide
                  </button>
                  <button 
                    (click)="setEditBallType('noball')"
                    class="p-2 rounded-lg border text-center text-sm font-medium bg-yellow-50 hover:bg-yellow-100 transition-all"
                    [class.border-yellow-500]="editBallForm.type === 'noball'"
                    [class.bg-yellow-200]="editBallForm.type === 'noball'"
                  >
                    No Ball
                  </button>
                  <button 
                    (click)="setEditBallType('bye')"
                    class="p-2 rounded-lg border text-center text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-all"
                    [class.border-gray-500]="editBallForm.type === 'bye'"
                    [class.bg-gray-200]="editBallForm.type === 'bye'"
                  >
                    Bye
                  </button>
                  <button 
                    (click)="setEditBallType('legbye')"
                    class="p-2 rounded-lg border text-center text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-all"
                    [class.border-gray-500]="editBallForm.type === 'legbye'"
                    [class.bg-gray-200]="editBallForm.type === 'legbye'"
                  >
                    Leg Bye
                  </button>
                </div>
              </div>

              <!-- Extra runs for Wide/No Ball/Bye/Leg Bye -->
              @if (['wide', 'noball', 'bye', 'legbye'].includes(editBallForm.type)) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Additional Runs</label>
                  <div class="grid grid-cols-5 gap-2">
                    @for (r of [0, 1, 2, 3, 4]; track r) {
                      <button 
                        (click)="editBallForm.extraRuns = r"
                        class="p-2 rounded-lg border text-center font-medium transition-all"
                        [class.border-yellow-500]="editBallForm.extraRuns === r"
                        [class.bg-yellow-100]="editBallForm.extraRuns === r"
                      >
                        {{ r }}
                      </button>
                    }
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Total: {{ editBallForm.type === 'wide' || editBallForm.type === 'noball' ? 1 + editBallForm.extraRuns : editBallForm.extraRuns }} runs
                  </p>
                </div>
              }

              <!-- Delete Ball - Only allowed in current over -->
              @if (editBallForm.overIndex === -1) {
                <div class="pt-2 border-t">
                  <button 
                    (click)="setEditBallType('delete')"
                    class="w-full p-2 rounded-lg border text-center text-sm font-medium bg-red-50 hover:bg-red-100 text-red-700 transition-all"
                    [class.border-red-500]="editBallForm.type === 'delete'"
                    [class.bg-red-200]="editBallForm.type === 'delete'"
                  >
                    🗑️ Delete Ball
                  </button>
                  <p class="text-xs text-gray-500 mt-1">Remove this ball completely</p>
                </div>
              } @else {
                <div class="pt-2 border-t">
                  <p class="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Balls in completed overs cannot be deleted, only edited to a different value.
                  </p>
                </div>
              }

              <!-- Delete Ball Option -->
              <div class="pt-2 border-t">
                <button 
                  (click)="setEditBallType('delete')"
                  class="w-full p-2 rounded-lg border text-center text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                  [class.border-red-500]="editBallForm.type === 'delete'"
                  [class.bg-red-100]="editBallForm.type === 'delete'"
                >
                  🗑️ Delete This Ball
                </button>
                @if (editBallForm.type === 'delete') {
                  <p class="text-xs text-red-500 mt-1 text-center">This will remove the ball and adjust scores accordingly.</p>
                }
              </div>

              @if (error) {
                <p class="text-red-600 text-sm">{{ error }}</p>
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
                (click)="confirmEditBall()"
                [disabled]="processing || !editBallForm.type"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ processing ? 'Saving...' : (editBallForm.type === 'delete' ? 'Delete Ball' : 'Update Ball') }}
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

  // Recent overs display (last 5 overs)
  showRecentOvers = false;

  // Completed match over history
  showCompletedMatchOverHistory = false;
  selectedCompletedInningsIndex = 0;
  showFullScoringView = false;

  // Manual innings selector (for viewing different innings)
  viewInningsIndex: number = 0;

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

  // Edit ball form
  editBallForm = {
    ballIndex: 0,
    currentDisplay: '',
    type: '' as 'dot' | 'runs' | 'wicket' | 'wide' | 'noball' | 'bye' | 'legbye' | 'delete' | '',
    runs: 0,
    extraRuns: 0,
    overIndex: -1  // -1 = current over, >= 0 = index in overs array
  };

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
          // Initialize viewInningsIndex to current innings
          this.viewInningsIndex = this.match.currentInnings ?? 0;
          // Keep admin in scoring view even if match completes while they're scoring
          // This prevents the jarring switch to "Match Completed" view mid-scoring
          if (this.match.status === 'live') {
            this.showFullScoringView = true;
          }
          // Note: Bowler selection now handled via inline dropdown, not auto-opening modal
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
            // Sync viewInningsIndex with current innings when match data is refreshed
            // (only if currently viewing the live innings)
            if (this.viewInningsIndex === (this.match.currentInnings ?? 0) - 1 || 
                this.viewInningsIndex > (this.match.innings?.length ?? 1) - 1) {
              this.viewInningsIndex = this.match.currentInnings ?? 0;
            }
            // Note: Bowler selection now handled via inline dropdown, not auto-opening modal
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

    // Listen for innings status changes from Match Editor or ESPN sync
    this.eventSource.addEventListener('innings-status-change', () => {
      this.lastHeartbeat = Date.now();
      this.reloadMatch();
    });

    // Listen for ESPN sync updates (full match data replacement)
    this.eventSource.addEventListener('espn-sync', () => {
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

  // Get the innings currently being viewed (for manual innings selector)
  get viewingInnings() {
    if (!this.match?.innings || this.viewInningsIndex === undefined) return null;
    return this.match.innings[this.viewInningsIndex];
  }

  // Get the batting team name for the innings being viewed
  getViewingBattingTeamName(): string {
    if (!this.viewingInnings) return '';
    return this.getTeamNameById(this.viewingInnings.battingTeam);
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
    // Return all squad players (no isPlayingXI filter since we simplified squad selection)
    return squad || [];
  }

  get battingTeamPlayers() {
    if (!this.match || !this.currentInnings) return [];
    const battingTeamId = this.currentInnings.battingTeam?._id || this.currentInnings.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1Batting = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1Batting ? this.match.squads?.team1 : this.match.squads?.team2;
    // Return all squad players (no isPlayingXI filter since we simplified squad selection)
    return squad || [];
  }

  get secondBattingTeamPlayers() {
    if (!this.match) return [];
    const firstInnings = this.match.innings?.[0];
    const firstBattingTeamId = firstInnings?.battingTeam?._id || firstInnings?.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1BattedFirst = firstBattingTeamId === team1Id || firstBattingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1BattedFirst ? this.match.squads?.team2 : this.match.squads?.team1;
    const allPlayers = squad || [];
    // Sort by batting order
    return allPlayers.sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  get secondBowlingTeamPlayers() {
    if (!this.match) return [];
    const firstInnings = this.match.innings?.[0];
    const firstBattingTeamId = firstInnings?.battingTeam?._id || firstInnings?.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1BattedFirst = firstBattingTeamId === team1Id || firstBattingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1BattedFirst ? this.match.squads?.team1 : this.match.squads?.team2;
    // Return all squad players (no isPlayingXI filter since we simplified squad selection)
    return squad || [];
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
    
    // Get current batsmen IDs
    const currentStrikerId = this.currentInnings.currentBatsmen?.striker?._id || 
                             this.currentInnings.currentBatsmen?.striker;
    const currentNonStrikerId = this.currentInnings.currentBatsmen?.nonStriker?._id || 
                                this.currentInnings.currentBatsmen?.nonStriker;
    
    // Get IDs of players who are actually OUT (have dismissal type)
    const outPlayerIds = this.currentInnings.battingStats
      .filter((b: any) => b.dismissal?.type || b.isOut)
      .map((b: any) => {
        const id = b.player?._id || b.player;
        return id?.toString();
      });
    
    const available = this.battingTeamPlayers.filter((p: any) => {
      const playerId = this.getPlayerId(p);
      
      // Exclude current batsmen
      if (playerId === currentStrikerId?.toString() || 
          playerId === currentNonStrikerId?.toString()) {
        return false;
      }
      
      // Exclude players who are OUT
      if (outPlayerIds.includes(playerId?.toString())) {
        return false;
      }
      
      return true;
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

  // Highlight settings
  showHighlightSettings = false;

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

  // Get batting stats display for a player (searches both innings)
  getPlayerBattingStatsDisplay(playerId: string): string {
    if (!this.match?.innings) return '';
    
    for (const innings of this.match.innings) {
      const battingStat = innings.battingStats?.find((bs: any) => {
        const bsPlayerId = bs.player?._id || bs.player;
        return bsPlayerId === playerId || bsPlayerId?.toString() === playerId;
      });
      
      if (battingStat && (battingStat.runs > 0 || battingStat.balls > 0)) {
        const isOut = battingStat.isOut || battingStat.dismissal?.type;
        return `${battingStat.runs}(${battingStat.balls})${isOut ? '' : '*'}`;
      }
    }
    return '';
  }

  // Get bowling stats display for a player (searches both innings)
  getPlayerBowlingStatsDisplay(playerId: string): string {
    if (!this.match?.innings) return '';
    
    for (const innings of this.match.innings) {
      const bowlingStat = innings.bowlingStats?.find((bs: any) => {
        const bsPlayerId = bs.player?._id || bs.player;
        return bsPlayerId === playerId || bsPlayerId?.toString() === playerId;
      });
      
      if (bowlingStat && ((bowlingStat.overs || 0) > 0 || (bowlingStat.balls || 0) > 0)) {
        const overs = `${bowlingStat.overs || 0}.${bowlingStat.balls || 0}`;
        return `${bowlingStat.wickets || 0}/${bowlingStat.runs || 0} (${overs})`;
      }
    }
    return '';
  }

  // Highlight Video Methods
  openHighlightVideoModal(): void {
    this.activeModal = 'highlightVideo';
  }

  playHighlightVideo(inningsNumber: number | null): void {
    this.processing = true;
    this.error = '';

    // Send view-change event with highlight-video view and innings parameter
    this.matchService.setDisplayViewWithInnings(this.matchId, 'highlight-video', inningsNumber).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to start highlight video';
        }
        this.processing = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Failed to start highlight video';
        this.processing = false;
      }
    });
  }

  // Reserves helper methods
  getTeam1Reserves(): any[] {
    const squad = this.match?.squads?.team1?.filter((p: any) => !p.isPlayingXI) || [];
    return squad.sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  getTeam2Reserves(): any[] {
    const squad = this.match?.squads?.team2?.filter((p: any) => !p.isPlayingXI) || [];
    return squad.sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  getReservesForTeam(team: 'team1' | 'team2' | ''): any[] {
    if (!team) return [];
    return team === 'team1' ? this.getTeam1Reserves() : this.getTeam2Reserves();
  }

  hasReserves(): boolean {
    return this.getTeam1Reserves().length > 0 || this.getTeam2Reserves().length > 0;
  }

  // ===========================================
  // MANUAL ADJUSTMENTS - Score & Batsman Change
  // ===========================================

  // Score adjustment form - stores absolute values
  scoreAdjustForm = {
    runs: 0,
    wickets: 0,
    balls: 0,
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0
    }
  };

  // Change batsman form
  changeBatsmanForm = {
    position: '' as 'striker' | 'nonStriker' | '',
    newBatsman: ''
  };

  // Batsman stats adjustment form
  adjustBatsmanForm = {
    playerId: '',
    playerName: '',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    inningsIndex: 0
  };

  // Bowler stats adjustment form
  adjustBowlerForm = {
    playerId: '',
    playerName: '',
    overs: 0,
    balls: 0,
    runs: 0,
    wickets: 0,
    maidens: 0,
    wides: 0,
    noBalls: 0,
    inningsIndex: 0
  };

  // Open score adjustment modal - pre-populate with current values
  openAdjustScoreModal(): void {
    this.scoreAdjustForm = {
      runs: this.currentInnings?.totalRuns || 0,
      wickets: this.currentInnings?.totalWickets || 0,
      balls: this.currentInnings?.totalBalls || 0,
      extras: {
        wides: this.currentInnings?.extras?.wides || 0,
        noBalls: this.currentInnings?.extras?.noBalls || 0,
        byes: this.currentInnings?.extras?.byes || 0,
        legByes: this.currentInnings?.extras?.legByes || 0
      }
    };
    this.activeModal = 'adjustScore';
  }

  // Confirm score adjustment - sends absolute values
  confirmAdjustScore(): void {
    this.processing = true;
    this.error = '';

    // Send the new absolute values
    const newValues: any = {
      runs: this.scoreAdjustForm.runs,
      wickets: this.scoreAdjustForm.wickets,
      balls: this.scoreAdjustForm.balls,
      extras: {
        wides: this.scoreAdjustForm.extras.wides,
        noBalls: this.scoreAdjustForm.extras.noBalls,
        byes: this.scoreAdjustForm.extras.byes,
        legByes: this.scoreAdjustForm.extras.legByes
      }
    };

    this.scoringService.adjustScore(this.matchId, newValues).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to adjust score';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to adjust score';
        this.processing = false;
      }
    });
  }

  // Open change batsman modal
  openChangeBatsmanModal(): void {
    this.changeBatsmanForm = {
      position: '',
      newBatsman: ''
    };
    this.activeModal = 'changeBatsman';
  }

  // Get available batsmen for change (not currently batting, not out)
  getAvailableBatsmenForChange(): any[] {
    if (!this.currentInnings) return [];
    
    const currentStrikerId = this.currentInnings.currentBatsmen?.striker?._id || 
                              this.currentInnings.currentBatsmen?.striker;
    const currentNonStrikerId = this.currentInnings.currentBatsmen?.nonStriker?._id || 
                                 this.currentInnings.currentBatsmen?.nonStriker;
    
    return this.battingTeamPlayers.filter((p: any) => {
      const playerId = this.getPlayerId(p);
      // Exclude current batsmen
      if (playerId === currentStrikerId?.toString() || playerId === currentNonStrikerId?.toString()) {
        return false;
      }
      // Check if already out
      const battingStat = this.currentInnings?.battingStats?.find((bs: any) => {
        const bsId = bs.player?._id || bs.player;
        return bsId === playerId || bsId?.toString() === playerId;
      });
      if (battingStat?.isOut) {
        return false;
      }
      return true;
    }).sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  // Confirm change batsman
  confirmChangeBatsman(): void {
    if (!this.changeBatsmanForm.position || !this.changeBatsmanForm.newBatsman) {
      this.error = 'Please select position and new batsman';
      return;
    }

    this.processing = true;
    this.error = '';

    this.scoringService.changeBatsman(
      this.matchId, 
      this.changeBatsmanForm.position as 'striker' | 'nonStriker', 
      this.changeBatsmanForm.newBatsman
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to change batsman';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to change batsman';
        this.processing = false;
      }
    });
  }

  // Open batsman stats adjustment modal
  openAdjustBatsmanModal(playerId: string, inningsIndex?: number): void {
    const targetIndex = inningsIndex !== undefined ? inningsIndex : this.selectedManageInnings;
    const innings = this.match?.innings?.[targetIndex];
    
    const battingStat = innings?.battingStats?.find((bs: any) => {
      const bsId = bs.player?._id || bs.player;
      return bsId === playerId || bsId?.toString() === playerId;
    });
    
    if (!battingStat) {
      this.error = 'Batsman not found';
      return;
    }

    this.adjustBatsmanForm = {
      playerId: playerId,
      playerName: this.getPlayerName(battingStat.player),
      runs: battingStat.runs || 0,
      balls: battingStat.balls || 0,
      fours: battingStat.fours || 0,
      sixes: battingStat.sixes || 0,
      inningsIndex: targetIndex
    };
    this.activeModal = 'adjustBatsman';
  }

  // Confirm batsman stats adjustment
  confirmAdjustBatsman(): void {
    this.processing = true;
    this.error = '';

    this.scoringService.adjustBatsmanStats(this.matchId, this.adjustBatsmanForm.playerId, {
      runs: this.adjustBatsmanForm.runs,
      balls: this.adjustBatsmanForm.balls,
      fours: this.adjustBatsmanForm.fours,
      sixes: this.adjustBatsmanForm.sixes
    }, this.adjustBatsmanForm.inningsIndex).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to adjust batsman stats';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to adjust batsman stats';
        this.processing = false;
      }
    });
  }

  // Open bowler stats adjustment modal
  openAdjustBowlerModal(playerId: string, inningsIndex?: number): void {
    const targetIndex = inningsIndex !== undefined ? inningsIndex : this.selectedManageInnings;
    const innings = this.match?.innings?.[targetIndex];
    
    const bowlingStat = innings?.bowlingStats?.find((bs: any) => {
      const bsId = bs.player?._id || bs.player;
      return bsId === playerId || bsId?.toString() === playerId;
    });
    
    if (!bowlingStat) {
      this.error = 'Bowler not found';
      return;
    }

    this.adjustBowlerForm = {
      playerId: playerId,
      playerName: this.getPlayerName(bowlingStat.player),
      overs: bowlingStat.overs || 0,
      balls: bowlingStat.balls || 0,
      runs: bowlingStat.runs || 0,
      wickets: bowlingStat.wickets || 0,
      maidens: bowlingStat.maidens || 0,
      wides: bowlingStat.wides || 0,
      noBalls: bowlingStat.noBalls || 0,
      inningsIndex: targetIndex
    };
    this.activeModal = 'adjustBowler';
  }

  // Confirm bowler stats adjustment
  confirmAdjustBowler(): void {
    this.processing = true;
    this.error = '';

    this.scoringService.adjustBowlerStats(this.matchId, this.adjustBowlerForm.playerId, {
      overs: this.adjustBowlerForm.overs,
      balls: this.adjustBowlerForm.balls,
      runs: this.adjustBowlerForm.runs,
      wickets: this.adjustBowlerForm.wickets,
      maidens: this.adjustBowlerForm.maidens,
      wides: this.adjustBowlerForm.wides,
      noBalls: this.adjustBowlerForm.noBalls
    }, this.adjustBowlerForm.inningsIndex).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to adjust bowler stats';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to adjust bowler stats';
        this.processing = false;
      }
    });
  }

  // Get current batsmen who have stats (for adjustment)
  getCurrentBatsmenWithStats(): any[] {
    if (!this.currentInnings?.battingStats) return [];
    return this.currentInnings.battingStats.filter((bs: any) => 
      bs.balls > 0 || bs.runs > 0
    );
  }

  // Get current bowlers who have stats (for adjustment)
  getCurrentBowlersWithStats(): any[] {
    if (!this.currentInnings?.bowlingStats) return [];
    return this.currentInnings.bowlingStats.filter((bs: any) => 
      (bs.overs || 0) > 0 || (bs.balls || 0) > 0
    );
  }

  // ===========================================
  // MANAGE ALL BATSMEN - Toggle Out/Not Out
  // ===========================================

  markOutDialogOpen = false;
  markOutForm = {
    playerId: '',
    playerName: '',
    type: '',
    bowlerId: '',
    fielderId: ''
  };

  // Open the manage batsmen modal
  openManageBatsmenModal(): void {
    this.markOutDialogOpen = false;
    this.markOutForm = { playerId: '', playerName: '', type: '', bowlerId: '', fielderId: '' };
    this.selectedManageInnings = this.match?.currentInnings || 0;
    this.activeModal = 'manageBatsmen';
  }

  // Get all batsmen who have any stats in specified innings
  getAllBatsmenWithStats(inningsIndex?: number): any[] {
    const targetIndex = inningsIndex !== undefined ? inningsIndex : this.selectedManageInnings;
    const innings = this.match?.innings?.[targetIndex];
    if (!innings?.battingStats) return [];
    
    return innings.battingStats.map((bs: any) => {
      const playerId = bs.player?._id || bs.player;
      const strikeRate = bs.balls > 0 ? ((bs.runs / bs.balls) * 100).toFixed(1) : '0.0';
      
      return {
        playerId: playerId?.toString(),
        name: this.getPlayerName(bs.player),
        runs: bs.runs || 0,
        balls: bs.balls || 0,
        fours: bs.fours || 0,
        sixes: bs.sixes || 0,
        strikeRate,
        isOut: !!(bs.dismissal?.type),
        dismissalType: bs.dismissal?.type || null,
        dismissalBowler: bs.dismissal?.bowler,
        dismissalFielder: bs.dismissal?.fielder,
        inningsIndex: targetIndex
      };
    });
  }

  // Check if player is currently batting (only for current innings)
  isCurrentBatsman(playerId: string): boolean {
    if (this.selectedManageInnings !== this.match?.currentInnings) return false;
    if (!this.currentInnings?.currentBatsmen) return false;
    const strikerId = this.currentInnings.currentBatsmen.striker?._id || this.currentInnings.currentBatsmen.striker;
    const nonStrikerId = this.currentInnings.currentBatsmen.nonStriker?._id || this.currentInnings.currentBatsmen.nonStriker;
    return playerId === strikerId?.toString() || playerId === nonStrikerId?.toString();
  }

  // Format dismissal type for display
  formatDismissal(type: string): string {
    const formats: Record<string, string> = {
      'bowled': 'Bowled',
      'caught': 'Caught',
      'lbw': 'LBW',
      'run-out': 'Run Out',
      'stumped': 'Stumped',
      'hit-wicket': 'Hit Wicket'
    };
    return formats[type] || type;
  }

  // Open the mark out dialog
  openMarkOutDialog(playerId: string, playerName: string): void {
    this.markOutForm = {
      playerId,
      playerName,
      type: '',
      bowlerId: '',
      fielderId: ''
    };
    this.markOutDialogOpen = true;
  }

  // Close mark out dialog
  closeMarkOutDialog(): void {
    this.markOutDialogOpen = false;
    this.markOutForm = { playerId: '', playerName: '', type: '', bowlerId: '', fielderId: '' };
  }

  // Toggle dismissal status (mark out or not out)
  toggleDismissal(playerId: string, markAsOut: boolean): void {
    if (markAsOut) {
      // This shouldn't be called directly - use openMarkOutDialog instead
      return;
    }

    // Mark as NOT OUT - no dismissal data needed
    this.processing = true;
    this.error = '';

    this.scoringService.toggleBatsmanDismissal(this.matchId, playerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to update dismissal status';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update dismissal status';
        this.processing = false;
      }
    });
  }

  // Confirm marking a player as out
  confirmMarkOut(): void {
    if (!this.markOutForm.type || !this.markOutForm.playerId) {
      this.error = 'Please select a dismissal type';
      return;
    }

    this.processing = true;
    this.error = '';

    const dismissalData: any = {
      type: this.markOutForm.type
    };

    // Add bowler (use current bowler if available)
    if (this.currentInnings?.currentBowler) {
      dismissalData.bowlerId = this.currentInnings.currentBowler._id || this.currentInnings.currentBowler;
    }

    // Add fielder if applicable
    if (this.markOutForm.fielderId) {
      dismissalData.fielderId = this.markOutForm.fielderId;
    }

    this.scoringService.toggleBatsmanDismissal(this.matchId, this.markOutForm.playerId, dismissalData).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeMarkOutDialog();
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to mark player as out';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to mark player as out';
        this.processing = false;
      }
    });
  }

  // ===========================================
  // MANAGE ALL BOWLERS
  // ===========================================

  // Selected innings for management modals (0 = first innings, 1 = second innings)
  selectedManageInnings = 0;

  // Inline player selection for initial setup
  inlineStrikerSelection = '';
  inlineNonStrikerSelection = '';
  inlineBowlerSelection = '';

  // Open the manage bowlers modal
  openManageBowlersModal(): void {
    this.selectedManageInnings = this.match?.currentInnings || 0;
    this.activeModal = 'manageBowlers';
  }

  // Get all bowlers who have any stats in specified innings
  getAllBowlersWithStats(inningsIndex?: number): any[] {
    const targetIndex = inningsIndex !== undefined ? inningsIndex : this.selectedManageInnings;
    const innings = this.match?.innings?.[targetIndex];
    if (!innings?.bowlingStats) return [];
    
    return innings.bowlingStats
      .filter((bs: any) => (bs.overs || 0) > 0 || (bs.balls || 0) > 0)
      .map((bs: any) => {
        const playerId = bs.player?._id || bs.player;
        const totalBalls = (bs.overs || 0) * 6 + (bs.balls || 0);
        const economy = totalBalls > 0 ? ((bs.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
        
        return {
          playerId: playerId?.toString(),
          name: this.getPlayerName(bs.player),
          overs: bs.overs || 0,
          balls: bs.balls || 0,
          runs: bs.runs || 0,
          wickets: bs.wickets || 0,
          maidens: bs.maidens || 0,
          wides: bs.wides || 0,
          noBalls: bs.noBalls || 0,
          economy,
          inningsIndex: targetIndex
        };
      });
  }

  // Check if player is the current bowler (only for current innings)
  isCurrentBowler(playerId: string): boolean {
    if (this.selectedManageInnings !== this.match?.currentInnings) return false;
    if (!this.currentInnings?.currentBowler) return false;
    const currentBowlerId = this.currentInnings.currentBowler._id || this.currentInnings.currentBowler;
    return playerId === currentBowlerId?.toString();
  }

  // Get innings label for tabs
  getInningsLabel(index: number): string {
    const innings = this.match?.innings?.[index];
    if (!innings) return `Innings ${index + 1}`;
    const teamName = this.getTeamNameById(innings.battingTeam);
    return `${teamName} Batting`;
  }

  // Check if innings exists
  hasInnings(index: number): boolean {
    return !!(this.match?.innings?.[index]);
  }

  // ===========================================
  // FORCE NEW OVER
  // ===========================================

  // Force end the current over and start a new one
  forceNewOver(): void {
    if (!confirm('Are you sure you want to force end this over? This will:\n\n• Complete the current over\n• Add remaining balls to the count\n• Rotate strike\n• Require selecting a new bowler')) {
      return;
    }

    this.processing = true;
    this.error = '';

    this.scoringService.forceNewOver(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to force new over';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to force new over';
        this.processing = false;
      }
    });
  }

  // ===========================================
  // INLINE PLAYER SELECTION (Initial Setup)
  // ===========================================

  // Get available batsmen for inline selection, excluding already selected player
  getAvailableBatsmenForInlineSelection(position: 'striker' | 'nonStriker'): any[] {
    const otherSelection = position === 'striker' 
      ? this.inlineNonStrikerSelection 
      : this.inlineStrikerSelection;
    
    return this.battingTeamPlayers
      .filter((p: any) => this.getPlayerId(p) !== otherSelection)
      .sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  // Set striker via inline dropdown
  setInlineStriker(): void {
    if (!this.inlineStrikerSelection) return;

    this.processing = true;
    this.error = '';

    this.scoringService.setOpeningBatsman(this.matchId, 'striker', this.inlineStrikerSelection).subscribe({
      next: (response) => {
        if (response.success) {
          this.inlineStrikerSelection = '';
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to set striker';
          this.inlineStrikerSelection = '';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to set striker';
        this.inlineStrikerSelection = '';
        this.processing = false;
      }
    });
  }

  // Set non-striker via inline dropdown
  setInlineNonStriker(): void {
    if (!this.inlineNonStrikerSelection) return;

    this.processing = true;
    this.error = '';

    this.scoringService.setOpeningBatsman(this.matchId, 'nonStriker', this.inlineNonStrikerSelection).subscribe({
      next: (response) => {
        if (response.success) {
          this.inlineNonStrikerSelection = '';
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to set non-striker';
          this.inlineNonStrikerSelection = '';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to set non-striker';
        this.inlineNonStrikerSelection = '';
        this.processing = false;
      }
    });
  }

  // Set bowler via inline dropdown
  setInlineBowler(): void {
    if (!this.inlineBowlerSelection) return;

    this.processing = true;
    this.error = '';

    this.scoringService.changeBowler(this.matchId, this.inlineBowlerSelection).subscribe({
      next: (response) => {
        if (response.success) {
          this.inlineBowlerSelection = '';
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to set bowler';
          this.inlineBowlerSelection = '';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to set bowler';
        this.inlineBowlerSelection = '';
        this.processing = false;
      }
    });
  }

  // ===========================================
  // PERSISTENT DROPDOWN PLAYER SELECTION
  // ===========================================

  // Get current striker ID for dropdown binding
  getCurrentStrikerId(): string {
    const striker = this.currentInnings?.currentBatsmen?.striker;
    return striker?._id?.toString() || striker?.toString() || '';
  }

  // Get current non-striker ID for dropdown binding
  getCurrentNonStrikerId(): string {
    const nonStriker = this.currentInnings?.currentBatsmen?.nonStriker;
    return nonStriker?._id?.toString() || nonStriker?.toString() || '';
  }

  // Get current bowler ID for dropdown binding
  getCurrentBowlerId(): string {
    const bowler = this.currentInnings?.currentBowler;
    return bowler?._id?.toString() || bowler?.toString() || '';
  }

  // Get available batsmen for a position (includes current player, excludes other position and out players)
  getAvailableBatsmenForPosition(position: 'striker' | 'nonStriker'): any[] {
    if (!this.currentInnings) return [];
    
    const currentStrikerId = this.getCurrentStrikerId();
    const currentNonStrikerId = this.getCurrentNonStrikerId();
    const otherPositionId = position === 'striker' ? currentNonStrikerId : currentStrikerId;
    
    return this.battingTeamPlayers
      .filter((p: any) => {
        const playerId = this.getPlayerId(p);
        // Exclude the other position's player
        if (playerId === otherPositionId) return false;
        // Check if player is already out
        const battingStat = this.currentInnings?.battingStats?.find((bs: any) => {
          const bsId = bs.player?._id || bs.player;
          return bsId === playerId || bsId?.toString() === playerId;
        });
        if (battingStat?.isOut || battingStat?.dismissal?.type) return false;
        return true;
      })
      .sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  // Get available bowlers for selection (all bowling team players)
  getAvailableBowlersForSelection(): any[] {
    return this.bowlingTeamPlayers || [];
  }

  // Change striker via dropdown
  changeStriker(newPlayerId: string): void {
    if (!newPlayerId || newPlayerId === this.getCurrentStrikerId()) return;

    this.processing = true;
    this.error = '';

    // Use setOpeningBatsman if no current striker, otherwise use changeBatsman
    if (!this.getCurrentStrikerId()) {
      this.scoringService.setOpeningBatsman(this.matchId, 'striker', newPlayerId).subscribe({
        next: (response) => {
          if (response.success) {
            this.reloadMatch();
          } else {
            this.error = response.message || 'Failed to set striker';
          }
          this.processing = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to set striker';
          this.processing = false;
        }
      });
    } else {
      this.scoringService.changeBatsman(this.matchId, 'striker', newPlayerId).subscribe({
        next: (response) => {
          if (response.success) {
            this.reloadMatch();
          } else {
            this.error = response.message || 'Failed to change striker';
          }
          this.processing = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to change striker';
          this.processing = false;
        }
      });
    }
  }

  // Change non-striker via dropdown
  changeNonStriker(newPlayerId: string): void {
    if (!newPlayerId || newPlayerId === this.getCurrentNonStrikerId()) return;

    this.processing = true;
    this.error = '';

    // Use setOpeningBatsman if no current non-striker, otherwise use changeBatsman
    if (!this.getCurrentNonStrikerId()) {
      this.scoringService.setOpeningBatsman(this.matchId, 'nonStriker', newPlayerId).subscribe({
        next: (response) => {
          if (response.success) {
            this.reloadMatch();
          } else {
            this.error = response.message || 'Failed to set non-striker';
          }
          this.processing = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to set non-striker';
          this.processing = false;
        }
      });
    } else {
      this.scoringService.changeBatsman(this.matchId, 'nonStriker', newPlayerId).subscribe({
        next: (response) => {
          if (response.success) {
            this.reloadMatch();
          } else {
            this.error = response.message || 'Failed to change non-striker';
          }
          this.processing = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to change non-striker';
          this.processing = false;
        }
      });
    }
  }

  // Change bowler via inline dropdown
  changeBowlerInline(newPlayerId: string): void {
    if (!newPlayerId || newPlayerId === this.getCurrentBowlerId()) return;

    this.processing = true;
    this.error = '';

    this.scoringService.changeBowler(this.matchId, newPlayerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadMatch();
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

  // ===========================================
  // DROPDOWN OPTIONS WITH STATS
  // ===========================================

  // Get batsmen options with stats for dropdown
  getBatsmenOptionsForDropdown(position: 'striker' | 'nonStriker'): Array<{
    id: string;
    displayText: string;
    isOut: boolean;
    isBatting: boolean;
  }> {
    if (!this.currentInnings) return [];
    
    const currentStrikerId = this.getCurrentStrikerId();
    const currentNonStrikerId = this.getCurrentNonStrikerId();
    const otherPositionId = position === 'striker' ? currentNonStrikerId : currentStrikerId;
    
    return this.battingTeamPlayers
      .filter((p: any) => {
        const playerId = this.getPlayerId(p);
        // Exclude the other position's player
        if (playerId === otherPositionId) return false;
        return true;
      })
      .map((p: any) => {
        const playerId = this.getPlayerId(p);
        const playerName = this.getSquadPlayerName(p);
        const battingOrder = p.battingOrder || 99;
        
        // Find batting stats for this player
        const battingStat = this.currentInnings?.battingStats?.find((bs: any) => {
          const bsId = bs.player?._id || bs.player;
          return bsId === playerId || bsId?.toString() === playerId;
        });
        
        const isOut = !!(battingStat?.isOut || battingStat?.dismissal?.type);
        const hasBatted = !!battingStat;
        const runs = battingStat?.runs || 0;
        const balls = battingStat?.balls || 0;
        
        // Build display text with status
        let statusText = '';
        if (isOut) {
          statusText = `[OUT ${runs}(${balls})]`;
        } else if (hasBatted) {
          statusText = `[${runs}(${balls})]`;
        } else {
          statusText = '[—]'; // em dash for "yet to bat"
        }
        
        return {
          id: playerId,
          displayText: `#${battingOrder} - ${playerName} ${statusText}`,
          isOut,
          isBatting: playerId === currentStrikerId || playerId === currentNonStrikerId
        };
      })
      .sort((a, b) => {
        // Sort: currently batting first, then not out, then out, then by batting order
        const aOrder = parseInt(a.displayText.match(/#(\d+)/)?.[1] || '99');
        const bOrder = parseInt(b.displayText.match(/#(\d+)/)?.[1] || '99');
        
        if (a.isBatting && !b.isBatting) return -1;
        if (!a.isBatting && b.isBatting) return 1;
        if (!a.isOut && b.isOut) return -1;
        if (a.isOut && !b.isOut) return 1;
        return aOrder - bOrder;
      });
  }

  // Get previous over's bowler ID
  getPreviousOverBowlerId(): string | null {
    if (!this.currentInnings) return null;
    
    // Get overs array
    const overs = this.currentInnings.overs || [];
    if (overs.length === 0) return null;
    
    // If current over has no balls, previous over is the last completed over
    // If current over has balls, previous over is the one before that
    const currentOverBalls = this.currentInnings.currentOver?.length || 0;
    
    if (currentOverBalls === 0 && overs.length > 0) {
      // Current over is empty, last over in overs array is the previous
      const lastOver = overs[overs.length - 1];
      return lastOver?.bowler?._id?.toString() || lastOver?.bowler?.toString() || null;
    } else if (overs.length > 0) {
      // Current over has balls, check the last completed over
      const lastOver = overs[overs.length - 1];
      return lastOver?.bowler?._id?.toString() || lastOver?.bowler?.toString() || null;
    }
    
    return null;
  }

  // Get bowler options with stats for dropdown
  getBowlerOptionsForDropdown(): Array<{
    id: string;
    displayText: string;
    isBowledLastOver: boolean;
    isCurrentBowler: boolean;
  }> {
    if (!this.bowlingTeamPlayers) return [];
    
    const previousBowlerId = this.getPreviousOverBowlerId();
    const currentBowlerId = this.getCurrentBowlerId();
    
    return this.bowlingTeamPlayers.map((p: any) => {
      const playerId = this.getPlayerId(p);
      const playerName = this.getSquadPlayerName(p);
      
      // Find bowling stats for this player
      const bowlingStat = this.currentInnings?.bowlingStats?.find((bs: any) => {
        const bsId = bs.player?._id || bs.player;
        return bsId === playerId || bsId?.toString() === playerId;
      });
      
      const hasBowled = !!bowlingStat && ((bowlingStat.overs || 0) > 0 || (bowlingStat.balls || 0) > 0);
      const overs = bowlingStat?.overs || 0;
      const balls = bowlingStat?.balls || 0;
      const runs = bowlingStat?.runs || 0;
      const wickets = bowlingStat?.wickets || 0;
      
      // Check if this bowler bowled the previous over
      const isBowledLastOver = previousBowlerId === playerId && currentBowlerId !== playerId;
      
      // Build display text with stats
      let statsText = '';
      if (hasBowled) {
        const oversDisplay = balls > 0 ? `${overs}.${balls}` : `${overs}`;
        statsText = `[${wickets}-${runs}, ${oversDisplay} ov]`;
      } else {
        statsText = '[—]'; // em dash for "not bowled yet"
      }
      
      // Add "(prev over)" indicator if they bowled the last over
      if (isBowledLastOver) {
        statsText += ' ⛔ prev over';
      }
      
      return {
        id: playerId,
        displayText: `${playerName} ${statsText}`,
        isBowledLastOver,
        isCurrentBowler: playerId === currentBowlerId
      };
    }).sort((a, b) => {
      // Sort: current bowler first, then by whether they've bowled, then alphabetically
      if (a.isCurrentBowler && !b.isCurrentBowler) return -1;
      if (!a.isCurrentBowler && b.isCurrentBowler) return 1;
      if (a.isBowledLastOver && !b.isBowledLastOver) return 1; // Push prev over bowler down
      if (!a.isBowledLastOver && b.isBowledLastOver) return -1;
      return a.displayText.localeCompare(b.displayText);
    });
  }

  // ===========================================
  // RECENT OVERS HELPER METHODS (Last 5 overs)
  // ===========================================

  // Get the last 5 completed overs (most recent first)
  getRecentOvers(): Array<{
    overIndex: number;
    overNumber: number;
    runs: number;
    wickets: number;
    balls: any[];
  }> {
    if (!this.currentInnings?.overs || this.currentInnings.overs.length === 0) {
      return [];
    }
    
    const overs = this.currentInnings.overs;
    const lastFive = overs.slice(-5).reverse(); // Get last 5, most recent first
    
    return lastFive.map((over: any, idx: number) => {
      // Calculate the actual index in the overs array
      const actualIndex = overs.length - 1 - idx;
      return {
        overIndex: actualIndex,
        overNumber: over.overNumber || actualIndex + 1,
        runs: over.runs || over.balls?.reduce((sum: number, b: any) => sum + (b.runs || 0), 0) || 0,
        wickets: over.wickets || over.balls?.filter((b: any) => b.isWicket).length || 0,
        balls: over.balls || []
      };
    });
  }

  // Get overs for completed match history view
  getCompletedMatchOvers(): Array<{
    overNumber: number;
    runs: number;
    wickets: number;
    balls: any[];
  }> {
    if (!this.match?.innings || !this.match.innings[this.selectedCompletedInningsIndex]) {
      return [];
    }
    
    const innings = this.match.innings[this.selectedCompletedInningsIndex];
    const overs = innings.overs || [];
    
    // Map overs, using 1-based index as overNumber (idx + 1)
    // This ensures consistent numbering regardless of stored overNumber values
    return overs.map((over: any, idx: number) => ({
      overNumber: idx + 1,  // Always use 1-based index for display
      runs: over.runs || over.balls?.reduce((sum: number, b: any) => sum + (b.totalRuns || b.runs || 0), 0) || 0,
      wickets: over.wickets || over.balls?.filter((b: any) => b.isWicket).length || 0,
      balls: (over.balls || []).map((b: any) => ({
        display: b.display || this.formatBallDisplay(b),
        runs: b.runs || 0
      }))
    }));
  }

  // Format ball display for over history
  private formatBallDisplay(ball: any): string {
    if (ball.isWicket) return 'W';
    if (ball.isFour) return '4';
    if (ball.isSix) return '6';
    if (ball.isExtra) {
      const extraRuns = ball.extraRuns || ball.runs || 1;
      if (ball.extraType === 'wide') return extraRuns > 1 ? `Wd+${extraRuns-1}` : 'Wd';
      if (ball.extraType === 'no-ball') return extraRuns > 1 ? `Nb+${extraRuns-1}` : 'Nb';
      if (ball.extraType === 'bye') return `B${extraRuns}`;
      if (ball.extraType === 'leg-bye') return `Lb${extraRuns}`;
    }
    return ball.runs?.toString() || '0';
  }

  // ===========================================
  // EDIT BALL METHODS
  // ===========================================

  // Open edit ball modal for current over
  openEditBallModal(ballIndex: number): void {
    if (!this.currentInnings?.currentOver) return;
    
    const ball = this.currentInnings.currentOver[ballIndex];
    if (!ball) return;
    
    this.editBallForm = {
      ballIndex,
      currentDisplay: ball.display || '',
      type: '',
      runs: 0,
      extraRuns: 0,
      overIndex: -1  // -1 means current over
    };
    
    this.activeModal = 'editBall';
  }

  // Open edit ball modal for a completed over (any of the last 5)
  openEditCompletedOverBallModal(overIndex: number, ballIndex: number): void {
    if (!this.currentInnings?.overs) return;
    
    const over = this.currentInnings.overs[overIndex];
    if (!over?.balls) return;
    
    const ball = over.balls[ballIndex];
    if (!ball) return;
    
    this.editBallForm = {
      ballIndex,
      currentDisplay: ball.display || '',
      type: '',
      runs: 0,
      extraRuns: 0,
      overIndex  // >= 0 means completed over at this index
    };
    
    this.activeModal = 'editBall';
  }

  // Set edit ball type (for simple types like dot, wicket, wide, noball, bye, legbye, delete)
  setEditBallType(type: 'dot' | 'wicket' | 'wide' | 'noball' | 'bye' | 'legbye' | 'delete'): void {
    this.editBallForm.type = type;
    this.editBallForm.runs = 0;
    if (!['wide', 'noball', 'bye', 'legbye'].includes(type)) {
      this.editBallForm.extraRuns = 0;
    }
  }

  // Set edit ball runs (for run values)
  setEditBallRuns(runs: number): void {
    this.editBallForm.type = 'runs';
    this.editBallForm.runs = runs;
    this.editBallForm.extraRuns = 0;
  }

  // Confirm edit ball
  confirmEditBall(): void {
    if (!this.editBallForm.type) return;
    
    this.processing = true;
    this.error = '';
    
    const ballIndex = this.editBallForm.ballIndex;
    const overIndex = this.editBallForm.overIndex;
    
    // Build the new ball data
    let newBallData: any = {
      ballIndex,
      overIndex,  // Include overIndex to tell backend which over to edit
      type: this.editBallForm.type
    };
    
    switch (this.editBallForm.type) {
      case 'dot':
        newBallData.runs = 0;
        newBallData.isLegal = true;
        break;
      case 'runs':
        newBallData.runs = this.editBallForm.runs;
        newBallData.isLegal = true;
        break;
      case 'wicket':
        newBallData.runs = 0;
        newBallData.isWicket = true;
        newBallData.isLegal = true;
        break;
      case 'wide':
        newBallData.runs = 1 + this.editBallForm.extraRuns;
        newBallData.extras = { type: 'wide', runs: 1 + this.editBallForm.extraRuns };
        newBallData.isLegal = false;
        break;
      case 'noball':
        newBallData.runs = 1 + this.editBallForm.extraRuns;
        newBallData.extras = { type: 'no-ball', runs: 1 + this.editBallForm.extraRuns };
        newBallData.isLegal = false;
        break;
      case 'bye':
        newBallData.runs = this.editBallForm.extraRuns > 0 ? this.editBallForm.extraRuns : 1;
        newBallData.extras = { type: 'bye', runs: newBallData.runs };
        newBallData.isLegal = true;
        break;
      case 'legbye':
        newBallData.runs = this.editBallForm.extraRuns > 0 ? this.editBallForm.extraRuns : 1;
        newBallData.extras = { type: 'leg-bye', runs: newBallData.runs };
        newBallData.isLegal = true;
        break;
      case 'delete':
        newBallData.delete = true;
        break;
    }
    
    this.scoringService.editBall(this.matchId, newBallData).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeModal();
          this.reloadMatch();
        } else {
          this.error = response.message || 'Failed to edit ball';
        }
        this.processing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to edit ball';
        this.processing = false;
      }
    });
  }
}
