import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { TeamDisplayService } from './team-display.service';

/**
 * Background configuration
 */
export interface BackgroundConfig {
  type: 'video' | 'image' | 'none';
  url: string | null;
}

/**
 * Background state including flag overlays
 */
export interface BackgroundState {
  currentBackground: BackgroundConfig | null;
  showFlagOverlays: boolean;
  battingTeamFlagVideo: string | null;
  bowlingTeamFlagVideo: string | null;
}

/**
 * Service to manage display backgrounds and flag overlays
 * Handles priority-based background selection:
 * 1. Match-specific background (per view)
 * 2. Team background (batting team)
 * 3. Default background (per view) with flag overlays
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundService {
  // Default backgrounds loaded from settings
  private defaultBackgrounds: Record<string, BackgroundConfig> = {};
  
  // Current background state
  private backgroundStateSubject = new BehaviorSubject<BackgroundState>({
    currentBackground: null,
    showFlagOverlays: false,
    battingTeamFlagVideo: null,
    bowlingTeamFlagVideo: null
  });
  
  public backgroundState$: Observable<BackgroundState> = this.backgroundStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private teamService: TeamDisplayService
  ) {}

  /**
   * Load default backgrounds from settings API
   */
  loadDefaultBackgrounds(): Observable<void> {
    return new Observable(observer => {
      this.http.get<{ success: boolean; data: any }>('/api/settings/backgrounds').subscribe({
        next: (response) => {
          if (response.success) {
            this.defaultBackgrounds = response.data || {};
          }
          observer.next();
          observer.complete();
        },
        error: (err) => {
          console.error('Error loading default backgrounds:', err);
          observer.next(); // Don't fail, just continue without defaults
          observer.complete();
        }
      });
    });
  }

  /**
   * Get the current default backgrounds
   */
  getDefaultBackgrounds(): Record<string, BackgroundConfig> {
    return this.defaultBackgrounds;
  }

  /**
   * Update the background based on current view and match data
   * @param displayView Current display view
   * @param match Match data object
   * @param currentInnings Current innings data
   */
  updateBackground(displayView: string, match: any, currentInnings: any): BackgroundState {
    // Map views that should share backgrounds with other views
    // starting-xi and toss views use the same background as live-score
    const backgroundAliases: Record<string, string> = {
      'starting-xi-team1': 'live-score',
      'starting-xi-team2': 'live-score',
      'toss-screen': 'live-score'
    };
    
    const viewKey = backgroundAliases[displayView] || displayView;
    const matchViews = match?.backgrounds?.views;
    const matchBackground = matchViews ? matchViews[viewKey] : null;
    
    let state: BackgroundState;
    
    // Priority 1: Match-specific background (no flag overlay)
    if (matchBackground?.type !== 'none' && matchBackground?.url) {
      state = {
        currentBackground: matchBackground,
        showFlagOverlays: false,
        battingTeamFlagVideo: null,
        bowlingTeamFlagVideo: null
      };
      this.backgroundStateSubject.next(state);
      return state;
    }
    
    // Priority 2: Team background (no flag overlay)
    if (match?.backgrounds?.useTeamBackground !== false) {
      const battingTeam = currentInnings?.battingTeam;
      if (battingTeam?.background?.type !== 'none' && battingTeam?.background?.url) {
        state = {
          currentBackground: battingTeam.background,
          showFlagOverlays: false,
          battingTeamFlagVideo: null,
          bowlingTeamFlagVideo: null
        };
        this.backgroundStateSubject.next(state);
        return state;
      }
    }
    
    // Priority 3: Default background with flag overlays
    const defaultBg = this.defaultBackgrounds?.[viewKey];
    if (defaultBg?.type !== 'none' && defaultBg?.url) {
      const flagVideos = this.getFlagOverlays(displayView, match, currentInnings);
      state = {
        currentBackground: defaultBg,
        showFlagOverlays: true,
        battingTeamFlagVideo: flagVideos.batting,
        bowlingTeamFlagVideo: flagVideos.bowling
      };
      this.backgroundStateSubject.next(state);
      return state;
    }
    
    // Fallback: No background, but still show flag overlays if available
    const flagVideos = this.getFlagOverlays(displayView, match, currentInnings);
    state = {
      currentBackground: { type: 'none', url: null },
      showFlagOverlays: true,
      battingTeamFlagVideo: flagVideos.batting,
      bowlingTeamFlagVideo: flagVideos.bowling
    };
    this.backgroundStateSubject.next(state);
    return state;
  }

  /**
   * Get flag overlay videos for the current view
   */
  private getFlagOverlays(
    displayView: string, 
    match: any, 
    currentInnings: any
  ): { batting: string | null; bowling: string | null } {
    // For overall-summary view, use static team positions (Team1 left, Team2 right)
    // to match the two-column layout
    if (displayView === 'overall-summary' || displayView === 'final-match-summary') {
      // Left side: First innings batting team
      const leftTeam = match?.innings?.[0]?.battingTeam;
      // Right side: Second innings batting team OR first innings bowling team
      const rightTeam = match?.innings?.[1]?.battingTeam || match?.innings?.[0]?.bowlingTeam;
      
      return {
        batting: leftTeam?.flagVideo || this.teamService.getTeamFlagVideo(leftTeam, match),
        bowling: rightTeam?.flagVideo || this.teamService.getTeamFlagVideo(rightTeam, match)
      };
    }
    
    // For all other views, use current innings batting/bowling teams
    const battingTeam = currentInnings?.battingTeam;
    const bowlingTeam = currentInnings?.bowlingTeam;
    
    return {
      batting: battingTeam?.flagVideo || this.teamService.getTeamFlagVideo(battingTeam, match),
      bowling: bowlingTeam?.flagVideo || this.teamService.getTeamFlagVideo(bowlingTeam, match)
    };
  }

  /**
   * Get current background state synchronously
   */
  getCurrentState(): BackgroundState {
    return this.backgroundStateSubject.getValue();
  }

  /**
   * Check if a background is configured for a specific view
   */
  hasBackgroundForView(viewKey: string, match: any): boolean {
    // Check match-specific
    const matchBg = match?.backgrounds?.views?.[viewKey];
    if (matchBg?.type !== 'none' && matchBg?.url) {
      return true;
    }
    
    // Check default
    const defaultBg = this.defaultBackgrounds?.[viewKey];
    return defaultBg?.type !== 'none' && !!defaultBg?.url;
  }
}
