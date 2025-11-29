import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryService } from '../../../core/services';
import { Country } from '../../../core/models';

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Countries</h2>
        <button 
          (click)="openModal()"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Add Country
        </button>
      </div>

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
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
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
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Flag URL (Optional)</label>
                <input 
                  type="url"
                  [(ngModel)]="form.flagUrl"
                  name="flagUrl"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="https://..."
                >
              </div>

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
              <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Country</h3>
              <p class="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{{ deletingCountry?.name }}</strong>? 
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
                  (click)="deleteCountry()"
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
export class CountriesComponent implements OnInit {
  countries: Country[] = [];
  playerCounts: Record<string, number> = {};
  loading = true;
  
  showModal = false;
  editingCountry: Country | null = null;
  form = { name: '', code: '', flagUrl: '' };
  saving = false;
  error = '';

  showDeleteModal = false;
  deletingCountry: Country | null = null;
  deleting = false;
  deleteError = '';

  constructor(private countryService: CountryService) {}

  ngOnInit() {
    this.loadCountries();
  }

  loadCountries() {
    this.loading = true;
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
    // Load player counts for each country
    // This could be optimized with a dedicated API endpoint
    this.countries.forEach(country => {
      this.playerCounts[country._id] = 0;
    });
  }

  getPlayerCount(countryId: string): number {
    return this.playerCounts[countryId] || 0;
  }

  openModal(country?: Country) {
    this.editingCountry = country || null;
    this.form = country 
      ? { name: country.name, code: country.code, flagUrl: country.flagUrl || '' }
      : { name: '', code: '', flagUrl: '' };
    this.error = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingCountry = null;
    this.form = { name: '', code: '', flagUrl: '' };
    this.error = '';
  }

  editCountry(country: Country) {
    this.openModal(country);
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
      flagUrl: this.form.flagUrl?.trim() || undefined
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
  }

  deleteCountry() {
    if (!this.deletingCountry) return;

    this.deleting = true;
    this.deleteError = '';

    this.countryService.delete(this.deletingCountry._id).subscribe({
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
}
