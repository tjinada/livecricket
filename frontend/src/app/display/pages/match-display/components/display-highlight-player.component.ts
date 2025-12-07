import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightService, HighlightVideo, HighlightData } from '../../../services/highlight.service';
import { interval, Subscription } from 'rxjs';

/**
 * Display Highlight Player Component
 * 
 * This component plays match highlights using the actual display views
 * (Live Score View for 4s/6s/wickets, Live Match Summary for over summaries)
 * instead of custom overlay screens.
 * 
 * It emits view changes that the parent component uses to switch between
 * the actual display view components.
 */

export interface HighlightViewState {
  view: 'live-score' | 'live-match-summary' | 'final-match-summary' | 'intro';
  highlightType: string;
  highlightData: any;
  showOverlay: boolean;
  overlayType: 'four' | 'six' | 'wicket' | 'fifty' | 'hundred' | null;
  // Phase 5: Importance level for visual indicators
  importance?: {
    score: number;
    level: 'routine' | 'notable' | 'significant' | 'crucial' | 'epic';
    factors: string[];
  };
  // Phase 5: Transition state
  isTransitioning?: boolean;
  // Full score state at time of highlight
  scoreState?: {
    // Team score
    runs: number;
    wickets: number;
    overs: string;
    
    // Striker info
    strikerName?: string;
    strikerImage?: string | null;
    strikerRuns?: number;
    strikerBalls?: number;
    strikerFours?: number;
    strikerSixes?: number;
    
    // Non-striker info
    nonStrikerName?: string;
    nonStrikerImage?: string | null;
    nonStrikerRuns?: number;
    nonStrikerBalls?: number;
    nonStrikerFours?: number;
    nonStrikerSixes?: number;
    
    // Bowler info
    bowlerName?: string;
    bowlerImage?: string | null;
    bowlerOvers?: string;
    bowlerRuns?: number;
    bowlerWickets?: number;
    bowlerFigures?: string;
    
    // Current over balls
    currentOverBalls?: Array<{
      display: string;
      runs: number;
      isWicket: boolean;
      isFour: boolean;
      isSix: boolean;
      isExtra: boolean;
    }>;
    currentOverNumber?: number;
  };
}

interface PlayerState {
  isPlaying: boolean;
  currentIndex: number;
  currentHighlight: HighlightData | null;
  progress: number;
  elapsedTime: number;
  totalTime: number;
  // Phase 5: Transition state
  isTransitioning: boolean;
}

@Component({
  selector: 'app-display-highlight-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Highlight Player Overlay - Transparent, shows controls at bottom -->
    <div class="fixed inset-0 z-50 pointer-events-none">
      
      <!-- Phase 5: Transition Overlay - Fade effect between highlights -->
      <div 
        class="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-30"
        [class.opacity-0]="!playerState.isTransitioning"
        [class.opacity-100]="playerState.isTransitioning">
      </div>
      
      <!-- Loading State -->
      <div *ngIf="loading" class="absolute inset-0 bg-black flex items-center justify-center pointer-events-auto">
        <div class="text-center">
          <div class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-white text-xl font-medium">Loading Highlights...</p>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="absolute inset-0 bg-black flex items-center justify-center pointer-events-auto">
        <div class="text-center max-w-md">
          <div class="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <p class="text-white text-xl font-medium mb-2">Failed to Load Highlights</p>
          <p class="text-gray-400 mb-4">{{ error }}</p>
          <button 
            (click)="loadHighlights()" 
            class="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors">
            Try Again
          </button>
        </div>
      </div>

      <!-- Main Content - Control Panel only, display view is behind -->
      <div *ngIf="highlightVideo && !loading && !error" class="h-full flex flex-col pointer-events-none">
        
        <!-- Close Button - Always visible -->
        <button 
          (click)="onClose()"
          class="absolute top-6 right-6 z-20 w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors pointer-events-auto backdrop-blur-sm">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <!-- Highlight Info Badge - Top left -->
        <div class="absolute top-6 left-6 z-20 pointer-events-auto">
          <div class="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
            <span class="text-purple-400 font-bold">HIGHLIGHTS</span>
            <span class="text-white">{{ highlightVideo.team1.code }} vs {{ highlightVideo.team2.code }}</span>
          </div>
        </div>

        <!-- Current Highlight Label - Top Center with Importance Indicator -->
        <div *ngIf="playerState.currentHighlight" 
             class="absolute top-6 left-1/2 transform -translate-x-1/2 z-20"
             [class.animate-highlight-enter]="!playerState.isTransitioning">
          <div class="flex flex-col items-center gap-2">
            <!-- Main highlight type badge -->
            <div 
              class="px-6 py-2 rounded-full text-white text-lg font-bold backdrop-blur-sm shadow-lg transition-all duration-300"
              [ngClass]="[
                getHighlightTypeColor(playerState.currentHighlight.type),
                getImportanceGlow()
              ]">
              {{ getHighlightTypeLabel(playerState.currentHighlight.type) }}
            </div>
            
            <!-- Phase 5: Importance level indicator (only for epic/crucial moments) -->
            <div *ngIf="isHighImportance()" 
                 class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold animate-pulse"
                 [ngClass]="getImportanceBadgeClass()">
              <span class="text-yellow-300">⭐</span>
              <span>{{ getImportanceLabel() }}</span>
            </div>
          </div>
        </div>

        <!-- No Highlights -->
        <div *ngIf="highlightVideo.highlights.length === 0" class="absolute inset-0 bg-black flex items-center justify-center pointer-events-auto">
          <div class="text-center text-white">
            <p class="text-2xl font-medium mb-2">No Highlights Available</p>
            <p class="text-gray-400">This match has no 4s, 6s, or wickets recorded yet.</p>
            <button 
              (click)="onClose()" 
              class="mt-4 px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>

        <!-- Spacer to push controls to bottom -->
        <div class="flex-1"></div>

        <!-- Bottom Controls -->
        <div class="bg-gradient-to-t from-black via-black/90 to-transparent pt-16 pb-8 px-8 pointer-events-auto">
          <!-- Progress Bar -->
          <div class="max-w-4xl mx-auto mb-6">
            <div class="flex items-center gap-4 text-white text-sm mb-2">
              <span>{{ formatTime(getCurrentElapsedTime()) }}</span>
              <div class="flex-1 relative">
                <div class="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div class="h-full bg-white rounded-full transition-all duration-100"
                       [style.width.%]="playerState.progress"></div>
                </div>
                
                <!-- Highlight Markers with importance sizing -->
                <div class="absolute top-0 left-0 right-0 h-4 -mt-1.5" *ngIf="highlightVideo">
                  <div *ngFor="let highlight of highlightVideo.highlights; let i = index"
                       class="absolute top-0 rounded-full cursor-pointer hover:scale-150 transition-transform"
                       [ngClass]="[
                         getHighlightTypeColor(highlight.type),
                         getMarkerSize(highlight)
                       ]"
                       [style.left.%]="getHighlightPosition(i)"
                       [class.ring-2]="i === playerState.currentIndex"
                       [class.ring-white]="i === playerState.currentIndex"
                       (click)="goToHighlight(i)"
                       [title]="getMarkerTooltip(highlight)">
                  </div>
                </div>
              </div>
              <span>{{ formatTime(playerState.totalTime) }}</span>
            </div>
          </div>
          
          <!-- Playback Controls -->
          <div class="flex items-center justify-center gap-8">
            <!-- Restart -->
            <button (click)="restart()" 
                    class="w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
            
            <!-- Skip Backward -->
            <button (click)="skipBackward()" 
                    [disabled]="playerState.currentIndex === 0"
                    class="w-12 h-12 flex items-center justify-center text-white disabled:text-white/30 transition-colors">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"></path>
              </svg>
            </button>
            
            <!-- Play/Pause -->
            <button (click)="togglePlayPause()" 
                    class="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg">
              <svg *ngIf="!playerState.isPlaying" class="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"></path>
              </svg>
              <svg *ngIf="playerState.isPlaying" class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
              </svg>
            </button>
            
            <!-- Skip Forward -->
            <button (click)="skipForward()" 
                    [disabled]="highlightVideo && playerState.currentIndex >= highlightVideo.highlights.length - 1"
                    class="w-12 h-12 flex items-center justify-center text-white disabled:text-white/30 transition-colors">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path>
              </svg>
            </button>
            
            <!-- Highlight Counter -->
            <div class="w-24 text-center text-white/60 text-sm">
              {{ playerState.currentIndex + 1 }} / {{ highlightVideo.highlights.length }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Phase 5: Custom animations */
    @keyframes highlight-enter {
      0% {
        opacity: 0;
        transform: translateX(-50%) scale(0.8);
      }
      100% {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
    }
    
    .animate-highlight-enter {
      animation: highlight-enter 0.3s ease-out;
    }
    
    /* Importance glow effects */
    .glow-epic {
      box-shadow: 0 0 20px 4px rgba(251, 191, 36, 0.6), 0 0 40px 8px rgba(251, 191, 36, 0.3);
    }
    
    .glow-crucial {
      box-shadow: 0 0 15px 3px rgba(249, 115, 22, 0.5), 0 0 30px 6px rgba(249, 115, 22, 0.25);
    }
    
    .glow-significant {
      box-shadow: 0 0 10px 2px rgba(59, 130, 246, 0.4);
    }
  `]
})
export class DisplayHighlightPlayerComponent implements OnInit, OnDestroy {
  @Input() matchId: string = '';
  @Input() inningsNumber: number | null = null;
  @Input() autoPlay: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<HighlightViewState>();

  highlightVideo: HighlightVideo | null = null;
  loading = true;
  error = '';

  playerState: PlayerState = {
    isPlaying: false,
    currentIndex: 0,
    currentHighlight: null,
    progress: 0,
    elapsedTime: 0,
    totalTime: 0,
    isTransitioning: false
  };

  private progressSubscription: Subscription | null = null;
  private highlightTimer: any = null;
  private currentHighlightElapsed = 0;
  private readonly PROGRESS_INTERVAL = 50;

  constructor(private highlightService: HighlightService) {}

  ngOnInit() {
    this.loadHighlights();
  }

  ngOnDestroy() {
    this.pause();
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
  }

  loadHighlights() {
    this.loading = true;
    this.error = '';

    const options = this.inningsNumber 
      ? { innings: this.inningsNumber } 
      : undefined;

    this.highlightService.getHighlightVideo(this.matchId, options).subscribe({
      next: (data) => {
        this.highlightVideo = data;
        this.playerState.totalTime = data.totalDuration;
        
        // DEBUG: Log the highlight data received from API
        console.log('[DEBUG FE] Highlight data received from API:', {
          totalHighlights: data.highlights.length,
          firstFewHighlights: data.highlights.slice(0, 3).map((h: any) => ({
            type: h.type,
            scoreAfter: h.data?.scoreAfter ? {
              strikerName: h.data.scoreAfter.strikerName,
              strikerImage: h.data.scoreAfter.strikerImage,
              nonStrikerName: h.data.scoreAfter.nonStrikerName,
              nonStrikerImage: h.data.scoreAfter.nonStrikerImage,
              bowlerName: h.data.scoreAfter.bowlerName,
              bowlerImage: h.data.scoreAfter.bowlerImage
            } : 'NO scoreAfter'
          }))
        });
        
        if (data.highlights.length > 0) {
          this.playerState.currentHighlight = data.highlights[0];
          this.emitViewChange();
        }
        
        this.loading = false;

        if (this.autoPlay && data.highlights.length > 0) {
          setTimeout(() => this.play(), 500);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load highlights';
        this.loading = false;
      }
    });
  }

  private emitViewChange() {
    if (!this.playerState.currentHighlight) return;
    this.viewChange.emit(this.buildViewState());
  }

  play() {
    if (!this.highlightVideo || this.highlightVideo.highlights.length === 0) return;
    
    this.playerState.isPlaying = true;
    this.startProgressTimer();
    this.playCurrentHighlight();
  }

  pause() {
    this.playerState.isPlaying = false;
    this.stopProgressTimer();
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
  }

  togglePlayPause() {
    if (this.playerState.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  skipForward() {
    if (!this.highlightVideo) return;
    
    this.pause();
    
    if (this.playerState.currentIndex < this.highlightVideo.highlights.length - 1) {
      this.playerState.elapsedTime += this.currentHighlightElapsed;
      this.playerState.currentIndex++;
      this.playerState.currentHighlight = this.highlightVideo.highlights[this.playerState.currentIndex];
      this.currentHighlightElapsed = 0;
      this.emitViewChange();
      this.play();
    }
  }

  skipBackward() {
    if (!this.highlightVideo) return;
    
    this.pause();
    
    if (this.playerState.currentIndex > 0) {
      const prevHighlight = this.highlightVideo.highlights[this.playerState.currentIndex - 1];
      this.playerState.elapsedTime = Math.max(0, this.playerState.elapsedTime - prevHighlight.duration);
      this.playerState.currentIndex--;
      this.playerState.currentHighlight = this.highlightVideo.highlights[this.playerState.currentIndex];
      this.currentHighlightElapsed = 0;
      this.emitViewChange();
      this.play();
    }
  }

  goToHighlight(index: number) {
    if (!this.highlightVideo || index < 0 || index >= this.highlightVideo.highlights.length) return;
    
    this.pause();
    
    let elapsed = 0;
    for (let i = 0; i < index; i++) {
      elapsed += this.highlightVideo.highlights[i].duration;
    }
    
    this.playerState.currentIndex = index;
    this.playerState.currentHighlight = this.highlightVideo.highlights[index];
    this.playerState.elapsedTime = elapsed;
    this.currentHighlightElapsed = 0;
    this.emitViewChange();
    this.play();
  }

  restart() {
    this.pause();
    this.playerState.currentIndex = 0;
    this.playerState.elapsedTime = 0;
    this.playerState.progress = 0;
    this.currentHighlightElapsed = 0;
    
    if (this.highlightVideo && this.highlightVideo.highlights.length > 0) {
      this.playerState.currentHighlight = this.highlightVideo.highlights[0];
      this.emitViewChange();
      this.play();
    }
  }

  private startProgressTimer() {
    this.stopProgressTimer();
    
    this.progressSubscription = interval(this.PROGRESS_INTERVAL).subscribe(() => {
      if (!this.playerState.isPlaying || !this.playerState.currentHighlight) return;
      
      this.currentHighlightElapsed += this.PROGRESS_INTERVAL;
      const totalElapsed = this.playerState.elapsedTime + this.currentHighlightElapsed;
      this.playerState.progress = (totalElapsed / this.playerState.totalTime) * 100;
    });
  }

  private stopProgressTimer() {
    if (this.progressSubscription) {
      this.progressSubscription.unsubscribe();
      this.progressSubscription = null;
    }
  }

  private playCurrentHighlight() {
    if (!this.highlightVideo || !this.playerState.isPlaying) return;
    
    const highlight = this.playerState.currentHighlight;
    if (!highlight) return;
    
    const remainingTime = highlight.duration - this.currentHighlightElapsed;
    
    this.highlightTimer = setTimeout(() => {
      this.playerState.elapsedTime += highlight.duration;
      this.currentHighlightElapsed = 0;
      
      if (this.playerState.currentIndex < this.highlightVideo!.highlights.length - 1) {
        // Phase 5: Trigger transition before changing highlight
        this.triggerTransition();
        
        this.playerState.currentIndex++;
        this.playerState.currentHighlight = this.highlightVideo!.highlights[this.playerState.currentIndex];
        
        // Emit after transition starts (actual content change)
        setTimeout(() => {
          this.emitViewChange();
          this.playCurrentHighlight();
        }, 150); // Half of transition duration
      } else {
        this.playerState.isPlaying = false;
        this.stopProgressTimer();
        this.playerState.progress = 100;
      }
    }, remainingTime);
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getCurrentElapsedTime(): number {
    return this.playerState.elapsedTime + this.currentHighlightElapsed;
  }

  getHighlightTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'matchIntro': '🏏 MATCH',
      'inningsIntro': '🏏 1ST INNINGS',
      'chaseSetup': '🎯 THE CHASE',
      'four': '🏏 FOUR!',
      'six': '🔥 SIX!',
      'wicket': '🎯 WICKET!',
      'fifty': '⭐ FIFTY!',
      'hundred': '💯 CENTURY!',
      'overSummary': '📊 Phase Summary',
      'inningsSummary': '📈 Innings Summary',
      'matchSummary': '🏆 Match Summary'
    };
    return labels[type] || type;
  }

  getHighlightTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'matchIntro': 'bg-slate-700',
      'inningsIntro': 'bg-blue-700',
      'chaseSetup': 'bg-orange-600',
      'four': 'bg-green-500',
      'six': 'bg-purple-600',
      'wicket': 'bg-red-600',
      'fifty': 'bg-yellow-500',
      'hundred': 'bg-amber-500',
      'overSummary': 'bg-blue-600',
      'inningsSummary': 'bg-indigo-600',
      'matchSummary': 'bg-cyan-600'
    };
    return colors[type] || 'bg-gray-600';
  }

  getHighlightPosition(index: number): number {
    if (!this.highlightVideo || this.highlightVideo.totalDuration === 0) return 0;
    
    let elapsed = 0;
    for (let i = 0; i < index; i++) {
      elapsed += this.highlightVideo.highlights[i].duration;
    }
    return (elapsed / this.highlightVideo.totalDuration) * 100;
  }

  // ==================== PHASE 5: IMPORTANCE & VISUAL HELPERS ====================

  /**
   * Get the current highlight's importance level
   */
  private getCurrentImportance(): { score: number; level: string; factors: string[] } | null {
    const highlight = this.playerState.currentHighlight;
    if (!highlight) return null;
    
    // Access importance from the highlight data (added in Phase 3)
    return (highlight as any).importance || null;
  }

  /**
   * Check if current highlight is high importance (crucial or epic)
   */
  isHighImportance(): boolean {
    const importance = this.getCurrentImportance();
    if (!importance) return false;
    return importance.level === 'crucial' || importance.level === 'epic';
  }

  /**
   * Get the importance label for display
   */
  getImportanceLabel(): string {
    const importance = this.getCurrentImportance();
    if (!importance) return '';
    
    const labels: Record<string, string> = {
      'epic': 'EPIC MOMENT!',
      'crucial': 'KEY MOMENT!',
      'significant': 'BIG MOMENT',
      'notable': '',
      'routine': ''
    };
    return labels[importance.level] || '';
  }

  /**
   * Get CSS class for importance badge
   */
  getImportanceBadgeClass(): string {
    const importance = this.getCurrentImportance();
    if (!importance) return '';
    
    const classes: Record<string, string> = {
      'epic': 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black',
      'crucial': 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
      'significant': 'bg-blue-500/80 text-white',
      'notable': '',
      'routine': ''
    };
    return classes[importance.level] || '';
  }

  /**
   * Get glow effect class based on importance
   */
  getImportanceGlow(): string {
    const importance = this.getCurrentImportance();
    if (!importance) return '';
    
    const glows: Record<string, string> = {
      'epic': 'glow-epic',
      'crucial': 'glow-crucial',
      'significant': 'glow-significant',
      'notable': '',
      'routine': ''
    };
    return glows[importance.level] || '';
  }

  /**
   * Get marker size based on highlight importance
   */
  getMarkerSize(highlight: HighlightData): string {
    const importance = (highlight as any).importance;
    if (!importance) return 'w-1.5 h-3';
    
    const sizes: Record<string, string> = {
      'epic': 'w-3 h-4',
      'crucial': 'w-2.5 h-4',
      'significant': 'w-2 h-3.5',
      'notable': 'w-1.5 h-3',
      'routine': 'w-1.5 h-3'
    };
    return sizes[importance.level] || 'w-1.5 h-3';
  }

  /**
   * Get tooltip text for timeline marker
   */
  getMarkerTooltip(highlight: HighlightData): string {
    const label = this.getHighlightTypeLabel(highlight.type);
    const importance = (highlight as any).importance;
    
    if (importance && (importance.level === 'epic' || importance.level === 'crucial')) {
      return `${label} (${importance.level.toUpperCase()})`;
    }
    return label;
  }

  /**
   * Trigger transition effect when changing highlights
   */
  private triggerTransition(): void {
    this.playerState.isTransitioning = true;
    
    // Emit transitioning state
    if (this.playerState.currentHighlight) {
      this.viewChange.emit({
        ...this.buildViewState(),
        isTransitioning: true
      });
    }
    
    // Clear transition after animation
    setTimeout(() => {
      this.playerState.isTransitioning = false;
      if (this.playerState.currentHighlight) {
        this.viewChange.emit({
          ...this.buildViewState(),
          isTransitioning: false
        });
      }
    }, 300);
  }

  /**
   * Build the current view state object
   */
  private buildViewState(): HighlightViewState {
    const highlight = this.playerState.currentHighlight;
    if (!highlight) {
      return {
        view: 'live-score',
        highlightType: '',
        highlightData: null,
        showOverlay: false,
        overlayType: null
      };
    }

    let view: 'live-score' | 'live-match-summary' | 'final-match-summary' | 'intro' = 'live-score';
    let overlayType: 'four' | 'six' | 'wicket' | 'fifty' | 'hundred' | null = null;

    switch (highlight.type) {
      case 'matchIntro':
      case 'inningsIntro':
      case 'chaseSetup':
        view = 'intro';
        break;
      case 'four':
        overlayType = 'four';
        break;
      case 'six':
        overlayType = 'six';
        break;
      case 'wicket':
        overlayType = 'wicket';
        break;
      case 'fifty':
        overlayType = 'fifty';
        break;
      case 'hundred':
        overlayType = 'hundred';
        break;
      case 'overSummary':
      case 'inningsSummary':
        view = 'live-match-summary';
        break;
      case 'matchSummary':
        view = 'final-match-summary';
        break;
    }

    const scoreAfter = highlight.data?.scoreAfter;
    const importance = (highlight as any).importance;

    return {
      view,
      highlightType: highlight.type,
      highlightData: highlight.data,
      showOverlay: false,
      overlayType,
      importance: importance ? {
        score: importance.score,
        level: importance.level,
        factors: importance.factors || []
      } : undefined,
      scoreState: scoreAfter ? {
        runs: scoreAfter.runs || 0,
        wickets: scoreAfter.wickets || 0,
        overs: scoreAfter.overs || '0.0',
        strikerName: scoreAfter.strikerName,
        strikerImage: scoreAfter.strikerImage,
        strikerRuns: scoreAfter.strikerRuns,
        strikerBalls: scoreAfter.strikerBalls,
        strikerFours: scoreAfter.strikerFours,
        strikerSixes: scoreAfter.strikerSixes,
        nonStrikerName: scoreAfter.nonStrikerName,
        nonStrikerImage: scoreAfter.nonStrikerImage,
        nonStrikerRuns: scoreAfter.nonStrikerRuns,
        nonStrikerBalls: scoreAfter.nonStrikerBalls,
        nonStrikerFours: scoreAfter.nonStrikerFours,
        nonStrikerSixes: scoreAfter.nonStrikerSixes,
        bowlerName: scoreAfter.bowlerName,
        bowlerImage: scoreAfter.bowlerImage,
        bowlerOvers: scoreAfter.bowlerOvers,
        bowlerRuns: scoreAfter.bowlerRuns,
        bowlerWickets: scoreAfter.bowlerWickets,
        bowlerFigures: scoreAfter.bowlerFigures,
        currentOverBalls: scoreAfter.currentOverBalls,
        currentOverNumber: scoreAfter.currentOverNumber
      } : undefined
    };
  }

  onClose() {
    this.pause();
    this.close.emit();
  }
}
