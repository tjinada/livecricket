import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-display-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-green-800 to-green-900 text-white">
      <div class="max-w-4xl mx-auto px-4 py-12">
        <h1 class="text-4xl font-bold text-center mb-2">🏏 Live Cricket</h1>
        <p class="text-center text-green-200 mb-12">Real-time cricket scoring</p>

        @if (loading) {
          <div class="text-center">
            <p class="text-green-200">Loading matches...</p>
          </div>
        } @else if (liveMatches.length > 0) {
          <div class="mb-8">
            <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
              <span class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              Live Matches
            </h2>
            <div class="space-y-4">
              @for (match of liveMatches; track match._id) {
                <a 
                  [routerLink]="['/display', match._id]"
                  class="block bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition-colors"
                >
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="font-semibold text-lg">{{ match.team1?.name }} vs {{ match.team2?.name }}</p>
                      <p class="text-green-200 text-sm">{{ match.format }} • {{ match.venue }}</p>
                    </div>
                    <span class="text-green-300">View →</span>
                  </div>
                </a>
              }
            </div>
          </div>
        } @else {
          <div class="text-center py-12 bg-white/5 rounded-lg">
            <p class="text-green-200 text-lg mb-2">No live matches at the moment</p>
            <p class="text-green-300 text-sm">Check back later or go to <a href="/admin" class="underline">Admin</a> to create a match</p>
          </div>
        }

        @if (upcomingMatches.length > 0) {
          <div class="mt-8">
            <h2 class="text-xl font-semibold mb-4">Upcoming Matches</h2>
            <div class="space-y-3">
              @for (match of upcomingMatches; track match._id) {
                <div class="bg-white/5 rounded-lg p-4">
                  <p class="font-medium">{{ match.team1?.name }} vs {{ match.team2?.name }}</p>
                  <p class="text-green-300 text-sm">{{ match.format }} • {{ match.date | date:'medium' }}</p>
                </div>
              }
            </div>
          </div>
        }

        <div class="mt-12 text-center">
          <a href="/login" class="text-green-300 hover:text-white text-sm">Admin Login →</a>
        </div>
      </div>
    </div>
  `
})
export class DisplayHomeComponent implements OnInit {
  loading = true;
  liveMatches: any[] = [];
  upcomingMatches: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadMatches();
  }

  loadMatches() {
    this.http.get<{ success: boolean; data: any[] }>('/api/matches').subscribe({
      next: (response) => {
        if (response.success) {
          this.liveMatches = response.data.filter(m => m.status === 'live');
          this.upcomingMatches = response.data.filter(m => m.status === 'upcoming');
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
