import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

export interface EspnTeamData {
  name: string;
  score: string;
  overs: string;
}

export interface EspnBatsmanData {
  name: string;
  dismissal: string | null;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isNotOut: boolean;
}

export interface EspnBowlerData {
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dotBalls: number;
}

export interface EspnMatchState {
  isStarted: boolean;
  isLive: boolean;
  isComplete: boolean;
  isBreak?: boolean;
}

export interface EspnExtras {
  total: number;
  breakdown: string;
}

export interface EspnInnings {
  team: string;
  batting: EspnBatsmanData[];
  bowling: EspnBowlerData[];
  extras: EspnExtras | null;
  total: { runs: number; wickets: number } | null;
  overs: string | null;
  fallOfWickets?: string | null;
}

export interface EspnMatchData {
  teams: { [key: string]: { score: string | null; overs: string | null } };
  innings: EspnInnings[];
  battingTeam: string | null;
  battingTeamOvers?: string | null;
  target: number | null;
  matchStatus: string | null;
  matchState: EspnMatchState;
  recentOvers?: string | null;
  rawJson?: any;
  // Legacy flat arrays (for backward compatibility)
  batting?: EspnBatsmanData[];
  bowling?: EspnBowlerData[];
  extras?: EspnExtras | null;
}

export interface EspnPreviewData {
  teams: EspnTeamData[];
  battingTeam: string | null;
  matchStatus: string | null;
  state: EspnMatchState;
  battingCard: string;
  bowlingCard: string;
  extras: EspnExtras | null;
  rawData: EspnMatchData;
}

export interface EspnErrorResponse {
  success: false;
  message: string;
  suggestion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EspnService {
  private readonly apiUrl = '/api/espn';

  constructor(private http: HttpClient) {}

  /**
   * Fetch live match data from ESPN Cricinfo URL
   * Note: May return 403 if ESPN blocks the request
   */
  fetchMatchData(url: string): Observable<ApiResponse<EspnMatchData>> {
    return this.http.post<ApiResponse<EspnMatchData>>(`${this.apiUrl}/fetch-match`, { url });
  }

  /**
   * Parse ESPN JSON data copied from browser DevTools
   * This is the reliable method when URL fetching is blocked
   */
  parseJson(json: any): Observable<ApiResponse<EspnMatchData>> {
    return this.http.post<ApiResponse<EspnMatchData>>(`${this.apiUrl}/parse-json`, { json });
  }

  /**
   * Preview what data can be extracted from an ESPN URL
   */
  previewUrl(url: string): Observable<ApiResponse<EspnPreviewData>> {
    return this.http.post<ApiResponse<EspnPreviewData>>(`${this.apiUrl}/preview`, { url });
  }

  /**
   * Test if ESPN service is available
   */
  testService(): Observable<ApiResponse<{ message: string; methods: any; note: string }>> {
    return this.http.get<ApiResponse<{ message: string; methods: any; note: string }>>(`${this.apiUrl}/test`);
  }
}
