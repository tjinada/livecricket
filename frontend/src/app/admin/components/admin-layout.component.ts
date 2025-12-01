import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div class="flex items-center gap-8">
            <h1 class="text-xl font-bold text-gray-800">
              <a routerLink="/admin">Live Cricket Admin</a>
            </h1>
            <nav class="hidden md:flex gap-6">
              <a 
                routerLink="/admin" 
                routerLinkActive="text-green-600" 
                [routerLinkActiveOptions]="{exact: true}"
                class="text-gray-600 hover:text-gray-800"
              >
                Dashboard
              </a>
              <a 
                routerLink="/admin/countries" 
                routerLinkActive="text-green-600"
                class="text-gray-600 hover:text-gray-800"
              >
                Countries
              </a>
              <a 
                routerLink="/admin/players" 
                routerLinkActive="text-green-600"
                class="text-gray-600 hover:text-gray-800"
              >
                Players
              </a>
              <a 
                routerLink="/admin/matches" 
                routerLinkActive="text-green-600"
                class="text-gray-600 hover:text-gray-800"
              >
                Matches
              </a>
              <a 
                routerLink="/admin/settings" 
                routerLinkActive="text-green-600"
                class="text-gray-600 hover:text-gray-800"
              >
                Settings
              </a>
            </nav>
          </div>
          <div class="flex items-center gap-4">
            <a 
              routerLink="/display" 
              target="_blank" 
              class="text-sm text-green-600 hover:text-green-800"
            >
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
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  constructor(private router: Router) {}

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
