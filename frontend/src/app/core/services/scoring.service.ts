import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

export interface BallData {
  runs: number;
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye' | null;
  extraRuns?: number;
  wicket?: {
    type: 'bowled' | 'caught' | 'lbw' | 'run-out' | 'stumped' | 'hit-wicket';
    fielder?: string;
  } | null;
  newBatsman?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ScoringService {
  private readonly apiUrl = '/api/scoring';

  constructor(private http: HttpClient) {}

  recordBall(matchId: string, ballData: BallData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${matchId}/ball`, ballData);
  }

  undoLastBall(matchId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${matchId}/ball/last`);
  }

  swapBatsmen(matchId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${matchId}/batsmen/swap`, {});
  }

  changeBowler(matchId: string, newBowlerId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${matchId}/bowler`, { bowler: newBowlerId });
  }

  endInnings(matchId: string, reason?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${matchId}/end-innings`, { reason });
  }

  startSecondInnings(matchId: string, data: { 
    openingBatsmen: { striker: string; nonStriker: string }; 
    openingBowler: string 
  }): Observable<ApiResponse<any>> {
    // Backend expects: striker, nonStriker, bowler
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${matchId}/start-second-innings`, {
      striker: data.openingBatsmen.striker,
      nonStriker: data.openingBatsmen.nonStriker,
      bowler: data.openingBowler
    });
  }

  endMatch(matchId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${matchId}/end-match`, {});
  }

  getStats(matchId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${matchId}/stats`);
  }

  /**
   * Manually adjust the innings score
   */
  adjustScore(matchId: string, adjustments: {
    runs?: number;
    wickets?: number;
    balls?: number;
    extras?: {
      wides?: number;
      noBalls?: number;
      byes?: number;
      legByes?: number;
    };
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${matchId}/adjust-score`, adjustments);
  }

  /**
   * Manually adjust a batsman's stats
   */
  adjustBatsmanStats(matchId: string, playerId: string, adjustments: {
    runs?: number;
    balls?: number;
    fours?: number;
    sixes?: number;
  }, inningsIndex?: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${matchId}/batsman/${playerId}/adjust`, {
      ...adjustments,
      inningsIndex
    });
  }

  /**
   * Manually adjust a bowler's stats
   */
  adjustBowlerStats(matchId: string, playerId: string, adjustments: {
    overs?: number;
    balls?: number;
    runs?: number;
    wickets?: number;
    maidens?: number;
    wides?: number;
    noBalls?: number;
  }, inningsIndex?: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${matchId}/bowler/${playerId}/adjust`, {
      ...adjustments,
      inningsIndex
    });
  }

  /**
   * Change current batsman (striker or non-striker)
   */
  changeBatsman(matchId: string, position: 'striker' | 'nonStriker', newBatsmanId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${matchId}/batsmen/change`, {
      position,
      newBatsman: newBatsmanId
    });
  }

  /**
   * Toggle batsman's dismissal status (out <-> not out)
   * If dismissalData is null, marks player as not out
   * If dismissalData is provided, marks player as out with that dismissal
   */
  toggleBatsmanDismissal(matchId: string, playerId: string, dismissalData?: {
    type: 'bowled' | 'caught' | 'lbw' | 'run-out' | 'stumped' | 'hit-wicket';
    bowlerId?: string;
    fielderId?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${matchId}/batsman/${playerId}/dismissal`,
      dismissalData || {}
    );
  }
}
