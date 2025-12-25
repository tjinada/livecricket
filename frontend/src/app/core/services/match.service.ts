import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

export type MatchGender = 'men' | 'women';

export interface Match {
  _id: string;
  title?: string | null;
  gender: MatchGender;
  format: 'T20' | 'ODI';
  team1: any;
  team2: any;
  venue: string;
  date: string;
  status: 'upcoming' | 'live' | 'completed';
  toss?: {
    winner: any;
    decision: 'bat' | 'bowl';
  };
  squads: {
    team1: SquadPlayer[];
    team2: SquadPlayer[];
  };
  innings: any[];
  currentInnings?: number;
  result?: {
    winner: any;
    winMargin: number;
    winType: 'runs' | 'wickets';
  };
  displayView: string;
  selectedPlayerForStats?: any;
  // ESPN Integration
  espnUrl?: string | null;
  espnPlayerMappings?: Array<{
    espnName: string;
    player: string;
    team: string;
  }>;
  lastEspnSync?: string | null;
  backgrounds?: {
    useTeamBackground: boolean;
    views?: {
      'score-summary'?: { type: 'image' | 'video' | 'none'; url: string | null };
      'player-stats'?: { type: 'image' | 'video' | 'none'; url: string | null };
      'overall-summary'?: { type: 'image' | 'video' | 'none'; url: string | null };
      'projections'?: { type: 'image' | 'video' | 'none'; url: string | null };
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SquadPlayer {
  player: any;
  isPlayingXI: boolean;
  battingOrder?: number;
}

export interface CreateMatchDto {
  format: 'T20' | 'ODI';
  team1: string;
  team2: string;
  venue: string;
  date: string;
  gender?: MatchGender;
  title?: string | null;
}

export interface MatchFilters {
  status?: string;
  team?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly apiUrl = '/api/matches';

  constructor(private http: HttpClient) {}

  getAll(filters?: MatchFilters): Observable<ApiResponse<Match[]>> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.team) {
        params = params.set('team', filters.team);
      }
    }

    return this.http.get<ApiResponse<Match[]>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<ApiResponse<Match>> {
    return this.http.get<ApiResponse<Match>>(`${this.apiUrl}/${id}`);
  }

  create(match: CreateMatchDto): Observable<ApiResponse<Match>> {
    return this.http.post<ApiResponse<Match>>(this.apiUrl, match);
  }

  update(id: string, match: Partial<CreateMatchDto>): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/${id}`, match);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  setSquad(id: string, squads: { team1: SquadPlayer[], team2: SquadPlayer[] }): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/${id}/squad`, squads);
  }

  recordToss(id: string, toss: { winner: string, decision: 'bat' | 'bowl' }): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/${id}/toss`, toss);
  }

  startMatch(id: string, data?: { openingBatsmen?: { striker?: string, nonStriker?: string }, openingBowler?: string }): Observable<ApiResponse<Match>> {
    return this.http.post<ApiResponse<Match>>(`${this.apiUrl}/${id}/start`, data || {});
  }

  setDisplayView(id: string, view: string, selectedPlayer?: string): Observable<ApiResponse<any>> {
    const body: { view: string; selectedPlayer?: string } = { view };
    if (selectedPlayer) {
      body.selectedPlayer = selectedPlayer;
    }
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/display-view`, body);
  }

  setDisplayViewWithInnings(id: string, view: string, innings: number | null): Observable<ApiResponse<any>> {
    const body: { view: string; innings?: number | null } = { view };
    if (innings !== null) {
      body.innings = innings;
    }
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/display-view`, body);
  }

  setSelectedPlayerForStats(id: string, playerId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/selected-player`, { playerId });
  }

  updateBackgrounds(id: string, backgrounds: {
    useTeamBackground?: boolean;
    views?: {
      [key: string]: { type: 'image' | 'video' | 'none'; url: string | null }
    }
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/backgrounds`, backgrounds);
  }

  sendNotification(id: string, type: string, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/notification`, { type, data });
  }

  substitutePlayer(id: string, data: { team: 'team1' | 'team2', playerOut: string, playerIn: string }): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/${id}/substitute`, data);
  }

  updateTitle(id: string, title: string): Observable<ApiResponse<Match>> {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/${id}/title`, { title });
  }

  // Squad Management - update Playing XI mid-match
  updateSquad(id: string, data: {
    team: 'team1' | 'team2';
    action: 'add' | 'remove' | 'replace' | 'toggle';
    playerId: string;
    newPlayerId?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}/squad`, data);
  }

  // Reorder squad (drag-drop)
  reorderSquad(id: string, data: {
    team: 'team1' | 'team2';
    squad: Array<{ playerId: string; battingOrder: number }>;
  }): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}/squad-order`, data);
  }
}
