import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatchService, Match } from '../../../core/services/match.service';
import { ScoringService } from '../../../core/services/scoring.service';
import { EspnService, SquadValidationResult, SquadValidationMismatch } from '../../../core/services/espn.service';
import { PlayerService } from '../../../core/services/player.service';
import { ApiResponse, Player } from '../../../core/models';
import { EspnSyncModalComponent } from '../../components/espn-sync-modal/espn-sync-modal.component';

interface BattingStatEdit {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalType: string | null;
  dismissalBowlerId: string | null;
  dismissalFielderId: string | null;
  isStriker: boolean;
  isNonStriker: boolean;
  isNew?: boolean;
  toRemove?: boolean;
}

interface BowlingStatEdit {
  playerId: string;
  playerName: string;
  overs: string; // "3.4" format
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  isBowling: boolean;
  isNew?: boolean;
  toRemove?: boolean;
}

interface InningsEdit {
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  battingStats: BattingStatEdit[];
  bowlingStats: BowlingStatEdit[];
}

@Component({
  selector: 'app-match-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule, EspnSyncModalComponent],
  template: `
    <div class="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <!-- Compact Header -->
      <div class="bg-white border-b border-slate-200 flex-shrink-0">
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <a routerLink="/admin/matches" class="text-slate-400 hover:text-slate-600 text-sm">
              ← Back
            </a>
            <div class="h-4 w-px bg-slate-200"></div>
            <h1 class="text-sm font-semibold text-slate-700">Match Editor</h1>
            @if (match?.status === 'live') {
              <span class="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium animate-pulse">
                LIVE
              </span>
            }
          </div>
          <a 
            [routerLink]="['/admin/scoring', matchId]"
            class="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to Scoring →
          </a>
        </div>
      </div>

      @if (loading) {
        <div class="flex-1 flex items-center justify-center">
          <div class="text-slate-400">Loading match...</div>
        </div>
      } @else if (!match) {
        <div class="flex-1 flex items-center justify-center">
          <div class="text-slate-400">Match not found</div>
        </div>
      } @else {
        <!-- Main Content - Two Column Layout -->
        <div class="flex-1 flex overflow-hidden">
          
          <!-- Left Sidebar - Match Info, Score, ESPN -->
          <div class="w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
            
            <!-- Match Info Card -->
            <div class="p-4 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-800 leading-tight">
                {{ match.team1?.name }} vs {{ match.team2?.name }}
              </h2>
              <p class="text-xs text-slate-500 mt-1">{{ match.format }} • {{ match.venue }}</p>
            </div>

            <!-- Innings Selector -->
            @if (inningsEdit) {
              <div class="p-3 border-b border-slate-100 bg-slate-50">
                <select 
                  [(ngModel)]="selectedInningsIndex"
                  (change)="loadInningsData()"
                  class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  @for (innings of match.innings; track $index) {
                    <option [value]="$index">
                      {{ $index === 0 ? '1st' : '2nd' }} Innings - {{ getTeamNameById(innings.battingTeam) }} Batting
                    </option>
                  }
                </select>
                
                <!-- Innings Status Toggle -->
                <div class="mt-2 flex items-center justify-between">
                  <span class="text-xs text-slate-500">Innings Status:</span>
                  <div class="flex items-center gap-2">
                    @if (getInningsStatus() === 'completed') {
                      <span class="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">Completed</span>
                      <button 
                        (click)="setInningsStatus('in-progress')"
                        class="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                        title="Mark as in progress"
                      >
                        ↩ Resume
                      </button>
                      <button 
                        (click)="confirmResetInnings()"
                        class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        title="Reset to not started (clears stats)"
                      >
                        🔄 Reset
                      </button>
                    } @else if (getInningsStatus() === 'in-progress') {
                      <span class="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full animate-pulse">In Progress</span>
                      <button 
                        (click)="setInningsStatus('completed')"
                        class="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors"
                        title="Mark as completed"
                      >
                        ✓ End
                      </button>
                      <button 
                        (click)="confirmResetInnings()"
                        class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                        title="Reset to not started (clears stats)"
                      >
                        🔄 Reset
                      </button>
                    } @else {
                      <span class="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">Not Started</span>
                      <button 
                        (click)="setInningsStatus('in-progress')"
                        class="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                        title="Start innings"
                      >
                        ▶ Start
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Inline Editable Score Section -->
              <div class="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <!-- Main Score - Editable -->
                <div class="flex items-center gap-2 mb-3">
                  <div class="flex items-baseline gap-1">
                    <input 
                      type="number"
                      [(ngModel)]="inningsEdit.totalRuns"
                      (change)="markDirty()"
                      class="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-3xl font-bold text-white text-center focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0"
                    />
                    <span class="text-2xl text-slate-400">/</span>
                    <input 
                      type="number"
                      [(ngModel)]="inningsEdit.totalWickets"
                      (change)="markDirty()"
                      class="w-12 bg-white/10 border border-white/20 rounded px-2 py-1 text-3xl font-bold text-white text-center focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="0" max="10"
                    />
                  </div>
                </div>
                
                <!-- Overs - Editable (Overs + Balls) -->
                <div class="flex items-center gap-2 text-sm mb-3">
                  <input 
                    type="number"
                    [ngModel]="getOvers(inningsEdit.totalBalls)"
                    (ngModelChange)="updateOvers($event)"
                    class="w-12 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-center text-sm focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                  <span class="text-slate-500 text-xs">ov</span>
                  <input 
                    type="number"
                    [ngModel]="getBalls(inningsEdit.totalBalls)"
                    (ngModelChange)="updateBalls($event)"
                    class="w-12 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-center text-sm focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0" max="5"
                  />
                  <span class="text-slate-500 text-xs">balls</span>
                </div>
                
                <!-- Extras - Editable Grid -->
                <div class="pt-3 border-t border-white/10">
                  <div class="text-xs text-slate-400 mb-2">Extras ({{ calculateTotalExtras() }})</div>
                  <div class="grid grid-cols-4 gap-2">
                    <div>
                      <label class="block text-xs text-slate-500 mb-1">Wd</label>
                      <input 
                        type="number"
                        [(ngModel)]="inningsEdit.extras.wides"
                        (change)="markDirty()"
                        class="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-center text-sm focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-slate-500 mb-1">NB</label>
                      <input 
                        type="number"
                        [(ngModel)]="inningsEdit.extras.noBalls"
                        (change)="markDirty()"
                        class="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-center text-sm focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-slate-500 mb-1">B</label>
                      <input 
                        type="number"
                        [(ngModel)]="inningsEdit.extras.byes"
                        (change)="markDirty()"
                        class="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-center text-sm focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-slate-500 mb-1">LB</label>
                      <input 
                        type="number"
                        [(ngModel)]="inningsEdit.extras.legByes"
                        (change)="markDirty()"
                        class="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-center text-sm focus:ring-2 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <!-- Current Players -->
                <div class="mt-3 pt-3 border-t border-white/10 text-xs">
                  <div class="text-slate-400 mb-1">At Crease</div>
                  <div class="text-white font-medium">{{ getStrikerName() }}* / {{ getNonStrikerName() }}</div>
                </div>
              </div>
            }

            <!-- ESPN Sync Section -->
            <div class="p-4 border-b border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-base">📡</span>
                  <span class="font-semibold text-slate-700 text-sm">ESPN Sync</span>
                </div>
                @if (match.lastEspnSync) {
                  <span class="text-xs text-slate-400">
                    {{ match.lastEspnSync | date:'HH:mm' }}
                  </span>
                }
              </div>
              
              <input 
                type="text"
                [(ngModel)]="espnUrl"
                placeholder="ESPN scorecard URL..."
                class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg mb-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              
              <div class="flex gap-2">
                <button 
                  (click)="saveEspnUrl()"
                  [disabled]="!espnUrl || espnUrl === match.espnUrl || savingEspnUrl"
                  class="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ savingEspnUrl ? 'Saving...' : 'Save URL' }}
                </button>
                <button 
                  (click)="openEspnSyncModal()"
                  [disabled]="!match.espnUrl"
                  class="flex-1 px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  🔄 Sync Now
                </button>
              </div>

              <!-- Validation Status -->
              @if (validatingSquad) {
                <div class="mt-2 text-xs text-blue-500 animate-pulse">Validating squad...</div>
              } @else if (squadValidation) {
                @if (squadValidation.isValid) {
                  <div class="mt-2 text-xs text-emerald-600">✓ Squad matches ESPN</div>
                } @else {
                  <button 
                    (click)="showSquadValidationModal = true"
                    class="mt-2 text-xs text-amber-600 hover:text-amber-700"
                  >
                    ⚠ {{ squadValidation.mismatches.length }} squad issue(s) - View
                  </button>
                }
              }
            </div>

            <!-- Squad Management (Collapsed) -->
            <div class="p-4 border-b border-slate-100">
              <button 
                (click)="showSquadManagement = !showSquadManagement"
                class="w-full flex items-center justify-between text-sm"
              >
                <div class="flex items-center gap-2">
                  <span>👥</span>
                  <span class="font-semibold text-slate-700">Squad Management</span>
                </div>
                <span class="text-slate-400 text-xs">
                  {{ showSquadManagement ? '▼' : '▶' }}
                </span>
              </button>
            </div>

            <!-- Quick Validation -->
            @if (inningsEdit) {
              <div class="p-4">
                <div class="text-xs font-medium text-slate-500 mb-2">Quick Check</div>
                <div class="space-y-1.5 text-xs">
                  @if (calculateBatsmanTotal() + calculateTotalExtras() === inningsEdit.totalRuns) {
                    <div class="text-emerald-600">✓ Runs tally</div>
                  } @else {
                    <div class="text-red-500">✗ Runs mismatch ({{ calculateBatsmanTotal() }} + {{ calculateTotalExtras() }} ≠ {{ inningsEdit.totalRuns }})</div>
                  }
                  @if (countDismissedBatsmen() === inningsEdit.totalWickets) {
                    <div class="text-emerald-600">✓ Wickets tally</div>
                  } @else {
                    <div class="text-amber-500">⚠ Wickets: {{ countDismissedBatsmen() }} out ≠ {{ inningsEdit.totalWickets }}</div>
                  }
                  @if (hasStrikerAndNonStriker()) {
                    <div class="text-emerald-600">✓ Batsmen set</div>
                  } @else {
                    <div class="text-amber-500">⚠ Set striker/non-striker</div>
                  }
                </div>
                
                <!-- BIG Save Button -->
                <div class="mt-6">
                  <button 
                    (click)="saveAllChanges()"
                    [disabled]="saving"
                    [class]="isDirty 
                      ? 'w-full py-4 bg-emerald-500 text-white text-lg font-bold rounded-xl hover:bg-emerald-600 shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-3' 
                      : 'w-full py-4 bg-slate-100 text-slate-400 text-lg font-medium rounded-xl cursor-not-allowed flex items-center justify-center gap-3'"
                  >
                    <span class="text-2xl">💾</span>
                    <span>{{ saving ? 'Saving...' : (isDirty ? 'SAVE CHANGES' : 'No Changes') }}</span>
                  </button>
                  @if (isDirty) {
                    <button 
                      (click)="discardChanges()"
                      class="w-full mt-2 py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
                    >
                      Discard changes
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Last Updated -->
            <div class="p-3 border-t border-slate-100 mt-auto">
              <div class="text-xs text-slate-400 text-center">
                Updated: {{ lastUpdateTime | date:'HH:mm:ss' }}
              </div>
            </div>
          </div>

          <!-- Right Content Area - Tabs for Batting/Bowling -->
          <div class="flex-1 flex flex-col overflow-hidden">
            
            @if (inningsEdit) {
              <!-- Tab Bar -->
              <div class="bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-shrink-0">
                <div class="flex">
                  <button 
                    (click)="activeTab = 'batting'"
                    [class]="activeTab === 'batting' 
                      ? 'px-4 py-3 text-sm font-medium border-b-2 border-emerald-500 text-emerald-600' 
                      : 'px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700'"
                  >
                    🏏 Batting
                  </button>
                  <button 
                    (click)="activeTab = 'bowling'"
                    [class]="activeTab === 'bowling' 
                      ? 'px-4 py-3 text-sm font-medium border-b-2 border-blue-500 text-blue-600' 
                      : 'px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700'"
                  >
                    🎯 Bowling
                  </button>
                </div>

                <!-- Unsaved indicator -->
                @if (isDirty) {
                  <span class="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-full">
                    ● Unsaved changes
                  </span>
                }
              </div>

              <!-- Tab Content -->
              <div class="flex-1 overflow-auto p-4">
                
                <!-- Batting Tab -->
                @if (activeTab === 'batting') {
                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table class="w-full text-sm">
                      <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th class="px-4 py-3 text-left font-medium text-slate-600">Batsman</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-16">R</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-16">B</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-14">4s</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-14">6s</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-16">Out</th>
                          <th class="px-3 py-3 text-left font-medium text-slate-600 w-44">Dismissal</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-24">Strike</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-12"></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (bat of inningsEdit.battingStats; track bat.playerId) {
                          @if (!bat.toRemove) {
                            <tr 
                              [class]="getBattingRowClass(bat)"
                              class="hover:bg-slate-50/50 transition-colors"
                            >
                              <td class="px-4 py-2">
                                <div class="flex items-center gap-2">
                                  <span 
                                    class="font-medium"
                                    [class.text-slate-400]="bat.isNew && bat.runs === 0 && bat.balls === 0 && !bat.isStriker && !bat.isNonStriker"
                                  >
                                    {{ bat.playerName }}
                                  </span>
                                  @if (bat.isStriker) {
                                    <span class="text-emerald-500 text-xs font-bold">*</span>
                                  }
                                  @if (bat.isNew && bat.runs === 0 && bat.balls === 0 && !bat.isStriker && !bat.isNonStriker) {
                                    <span class="text-xs text-slate-400">(DNB)</span>
                                  }
                                </div>
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bat.runs"
                                  (change)="markDirty()"
                                  class="w-14 px-2 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bat.balls"
                                  (change)="markDirty()"
                                  class="w-14 px-2 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bat.fours"
                                  (change)="markDirty()"
                                  class="w-12 px-1 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bat.sixes"
                                  (change)="markDirty()"
                                  class="w-12 px-1 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="checkbox" 
                                  [(ngModel)]="bat.isOut"
                                  (change)="onOutStatusChange(bat)"
                                  class="w-4 h-4 text-red-500 rounded border-slate-300 focus:ring-red-500"
                                />
                              </td>
                              <td class="px-3 py-2">
                                @if (bat.isOut) {
                                  <div class="flex items-center gap-1">
                                    <select 
                                      [(ngModel)]="bat.dismissalType"
                                      (change)="markDirty()"
                                      class="text-xs px-2 py-1.5 border border-slate-200 rounded-lg w-24 focus:ring-2 focus:ring-emerald-500"
                                    >
                                      <option value="bowled">Bowled</option>
                                      <option value="caught">Caught</option>
                                      <option value="lbw">LBW</option>
                                      <option value="run-out">Run Out</option>
                                      <option value="stumped">Stumped</option>
                                      <option value="hit-wicket">Hit Wicket</option>
                                    </select>
                                    <button 
                                      (click)="openDismissalEditor(bat)"
                                      class="p-1 text-slate-400 hover:text-slate-600 rounded"
                                      title="Edit details"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                } @else {
                                  <span class="text-slate-300">—</span>
                                }
                              </td>
                              <td class="px-3 py-2">
                                <div class="flex justify-center gap-3">
                                  <label class="flex items-center gap-1 cursor-pointer" title="Striker">
                                    <input 
                                      type="radio" 
                                      name="striker"
                                      [checked]="bat.isStriker"
                                      (change)="setStriker(bat.playerId)"
                                      class="text-emerald-500 focus:ring-emerald-500"
                                      [disabled]="bat.isOut"
                                    />
                                    <span class="text-xs text-slate-500" [class.text-slate-300]="bat.isOut">*</span>
                                  </label>
                                  <label class="flex items-center gap-1 cursor-pointer" title="Non-Striker">
                                    <input 
                                      type="radio" 
                                      name="nonStriker"
                                      [checked]="bat.isNonStriker"
                                      (change)="setNonStriker(bat.playerId)"
                                      class="text-blue-500 focus:ring-blue-500"
                                      [disabled]="bat.isOut"
                                    />
                                    <span class="text-xs text-slate-500" [class.text-slate-300]="bat.isOut">○</span>
                                  </label>
                                </div>
                              </td>
                              <td class="px-3 py-2 text-center">
                                @if (!bat.isNew || bat.runs > 0 || bat.balls > 0 || bat.isOut) {
                                  <button 
                                    (click)="markBatsmanForRemoval(bat)"
                                    [disabled]="bat.isStriker || bat.isNonStriker"
                                    class="text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Remove"
                                  >
                                    🗑️
                                  </button>
                                }
                              </td>
                            </tr>
                          }
                        }
                      </tbody>
                      <tfoot class="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td class="px-4 py-2 font-medium text-slate-600">Total</td>
                          <td class="px-3 py-2 text-center font-bold text-slate-800">{{ calculateBatsmanTotal() }}</td>
                          <td colspan="7"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                }

                <!-- Bowling Tab -->
                @if (activeTab === 'bowling') {
                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table class="w-full text-sm">
                      <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th class="px-4 py-3 text-left font-medium text-slate-600">Bowler</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-20">O</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-14">M</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-16">R</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-14">W</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-14">Wd</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-14">NB</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-20">Bowling</th>
                          <th class="px-3 py-3 text-center font-medium text-slate-600 w-12"></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (bowl of inningsEdit.bowlingStats; track bowl.playerId) {
                          @if (!bowl.toRemove) {
                            <tr 
                              [class]="bowl.isBowling ? 'bg-blue-50/50' : (bowl.isNew && bowl.overs === '0.0' && !bowl.isBowling ? 'bg-slate-50/50' : '')"
                              class="hover:bg-slate-50/50 transition-colors"
                            >
                              <td class="px-4 py-2">
                                <div class="flex items-center gap-2">
                                  <span 
                                    class="font-medium"
                                    [class.text-slate-400]="bowl.isNew && bowl.overs === '0.0' && !bowl.isBowling"
                                  >
                                    {{ bowl.playerName }}
                                  </span>
                                  @if (bowl.isBowling) {
                                    <span class="text-blue-500 text-xs font-bold">●</span>
                                  }
                                  @if (bowl.isNew && bowl.overs === '0.0' && !bowl.isBowling) {
                                    <span class="text-xs text-slate-400">(DNB)</span>
                                  }
                                </div>
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="text" 
                                  [(ngModel)]="bowl.overs"
                                  (change)="markDirty()"
                                  class="w-16 px-2 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  placeholder="0.0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bowl.maidens"
                                  (change)="markDirty()"
                                  class="w-12 px-1 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bowl.runs"
                                  (change)="markDirty()"
                                  class="w-14 px-2 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bowl.wickets"
                                  (change)="markDirty()"
                                  class="w-12 px-1 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bowl.wides"
                                  (change)="markDirty()"
                                  class="w-12 px-1 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="number" 
                                  [(ngModel)]="bowl.noBalls"
                                  (change)="markDirty()"
                                  class="w-12 px-1 py-1.5 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  min="0"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                <input 
                                  type="radio" 
                                  name="currentBowler"
                                  [checked]="bowl.isBowling"
                                  (change)="setCurrentBowler(bowl.playerId)"
                                  class="text-blue-500 focus:ring-blue-500"
                                />
                              </td>
                              <td class="px-3 py-2 text-center">
                                @if (!bowl.isNew || bowl.overs !== '0.0' || bowl.runs > 0 || bowl.wickets > 0) {
                                  <button 
                                    (click)="markBowlerForRemoval(bowl)"
                                    [disabled]="bowl.isBowling"
                                    class="text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Remove"
                                  >
                                    🗑️
                                  </button>
                                }
                              </td>
                            </tr>
                          }
                        }
                      </tbody>
                      <tfoot class="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td class="px-4 py-2 font-medium text-slate-600">Total</td>
                          <td class="px-3 py-2 text-center font-bold text-slate-800">{{ calculateBowlerOversTotal() }}</td>
                          <td class="px-3 py-2 text-center font-bold text-slate-800">{{ calculateBowlerMaidensTotal() }}</td>
                          <td class="px-3 py-2 text-center font-bold text-slate-800">{{ calculateBowlerRunsTotal() }}</td>
                          <td class="px-3 py-2 text-center font-bold text-slate-800">{{ calculateBowlerWicketsTotal() }}</td>
                          <td colspan="4"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                }
              </div>
            } @else {
              <div class="flex-1 flex items-center justify-center text-slate-400">
                Select an innings to edit
              </div>
            }
          </div>
        </div>
      }

      <!-- Toast Notifications -->
      @if (toastMessage) {
        <div class="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-pulse z-50">
          <span>{{ toastMessage }}</span>
        </div>
      }

      <!-- Error Display -->
      @if (error) {
        <div class="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-md z-50">
          {{ error }}
          <button (click)="error = ''" class="ml-2 font-bold hover:opacity-75">×</button>
        </div>
      }

      
      <!-- Squad Management Modal -->
      @if (showSquadManagement) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h3 class="text-lg font-semibold text-slate-800">Squad Management</h3>
              <button (click)="showSquadManagement = false" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div class="flex-1 overflow-auto p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Team 1 Squad -->
                <div class="border border-slate-200 rounded-lg overflow-hidden">
                  <div class="p-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-emerald-800">{{ match?.team1?.name }}</span>
                      <span class="text-xs px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full">{{ team1SquadList.length }}/30</span>
                    </div>
                    <button 
                      (click)="openAddToSquadModal('team1')"
                      [disabled]="team1SquadList.length >= 30"
                      class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                  <div 
                    cdkDropList
                    #team1List="cdkDropList"
                    [cdkDropListData]="team1SquadList"
                    (cdkDropListDropped)="onSquadDrop($event, 'team1')"
                    class="p-2 space-y-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-slate-50"
                  >
                    @for (player of team1SquadList; track player.playerId; let i = $index) {
                      <div 
                        cdkDrag
                        class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 cursor-grab active:cursor-grabbing hover:border-emerald-300 transition-all group"
                      >
                        <span class="text-xs text-slate-400 font-mono w-5">#{{ i + 1 }}</span>
                        <span class="flex-1 text-sm font-medium truncate">{{ player.name }}</span>
                        <button 
                          (click)="removeFromSquad('team1', player.playerId); $event.stopPropagation()"
                          [disabled]="squadUpdating"
                          class="text-slate-300 hover:text-red-500 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    }
                    @if (team1SquadList.length === 0) {
                      <div class="text-slate-400 text-sm text-center py-8">No players in squad</div>
                    }
                  </div>
                </div>
                
                <!-- Team 2 Squad -->
                <div class="border border-slate-200 rounded-lg overflow-hidden">
                  <div class="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-blue-800">{{ match?.team2?.name }}</span>
                      <span class="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full">{{ team2SquadList.length }}/30</span>
                    </div>
                    <button 
                      (click)="openAddToSquadModal('team2')"
                      [disabled]="team2SquadList.length >= 30"
                      class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                  <div 
                    cdkDropList
                    #team2List="cdkDropList"
                    [cdkDropListData]="team2SquadList"
                    (cdkDropListDropped)="onSquadDrop($event, 'team2')"
                    class="p-2 space-y-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-slate-50"
                  >
                    @for (player of team2SquadList; track player.playerId; let i = $index) {
                      <div 
                        cdkDrag
                        class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all group"
                      >
                        <span class="text-xs text-slate-400 font-mono w-5">#{{ i + 1 }}</span>
                        <span class="flex-1 text-sm font-medium truncate">{{ player.name }}</span>
                        <button 
                          (click)="removeFromSquad('team2', player.playerId); $event.stopPropagation()"
                          [disabled]="squadUpdating"
                          class="text-slate-300 hover:text-red-500 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    }
                    @if (team2SquadList.length === 0) {
                      <div class="text-slate-400 text-sm text-center py-8">No players in squad</div>
                    }
                  </div>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-4 text-center">
                💡 Drag players to reorder batting position
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Squad Validation Modal -->
      @if (showSquadValidationModal && squadValidation && !squadValidation.isValid) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
              <h3 class="text-lg font-semibold text-amber-600">⚠ Squad Validation Issues</h3>
              <button (click)="showSquadValidationModal = false" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div class="flex-1 overflow-auto p-4 space-y-3">
              @for (mismatch of squadValidation.mismatches; track mismatch.espnName) {
                <div class="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div class="flex items-center gap-2 flex-wrap text-sm">
                    <span class="text-slate-600">ESPN:</span>
                    <span class="font-medium">{{ mismatch.espnName }}</span>
                    <span class="text-slate-400">→</span>
                    @if (mismatch.matchedTo) {
                      <span class="text-amber-600">{{ mismatch.matchedTo }}</span>
                      <span class="text-xs text-slate-400">({{ mismatch.matchScore }}%)</span>
                    } @else {
                      <span class="text-red-600">Not found</span>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="p-4 border-t border-slate-200 bg-slate-50">
              <p class="text-xs text-slate-500">
                Fix squad issues before syncing to avoid wrong player assignments.
              </p>
            </div>
          </div>
        </div>
      }

      <!-- ESPN Sync Modal -->
      @if (showEspnSyncModal) {
        <app-espn-sync-modal
          [matchId]="matchId"
          [espnUrl]="match?.espnUrl || undefined"
          (onClose)="closeEspnSyncModal()"
          (onSyncComplete)="onEspnSyncComplete()"
        />
      }

      <!-- Dismissal Editor Modal -->
      @if (showDismissalModal && editingDismissal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b border-slate-200">
              <h3 class="text-lg font-semibold text-slate-800">Edit Dismissal - {{ editingDismissal.playerName }}</h3>
            </div>
            <div class="p-4 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Dismissal Type</label>
                <select 
                  [(ngModel)]="editingDismissal.dismissalType"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="run-out">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="hit-wicket">Hit Wicket</option>
                </select>
              </div>

              @if (needsBowlerForDismissal(editingDismissal.dismissalType)) {
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-2">Bowler</label>
                  <select 
                    [(ngModel)]="editingDismissal.dismissalBowlerId"
                    class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option [value]="null">Select Bowler</option>
                    @for (bowl of inningsEdit?.bowlingStats || []; track bowl.playerId) {
                      <option [value]="bowl.playerId">{{ bowl.playerName }}</option>
                    }
                  </select>
                </div>
              }

              @if (needsFielderForDismissal(editingDismissal.dismissalType)) {
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-2">Fielder</label>
                  <select 
                    [(ngModel)]="editingDismissal.dismissalFielderId"
                    class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option [value]="null">Select Fielder</option>
                    @for (player of getBowlingTeamPlayers(); track player.playerId) {
                      <option [value]="player.playerId">{{ player.name }}</option>
                    }
                  </select>
                </div>
              }
            </div>
            <div class="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                (click)="closeDismissalEditor()"
                class="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                (click)="saveDismissalEdit()"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Add to Squad Modal -->
      @if (showAddToSquadModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 class="text-lg font-semibold text-slate-800">Add Player to {{ addToSquadTeam === 'team1' ? match?.team1?.name : match?.team2?.name }}</h3>
              <button (click)="closeAddToSquadModal()" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div class="p-4 border-b border-slate-100">
              <input 
                type="text"
                [(ngModel)]="squadPlayerSearch"
                placeholder="Search players..."
                class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              @if (loadingCountryPlayers) {
                <div class="text-center text-slate-400 py-8">Loading players...</div>
              } @else if (getFilteredCountryPlayers().length === 0) {
                <div class="text-center text-slate-400 py-8">
                  {{ squadPlayerSearch ? 'No players match "' + squadPlayerSearch + '"' : 'No players available' }}
                </div>
              } @else {
                <div class="space-y-2">
                  @for (player of getFilteredCountryPlayers(); track player._id) {
                    <button 
                      (click)="addPlayerToSquad(player._id)"
                      [disabled]="squadUpdating"
                      class="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span class="font-medium text-slate-800">{{ player.name }}</span>
                        @if (player.role) {
                          <span class="text-xs text-slate-500 ml-2">({{ player.role }})</span>
                        }
                      </div>
                      <span class="text-emerald-600 text-sm">+ Add</span>
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MatchEditorComponent implements OnInit, OnDestroy {
  matchId: string = '';
  match: Match | null = null;
  loading = true;
  saving = false;
  error = '';
  toastMessage = '';
  
  selectedInningsIndex = 0;
  inningsEdit: InningsEdit | null = null;
  originalInningsData: string = '';
  isDirty = false;
  lastUpdateTime = new Date();
  
  // UI State
  activeTab: 'batting' | 'bowling' = 'batting';
  // showTotalsModal removed - using inline editing now
  showSquadValidationModal = false;
  
  // SSE
  private eventSource: EventSource | null = null;
  
  // Modals
  showAddBatsmanModal = false;
  showAddBowlerModal = false;
  showDismissalModal = false;
  editingDismissal: BattingStatEdit | null = null;

  // ESPN Sync
  showEspnSyncModal = false;
  espnUrl = '';
  savingEspnUrl = false;
  
  // Squad Validation
  squadValidation: SquadValidationResult | null = null;
  validatingSquad = false;
  autoValidateTriggered = false;

  // Cache for player data
  private battingTeamPlayers: Array<{playerId: string, name: string}> = [];
  private bowlingTeamPlayers: Array<{playerId: string, name: string}> = [];

  // Squad Management
  showSquadManagement = false;
  squadUpdating = false;
  team1SquadList: Array<{playerId: string, name: string, battingOrder: number}> = [];
  team2SquadList: Array<{playerId: string, name: string, battingOrder: number}> = [];
  
  // Add to Squad Modal
  showAddToSquadModal = false;
  addToSquadTeam: 'team1' | 'team2' = 'team1';
  squadPlayerSearch = '';
  countryPlayers: Player[] = [];
  loadingCountryPlayers = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private scoringService: ScoringService,
    private espnService: EspnService,
    private playerService: PlayerService
  ) {}

  ngOnInit(): void {
    this.matchId = this.route.snapshot.paramMap.get('id') || '';
    if (this.matchId) {
      this.loadMatch();
      this.setupSSE();
    }
  }

  ngOnDestroy(): void {
    this.closeSSE();
  }

  loadMatch(): void {
    this.loading = true;
    this.matchService.getById(this.matchId).subscribe({
      next: (response: ApiResponse<Match>) => {
        if (response.success && response.data) {
          this.match = response.data;
          this.espnUrl = this.match.espnUrl || '';
          this.selectedInningsIndex = this.match?.currentInnings || 0;
          this.buildSquadLists();
          this.cacheTeamPlayers();
          this.loadInningsData();
          
          if (this.match.espnUrl && !this.autoValidateTriggered) {
            this.autoValidateTriggered = true;
            this.validateSquad();
          }
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Failed to load match';
        this.loading = false;
      }
    });
  }

  private cacheTeamPlayers(): void {
    if (!this.match) return;

    const innings = this.match.innings?.[this.selectedInningsIndex];
    if (!innings) return;

    const battingTeamId = innings.battingTeam?._id || innings.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;

    const battingSquad = battingTeamId?.toString() === team1Id?.toString()
      ? this.match.squads?.team1
      : this.match.squads?.team2;

    const bowlingSquad = battingTeamId?.toString() === team1Id?.toString()
      ? this.match.squads?.team2
      : this.match.squads?.team1;

    this.battingTeamPlayers = (battingSquad || [])
      .map((p: any) => ({
        playerId: (p.player?._id || p.player)?.toString(),
        name: p.player?.name || 'Unknown'
      }));

    this.bowlingTeamPlayers = (bowlingSquad || [])
      .map((p: any) => ({
        playerId: (p.player?._id || p.player)?.toString(),
        name: p.player?.name || 'Unknown'
      }));
  }

  loadInningsData(): void {
    if (!this.match?.innings?.[this.selectedInningsIndex]) {
      this.inningsEdit = null;
      return;
    }

    this.cacheTeamPlayers();
    const innings = this.match.innings[this.selectedInningsIndex];
    const strikerId = (innings.currentBatsmen?.striker?._id || innings.currentBatsmen?.striker)?.toString();
    const nonStrikerId = (innings.currentBatsmen?.nonStriker?._id || innings.currentBatsmen?.nonStriker)?.toString();
    const currentBowlerId = (innings.currentBowler?._id || innings.currentBowler)?.toString();

    const existingBattingStatsMap = new Map<string, any>();
    (innings.battingStats || []).forEach((bs: any) => {
      const playerId = (bs.player?._id || bs.player)?.toString();
      existingBattingStatsMap.set(playerId, bs);
    });

    const battingStats: BattingStatEdit[] = this.battingTeamPlayers.map(player => {
      const bs = existingBattingStatsMap.get(player.playerId);
      if (bs) {
        return {
          playerId: player.playerId,
          playerName: player.name,
          runs: bs.runs || 0,
          balls: bs.balls || 0,
          fours: bs.fours || 0,
          sixes: bs.sixes || 0,
          isOut: bs.isOut || false,
          dismissalType: bs.dismissal?.type || null,
          dismissalBowlerId: (bs.dismissal?.bowler?._id || bs.dismissal?.bowler)?.toString() || null,
          dismissalFielderId: (bs.dismissal?.fielder?._id || bs.dismissal?.fielder)?.toString() || null,
          isStriker: player.playerId === strikerId,
          isNonStriker: player.playerId === nonStrikerId
        };
      } else {
        return {
          playerId: player.playerId,
          playerName: player.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          dismissalType: null,
          dismissalBowlerId: null,
          dismissalFielderId: null,
          isStriker: player.playerId === strikerId,
          isNonStriker: player.playerId === nonStrikerId,
          isNew: true
        };
      }
    });

    const existingBowlingStatsMap = new Map<string, any>();
    (innings.bowlingStats || []).forEach((bs: any) => {
      const playerId = (bs.player?._id || bs.player)?.toString();
      existingBowlingStatsMap.set(playerId, bs);
    });

    const bowlingStats: BowlingStatEdit[] = this.bowlingTeamPlayers.map(player => {
      const bs = existingBowlingStatsMap.get(player.playerId);
      if (bs) {
        const overs = bs.overs || 0;
        const balls = bs.balls || 0;
        return {
          playerId: player.playerId,
          playerName: player.name,
          overs: `${overs}.${balls}`,
          maidens: bs.maidens || 0,
          runs: bs.runs || 0,
          wickets: bs.wickets || 0,
          wides: bs.wides || 0,
          noBalls: bs.noBalls || 0,
          isBowling: player.playerId === currentBowlerId
        };
      } else {
        return {
          playerId: player.playerId,
          playerName: player.name,
          overs: '0.0',
          maidens: 0,
          runs: 0,
          wickets: 0,
          wides: 0,
          noBalls: 0,
          isBowling: player.playerId === currentBowlerId,
          isNew: true
        };
      }
    });

    this.inningsEdit = {
      totalRuns: innings.totalRuns || 0,
      totalWickets: innings.totalWickets || 0,
      totalBalls: innings.totalBalls || 0,
      extras: {
        wides: innings.extras?.wides || 0,
        noBalls: innings.extras?.noBalls || 0,
        byes: innings.extras?.byes || 0,
        legByes: innings.extras?.legByes || 0
      },
      battingStats,
      bowlingStats
    };

    this.originalInningsData = JSON.stringify(this.inningsEdit);
    this.isDirty = false;
    this.lastUpdateTime = new Date();
  }

  // SSE Setup
  private setupSSE(): void {
    this.closeSSE();
    
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);
    
    this.eventSource.addEventListener('score-update', (event: any) => {
      const data = JSON.parse(event.data);
      if (!data.bulkUpdate) {
        this.showToast('Score updated on scoring screen');
        this.refreshMatchData();
      }
    });
    
    // Listen for innings start (new innings)
    this.eventSource.addEventListener('innings-start', (event: any) => {
      console.log('[Match Editor] New innings started via SSE');
      this.refreshMatchData();
    });
    
    // Listen for innings complete
    this.eventSource.addEventListener('innings-complete', (event: any) => {
      console.log('[Match Editor] Innings complete via SSE');
      this.refreshMatchData();
    });

    this.eventSource.onerror = () => {
      setTimeout(() => this.setupSSE(), 5000);
    };
  }

  private closeSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private refreshMatchData(): void {
    if (this.isDirty) return;
    
    this.matchService.getById(this.matchId).subscribe({
      next: (response: ApiResponse<Match>) => {
        if (response.success && response.data) {
          const previousInningsCount = this.match?.innings?.length || 0;
          const newInningsCount = response.data.innings?.length || 0;
          const previousCurrentInnings = this.match?.currentInnings;
          const newCurrentInnings = response.data.currentInnings;
          
          this.match = response.data;
          
          // If a new innings was started or currentInnings changed, switch to it
          if (newInningsCount > previousInningsCount || 
              (newCurrentInnings !== undefined && newCurrentInnings !== previousCurrentInnings)) {
            this.selectedInningsIndex = newCurrentInnings ?? (newInningsCount - 1);
            this.buildSquadLists();
            this.cacheTeamPlayers();
            this.showToast('New innings started');
          }
          
          this.loadInningsData();
        }
      }
    });
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => {
      this.toastMessage = '';
    }, 3000);
  }

  // Helpers
  getTeamNameById(teamId: any): string {
    if (!this.match) return '';
    const id = teamId?._id || teamId;
    if (this.match.team1?._id === id || this.match.team1 === id) {
      return this.match.team1?.name || '';
    }
    if (this.match.team2?._id === id || this.match.team2 === id) {
      return this.match.team2?.name || '';
    }
    return teamId?.name || '';
  }

  getOversDisplay(totalBalls: number): string {
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    return `${overs}.${balls}`;
  }

  // Overs/Balls helpers for inline editing
  getOvers(totalBalls: number): number {
    return Math.floor(totalBalls / 6);
  }

  getBalls(totalBalls: number): number {
    return totalBalls % 6;
  }

  updateOvers(overs: number): void {
    if (!this.inningsEdit) return;
    const currentBalls = this.inningsEdit.totalBalls % 6;
    this.inningsEdit.totalBalls = (overs * 6) + currentBalls;
    this.markDirty();
  }

  updateBalls(balls: number): void {
    if (!this.inningsEdit) return;
    // Ensure balls is between 0-5
    const safeBalls = Math.max(0, Math.min(5, balls));
    const currentOvers = Math.floor(this.inningsEdit.totalBalls / 6);
    this.inningsEdit.totalBalls = (currentOvers * 6) + safeBalls;
    this.markDirty();
  }

  getStrikerName(): string {
    const striker = this.inningsEdit?.battingStats.find(b => b.isStriker);
    return striker?.playerName || 'None';
  }

  getNonStrikerName(): string {
    const ns = this.inningsEdit?.battingStats.find(b => b.isNonStriker);
    return ns?.playerName || 'None';
  }

  getCurrentBowlerName(): string {
    const bowler = this.inningsEdit?.bowlingStats.find(b => b.isBowling);
    return bowler?.playerName || 'None';
  }

  getBattingRowClass(bat: BattingStatEdit): string {
    if (bat.isStriker) return 'bg-emerald-50/70';
    if (bat.isNonStriker) return 'bg-blue-50/50';
    if (bat.isOut) return 'bg-red-50/50';
    if (bat.isNew && bat.runs === 0 && bat.balls === 0) return 'bg-slate-50/50';
    return '';
  }

  // Calculations
  calculateBatsmanTotal(): number {
    if (!this.inningsEdit) return 0;
    return this.inningsEdit.battingStats
      .filter(b => !b.toRemove)
      .reduce((sum, b) => sum + (b.runs || 0), 0);
  }

  calculateTotalExtras(): number {
    if (!this.inningsEdit) return 0;
    const e = this.inningsEdit.extras;
    return (e.wides || 0) + (e.noBalls || 0) + (e.byes || 0) + (e.legByes || 0);
  }

  calculateBowlerOversTotal(): string {
    if (!this.inningsEdit) return '0.0';
    let totalBalls = 0;
    this.inningsEdit.bowlingStats
      .filter(b => !b.toRemove)
      .forEach(b => {
        const parts = (b.overs || '0.0').split('.');
        const overs = parseInt(parts[0]) || 0;
        const balls = parseInt(parts[1]) || 0;
        totalBalls += overs * 6 + balls;
      });
    return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
  }

  calculateBowlerMaidensTotal(): number {
    if (!this.inningsEdit) return 0;
    return this.inningsEdit.bowlingStats
      .filter(b => !b.toRemove)
      .reduce((sum, b) => sum + (b.maidens || 0), 0);
  }

  calculateBowlerRunsTotal(): number {
    if (!this.inningsEdit) return 0;
    return this.inningsEdit.bowlingStats
      .filter(b => !b.toRemove)
      .reduce((sum, b) => sum + (b.runs || 0), 0);
  }

  calculateBowlerWicketsTotal(): number {
    if (!this.inningsEdit) return 0;
    return this.inningsEdit.bowlingStats
      .filter(b => !b.toRemove)
      .reduce((sum, b) => sum + (b.wickets || 0), 0);
  }

  countDismissedBatsmen(): number {
    if (!this.inningsEdit) return 0;
    return this.inningsEdit.battingStats
      .filter(b => !b.toRemove && b.isOut)
      .length;
  }

  hasStrikerAndNonStriker(): boolean {
    if (!this.inningsEdit) return false;
    const hasStriker = this.inningsEdit.battingStats.some(b => b.isStriker && !b.toRemove);
    const hasNonStriker = this.inningsEdit.battingStats.some(b => b.isNonStriker && !b.toRemove);
    return hasStriker && hasNonStriker;
  }

  // Actions
  markDirty(): void {
    this.isDirty = JSON.stringify(this.inningsEdit) !== this.originalInningsData;
  }

  onOutStatusChange(bat: BattingStatEdit): void {
    if (bat.isOut && !bat.dismissalType) {
      bat.dismissalType = 'bowled';
    } else if (!bat.isOut) {
      bat.dismissalType = null;
      bat.dismissalBowlerId = null;
      bat.dismissalFielderId = null;
    }
    
    if (bat.isOut) {
      bat.isStriker = false;
      bat.isNonStriker = false;
    }
    
    this.markDirty();
  }

  setStriker(playerId: string): void {
    if (!this.inningsEdit) return;
    this.inningsEdit.battingStats.forEach(b => {
      b.isStriker = b.playerId === playerId;
      if (b.isStriker && b.isNonStriker) {
        b.isNonStriker = false;
      }
    });
    this.markDirty();
  }

  setNonStriker(playerId: string): void {
    if (!this.inningsEdit) return;
    this.inningsEdit.battingStats.forEach(b => {
      b.isNonStriker = b.playerId === playerId;
      if (b.isNonStriker && b.isStriker) {
        b.isStriker = false;
      }
    });
    this.markDirty();
  }

  setCurrentBowler(playerId: string): void {
    if (!this.inningsEdit) return;
    this.inningsEdit.bowlingStats.forEach(b => {
      b.isBowling = b.playerId === playerId;
    });
    this.markDirty();
  }

  markBatsmanForRemoval(bat: BattingStatEdit): void {
    if (bat.isStriker || bat.isNonStriker) {
      this.error = 'Cannot remove current batsman. Reassign first.';
      return;
    }
    bat.toRemove = true;
    this.markDirty();
  }

  markBowlerForRemoval(bowl: BowlingStatEdit): void {
    if (bowl.isBowling) {
      this.error = 'Cannot remove current bowler. Reassign first.';
      return;
    }
    bowl.toRemove = true;
    this.markDirty();
  }

  // Dismissal editor
  openDismissalEditor(bat: BattingStatEdit): void {
    this.editingDismissal = { ...bat };
    this.showDismissalModal = true;
  }

  closeDismissalEditor(): void {
    this.showDismissalModal = false;
    this.editingDismissal = null;
  }

  saveDismissalEdit(): void {
    if (!this.editingDismissal || !this.inningsEdit) return;
    
    const bat = this.inningsEdit.battingStats.find(b => b.playerId === this.editingDismissal!.playerId);
    if (bat) {
      bat.dismissalType = this.editingDismissal.dismissalType;
      bat.dismissalBowlerId = this.editingDismissal.dismissalBowlerId;
      bat.dismissalFielderId = this.editingDismissal.dismissalFielderId;
    }
    
    this.closeDismissalEditor();
    this.markDirty();
  }

  needsBowlerForDismissal(type: string | null): boolean {
    return ['bowled', 'caught', 'lbw', 'stumped', 'hit-wicket'].includes(type || '');
  }

  needsFielderForDismissal(type: string | null): boolean {
    return ['caught', 'run-out', 'stumped'].includes(type || '');
  }

  getBowlingTeamPlayers(): Array<{playerId: string, name: string}> {
    return this.bowlingTeamPlayers;
  }

  // Save / Discard
  discardChanges(): void {
    this.loadInningsData();
  }

  saveAllChanges(): void {
    if (!this.inningsEdit || !this.match) return;

    this.saving = true;
    this.error = '';

    const battingStats = this.inningsEdit.battingStats
      .filter(b => !b.toRemove)
      .filter(b => {
        if (!b.isNew) return true;
        return b.runs > 0 || b.balls > 0 || b.isOut || b.isStriker || b.isNonStriker;
      })
      .map(b => ({
        playerId: b.playerId,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        isOut: b.isOut,
        dismissal: b.isOut && b.dismissalType ? {
          type: b.dismissalType,
          bowlerId: b.dismissalBowlerId || undefined,
          fielderId: b.dismissalFielderId || undefined
        } : undefined,
        isNew: b.isNew
      }));

    const bowlingStats = this.inningsEdit.bowlingStats
      .filter(b => !b.toRemove)
      .filter(b => {
        if (!b.isNew) return true;
        return b.overs !== '0.0' || b.runs > 0 || b.wickets > 0 || b.wides > 0 || b.noBalls > 0 || b.isBowling;
      })
      .map(b => ({
        playerId: b.playerId,
        overs: b.overs,
        maidens: b.maidens,
        runs: b.runs,
        wickets: b.wickets,
        wides: b.wides,
        noBalls: b.noBalls,
        isNew: b.isNew
      }));

    const removedBatsmen = this.inningsEdit.battingStats
      .filter(b => b.toRemove)
      .map(b => b.playerId);

    const removedBowlers = this.inningsEdit.bowlingStats
      .filter(b => b.toRemove)
      .map(b => b.playerId);

    const striker = this.inningsEdit.battingStats.find(b => b.isStriker && !b.toRemove);
    const nonStriker = this.inningsEdit.battingStats.find(b => b.isNonStriker && !b.toRemove);
    const currentBowler = this.inningsEdit.bowlingStats.find(b => b.isBowling && !b.toRemove);

    const updateData: any = {
      inningsIndex: this.selectedInningsIndex,
      battingStats,
      bowlingStats,
      removedBatsmen,
      removedBowlers,
      currentBatsmen: {
        striker: striker?.playerId,
        nonStriker: nonStriker?.playerId
      },
      currentBowler: currentBowler?.playerId || null,
      totals: {
        runs: this.inningsEdit.totalRuns,
        wickets: this.inningsEdit.totalWickets,
        balls: this.inningsEdit.totalBalls
      },
      extras: this.inningsEdit.extras
    };

    this.scoringService.bulkUpdateInnings(this.matchId, updateData).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.match = response.data.match;
          this.loadInningsData();
          this.showToast('Changes saved successfully');
        } else {
          this.error = response.message || 'Failed to save changes';
        }
        this.saving = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Failed to save changes';
        this.saving = false;
      }
    });
  }

  // ESPN Sync Methods
  saveEspnUrl(): void {
    if (!this.espnUrl || this.espnUrl === this.match?.espnUrl) return;

    this.savingEspnUrl = true;
    this.espnService.setMatchEspnUrl(this.matchId, this.espnUrl).subscribe({
      next: (response) => {
        if (response.success && this.match) {
          this.match.espnUrl = this.espnUrl;
          this.showToast('ESPN URL saved');
          this.validateSquad();
        }
        this.savingEspnUrl = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save ESPN URL';
        this.savingEspnUrl = false;
      }
    });
  }

  validateSquad(): void {
    if (!this.match?.espnUrl) {
      this.error = 'No ESPN URL set for this match';
      return;
    }

    this.validatingSquad = true;
    this.squadValidation = null;

    this.espnService.validateSquad(this.matchId, this.match.espnUrl).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.squadValidation = response.data;
          
          if (!response.data.isValid) {
            const issues = response.data.mismatches.length;
            if (issues > 0) {
              this.showToast(`⚠️ ${issues} squad issue(s) found`);
            }
          } else {
            this.showToast('✓ Squad validated');
          }
        }
        this.validatingSquad = false;
      },
      error: (err) => {
        console.error('Squad validation error:', err);
        this.validatingSquad = false;
      }
    });
  }

  openEspnSyncModal(): void {
    if (!this.match?.espnUrl) {
      this.error = 'Please save an ESPN URL first';
      return;
    }
    this.showEspnSyncModal = true;
  }

  closeEspnSyncModal(): void {
    this.showEspnSyncModal = false;
  }

  onEspnSyncComplete(): void {
    this.showEspnSyncModal = false;
    this.showToast('Match data synced from ESPN');
    this.loadMatch();
  }

  // Squad Management Methods
  private buildSquadLists(): void {
    if (!this.match?.squads) return;
    
    this.team1SquadList = (this.match.squads.team1 || []).map((p: any) => ({
      playerId: (p.player?._id || p.player)?.toString(),
      name: p.player?.name || 'Unknown',
      battingOrder: p.battingOrder || 99
    })).sort((a: any, b: any) => a.battingOrder - b.battingOrder);
    
    this.team2SquadList = (this.match.squads.team2 || []).map((p: any) => ({
      playerId: (p.player?._id || p.player)?.toString(),
      name: p.player?.name || 'Unknown',
      battingOrder: p.battingOrder || 99
    })).sort((a: any, b: any) => a.battingOrder - b.battingOrder);
  }

  onSquadDrop(event: CdkDragDrop<any[]>, team: 'team1' | 'team2'): void {
    const squadList = team === 'team1' ? this.team1SquadList : this.team2SquadList;
    
    if (event.previousIndex === event.currentIndex) return;
    
    moveItemInArray(squadList, event.previousIndex, event.currentIndex);
    this.saveSquadOrder(team, squadList);
  }

  private saveSquadOrder(team: 'team1' | 'team2', squadList: Array<{playerId: string, name: string, battingOrder: number}>): void {
    if (!this.match) return;
    
    this.squadUpdating = true;
    
    const reorderedSquad = squadList.map((p, index) => ({
      playerId: p.playerId,
      battingOrder: index + 1
    }));
    
    this.matchService.reorderSquad(this.matchId, {
      team,
      squad: reorderedSquad
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.match!.squads = response.data;
          this.buildSquadLists();
          this.cacheTeamPlayers();
          this.loadInningsData();
        } else {
          this.error = response.message || 'Failed to save order';
          this.buildSquadLists();
        }
        this.squadUpdating = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save order';
        this.buildSquadLists();
        this.squadUpdating = false;
      }
    });
  }

  getTeam1SquadPlayers(): Array<{playerId: string, name: string}> {
    return this.team1SquadList;
  }

  getTeam2SquadPlayers(): Array<{playerId: string, name: string}> {
    return this.team2SquadList;
  }

  openAddToSquadModal(team: 'team1' | 'team2'): void {
    this.addToSquadTeam = team;
    this.squadPlayerSearch = '';
    this.showAddToSquadModal = true;
    this.loadCountryPlayers();
  }

  closeAddToSquadModal(): void {
    this.showAddToSquadModal = false;
    this.countryPlayers = [];
  }

  loadCountryPlayers(): void {
    if (!this.match) return;
    
    const countryId = this.addToSquadTeam === 'team1' 
      ? (this.match.team1?._id || this.match.team1)
      : (this.match.team2?._id || this.match.team2);
    
    if (!countryId) return;

    this.loadingCountryPlayers = true;
    const playerGender: 'M' | 'F' = this.match.gender === 'men' ? 'M' : 'F';
    this.playerService.getAll({ 
      country: countryId.toString(),
      gender: playerGender
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.countryPlayers = response.data;
        }
        this.loadingCountryPlayers = false;
      },
      error: () => {
        this.loadingCountryPlayers = false;
      }
    });
  }

  getFilteredCountryPlayers(): Player[] {
    const currentSquadIds = this.addToSquadTeam === 'team1'
      ? this.getTeam1SquadPlayers().map(p => p.playerId)
      : this.getTeam2SquadPlayers().map(p => p.playerId);
    
    return this.countryPlayers
      .filter(p => !currentSquadIds.includes(p._id))
      .filter(p => {
        if (!this.squadPlayerSearch) return true;
        return p.name.toLowerCase().includes(this.squadPlayerSearch.toLowerCase());
      });
  }

  addPlayerToSquad(playerId: string): void {
    if (!this.match) return;
    
    this.squadUpdating = true;
    
    this.matchService.updateSquad(this.matchId, {
      team: this.addToSquadTeam,
      action: 'add',
      playerId
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.match!.squads = response.data;
          this.showToast('Player added to squad');
          this.buildSquadLists();
          this.cacheTeamPlayers();
          this.loadInningsData();
          this.loadCountryPlayers();
        } else {
          this.error = response.message || 'Failed to add player';
        }
        this.squadUpdating = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to add player';
        this.squadUpdating = false;
      }
    });
  }

  removeFromSquad(team: 'team1' | 'team2', playerId: string): void {
    if (!this.match) return;
    
    if (!confirm('Remove this player from the squad?')) return;
    
    this.squadUpdating = true;
    
    this.matchService.updateSquad(this.matchId, {
      team,
      action: 'remove',
      playerId
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.match!.squads = response.data;
          this.showToast('Player removed from squad');
          this.buildSquadLists();
          this.cacheTeamPlayers();
          this.loadInningsData();
        } else {
          this.error = response.message || 'Failed to remove player';
        }
        this.squadUpdating = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to remove player';
        this.squadUpdating = false;
      }
    });
  }

  // Innings Status Methods
  getInningsStatus(): string {
    if (!this.match?.innings?.[this.selectedInningsIndex]) return 'not-started';
    return this.match.innings[this.selectedInningsIndex].status || 'not-started';
  }

  setInningsStatus(status: 'not-started' | 'in-progress' | 'completed'): void {
    if (!this.match) return;
    
    this.saving = true;
    
    this.matchService.updateInningsStatus(this.matchId, this.selectedInningsIndex, status).subscribe({
      next: (response: ApiResponse<Match>) => {
        if (response.success && response.data) {
          this.match = response.data;
          this.loadInningsData();
          this.showToast(`Innings marked as ${status === 'in-progress' ? 'in progress' : status}`);
        } else {
          this.error = response.message || 'Failed to update innings status';
        }
        this.saving = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Failed to update innings status';
        this.saving = false;
      }
    });
  }

  confirmResetInnings(): void {
    const confirmed = confirm(
      'Are you sure you want to reset this innings to "Not Started"?\n\n' +
      'This will:\n' +
      '- Set status back to "not-started"\n' +
      '- Keep the innings data but allow you to start fresh\n\n' +
      'Note: This does NOT delete ball records or stats. Use this to fix mistaken status changes.'
    );
    
    if (confirmed) {
      this.setInningsStatus('not-started');
    }
  }
}
