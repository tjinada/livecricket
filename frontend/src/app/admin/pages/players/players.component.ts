import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerService, CountryService } from '../../../core/services';
import { Player, Country, PlayerRole, BattingStyle, BowlingStyle } from '../../../core/models';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Players</h2>
        <button 
          (click)="openModal()"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          [disabled]="countries.length === 0"
        >
          + Add Player
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-wrap gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Country</label>
            <select 
              [(ngModel)]="filters.country"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Countries</option>
              @for (country of countries; track country._id) {
                <option [value]="country._id">{{ country.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Role</label>
            <select 
              [(ngModel)]="filters.role"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Roles</option>
              <option value="batsman">Batsman</option>
              <option value="bowler">Bowler</option>
              <option value="all-rounder">All-rounder</option>
              <option value="wicket-keeper">Wicket-keeper</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Search</label>
            <input 
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              placeholder="Search by name..."
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="text-center py-12">
          <p class="text-gray-500">Loading players...</p>
        </div>
      } @else if (countries.length === 0) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500 mb-4">Add countries first before adding players</p>
          <a href="/admin/countries" class="text-green-600 hover:text-green-800">
            Go to Countries →
          </a>
        </div>
      } @else if (filteredPlayers.length === 0) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500 mb-4">
            {{ players.length === 0 ? 'No players yet' : 'No players match your filters' }}
          </p>
          @if (players.length === 0) {
            <button 
              (click)="openModal()"
              class="text-green-600 hover:text-green-800"
            >
              Add your first player
            </button>
          }
        </div>
      } @else {
        <!-- Players Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batting</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bowling</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (player of filteredPlayers; track player._id) {
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {{ player.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                    {{ getCountryName(player.country) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs rounded-full"
                      [class]="getRoleBadgeClass(player.role)">
                      {{ formatRole(player.role) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                    {{ formatBattingStyle(player.battingStyle) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                    {{ formatBowlingStyle(player.bowlingStyle) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      class="px-2 py-1 text-xs rounded-full"
                      [class.bg-green-100]="player.isActive"
                      [class.text-green-800]="player.isActive"
                      [class.bg-gray-100]="!player.isActive"
                      [class.text-gray-800]="!player.isActive"
                    >
                      {{ player.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      (click)="editPlayer(player)"
                      class="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button 
                      (click)="confirmDelete(player)"
                      class="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <p class="text-sm text-gray-500 mt-4">
          Showing {{ filteredPlayers.length }} of {{ players.length }} players
        </p>
      }

      <!-- Add/Edit Modal -->
      @if (showModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b sticky top-0 bg-white">
              <h3 class="text-lg font-semibold text-gray-800">
                {{ editingPlayer ? 'Edit Player' : 'Add Player' }}
              </h3>
            </div>
            <form (ngSubmit)="savePlayer()" class="p-6">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                <input 
                  type="text"
                  [(ngModel)]="form.name"
                  name="name"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Virat Kohli"
                >
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select 
                  [(ngModel)]="form.country"
                  name="country"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Country</option>
                  @for (country of countries; track country._id) {
                    <option [value]="country._id">{{ country.name }}</option>
                  }
                </select>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  [(ngModel)]="form.role"
                  name="role"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Role</option>
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-rounder</option>
                  <option value="wicket-keeper">Wicket-keeper</option>
                </select>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Batting Style</label>
                <select 
                  [(ngModel)]="form.battingStyle"
                  name="battingStyle"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Batting Style</option>
                  <option value="right-hand">Right-hand</option>
                  <option value="left-hand">Left-hand</option>
                </select>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Bowling Style</label>
                <select 
                  [(ngModel)]="form.bowlingStyle"
                  name="bowlingStyle"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Bowling Style</option>
                  <option value="none">None (Pure Batsman)</option>
                  <option value="right-arm-fast">Right-arm Fast</option>
                  <option value="right-arm-medium">Right-arm Medium</option>
                  <option value="left-arm-fast">Left-arm Fast</option>
                  <option value="left-arm-medium">Left-arm Medium</option>
                  <option value="right-arm-off-spin">Right-arm Off-spin</option>
                  <option value="right-arm-leg-spin">Right-arm Leg-spin</option>
                  <option value="left-arm-orthodox">Left-arm Orthodox</option>
                  <option value="left-arm-chinaman">Left-arm Chinaman</option>
                </select>
              </div>

              @if (editingPlayer) {
                <div class="mb-6">
                  <label class="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      [(ngModel)]="form.isActive"
                      name="isActive"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    >
                    <span class="text-sm text-gray-700">Active player</span>
                  </label>
                </div>
              }

              @if (error) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ error }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <button 
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  [disabled]="saving"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Player</h3>
              <p class="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{{ deletingPlayer?.name }}</strong>? 
                This action cannot be undone.
              </p>

              @if (deleteError) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ deleteError }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <button 
                  (click)="closeDeleteModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  (click)="deletePlayer()"
                  [disabled]="deleting"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PlayersComponent implements OnInit {
  players: Player[] = [];
  filteredPlayers: Player[] = [];
  countries: Country[] = [];
  loading = true;

  filters = { country: '', role: '' };
  searchTerm = '';

  showModal = false;
  editingPlayer: Player | null = null;
  form = {
    name: '',
    country: '',
    role: '' as PlayerRole | '',
    battingStyle: '' as BattingStyle | '',
    bowlingStyle: '' as BowlingStyle | '',
    isActive: true
  };
  saving = false;
  error = '';

  showDeleteModal = false;
  deletingPlayer: Player | null = null;
  deleting = false;
  deleteError = '';

  constructor(
    private playerService: PlayerService,
    private countryService: CountryService
  ) {}

  ngOnInit() {
    this.loadCountries();
    this.loadPlayers();
  }

  loadCountries() {
    this.countryService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.countries = response.data;
        }
      }
    });
  }

  loadPlayers() {
    this.loading = true;
    this.playerService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.players = response.data;
          this.applyFilters();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.filteredPlayers = this.players.filter(player => {
      // Country filter
      if (this.filters.country) {
        const countryId = typeof player.country === 'string' 
          ? player.country 
          : player.country._id;
        if (countryId !== this.filters.country) return false;
      }

      // Role filter
      if (this.filters.role && player.role !== this.filters.role) {
        return false;
      }

      // Search filter
      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        if (!player.name.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  }

  getCountryName(country: Country | string): string {
    if (typeof country === 'string') {
      const found = this.countries.find(c => c._id === country);
      return found?.name || 'Unknown';
    }
    return country.name;
  }

  formatRole(role: PlayerRole): string {
    return role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  getRoleBadgeClass(role: PlayerRole): string {
    switch (role) {
      case 'batsman': return 'bg-blue-100 text-blue-800';
      case 'bowler': return 'bg-green-100 text-green-800';
      case 'all-rounder': return 'bg-purple-100 text-purple-800';
      case 'wicket-keeper': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatBattingStyle(style: BattingStyle): string {
    return style === 'right-hand' ? 'RHB' : 'LHB';
  }

  formatBowlingStyle(style: BowlingStyle): string {
    const map: Record<BowlingStyle, string> = {
      'none': '-',
      'right-arm-fast': 'RF',
      'right-arm-medium': 'RM',
      'left-arm-fast': 'LF',
      'left-arm-medium': 'LM',
      'right-arm-off-spin': 'OB',
      'right-arm-leg-spin': 'LB',
      'left-arm-orthodox': 'SLA',
      'left-arm-chinaman': 'LC'
    };
    return map[style] || style;
  }

  openModal(player?: Player) {
    this.editingPlayer = player || null;
    
    if (player) {
      const countryId = typeof player.country === 'string' 
        ? player.country 
        : player.country._id;
      
      this.form = {
        name: player.name,
        country: countryId,
        role: player.role,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        isActive: player.isActive
      };
    } else {
      this.form = {
        name: '',
        country: '',
        role: '',
        battingStyle: '',
        bowlingStyle: '',
        isActive: true
      };
    }
    
    this.error = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingPlayer = null;
    this.error = '';
  }

  editPlayer(player: Player) {
    this.openModal(player);
  }

  savePlayer() {
    if (!this.form.name || !this.form.country || !this.form.role || 
        !this.form.battingStyle || !this.form.bowlingStyle) {
      this.error = 'All fields are required';
      return;
    }

    this.saving = true;
    this.error = '';

    const data = {
      name: this.form.name.trim(),
      country: this.form.country,
      role: this.form.role as PlayerRole,
      battingStyle: this.form.battingStyle as BattingStyle,
      bowlingStyle: this.form.bowlingStyle as BowlingStyle,
      isActive: this.form.isActive
    };

    const request = this.editingPlayer
      ? this.playerService.update(this.editingPlayer._id, data)
      : this.playerService.create(data);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.loadPlayers();
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to save player';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save player';
        this.saving = false;
      }
    });
  }

  confirmDelete(player: Player) {
    this.deletingPlayer = player;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletingPlayer = null;
    this.deleteError = '';
  }

  deletePlayer() {
    if (!this.deletingPlayer) return;

    this.deleting = true;
    this.deleteError = '';

    this.playerService.delete(this.deletingPlayer._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadPlayers();
          this.closeDeleteModal();
        } else {
          this.deleteError = response.message || 'Failed to delete player';
        }
        this.deleting = false;
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete player';
        this.deleting = false;
      }
    });
  }
}
