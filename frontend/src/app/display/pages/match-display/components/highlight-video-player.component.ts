import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightService, HighlightVideo, HighlightData } from '../../../services/highlight.service';
import { interval, Subscription } from 'rxjs';

interface PlayerState {
  isPlaying: boolean;
  currentIndex: number;
  currentHighlight: HighlightData | null;
  progress: number;
  elapsedTime: number;
  totalTime: number;
}

@Component({
  selector: 'app-highlight-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './highlight-video-player.component.html'
})
export class HighlightVideoPlayerComponent implements OnInit, OnDestroy {
  @Input() matchId: string = '';
  @Input() inningsNumber: number | null = null;
  @Input() autoPlay: boolean = false;
  @Output() close = new EventEmitter<void>();

  highlightVideo: HighlightVideo | null = null;
  loading = true;
  error = '';

  playerState: PlayerState = {
    isPlaying: false,
    currentIndex: 0,
    currentHighlight: null,
    progress: 0,
    elapsedTime: 0,
    totalTime: 0
  };

  private progressSubscription: Subscription | null = null;
  private highlightTimer: any = null;
  private currentHighlightElapsed = 0;
  private readonly PROGRESS_INTERVAL = 50; // Update progress every 50ms

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
        
        if (data.highlights.length > 0) {
          this.playerState.currentHighlight = data.highlights[0];
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
      // Add current highlight's elapsed time to total
      this.playerState.elapsedTime += this.currentHighlightElapsed;
      this.playerState.currentIndex++;
      this.playerState.currentHighlight = this.highlightVideo.highlights[this.playerState.currentIndex];
      this.currentHighlightElapsed = 0;
      
      // Resume playing if was playing
      this.play();
    }
  }

  skipBackward() {
    if (!this.highlightVideo) return;
    
    this.pause();
    
    if (this.playerState.currentIndex > 0) {
      // Subtract previous highlight's duration from elapsed
      const prevHighlight = this.highlightVideo.highlights[this.playerState.currentIndex - 1];
      this.playerState.elapsedTime = Math.max(0, this.playerState.elapsedTime - prevHighlight.duration);
      this.playerState.currentIndex--;
      this.playerState.currentHighlight = this.highlightVideo.highlights[this.playerState.currentIndex];
      this.currentHighlightElapsed = 0;
      
      this.play();
    }
  }

  goToHighlight(index: number) {
    if (!this.highlightVideo || index < 0 || index >= this.highlightVideo.highlights.length) return;
    
    this.pause();
    
    // Calculate elapsed time for this position
    let elapsed = 0;
    for (let i = 0; i < index; i++) {
      elapsed += this.highlightVideo.highlights[i].duration;
    }
    
    this.playerState.currentIndex = index;
    this.playerState.currentHighlight = this.highlightVideo.highlights[index];
    this.playerState.elapsedTime = elapsed;
    this.currentHighlightElapsed = 0;
    
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
    
    // Schedule next highlight
    const remainingTime = highlight.duration - this.currentHighlightElapsed;
    
    this.highlightTimer = setTimeout(() => {
      // Add current highlight's full duration to elapsed
      this.playerState.elapsedTime += highlight.duration;
      this.currentHighlightElapsed = 0;
      
      // Move to next highlight
      if (this.playerState.currentIndex < this.highlightVideo!.highlights.length - 1) {
        this.playerState.currentIndex++;
        this.playerState.currentHighlight = this.highlightVideo!.highlights[this.playerState.currentIndex];
        this.playCurrentHighlight();
      } else {
        // End of highlights
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
      'four': 'FOUR!',
      'six': 'SIX!',
      'wicket': 'WICKET!',
      'fifty': 'FIFTY!',
      'hundred': 'CENTURY!',
      'overSummary': 'Match Summary',
      'inningsSummary': 'Innings Summary',
      'matchSummary': 'Match Summary'
    };
    return labels[type] || type;
  }

  getHighlightTypeColor(type: string): string {
    const colors: Record<string, string> = {
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

  getImageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return path; // Relative path will be resolved by the server
  }

  onClose() {
    this.pause();
    this.close.emit();
  }

  getHighlightPosition(index: number): number {
    if (!this.highlightVideo || this.highlightVideo.totalDuration === 0) return 0;
    
    let elapsed = 0;
    for (let i = 0; i < index; i++) {
      elapsed += this.highlightVideo.highlights[i].duration;
    }
    // Position at the start of this highlight
    return (elapsed / this.highlightVideo.totalDuration) * 100;
  }
}
