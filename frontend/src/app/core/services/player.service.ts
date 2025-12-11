import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player, CreatePlayerDto, UpdatePlayerDto, ApiResponse, PlayerRole, PlayerGender } from '../models';

export interface BulkImportResult {
  created: number;
  updated: number;
  skipped: number;
  menImported: number;
  womenImported: number;
  errors: Array<{ name: string; reason: string }>;
}

export interface PlayerFilters {
  country?: string;
  role?: PlayerRole;
  isActive?: boolean;
  gender?: PlayerGender;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly apiUrl = '/api/players';

  constructor(private http: HttpClient) {}

  getAll(filters?: PlayerFilters): Observable<ApiResponse<Player[]>> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.country) {
        params = params.set('country', filters.country);
      }
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }
      if (filters.gender) {
        params = params.set('gender', filters.gender);
      }
    }

    return this.http.get<ApiResponse<Player[]>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<ApiResponse<Player>> {
    return this.http.get<ApiResponse<Player>>(`${this.apiUrl}/${id}`);
  }

  create(player: CreatePlayerDto): Observable<ApiResponse<Player>> {
    return this.http.post<ApiResponse<Player>>(this.apiUrl, player);
  }

  update(id: string, player: UpdatePlayerDto): Observable<ApiResponse<Player>> {
    return this.http.put<ApiResponse<Player>>(`${this.apiUrl}/${id}`, player);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  bulkImport(countryId: string, players: any[]): Observable<ApiResponse<BulkImportResult>> {
    return this.http.post<ApiResponse<BulkImportResult>>(`${this.apiUrl}/bulk-import`, {
      countryId,
      players
    });
  }

  bulkDelete(countryId: string): Observable<ApiResponse<{ deletedCount: number }>> {
    return this.http.delete<ApiResponse<{ deletedCount: number }>>(`${this.apiUrl}/bulk-delete/${countryId}`);
  }
}
