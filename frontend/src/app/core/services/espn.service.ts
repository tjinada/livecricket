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
  breakdown?: string;
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
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
  espnIds?: { matchId: string | null; seriesId: string | null };
  debug?: any;
}

// ============================================
// BALL-BY-BALL TYPES
// ============================================

export interface EspnBallData {
  inningsNumber: number;
  overNumber: number;
  ballInOver: number;
  oversActual: number;
  
  // Players (ESPN names/IDs - need mapping to local)
  batsmanName: string | null;
  batsmanId: string | null;
  bowlerName: string | null;
  bowlerId: string | null;
  nonStrikerName: string | null;
  nonStrikerId: string | null;
  
  // Runs
  runs: number;
  totalRuns: number;
  extraRuns: number;
  
  // Extras
  isExtra: boolean;
  extraType: string | null;
  isLegal: boolean;
  
  // Boundaries
  isFour: boolean;
  isSix: boolean;
  
  // Wicket
  isWicket: boolean;
  wicketType: string | null;
  dismissedBatsmanName: string | null;
  dismissedBatsmanId: string | null;
  fielderName: string | null;
  fielderId: string | null;
  
  // Commentary
  title: string;
  commentary: string;
}

export interface EspnBallByBallInnings {
  inningsNumber: number;
  balls: EspnBallData[];
  totalBalls: number;
  rawCommentCount: number;
}

export interface EspnBallByBallData {
  matchId: string;
  seriesId: string;
  innings: EspnBallByBallInnings[];
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

export interface CurrentPlayerPreview {
  espnName: string;
  runs?: number;
  balls?: number;
  matchedPlayer: { _id: string; name: string } | null;
}

export interface InningsSyncPreview {
  espnTeam: string;
  localTeam: { _id: string; name: string };
  total: { runs: number; wickets: number } | null;
  overs: string | null;
  extras: EspnExtras | null;
  isCurrent?: boolean;
  striker?: CurrentPlayerPreview | null;
  nonStriker?: CurrentPlayerPreview | null;
  currentBowler?: CurrentPlayerPreview | null;
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
    mapping: { [key: string]: { team: any; squadKey: string; opposingTeamId: string } };
  };
  innings: InningsSyncPreview[];
}

// ============================================
// SYNC REQUEST TYPES
// ============================================

export interface BattingSyncData {
  playerId: string;
  espnName?: string; // ESPN name for ball-by-ball player mapping
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isNotOut: boolean;
  dismissal?: {
    type: string | null;
    bowlerId: string | null;
    fielderId: string | null;
  };
}

export interface BowlingSyncData {
  playerId: string;
  espnName?: string; // ESPN name for ball-by-ball player mapping
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  dotBalls: number;
  wides?: number;
  noBalls?: number;
}

export interface EspnBallSyncData {
  overNumber: number;
  ballInOver: number;
  oversActual: number;
  batsmanId: string | null;
  bowlerId: string | null;
  nonStrikerId: string | null;
  runs: number;
  totalRuns: number;
  extraRuns: number;
  isExtra: boolean;
  extraType: string | null;
  isLegal: boolean;
  isFour: boolean;
  isSix: boolean;
  isWicket: boolean;
  wicketType: string | null;
  dismissedBatsmanId: string | null;
  fielderId: string | null;
}

export interface InningsSyncData {
  localTeamId: string;
  total: { runs: number; wickets: number } | null;
  overs: string | null;
  extras: EspnExtras | null;
  batting: BattingSyncData[];
  bowling: BowlingSyncData[];
  striker?: { playerId: string } | null;
  nonStriker?: { playerId: string } | null;
  currentBowler?: { playerId: string } | null;
  isComplete: boolean;
  espnBalls?: EspnBallSyncData[];
}

export interface EspnSyncRequest {
  playerMappings: { [espnName: string]: { playerId: string; teamId: string } };
  inningsData: InningsSyncData[];
}

export interface FullSyncStats {
  ballsDeleted: number;
  ballsCreated: number;
  inningsSynced: number;
  oversBuilt: number;
  ballByBallAvailable: boolean;
}

export interface FullSyncResponse {
  matchId: string;
  lastEspnSync: string;
  stats: FullSyncStats;
  innings: {
    inningsNumber: number;
    battingTeam: string;
    totalRuns: number;
    totalWickets: number;
    totalBalls: number;
    overs: string;
    status: string;
    battingStatsCount: number;
    bowlingStatsCount: number;
    completedOvers: number;
  }[];
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
   * Apply ESPN data to match (stats only - no ball-by-ball)
   * @deprecated Use fullSyncMatch for complete sync including ball history
   */
  syncMatch(matchId: string, syncData: EspnSyncRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/match/${matchId}/sync`, syncData);
  }

  /**
   * COMPLETE REPLACE: Apply ESPN data to match including ball-by-ball history
   * Deletes all existing ball records and recreates from ESPN data
   */
  fullSyncMatch(matchId: string, syncData: EspnSyncRequest): Observable<ApiResponse<FullSyncResponse>> {
    return this.http.post<ApiResponse<FullSyncResponse>>(`${this.apiUrl}/match/${matchId}/full-sync`, syncData);
  }

  /**
   * Fetch ball-by-ball commentary data from ESPN
   */
  fetchBallByBall(url: string): Observable<ApiResponse<EspnBallByBallData>> {
    return this.http.post<ApiResponse<EspnBallByBallData>>(`${this.apiUrl}/fetch-ball-by-ball`, { url });
  }

  /**
   * Test if ESPN service is available
   */
  testService(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/test`);
  }
}
