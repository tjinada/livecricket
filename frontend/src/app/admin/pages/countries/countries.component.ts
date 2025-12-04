import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CountryService, PlayerService } from '../../../core/services';
import { Country } from '../../../core/models';

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Countries</h2>
        <div class="flex items-center gap-3">
          <button 
            (click)="refreshAllFlags()"
            [disabled]="refreshingFlags"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            title="Auto-populate flag icons from flagicons.lipis.dev"
          >
            @if (refreshingFlags) {
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Refreshing...</span>
            } @else {
              <span>🏳️</span>
              <span>Refresh Flags</span>
            }
          </button>
          <button 
            (click)="openModal()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add Country
          </button>
        </div>
      </div>
      
      @if (flagRefreshMessage) {
        <div class="mb-4 p-3 rounded-lg text-sm" [ngClass]="flagRefreshSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
          {{ flagRefreshMessage }}
        </div>
      }

      <!-- Loading State -->
      @if (loading) {
        <div class="text-center py-12">
          <p class="text-gray-500">Loading countries...</p>
        </div>
      } @else if (countries.length === 0) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500 mb-4">No countries yet</p>
          <button 
            (click)="openModal()"
            class="text-green-600 hover:text-green-800"
          >
            Add your first country
          </button>
        </div>
      } @else {
        <!-- Countries Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag Video</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (country of countries; track country._id) {
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    @if (country.flagUrl) {
                      <img [src]="country.flagUrl" [alt]="country.name" class="w-8 h-6 object-cover rounded">
                    } @else {
                      <span class="text-2xl">🏳️</span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {{ country.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                    {{ country.code }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                    @if (country.flagVideo) {
                      <div class="flex items-center gap-2">
                        <span class="text-green-600 text-sm">✓ Set</span>
                        <button 
                          (click)="previewFlagVideo(country)"
                          class="text-blue-500 hover:text-blue-700 text-xs"
                        >
                          Preview
                        </button>
                      </div>
                    } @else {
                      <span class="text-gray-400 text-sm">—</span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                    {{ getPlayerCount(country._id) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      (click)="editCountry(country)"
                      class="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button 
                      (click)="confirmDelete(country)"
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
      }

      <!-- Add/Edit Modal -->
      @if (showModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b">
              <h3 class="text-lg font-semibold text-gray-800">
                {{ editingCountry ? 'Edit Country' : 'Add Country' }}
              </h3>
            </div>
            <form (ngSubmit)="saveCountry()" class="p-6">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                <input 
                  type="text"
                  [(ngModel)]="form.name"
                  name="name"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., India"
                >
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                <input 
                  type="text"
                  [(ngModel)]="form.code"
                  name="code"
                  required
                  maxlength="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                  placeholder="e.g., IND"
                >
                <p class="text-xs text-gray-500 mt-1">3-letter country code</p>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Flag URL (Optional)</label>
                <input 
                  type="url"
                  [(ngModel)]="form.flagUrl"
                  name="flagUrl"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="https://..."
                >
                <p class="text-xs text-gray-500 mt-1">Static flag image (PNG/JPG)</p>
              </div>
              
              <!-- Flag Video Section -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Animated Flag Video</label>
                
                <!-- Current Flag Video Preview -->
                @if (form.flagVideo) {
                  <div class="mb-3 bg-gray-900 rounded-lg p-4">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1">
                        <video 
                          #editVideoPlayer
                          [src]="form.flagVideo + '?t=' + cacheBreaker"
                          autoplay
                          loop
                          muted
                          playsinline
                          class="h-20 w-auto rounded"
                        ></video>
                      </div>
                      <div class="text-right">
                        <p class="text-xs text-gray-400 truncate max-w-[200px]">{{ form.flagVideo }}</p>
                        <button 
                          type="button"
                          (click)="removeFlagVideo()"
                          class="text-red-400 hover:text-red-300 text-xs mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                }
                
                <!-- Upload Button -->
                <div class="flex items-center gap-3">
                  <input 
                    type="file"
                    #flagVideoInput
                    (change)="onFlagVideoSelected($event)"
                    accept="video/mp4,video/webm"
                    class="hidden"
                  >
                  <button 
                    type="button"
                    (click)="flagVideoInput.click()"
                    [disabled]="uploading"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center gap-2"
                  >
                    @if (uploading) {
                      <span class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Uploading...</span>
                    } @else {
                      <span>📁</span>
                      <span>{{ form.flagVideo ? 'Replace Video' : 'Upload Video' }}</span>
                    }
                  </button>
                  
                  @if (uploadProgress > 0 && uploadProgress < 100) {
                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        class="bg-green-500 h-2 rounded-full transition-all duration-300"
                        [style.width.%]="uploadProgress"
                      ></div>
                    </div>
                  }
                </div>
                
                <!-- Or Enter URL -->
                <div class="mt-3">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="flex-1 h-px bg-gray-200"></div>
                    <span class="text-xs text-gray-400">or enter URL</span>
                    <div class="flex-1 h-px bg-gray-200"></div>
                  </div>
                  <input 
                    type="url"
                    [(ngModel)]="form.flagVideo"
                    name="flagVideo"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    placeholder="/uploads/flags/india.webm"
                  >
                </div>
                
                <p class="text-xs text-gray-500 mt-2">
                  Accepts .mp4 or .webm (max 20MB). For transparent overlays, use WebM with alpha channel.
                </p>
              </div>

              @if (error) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ error }}
                </div>
              }
              
              @if (uploadError) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ uploadError }}
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
                  [disabled]="saving || uploading"
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
              <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Country</h3>
              
              @if (getPlayerCount(deletingCountry?._id || '') > 0) {
                <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p class="text-yellow-800 text-sm">
                    ⚠️ This country has <strong>{{ getPlayerCount(deletingCountry?._id || '') }} player(s)</strong>.
                  </p>
                </div>
                <p class="text-gray-600 mb-4">
                  Do you want to delete <strong>{{ deletingCountry?.name }}</strong> and all its players?
                </p>
                <label class="flex items-center gap-2 mb-6">
                  <input 
                    type="checkbox"
                    [(ngModel)]="cascadeDelete"
                    class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  >
                  <span class="text-sm text-gray-700">Yes, delete all players too</span>
                </label>
              } @else {
                <p class="text-gray-600 mb-6">
                  Are you sure you want to delete <strong>{{ deletingCountry?.name }}</strong>? 
                  This action cannot be undone.
                </p>
              }

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
                  (click)="deleteCountry()"
                  [disabled]="deleting || (getPlayerCount(deletingCountry?._id || '') > 0 && !cascadeDelete)"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- Flag Video Preview Modal -->
      @if (showPreviewModal && previewVideoUrl) {
        <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" (click)="closePreviewModal()">
          <div class="bg-gray-900 rounded-lg p-6 max-w-md" (click)="$event.stopPropagation()">
            <h3 class="text-white text-lg font-semibold mb-4">{{ previewCountryName }} Flag Video</h3>
            <video 
              #previewVideoPlayer
              [src]="previewVideoUrl + '?t=' + cacheBreaker"
              autoplay
              loop
              muted
              playsinline
              class="max-h-64 mx-auto rounded"
            ></video>
            <div class="mt-4 text-center">
              <button 
                (click)="closePreviewModal()"
                class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CountriesComponent implements OnInit {
  countries: Country[] = [];
  playerCounts: Record<string, number> = {};
  loading = true;
  
  showModal = false;
  editingCountry: Country | null = null;
  form = { name: '', code: '', flagUrl: '', flagVideo: '' };
  saving = false;
  error = '';

  // Upload state
  uploading = false;
  uploadProgress = 0;
  uploadError = '';

  // Preview modal
  showPreviewModal = false;
  previewVideoUrl = '';
  previewCountryName = '';
  
  // Cache breaker for video reload
  cacheBreaker = Date.now();

  showDeleteModal = false;
  deletingCountry: Country | null = null;
  deleting = false;
  deleteError = '';
  cascadeDelete = false;

  // Flag refresh state
  refreshingFlags = false;
  flagRefreshMessage = '';
  flagRefreshSuccess = false;

  constructor(
    private countryService: CountryService,
    private playerService: PlayerService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadCountries();
  }

  loadCountries() {
    this.loading = true;
    this.cacheBreaker = Date.now(); // Refresh cache breaker when loading
    this.countryService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.countries = response.data;
          this.loadPlayerCounts();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadPlayerCounts() {
    this.playerService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.playerCounts = {};
          response.data.forEach(player => {
            const countryId = typeof player.country === 'string' 
              ? player.country 
              : player.country._id;
            this.playerCounts[countryId] = (this.playerCounts[countryId] || 0) + 1;
          });
        }
      }
    });
  }

  getPlayerCount(countryId: string): number {
    return this.playerCounts[countryId] || 0;
  }

  openModal(country?: Country) {
    this.editingCountry = country || null;
    this.form = country 
      ? { name: country.name, code: country.code, flagUrl: country.flagUrl || '', flagVideo: country.flagVideo || '' }
      : { name: '', code: '', flagUrl: '', flagVideo: '' };
    this.error = '';
    this.uploadError = '';
    this.uploadProgress = 0;
    this.cacheBreaker = Date.now(); // Refresh cache breaker for video
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCountry = null;
    this.form = { name: '', code: '', flagUrl: '', flagVideo: '' };
    this.error = '';
    this.uploadError = '';
    this.uploadProgress = 0;
  }

  editCountry(country: Country) {
    this.openModal(country);
  }

  onFlagVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    
    // Validate file type
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      this.uploadError = 'Invalid file type. Please select MP4 or WebM video.';
      return;
    }
    
    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      this.uploadError = 'File too large. Maximum size is 20MB.';
      return;
    }
    
    this.uploadFlagVideo(file);
    
    // Reset input so same file can be selected again
    input.value = '';
  }

  uploadFlagVideo(file: File) {
    this.uploading = true;
    this.uploadError = '';
    this.uploadProgress = 0;

    const formData = new FormData();
    formData.append('file', file);

    // Using XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        this.uploadProgress = Math.round((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      this.uploading = false;
      this.uploadProgress = 0;
      
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            this.form.flagVideo = response.data.url;
            this.cacheBreaker = Date.now(); // Refresh cache breaker for new video
          } else {
            this.uploadError = response.message || 'Upload failed';
          }
        } catch {
          this.uploadError = 'Invalid server response';
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          this.uploadError = response.message || 'Upload failed';
        } catch {
          this.uploadError = 'Upload failed';
        }
      }
    });

    xhr.addEventListener('error', () => {
      this.uploading = false;
      this.uploadProgress = 0;
      this.uploadError = 'Upload failed. Please try again.';
    });

    // Get auth token
    const token = localStorage.getItem('token');
    
    // Pass country code as query parameter
    const countryCode = this.form.code || 'flag';
    xhr.open('POST', `/api/uploads/flag?countryCode=${encodeURIComponent(countryCode)}`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  }

  removeFlagVideo() {
    this.form.flagVideo = '';
  }

  previewFlagVideo(country: Country) {
    if (country.flagVideo) {
      this.previewVideoUrl = country.flagVideo;
      this.previewCountryName = country.name;
      this.cacheBreaker = Date.now(); // Refresh cache breaker for preview
      this.showPreviewModal = true;
    }
  }

  closePreviewModal() {
    this.showPreviewModal = false;
    this.previewVideoUrl = '';
    this.previewCountryName = '';
  }

  saveCountry() {
    if (!this.form.name || !this.form.code) {
      this.error = 'Name and code are required';
      return;
    }

    this.saving = true;
    this.error = '';

    const data = {
      name: this.form.name.trim(),
      code: this.form.code.toUpperCase().trim(),
      flagUrl: this.form.flagUrl?.trim() || undefined,
      flagVideo: this.form.flagVideo?.trim() || undefined
    };

    const request = this.editingCountry
      ? this.countryService.update(this.editingCountry._id, data)
      : this.countryService.create(data);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCountries();
          this.closeModal();
        } else {
          this.error = response.message || 'Failed to save country';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save country';
        this.saving = false;
      }
    });
  }

  confirmDelete(country: Country) {
    this.deletingCountry = country;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletingCountry = null;
    this.deleteError = '';
    this.cascadeDelete = false;
  }

  deleteCountry() {
    if (!this.deletingCountry) return;

    this.deleting = true;
    this.deleteError = '';

    this.countryService.delete(this.deletingCountry._id, this.cascadeDelete).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadCountries();
          this.closeDeleteModal();
        } else {
          this.deleteError = response.message || 'Failed to delete country';
        }
        this.deleting = false;
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete country';
        this.deleting = false;
      }
    });
  }

  refreshAllFlags() {
    this.refreshingFlags = true;
    this.flagRefreshMessage = '';
    
    this.http.post<{ success: boolean; message: string; updated: number; results: any[] }>(
      '/api/countries/refresh-flags', 
      {}
    ).subscribe({
      next: (response) => {
        this.refreshingFlags = false;
        if (response.success) {
          this.flagRefreshSuccess = true;
          this.flagRefreshMessage = response.message;
          this.loadCountries(); // Reload to show updated flags
        } else {
          this.flagRefreshSuccess = false;
          this.flagRefreshMessage = 'Failed to refresh flags';
        }
        // Clear message after 5 seconds
        setTimeout(() => {
          this.flagRefreshMessage = '';
        }, 5000);
      },
      error: (err) => {
        this.refreshingFlags = false;
        this.flagRefreshSuccess = false;
        this.flagRefreshMessage = err.error?.message || 'Failed to refresh flags';
        setTimeout(() => {
          this.flagRefreshMessage = '';
        }, 5000);
      }
    });
  }
}
