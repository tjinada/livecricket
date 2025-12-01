import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, BackgroundConfig } from '../models';

export interface DefaultBackgrounds {
  'score-summary': BackgroundConfig;
  'player-stats': BackgroundConfig;
  'overall-summary': BackgroundConfig;
  'projections': BackgroundConfig;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl = '/api/settings';

  constructor(private http: HttpClient) {}

  // Get all default backgrounds
  getDefaultBackgrounds(): Observable<ApiResponse<DefaultBackgrounds>> {
    return this.http.get<ApiResponse<DefaultBackgrounds>>(`${this.apiUrl}/backgrounds`);
  }

  // Update all default backgrounds
  updateDefaultBackgrounds(backgrounds: Partial<DefaultBackgrounds>): Observable<ApiResponse<DefaultBackgrounds>> {
    return this.http.put<ApiResponse<DefaultBackgrounds>>(`${this.apiUrl}/backgrounds`, { backgrounds });
  }

  // Update single view background
  updateViewBackground(view: keyof DefaultBackgrounds, background: BackgroundConfig): Observable<ApiResponse<DefaultBackgrounds>> {
    return this.http.put<ApiResponse<DefaultBackgrounds>>(`${this.apiUrl}/backgrounds/${view}`, background);
  }

  // Remove background for a view
  removeViewBackground(view: keyof DefaultBackgrounds): Observable<ApiResponse<DefaultBackgrounds>> {
    return this.http.delete<ApiResponse<DefaultBackgrounds>>(`${this.apiUrl}/backgrounds/${view}`);
  }
}
