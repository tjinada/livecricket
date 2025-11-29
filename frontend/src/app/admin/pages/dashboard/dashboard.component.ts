import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div>
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      
      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <a routerLink="/admin/countries" class="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 class="text-gray-500 text-sm font-medium">Countries</h3>
          <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.countries }}</p>
          <span class="text-green-600 text-sm">Manage →</span>
        </a>
        <a routerLink="/admin/players" class="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 class="text-gray-500 text-sm font-medium">Players</h3>
          <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.players }}</p>
          <span class="text-green-600 text-sm">Manage →</span>
        </a>
        <a routerLink="/admin/matches" class="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 class="text-gray-500 text-sm font-medium">Matches</h3>
          <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.matches }}</p>
          <span class="text-green-600 text-sm">Manage →</span>
        </a>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            routerLink="/admin/countries"
            class="p-4 bg-gray-50 rounded-lg text-center text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            🌍 Manage Countries
          </a>
          <a 
            routerLink="/admin/players"
            class="p-4 bg-gray-50 rounded-lg text-center text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            👤 Manage Players
          </a>
          <a 
            routerLink="/admin/matches"
            class="p-4 bg-gray-50 rounded-lg text-center text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            🏏 Manage Matches
          </a>
          @if (liveMatch) {
            <a 
              [routerLink]="['/admin/scoring', liveMatch._id]"
              class="p-4 bg-red-50 rounded-lg text-center text-red-700 hover:bg-red-100 transition-colors"
            >
              📊 Live Scoring
            </a>
          } @else {
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-400">
              📊 No Live Match
            </div>
          }
        </div>
      </div>

      <!-- Recent Matches -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-800">Recent Matches</h3>
          <a routerLink="/admin/matches" class="text-green-600 text-sm hover:underline">View All →</a>
        </div>
        
        @if (loading) {
          <p class="text-gray-500">Loading matches...</p>
        } @else if (matches.length === 0) {
          <p class="text-gray-500">No matches yet. <a routerLink="/admin/matches" class="text-green-600 hover:underline">Create your first match</a></p>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (match of matches.slice(0, 5); track match._id) {
                  <tr>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="font-medium text-gray-900">{{ match.team1?.name }}</span>
                      <span class="text-gray-500"> vs </span>
                      <span class="font-medium text-gray-900">{{ match.team2?.name }}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-gray-500">{{ match.format }}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span 
                        class="px-2 py-1 text-xs rounded-full"
                        [class.bg-green-100]="match.status === 'live'"
                        [class.text-green-800]="match.status === 'live'"
                        [class.bg-yellow-100]="match.status === 'upcoming'"
                        [class.text-yellow-800]="match.status === 'upcoming'"
                        [class.bg-gray-100]="match.status === 'completed'"
                        [class.text-gray-800]="match.status === 'completed'"
                      >
                        {{ match.status | uppercase }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-gray-500">
                      {{ match.date | date:'short' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      @if (match.status === 'live') {
                        <a 
                          [routerLink]="['/admin/scoring', match._id]"
                          class="text-green-600 hover:text-green-900 text-sm mr-3"
                        >
                          Score
                        </a>
                      }
                      <a 
                        [href]="'/display/' + match._id" 
                        target="_blank"
                        class="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  loading = true;
  stats = {
    countries: 0,
    players: 0,
    matches: 0
  };
  matches: any[] = [];
  liveMatch: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    this.loadMatches();
  }

  loadStats() {
    this.http.get<{ success: boolean; data: any[] }>('/api/countries').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.countries = response.data.length;
        }
      }
    });

    this.http.get<{ success: boolean; data: any[] }>('/api/players').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.players = response.data.length;
        }
      }
    });

    this.http.get<{ success: boolean; data: any[] }>('/api/matches').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.matches = response.data.length;
        }
      }
    });
  }

  loadMatches() {
    this.http.get<{ success: boolean; data: any[] }>('/api/matches').subscribe({
      next: (response) => {
        if (response.success) {
          this.matches = response.data;
          this.liveMatch = this.matches.find(m => m.status === 'live');
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
