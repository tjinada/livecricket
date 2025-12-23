import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';
import { ScoringService } from '../../../core/services/scoring.service';
import { EspnService } from '../../../core/services/espn.service';
import { ApiResponse } from '../../../core/models';
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
  imports: [CommonModule, FormsModule, RouterLink, EspnSyncModalComponent],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <div class="bg-white shadow sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a routerLink="/admin/matches" class="text-gray-500 hover:text-gray-700">
              ← Back
            </a>
            <h1 class="text-lg font-bold text-gray-800">📝 Match Editor</h1>
          </div>
          <div class="flex items-center gap-3">
            @if (match?.status === 'live') {
              <span class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                🔴 Live
              </span>
            }
            <a 
              [routerLink]="['/admin/scoring', matchId]"
              class="text-sm text-green-600 hover:text-green-800"
            >
              Go to Scoring →
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
      } @else {
        <div class="max-w-7xl mx-auto px-4 py-6">
          <!-- Match Info -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-xl font-bold text-gray-800">
                  {{ match.team1?.name }} vs {{ match.team2?.name }}
                </h2>
                <p class="text-gray-500 text-sm">{{ match.format }} • {{ match.venue }}</p>
              </div>
              <div class="text-right text-sm text-gray-500">
                Last updated: {{ lastUpdateTime | date:'HH:mm:ss' }}
              </div>
            </div>
          </div>

          <!-- ESPN Sync Section -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">📡</span>
                <h3 class="font-semibold text-gray-800">ESPN Sync</h3>
              </div>
              @if (match.lastEspnSync) {
                <span class="text-xs text-gray-500">
                  Last sync: {{ match.lastEspnSync | date:'MMM d, HH:mm' }}
                </span>
              }
            </div>
            <div class="flex gap-3">
              <input 
                type="text"
                [(ngModel)]="espnUrl"
                placeholder="https://www.espncricinfo.com/.../full-scorecard"
                class="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                (click)="saveEspnUrl()"
                [disabled]="!espnUrl || espnUrl === match.espnUrl || savingEspnUrl"
                class="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ savingEspnUrl ? 'Saving...' : 'Save URL' }}
              </button>
              <button 
                (click)="openEspnSyncModal()"
                [disabled]="!match.espnUrl"
                class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>🔄</span>
                <span>Refresh from ESPN</span>
              </button>
            </div>
            @if (!match.espnUrl) {
              <p class="text-xs text-gray-500 mt-2">
                Add an ESPN Cricinfo full-scorecard URL to enable syncing match data.
              </p>
            }
          </div>

          <!-- Innings Selector -->
          <div class="bg-white rounded-lg shadow p-4 mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Innings</label>
            <select 
              [(ngModel)]="selectedInningsIndex"
              (change)="loadInningsData()"
              class="w-full md:w-auto px-4 py-2 border rounded-lg text-lg font-medium"
            >
              @for (innings of match.innings; track $index) {
                <option [value]="$index">
                  {{ $index === 0 ? '1st' : '2nd' }} Innings - {{ getTeamNameById(innings.battingTeam) }} Batting
                </option>
              }
            </select>
          </div>

          @if (inningsEdit) {
            <!-- Innings Totals (moved to top) -->
            <div class="bg-white rounded-lg shadow mb-6 p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold text-gray-800">📊 Innings Totals</h3>
                <div class="text-2xl font-bold text-gray-800">
                  {{ inningsEdit.totalRuns }}/{{ inningsEdit.totalWickets }} ({{ getOversDisplay(inningsEdit.totalBalls) }})
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Total Runs</label>
                  <input 
                    type="number" 
                    [(ngModel)]="inningsEdit.totalRuns"
                    (change)="markDirty()"
                    class="w-full px-3 py-2 border rounded-lg text-lg font-bold focus:ring-2 focus:ring-green-500"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Wickets</label>
                  <input 
                    type="number" 
                    [(ngModel)]="inningsEdit.totalWickets"
                    (change)="markDirty()"
                    class="w-full px-3 py-2 border rounded-lg text-lg font-bold focus:ring-2 focus:ring-green-500"
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Balls</label>
                  <input 
                    type="number" 
                    [(ngModel)]="inningsEdit.totalBalls"
                    (change)="markDirty()"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    min="0"
                  />
                  <span class="text-xs text-gray-500">({{ getOversDisplay(inningsEdit.totalBalls) }} ov)</span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Wides</label>
                  <input 
                    type="number" 
                    [(ngModel)]="inningsEdit.extras.wides"
                    (change)="markDirty()"
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">No Balls</label>
                  <input 
                    type="number" 
                    [(ngModel)]="inningsEdit.extras.noBalls"
                    (change)="markDirty()"
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500"
                    min="0"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">Byes / LB</label>
                  <div class="flex gap-1">
                    <input 
                      type="number" 
                      [(ngModel)]="inningsEdit.extras.byes"
                      (change)="markDirty()"
                      class="w-1/2 px-2 py-2 border rounded focus:ring-2 focus:ring-green-500 text-sm"
                      min="0"
                      placeholder="B"
                    />
                    <input 
                      type="number" 
                      [(ngModel)]="inningsEdit.extras.legByes"
                      (change)="markDirty()"
                      class="w-1/2 px-2 py-2 border rounded focus:ring-2 focus:ring-green-500 text-sm"
                      min="0"
                      placeholder="LB"
                    />
                  </div>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                Extras: {{ calculateTotalExtras() }} (Wd {{ inningsEdit.extras.wides }}, NB {{ inningsEdit.extras.noBalls }}, B {{ inningsEdit.extras.byes }}, LB {{ inningsEdit.extras.legByes }})
              </div>
            </div>

            <!-- Batting Stats -->
            <div class="bg-white rounded-lg shadow mb-6 overflow-hidden">
              <div class="p-4 border-b flex justify-between items-center bg-green-50">
                <h3 class="font-semibold text-gray-800">🏏 Batting</h3>
                <div class="flex items-center gap-4">
                  <span class="text-sm text-gray-600">
                    Current: {{ getStrikerName() }}* / {{ getNonStrikerName() }}
                  </span>
                  <button 
                    (click)="openAddBatsmanModal()"
                    class="text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    + Add Batsman
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-gray-600">Player</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-16">Runs</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-16">Balls</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">4s</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">6s</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">Out</th>
                      <th class="px-3 py-2 text-left font-medium text-gray-600 w-40">Dismissal</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-20">Strike</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-16">🗑</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    @for (bat of inningsEdit.battingStats; track bat.playerId) {
                      @if (!bat.toRemove) {
                        <tr 
                          [class.bg-green-50]="bat.isStriker || bat.isNonStriker"
                          [class.bg-red-50]="bat.isOut"
                          [class.bg-yellow-50]="bat.isNew"
                        >
                          <td class="px-3 py-2 font-medium">
                            {{ bat.playerName }}
                            @if (bat.isNew) {
                              <span class="text-xs text-yellow-600 ml-1">(new)</span>
                            }
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bat.runs"
                              (change)="markDirty()"
                              class="w-14 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bat.balls"
                              (change)="markDirty()"
                              class="w-14 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bat.fours"
                              (change)="markDirty()"
                              class="w-12 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bat.sixes"
                              (change)="markDirty()"
                              class="w-12 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="checkbox" 
                              [(ngModel)]="bat.isOut"
                              (change)="onOutStatusChange(bat)"
                              class="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                              [disabled]="bat.isStriker || bat.isNonStriker"
                            />
                          </td>
                          <td class="px-3 py-2">
                            @if (bat.isOut) {
                              <div class="flex items-center gap-1">
                                <select 
                                  [(ngModel)]="bat.dismissalType"
                                  (change)="markDirty()"
                                  class="text-xs px-1 py-1 border rounded w-24"
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
                                  class="text-gray-400 hover:text-gray-600"
                                  title="Edit dismissal details"
                                >
                                  ✎
                                </button>
                              </div>
                            } @else {
                              <span class="text-gray-400">-</span>
                            }
                          </td>
                          <td class="px-3 py-2 text-center">
                            @if (!bat.isOut) {
                              <div class="flex justify-center gap-2">
                                <label class="flex items-center gap-1 cursor-pointer" title="Striker">
                                  <input 
                                    type="radio" 
                                    [name]="'striker'"
                                    [checked]="bat.isStriker"
                                    (change)="setStriker(bat.playerId)"
                                    class="text-green-600"
                                  />
                                  <span class="text-xs">*</span>
                                </label>
                                <label class="flex items-center gap-1 cursor-pointer" title="Non-Striker">
                                  <input 
                                    type="radio" 
                                    [name]="'nonStriker'"
                                    [checked]="bat.isNonStriker"
                                    (change)="setNonStriker(bat.playerId)"
                                    class="text-blue-600"
                                  />
                                  <span class="text-xs">○</span>
                                </label>
                              </div>
                            }
                          </td>
                          <td class="px-3 py-2 text-center">
                            <button 
                              (click)="markBatsmanForRemoval(bat)"
                              [disabled]="bat.isStriker || bat.isNonStriker"
                              class="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove batsman"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                  <tfoot class="bg-gray-50">
                    <tr>
                      <td class="px-3 py-2 font-medium text-gray-600">Batsman Total</td>
                      <td class="px-3 py-2 text-center font-bold">{{ calculateBatsmanTotal() }}</td>
                      <td colspan="7"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Bowling Stats -->
            <div class="bg-white rounded-lg shadow mb-6 overflow-hidden">
              <div class="p-4 border-b flex justify-between items-center bg-blue-50">
                <h3 class="font-semibold text-gray-800">🎯 Bowling</h3>
                <div class="flex items-center gap-4">
                  <span class="text-sm text-gray-600">
                    Current: {{ getCurrentBowlerName() }}
                  </span>
                  <button 
                    (click)="openAddBowlerModal()"
                    class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Bowler
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-gray-600">Player</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-20">Overs</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">M</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-16">Runs</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">W</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">Wd</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-14">NB</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-24">Bowling</th>
                      <th class="px-3 py-2 text-center font-medium text-gray-600 w-16">🗑</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    @for (bowl of inningsEdit.bowlingStats; track bowl.playerId) {
                      @if (!bowl.toRemove) {
                        <tr 
                          [class.bg-blue-50]="bowl.isBowling"
                          [class.bg-yellow-50]="bowl.isNew"
                        >
                          <td class="px-3 py-2 font-medium">
                            {{ bowl.playerName }}
                            @if (bowl.isNew) {
                              <span class="text-xs text-yellow-600 ml-1">(new)</span>
                            }
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="text" 
                              [(ngModel)]="bowl.overs"
                              (change)="markDirty()"
                              class="w-16 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bowl.maidens"
                              (change)="markDirty()"
                              class="w-12 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bowl.runs"
                              (change)="markDirty()"
                              class="w-14 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bowl.wickets"
                              (change)="markDirty()"
                              class="w-12 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bowl.wides"
                              (change)="markDirty()"
                              class="w-12 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="number" 
                              [(ngModel)]="bowl.noBalls"
                              (change)="markDirty()"
                              class="w-12 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <input 
                              type="radio" 
                              [name]="'currentBowler'"
                              [checked]="bowl.isBowling"
                              (change)="setCurrentBowler(bowl.playerId)"
                              class="text-blue-600"
                            />
                          </td>
                          <td class="px-3 py-2 text-center">
                            <button 
                              (click)="markBowlerForRemoval(bowl)"
                              [disabled]="bowl.isBowling"
                              class="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove bowler"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                  <tfoot class="bg-gray-50">
                    <tr>
                      <td class="px-3 py-2 font-medium text-gray-600">Bowler Total</td>
                      <td class="px-3 py-2 text-center font-bold">{{ calculateBowlerOversTotal() }}</td>
                      <td class="px-3 py-2 text-center font-bold">{{ calculateBowlerMaidensTotal() }}</td>
                      <td class="px-3 py-2 text-center font-bold">{{ calculateBowlerRunsTotal() }}</td>
                      <td class="px-3 py-2 text-center font-bold">{{ calculateBowlerWicketsTotal() }}</td>
                      <td colspan="4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Validation -->
            <div class="bg-white rounded-lg shadow mb-6 p-4">
              <h3 class="font-semibold text-gray-800 mb-3">✓ Quick Check</h3>
              <div class="space-y-2 text-sm">
                @if (calculateBatsmanTotal() + calculateTotalExtras() === inningsEdit.totalRuns) {
                  <div class="text-green-600">
                    ✓ Batsman ({{ calculateBatsmanTotal() }}) + Extras ({{ calculateTotalExtras() }}) = {{ inningsEdit.totalRuns }}
                  </div>
                } @else {
                  <div class="text-red-600">
                    ✗ Batsman ({{ calculateBatsmanTotal() }}) + Extras ({{ calculateTotalExtras() }}) = {{ calculateBatsmanTotal() + calculateTotalExtras() }} ≠ Total ({{ inningsEdit.totalRuns }})
                  </div>
                }

                @if (countDismissedBatsmen() === inningsEdit.totalWickets) {
                  <div class="text-green-600">
                    ✓ Dismissed batsmen ({{ countDismissedBatsmen() }}) = Wickets ({{ inningsEdit.totalWickets }})
                  </div>
                } @else {
                  <div class="text-amber-600">
                    ⚠ Dismissed batsmen ({{ countDismissedBatsmen() }}) ≠ Wickets ({{ inningsEdit.totalWickets }})
                  </div>
                }

                @if (hasStrikerAndNonStriker()) {
                  <div class="text-green-600">
                    ✓ Striker and Non-Striker are set
                  </div>
                } @else {
                  <div class="text-amber-600">
                    ⚠ Striker or Non-Striker not set
                  </div>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="bg-white rounded-lg shadow p-4 sticky bottom-4">
              <div class="flex justify-between items-center">
                <div>
                  @if (isDirty) {
                    <span class="text-amber-600 text-sm font-medium">
                      ⚠ You have unsaved changes
                    </span>
                  }
                </div>
                <div class="flex gap-3">
                  <button 
                    (click)="discardChanges()"
                    [disabled]="!isDirty || saving"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Discard Changes
                  </button>
                  <button 
                    (click)="saveAllChanges()"
                    [disabled]="!isDirty || saving"
                    class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {{ saving ? 'Saving...' : '💾 Save All Changes' }}
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Error Display -->
          @if (error) {
            <div class="fixed bottom-20 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg max-w-md">
              {{ error }}
              <button (click)="error = ''" class="ml-2 font-bold">×</button>
            </div>
          }

          <!-- Toast Notification -->
          @if (toastMessage) {
            <div class="fixed top-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              <span>↻</span>
              <span>{{ toastMessage }}</span>
            </div>
          }
        </div>
      }

      <!-- Add Batsman Modal -->
      @if (showAddBatsmanModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Add Batsman</h3>
            </div>
            <div class="p-4">
              <p class="text-sm text-gray-500 mb-4">Select a player to add to batting stats</p>
              <div class="space-y-2">
                @for (player of getAvailableBatsmenToAdd(); track player.playerId) {
                  <button 
                    (click)="addBatsman(player.playerId, player.name)"
                    class="w-full p-3 text-left border rounded-lg hover:bg-green-50 hover:border-green-500"
                  >
                    {{ player.name }}
                  </button>
                }
              </div>
              @if (getAvailableBatsmenToAdd().length === 0) {
                <p class="text-gray-500 text-center py-4">All players already have batting stats</p>
              }
            </div>
            <div class="p-4 border-t flex justify-end">
              <button 
                (click)="showAddBatsmanModal = false"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Add Bowler Modal -->
      @if (showAddBowlerModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Add Bowler</h3>
            </div>
            <div class="p-4">
              <p class="text-sm text-gray-500 mb-4">Select a player to add to bowling stats</p>
              <div class="space-y-2">
                @for (player of getAvailableBowlersToAdd(); track player.playerId) {
                  <button 
                    (click)="addBowler(player.playerId, player.name)"
                    class="w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-500"
                  >
                    {{ player.name }}
                  </button>
                }
              </div>
              @if (getAvailableBowlersToAdd().length === 0) {
                <p class="text-gray-500 text-center py-4">All players already have bowling stats</p>
              }
            </div>
            <div class="p-4 border-t flex justify-end">
              <button 
                (click)="showAddBowlerModal = false"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ESPN Sync Modal -->
      @if (showEspnSyncModal) {
        <app-espn-sync-modal
          [matchId]="matchId"
          (onClose)="closeEspnSyncModal()"
          (onSyncComplete)="onEspnSyncComplete()"
        />
      }

      <!-- Dismissal Editor Modal -->
      @if (showDismissalModal && editingDismissal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold">Edit Dismissal - {{ editingDismissal.playerName }}</h3>
            </div>
            <div class="p-4 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Dismissal Type</label>
                <select 
                  [(ngModel)]="editingDismissal.dismissalType"
                  class="w-full px-3 py-2 border rounded-lg"
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
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bowler</label>
                  <select 
                    [(ngModel)]="editingDismissal.dismissalBowlerId"
                    class="w-full px-3 py-2 border rounded-lg"
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
                  <label class="block text-sm font-medium text-gray-700 mb-2">Fielder</label>
                  <select 
                    [(ngModel)]="editingDismissal.dismissalFielderId"
                    class="w-full px-3 py-2 border rounded-lg"
                  >
                    <option [value]="null">Select Fielder</option>
                    @for (player of getBowlingTeamPlayers(); track player.playerId) {
                      <option [value]="player.playerId">{{ player.name }}</option>
                    }
                  </select>
                </div>
              }
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
              <button 
                (click)="closeDismissalEditor()"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
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
  originalInningsData: string = ''; // JSON snapshot for dirty checking
  isDirty = false;
  lastUpdateTime = new Date();
  
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

  // Cache for player data
  private battingTeamPlayers: Array<{playerId: string, name: string}> = [];
  private bowlingTeamPlayers: Array<{playerId: string, name: string}> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private scoringService: ScoringService,
    private espnService: EspnService
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
          this.cacheTeamPlayers();
          this.loadInningsData();
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
      .filter((p: any) => p.isPlayingXI)
      .map((p: any) => ({
        playerId: (p.player?._id || p.player)?.toString(),
        name: p.player?.name || 'Unknown'
      }));

    this.bowlingTeamPlayers = (bowlingSquad || [])
      .filter((p: any) => p.isPlayingXI)
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

    // Build batting stats edit
    const battingStats: BattingStatEdit[] = (innings.battingStats || []).map((bs: any) => {
      const playerId = (bs.player?._id || bs.player)?.toString();
      return {
        playerId,
        playerName: bs.player?.name || this.getPlayerNameById(playerId),
        runs: bs.runs || 0,
        balls: bs.balls || 0,
        fours: bs.fours || 0,
        sixes: bs.sixes || 0,
        isOut: bs.isOut || false,
        dismissalType: bs.dismissal?.type || null,
        dismissalBowlerId: (bs.dismissal?.bowler?._id || bs.dismissal?.bowler)?.toString() || null,
        dismissalFielderId: (bs.dismissal?.fielder?._id || bs.dismissal?.fielder)?.toString() || null,
        isStriker: playerId === strikerId,
        isNonStriker: playerId === nonStrikerId
      };
    });

    // Build bowling stats edit
    const bowlingStats: BowlingStatEdit[] = (innings.bowlingStats || []).map((bs: any) => {
      const playerId = (bs.player?._id || bs.player)?.toString();
      const overs = bs.overs || 0;
      const balls = bs.balls || 0;
      return {
        playerId,
        playerName: bs.player?.name || this.getPlayerNameById(playerId),
        overs: `${overs}.${balls}`,
        maidens: bs.maidens || 0,
        runs: bs.runs || 0,
        wickets: bs.wickets || 0,
        wides: bs.wides || 0,
        noBalls: bs.noBalls || 0,
        isBowling: playerId === currentBowlerId
      };
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

  private getPlayerNameById(playerId: string): string {
    const batPlayer = this.battingTeamPlayers.find(p => p.playerId === playerId);
    if (batPlayer) return batPlayer.name;
    const bowlPlayer = this.bowlingTeamPlayers.find(p => p.playerId === playerId);
    if (bowlPlayer) return bowlPlayer.name;
    return 'Unknown';
  }

  // SSE Setup
  private setupSSE(): void {
    this.closeSSE();
    
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);
    
    this.eventSource.addEventListener('score-update', (event: any) => {
      const data = JSON.parse(event.data);
      // Only show toast if we're not the ones who made the change
      if (!data.bulkUpdate) {
        this.showToast('Score updated on scoring screen');
        // Refresh match data but don't overwrite if dirty
        this.refreshMatchData();
      }
    });

    this.eventSource.onerror = () => {
      // Reconnect after 5 seconds
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
    if (this.isDirty) {
      // Don't overwrite unsaved changes
      return;
    }
    
    this.matchService.getById(this.matchId).subscribe({
      next: (response: ApiResponse<Match>) => {
        if (response.success && response.data) {
          this.match = response.data;
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
    this.markDirty();
  }

  setStriker(playerId: string): void {
    if (!this.inningsEdit) return;
    this.inningsEdit.battingStats.forEach(b => {
      b.isStriker = b.playerId === playerId;
      // Can't be both striker and non-striker
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
      // Can't be both striker and non-striker
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

  // Add player modals
  openAddBatsmanModal(): void {
    this.showAddBatsmanModal = true;
  }

  openAddBowlerModal(): void {
    this.showAddBowlerModal = true;
  }

  getAvailableBatsmenToAdd(): Array<{playerId: string, name: string}> {
    if (!this.inningsEdit) return [];
    const existingIds = this.inningsEdit.battingStats
      .filter(b => !b.toRemove)
      .map(b => b.playerId);
    return this.battingTeamPlayers.filter(p => !existingIds.includes(p.playerId));
  }

  getAvailableBowlersToAdd(): Array<{playerId: string, name: string}> {
    if (!this.inningsEdit) return [];
    const existingIds = this.inningsEdit.bowlingStats
      .filter(b => !b.toRemove)
      .map(b => b.playerId);
    return this.bowlingTeamPlayers.filter(p => !existingIds.includes(p.playerId));
  }

  addBatsman(playerId: string, name: string): void {
    if (!this.inningsEdit) return;
    this.inningsEdit.battingStats.push({
      playerId,
      playerName: name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissalType: null,
      dismissalBowlerId: null,
      dismissalFielderId: null,
      isStriker: false,
      isNonStriker: false,
      isNew: true
    });
    this.showAddBatsmanModal = false;
    this.markDirty();
  }

  addBowler(playerId: string, name: string): void {
    if (!this.inningsEdit) return;
    this.inningsEdit.bowlingStats.push({
      playerId,
      playerName: name,
      overs: '0.0',
      maidens: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
      isBowling: false,
      isNew: true
    });
    this.showAddBowlerModal = false;
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

    // Build update payload
    const battingStats = this.inningsEdit.battingStats
      .filter(b => !b.toRemove)
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
        }
        this.savingEspnUrl = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save ESPN URL';
        this.savingEspnUrl = false;
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
    // Reload match data
    this.loadMatch();
  }
}
