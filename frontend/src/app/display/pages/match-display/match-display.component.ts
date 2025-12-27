import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { PlayerCacheService } from '../../services/player-cache.service';
import { MatchCalculationsService, GraphDataPoint } from '../../services/match-calculations.service';
import { TeamDisplayService } from '../../services/team-display.service';
import { DismissalFormatterService } from '../../services/dismissal-formatter.service';
import { BattingCardService } from '../../services/batting-card.service';
import { BowlerCardService } from '../../services/bowler-card.service';
import { OverDisplayService } from '../../services/over-display.service';
import { CurrentBatsmenService } from '../../services/current-batsmen.service';
import { MatchDisplaySSEService, SSEEvent } from '../../services/match-display-sse.service';
import { BackgroundService, BackgroundState } from '../../services/background.service';
import { NotificationService, NotificationState, NotificationType, ThirdUmpireDecision, NotificationData } from '../../services/notification.service';

// Sub-components
import {
  NotificationOverlayComponent,
  LiveScoreViewComponent,
  LiveMatchSummaryViewComponent,
  FinalMatchSummaryViewComponent,
  RunRateGraphViewComponent,
  CurrentPartnershipViewComponent,
  PlayerStatsViewComponent,
  HighlightVideoPlayerComponent,
  DisplayHighlightPlayerComponent,
  HighlightViewState
} from './components';
import { MatchIntroViewComponent } from './components/match-intro-view.component';
import { StartingXiViewComponent } from './components/starting-xi-view.component';
import { TossScreenViewComponent } from './components/toss-screen-view.component';

@Component({
  selector: 'app-match-display',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NotificationOverlayComponent,
    LiveScoreViewComponent,
    LiveMatchSummaryViewComponent,
    FinalMatchSummaryViewComponent,
    RunRateGraphViewComponent,
    CurrentPartnershipViewComponent,
    PlayerStatsViewComponent,
    HighlightVideoPlayerComponent,
    DisplayHighlightPlayerComponent,
    MatchIntroViewComponent,
    StartingXiViewComponent,
    TossScreenViewComponent
  ],
  templateUrl: './match-display.component.html'
})
export class MatchDisplayComponent implements OnInit, OnDestroy {
  matchId: string = '';
  match: any = null;
  loading = true;
  error = '';
  displayView = 'live-score';
  currentBackground: { type: string; url: string | null } | null = null;
  
  // Flag overlay properties
  showFlagOverlays = false;
  battingTeamFlagVideo: string | null = null;
  bowlingTeamFlagVideo: string | null = null;
  
  // Notification overlay properties
  showNotification = false;
  notificationType: 'six' | 'four' | 'wicket' | 'fifty' | 'hundred' | 'third-umpire' | 'custom-message' | null = null;
  notificationData: any = null;
  notificationDuration = 10000;
  private notificationTimeout: any = null;
  
  // Third Umpire properties
  thirdUmpireDecision: 'out' | 'not-out' | null = null;
  
  // Custom Message properties
  customMessage: string = '';
  
  // Cached Starting XI data (to avoid recalculating on every change detection)
  team1StartingXI: Array<{ name: string; image: string | null; role: string; battingOrder: number }> = [];
  team2StartingXI: Array<{ name: string; image: string | null; role: string; battingOrder: number }> = [];
  
  // Highlight Video properties
  highlightInningsNumber: number | null = null;
  useDisplayBasedHighlights = true; // Use actual display views for highlights
  highlightViewState: HighlightViewState | null = null;
  
  // SSE subscription
  private sseSubscription: Subscription | null = null;
  isConnected = true;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private playerCacheService: PlayerCacheService,
    private calcService: MatchCalculationsService,
    private teamService: TeamDisplayService,
    private dismissalService: DismissalFormatterService,
    private battingCardService: BattingCardService,
    private bowlerCardService: BowlerCardService,
    private overDisplayService: OverDisplayService,
    private currentBatsmenService: CurrentBatsmenService,
    private sseService: MatchDisplaySSEService,
    private backgroundService: BackgroundService,
    private notificationService: NotificationService
  ) {}

  // ==================== LIFECYCLE ====================

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    if (this.matchId) {
      this.loadMatch();
      this.loadDefaultBackgrounds();
      this.setupSSE();
    } else {
      this.error = 'No match ID provided';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
    }
    this.sseService.disconnect();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  // ==================== DATA LOADING ====================

  loadMatch() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'live-score';
          this.buildPlayerNameCache();
          this.updateStartingXICache();
          this.updateBackground();
        } else {
          this.error = 'Match not found';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading match:', err);
        this.error = 'Failed to load match';
        this.loading = false;
      }
    });
  }

  loadDefaultBackgrounds() {
    this.backgroundService.loadDefaultBackgrounds().subscribe(() => {
      this.updateBackground();
    });
  }

  reloadMatch() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'live-score';
          this.buildPlayerNameCache();
          this.updateStartingXICache();
          this.updateBackground();
        }
      }
    });
  }
  
  /**
   * Update cached Starting XI data
   * Called when match data is loaded/reloaded
   */
  private updateStartingXICache(): void {
    this.team1StartingXI = this.buildStartingXI(this.match?.squads?.team1);
    this.team2StartingXI = this.buildStartingXI(this.match?.squads?.team2);
  }
  
  private buildStartingXI(squad: any[]): Array<{ name: string; image: string | null; role: string; battingOrder: number }> {
    if (!squad) return [];
    return squad
      .filter((p: any) => p.isPlayingXI && p.battingOrder)
      .map((p: any) => ({
        name: p.player?.name || 'Unknown',
        image: this.getPlayerImagePath(p.player),
        role: p.player?.role || 'player',
        battingOrder: p.battingOrder || 99
      }))
      .sort((a, b) => a.battingOrder - b.battingOrder);
  }
  
  /**
   * Get player image path - prefers local imageUrl over ESPN headshotPath
   * Returns the raw path (not full URL) for use by Starting XI component
   */
  private getPlayerImagePath(player: any): string | null {
    if (!player) return null;
    // Prefer locally uploaded imageUrl (e.g., /uploads/player-images/...)
    if (player.imageUrl) return player.imageUrl;
    // Fall back to ESPN headshotPath
    return player.headshotPath || null;
  }

  updateBackground() {
    // During highlight mode, use the actual view being displayed for background selection
    let viewForBackground = this.displayView;
    if (this.displayView === 'highlight-video' && this.useDisplayBasedHighlights && this.highlightViewState?.view) {
      viewForBackground = this.highlightViewState.view;
    }
    // Default to live-score if we're in highlight mode but don't have a valid view yet
    // Also handle 'intro' view which doesn't have its own background
    if (this.displayView === 'highlight-video' && 
        (viewForBackground === 'highlight-video' || viewForBackground === 'intro')) {
      viewForBackground = 'live-score';
    }
    
    const state = this.backgroundService.updateBackground(
      viewForBackground,
      this.match,
      this.currentInnings
    );
    
    this.currentBackground = state.currentBackground;
    this.showFlagOverlays = state.showFlagOverlays;
    this.battingTeamFlagVideo = state.battingTeamFlagVideo;
    this.bowlingTeamFlagVideo = state.bowlingTeamFlagVideo;
  }

  buildPlayerNameCache() {
    this.playerCacheService.buildCacheFromMatch(this.match);
  }

  // ==================== SSE ====================

  private setupSSE(): void {
    this.sseService.connect(this.matchId);
    this.sseSubscription = this.sseService.events$.subscribe((event) => {
      this.handleSSEEvent(event);
    });
  }
  
  private handleSSEEvent(event: SSEEvent): void {
    switch (event.type) {
      case 'connected':
        this.isConnected = true;
        break;
      case 'connection-lost':
      case 'reconnecting':
        this.isConnected = false;
        break;
      case 'sync-required':
        this.reloadMatch();
        if (event.data?.displayView && event.data.displayView !== this.displayView) {
          this.displayView = event.data.displayView;
          this.updateBackground();
        }
        break;
      case 'six':
        this.showBigNotification('six', event.data);
        this.reloadMatch();
        break;
      case 'four':
        this.showBigNotification('four', event.data);
        this.reloadMatch();
        break;
      case 'wicket':
        this.showBigNotification('wicket', event.data);
        this.reloadMatch();
        break;
      case 'third-umpire-start':
        this.showThirdUmpireOverlay();
        break;
      case 'third-umpire-decision':
        this.showThirdUmpireDecision(event.data?.decision);
        break;
      case 'custom-message':
        this.showCustomMessage(event.data?.message);
        break;
      case 'custom-message-dismiss':
        this.dismissNotification();
        break;
      case 'view-change':
        if (event.data?.view) {
          this.displayView = event.data.view;
          // Handle highlight video innings selection
          if (event.data.view === 'highlight-video') {
            this.highlightInningsNumber = event.data.innings || null;
          } else {
            this.highlightInningsNumber = null;
          }
          this.updateBackground();
        }
        // Only reload if view requires fresh match data (e.g., player-stats needs selectedPlayer)
        if (event.data?.view === 'player-stats') {
          this.reloadMatch();
        }
        break;
      case 'match-state':
        if (event.data?.displayView && event.data.displayView !== this.displayView) {
          this.displayView = event.data.displayView;
          this.updateBackground();
          this.reloadMatch();
        }
        // Don't reload for static views that don't need live updates
        // (starting-xi and toss-screen data doesn't change during the match)
        break;
      case 'score-update':
      case 'over-complete':
      case 'innings-complete':
      case 'innings-start':
      case 'match-complete':
      case 'batsmen-change':
      case 'bowler-change':
      case 'background-change':
      case 'squad-change':
      case 'zoom-change':
      case 'player-stats-change':
        this.reloadMatch();
        break;
      case 'heartbeat':
        this.isConnected = true;
        break;
    }
  }
  
  // ==================== NOTIFICATIONS ====================

  showBigNotification(type: 'six' | 'four' | 'wicket' | 'fifty' | 'hundred', data: any) {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationType = type;
    this.notificationData = data;
    this.showNotification = true;
    this.notificationTimeout = setTimeout(() => {
      this.dismissNotification();
    }, this.notificationDuration);
  }
  
  dismissNotification() {
    this.showNotification = false;
    this.notificationType = null;
    this.notificationData = null;
    this.thirdUmpireDecision = null;
    this.customMessage = '';
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }
  
  showThirdUmpireOverlay() {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.thirdUmpireDecision = null;
    this.notificationType = 'third-umpire';
    this.showNotification = true;
  }
  
  showThirdUmpireDecision(decision: 'out' | 'not-out') {
    this.thirdUmpireDecision = decision;
    this.notificationTimeout = setTimeout(() => {
      this.dismissNotification();
    }, this.notificationDuration);
  }
  
  showCustomMessage(message: string) {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.customMessage = message;
    this.notificationType = 'custom-message';
    this.showNotification = true;
  }

  // ==================== GETTERS ====================

  get currentInnings() {
    if (this.match?.innings?.length > 0 && this.match.currentInnings !== undefined) {
      return this.match.innings[this.match.currentInnings];
    }
    return null;
  }

  getViewName(): string {
    const names: Record<string, string> = {
      'live-score': 'Live Score',
      'live-match-summary': 'Live Match Summary',
      'run-rate-graph': 'Run Rate Graph',
      'current-partnership': 'Current Partnership',
      'final-match-summary': 'Final Match Summary',
      'player-stats': 'Player Stats',
      'highlight-video': 'Highlight Video',
      'starting-xi-team1': 'Starting XI - Team 1',
      'starting-xi-team2': 'Starting XI - Team 2',
      'toss-screen': 'Toss Result'
    };
    return names[this.displayView] || 'Live Score';
  }

  // ==================== HIGHLIGHT VIDEO HELPERS ====================

  onHighlightVideoClose(): void {
    // When highlight video is closed, return to live-score view
    this.displayView = 'live-score';
    this.highlightInningsNumber = null;
    this.updateBackground();
  }

  getPlayerName(player: any): string {
    return this.playerCacheService.getPlayerName(player);
  }

  getPlayerImage(player: any): string | null {
    return this.playerCacheService.getPlayerImage(player);
  }

  // ==================== TEAM HELPERS ====================

  getBattingTeamCode(): string {
    return this.teamService.getBattingTeamCode(this.currentInnings, this.match);
  }

  getBattingTeamFlag(): string | null {
    return this.teamService.getBattingTeamFlag(this.currentInnings, this.match);
  }

  getBowlingTeamCode(): string {
    return this.teamService.getBowlingTeamCode(this.currentInnings, this.match);
  }

  getTeamCode(team: any): string {
    return this.teamService.getTeamCode(team, this.match);
  }

  getTeamName(team: any): string {
    return this.teamService.getTeamName(team, this.match);
  }

  getBattingTeamName(): string {
    return this.teamService.getBattingTeamName(this.currentInnings, this.match);
  }

  getBowlingTeamName(): string {
    return this.teamService.getBowlingTeamName(this.currentInnings, this.match);
  }

  getInningsLabel(): string {
    return this.teamService.getInningsLabel(this.match?.currentInnings || 0);
  }

  getTeamFlag(team: any): string | null {
    return this.teamService.getTeamFlag(team, this.match);
  }

  getFirstInningsTeamName(): string {
    return this.teamService.getFirstInningsTeamName(this.match);
  }

  getSecondInningsTeamName(): string {
    return this.teamService.getSecondInningsTeamName(this.match);
  }

  getSecondBattingTeamName(): string {
    return this.teamService.getSecondBattingTeamName(this.match);
  }

  getFirstBattingTeamName(): string {
    return this.teamService.getFirstBattingTeamName(this.match);
  }

  // ==================== BATSMEN HELPERS ====================

  getStrikerName(): string {
    return this.currentBatsmenService.getStrikerName(this.currentInnings);
  }

  getStrikerImage(): string | null {
    return this.currentBatsmenService.getStrikerImage(this.currentInnings);
  }

  getStrikerRuns(): number {
    return this.currentBatsmenService.getStrikerRuns(this.currentInnings);
  }

  getStrikerBalls(): number {
    return this.currentBatsmenService.getStrikerBalls(this.currentInnings);
  }

  getStrikerSR(): string {
    return this.currentBatsmenService.getStrikerSR(this.currentInnings);
  }

  getStrikerStats(): any {
    return this.currentBatsmenService.getStrikerStats(this.currentInnings);
  }

  getStrikerDots(): number {
    return this.currentBatsmenService.getStrikerDots(this.currentInnings);
  }

  getStrikerBattingStyle(): string {
    return this.currentBatsmenService.getStrikerBattingStyle(this.currentInnings, this.match);
  }

  getNonStrikerName(): string {
    return this.currentBatsmenService.getNonStrikerName(this.currentInnings);
  }

  getNonStrikerImage(): string | null {
    return this.currentBatsmenService.getNonStrikerImage(this.currentInnings);
  }

  getNonStrikerRuns(): number {
    return this.currentBatsmenService.getNonStrikerRuns(this.currentInnings);
  }

  getNonStrikerBalls(): number {
    return this.currentBatsmenService.getNonStrikerBalls(this.currentInnings);
  }

  getNonStrikerSR(): string {
    return this.currentBatsmenService.getNonStrikerSR(this.currentInnings);
  }

  getNonStrikerStats(): any {
    return this.currentBatsmenService.getNonStrikerStats(this.currentInnings);
  }

  getNonStrikerDots(): number {
    return this.currentBatsmenService.getNonStrikerDots(this.currentInnings);
  }

  getNonStrikerBattingStyle(): string {
    return this.currentBatsmenService.getNonStrikerBattingStyle(this.currentInnings, this.match);
  }

  getPartnershipRuns(): number {
    return this.currentBatsmenService.getPartnershipRuns(this.currentInnings);
  }

  getPartnershipBalls(): number {
    return this.currentBatsmenService.getPartnershipBalls(this.currentInnings);
  }

  // ==================== BOWLER HELPERS ====================

  getCurrentBowlerName(): string {
    const bowler = this.currentInnings?.currentBowler;
    const name = this.getPlayerName(bowler);
    return name?.split(' ').pop() || 'Unknown';
  }

  getCurrentBowlerImage(): string | null {
    const bowler = this.currentInnings?.currentBowler;
    return this.getPlayerImage(bowler);
  }

  getCurrentBowlerFigures(): string {
    const bowlerId = this.currentInnings?.currentBowler?._id || this.currentInnings?.currentBowler;
    const stats = this.currentInnings?.bowlingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === bowlerId || id?.toString() === bowlerId?.toString();
    });
    if (!stats) return '0-0';
    return `${stats.wickets}-${stats.runs}`;
  }

  getCurrentBowlerOvers(): string {
    return this.bowlerCardService.getCurrentBowlerOvers(this.currentInnings);
  }

  getCurrentBowlerFullFigures(): string {
    const bowlerId = this.currentInnings?.currentBowler?._id || this.currentInnings?.currentBowler;
    const stats = this.currentInnings?.bowlingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === bowlerId || id?.toString() === bowlerId?.toString();
    });
    if (!stats) return '0-0 (0.0 ov)';
    return `${stats.wickets}-${stats.runs} (${stats.overs || 0}.${stats.balls || 0} ov)`;
  }

  getBestBowler(): any {
    return this.bowlerCardService.getBestBowler(this.currentInnings);
  }

  // ==================== OVER DISPLAY HELPERS ====================

  getRecentOvers(): { overNumber: number; balls: any[]; runs: number }[] {
    return this.overDisplayService.getRecentOvers(this.currentInnings, 3);
  }

  getPreviousOvers(): { overNumber: number; balls: any[]; runs: number }[] {
    return this.overDisplayService.getPreviousOvers(this.currentInnings, 2);
  }

  getCurrentOverBalls(): any[] {
    return this.overDisplayService.getCurrentOverBalls(this.currentInnings);
  }

  getRemainingBallsInOver(): number[] {
    return this.overDisplayService.getRemainingBallsInOver(this.currentInnings);
  }

  getBallColorClass(ball: any): { [key: string]: boolean } {
    return this.overDisplayService.getBallColorClass(ball);
  }

  // ==================== CALCULATIONS HELPERS ====================

  getOversDisplay(): string {
    return this.calcService.getOversDisplay(this.currentInnings?.totalBalls || 0);
  }

  getCurrentRunRate(): string {
    return this.calcService.getCurrentRunRate(
      this.currentInnings?.totalRuns || 0,
      this.currentInnings?.totalBalls || 0
    );
  }

  getRequiredRunRate(): string {
    if (this.match?.currentInnings !== 1) return '-';
    return this.calcService.getRequiredRunRate(this.getRunsNeeded(), this.getBallsRemaining());
  }

  getTarget(): number {
    if (!this.match?.innings?.[0]) return 0;
    return this.calcService.getTarget(this.match.innings[0].totalRuns || 0);
  }

  getRunsNeeded(): number {
    return this.calcService.getRunsNeeded(this.getTarget(), this.currentInnings?.totalRuns || 0);
  }

  getBallsRemaining(): number {
    return this.calcService.getBallsRemaining(this.match?.format, this.currentInnings?.totalBalls || 0);
  }

  getOversRemaining(): string {
    return this.calcService.getOversRemaining(this.getBallsRemaining());
  }

  isSecondInnings(): boolean {
    return this.match?.currentInnings === 1;
  }

  getProjectedScore(): number {
    return this.calcService.getProjectedScore(
      this.currentInnings?.totalRuns || 0,
      this.currentInnings?.totalBalls || 0,
      this.match?.format
    );
  }

  getWinProbability(): number {
    if (this.match?.currentInnings !== 1) return 50;
    const currentRunRate = this.currentInnings?.totalBalls > 0
      ? (this.currentInnings.totalRuns / this.currentInnings.totalBalls) * 6
      : 0;
    return this.calcService.getWinProbability(
      this.getRunsNeeded(),
      this.getBallsRemaining(),
      10 - (this.currentInnings?.totalWickets || 0),
      currentRunRate,
      this.match?.format
    );
  }

  // ==================== BATTING STATS HELPERS ====================

  getBattingStats(): any[] {
    return this.battingCardService.getBattingStatsWithDNB(this.currentInnings, this.match);
  }

  isCurrentBatsman(batsman: any): boolean {
    return this.battingCardService.isCurrentBatsman(batsman, this.currentInnings);
  }

  isStriker(batsman: any): boolean {
    return this.battingCardService.isStriker(batsman, this.currentInnings);
  }

  getYetToBatCount(): number {
    return this.battingCardService.getYetToBatCount(this.getBattingStats());
  }

  getFullBattingCard(inningsIndex: number): any[] {
    return this.battingCardService.getFullBattingCard(inningsIndex, this.match);
  }

  isBatsmanCurrentlyBatting(batsman: any, inningsIndex: number): boolean {
    return this.battingCardService.isBatsmanCurrentlyBattingInInnings(batsman, inningsIndex, this.match);
  }

  getFallOfWickets(): any[] {
    return this.battingCardService.getFallOfWickets(this.currentInnings);
  }

  getLastWicket(): string | null {
    const fow = this.currentInnings?.fallOfWickets;
    if (!fow || fow.length === 0) return null;
    const last = fow[fow.length - 1];
    const playerName = this.getPlayerName(last.player);
    const shortName = playerName?.split(' ').pop() || 'Unknown';
    return `${shortName} ${last.runs} (${last.overs} ov)`;
  }

  // ==================== BOWLING STATS HELPERS ====================

  getBowlingStats(): any[] {
    return this.bowlerCardService.getBowlingStats(this.currentInnings);
  }

  isCurrentBowler(bowler: any): boolean {
    return this.bowlerCardService.isCurrentBowler(bowler, this.currentInnings);
  }

  getBowlerOversDisplay(bowler: any): string {
    return this.bowlerCardService.getBowlerOversDisplay(bowler);
  }

  getBowlerEconomy(bowler: any): string {
    return this.bowlerCardService.getBowlerEconomy(bowler);
  }

  getSummaryBowlers(inningsIndex: number, count: number): any[] {
    return this.bowlerCardService.getSummaryBowlers(inningsIndex, count, this.match);
  }

  // ==================== EXTRAS/DISMISSAL HELPERS ====================

  getTotalExtras(): number {
    return this.calcService.getTotalExtras(this.currentInnings?.extras);
  }

  getExtrasBreakdown(): string {
    return this.calcService.getExtrasBreakdown(this.currentInnings?.extras);
  }

  getExtrasBreakdownForInnings(inningsIndex: number): string {
    const innings = this.match?.innings?.[inningsIndex];
    return this.calcService.getExtrasBreakdown(innings?.extras);
  }

  getSummaryExtras(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    return this.calcService.getTotalExtras(innings?.extras);
  }

  getShortDismissal(batsman: any): string {
    return this.dismissalService.getShortDismissal(batsman, this.isCurrentBatsman(batsman));
  }

  getSummaryDismissal(batsman: any): string {
    return this.dismissalService.getSummaryDismissal(batsman, this.isCurrentBatsman(batsman));
  }

  getShortPlayerName(player: any): string {
    return this.playerCacheService.getShortPlayerName(player);
  }

  // ==================== STATS HELPERS ====================

  getTotalFours(): number {
    return this.calcService.getTotalFours(this.currentInnings?.battingStats);
  }

  getTotalSixes(): number {
    return this.calcService.getTotalSixes(this.currentInnings?.battingStats);
  }

  getDotBallsPercentage(): number {
    return this.calcService.getDotBallsPercentage(
      this.currentInnings?.bowlingStats,
      this.currentInnings?.totalBalls || 0
    );
  }

  getInningsOvers(innings: any): string {
    return this.calcService.getOversDisplay(innings?.totalBalls || 0);
  }

  // ==================== GRAPH HELPERS ====================

  getOversAxisLabels(): number[] {
    return this.calcService.getOversAxisLabels(this.match?.format);
  }

  getYAxisLabels(): number[] {
    return this.calcService.getYAxisLabels(this.getMaxRunsForGraph());
  }

  getMaxRunsForGraph(): number {
    return this.calcService.getMaxRunsForGraph(this.match?.innings, this.getTarget());
  }

  getXScale(): number {
    return this.calcService.getXScale(this.match?.format, 620);
  }

  getYScale(): number {
    return this.calcService.getYScale(this.getMaxRunsForGraph(), 320);
  }

  getFirstInningsData(): GraphDataPoint[] {
    return this.calcService.getInningsGraphData(this.match?.innings?.[0]);
  }

  getSecondInningsData(): GraphDataPoint[] {
    return this.calcService.getInningsGraphData(this.match?.innings?.[1]);
  }

  getFirstInningsLinePointsXL(): string {
    return this.calcService.getLinePoints(
      this.getFirstInningsData(),
      60, 350,
      this.getXScale(),
      this.getYScale()
    );
  }

  getSecondInningsLinePointsXL(): string {
    return this.calcService.getLinePoints(
      this.getSecondInningsData(),
      60, 350,
      this.getXScale(),
      this.getYScale()
    );
  }

  getFirstInningsAreaPoints(): string {
    return this.calcService.getAreaPoints(
      this.getFirstInningsData(),
      60, 350,
      this.getXScale(),
      this.getYScale()
    );
  }

  getSecondInningsAreaPoints(): string {
    return this.calcService.getAreaPoints(
      this.getSecondInningsData(),
      60, 350,
      this.getXScale(),
      this.getYScale()
    );
  }

  // ==================== SUB-COMPONENT DATA TRANSFORMERS ====================

  /**
   * Transform batting stats for Live Match Summary view
   */
  getLiveMatchSummaryBattingStats(): Array<{
    name: string;
    image: string | null;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    dismissalText: string;
    isCurrentBatsman: boolean;
    isStriker: boolean;
    isDNB: boolean;
  }> {
    return this.getBattingStats().map(batsman => ({
      name: this.getPlayerName(batsman.player),
      image: this.getPlayerImage(batsman.player),
      runs: batsman.runs || 0,
      balls: batsman.balls || 0,
      fours: batsman.fours || 0,
      sixes: batsman.sixes || 0,
      dismissalText: this.getShortDismissal(batsman),
      isCurrentBatsman: this.isCurrentBatsman(batsman),
      isStriker: this.isStriker(batsman),
      isDNB: batsman.isDNB || false
    }));
  }

  /**
   * Transform bowling stats for Live Match Summary view
   */
  getLiveMatchSummaryBowlingStats(): Array<{
    name: string;
    image: string | null;
    oversDisplay: string;
    runs: number;
    wickets: number;
    economy: string;
    isCurrentBowler: boolean;
    isBestBowler: boolean;
  }> {
    const bestBowler = this.getBestBowler();
    return this.getBowlingStats().map(bowler => ({
      name: this.getPlayerName(bowler.player),
      image: this.getPlayerImage(bowler.player),
      oversDisplay: this.getBowlerOversDisplay(bowler),
      runs: bowler.runs || 0,
      wickets: bowler.wickets || 0,
      economy: this.getBowlerEconomy(bowler),
      isCurrentBowler: this.isCurrentBowler(bowler),
      isBestBowler: bestBowler?.player === bowler.player
    }));
  }

  /**
   * Transform fall of wickets for Live Match Summary view
   */
  getLiveMatchSummaryFOW(): Array<{
    wicketNumber: number;
    runs: number;
    playerName: string;
  }> {
    return this.getFallOfWickets().map(fow => ({
      wicketNumber: fow.wicketNumber,
      runs: fow.runs,
      playerName: this.getShortPlayerName(fow.player)
    }));
  }

  /**
   * Transform batsmen for Final Match Summary view
   */
  getFinalSummaryBatsmen(inningsIndex: number): Array<{
    shortName: string;
    image: string | null;
    runs: number;
    balls: number;
    dismissalText: string;
    isOut: boolean;
    isDNB: boolean;
    isCurrentlyBatting: boolean;
  }> {
    const battingCard = this.getFullBattingCard(inningsIndex);
    return battingCard.map(batsman => ({
      shortName: this.getShortPlayerName(batsman.player),
      image: this.getPlayerImage(batsman.player),
      runs: batsman.runs || 0,
      balls: batsman.balls || 0,
      dismissalText: this.getSummaryDismissal(batsman),
      isOut: batsman.isOut || false,
      isDNB: batsman.isDNB || false,
      isCurrentlyBatting: this.isBatsmanCurrentlyBatting(batsman, inningsIndex)
    }));
  }

  /**
   * Transform bowlers for Final Match Summary view
   */
  getFinalSummaryBowlers(inningsIndex: number): Array<{
    shortName: string;
    wickets: number;
    runs: number;
    oversDisplay: string;
  }> {
    return this.getSummaryBowlers(inningsIndex, 5).map(bowler => ({
      shortName: this.getShortPlayerName(bowler.player),
      wickets: bowler.wickets || 0,
      runs: bowler.runs || 0,
      oversDisplay: this.getBowlerOversDisplay(bowler)
    }));
  }

  // ==================== PLAYER STATS VIEW HELPERS ====================

  /**
   * Get the selected player for player-stats view
   */
  getSelectedPlayer(): any {
    return this.match?.selectedPlayerForStats || null;
  }

  /**
   * Get batting stats for the selected player from all innings
   */
  getSelectedPlayerBattingStats(): any {
    const selectedPlayer = this.getSelectedPlayer();
    if (!selectedPlayer || !this.match?.innings) return null;

    const playerId = selectedPlayer._id || selectedPlayer;

    // Search through all innings for batting stats
    for (const innings of this.match.innings) {
      const stats = innings.battingStats?.find((bs: any) => {
        const bsPlayerId = bs.player?._id || bs.player;
        return bsPlayerId === playerId || bsPlayerId?.toString() === playerId?.toString();
      });
      if (stats) return stats;
    }
    return null;
  }

  /**
   * Get bowling stats for the selected player from all innings
   */
  getSelectedPlayerBowlingStats(): any {
    const selectedPlayer = this.getSelectedPlayer();
    if (!selectedPlayer || !this.match?.innings) return null;

    const playerId = selectedPlayer._id || selectedPlayer;

    // Search through all innings for bowling stats
    for (const innings of this.match.innings) {
      const stats = innings.bowlingStats?.find((bs: any) => {
        const bsPlayerId = bs.player?._id || bs.player;
        return bsPlayerId === playerId || bsPlayerId?.toString() === playerId?.toString();
      });
      if (stats) return stats;
    }
    return null;
  }

  // ==================== DISPLAY-BASED HIGHLIGHTS ====================

  /**
   * Handle view change from display highlight player
   */
  onHighlightViewChange(state: HighlightViewState): void {
    this.highlightViewState = state;
    
    // Update background when highlight view changes
    this.updateBackground();
    
    // Don't show notification overlay during highlights - the score is visible
    // The highlight type badge at the top already indicates what happened
  }

  /**
   * Get the view to display during highlight playback
   */
  getHighlightDisplayView(): string {
    if (!this.highlightViewState) return 'live-score';
    return this.highlightViewState.view;
  }

  /**
   * Check if we're in highlight playback mode with display views
   */
  isInDisplayHighlightMode(): boolean {
    return this.displayView === 'highlight-video' && this.useDisplayBasedHighlights;
  }

  // ==================== HIGHLIGHT SCORE HELPERS ====================
  // These return historical scores during highlight playback

  /**
   * Get total runs - uses highlight score state when in highlight mode
   * For inningsSummary, uses totalRuns from highlightData
   */
  getHighlightTotalRuns(): number {
    if (this.isInDisplayHighlightMode()) {
      // For inningsSummary, use totalRuns from highlightData (specific innings data)
      if (this.highlightViewState?.highlightData?.totalRuns !== undefined) {
        return this.highlightViewState.highlightData.totalRuns;
      }
      // For other highlights, use scoreState
      if (this.highlightViewState?.scoreState) {
        return this.highlightViewState.scoreState.runs;
      }
    }
    return this.currentInnings?.totalRuns || 0;
  }

  /**
   * Get total wickets - uses highlight score state when in highlight mode
   * For inningsSummary, uses totalWickets from highlightData
   */
  getHighlightTotalWickets(): number {
    if (this.isInDisplayHighlightMode()) {
      // For inningsSummary, use totalWickets from highlightData (specific innings data)
      if (this.highlightViewState?.highlightData?.totalWickets !== undefined) {
        return this.highlightViewState.highlightData.totalWickets;
      }
      // For other highlights, use scoreState
      if (this.highlightViewState?.scoreState) {
        return this.highlightViewState.scoreState.wickets;
      }
    }
    return this.currentInnings?.totalWickets || 0;
  }

  /**
   * Get overs display - uses highlight score state when in highlight mode
   * For inningsSummary, uses overs from highlightData
   */
  getHighlightOversDisplay(): string {
    if (this.isInDisplayHighlightMode()) {
      // For inningsSummary, use overs from highlightData (specific innings data)
      if (this.highlightViewState?.highlightData?.overs) {
        return this.highlightViewState.highlightData.overs;
      }
      // For other highlights, use scoreState
      if (this.highlightViewState?.scoreState) {
        return this.highlightViewState.scoreState.overs;
      }
    }
    return this.getOversDisplay();
  }

  /**
   * Get striker name during highlights
   */
  getHighlightStrikerName(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.strikerName) {
      // Extract last name for display
      const fullName = this.highlightViewState.scoreState.strikerName;
      return fullName?.split(' ').pop() || fullName || 'Batsman';
    }
    return this.getStrikerName();
  }

  /**
   * Get striker image during highlights
   */
  getHighlightStrikerImage(): string | null {
    // When in highlight mode with scoreState, use the image from scoreState (even if null)
    // Only fall back to current match data if NOT in highlight mode
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState) {
      const path = this.highlightViewState.scoreState.strikerImage;
      console.log('[DEBUG FE] getHighlightStrikerImage - scoreState:', {
        isHighlightMode: true,
        strikerName: this.highlightViewState.scoreState.strikerName,
        strikerImage: path,
        fullScoreState: this.highlightViewState.scoreState
      });
      if (!path) return null;
      if (path.startsWith('http')) return path;
      // Path like /lsci/db/PICTURES/... - match PlayerCacheService format
      return `https://img1.hscicdn.com/image/upload${path}`;
    }
    return this.getStrikerImage();
  }

  /**
   * Get striker runs during highlights
   */
  getHighlightStrikerRuns(): number {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.strikerRuns !== undefined) {
      return this.highlightViewState.scoreState.strikerRuns;
    }
    return this.getStrikerRuns();
  }

  /**
   * Get striker balls during highlights
   */
  getHighlightStrikerBalls(): number {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.strikerBalls !== undefined) {
      return this.highlightViewState.scoreState.strikerBalls;
    }
    return this.getStrikerBalls();
  }

  /**
   * Get striker strike rate during highlights
   */
  getHighlightStrikerSR(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState) {
      const { strikerRuns, strikerBalls } = this.highlightViewState.scoreState;
      if (strikerBalls && strikerBalls > 0) {
        return ((strikerRuns || 0) / strikerBalls * 100).toFixed(1);
      }
      return '0.0';
    }
    return this.getStrikerSR();
  }

  /**
   * Get non-striker name during highlights
   */
  getHighlightNonStrikerName(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.nonStrikerName) {
      const fullName = this.highlightViewState.scoreState.nonStrikerName;
      return fullName?.split(' ').pop() || fullName || 'Batsman';
    }
    return this.getNonStrikerName();
  }

  /**
   * Get non-striker image during highlights
   */
  getHighlightNonStrikerImage(): string | null {
    // When in highlight mode with scoreState, use the image from scoreState (even if null)
    // Only fall back to current match data if NOT in highlight mode
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState) {
      const path = this.highlightViewState.scoreState.nonStrikerImage;
      if (!path) return null;
      if (path.startsWith('http')) return path;
      // Path like /lsci/db/PICTURES/... - match PlayerCacheService format
      return `https://img1.hscicdn.com/image/upload${path}`;
    }
    return this.getNonStrikerImage();
  }

  /**
   * Get non-striker runs during highlights
   */
  getHighlightNonStrikerRuns(): number {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.nonStrikerRuns !== undefined) {
      return this.highlightViewState.scoreState.nonStrikerRuns;
    }
    return this.getNonStrikerRuns();
  }

  /**
   * Get non-striker balls during highlights
   */
  getHighlightNonStrikerBalls(): number {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.nonStrikerBalls !== undefined) {
      return this.highlightViewState.scoreState.nonStrikerBalls;
    }
    return this.getNonStrikerBalls();
  }

  /**
   * Get non-striker strike rate during highlights
   */
  getHighlightNonStrikerSR(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState) {
      const { nonStrikerRuns, nonStrikerBalls } = this.highlightViewState.scoreState;
      if (nonStrikerBalls && nonStrikerBalls > 0) {
        return ((nonStrikerRuns || 0) / nonStrikerBalls * 100).toFixed(1);
      }
      return '0.0';
    }
    return this.getNonStrikerSR();
  }

  /**
   * Get bowler name during highlights
   */
  getHighlightBowlerName(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.bowlerName) {
      const fullName = this.highlightViewState.scoreState.bowlerName;
      return fullName?.split(' ').pop() || fullName || 'Bowler';
    }
    return this.getCurrentBowlerName();
  }

  /**
   * Get bowler image during highlights
   */
  getHighlightBowlerImage(): string | null {
    // When in highlight mode with scoreState, use the image from scoreState (even if null)
    // Only fall back to current match data if NOT in highlight mode
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState) {
      const path = this.highlightViewState.scoreState.bowlerImage;
      if (!path) return null;
      if (path.startsWith('http')) return path;
      // Path like /lsci/db/PICTURES/... - match PlayerCacheService format
      return `https://img1.hscicdn.com/image/upload${path}`;
    }
    return this.getCurrentBowlerImage();
  }

  /**
   * Get bowler figures during highlights
   */
  getHighlightBowlerFigures(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.bowlerFigures) {
      return this.highlightViewState.scoreState.bowlerFigures;
    }
    return this.getCurrentBowlerFigures();
  }

  /**
   * Get bowler overs during highlights
   */
  getHighlightBowlerOvers(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.bowlerOvers) {
      return this.highlightViewState.scoreState.bowlerOvers;
    }
    return this.getCurrentBowlerOvers();
  }

  /**
   * Get current over balls during highlights
   */
  getHighlightCurrentOverBalls(): any[] {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.scoreState?.currentOverBalls) {
      return this.highlightViewState.scoreState.currentOverBalls;
    }
    return this.getCurrentOverBalls();
  }

  /**
   * Get current run rate during highlights
   * For inningsSummary, uses runRate from highlightData
   */
  getHighlightCurrentRunRate(): string {
    if (this.isInDisplayHighlightMode()) {
      // For inningsSummary, use runRate from highlightData (specific innings data)
      if (this.highlightViewState?.highlightData?.runRate) {
        return this.highlightViewState.highlightData.runRate;
      }
      // For other highlights, calculate from scoreState
      if (this.highlightViewState?.scoreState) {
        const { runs, overs } = this.highlightViewState.scoreState;
        // Parse overs string like "6.1" to calculate balls
        const parts = overs.split('.');
        const completedOvers = parseInt(parts[0]) || 0;
        const balls = parseInt(parts[1]) || 0;
        const totalBalls = completedOvers * 6 + balls;
        if (totalBalls === 0) return '0.00';
        return ((runs / totalBalls) * 6).toFixed(2);
      }
    }
    return this.getCurrentRunRate();
  }

  /**
   * Check if highlight is from second innings
   */
  isHighlightSecondInnings(): boolean {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      // First check scoreAfter which has the accurate data
      const scoreAfter = this.highlightViewState.highlightData.scoreAfter;
      if (scoreAfter?.isSecondInnings !== undefined) {
        return scoreAfter.isSecondInnings;
      }
      // Fallback to highlight data fields
      return this.highlightViewState.highlightData.inningsNumber === 2 ||
             this.highlightViewState.highlightData.isSecondInnings === true;
    }
    return this.isSecondInnings();
  }

  /**
   * Get batting team name during highlights - uses highlight data's battingTeam
   */
  getHighlightBattingTeamName(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      // Check scoreAfter for battingTeam
      const scoreAfter = this.highlightViewState.highlightData.scoreAfter;
      if (scoreAfter?.battingTeam) {
        return scoreAfter.battingTeam;
      }
      // Check highlightData directly for battingTeam
      if (this.highlightViewState.highlightData.battingTeam) {
        return this.highlightViewState.highlightData.battingTeam;
      }
    }
    return this.getBattingTeamName();
  }

  /**
   * Get innings label during highlights - uses highlight data's inningsNumber
   */
  getHighlightInningsLabel(): string {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      // Check scoreAfter for isSecondInnings
      const scoreAfter = this.highlightViewState.highlightData.scoreAfter;
      if (scoreAfter?.isSecondInnings !== undefined) {
        return scoreAfter.isSecondInnings ? '2nd Innings' : '1st Innings';
      }
      // Check highlightData for inningsNumber
      if (this.highlightViewState.highlightData.inningsNumber !== undefined) {
        return this.highlightViewState.highlightData.inningsNumber === 2 ? '2nd Innings' : '1st Innings';
      }
    }
    return this.getInningsLabel();
  }

  /**
   * Get runs needed during highlights
   */
  getHighlightRunsNeeded(): number {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      const scoreAfter = this.highlightViewState.highlightData.scoreAfter;
      // Use runsNeeded from scoreAfter if available (most accurate)
      if (scoreAfter?.runsNeeded !== undefined && scoreAfter.runsNeeded !== null) {
        return scoreAfter.runsNeeded;
      }
      // Fallback to calculating from target
      if (scoreAfter?.target !== undefined && scoreAfter?.runs !== undefined) {
        return Math.max(0, scoreAfter.target - scoreAfter.runs);
      }
    }
    return this.getRunsNeeded();
  }

  /**
   * Get balls remaining during highlights
   */
  getHighlightBallsRemaining(): number {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      const scoreAfter = this.highlightViewState.highlightData.scoreAfter;
      // Use ballsRemaining from scoreAfter if available (most accurate)
      if (scoreAfter?.ballsRemaining !== undefined && scoreAfter.ballsRemaining !== null) {
        return scoreAfter.ballsRemaining;
      }
      // Fallback to calculating from overs
      if (scoreAfter?.overs && scoreAfter?.totalOvers) {
        const parts = scoreAfter.overs.split('.');
        const completedOvers = parseInt(parts[0]) || 0;
        const balls = parseInt(parts[1]) || 0;
        const totalBallsUsed = completedOvers * 6 + balls;
        const totalBalls = scoreAfter.totalOvers * 6;
        return Math.max(0, totalBalls - totalBallsUsed);
      }
    }
    return this.getBallsRemaining();
  }

  /**
   * Get batting stats for phase/innings summary during highlights
   * For overSummary highlights, use the topScorer data from highlightData
   * For inningsSummary highlights, use the topBatsmen array from highlightData
   */
  getHighlightBattingStats(): Array<{
    name: string;
    image: string | null;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    dismissalText: string;
    isCurrentBatsman: boolean;
    isStriker: boolean;
    isDNB: boolean;
  }> {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      const data = this.highlightViewState.highlightData;
      
      // For inningsSummary, use the topBatsmen array from highlightData
      // This is the correct data for the specific innings being summarized
      if (data.topBatsmen && Array.isArray(data.topBatsmen)) {
        return data.topBatsmen.map((batsman: any) => ({
          name: batsman.name || 'Batsman',
          image: batsman.image ? (batsman.image.startsWith('http') ? batsman.image : `https://img1.hscicdn.com/image/upload${batsman.image}`) : null,
          runs: batsman.runs || 0,
          balls: batsman.balls || 0,
          fours: batsman.fours || 0,
          sixes: batsman.sixes || 0,
          dismissalText: batsman.isOut ? 'out' : 'not out',
          isCurrentBatsman: !batsman.isOut,
          isStriker: false,
          isDNB: false
        }));
      }
      
      // For overSummary / phase summary, show topScorer prominently
      if (data.topScorer) {
        const topScorer = data.topScorer;
        return [{
          name: topScorer.name || 'Batsman',
          image: topScorer.image ? (topScorer.image.startsWith('http') ? topScorer.image : `https://img1.hscicdn.com/image/upload${topScorer.image}`) : null,
          runs: topScorer.runs || 0,
          balls: topScorer.balls || 0,
          fours: topScorer.fours || 0,
          sixes: topScorer.sixes || 0,
          dismissalText: 'not out',
          isCurrentBatsman: true,
          isStriker: true,
          isDNB: false
        }];
      }
      
      // Fallback: build from scoreState
      const scoreAfter = data.scoreAfter;
      if (scoreAfter?.strikerName) {
        const result = [];
        // Add striker
        result.push({
          name: scoreAfter.strikerName,
          image: scoreAfter.strikerImage ? (scoreAfter.strikerImage.startsWith('http') ? scoreAfter.strikerImage : `https://img1.hscicdn.com/image/upload${scoreAfter.strikerImage}`) : null,
          runs: scoreAfter.strikerRuns || 0,
          balls: scoreAfter.strikerBalls || 0,
          fours: scoreAfter.strikerFours || 0,
          sixes: scoreAfter.strikerSixes || 0,
          dismissalText: 'not out',
          isCurrentBatsman: true,
          isStriker: true,
          isDNB: false
        });
        // Add non-striker
        if (scoreAfter.nonStrikerName) {
          result.push({
            name: scoreAfter.nonStrikerName,
            image: scoreAfter.nonStrikerImage ? (scoreAfter.nonStrikerImage.startsWith('http') ? scoreAfter.nonStrikerImage : `https://img1.hscicdn.com/image/upload${scoreAfter.nonStrikerImage}`) : null,
            runs: scoreAfter.nonStrikerRuns || 0,
            balls: scoreAfter.nonStrikerBalls || 0,
            fours: scoreAfter.nonStrikerFours || 0,
            sixes: scoreAfter.nonStrikerSixes || 0,
            dismissalText: 'not out',
            isCurrentBatsman: true,
            isStriker: false,
            isDNB: false
          });
        }
        return result;
      }
    }
    // Fallback to current match data
    return this.getLiveMatchSummaryBattingStats();
  }

  /**
   * Get bowling stats for phase/innings summary during highlights
   * For overSummary highlights, use the bestBowler data from highlightData
   * For inningsSummary highlights, use the topBowlers array from highlightData
   */
  getHighlightBowlingStats(): Array<{
    name: string;
    image: string | null;
    oversDisplay: string;
    runs: number;
    wickets: number;
    economy: string;
    isCurrentBowler: boolean;
    isBestBowler: boolean;
  }> {
    if (this.isInDisplayHighlightMode() && this.highlightViewState?.highlightData) {
      const data = this.highlightViewState.highlightData;
      
      // For inningsSummary, use the topBowlers array from highlightData
      // This is the correct data for the specific innings being summarized
      if (data.topBowlers && Array.isArray(data.topBowlers)) {
        return data.topBowlers.map((bowler: any, index: number) => {
          const oversStr = bowler.overs || '0.0';
          const parts = oversStr.split('.');
          const fullOvers = parseInt(parts[0]) || 0;
          const balls = parseInt(parts[1]) || 0;
          const totalBalls = fullOvers * 6 + balls;
          const economy = totalBalls > 0 ? ((bowler.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
          
          return {
            name: bowler.name || 'Bowler',
            image: bowler.image ? (bowler.image.startsWith('http') ? bowler.image : `https://img1.hscicdn.com/image/upload${bowler.image}`) : null,
            oversDisplay: oversStr,
            runs: bowler.runs || 0,
            wickets: bowler.wickets || 0,
            economy: economy,
            isCurrentBowler: false,
            isBestBowler: index === 0
          };
        });
      }
      
      // For overSummary / phase summary, show bestBowler prominently
      if (data.bestBowler) {
        const bestBowler = data.bestBowler;
        // Parse overs string like "3.2" to calculate economy
        const oversStr = bestBowler.overs || '0.0';
        const parts = oversStr.split('.');
        const fullOvers = parseInt(parts[0]) || 0;
        const balls = parseInt(parts[1]) || 0;
        const totalBalls = fullOvers * 6 + balls;
        const economy = totalBalls > 0 ? ((bestBowler.runs || 0) / totalBalls * 6).toFixed(2) : '0.00';
        
        return [{
          name: bestBowler.name || 'Bowler',
          image: bestBowler.image ? (bestBowler.image.startsWith('http') ? bestBowler.image : `https://img1.hscicdn.com/image/upload${bestBowler.image}`) : null,
          oversDisplay: oversStr,
          runs: bestBowler.runs || 0,
          wickets: bestBowler.wickets || 0,
          economy: economy,
          isCurrentBowler: true,
          isBestBowler: true
        }];
      }
      
      // Fallback: build from scoreState
      const scoreAfter = data.scoreAfter;
      if (scoreAfter?.bowlerName) {
        const oversStr = scoreAfter.bowlerOvers || '0.0';
        const parts = oversStr.split('.');
        const fullOvers = parseInt(parts[0]) || 0;
        const balls = parseInt(parts[1]) || 0;
        const totalBalls = fullOvers * 6 + balls;
        const economy = totalBalls > 0 ? ((scoreAfter.bowlerRuns || 0) / totalBalls * 6).toFixed(2) : '0.00';
        
        return [{
          name: scoreAfter.bowlerName,
          image: scoreAfter.bowlerImage ? (scoreAfter.bowlerImage.startsWith('http') ? scoreAfter.bowlerImage : `https://img1.hscicdn.com/image/upload${scoreAfter.bowlerImage}`) : null,
          oversDisplay: oversStr,
          runs: scoreAfter.bowlerRuns || 0,
          wickets: scoreAfter.bowlerWickets || 0,
          economy: economy,
          isCurrentBowler: true,
          isBestBowler: true
        }];
      }
    }
    // Fallback to current match data
    return this.getLiveMatchSummaryBowlingStats();
  }

  // ==================== STARTING XI HELPERS ====================

  /**
   * Get Starting XI players for Team 1
   * Shows players marked as isPlayingXI with battingOrder assigned
   */
  getTeam1StartingXI(): Array<{
    name: string;
    image: string | null;
    role: string;
    battingOrder: number;
  }> {
    if (!this.match?.squads?.team1) {
      return [];
    }
    
    // Get players who are in playing XI (have battingOrder assigned)
    const playingXI = this.match.squads.team1
      .filter((p: any) => p.isPlayingXI && p.battingOrder)
      .map((p: any) => ({
        name: p.player?.name || 'Unknown',
        image: this.getPlayerImagePath(p.player),
        role: p.player?.role || 'player',
        battingOrder: p.battingOrder || 99
      }))
      .sort((a: any, b: any) => a.battingOrder - b.battingOrder);
    
    return playingXI;
  }

  /**
   * Get Starting XI players for Team 2
   * Shows players marked as isPlayingXI with battingOrder assigned
   */
  getTeam2StartingXI(): Array<{
    name: string;
    image: string | null;
    role: string;
    battingOrder: number;
  }> {
    if (!this.match?.squads?.team2) return [];
    
    // Get players who are in playing XI (have battingOrder assigned)
    const playingXI = this.match.squads.team2
      .filter((p: any) => p.isPlayingXI && p.battingOrder)
      .map((p: any) => ({
        name: p.player?.name || 'Unknown',
        image: this.getPlayerImagePath(p.player),
        role: p.player?.role || 'player',
        battingOrder: p.battingOrder || 99
      }))
      .sort((a: any, b: any) => a.battingOrder - b.battingOrder);
    
    return playingXI;
  }

  /**
   * Get toss winner code
   */
  getTossWinnerCode(): string {
    if (!this.match?.toss?.winner) return '';
    return this.match.toss.winner.code || '';
  }

  /**
   * Get toss winner flag
   */
  getTossWinnerFlag(): string | null {
    if (!this.match?.toss?.winner) return null;
    return this.match.toss.winner.flagUrl || null;
  }

  /**
   * Get toss decision
   */
  getTossDecision(): 'bat' | 'bowl' {
    return this.match?.toss?.decision || 'bat';
  }
}
