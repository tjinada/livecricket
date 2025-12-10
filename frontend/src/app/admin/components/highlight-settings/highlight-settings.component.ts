import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, HighlightSettings } from '../../../core/services/settings.service';

@Component({
  selector: 'app-highlight-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Highlight & Notification Timings</h3>
      <p class="text-sm text-gray-500 mb-6">
        Configure timing durations for highlight videos and live scoring notifications.
      </p>

      @if (loading) {
        <div class="text-center py-8">
          <p class="text-gray-500">Loading settings...</p>
        </div>
      } @else if (settings) {
        <!-- Tabs -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="flex gap-4">
            <button 
              (click)="activeTab = 'scoring'"
              [class]="activeTab === 'scoring' ? 'border-b-2 border-blue-500 text-blue-600 pb-2 font-medium' : 'text-gray-500 pb-2 hover:text-gray-700'"
            >
              Scoring Events
            </button>
            <button 
              (click)="activeTab = 'screens'"
              [class]="activeTab === 'screens' ? 'border-b-2 border-blue-500 text-blue-600 pb-2 font-medium' : 'text-gray-500 pb-2 hover:text-gray-700'"
            >
              Intro & Summary Screens
            </button>
            <button 
              (click)="activeTab = 'notifications'"
              [class]="activeTab === 'notifications' ? 'border-b-2 border-blue-500 text-blue-600 pb-2 font-medium' : 'text-gray-500 pb-2 hover:text-gray-700'"
            >
              Live Notifications
            </button>
          </nav>
        </div>

        <!-- Scoring Events Tab -->
        @if (activeTab === 'scoring') {
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="p-3 bg-gray-50 rounded-lg">
              <label class="block text-sm text-gray-600 mb-1">🏏 Four</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.durations.four"
                  (ngModelChange)="markDirty()"
                  min="500" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                <span class="text-xs text-gray-500">ms</span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.four) }}</span>
            </div>

            <div class="p-3 bg-gray-50 rounded-lg">
              <label class="block text-sm text-gray-600 mb-1">💥 Six</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.durations.six"
                  (ngModelChange)="markDirty()"
                  min="500" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                <span class="text-xs text-gray-500">ms</span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.six) }}</span>
            </div>

            <div class="p-3 bg-gray-50 rounded-lg">
              <label class="block text-sm text-gray-600 mb-1">🎯 Wicket</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.durations.wicket"
                  (ngModelChange)="markDirty()"
                  min="500" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                <span class="text-xs text-gray-500">ms</span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.wicket) }}</span>
            </div>

            <div class="p-3 bg-gray-50 rounded-lg">
              <label class="block text-sm text-gray-600 mb-1">⭐ Fifty</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.durations.fifty"
                  (ngModelChange)="markDirty()"
                  min="500" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                <span class="text-xs text-gray-500">ms</span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.fifty) }}</span>
            </div>

            <div class="p-3 bg-gray-50 rounded-lg">
              <label class="block text-sm text-gray-600 mb-1">🌟 Hundred</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.durations.hundred"
                  (ngModelChange)="markDirty()"
                  min="500" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                <span class="text-xs text-gray-500">ms</span>
              </div>
              <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.hundred) }}</span>
            </div>

            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <label class="block text-sm text-blue-700 mb-1">⏱️ Overlay Gap</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.durations.overlayGap"
                  (ngModelChange)="markDirty()"
                  min="0" 
                  max="5000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-blue-300 rounded text-sm"
                >
                <span class="text-xs text-blue-500">ms</span>
              </div>
              <span class="text-xs text-blue-400">Gap between overlays</span>
            </div>
          </div>
        }

        <!-- Intro & Summary Screens Tab -->
        @if (activeTab === 'screens') {
          <div class="space-y-6">
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">Intro Screens</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="p-3 bg-gray-50 rounded-lg">
                  <label class="block text-sm text-gray-600 mb-1">🎬 Match Intro</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.matchIntro"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="30000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                    <span class="text-xs text-gray-500">ms</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.matchIntro) }}</span>
                </div>

                <div class="p-3 bg-gray-50 rounded-lg">
                  <label class="block text-sm text-gray-600 mb-1">👥 Team Lineup</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.teamLineup"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="30000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                    <span class="text-xs text-gray-500">ms</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.teamLineup) }}</span>
                </div>

                <div class="p-3 bg-gray-50 rounded-lg">
                  <label class="block text-sm text-gray-600 mb-1">📋 Innings Intro</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.inningsIntro"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="30000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                    <span class="text-xs text-gray-500">ms</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.inningsIntro) }}</span>
                </div>

                <div class="p-3 bg-gray-50 rounded-lg">
                  <label class="block text-sm text-gray-600 mb-1">▶️ Innings Start</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.inningsStart"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="30000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                    <span class="text-xs text-gray-500">ms</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.inningsStart) }}</span>
                </div>

                <div class="p-3 bg-gray-50 rounded-lg">
                  <label class="block text-sm text-gray-600 mb-1">🎯 Chase Setup</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.chaseSetup"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="30000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                    <span class="text-xs text-gray-500">ms</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.chaseSetup) }}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">Summary Screens</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div class="p-3 bg-gray-50 rounded-lg">
                  <label class="block text-sm text-gray-600 mb-1">📊 Phase Summary</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.phaseSummary"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="30000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                    <span class="text-xs text-gray-500">ms</span>
                  </div>
                  <span class="text-xs text-gray-400">{{ formatDuration(settings.durations.phaseSummary) }}</span>
                </div>

                <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label class="block text-sm text-amber-700 mb-1">📑 Innings Summary</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.inningsSummary"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="60000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-amber-300 rounded text-sm"
                    >
                    <span class="text-xs text-amber-500">ms</span>
                  </div>
                  <span class="text-xs text-amber-400">{{ formatDuration(settings.durations.inningsSummary) }}</span>
                </div>

                <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label class="block text-sm text-amber-700 mb-1">🏆 Match Result</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.matchResult"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="60000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-amber-300 rounded text-sm"
                    >
                    <span class="text-xs text-amber-500">ms</span>
                  </div>
                  <span class="text-xs text-amber-400">{{ formatDuration(settings.durations.matchResult) }}</span>
                </div>

                <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label class="block text-sm text-amber-700 mb-1">📋 Match Summary</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="number" 
                      [(ngModel)]="settings.durations.matchSummary"
                      (ngModelChange)="markDirty()"
                      min="1000" 
                      max="60000" 
                      step="500"
                      class="w-24 px-2 py-1 border border-amber-300 rounded text-sm"
                    >
                    <span class="text-xs text-amber-500">ms</span>
                  </div>
                  <span class="text-xs text-amber-400">{{ formatDuration(settings.durations.matchSummary) }}</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Live Notifications Tab -->
        @if (activeTab === 'notifications') {
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="p-3 bg-green-50 rounded-lg border border-green-200">
              <label class="block text-sm text-green-700 mb-1">📺 Display Duration</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.liveNotifications.displayDuration"
                  (ngModelChange)="markDirty()"
                  min="500" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-green-300 rounded text-sm"
                >
                <span class="text-xs text-green-500">ms</span>
              </div>
              <span class="text-xs text-green-400">How long notifications show</span>
            </div>

            <div class="p-3 bg-green-50 rounded-lg border border-green-200">
              <label class="block text-sm text-green-700 mb-1">⏳ Cooldown</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.liveNotifications.cooldownDuration"
                  (ngModelChange)="markDirty()"
                  min="0" 
                  max="10000" 
                  step="100"
                  class="w-24 px-2 py-1 border border-green-300 rounded text-sm"
                >
                <span class="text-xs text-green-500">ms</span>
              </div>
              <span class="text-xs text-green-400">Gap between notifications</span>
            </div>

            <div class="p-3 bg-gray-50 rounded-lg">
              <label class="block text-sm text-gray-600 mb-1">📥 Max Queue</label>
              <div class="flex items-center gap-2">
                <input 
                  type="number" 
                  [(ngModel)]="settings.liveNotifications.maxQueueSize"
                  (ngModelChange)="markDirty()"
                  min="1" 
                  max="50" 
                  step="1"
                  class="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                <span class="text-xs text-gray-500">items</span>
              </div>
              <span class="text-xs text-gray-400">Max pending notifications</span>
            </div>
          </div>

          <!-- Preview -->
          <div class="mt-6 p-4 bg-gray-900 rounded-lg">
            <p class="text-xs text-gray-400 mb-2">Timing Preview</p>
            <div class="flex items-center gap-2 text-sm">
              <span class="px-3 py-1 bg-green-600 text-white rounded">FOUR!</span>
              <span class="text-gray-400">→</span>
              <span class="text-gray-500 text-xs">{{ formatDuration(settings.liveNotifications.displayDuration) }}</span>
              <span class="text-gray-400">→</span>
              <span class="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">cooldown {{ formatDuration(settings.liveNotifications.cooldownDuration) }}</span>
              <span class="text-gray-400">→</span>
              <span class="px-3 py-1 bg-purple-600 text-white rounded">SIX!</span>
            </div>
          </div>
        }

        <!-- Save/Reset Buttons -->
        <div class="mt-6 flex justify-between items-center border-t pt-4">
          <button 
            (click)="resetToDefaults()"
            [disabled]="saving"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
          >
            Reset to Defaults
          </button>
          
          <div class="flex items-center gap-4">
            @if (error) {
              <span class="text-red-600 text-sm">{{ error }}</span>
            }
            @if (saved) {
              <span class="text-green-600 text-sm">✓ Settings saved</span>
            }
            @if (isDirty) {
              <span class="text-amber-600 text-sm">Unsaved changes</span>
            }
            <button 
              (click)="saveSettings()"
              [disabled]="saving || !isDirty"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class HighlightSettingsComponent implements OnInit {
  settings: HighlightSettings | null = null;
  loading = true;
  saving = false;
  error = '';
  saved = false;
  isDirty = false;
  activeTab: 'scoring' | 'screens' | 'notifications' = 'scoring';

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    this.settingsService.loadHighlightSettings().subscribe({
      next: (settings) => {
        this.settings = settings;
        this.loading = false;
      },
      error: () => {
        this.settings = this.settingsService.getHighlightDefaults();
        this.loading = false;
      }
    });
  }

  markDirty() {
    this.isDirty = true;
    this.saved = false;
  }

  formatDuration(ms: number): string {
    if (ms >= 1000) {
      const seconds = ms / 1000;
      return seconds === Math.floor(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
    }
    return `${ms}ms`;
  }

  saveSettings() {
    if (!this.settings) return;
    
    this.saving = true;
    this.error = '';
    this.saved = false;

    this.settingsService.updateHighlightSettings(this.settings).subscribe({
      next: (response) => {
        if (response.success) {
          this.saved = true;
          this.isDirty = false;
          setTimeout(() => this.saved = false, 3000);
        } else {
          this.error = 'Failed to save settings';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save settings';
        this.saving = false;
      }
    });
  }

  resetToDefaults() {
    this.saving = true;
    this.error = '';

    this.settingsService.resetHighlightSettings().subscribe({
      next: (response) => {
        if (response.success) {
          this.settings = response.data;
          this.isDirty = false;
          this.saved = true;
          setTimeout(() => this.saved = false, 3000);
        } else {
          this.error = 'Failed to reset settings';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to reset settings';
        this.saving = false;
      }
    });
  }
}
