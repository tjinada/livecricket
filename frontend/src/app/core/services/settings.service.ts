import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, tap, catchError, switchMap, map } from 'rxjs';
import { ApiResponse, BackgroundConfig } from '../models';

export interface DefaultBackgrounds {
  'score-summary': BackgroundConfig;
  'player-stats': BackgroundConfig;
  'overall-summary': BackgroundConfig;
  'projections': BackgroundConfig;
}

// ==================== HIGHLIGHT SETTINGS INTERFACES ====================

export interface HighlightDurations {
  four: number;
  six: number;
  wicket: number;
  fifty: number;
  hundred: number;
  overlayGap: number;
  matchIntro: number;
  teamLineup: number;
  inningsIntro: number;
  inningsStart: number;
  chaseSetup: number;
  phaseSummary: number;
  inningsSummary: number;
  matchResult: number;
  matchSummary: number;
}

export interface LiveNotificationSettings {
  displayDuration: number;
  cooldownDuration: number;
  maxQueueSize: number;
}

export interface PhaseSettings {
  powerplayEnd: number;
  middleOversEnd: number;
  deathOversStart: number;
  totalOvers: number;
}

export interface NotableThresholds {
  minBoundaries: number;
  minWickets: number;
  minRunRate: number;
  minPhaseRuns: number;
}

export interface ImportanceLevel {
  minScore: number;
  maxScore: number;
  multiplier: number;
}

export interface ImportanceSettings {
  applyMultipliers: boolean;
  levels: {
    routine: ImportanceLevel;
    notable: ImportanceLevel;
    significant: ImportanceLevel;
    crucial: ImportanceLevel;
    epic: ImportanceLevel;
  };
}

export interface PlayerSettings {
  progressUpdateInterval: number;
  transitionDuration: {
    crossfade: number;
    major: number;
  };
}

export interface HighlightSettings {
  durations: HighlightDurations;
  liveNotifications: LiveNotificationSettings;
  phases: {
    T20: PhaseSettings;
    ODI: PhaseSettings;
  };
  notableThresholds: NotableThresholds;
  importance: ImportanceSettings;
  player: PlayerSettings;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl = '/api/settings';
  
  // Highlight settings state
  private highlightSettings$ = new BehaviorSubject<HighlightSettings | null>(null);
  private highlightSettingsLoaded = false;

  constructor(private http: HttpClient) {}

  // ==================== BACKGROUND SETTINGS ====================

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

  // ==================== HIGHLIGHT SETTINGS ====================

  /**
   * Get highlight settings as observable
   */
  get highlightSettings(): Observable<HighlightSettings | null> {
    if (!this.highlightSettingsLoaded) {
      this.loadHighlightSettings().subscribe();
    }
    return this.highlightSettings$.asObservable();
  }

  /**
   * Get current highlight settings value (synchronous)
   */
  get currentHighlightSettings(): HighlightSettings | null {
    return this.highlightSettings$.value;
  }

  /**
   * Load highlight settings from backend
   */
  loadHighlightSettings(): Observable<HighlightSettings> {
    return this.http.get<ApiResponse<HighlightSettings>>(`${this.apiUrl}/highlights`).pipe(
      tap(response => {
        if (response.success) {
          this.highlightSettings$.next(response.data);
          this.highlightSettingsLoaded = true;
        }
      }),
      map(response => response.data),
      catchError(error => {
        console.error('[Settings] Failed to load highlight settings:', error);
        // Return defaults if API fails
        const defaults = this.getHighlightDefaults();
        this.highlightSettings$.next(defaults);
        return of(defaults);
      })
    );
  }

  /**
   * Get default highlight settings from backend
   */
  getHighlightDefaults(): HighlightSettings {
    return {
      durations: {
        four: 2000,
        six: 2000,
        wicket: 2500,
        fifty: 3000,
        hundred: 4000,
        overlayGap: 2000,
        matchIntro: 5000,
        teamLineup: 6000,
        inningsIntro: 4000,
        inningsStart: 3000,
        chaseSetup: 4000,
        phaseSummary: 6000,
        inningsSummary: 10000,
        matchResult: 6000,
        matchSummary: 10000
      },
      liveNotifications: {
        displayDuration: 2000,
        cooldownDuration: 2000,
        maxQueueSize: 10
      },
      phases: {
        T20: {
          powerplayEnd: 6,
          middleOversEnd: 15,
          deathOversStart: 16,
          totalOvers: 20
        },
        ODI: {
          powerplayEnd: 10,
          middleOversEnd: 40,
          deathOversStart: 41,
          totalOvers: 50
        }
      },
      notableThresholds: {
        minBoundaries: 4,
        minWickets: 2,
        minRunRate: 10,
        minPhaseRuns: 50
      },
      importance: {
        applyMultipliers: false,
        levels: {
          routine: { minScore: 0, maxScore: 0.9, multiplier: 1.0 },
          notable: { minScore: 1, maxScore: 2.9, multiplier: 1.1 },
          significant: { minScore: 3, maxScore: 4.9, multiplier: 1.25 },
          crucial: { minScore: 5, maxScore: 7.9, multiplier: 1.5 },
          epic: { minScore: 8, maxScore: Infinity, multiplier: 2.0 }
        }
      },
      player: {
        progressUpdateInterval: 50,
        transitionDuration: {
          crossfade: 300,
          major: 500
        }
      }
    };
  }

  /**
   * Update all highlight settings
   */
  updateHighlightSettings(settings: Partial<HighlightSettings>): Observable<ApiResponse<HighlightSettings>> {
    return this.http.put<ApiResponse<HighlightSettings>>(`${this.apiUrl}/highlights`, settings).pipe(
      tap(response => {
        if (response.success) {
          this.highlightSettings$.next(response.data);
        }
      })
    );
  }

  /**
   * Update duration settings only
   */
  updateHighlightDurations(durations: Partial<HighlightDurations>): Observable<ApiResponse<HighlightDurations>> {
    return this.http.put<ApiResponse<HighlightDurations>>(`${this.apiUrl}/highlights/durations`, durations).pipe(
      tap(response => {
        if (response.success && this.highlightSettings$.value) {
          this.highlightSettings$.next({
            ...this.highlightSettings$.value,
            durations: { ...this.highlightSettings$.value.durations, ...response.data }
          });
        }
      })
    );
  }

  /**
   * Update live notification settings only
   */
  updateLiveNotificationSettings(settings: Partial<LiveNotificationSettings>): Observable<ApiResponse<LiveNotificationSettings>> {
    return this.http.put<ApiResponse<LiveNotificationSettings>>(
      `${this.apiUrl}/highlights/live-notifications`, 
      settings
    ).pipe(
      tap(response => {
        if (response.success && this.highlightSettings$.value) {
          this.highlightSettings$.next({
            ...this.highlightSettings$.value,
            liveNotifications: { ...this.highlightSettings$.value.liveNotifications, ...response.data }
          });
        }
      })
    );
  }

  /**
   * Reset highlight settings to defaults
   */
  resetHighlightSettings(): Observable<ApiResponse<HighlightSettings>> {
    return this.http.post<ApiResponse<HighlightSettings>>(`${this.apiUrl}/highlights/reset`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.highlightSettings$.next(response.data);
        }
      })
    );
  }

  // ==================== CONVENIENCE GETTERS ====================

  /**
   * Get overlay gap duration (used between consecutive 4s/6s/wickets)
   */
  getOverlayGap(): number {
    return this.highlightSettings$.value?.durations.overlayGap ?? 2000;
  }

  /**
   * Get live notification display duration
   */
  getNotificationDuration(): number {
    return this.highlightSettings$.value?.liveNotifications.displayDuration ?? 2000;
  }

  /**
   * Get live notification cooldown duration
   */
  getNotificationCooldown(): number {
    return this.highlightSettings$.value?.liveNotifications.cooldownDuration ?? 2000;
  }

  /**
   * Get transition duration by type
   */
  getTransitionDuration(type: 'crossfade' | 'major'): number {
    return this.highlightSettings$.value?.player.transitionDuration[type] ?? (type === 'major' ? 500 : 300);
  }

  /**
   * Get phase settings for a format
   */
  getPhaseSettings(format: 'T20' | 'ODI'): PhaseSettings {
    return this.highlightSettings$.value?.phases[format] ?? {
      powerplayEnd: format === 'T20' ? 6 : 10,
      middleOversEnd: format === 'T20' ? 15 : 40,
      deathOversStart: format === 'T20' ? 16 : 41,
      totalOvers: format === 'T20' ? 20 : 50
    };
  }
}
