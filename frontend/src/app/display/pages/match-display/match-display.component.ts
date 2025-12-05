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
  PlayerStatsViewComponent
} from './components';

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
    PlayerStatsViewComponent
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
  notificationType: 'six' | 'four' | 'wicket' | 'third-umpire' | 'custom-message' | null = null;
  notificationData: any = null;
  notificationDuration = 10000;
  private notificationTimeout: any = null;
  
  // Third Umpire properties
  thirdUmpireDecision: 'out' | 'not-out' | null = null;
  
  // Custom Message properties
  customMessage: string = '';
  
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
    console.log('MatchDisplayComponent ngOnInit called');
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    console.log('Match ID extracted:', this.matchId);
    if (this.matchId) {
      this.loadMatch();
      this.loadDefaultBackgrounds();
      this.setupSSE();
    } else {
      console.error('No match ID found in route!');
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
    console.log('Loading match:', this.matchId);
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        console.log('Match response:', response);
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'live-score';
          this.buildPlayerNameCache();
          this.updateBackground();
        } else {
          this.error = 'Match not found';
        }
        this.loading = false;
        console.log('Loading complete, loading:', this.loading, 'error:', this.error, 'match:', !!this.match);
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
          this.updateBackground();
        }
      }
    });
  }

  updateBackground() {
    const state = this.backgroundService.updateBackground(
      this.displayView,
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
          this.updateBackground();
        }
        this.reloadMatch();
        break;
      case 'match-state':
        if (event.data?.displayView) {
          this.displayView = event.data.displayView;
          this.updateBackground();
        }
        this.reloadMatch();
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

  showBigNotification(type: 'six' | 'four' | 'wicket', data: any) {
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
      'player-stats': 'Player Stats'
    };
    return names[this.displayView] || 'Live Score';
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
}
