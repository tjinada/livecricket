import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface HighlightData {
  type: 'matchIntro' | 'teamLineup' | 'inningsIntro' | 'inningsStart' | 'chaseSetup' | 'four' | 'six' | 'wicket' | 'fifty' | 'hundred' | 'overSummary' | 'inningsSummary' | 'matchResult' | 'matchSummary';
  duration: number;
  sequence?: number;
  timestamp?: string;
  data: any;
}

export interface HighlightVideo {
  matchId: string;
  format: string;
  team1: {
    name: string;
    code: string;
    flagUrl: string | null;
  };
  team2: {
    name: string;
    code: string;
    flagUrl: string | null;
  };
  highlights: HighlightData[];
  totalHighlights: number;
  totalDuration: number;
  formattedDuration: string;
}

export interface HighlightStats {
  matchId: string;
  stats: {
    fours: number;
    sixes: number;
    wickets: number;
    fifties: number;
    hundreds: number;
    overSummaries: number;
  };
  totalHighlights: number;
  totalDuration: number;
  formattedDuration: string;
}

@Injectable({
  providedIn: 'root'
})
export class HighlightService {
  private apiUrl = '/api/highlights';

  constructor(private http: HttpClient) {}

  /**
   * Get full highlight video data for a match
   */
  getHighlightVideo(matchId: string, options?: {
    innings?: number;
    includeMatchSummary?: boolean;
  }): Observable<HighlightVideo> {
    let url = `${this.apiUrl}/${matchId}`;
    const params: string[] = [];
    
    if (options?.innings) {
      params.push(`innings=${options.innings}`);
    }
    if (options?.includeMatchSummary === false) {
      params.push('includeMatchSummary=false');
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<{ success: boolean; data: HighlightVideo }>(url).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get highlights for a specific innings
   */
  getInningsHighlights(matchId: string, inningsNumber: number): Observable<{
    matchId: string;
    inningsNumber: number;
    highlights: HighlightData[];
    totalHighlights: number;
    totalDuration: number;
    formattedDuration: string;
  }> {
    return this.http.get<{ success: boolean; data: any }>(
      `${this.apiUrl}/${matchId}/innings/${inningsNumber}`
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get match summary only
   */
  getMatchSummary(matchId: string): Observable<HighlightData> {
    return this.http.get<{ success: boolean; data: HighlightData }>(
      `${this.apiUrl}/${matchId}/summary`
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get highlight statistics
   */
  getHighlightStats(matchId: string, innings?: number): Observable<HighlightStats> {
    let url = `${this.apiUrl}/${matchId}/stats`;
    if (innings) {
      url += `?innings=${innings}`;
    }

    return this.http.get<{ success: boolean; data: HighlightStats }>(url).pipe(
      map(response => response.data)
    );
  }
}
