import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadService, UploadProgress, BackgroundFile } from '../../../core/services/upload.service';

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

type ViewKey = 'score-summary' | 'player-stats' | 'overall-summary' | 'projections';

@Component({
  selector: 'app-background-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="close.emit()">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
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

          <!-- View-specific Backgrounds -->
          <div class="space-y-4">
            <h3 class="font-semibold text-gray-800 border-b pb-2">View-specific Backgrounds</h3>
            
            @for (view of viewKeys; track view) {
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h4 class="font-medium text-gray-800">{{ getViewLabel(view) }}</h4>
                    <p class="text-xs text-gray-500">{{ getViewDescription(view) }}</p>
                  </div>
                  <select 
                    [(ngModel)]="viewSettings[view].type"
                    (ngModelChange)="onTypeChange(view)"
                    class="px-3 py-1.5 border rounded text-sm"
                  >
                    <option value="none">None</option>
                    <option value="image">Image</option>
                    <option value="video">Video (MP4)</option>
                  </select>
                </div>

                @if (viewSettings[view].type !== 'none') {
                  <div class="space-y-3">
                    <!-- Upload Section -->
                    <div class="flex gap-3">
                      <div class="flex-1">
                        <label class="block text-xs font-medium text-gray-600 mb-1">
                          Upload {{ viewSettings[view].type === 'video' ? 'Video' : 'Image' }}
                        </label>
                        <div class="flex gap-2">
                          <input 
                            type="file" 
                            [accept]="viewSettings[view].type === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/gif'"
                            (change)="onFileSelected($event, view)"
                            class="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                          >
                          <button 
                            (click)="showGallery = view"
                            class="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            📁 Gallery
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Upload Progress -->
                    @if (uploadProgress[view]?.state === 'uploading') {
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          class="bg-green-600 h-2 rounded-full transition-all"
                          [style.width.%]="uploadProgress[view]?.progress || 0"
                        ></div>
                      </div>
                    }

                    <!-- URL Input (fallback) -->
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Or enter URL directly</label>
                      <input 
                        type="text"
                        [(ngModel)]="viewSettings[view].url"
                        placeholder="https://example.com/background.{{ viewSettings[view].type === 'video' ? 'mp4' : 'jpg' }}"
                        class="w-full px-3 py-2 border rounded text-sm"
                      >
                    </div>

                    <!-- Preview -->
                    @if (viewSettings[view].url) {
                      <div class="mt-2">
                        <label class="block text-xs font-medium text-gray-600 mb-1">Preview</label>
                        <div class="relative w-full h-32 bg-gray-200 rounded overflow-hidden">
                          @if (viewSettings[view].type === 'video') {
                            <video 
                              [src]="viewSettings[view].url"
                              class="w-full h-full object-cover"
                              muted
                              loop
                              autoplay
                              playsinline
                            ></video>
                          } @else {
                            <img 
                              [src]="viewSettings[view].url" 
                              class="w-full h-full object-cover"
                              (error)="onPreviewError(view)"
                            >
                          }
                          <button 
                            (click)="clearBackground(view)"
                            class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Tips -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 class="font-medium text-blue-800 mb-2">💡 Tips</h4>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• Upload images (JPG, PNG, WebP, GIF) or videos (MP4, WebM)</li>
              <li>• Maximum file size: 50MB</li>
              <li>• Recommended resolution: 1920x1080 or higher</li>
              <li>• Videos will autoplay, loop, and be muted</li>
              <li>• Team backgrounds are set in Countries management</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
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

    <!-- Gallery Modal -->
    @if (showGallery) {
      <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" (click)="showGallery = null">
        <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b flex justify-between items-center">
            <h3 class="font-bold text-gray-800">Select Background</h3>
            <button (click)="showGallery = null" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          <div class="p-4 overflow-y-auto" style="max-height: calc(80vh - 130px);">
            @if (loadingGallery) {
              <div class="text-center py-8 text-gray-500">Loading...</div>
            } @else if (galleryFiles.length === 0) {
              <div class="text-center py-8 text-gray-500">
                <p>No uploaded backgrounds yet.</p>
                <p class="text-sm mt-2">Upload a file to see it here.</p>
              </div>
            } @else {
              <div class="grid grid-cols-3 gap-4">
                @for (file of galleryFiles; track file.filename) {
                  <div 
                    class="relative cursor-pointer rounded overflow-hidden border-2 hover:border-green-500 transition-colors"
                    [class.border-green-500]="selectedGalleryFile === file"
                    [class.border-transparent]="selectedGalleryFile !== file"
                    (click)="selectedGalleryFile = file"
                  >
                    @if (file.type === 'video') {
                      <video 
                        [src]="file.url" 
                        class="w-full h-24 object-cover"
                        muted
                      ></video>
                      <span class="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">📹</span>
                    } @else {
                      <img [src]="file.url" class="w-full h-24 object-cover">
                    }
                    <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 truncate">
                      {{ file.filename }}
                    </div>
                  </div>
                }
              </div>
            }
          </div>
          <div class="px-6 py-4 border-t flex justify-end gap-3">
            <button (click)="showGallery = null" class="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button 
              (click)="selectFromGallery()"
              [disabled]="!selectedGalleryFile"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class BackgroundSettingsComponent implements OnInit {
  @Input() matchId!: string;
  @Input() currentSettings?: any;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<BackgroundSettings>();

  saving = false;
  showGallery: ViewKey | null = null;
  loadingGallery = false;
  galleryFiles: BackgroundFile[] = [];
  selectedGalleryFile: BackgroundFile | null = null;

  settings: BackgroundSettings = {
    useTeamBackground: true,
    views: {}
  };

  viewKeys: ViewKey[] = ['score-summary', 'player-stats', 'overall-summary', 'projections'];

  viewSettings: Record<ViewKey, ViewBackground> = {
    'score-summary': { type: 'none', url: null },
    'player-stats': { type: 'none', url: null },
    'overall-summary': { type: 'none', url: null },
    'projections': { type: 'none', url: null }
  };

  uploadProgress: Record<ViewKey, UploadProgress | null> = {
    'score-summary': null,
    'player-stats': null,
    'overall-summary': null,
    'projections': null
  };

  constructor(private uploadService: UploadService) {}

  ngOnInit() {
    if (this.currentSettings) {
      this.settings.useTeamBackground = this.currentSettings.useTeamBackground ?? true;
      
      this.viewKeys.forEach(view => {
        if (this.currentSettings?.views?.[view]) {
          this.viewSettings[view] = { ...this.currentSettings.views[view] };
        }
      });
    }
    
    this.loadGallery();
  }

  getViewLabel(view: ViewKey): string {
    const labels: Record<ViewKey, string> = {
      'score-summary': 'Live Score View',
      'player-stats': 'Scorecard View',
      'overall-summary': 'Match Summary View',
      'projections': 'Projections View'
    };
    return labels[view];
  }

  getViewDescription(view: ViewKey): string {
    const descriptions: Record<ViewKey, string> = {
      'score-summary': 'TV-style overlay showing current score',
      'player-stats': 'Full batting and bowling scorecard',
      'overall-summary': 'Both innings summary side by side',
      'projections': 'Run rate chart and win probability'
    };
    return descriptions[view];
  }

  onTypeChange(view: ViewKey) {
    if (this.viewSettings[view].type === 'none') {
      this.viewSettings[view].url = null;
    }
  }

  onFileSelected(event: Event, view: ViewKey) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    
    // Validate file type
    const isVideo = file.type.startsWith('video/');
    if (isVideo && this.viewSettings[view].type !== 'video') {
      this.viewSettings[view].type = 'video';
    } else if (!isVideo && this.viewSettings[view].type !== 'image') {
      this.viewSettings[view].type = 'image';
    }

    this.uploadProgress[view] = { state: 'uploading', progress: 0 };

    this.uploadService.uploadBackground(file).subscribe({
      next: (progress) => {
        this.uploadProgress[view] = progress;
        if (progress.state === 'done' && progress.file) {
          this.viewSettings[view].url = progress.file.url;
          this.viewSettings[view].type = progress.file.type;
          this.loadGallery(); // Refresh gallery
        }
      },
      error: (err) => {
        this.uploadProgress[view] = { 
          state: 'error', 
          progress: 0, 
          error: err.error?.message || 'Upload failed' 
        };
      }
    });

    // Reset input
    input.value = '';
  }

  loadGallery() {
    this.loadingGallery = true;
    this.uploadService.listBackgrounds().subscribe({
      next: (response) => {
        if (response.success) {
          this.galleryFiles = response.data;
        }
        this.loadingGallery = false;
      },
      error: () => {
        this.loadingGallery = false;
      }
    });
  }

  selectFromGallery() {
    if (!this.selectedGalleryFile || !this.showGallery) return;

    const view = this.showGallery;
    this.viewSettings[view].url = this.selectedGalleryFile.url;
    this.viewSettings[view].type = this.selectedGalleryFile.type;
    
    this.showGallery = null;
    this.selectedGalleryFile = null;
  }

  clearBackground(view: ViewKey) {
    this.viewSettings[view].url = null;
  }

  onPreviewError(view: ViewKey) {
    console.warn(`Failed to load preview for ${view}`);
  }

  saveSettings() {
    this.saving = true;

    const result: BackgroundSettings = {
      useTeamBackground: this.settings.useTeamBackground,
      views: {}
    };

    this.viewKeys.forEach(view => {
      if (this.viewSettings[view].type !== 'none' || this.viewSettings[view].url) {
        result.views = result.views || {};
        result.views[view] = { ...this.viewSettings[view] };
      }
    });

    this.saved.emit(result);
  }
}
