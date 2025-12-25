import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerService, CountryService, BulkImportResult, UploadService, UploadProgress, EspnService, EspnPlayerSyncPreview, EspnPlayerSyncResult } from '../../../core/services';
import { Player, Country, PlayerRole, BattingStyle, BowlingStyle } from '../../../core/models';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Players</h2>
        <div class="flex gap-2">
          @if (filters.country && filteredPlayers.length > 0) {
            <button 
              (click)="confirmBulkDelete()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              title="Delete all players for selected country"
            >
              🗑️ Delete All ({{ filteredPlayers.length }})
            </button>
          }
          <button 
            (click)="openEspnSyncModal()"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            [disabled]="!filters.country"
            [title]="!filters.country ? 'Select a country first' : 'Auto-sync players from ESPN Cricinfo'"
          >
            🔄 Sync with ESPN
          </button>
          <button 
            (click)="openBulkImportModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            [disabled]="!filters.country"
            [title]="!filters.country ? 'Select a country first to bulk import' : 'Bulk import players from ESPN Cricinfo'"
          >
            📥 Bulk Import
          </button>
          <button 
            (click)="openModal()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            [disabled]="countries.length === 0"
          >
            + Add Player
          </button>
        </div>
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
            <label class="block text-xs text-gray-500 mb-1">Gender</label>
            <select 
              [(ngModel)]="filters.gender"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              <option value="M">Men</option>
              <option value="F">Women</option>
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
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
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                      @if (player.imageUrl) {
                        <img 
                          [src]="player.imageUrl" 
                          [alt]="player.name"
                          class="w-10 h-10 rounded-full object-cover bg-gray-100"
                          (error)="onImageError($event)"
                        >
                      } @else {
                        <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                          {{ player.name.charAt(0) }}
                        </div>
                      }
                      <span class="font-medium text-gray-900">{{ player.name }}</span>
                    </div>
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

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      [(ngModel)]="form.gender" 
                      name="gender" 
                      value="M"
                      class="text-blue-600 focus:ring-blue-500"
                    >
                    <span class="text-gray-700">Male</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      [(ngModel)]="form.gender" 
                      name="gender" 
                      value="F"
                      class="text-pink-600 focus:ring-pink-500"
                    >
                    <span class="text-gray-700">Female</span>
                  </label>
                </div>
              </div>

              @if (editingPlayer) {
                <!-- Player Image Upload -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Player Image</label>
                  <div class="flex items-start gap-4">
                    <!-- Current Image Preview -->
                    <div class="flex-shrink-0">
                      @if (form.imageUrl || form.previewUrl) {
                        <img 
                          [src]="form.previewUrl || form.imageUrl" 
                          [alt]="form.name"
                          class="w-20 h-20 rounded-lg object-cover bg-gray-100 border"
                          (error)="onPreviewImageError($event)"
                        >
                      } @else {
                        <div class="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        </div>
                      }
                    </div>
                    <!-- Upload Controls -->
                    <div class="flex-1">
                      <input 
                        type="file" 
                        #fileInput
                        (change)="onImageSelected($event)"
                        accept="image/jpeg,image/png,image/webp"
                        class="hidden"
                      >
                      <div class="flex flex-wrap gap-2">
                        <button 
                          type="button"
                          (click)="fileInput.click()"
                          [disabled]="uploadingImage"
                          class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {{ form.imageUrl || form.previewUrl ? 'Change Image' : 'Upload Image' }}
                        </button>
                        @if (form.imageUrl && !form.previewUrl) {
                          <button 
                            type="button"
                            (click)="removeImage()"
                            [disabled]="uploadingImage"
                            class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        }
                        @if (form.previewUrl) {
                          <button 
                            type="button"
                            (click)="cancelImageSelection()"
                            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        }
                      </div>
                      @if (uploadingImage) {
                        <div class="mt-2">
                          <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              class="h-full bg-blue-600 transition-all duration-300"
                              [style.width.%]="uploadProgress"
                            ></div>
                          </div>
                          <p class="text-xs text-gray-500 mt-1">Uploading... {{ uploadProgress }}%</p>
                        </div>
                      }
                      <p class="text-xs text-gray-500 mt-1">JPEG, PNG, or WebP. Max 5MB.</p>
                    </div>
                  </div>
                </div>

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
                  [disabled]="saving || uploadingImage"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {{ uploadingImage ? 'Uploading...' : (saving ? 'Saving...' : 'Save') }}
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

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">🚨 Delete All Players</h3>
              <p class="text-gray-600 mb-4">
                Are you sure you want to delete <strong>all {{ filteredPlayers.length }} players</strong> 
                from <strong>{{ getSelectedCountryName() }}</strong>?
              </p>
              <p class="text-red-600 text-sm mb-6">
                ⚠️ This action cannot be undone!
              </p>

              @if (bulkDeleteError) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ bulkDeleteError }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <button 
                  (click)="closeBulkDeleteModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  (click)="executeBulkDelete()"
                  [disabled]="bulkDeleting"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {{ bulkDeleting ? 'Deleting...' : 'Delete All Players' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Bulk Import Modal -->
      @if (showBulkImportModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b sticky top-0 bg-white">
              <h3 class="text-lg font-semibold text-gray-800">
                Bulk Import Players - {{ getSelectedCountryName() }}
              </h3>
            </div>
            <div class="p-6">
              <!-- Instructions -->
              <div class="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <p class="font-medium mb-2">How to get player data from ESPN Cricinfo:</p>
                <ol class="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Go to the team page on ESPN Cricinfo (e.g., espncricinfo.com/cricketers/team/sri-lanka-8)</li>
                  <li>Open browser DevTools (F12) → Network tab</li>
                  <li>Refresh the page and look for API requests with player data</li>
                  <li>Copy the <strong>entire JSON response</strong> (or just the <code class="bg-blue-100 px-1 rounded">results</code> array)</li>
                  <li>Paste below - both formats work!</li>
                </ol>
              </div>

              <!-- JSON Input -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ESPN Cricinfo Players JSON (paste the results array)
                </label>
                <textarea
                  [(ngModel)]="bulkImportJson"
                  rows="10"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder='{"total": 66, "results": [...]} or [{"id": 12345, "longName": "Player Name", ...}]'
                  (input)="validateBulkImportJson()"
                ></textarea>
              </div>

              <!-- Validation Status -->
              @if (bulkImportJson) {
                <div class="mb-4">
                  @if (bulkImportValidation.valid) {
                    <div class="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                      ✓ Valid JSON: Found {{ bulkImportValidation.totalPlayers }} players
                      <div class="mt-1 flex gap-4">
                        <span class="inline-flex items-center gap-1">
                          <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {{ bulkImportValidation.malePlayers }} Men
                        </span>
                        <span class="inline-flex items-center gap-1">
                          <span class="w-2 h-2 bg-pink-500 rounded-full"></span>
                          {{ bulkImportValidation.femalePlayers }} Women
                        </span>
                      </div>
                      <div class="mt-1 text-green-600">Both will be imported!</div>
                    </div>
                  } @else {
                    <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      ✗ {{ bulkImportValidation.error }}
                    </div>
                  }
                </div>
              }

              <!-- Import Result -->
              @if (bulkImportResult) {
                <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 class="font-medium text-gray-800 mb-2">Import Results:</h4>
                  <div class="grid grid-cols-3 gap-4 text-center mb-3">
                    <div class="p-2 bg-green-100 rounded">
                      <div class="text-2xl font-bold text-green-700">{{ bulkImportResult.created }}</div>
                      <div class="text-xs text-green-600">Created</div>
                    </div>
                    <div class="p-2 bg-blue-100 rounded">
                      <div class="text-2xl font-bold text-blue-700">{{ bulkImportResult.updated }}</div>
                      <div class="text-xs text-blue-600">Updated</div>
                    </div>
                    <div class="p-2 bg-yellow-100 rounded">
                      <div class="text-2xl font-bold text-yellow-700">{{ bulkImportResult.skipped }}</div>
                      <div class="text-xs text-yellow-600">Skipped</div>
                    </div>
                  </div>
                  <div class="flex justify-center gap-6 text-sm">
                    <span class="text-blue-600">👨 {{ bulkImportResult.menImported }} Men</span>
                    <span class="text-pink-600">👩 {{ bulkImportResult.womenImported }} Women</span>
                  </div>
                  @if (bulkImportResult.errors.length > 0) {
                    <div class="mt-3 text-sm text-red-600">
                      <p class="font-medium">Errors:</p>
                      <ul class="list-disc list-inside">
                        @for (err of bulkImportResult.errors.slice(0, 5); track err.name) {
                          <li>{{ err.name }}: {{ err.reason }}</li>
                        }
                        @if (bulkImportResult.errors.length > 5) {
                          <li>...and {{ bulkImportResult.errors.length - 5 }} more</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              }

              @if (bulkImportError) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ bulkImportError }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <button 
                  type="button"
                  (click)="closeBulkImportModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {{ bulkImportResult ? 'Close' : 'Cancel' }}
                </button>
                @if (!bulkImportResult) {
                  <button 
                    (click)="executeBulkImport()"
                    [disabled]="bulkImporting || !bulkImportValidation.valid"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ bulkImporting ? 'Importing...' : 'Import Players' }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ESPN Sync Modal -->
      @if (showEspnSyncModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div class="px-6 py-4 border-b">
              <h3 class="text-lg font-semibold text-gray-800">
                🔄 Sync Players from ESPN - {{ getSelectedCountryName() }}
              </h3>
            </div>
            <div class="p-6">
              <!-- Loading Preview -->
              @if (espnSyncLoading && !espnSyncPreview) {
                <div class="text-center py-8">
                  <div class="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p class="text-gray-600">Fetching players from ESPN Cricinfo...</p>
                </div>
              }

              <!-- Preview Data -->
              @if (espnSyncPreview && !espnSyncResult) {
                <div class="space-y-4">
                  <!-- ESPN Data Summary -->
                  <div class="p-4 bg-purple-50 rounded-lg">
                    <h4 class="font-medium text-purple-800 mb-2">Found on ESPN Cricinfo:</h4>
                    <div class="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div class="text-2xl font-bold text-purple-700">{{ espnSyncPreview.espnData.total }}</div>
                        <div class="text-xs text-purple-600">Total Players</div>
                      </div>
                      <div>
                        <div class="text-2xl font-bold text-blue-600">~{{ espnSyncPreview.espnData.estimatedMen }}</div>
                        <div class="text-xs text-blue-500">Men</div>
                      </div>
                      <div>
                        <div class="text-2xl font-bold text-pink-600">~{{ espnSyncPreview.espnData.estimatedWomen }}</div>
                        <div class="text-xs text-pink-500">Women</div>
                      </div>
                    </div>
                  </div>

                  <!-- Existing Players -->
                  <div class="p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-medium text-gray-700 mb-2">Already in database:</h4>
                    <div class="flex justify-center gap-8">
                      <div class="text-center">
                        <span class="text-xl font-bold text-gray-700">{{ espnSyncPreview.existingPlayers.men }}</span>
                        <span class="text-sm text-gray-500 ml-1">Men</span>
                      </div>
                      <div class="text-center">
                        <span class="text-xl font-bold text-gray-700">{{ espnSyncPreview.existingPlayers.women }}</span>
                        <span class="text-sm text-gray-500 ml-1">Women</span>
                      </div>
                    </div>
                  </div>

                  <!-- Sample Players -->
                  @if (espnSyncPreview.espnData.samplePlayers.length > 0) {
                    <div class="text-sm text-gray-600">
                      <p class="font-medium mb-1">Sample players:</p>
                      <p class="text-gray-500">
                        {{ getSamplePlayerNames() }}
                      </p>
                    </div>
                  }

                  <!-- Info -->
                  <div class="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    ℹ️ New players will be imported. Existing players (matched by name) will be skipped.
                  </div>
                </div>
              }

              <!-- Sync Result -->
              @if (espnSyncResult) {
                <div class="space-y-4">
                  <div class="p-4 bg-green-50 rounded-lg">
                    <h4 class="font-medium text-green-800 mb-3">✓ Import Complete!</h4>
                    <div class="grid grid-cols-2 gap-4 text-center">
                      <div class="p-3 bg-white rounded">
                        <div class="text-3xl font-bold text-green-600">{{ espnSyncResult.created }}</div>
                        <div class="text-sm text-green-700">Players Created</div>
                      </div>
                      <div class="p-3 bg-white rounded">
                        <div class="text-3xl font-bold text-gray-500">{{ espnSyncResult.skipped }}</div>
                        <div class="text-sm text-gray-600">Skipped (existing)</div>
                      </div>
                    </div>
                    <div class="flex justify-center gap-6 mt-3 text-sm">
                      <span class="text-blue-600">👨 {{ espnSyncResult.menCreated }} men</span>
                      <span class="text-pink-600">👩 {{ espnSyncResult.womenCreated }} women</span>
                    </div>
                  </div>

                  @if (espnSyncResult.errors.length > 0) {
                    <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      <p class="font-medium">Some errors occurred:</p>
                      <ul class="list-disc list-inside mt-1">
                        @for (err of espnSyncResult.errors.slice(0, 3); track err.name) {
                          <li>{{ err.name }}: {{ err.reason }}</li>
                        }
                        @if (espnSyncResult.errors.length > 3) {
                          <li>...and {{ espnSyncResult.errors.length - 3 }} more</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              }

              <!-- Error -->
              @if (espnSyncError) {
                <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                  <p class="font-medium">Error:</p>
                  <p>{{ espnSyncError }}</p>
                  <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                    <p class="font-medium">💡 Alternative: Use Bulk Import</p>
                    <p class="mt-1">ESPN's player API may have changed. You can still import players manually:</p>
                    <ol class="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to ESPN Cricinfo team page</li>
                      <li>Open DevTools (F12) → Network tab</li>
                      <li>Look for player JSON data</li>
                      <li>Use "Bulk Import" button to paste JSON</li>
                    </ol>
                  </div>
                </div>
              }

              <!-- Actions -->
              <div class="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  (click)="closeEspnSyncModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {{ espnSyncResult ? 'Close' : 'Cancel' }}
                </button>
                @if (espnSyncPreview && !espnSyncResult && !espnSyncLoading) {
                  <button 
                    (click)="executeEspnSync()"
                    [disabled]="espnSyncLoading"
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {{ espnSyncLoading ? 'Importing...' : 'Import ' + espnSyncPreview.espnData.total + ' Players' }}
                  </button>
                }
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

  filters = { country: '', role: '', gender: '' };
  searchTerm = '';

  showModal = false;
  editingPlayer: Player | null = null;
  form: {
    name: string;
    country: string;
    role: PlayerRole | '';
    battingStyle: BattingStyle | '';
    bowlingStyle: BowlingStyle | '';
    gender: 'M' | 'F';
    isActive: boolean;
    imageUrl: string | null;
    previewUrl: string | null;
    selectedFile: File | null;
  } = {
    name: '',
    country: '',
    role: '',
    battingStyle: '',
    bowlingStyle: '',
    gender: 'M',
    isActive: true,
    imageUrl: null,
    previewUrl: null,
    selectedFile: null
  };
  saving = false;
  error = '';

  // Image upload state
  uploadingImage = false;
  uploadProgress = 0;

  showDeleteModal = false;
  deletingPlayer: Player | null = null;
  deleting = false;
  deleteError = '';

  // Bulk Import
  showBulkImportModal = false;
  bulkImportJson = '';
  bulkImporting = false;
  bulkImportError = '';
  bulkImportResult: BulkImportResult | null = null;
  bulkImportValidation = {
    valid: false,
    totalPlayers: 0,
    malePlayers: 0,
    femalePlayers: 0,
    error: ''
  };

  // Bulk Delete
  showBulkDeleteModal = false;
  bulkDeleting = false;
  bulkDeleteError = '';

  // ESPN Sync
  showEspnSyncModal = false;
  espnSyncLoading = false;
  espnSyncError = '';
  espnSyncPreview: EspnPlayerSyncPreview | null = null;
  espnSyncResult: EspnPlayerSyncResult | null = null;

  constructor(
    private playerService: PlayerService,
    private countryService: CountryService,
    private uploadService: UploadService,
    private espnService: EspnService
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

      // Gender filter
      if (this.filters.gender && player.gender !== this.filters.gender) {
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
        gender: player.gender || 'M',
        isActive: player.isActive,
        imageUrl: player.imageUrl || null,
        previewUrl: null,
        selectedFile: null
      };
    } else {
      this.form = {
        name: '',
        country: '',
        role: '',
        battingStyle: '',
        bowlingStyle: '',
        gender: 'M',
        isActive: true,
        imageUrl: null,
        previewUrl: null,
        selectedFile: null
      };
    }
    
    this.error = '';
    this.showModal = true;
  }

  closeModal() {
    // Clean up preview URL if exists
    if (this.form.previewUrl) {
      URL.revokeObjectURL(this.form.previewUrl);
    }
    this.showModal = false;
    this.editingPlayer = null;
    this.error = '';
    this.uploadingImage = false;
    this.uploadProgress = 0;
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

    // If editing and there's a new image selected, upload it first
    if (this.editingPlayer && this.form.selectedFile) {
      this.uploadImageAndSave();
      return;
    }

    this.savePlayerData();
  }

  private savePlayerData() {
    const data: any = {
      name: this.form.name.trim(),
      country: this.form.country,
      role: this.form.role as PlayerRole,
      battingStyle: this.form.battingStyle as BattingStyle,
      bowlingStyle: this.form.bowlingStyle as BowlingStyle,
      gender: this.form.gender,
      isActive: this.form.isActive
    };

    // Include imageUrl in update (can be null to clear, or URL string)
    if (this.editingPlayer) {
      data.imageUrl = this.form.imageUrl;
    }

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

  // Bulk Import Methods
  openBulkImportModal() {
    this.showBulkImportModal = true;
    this.bulkImportJson = '';
    this.bulkImportError = '';
    this.bulkImportResult = null;
    this.bulkImportValidation = {
      valid: false,
      totalPlayers: 0,
      malePlayers: 0,
      femalePlayers: 0,
      error: ''
    };
  }

  closeBulkImportModal() {
    // Reload players if import was successful (check before clearing)
    const shouldReload = this.bulkImportResult !== null;
    
    this.showBulkImportModal = false;
    this.bulkImportJson = '';
    this.bulkImportError = '';
    this.bulkImportResult = null;
    
    if (shouldReload) {
      this.loadPlayers();
    }
  }

  getSelectedCountryName(): string {
    const country = this.countries.find(c => c._id === this.filters.country);
    return country?.name || 'Unknown';
  }

  validateBulkImportJson() {
    this.bulkImportValidation = {
      valid: false,
      totalPlayers: 0,
      malePlayers: 0,
      femalePlayers: 0,
      error: ''
    };

    if (!this.bulkImportJson.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(this.bulkImportJson);
      
      // Handle both formats: array OR object with results array
      let playersArray: any[];
      if (Array.isArray(parsed)) {
        playersArray = parsed;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        // Full ESPN response object
        playersArray = parsed.results;
      } else {
        this.bulkImportValidation.error = 'Invalid format: expected an array or ESPN response with results array';
        return;
      }

      if (playersArray.length === 0) {
        this.bulkImportValidation.error = 'No players found in data';
        return;
      }

      // Check if first item looks like ESPN data
      const first = playersArray[0];
      if (!first.longName && !first.name) {
        this.bulkImportValidation.error = 'Invalid format: players must have name or longName field';
        return;
      }

      const malePlayers = playersArray.filter((p: any) => p.gender === 'M');
      const femalePlayers = playersArray.filter((p: any) => p.gender === 'F');
      
      this.bulkImportValidation = {
        valid: malePlayers.length > 0 || femalePlayers.length > 0,
        totalPlayers: playersArray.length,
        malePlayers: malePlayers.length,
        femalePlayers: femalePlayers.length,
        error: malePlayers.length === 0 && femalePlayers.length === 0 ? 'No players with valid gender (M/F) found' : ''
      };
    } catch (e) {
      this.bulkImportValidation.error = 'Invalid JSON format';
    }
  }

  executeBulkImport() {
    if (!this.filters.country || !this.bulkImportValidation.valid) {
      return;
    }

    this.bulkImporting = true;
    this.bulkImportError = '';

    let players: any[];
    try {
      players = JSON.parse(this.bulkImportJson);
    } catch (e) {
      this.bulkImportError = 'Failed to parse JSON';
      this.bulkImporting = false;
      return;
    }

    this.playerService.bulkImport(this.filters.country, players).subscribe({
      next: (response) => {
        if (response.success) {
          this.bulkImportResult = response.data;
          this.loadPlayers();
        } else {
          this.bulkImportError = response.message || 'Failed to import players';
        }
        this.bulkImporting = false;
      },
      error: (err) => {
        this.bulkImportError = err.error?.message || 'Failed to import players';
        this.bulkImporting = false;
      }
    });
  }

  onImageError(event: Event) {
    // Hide broken image and show fallback
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onPreviewImageError(event: Event) {
    // Reset preview if it fails to load
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.error = 'Invalid file type. Please upload JPEG, PNG, or WebP.';
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.error = 'File too large. Maximum size is 5MB.';
      return;
    }
    
    // Create preview URL
    this.form.selectedFile = file;
    this.form.previewUrl = URL.createObjectURL(file);
    this.error = '';
    
    // Clear the file input so the same file can be selected again if needed
    input.value = '';
  }

  cancelImageSelection() {
    if (this.form.previewUrl) {
      URL.revokeObjectURL(this.form.previewUrl);
    }
    this.form.previewUrl = null;
    this.form.selectedFile = null;
  }

  removeImage() {
    this.form.imageUrl = null;
    this.form.previewUrl = null;
    this.form.selectedFile = null;
  }

  private uploadImageAndSave(): void {
    if (!this.editingPlayer || !this.form.selectedFile) {
      this.savePlayerData();
      return;
    }
    
    this.uploadingImage = true;
    this.uploadProgress = 0;
    
    this.uploadService.uploadPlayerImage(this.editingPlayer._id, this.form.selectedFile).subscribe({
      next: (progress: UploadProgress) => {
        this.uploadProgress = progress.progress;
        
        if (progress.state === 'done' && progress.file) {
          this.form.imageUrl = progress.file.url;
          this.uploadingImage = false;
          // Clean up preview URL
          if (this.form.previewUrl) {
            URL.revokeObjectURL(this.form.previewUrl);
            this.form.previewUrl = null;
          }
          this.form.selectedFile = null;
          // Now save the player with the new image URL
          this.savePlayerData();
        } else if (progress.state === 'error') {
          this.error = progress.error || 'Failed to upload image';
          this.uploadingImage = false;
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to upload image';
        this.uploadingImage = false;
      }
    });
  }

  // Bulk Delete Methods
  confirmBulkDelete() {
    this.showBulkDeleteModal = true;
    this.bulkDeleteError = '';
  }

  closeBulkDeleteModal() {
    this.showBulkDeleteModal = false;
    this.bulkDeleteError = '';
  }

  executeBulkDelete() {
    if (!this.filters.country) return;

    this.bulkDeleting = true;
    this.bulkDeleteError = '';

    this.playerService.bulkDelete(this.filters.country).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadPlayers();
          this.closeBulkDeleteModal();
        } else {
          this.bulkDeleteError = response.message || 'Failed to delete players';
        }
        this.bulkDeleting = false;
      },
      error: (err) => {
        this.bulkDeleteError = err.error?.message || 'Failed to delete players';
        this.bulkDeleting = false;
      }
    });
  }

  // ESPN Sync Methods
  getSamplePlayerNames(): string {
    if (!this.espnSyncPreview?.espnData?.samplePlayers) return '';
    return this.espnSyncPreview.espnData.samplePlayers.map(p => p.name).join(', ');
  }

  openEspnSyncModal() {
    if (!this.filters.country) return;
    
    this.showEspnSyncModal = true;
    this.espnSyncLoading = true;
    this.espnSyncError = '';
    this.espnSyncPreview = null;
    this.espnSyncResult = null;
    
    // Fetch preview from backend
    this.espnService.previewPlayerSync(this.filters.country).subscribe({
      next: (response) => {
        if (response.success) {
          this.espnSyncPreview = response.data;
        } else {
          this.espnSyncError = response.message || 'Failed to fetch players from ESPN';
        }
        this.espnSyncLoading = false;
      },
      error: (err) => {
        this.espnSyncError = err.error?.message || 'Failed to connect to ESPN. Check if the country has an ESPN team ID mapping.';
        this.espnSyncLoading = false;
      }
    });
  }

  closeEspnSyncModal() {
    const shouldReload = this.espnSyncResult !== null;
    
    this.showEspnSyncModal = false;
    this.espnSyncPreview = null;
    this.espnSyncResult = null;
    this.espnSyncError = '';
    
    if (shouldReload) {
      this.loadPlayers();
    }
  }

  executeEspnSync() {
    if (!this.filters.country) return;
    
    this.espnSyncLoading = true;
    this.espnSyncError = '';
    
    this.espnService.syncPlayersFromEspn(this.filters.country).subscribe({
      next: (response) => {
        if (response.success) {
          this.espnSyncResult = response.data;
        } else {
          this.espnSyncError = response.message || 'Failed to sync players from ESPN';
        }
        this.espnSyncLoading = false;
      },
      error: (err) => {
        this.espnSyncError = err.error?.message || 'Failed to sync players from ESPN';
        this.espnSyncLoading = false;
      }
    });
  }
}
