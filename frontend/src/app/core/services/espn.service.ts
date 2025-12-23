import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

// ============================================
// ESPN DATA TYPES
// ============================================

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
  debug?: any;
}

// ============================================
// SYNC PREVIEW TYPES
// ============================================

export interface PlayerCandidate {
  player: { _id: string; name: string };
  score: number;
  matchType: string;
}

export interface BattingSyncPreview {
  espnName: string;
  espnStats: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isNotOut: boolean;
    dismissal: string | null;
  };
  matchedPlayer: { _id: string; name: string } | null;
  matchType: string;
  confidence: number;
  candidates: PlayerCandidate[];
}

export interface BowlingSyncPreview {
  espnName: string;
  espnStats: {
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
    dotBalls: number;
  };
  matchedPlayer: { _id: string; name: string } | null;
  matchType: string;
  confidence: number;
  candidates: PlayerCandidate[];
}

export interface InningsSyncPreview {
  espnTeam: string;
  localTeam: { _id: string; name: string };
  total: { runs: number; wickets: number } | null;
  overs: string | null;
  extras: EspnExtras | null;
  batting: BattingSyncPreview[];
  bowling: BowlingSyncPreview[];
}

export interface EspnSyncPreview {
  matchId: string;
  espnUrl: string;
  matchStatus: string | null;
  target: number | null;
  teamMapping: {
    matched: boolean;
    mapping: { [key: string]: { team: any; squadKey: string } };
  };
  innings: InningsSyncPreview[];
}

// ============================================
// SYNC REQUEST TYPES
// ============================================

export interface BattingSyncData {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isNotOut: boolean;
}

export interface BowlingSyncData {
  playerId: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  dotBalls: number;
}

export interface InningsSyncData {
  localTeamId: string;
  total: { runs: number; wickets: number } | null;
  overs: string | null;
  extras: EspnExtras | null;
  batting: BattingSyncData[];
  bowling: BowlingSyncData[];
  isComplete: boolean;
}

export interface EspnSyncRequest {
  playerMappings: { [espnName: string]: { playerId: string; teamId: string } };
  inningsData: InningsSyncData[];
}

// ============================================
// SERVICE
// ============================================

@Injectable({
  providedIn: 'root'
})
export class EspnService {
  private readonly apiUrl = '/api/espn';

  constructor(private http: HttpClient) {}

  /**
   * Fetch live match data from ESPN Cricinfo URL
   */
  fetchMatchData(url: string): Observable<ApiResponse<EspnMatchData>> {
    return this.http.post<ApiResponse<EspnMatchData>>(`${this.apiUrl}/fetch-match`, { url });
  }

  /**
   * Parse ESPN JSON data copied from browser DevTools
   */
  parseJson(json: any): Observable<ApiResponse<EspnMatchData>> {
    return this.http.post<ApiResponse<EspnMatchData>>(`${this.apiUrl}/parse-json`, { json });
  }

  /**
   * Set or update ESPN URL for a match
   */
  setMatchEspnUrl(matchId: string, espnUrl: string | null): Observable<ApiResponse<{ espnUrl: string | null }>> {
    return this.http.patch<ApiResponse<{ espnUrl: string | null }>>(
      `${this.apiUrl}/match/${matchId}/url`,
      { espnUrl }
    );
  }

  /**
   * Get sync preview for a match - fetches ESPN data and matches players
   */
  getSyncPreview(matchId: string): Observable<ApiResponse<EspnSyncPreview>> {
    return this.http.get<ApiResponse<EspnSyncPreview>>(`${this.apiUrl}/match/${matchId}/preview`);
  }

  /**
   * Apply ESPN data to match
   */
  syncMatch(matchId: string, syncData: EspnSyncRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/match/${matchId}/sync`, syncData);
  }

  /**
   * Test if ESPN service is available
   */
  testService(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/test`);
  }
}
