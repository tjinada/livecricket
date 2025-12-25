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
  espnId?: string | null; // ESPN player ID for ball-by-ball mapping
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
  espnId?: string | null; // ESPN player ID for ball-by-ball mapping
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
  espnId?: string | null; // ESPN player ID for ball-by-ball player mapping (from overs API)
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
  espnId?: string | null; // ESPN player ID for ball-by-ball player mapping (from overs API)
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
// BROWSER-BASED FETCH TYPES
// ============================================

export interface BrowserFetchOptions {
  url: string;
  headless?: boolean;
  timeout?: number;
}

export interface BrowserFetchResponse {
  teams: { [key: string]: any };
  innings: any[];
  matchStatus: string | null;
  matchState: EspnMatchState;
  target: number | null;
  ballByBall?: any;
  debug?: any;
}

export interface BrowserStatusResponse {
  browserFetchAvailable: boolean;
  message: string;
}

export interface ParsedOversData {
  innings: {
    inningsNumber: number;
    team: string;
    overs: any[];
    balls: any[];
  }[];
  matchInfo: any;
}

// ============================================
// MATCH CREATION FROM ESPN TYPES
// ============================================

export interface EspnSquadPlayer {
  espnId: string | null;
  name: string;
  role: string | null;
  isCaptain: boolean;
  isViceCaptain?: boolean;
  isKeeper: boolean;
}

export interface EspnTeamSquad {
  espnId: string | null;
  name: string;
  shortName: string;
  players: EspnSquadPlayer[];
}

export interface EspnMatchInfo {
  title: string | null;
  seriesName: string | null;
  date: string | null;
  venue: string | null;
  format: string | null;
  gender: 'men' | 'women' | null;
  matchNumber: number | null;
}

export interface EspnSquadsData {
  matchInfo: EspnMatchInfo;
  teams: EspnTeamSquad[];
}

export interface LocalTeamCandidate {
  country: {
    _id: string;
    name: string;
    shortName?: string;
    code?: string;
    flagUrl?: string;
  };
  score: number;
}

export interface LocalPlayerCandidate {
  player: {
    _id: string;
    name: string;
    role?: string;
  };
  score: number;
  matchType: string;
}

export interface EspnPlayerPreview {
  espnPlayer: {
    id: string | null;
    name: string;
    isCaptain: boolean;
    isViceCaptain?: boolean;
    isKeeper: boolean;
    role?: string;
  };
  localPlayer: { _id: string; name: string; role?: string } | null;
  localPlayerCandidates: LocalPlayerCandidate[];
  needsCreation: boolean;
}

export interface EspnTeamPreview {
  espnTeam: {
    id: string | null;
    name: string;
    shortName: string;
  };
  localTeam: LocalTeamCandidate['country'] | null;
  localTeamCandidates: LocalTeamCandidate[];
  players: EspnPlayerPreview[];
}

export interface UnmatchedPlayer {
  espnName: string;
  espnId: string | null;
  teamEspnId: string | null;
  teamName: string;
  localTeamId: string;
  isCaptain: boolean;
  isViceCaptain?: boolean;
  isKeeper: boolean;
  role?: string;
}

export interface EspnMatchCreationPreview {
  matchInfo: EspnMatchInfo;
  espnUrl: string;
  scorecardUrl: string;
  teamMapping: EspnTeamPreview[];
  unmatchedPlayers: UnmatchedPlayer[];
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

  // ============================================
  // BROWSER-BASED FETCHING (Puppeteer)
  // ============================================

  /**
   * Check if browser-based fetching is available (Puppeteer installed)
   */
  getBrowserStatus(): Observable<ApiResponse<BrowserStatusResponse>> {
    return this.http.get<ApiResponse<BrowserStatusResponse>>(`${this.apiUrl}/browser-status`);
  }

  /**
   * Fetch match data using browser automation (bypasses 403)
   * Loads the ESPN page in a real browser and intercepts API responses
   */
  browserFetchMatch(options: BrowserFetchOptions): Observable<ApiResponse<BrowserFetchResponse>> {
    return this.http.post<ApiResponse<BrowserFetchResponse>>(`${this.apiUrl}/browser-fetch`, options);
  }

  /**
   * Fetch overs/ball-by-ball data using browser automation
   * Navigates to ESPN page, clicks Overs tab, captures API response
   */
  browserFetchOvers(options: BrowserFetchOptions): Observable<ApiResponse<ParsedOversData>> {
    return this.http.post<ApiResponse<ParsedOversData>>(`${this.apiUrl}/browser-fetch-overs`, options);
  }

  /**
   * Parse overs JSON manually copied from browser DevTools
   */
  parseOversJson(json: any): Observable<ApiResponse<ParsedOversData>> {
    return this.http.post<ApiResponse<ParsedOversData>>(`${this.apiUrl}/parse-overs-json`, { json });
  }

  /**
   * Get sync preview using browser-based fetching
   * Falls back to regular preview if browser fetch fails
   * @deprecated Use getDirectSyncPreview instead - it's faster and doesn't need Puppeteer
   */
  getBrowserSyncPreview(matchId: string, espnUrl: string, options?: { headless?: boolean; timeout?: number }): Observable<ApiResponse<EspnSyncPreview>> {
    return this.http.post<ApiResponse<EspnSyncPreview>>(
      `${this.apiUrl}/match/${matchId}/browser-preview`,
      { 
        espnUrl,
        headless: options?.headless ?? true,
        timeout: options?.timeout ?? 45000
      }
    );
  }

  // ============================================
  // DIRECT TOKEN FETCHING (No Browser Needed!)
  // ============================================

  /**
   * Fetch match data directly using token generation
   * NO BROWSER NEEDED - fastest and most reliable method!
   */
  directFetchMatch(url: string, captureOvers = true): Observable<ApiResponse<BrowserFetchResponse>> {
    return this.http.post<ApiResponse<BrowserFetchResponse>>(`${this.apiUrl}/direct-fetch`, { url, captureOvers });
  }

  /**
   * Fetch only overs/ball-by-ball data using direct token generation
   */
  directFetchOvers(url: string): Observable<ApiResponse<ParsedOversData>> {
    return this.http.post<ApiResponse<ParsedOversData>>(`${this.apiUrl}/direct-fetch-overs`, { url });
  }

  /**
   * Get sync preview using direct token generation
   * This is the PREFERRED method - fast, reliable, no browser needed!
   */
  getDirectSyncPreview(matchId: string, espnUrl: string): Observable<ApiResponse<EspnSyncPreview>> {
    return this.http.post<ApiResponse<EspnSyncPreview>>(
      `${this.apiUrl}/match/${matchId}/direct-preview`,
      { espnUrl }
    );
  }

  // ============================================
  // MATCH CREATION FROM ESPN
  // ============================================

  /**
   * Fetch squads data from ESPN for match creation
   * Returns match info and both team squads with player names
   */
  fetchSquads(url: string): Observable<ApiResponse<EspnSquadsData>> {
    return this.http.post<ApiResponse<EspnSquadsData>>(`${this.apiUrl}/fetch-squads`, { url });
  }

  /**
   * Preview match creation from ESPN data
   * Matches ESPN teams to local countries and ESPN players to local players
   */
  previewMatchCreation(url: string): Observable<ApiResponse<EspnMatchCreationPreview>> {
    return this.http.post<ApiResponse<EspnMatchCreationPreview>>(`${this.apiUrl}/preview-match-creation`, { url });
  }

  /**
   * Create a new player from ESPN data during match import
   */
  createPlayer(data: {
    name: string;
    countryId: string;
    gender?: 'M' | 'F';
    espnId?: string;
    role?: string;
    battingStyle?: string;
    bowlingStyle?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/create-player`, data);
  }

  // ============================================
  // SQUAD VALIDATION
  // ============================================

  /**
   * Validate current match squad against ESPN data
   * Use this BEFORE syncing to catch player mismatches early!
   */
  validateSquad(matchId: string, espnUrl?: string): Observable<ApiResponse<SquadValidationResult>> {
    return this.http.post<ApiResponse<SquadValidationResult>>(
      `${this.apiUrl}/match/${matchId}/validate-squad`,
      { espnUrl }
    );
  }
}

// ============================================
// SQUAD VALIDATION TYPES
// ============================================

export interface SquadValidationMismatch {
  team: string;
  espnName: string;
  matchedTo: string | null;
  matchScore: number;
  matchType: string;
  issue: 'fuzzy_match' | 'wrong_match' | 'not_in_squad';
  correctPlayer?: {
    id: string;
    name: string;
  } | null;
  suggestion: string;
}

export interface SquadValidationWarning {
  team: string;
  playerName: string;
  issue: 'not_in_espn';
  suggestion: string;
}

export interface SquadValidationPlayerResult {
  espnName: string;
  espnId: string | null;
  matchedPlayer: {
    id: string;
    name: string;
    espnId: string | null;
  } | null;
  matchScore: number;
  matchType: string;
  isValid: boolean;
}

export interface SquadValidationTeam {
  espnTeam: string;
  localTeam: string;
  squadKey: string;
  players: SquadValidationPlayerResult[];
  issues: any[];
}

export interface SquadValidationResult {
  isValid: boolean;
  checkedAt: string;
  teams: SquadValidationTeam[];
  mismatches: SquadValidationMismatch[];
  warnings: SquadValidationWarning[];
  summary: {
    totalEspnPlayers: number;
    totalLocalPlayers: number;
    exactMatches: number;
    fuzzyMatches: number;
    mismatches: number;
    notInSquad: number;
  };
}
