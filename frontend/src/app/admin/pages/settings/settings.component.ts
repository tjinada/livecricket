import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ViewBackground {
  type: 'image' | 'video' | 'none';
  url: string | null;
}

interface DefaultBackgrounds {
  'score-summary': ViewBackground;
  'player-stats': ViewBackground;
  'overall-summary': ViewBackground;
  'projections': ViewBackground;
  'partnership': ViewBackground;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Display Settings</h2>
      </div>

      <!-- Default Backgrounds Section -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Default View Backgrounds</h3>
        <p class="text-sm text-gray-500 mb-6">
          These backgrounds are used when no match-specific background is set. 
          Team flag overlays will appear on top of these defaults.
        </p>

        @if (loading) {
          <div class="text-center py-8">
            <p class="text-gray-500">Loading settings...</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (view of views; track view.key) {
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-gray-800">{{ view.label }}</h4>
                  <span 
                    class="text-xs px-2 py-1 rounded"
                    [ngClass]="{
                      'bg-green-100 text-green-700': getBackground(view.key)?.url,
                      'bg-gray-100 text-gray-500': !getBackground(view.key)?.url
                    }"
                  >
                    {{ getBackground(view.key)?.url ? 'Set' : 'Not Set' }}
                  </span>
                </div>
                
                <!-- Background Type Selection -->
                <div class="mb-3">
                  <label class="block text-sm text-gray-600 mb-1">Type</label>
                  <select 
                    [ngModel]="getBackgroundType(view.key)"
                    (ngModelChange)="setBackgroundType(view.key, $event)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="none">None</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                
                <!-- Upload or URL Input -->
                @if (getBackgroundType(view.key) !== 'none') {
                  <!-- File Upload -->
                  <div class="mb-3">
                    <input 
                      type="file"
                      [id]="'fileInput-' + view.key"
                      (change)="onFileSelected($event, view.key)"
                      [accept]="getBackgroundType(view.key) === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'"
                      class="hidden"
                    >
                    <button 
                      type="button"
                      (click)="triggerFileInput(view.key)"
                      [disabled]="uploadingView === view.key"
                      class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      @if (uploadingView === view.key) {
                        <span class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>Uploading {{ uploadProgress }}%</span>
                      } @else {
                        <span>📁</span>
                        <span>Upload {{ getBackgroundType(view.key) === 'video' ? 'Video' : 'Image' }}</span>
                      }
                    </button>
                  </div>
                  
                  <!-- URL Input -->
                  <div class="mb-3">
                    <label class="block text-sm text-gray-600 mb-1">Or enter URL</label>
                    <input 
                      type="url"
                      [ngModel]="getBackgroundUrl(view.key)"
                      (ngModelChange)="setBackgroundUrl(view.key, $event)"
                      placeholder="/uploads/backgrounds/{{ view.key }}.mp4"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                  </div>
                }
                
                <!-- Preview -->
                @if (getBackground(view.key)?.url) {
                  <div class="mt-3 rounded-lg overflow-hidden bg-gray-900 h-28 relative">
                    @if (getBackgroundType(view.key) === 'video') {
                      <video 
                        [src]="getBackground(view.key)!.url!"
                        autoplay
                        loop
                        [muted]="true"
                        playsinline
                        class="w-full h-full object-cover"
                      ></video>
                    } @else if (getBackgroundType(view.key) === 'image') {
                      <div 
                        class="w-full h-full bg-cover bg-center"
                        [style.backgroundImage]="'url(' + getBackground(view.key)!.url + ')'"
                      ></div>
                    }
                    <button 
                      (click)="clearBackground(view.key)"
                      class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                    >
                      Clear
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Save Button -->
          <div class="mt-6 flex justify-end items-center gap-4">
            @if (error) {
              <span class="text-red-600 text-sm">{{ error }}</span>
            }
            @if (saved) {
              <span class="text-green-600 text-sm">✓ Settings saved</span>
            }
            <button 
              (click)="saveBackgrounds()"
              [disabled]="saving"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        }
      </div>

      <!-- Instructions Section -->
      <div class="bg-blue-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-800 mb-3">How It Works</h3>
        <ul class="space-y-2 text-sm text-blue-700">
          <li>• <strong>Match-specific backgrounds</strong> take priority over defaults</li>
          <li>• <strong>Team backgrounds</strong> are used if no match background is set</li>
          <li>• <strong>Default backgrounds</strong> are used as the final fallback</li>
          <li>• <strong>Flag overlays</strong> appear on default backgrounds (batting team left, bowling team right)</li>
        </ul>
        
        <div class="mt-4 p-4 bg-white rounded-lg border border-blue-200">
          <h4 class="font-medium text-blue-800 mb-2">Recommended Settings</h4>
          <ul class="space-y-1 text-xs text-blue-600">
            <li>• <strong>Videos:</strong> MP4 or WebM, 1080p or 720p, under 50MB</li>
            <li>• <strong>Images:</strong> JPG, PNG, or WebP, 1920x1080 recommended</li>
            <li>• <strong>Flag Videos:</strong> Upload via Countries page, WebM with alpha for transparency</li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  views = [
    { key: 'score-summary', label: 'Live Score View' },
    { key: 'player-stats', label: 'Player Stats View' },
    { key: 'overall-summary', label: 'Match Summary View' },
    { key: 'projections', label: 'Projections View' },
    { key: 'partnership', label: 'Partnership View' }
  ];

  backgrounds: DefaultBackgrounds = {
    'score-summary': { type: 'none', url: null },
    'player-stats': { type: 'none', url: null },
    'overall-summary': { type: 'none', url: null },
    'projections': { type: 'none', url: null },
    'partnership': { type: 'none', url: null }
  };

  loading = true;
  saving = false;
  error = '';
  saved = false;
  
  // Upload state
  uploadingView: string | null = null;
  uploadProgress = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadBackgrounds();
  }

  loadBackgrounds() {
    this.loading = true;
    this.http.get<{ success: boolean; data: DefaultBackgrounds }>('/api/settings/backgrounds').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.backgrounds = {
            'score-summary': response.data['score-summary'] || { type: 'none', url: null },
            'player-stats': response.data['player-stats'] || { type: 'none', url: null },
            'overall-summary': response.data['overall-summary'] || { type: 'none', url: null },
            'projections': response.data['projections'] || { type: 'none', url: null },
            'partnership': response.data['partnership'] || { type: 'none', url: null }
          };
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getBackground(key: string): ViewBackground | null {
    return this.backgrounds[key as keyof DefaultBackgrounds] || null;
  }

  getBackgroundType(key: string): string {
    return this.backgrounds[key as keyof DefaultBackgrounds]?.type || 'none';
  }

  getBackgroundUrl(key: string): string {
    return this.backgrounds[key as keyof DefaultBackgrounds]?.url || '';
  }

  setBackgroundType(key: string, type: string) {
    this.backgrounds[key as keyof DefaultBackgrounds] = {
      type: type as 'image' | 'video' | 'none',
      url: type === 'none' ? null : this.backgrounds[key as keyof DefaultBackgrounds]?.url || null
    };
    this.saved = false;
  }

  setBackgroundUrl(key: string, url: string) {
    this.backgrounds[key as keyof DefaultBackgrounds] = {
      type: this.backgrounds[key as keyof DefaultBackgrounds]?.type || 'video',
      url: url || null
    };
    this.saved = false;
  }

  clearBackground(key: string) {
    this.backgrounds[key as keyof DefaultBackgrounds] = {
      type: 'none',
      url: null
    };
    this.saved = false;
  }

  triggerFileInput(viewKey: string) {
    const input = document.getElementById('fileInput-' + viewKey) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onFileSelected(event: Event, viewKey: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const bgType = this.getBackgroundType(viewKey);
    
    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];
    const allowedTypes = bgType === 'video' ? allowedVideoTypes : allowedImageTypes;
    
    if (!allowedTypes.includes(file.type)) {
      this.error = `Invalid file type. Please select ${bgType === 'video' ? 'MP4 or WebM video' : 'JPG, PNG, or WebP image'}.`;
      return;
    }
    
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      this.error = 'File too large. Maximum size is 50MB.';
      return;
    }
    
    this.uploadFile(file, viewKey);
    
    // Reset input
    input.value = '';
  }

  uploadFile(file: File, viewKey: string) {
    this.uploadingView = viewKey;
    this.uploadProgress = 0;
    this.error = '';
    this.saved = false;

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        this.uploadProgress = Math.round((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      this.uploadingView = null;
      this.uploadProgress = 0;
      
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            this.backgrounds[viewKey as keyof DefaultBackgrounds] = {
              type: response.data.type,
              url: response.data.url
            };
          } else {
            this.error = response.message || 'Upload failed';
          }
        } catch {
          this.error = 'Invalid server response';
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          this.error = response.message || 'Upload failed';
        } catch {
          this.error = 'Upload failed';
        }
      }
    });

    xhr.addEventListener('error', () => {
      this.uploadingView = null;
      this.uploadProgress = 0;
      this.error = 'Upload failed. Please try again.';
    });

    const token = localStorage.getItem('token');
    
    xhr.open('POST', '/api/uploads/background');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  }

  saveBackgrounds() {
    this.saving = true;
    this.error = '';
    this.saved = false;

    this.http.put<{ success: boolean; data: DefaultBackgrounds }>('/api/settings/backgrounds', { backgrounds: this.backgrounds }).subscribe({
      next: (response) => {
        if (response.success) {
          this.saved = true;
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
}
