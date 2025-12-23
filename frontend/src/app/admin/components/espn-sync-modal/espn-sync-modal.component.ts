import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  EspnService, 
  EspnSyncPreview, 
  InningsSyncPreview,
  BattingSyncPreview,
  BowlingSyncPreview,
  EspnSyncRequest,
  InningsSyncData,
  PlayerCandidate
} from '../../../core/services/espn.service';

/**
 * ESPN Sync Modal Component
 * 
 * Shows preview of ESPN data with player matching.
 * Allows admin to manually map unmatched players.
 * Confirms and applies sync to match.
 */
@Component({
  selector: 'app-espn-sync-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        <!-- Header -->
        <div class="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 class="text-xl font-bold">Sync from ESPN</h2>
            <p class="text-gray-300 text-sm">Review and confirm data import</p>
          </div>
          <button (click)="onClose.emit()" class="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          
          <!-- Loading State -->
          @if (loading) {
            <div class="text-center py-12">
              <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p class="text-gray-600">Fetching ESPN data and matching players...</p>
            </div>
          }

          <!-- Error State -->
          @if (error) {
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p class="text-red-700 font-medium">{{ error }}</p>
              @if (errorSuggestion) {
                <p class="text-red-600 text-sm mt-2">{{ errorSuggestion }}</p>
              }
            </div>
          }

          <!-- Preview Content -->
          @if (preview && !loading) {
            <!-- Match Status -->
            <div class="bg-green-600 text-white rounded-lg p-4 mb-6">
              <div class="flex justify-between items-center">
                <div>
                  <span class="text-green-200 text-sm">Match Status</span>
                  <p class="text-lg font-bold">{{ preview.matchStatus || 'Unknown' }}</p>
                </div>
                @if (preview.target) {
                  <div class="text-right">
                    <span class="text-green-200 text-sm">Target</span>
                    <p class="text-2xl font-bold">{{ preview.target }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- Unmatched Players Warning -->
            @if (unmatchedCount > 0) {
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p class="text-yellow-800 font-medium">
                  ⚠️ {{ unmatchedCount }} player(s) could not be automatically matched.
                </p>
                <p class="text-yellow-700 text-sm mt-1">
                  Please select the correct player from the dropdown for each unmatched entry.
                </p>
              </div>
            }

            <!-- Innings Sections -->
            @for (innings of preview.innings; track innings.localTeam._id; let inningsIdx = $index) {
              <div class="border rounded-lg mb-6 overflow-hidden">
                
                <!-- Innings Header -->
                <div class="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
                  <div>
                    <h3 class="font-bold text-lg">{{ innings.localTeam.name }}</h3>
                    <span class="text-gray-400 text-sm">ESPN: {{ innings.espnTeam }}</span>
                  </div>
                  <div class="text-right">
                    @if (innings.total) {
                      <span class="text-2xl font-bold">{{ innings.total.runs }}/{{ innings.total.wickets }}</span>
                    }
                    @if (innings.overs) {
                      <span class="text-gray-400 text-sm ml-2">({{ innings.overs }})</span>
                    }
                  </div>
                </div>

                <!-- Batting -->
                <div class="p-4 border-b">
                  <h4 class="font-semibold text-gray-700 mb-3">🏏 Batting</h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="text-left px-3 py-2 w-48">ESPN Name</th>
                          <th class="text-left px-3 py-2 w-56">Local Player</th>
                          <th class="text-right px-3 py-2">R</th>
                          <th class="text-right px-3 py-2">B</th>
                          <th class="text-right px-3 py-2">4s</th>
                          <th class="text-right px-3 py-2">6s</th>
                          <th class="text-center px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (bat of innings.batting; track bat.espnName; let batIdx = $index) {
                          <tr class="border-t" [class.bg-yellow-50]="!bat.matchedPlayer">
                            <td class="px-3 py-2">
                              <span [class.text-green-600]="bat.espnStats.isNotOut" [class.font-medium]="bat.espnStats.isNotOut">
                                {{ bat.espnName }}
                              </span>
                            </td>
                            <td class="px-3 py-2">
                              @if (bat.matchedPlayer && bat.confidence >= 70) {
                                <!-- Auto-matched -->
                                <div class="flex items-center gap-2">
                                  <span class="text-green-600">✓</span>
                                  <span>{{ bat.matchedPlayer.name }}</span>
                                  <span class="text-xs text-gray-400">({{ bat.confidence }}%)</span>
                                </div>
                              } @else {
                                <!-- Manual selection needed -->
                                <select 
                                  class="w-full px-2 py-1 border rounded text-sm"
                                  [class.border-yellow-400]="!getSelectedPlayer(inningsIdx, 'batting', batIdx)"
                                  [ngModel]="getSelectedPlayer(inningsIdx, 'batting', batIdx)"
                                  (ngModelChange)="setSelectedPlayer(inningsIdx, 'batting', batIdx, $event, bat.espnName, innings.localTeam._id)"
                                >
                                  <option value="">-- Select Player --</option>
                                  @for (candidate of bat.candidates; track candidate.player._id) {
                                    <option [value]="candidate.player._id">
                                      {{ candidate.player.name }} ({{ candidate.score }}%)
                                    </option>
                                  }
                                </select>
                              }
                            </td>
                            <td class="px-3 py-2 text-right font-medium">{{ bat.espnStats.runs }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ bat.espnStats.balls }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ bat.espnStats.fours }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ bat.espnStats.sixes }}</td>
                            <td class="px-3 py-2 text-center">
                              @if (bat.espnStats.isNotOut) {
                                <span class="text-green-600 text-xs font-medium">NOT OUT</span>
                              } @else {
                                <span class="text-red-600 text-xs">OUT</span>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  
                  <!-- Extras -->
                  @if (innings.extras) {
                    <div class="mt-3 text-sm text-gray-600">
                      <span class="font-medium">Extras:</span> {{ innings.extras.total }} ({{ innings.extras.breakdown }})
                    </div>
                  }
                </div>

                <!-- Bowling -->
                <div class="p-4 bg-gray-50">
                  <h4 class="font-semibold text-gray-700 mb-3">🎯 Bowling</h4>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="bg-white">
                        <tr>
                          <th class="text-left px-3 py-2 w-48">ESPN Name</th>
                          <th class="text-left px-3 py-2 w-56">Local Player</th>
                          <th class="text-right px-3 py-2">O</th>
                          <th class="text-right px-3 py-2">M</th>
                          <th class="text-right px-3 py-2">R</th>
                          <th class="text-right px-3 py-2">W</th>
                          <th class="text-right px-3 py-2">Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (bowl of innings.bowling; track bowl.espnName; let bowlIdx = $index) {
                          <tr class="border-t bg-white" [class.bg-yellow-50]="!bowl.matchedPlayer">
                            <td class="px-3 py-2">{{ bowl.espnName }}</td>
                            <td class="px-3 py-2">
                              @if (bowl.matchedPlayer && bowl.confidence >= 70) {
                                <div class="flex items-center gap-2">
                                  <span class="text-green-600">✓</span>
                                  <span>{{ bowl.matchedPlayer.name }}</span>
                                  <span class="text-xs text-gray-400">({{ bowl.confidence }}%)</span>
                                </div>
                              } @else {
                                <select 
                                  class="w-full px-2 py-1 border rounded text-sm"
                                  [class.border-yellow-400]="!getSelectedPlayer(inningsIdx, 'bowling', bowlIdx)"
                                  [ngModel]="getSelectedPlayer(inningsIdx, 'bowling', bowlIdx)"
                                  (ngModelChange)="setSelectedPlayer(inningsIdx, 'bowling', bowlIdx, $event, bowl.espnName, getOpposingTeamId(innings))"
                                >
                                  <option value="">-- Select Player --</option>
                                  @for (candidate of bowl.candidates; track candidate.player._id) {
                                    <option [value]="candidate.player._id">
                                      {{ candidate.player.name }} ({{ candidate.score }}%)
                                    </option>
                                  }
                                </select>
                              }
                            </td>
                            <td class="px-3 py-2 text-right">{{ bowl.espnStats.overs }}</td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ bowl.espnStats.maidens }}</td>
                            <td class="px-3 py-2 text-right">{{ bowl.espnStats.runs }}</td>
                            <td class="px-3 py-2 text-right font-medium" [class.text-green-600]="bowl.espnStats.wickets > 0">
                              {{ bowl.espnStats.wickets }}
                            </td>
                            <td class="px-3 py-2 text-right text-gray-500">{{ bowl.espnStats.economy.toFixed(2) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer -->
        <div class="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div class="text-sm text-gray-500">
            @if (preview) {
              {{ preview.innings.length }} innings • {{ getTotalPlayers() }} players
            }
          </div>
          <div class="flex gap-3">
            <button 
              (click)="onClose.emit()"
              class="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button 
              (click)="confirmSync()"
              [disabled]="!preview || syncing || unmatchedCount > 0"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ syncing ? 'Syncing...' : 'Confirm & Sync' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EspnSyncModalComponent implements OnInit {
  @Input() matchId!: string;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSyncComplete = new EventEmitter<void>();

  loading = false;
  syncing = false;
  error: string | null = null;
  errorSuggestion: string | null = null;
  preview: EspnSyncPreview | null = null;

  // Manual player selections: { 'inningsIdx-type-playerIdx': playerId }
  manualSelections: Map<string, string> = new Map();
  // Track manual mappings for save: { espnName: { playerId, teamId } }
  manualMappings: Map<string, { playerId: string; teamId: string }> = new Map();

  constructor(private espnService: EspnService) {}

  ngOnInit(): void {
    this.loadPreview();
  }

  loadPreview(): void {
    this.loading = true;
    this.error = null;

    this.espnService.getSyncPreview(this.matchId).subscribe({
      next: (response) => {
        if (response.success) {
          this.preview = response.data;
          this.initializeSelections();
        } else {
          this.error = response.message || 'Failed to load preview';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to fetch ESPN data';
        this.errorSuggestion = err.error?.suggestion;
        this.loading = false;
      }
    });
  }

  initializeSelections(): void {
    if (!this.preview) return;

    // Pre-populate selections for auto-matched players
    this.preview.innings.forEach((innings, inningsIdx) => {
      innings.batting.forEach((bat, batIdx) => {
        if (bat.matchedPlayer && bat.confidence >= 70) {
          const key = `${inningsIdx}-batting-${batIdx}`;
          this.manualSelections.set(key, bat.matchedPlayer._id);
        }
      });

      innings.bowling.forEach((bowl, bowlIdx) => {
        if (bowl.matchedPlayer && bowl.confidence >= 70) {
          const key = `${inningsIdx}-bowling-${bowlIdx}`;
          this.manualSelections.set(key, bowl.matchedPlayer._id);
        }
      });
    });
  }

  get unmatchedCount(): number {
    if (!this.preview) return 0;

    let count = 0;
    this.preview.innings.forEach((innings, inningsIdx) => {
      innings.batting.forEach((bat, batIdx) => {
        const key = `${inningsIdx}-batting-${batIdx}`;
        if (!this.manualSelections.get(key)) count++;
      });

      innings.bowling.forEach((bowl, bowlIdx) => {
        const key = `${inningsIdx}-bowling-${bowlIdx}`;
        if (!this.manualSelections.get(key)) count++;
      });
    });

    return count;
  }

  getSelectedPlayer(inningsIdx: number, type: 'batting' | 'bowling', playerIdx: number): string {
    return this.manualSelections.get(`${inningsIdx}-${type}-${playerIdx}`) || '';
  }

  setSelectedPlayer(
    inningsIdx: number, 
    type: 'batting' | 'bowling', 
    playerIdx: number, 
    playerId: string,
    espnName: string,
    teamId: string
  ): void {
    const key = `${inningsIdx}-${type}-${playerIdx}`;
    
    if (playerId) {
      this.manualSelections.set(key, playerId);
      this.manualMappings.set(espnName, { playerId, teamId });
    } else {
      this.manualSelections.delete(key);
      this.manualMappings.delete(espnName);
    }
  }

  getOpposingTeamId(innings: InningsSyncPreview): string {
    // Find the other innings team
    if (!this.preview) return '';
    
    for (const inn of this.preview.innings) {
      if (inn.localTeam._id !== innings.localTeam._id) {
        return inn.localTeam._id;
      }
    }
    return '';
  }

  getTotalPlayers(): number {
    if (!this.preview) return 0;
    
    return this.preview.innings.reduce((total, inn) => {
      return total + inn.batting.length + inn.bowling.length;
    }, 0);
  }

  confirmSync(): void {
    if (!this.preview || this.unmatchedCount > 0) return;

    this.syncing = true;

    // Build sync request
    const syncRequest: EspnSyncRequest = {
      playerMappings: {},
      inningsData: []
    };

    // Add manual mappings
    this.manualMappings.forEach((mapping, espnName) => {
      syncRequest.playerMappings[espnName] = mapping;
    });

    // Build innings data
    this.preview.innings.forEach((innings, inningsIdx) => {
      const inningsData: InningsSyncData = {
        localTeamId: innings.localTeam._id,
        total: innings.total,
        overs: innings.overs,
        extras: innings.extras,
        batting: [],
        bowling: [],
        isComplete: innings.total?.wickets === 10 || false
      };

      // Add batting
      innings.batting.forEach((bat, batIdx) => {
        const playerId = this.manualSelections.get(`${inningsIdx}-batting-${batIdx}`);
        if (playerId) {
          inningsData.batting.push({
            playerId,
            runs: bat.espnStats.runs,
            balls: bat.espnStats.balls,
            fours: bat.espnStats.fours,
            sixes: bat.espnStats.sixes,
            isNotOut: bat.espnStats.isNotOut
          });
        }
      });

      // Add bowling
      innings.bowling.forEach((bowl, bowlIdx) => {
        const playerId = this.manualSelections.get(`${inningsIdx}-bowling-${bowlIdx}`);
        if (playerId) {
          inningsData.bowling.push({
            playerId,
            overs: bowl.espnStats.overs,
            maidens: bowl.espnStats.maidens,
            runs: bowl.espnStats.runs,
            wickets: bowl.espnStats.wickets,
            dotBalls: bowl.espnStats.dotBalls
          });
        }
      });

      syncRequest.inningsData.push(inningsData);
    });

    // Send sync request
    this.espnService.syncMatch(this.matchId, syncRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.onSyncComplete.emit();
          this.onClose.emit();
        } else {
          this.error = response.message || 'Sync failed';
        }
        this.syncing = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Sync failed';
        this.syncing = false;
      }
    });
  }
}
