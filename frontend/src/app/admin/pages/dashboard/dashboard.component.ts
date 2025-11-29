import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-xl font-bold text-gray-800">Live Cricket Admin</h1>
          <div class="flex items-center gap-4">
            <a routerLink="/display" target="_blank" class="text-sm text-green-600 hover:text-green-800">
              View Display →
            </a>
            <button 
              (click)="logout()" 
              class="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        
        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-gray-500 text-sm font-medium">Countries</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.countries }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-gray-500 text-sm font-medium">Players</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.players }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-gray-500 text-sm font-medium">Matches</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.matches }}</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500 hover:bg-gray-100 cursor-pointer">
              Manage Countries<br><span class="text-xs">(Coming Soon)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500 hover:bg-gray-100 cursor-pointer">
              Manage Players<br><span class="text-xs">(Coming Soon)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500 hover:bg-gray-100 cursor-pointer">
              Create Match<br><span class="text-xs">(Coming Soon)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500 hover:bg-gray-100 cursor-pointer">
              Live Scoring<br><span class="text-xs">(Coming Soon)</span>
            </div>
          </div>
        </div>

        <!-- Recent Matches -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Matches</h3>
          
          @if (loading) {
            <p class="text-gray-500">Loading matches...</p>
          } @else if (matches.length === 0) {
            <p class="text-gray-500">No matches yet. Create your first match to get started.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (match of matches; track match._id) {
                    <tr>
                      <td class="px-4 py-3 whitespace-nowrap">
                        <span class="font-medium text-gray-900">{{ match.team1?.name }}</span>
                        <span class="text-gray-500"> vs </span>
                        <span class="font-medium text-gray-900">{{ match.team2?.name }}</span>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-gray-500">{{ match.format }}</td>
                      <td class="px-4 py-3 whitespace-nowrap text-gray-500">{{ match.venue }}</td>
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
                        <a 
                          [routerLink]="['/display', match._id]" 
                          target="_blank"
                          class="text-green-600 hover:text-green-900 text-sm"
                        >
                          View
                        </a>
                        @if (match.status === 'live') {
                          <span class="mx-2 text-gray-300">|</span>
                          <button 
                            class="text-blue-600 hover:text-blue-900 text-sm"
                            (click)="openScoring(match._id)"
                          >
                            Score
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </main>
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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    this.loadMatches();
  }

  loadStats() {
    // Load countries count
    this.http.get<{ success: boolean; data: any[] }>('/api/countries').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.countries = response.data.length;
        }
      }
    });

    // Load players count
    this.http.get<{ success: boolean; data: any[] }>('/api/players').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.players = response.data.length;
        }
      }
    });

    // Load matches count
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
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openScoring(matchId: string) {
    // TODO: Navigate to scoring page when implemented
    alert('Live scoring UI coming soon!');
  }

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
