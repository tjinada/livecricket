import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EspnFetchComponent } from '../../components/espn-fetch/espn-fetch.component';
import { EspnMatchData } from '../../../core/services/espn.service';

/**
 * ESPN Import Page
 * 
 * Standalone page for fetching match data from ESPN Cricinfo.
 * Accessible from admin sidebar.
 */
@Component({
  selector: 'app-espn-import',
  standalone: true,
  imports: [CommonModule, RouterLink, EspnFetchComponent],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a routerLink="/admin" class="text-gray-500 hover:text-gray-700">
              ← Back to Dashboard
            </a>
            <h1 class="text-lg font-bold text-gray-800">ESPN Data Import</h1>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-5xl mx-auto px-4 py-8">
        <app-espn-fetch 
          [showClose]="false"
          (onDataFetched)="handleDataFetched($event)"
        />
      </div>

      <!-- Notification Toast -->
      @if (notification) {
        <div 
          class="fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transition-all duration-300"
          [ngClass]="{
            'bg-green-600': notification.type === 'success',
            'bg-blue-600': notification.type === 'info'
          }"
        >
          {{ notification.message }}
        </div>
      }
    </div>
  `
})
export class EspnImportComponent {
  notification: { type: 'success' | 'info'; message: string } | null = null;

  handleDataFetched(data: EspnMatchData): void {
    // Copy to clipboard and show notification
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    this.showNotification('success', 'Match data copied to clipboard! Use in Match Editor to apply.');
  }

  private showNotification(type: 'success' | 'info', message: string): void {
    this.notification = { type, message };
    setTimeout(() => {
      this.notification = null;
    }, 4000);
  }
}
