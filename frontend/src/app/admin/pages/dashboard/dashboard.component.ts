import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
          <button 
            (click)="logout()" 
            class="text-sm text-gray-600 hover:text-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        
        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-gray-500 text-sm font-medium">Countries</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">-</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-gray-500 text-sm font-medium">Players</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">-</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-gray-500 text-sm font-medium">Matches</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">-</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Manage Countries<br><span class="text-xs">(Coming Soon)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Manage Players<br><span class="text-xs">(Coming Soon)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Create Match<br><span class="text-xs">(Coming Soon)</span>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Live Scoring<br><span class="text-xs">(Coming Soon)</span>
            </div>
          </div>
        </div>

        <!-- Placeholder for matches -->
        <div class="mt-8 bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Matches</h3>
          <p class="text-gray-500">No matches yet. Create your first match to get started.</p>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent {
  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
