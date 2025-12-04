import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 class="text-2xl font-bold text-center mb-6 text-gray-800">Live Cricket Admin</h1>
        
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              id="username"
              [(ngModel)]="username" 
              name="username"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              id="password"
              [(ngModel)]="password" 
              name="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              required
            />
          </div>
          
          @if (error) {
            <div class="text-red-500 text-sm">{{ error }}</div>
          }
          
          <button 
            type="submit" 
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            [disabled]="loading"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    this.error = '';
    this.loading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        if (response.success && response.token) {
          this.router.navigate(['/admin']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed. Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
