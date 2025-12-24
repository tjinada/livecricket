import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EspnService, EspnMatchCreationPreview, EspnPlayerPreview } from '../../../core/services/espn.service';
import { Country } from '../../../core/models';

interface EspnImportResult {
  format: 'T20' | 'ODI';
  gender: 'men' | 'women';
  team1Id: string;
  team2Id: string;
  venue: string;
  date: string;
  title: string;
  espnUrl: string;
  team1Squad: { playerId: string; espnName: string }[];
  team2Squad: { playerId: string; espnName: string }[];
}

@Component({
  selector: 'app-espn-match-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-medium text-blue-900 flex items-center gap-2">
          📥 Import from ESPN Cricinfo
        </h3>
        <button 
          type="button"
          (click)="expanded = !expanded"
          class="text-blue-600 text-sm hover:text-blue-800"
        >
          {{ expanded ? 'Hide' : 'Expand' }}
        </button>
      </div>
      
      @if (expanded) {
        <div class="space-y-4">
          <!-- URL Input -->
          <div class="flex gap-2">
            <input 
              type="text"
              [(ngModel)]="espnUrl"
              placeholder="Paste ESPN match URL (e.g., .../match-squads or .../full-scorecard)"
              class="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              [disabled]="loading"
            >
            <button 
              type="button"
              (click)="fetchFromEspn()"
              [disabled]="loading || !espnUrl.trim()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              @if (loading) {
                <span class="animate-spin">⏳</span>
                Fetching...
              } @else {
                🔍 Fetch
              }
            </button>
          </div>
          
          <!-- Error Message -->
          @if (error) {
            <div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {{ error }}
            </div>
          }
          
          <!-- Preview -->
          @if (preview) {
            <div class="bg-white rounded-lg border border-blue-200 overflow-hidden">
              <!-- Match Info -->
              <div class="p-4 border-b border-blue-100 bg-blue-50/50">
                <h4 class="font-semibold text-gray-800">{{ preview.matchInfo.title || 'Match' }}</h4>
                <p class="text-sm text-gray-600 mt-1">
                  {{ preview.matchInfo.seriesName }}
                </p>
                <div class="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  @if (preview.matchInfo.venue) {
                    <span>📍 {{ preview.matchInfo.venue }}</span>
                  }
                  @if (preview.matchInfo.date) {
                    <span>📅 {{ preview.matchInfo.date | date:'mediumDate' }}</span>
                  }
                  @if (preview.matchInfo.format) {
                    <span class="px-2 py-0.5 bg-gray-200 rounded text-gray-700">{{ preview.matchInfo.format | uppercase }}</span>
                  }
                  @if (preview.matchInfo.gender) {
                    <span class="px-2 py-0.5 rounded" 
                      [class.bg-blue-100]="preview.matchInfo.gender === 'men'"
                      [class.text-blue-700]="preview.matchInfo.gender === 'men'"
                      [class.bg-pink-100]="preview.matchInfo.gender === 'women'"
                      [class.text-pink-700]="preview.matchInfo.gender === 'women'"
                    >
                      {{ preview.matchInfo.gender === 'women' ? 'Women' : 'Men' }}
                    </span>
                  }
                </div>
              </div>
              
              <!-- Team Mapping -->
              <div class="p-4 space-y-4">
                <h5 class="font-medium text-gray-700">Team Mapping</h5>
                
                @for (team of preview.teamMapping; track team.espnTeam.id; let teamIdx = $index) {
                  <div class="border rounded-lg overflow-hidden">
                    <!-- Team Header -->
                    <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                      <div>
                        <span class="font-medium">{{ team.espnTeam.name }}</span>
                        <span class="text-gray-400 mx-2">→</span>
                        @if (team.localTeam) {
                          <span class="text-green-600 font-medium">{{ team.localTeam.name }}</span>
                          <span class="text-green-500 text-sm ml-2">✓ Matched</span>
                        } @else {
                          <span class="text-red-600">No match found</span>
                          <select 
                            class="ml-2 text-sm border rounded px-2 py-1"
                            (change)="selectTeam(teamIdx, $event)"
                          >
                            <option value="">Select team...</option>
                            @for (country of countries; track country._id) {
                              <option [value]="country._id">{{ country.name }}</option>
                            }
                          </select>
                        }
                      </div>
                      <button 
                        type="button"
                        (click)="toggleTeamExpanded(teamIdx)"
                        class="text-gray-500 text-sm"
                      >
                        {{ expandedTeams[teamIdx] ? '▼' : '▶' }} {{ team.players.length }} players
                      </button>
                    </div>
                    
                    <!-- Players -->
                    @if (expandedTeams[teamIdx]) {
                      <div class="divide-y max-h-60 overflow-y-auto">
                        @for (player of team.players; track player.espnPlayer.id) {
                          <div class="px-4 py-2 flex items-center justify-between text-sm"
                            [class.bg-green-50]="player.localPlayer"
                            [class.bg-yellow-50]="!player.localPlayer"
                          >
                            <div class="flex items-center gap-2">
                              @if (player.espnPlayer.isCaptain) {
                                <span class="text-xs text-amber-600">(c)</span>
                              }
                              @if (player.espnPlayer.isViceCaptain) {
                                <span class="text-xs text-amber-500">(vc)</span>
                              }
                              @if (player.espnPlayer.isKeeper) {
                                <span class="text-xs text-blue-600">†</span>
                              }
                              <span>{{ player.espnPlayer.name }}</span>
                              @if (player.espnPlayer.role) {
                                <span class="text-xs text-gray-400">({{ player.espnPlayer.role }})</span>
                              }
                            </div>
                            
                            <div class="flex items-center gap-2">
                              @if (player.localPlayer) {
                                <span class="text-green-600">→ {{ player.localPlayer.name }}</span>
                                <span class="text-green-500">✓</span>
                              } @else if (player.needsCreation) {
                                <span class="text-yellow-600">New player</span>
                                <button 
                                  type="button"
                                  (click)="createPlayer(player, teamIdx)"
                                  [disabled]="creatingPlayer"
                                  class="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                                >
                                  {{ creatingPlayer ? '...' : 'Create' }}
                                </button>
                              } @else {
                                <select 
                                  class="text-xs border rounded px-2 py-1"
                                  (change)="selectPlayer(teamIdx, player, $event)"
                                >
                                  <option value="">Select...</option>
                                  @for (candidate of player.localPlayerCandidates; track candidate.player._id) {
                                    <option [value]="candidate.player._id">
                                      {{ candidate.player.name }} ({{ candidate.score }}%)
                                    </option>
                                  }
                                </select>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
                
                <!-- Unmatched Players Summary -->
                @if (preview.unmatchedPlayers.length > 0) {
                  <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p class="text-yellow-800 text-sm font-medium">
                      ⚠️ {{ preview.unmatchedPlayers.length }} players need to be created or matched
                    </p>
                    <p class="text-yellow-700 text-xs mt-1">
                      You can create them now or manually match them after the match is created.
                    </p>
                  </div>
                }
              </div>
              
              <!-- Actions -->
              <div class="p-4 bg-gray-50 border-t flex justify-between items-center">
                <button 
                  type="button"
                  (click)="clearPreview()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  (click)="applyImport()"
                  [disabled]="!canApply()"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Apply to Form
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class EspnMatchImportComponent {
  @Input() countries: Country[] = [];
  @Output() importApplied = new EventEmitter<EspnImportResult>();
  
  expanded = false;
  espnUrl = '';
  loading = false;
  error = '';
  preview: EspnMatchCreationPreview | null = null;
  expandedTeams: boolean[] = [true, true];
  creatingPlayer = false;
  
  constructor(private espnService: EspnService) {}
  
  fetchFromEspn(): void {
    if (!this.espnUrl.trim()) return;
    
    this.loading = true;
    this.error = '';
    this.preview = null;
    
    this.espnService.previewMatchCreation(this.espnUrl.trim()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.preview = response.data;
          this.expandedTeams = this.preview.teamMapping.map(() => true);
        } else {
          this.error = response.message || 'Failed to fetch data from ESPN';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to fetch data from ESPN. Please check the URL.';
        this.loading = false;
      }
    });
  }
  
  toggleTeamExpanded(teamIdx: number): void {
    this.expandedTeams[teamIdx] = !this.expandedTeams[teamIdx];
  }
  
  selectTeam(teamIdx: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const countryId = select.value;
    if (!countryId || !this.preview) return;
    
    const country = this.countries.find(c => c._id === countryId);
    if (country) {
      this.preview.teamMapping[teamIdx].localTeam = {
        _id: country._id,
        name: country.name,
        shortName: country.code,  // Use code as shortName since Country model doesn't have shortName
        code: country.code,
        flagUrl: country.flagUrl
      };
    }
  }
  
  selectPlayer(teamIdx: number, player: EspnPlayerPreview, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const playerId = select.value;
    if (!playerId) return;
    
    const candidate = player.localPlayerCandidates.find(c => c.player._id === playerId);
    if (candidate) {
      player.localPlayer = candidate.player;
      player.needsCreation = false;
      
      if (this.preview) {
        this.preview.unmatchedPlayers = this.preview.unmatchedPlayers.filter(
          p => p.espnName !== player.espnPlayer.name
        );
      }
    }
  }
  
  createPlayer(player: EspnPlayerPreview, teamIdx: number): void {
    if (!this.preview) return;
    
    const team = this.preview.teamMapping[teamIdx];
    if (!team.localTeam) {
      this.error = 'Please select a local team first';
      return;
    }
    
    this.creatingPlayer = true;
    
    // Determine role from ESPN data
    let role = player.espnPlayer.role || 'batsman';
    if (player.espnPlayer.isKeeper) {
      role = 'wicketkeeper batter';  // Will be normalized by backend
    }
    
    this.espnService.createPlayer({
      name: player.espnPlayer.name,
      countryId: team.localTeam._id,
      gender: this.preview.matchInfo.gender === 'women' ? 'F' : 'M',
      espnId: player.espnPlayer.id || undefined,
      role
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          player.localPlayer = {
            _id: response.data._id,
            name: response.data.name,
            role: response.data.role
          };
          player.needsCreation = false;
          
          if (this.preview) {
            this.preview.unmatchedPlayers = this.preview.unmatchedPlayers.filter(
              p => p.espnName !== player.espnPlayer.name
            );
          }
        } else {
          this.error = response.message || 'Failed to create player';
        }
        this.creatingPlayer = false;
      },
      error: (err) => {
        this.error = err.error?.message || err.error?.errors?.join(', ') || 'Failed to create player';
        this.creatingPlayer = false;
      }
    });
  }
  
  clearPreview(): void {
    this.preview = null;
    this.error = '';
  }
  
  canApply(): boolean {
    if (!this.preview) return false;
    
    const teamsMatched = this.preview.teamMapping.every(t => t.localTeam !== null);
    if (!teamsMatched) return false;
    
    for (const team of this.preview.teamMapping) {
      const matchedCount = team.players.filter(p => p.localPlayer !== null).length;
      if (matchedCount < 11) return false;
    }
    
    return true;
  }
  
  applyImport(): void {
    if (!this.preview || !this.canApply()) return;
    
    const team1 = this.preview.teamMapping[0];
    const team2 = this.preview.teamMapping[1];
    
    let format: 'T20' | 'ODI' = 'T20';
    if (this.preview.matchInfo.format) {
      const fmt = this.preview.matchInfo.format.toUpperCase();
      if (fmt.includes('ODI') || fmt.includes('50')) {
        format = 'ODI';
      }
    }
    
    const team1Squad = team1.players
      .filter(p => p.localPlayer)
      .map(p => ({
        playerId: p.localPlayer!._id,
        espnName: p.espnPlayer.name
      }));
    
    const team2Squad = team2.players
      .filter(p => p.localPlayer)
      .map(p => ({
        playerId: p.localPlayer!._id,
        espnName: p.espnPlayer.name
      }));
    
    const result: EspnImportResult = {
      format,
      gender: this.preview.matchInfo.gender || 'men',
      team1Id: team1.localTeam!._id,
      team2Id: team2.localTeam!._id,
      venue: this.preview.matchInfo.venue || '',
      date: this.preview.matchInfo.date ? new Date(this.preview.matchInfo.date).toISOString().split('T')[0] : '',
      title: this.preview.matchInfo.title || '',
      espnUrl: this.preview.scorecardUrl || this.preview.espnUrl,
      team1Squad,
      team2Squad
    };
    
    this.importApplied.emit(result);
    this.expanded = false;
    this.clearPreview();
  }
}
