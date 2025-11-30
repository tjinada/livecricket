import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ViewBackground {
  type: 'image' | 'video' | 'none';
  url: string | null;
}

export interface BackgroundSettings {
  useTeamBackground: boolean;
  views?: {
    'score-summary'?: ViewBackground;
    'player-stats'?: ViewBackground;
    'overall-summary'?: ViewBackground;
    'projections'?: ViewBackground;
  };
}

@Component({
  selector: 'app-background-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="close.emit()">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="px-6 py-4 border-b flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800">Display Background Settings</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Use Team Background Toggle -->
          <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div>
              <h3 class="font-medium text-gray-800">Use Team Background</h3>
              <p class="text-sm text-gray-500">Fall back to batting team's default background when no view-specific background is set</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                [(ngModel)]="settings.useTeamBackground" 
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <!-- View-Specific Backgrounds -->
          <div>
            <h3 class="font-medium text-gray-800 mb-4">View-Specific Backgrounds</h3>
            <div class="space-y-4">
              <!-- Score Summary View -->
              <div class="border rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-3">Live Score View</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm text-gray-600 mb-1">Type</label>
                    <select 
                      [(ngModel)]="viewSettings['score-summary'].type"
                      class="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="none">None</option>
                      <option value="image">Image</option>
                      <option value="video">Video (MP4)</option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm text-gray-600 mb-1">URL</label>
                    <input 
                      type="text"
                      [(ngModel)]="viewSettings['score-summary'].url"
                      placeholder="https://example.com/background.jpg"
                      class="w-full border rounded px-3 py-2 text-sm"
                      [disabled]="viewSettings['score-summary'].type === 'none'"
                    >
                  </div>
                </div>
              </div>

              <!-- Player Stats View -->
              <div class="border rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-3">Scorecard View</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm text-gray-600 mb-1">Type</label>
                    <select 
                      [(ngModel)]="viewSettings['player-stats'].type"
                      class="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="none">None</option>
                      <option value="image">Image</option>
                      <option value="video">Video (MP4)</option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm text-gray-600 mb-1">URL</label>
                    <input 
                      type="text"
                      [(ngModel)]="viewSettings['player-stats'].url"
                      placeholder="https://example.com/background.jpg"
                      class="w-full border rounded px-3 py-2 text-sm"
                      [disabled]="viewSettings['player-stats'].type === 'none'"
                    >
                  </div>
                </div>
              </div>

              <!-- Overall Summary View -->
              <div class="border rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-3">Match Summary View</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm text-gray-600 mb-1">Type</label>
                    <select 
                      [(ngModel)]="viewSettings['overall-summary'].type"
                      class="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="none">None</option>
                      <option value="image">Image</option>
                      <option value="video">Video (MP4)</option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm text-gray-600 mb-1">URL</label>
                    <input 
                      type="text"
                      [(ngModel)]="viewSettings['overall-summary'].url"
                      placeholder="https://example.com/background.jpg"
                      class="w-full border rounded px-3 py-2 text-sm"
                      [disabled]="viewSettings['overall-summary'].type === 'none'"
                    >
                  </div>
                </div>
              </div>

              <!-- Projections View -->
              <div class="border rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-3">Projections View</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm text-gray-600 mb-1">Type</label>
                    <select 
                      [(ngModel)]="viewSettings['projections'].type"
                      class="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="none">None</option>
                      <option value="image">Image</option>
                      <option value="video">Video (MP4)</option>
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm text-gray-600 mb-1">URL</label>
                    <input 
                      type="text"
                      [(ngModel)]="viewSettings['projections'].url"
                      placeholder="https://example.com/background.jpg"
                      class="w-full border rounded px-3 py-2 text-sm"
                      [disabled]="viewSettings['projections'].type === 'none'"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Help Text -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p class="font-medium mb-1">Tips:</p>
            <ul class="list-disc list-inside space-y-1 text-blue-700">
              <li>Use direct URLs to images (JPG, PNG) or videos (MP4)</li>
              <li>Videos will autoplay, loop, and be muted</li>
              <li>For best results, use 1920x1080 resolution</li>
              <li>Team backgrounds can be set in Countries management</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t flex justify-end gap-3">
          <button 
            (click)="close.emit()"
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button 
            (click)="saveSettings()"
            [disabled]="saving"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class BackgroundSettingsComponent implements OnInit {
  @Input() matchId!: string;
  @Input() currentSettings?: any;  // Using any to avoid type conflicts with Match interface
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<BackgroundSettings>();

  saving = false;

  settings: BackgroundSettings = {
    useTeamBackground: true,
    views: {}
  };

  viewSettings: {
    'score-summary': ViewBackground;
    'player-stats': ViewBackground;
    'overall-summary': ViewBackground;
    'projections': ViewBackground;
  } = {
    'score-summary': { type: 'none', url: null },
    'player-stats': { type: 'none', url: null },
    'overall-summary': { type: 'none', url: null },
    'projections': { type: 'none', url: null }
  };

  ngOnInit() {
    if (this.currentSettings) {
      this.settings.useTeamBackground = this.currentSettings.useTeamBackground ?? true;
      
      // Load existing view settings
      const views = ['score-summary', 'player-stats', 'overall-summary', 'projections'] as const;
      views.forEach(view => {
        if (this.currentSettings?.views?.[view]) {
          this.viewSettings[view] = { ...this.currentSettings.views[view]! };
        }
      });
    }
  }

  saveSettings() {
    this.saving = true;

    const result: BackgroundSettings = {
      useTeamBackground: this.settings.useTeamBackground,
      views: {}
    };

    // Only include views that have settings
    const views = ['score-summary', 'player-stats', 'overall-summary', 'projections'] as const;
    views.forEach(view => {
      if (this.viewSettings[view].type !== 'none' || this.viewSettings[view].url) {
        result.views = result.views || {};
        result.views[view] = { ...this.viewSettings[view] };
      }
    });

    this.saved.emit(result);
  }
}
