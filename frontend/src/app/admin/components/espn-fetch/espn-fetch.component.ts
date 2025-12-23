import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EspnService, EspnMatchData, EspnInnings } from '../../../core/services/espn.service';

type FetchMethod = 'url' | 'json';

/**
 * ESPN Data Fetch Component
 * 
 * Allows admin to fetch live match data from ESPN Cricinfo.
 * Supports two methods:
 * 1. URL fetch (may be blocked by ESPN)
 * 2. JSON paste (reliable - from DevTools)
 */
@Component({
  selector: 'app-espn-fetch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b z-10">
        <div>
          <h2 class="text-xl font-bold text-gray-800">ESPN Cricinfo Data Import</h2>
          <p class="text-sm text-gray-500">Import live match data from ESPN</p>
        </div>
        @if (showClose) {
          <button 
            (click)="onClose.emit()"
            class="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        }
      </div>

      <!-- Method Toggle -->
      <div class="mb-6">
        <div class="flex rounded-lg bg-gray-100 p-1">
          <button 
            (click)="fetchMethod = 'url'"
            class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            [ngClass]="fetchMethod === 'url' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'"
          >
            🔗 URL Fetch
          </button>
          <button 
            (click)="fetchMethod = 'json'"
            class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            [ngClass]="fetchMethod === 'json' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'"
          >
            📋 Paste JSON
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2 text-center">
          {{ fetchMethod === 'url' ? 'Automatic fetch (may be blocked by ESPN)' : 'Manual paste from DevTools (always works)' }}
        </p>
      </div>

      <!-- URL Method -->
      @if (fetchMethod === 'url') {
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ESPN Cricinfo Match URL
          </label>
          <div class="flex gap-2">
            <input 
              type="text"
              [(ngModel)]="espnUrl"
              placeholder="https://www.espncricinfo.com/series/.../full-scorecard"
              class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              [disabled]="loading"
            />
            <button 
              (click)="fetchFromUrl()"
              [disabled]="!espnUrl || loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {{ loading ? 'Fetching...' : 'Fetch' }}
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Tip: Use the "full-scorecard" URL for best results
          </p>
        </div>
      }

      <!-- JSON Method -->
      @if (fetchMethod === 'json') {
        <div class="mb-6">
          <div class="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
            <p class="font-medium text-blue-800 mb-2">How to get ESPN JSON data:</p>
            <ol class="list-decimal list-inside space-y-1 text-blue-700">
              <li>Open the match page on ESPN Cricinfo in your browser</li>
              <li>Press <kbd class="px-1.5 py-0.5 bg-blue-100 rounded text-xs">F12</kbd> to open DevTools</li>
              <li>Go to <strong>Network</strong> tab</li>
              <li>Refresh the page</li>
              <li>Filter by "XHR" or search for "innings" or "scorecard"</li>
              <li>Click on a request → <strong>Response</strong> tab</li>
              <li>Copy the entire JSON response and paste below</li>
            </ol>
          </div>

          <label class="block text-sm font-medium text-gray-700 mb-2">
            ESPN JSON Data
          </label>
          <textarea
            [(ngModel)]="jsonInput"
            rows="8"
            placeholder='{"match": {...}, "innings": [...], ...}'
            class="w-full px-4 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            [disabled]="loading"
          ></textarea>
          <div class="flex justify-end mt-2">
            <button 
              (click)="parseJsonInput()"
              [disabled]="!jsonInput || loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Parsing...' : 'Parse JSON' }}
            </button>
          </div>
        </div>
      }

      <!-- Error Message -->
      @if (error) {
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm font-medium">{{ error }}</p>
          @if (suggestion) {
            <p class="text-red-600 text-sm mt-2">💡 {{ suggestion }}</p>
            @if (suggestion.includes('DevTools')) {
              <button 
                (click)="fetchMethod = 'json'"
                class="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Switch to JSON paste method →
              </button>
            }
          }
        </div>
      }

      <!-- Results -->
      @if (matchData) {
        <div class="space-y-6">
          
          <!-- Match Status -->
          <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 text-white">
            <div class="flex justify-between items-start">
              <div>
                <span class="text-green-200 text-sm">Match Status</span>
                <p class="text-xl font-bold">{{ getMatchStateText() }}</p>
              </div>
              @if (matchData.target) {
                <div class="text-right">
                  <span class="text-green-200 text-sm">Target</span>
                  <p class="text-2xl font-bold">{{ matchData.target }}</p>
                </div>
              }
            </div>
            @if (matchData.matchStatus) {
              <p class="mt-2 text-green-100">{{ matchData.matchStatus }}</p>
            }
          </div>

          <!-- Innings Sections -->
          @for (innings of matchData.innings; track innings.team; let idx = $index) {
            <div class="border rounded-lg overflow-hidden">
              <!-- Innings Header -->
              <div class="bg-gray-800 text-white px-4 py-3">
                <div class="flex justify-between items-center">
                  <h3 class="font-bold text-lg">
                    {{ innings.team }}
                    <span class="text-gray-400 font-normal text-sm ml-2">Innings {{ idx + 1 }}</span>
                  </h3>
                  <div class="text-right">
                    @if (innings.total) {
                      <span class="text-2xl font-bold">{{ innings.total.runs }}/{{ innings.total.wickets }}</span>
                    }
                    @if (innings.overs) {
                      <span class="text-gray-400 text-sm ml-2">({{ innings.overs }} ov)</span>
                    }
                  </div>
                </div>
              </div>

              <!-- Batting Card -->
              @if (innings.batting && innings.batting.length > 0) {
                <div class="p-4 border-b">
                  <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    🏏 Batting
                    <span class="text-sm font-normal text-gray-500">({{ innings.batting.length }} batsmen)</span>
                  </h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="text-left px-3 py-2 font-medium text-gray-600">Batsman</th>
                          <th class="text-left px-3 py-2 font-medium text-gray-600">Dismissal</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">R</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">B</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">4s</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">6s</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (batsman of innings.batting; track batsman.name) {
                          <tr class="border-t hover:bg-gray-50">
                            <td class="px-3 py-2">
                              <span [class.font-semibold]="batsman.isNotOut" [class.text-green-600]="batsman.isNotOut">
                                {{ batsman.name }}
                                @if (batsman.isNotOut) {
                                  <span class="text-xs text-green-600 ml-1">*</span>
                                }
                              </span>
                            </td>
                            <td class="px-3 py-2 text-gray-500 text-xs max-w-40 truncate" [title]="batsman.dismissal || ''">
                              {{ batsman.dismissal || '-' }}
                            </td>
                            <td class="px-3 py-2 text-right font-semibold">{{ batsman.runs }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ batsman.balls }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ batsman.fours }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ batsman.sixes }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ formatSR(batsman.strikeRate) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  <!-- Extras -->
                  @if (innings.extras) {
                    <div class="mt-3 pt-3 border-t text-sm text-gray-600">
                      <span class="font-medium">Extras:</span> 
                      <span class="font-bold">{{ innings.extras.total }}</span>
                      <span class="text-gray-500 ml-1">({{ innings.extras.breakdown }})</span>
                    </div>
                  }
                </div>
              }

              <!-- Bowling Card -->
              @if (innings.bowling && innings.bowling.length > 0) {
                <div class="p-4 bg-gray-50">
                  <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    🎯 Bowling
                    <span class="text-sm font-normal text-gray-500">({{ innings.bowling.length }} bowlers)</span>
                  </h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-white">
                        <tr>
                          <th class="text-left px-3 py-2 font-medium text-gray-600">Bowler</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">O</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">M</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">R</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">W</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-600">Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (bowler of innings.bowling; track bowler.name) {
                          <tr class="border-t bg-white hover:bg-gray-50">
                            <td class="px-3 py-2 font-medium">{{ bowler.name }}</td>
                            <td class="px-3 py-2 text-right">{{ bowler.overs }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ bowler.maidens }}</td>
                            <td class="px-3 py-2 text-right">{{ bowler.runs }}</td>
                            <td class="px-3 py-2 text-right font-semibold" [class.text-green-600]="bowler.wickets > 0">
                              {{ bowler.wickets }}
                            </td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ formatEcon(bowler.economy) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            </div>
          }

          <!-- No innings found fallback -->
          @if (!matchData.innings || matchData.innings.length === 0) {
            <div class="text-center py-8 text-gray-500">
              <p>No innings data found. Try using the JSON paste method for better results.</p>
            </div>
          }

          <!-- Actions -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 class="font-semibold text-green-800 mb-2">✓ Data Ready</h3>
            <p class="text-sm text-green-700 mb-3">
              Use this data to update your match in the Scoring Panel or Match Editor.
            </p>
            <div class="flex gap-2">
              <button 
                (click)="copyToClipboard()"
                class="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                📋 Copy as JSON
              </button>
              <button 
                (click)="onDataFetched.emit(matchData)"
                class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                ✓ Use This Data
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Instructions (when no data) -->
      @if (!matchData && !loading && !error) {
        <div class="bg-gray-50 rounded-lg p-6 text-center">
          <div class="text-4xl mb-3">🏏</div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Import Match Data from ESPN</h3>
          <p class="text-gray-600 mb-4">
            @if (fetchMethod === 'url') {
              Enter an ESPN Cricinfo match URL to fetch live scores.
              <br><span class="text-sm text-gray-500">Tip: Use the "full-scorecard" page URL for best results.</span>
            } @else {
              Paste JSON data from ESPN Cricinfo DevTools.
              <br><span class="text-sm text-gray-500">This method always works.</span>
            }
          </p>
        </div>
      }
    </div>
  `
})
export class EspnFetchComponent {
  @Input() showClose = true;
  @Output() onClose = new EventEmitter<void>();
  @Output() onDataFetched = new EventEmitter<EspnMatchData>();

  fetchMethod: FetchMethod = 'url'; // Default to URL since it's working now
  espnUrl = '';
  jsonInput = '';
  loading = false;
  error: string | null = null;
  suggestion: string | null = null;
  matchData: EspnMatchData | null = null;

  constructor(private espnService: EspnService) {}

  fetchFromUrl(): void {
    if (!this.espnUrl) return;

    this.loading = true;
    this.error = null;
    this.suggestion = null;
    this.matchData = null;

    this.espnService.fetchMatchData(this.espnUrl).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.matchData = response.data;
        } else {
          this.error = response.message || 'Failed to fetch data';
          this.suggestion = response.suggestion || null;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to fetch match data';
        this.suggestion = err.error?.suggestion || 'Try using the JSON paste method instead';
        this.loading = false;
      }
    });
  }

  parseJsonInput(): void {
    if (!this.jsonInput) return;

    this.loading = true;
    this.error = null;
    this.suggestion = null;
    this.matchData = null;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(this.jsonInput);
    } catch (e) {
      this.error = 'Invalid JSON format. Make sure you copied the complete JSON response.';
      this.loading = false;
      return;
    }

    this.espnService.parseJson(parsedJson).subscribe({
      next: (response) => {
        if (response.success) {
          this.matchData = response.data;
          if (!this.matchData?.innings?.length) {
            this.suggestion = 'No innings data found. Try copying JSON from a different network request.';
          }
        } else {
          this.error = response.message || 'Failed to parse JSON';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to parse JSON data';
        this.loading = false;
      }
    });
  }

  getMatchStateText(): string {
    if (!this.matchData?.matchState) return 'Unknown';
    const state = this.matchData.matchState;
    if (state.isComplete) return 'Match Completed';
    if (state.isLive) return 'Live';
    if (state.isBreak) return 'Innings Break';
    if (state.isStarted) return 'In Progress';
    return 'Not Started';
  }

  formatSR(sr: number): string {
    return sr ? sr.toFixed(1) : '-';
  }

  formatEcon(econ: number): string {
    return econ ? econ.toFixed(2) : '-';
  }

  copyToClipboard(): void {
    if (this.matchData) {
      navigator.clipboard.writeText(JSON.stringify(this.matchData, null, 2));
    }
  }
}
