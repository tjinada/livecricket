import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show">
      
      <!-- ==================== FOUR - Full Screen Overlay ==================== -->
      <div *ngIf="type === 'four'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        <!-- Dark backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        
        <!-- Content -->
        <div class="text-center relative z-10">
          <div class="absolute inset-0 bg-gradient-radial from-green-600/30 via-green-900/20 to-transparent"></div>
          <div class="relative">
            <div class="text-[16rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 via-green-500 to-emerald-600 leading-none drop-shadow-2xl" style="text-shadow: 0 0 60px rgba(34, 197, 94, 0.7), 0 0 100px rgba(34, 197, 94, 0.4);">
              4
            </div>
            <div class="text-5xl font-black uppercase tracking-[0.2em] text-white mt-[-1rem]" style="text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);">
              BOUNDARY!
            </div>
            <div class="mt-6 bg-black/60 backdrop-blur-md rounded-xl px-6 py-3 inline-flex items-center gap-5 border border-green-500/30">
              <img 
                *ngIf="getBatsmanImage()" 
                [src]="getBatsmanImage()"
                class="w-28 h-28 rounded-full object-cover border-4 border-green-500 shadow-2xl"
              >
              <div *ngIf="!getBatsmanImage()" class="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-green-500">
                <span class="text-4xl">🏏</span>
              </div>
              <div>
                <div class="text-3xl font-bold text-white">{{ data?.batsmanName }}</div>
                <div class="text-xl text-green-400 mt-1">
                  {{ data?.batsmanRuns }} ({{ data?.batsmanBalls }})
                </div>
              </div>
            </div>
            <div class="mt-3 text-xl text-gray-300">
              {{ data?.totalScore || data?.scoreAfter?.runs || 0 }}/{{ data?.totalWickets || data?.scoreAfter?.wickets || 0 }}
            </div>
          </div>
          <!-- Pinging circle animation -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-4 border-green-500/20 rounded-full animate-ping"></div>
        </div>
        
        <!-- Dismiss hint -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-sm cursor-pointer z-20">
          Click anywhere to dismiss
        </div>
      </div>

      <!-- ==================== SIX - Full Screen Overlay ==================== -->
      <div *ngIf="type === 'six'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        <!-- Dark backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        
        <!-- Content -->
        <div class="text-center animate-pulse relative z-10">
          <div class="absolute inset-0 bg-gradient-radial from-purple-600/40 via-purple-900/20 to-transparent"></div>
          <div class="relative">
            <div class="text-[20rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-orange-600 leading-none drop-shadow-2xl animate-bounce" style="text-shadow: 0 0 80px rgba(234, 179, 8, 0.8), 0 0 120px rgba(234, 179, 8, 0.5);">
              6
            </div>
            <div class="text-6xl font-black uppercase tracking-[0.3em] text-white mt-[-2rem]" style="text-shadow: 0 0 40px rgba(168, 85, 247, 0.8);">
              MAXIMUM!
            </div>
            <div class="mt-8 bg-black/60 backdrop-blur-md rounded-2xl px-8 py-4 inline-flex items-center gap-6 border border-yellow-500/30">
              <img 
                *ngIf="getBatsmanImage()" 
                [src]="getBatsmanImage()"
                class="w-32 h-32 rounded-full object-cover border-4 border-yellow-500 shadow-2xl"
              >
              <div *ngIf="!getBatsmanImage()" class="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-yellow-500">
                <span class="text-5xl">🏏</span>
              </div>
              <div>
                <div class="text-4xl font-bold text-white">{{ data?.batsmanName }}</div>
                <div class="text-2xl text-yellow-400 mt-2">
                  {{ data?.batsmanRuns }} ({{ data?.batsmanBalls }})
                </div>
              </div>
            </div>
            <div class="mt-4 text-2xl text-gray-300">
              {{ data?.totalScore || data?.scoreAfter?.runs || 0 }}/{{ data?.totalWickets || data?.scoreAfter?.wickets || 0 }}
            </div>
          </div>
          <!-- Double pinging circle animations -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-4 border-yellow-500/20 rounded-full animate-ping"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-purple-500/30 rounded-full animate-ping" style="animation-delay: 0.2s;"></div>
        </div>
        
        <!-- Dismiss hint -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-sm cursor-pointer z-20">
          Click anywhere to dismiss
        </div>
      </div>

      <!-- ==================== WICKET - Full Screen Overlay ==================== -->
      <div *ngIf="type === 'wicket'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        <!-- Dark backdrop -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        
        <!-- Red pulse overlay -->
        <div class="absolute inset-0 bg-red-600/10 animate-pulse"></div>
        
        <!-- Content -->
        <div class="text-center relative z-10">
          <div class="absolute inset-0 bg-gradient-radial from-red-900/60 via-red-950/40 to-transparent"></div>
          <div class="relative">
            <div class="text-[10rem] font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-600 to-red-800 leading-none" style="text-shadow: 0 0 60px rgba(239, 68, 68, 0.8), 0 0 100px rgba(239, 68, 68, 0.5);">
              WICKET!
            </div>
            <div class="mt-4">
              <span class="bg-red-600 text-white text-4xl font-black px-8 py-2 rounded-lg uppercase tracking-widest">
                OUT
              </span>
            </div>
            <div class="mt-8 bg-black/70 backdrop-blur-md rounded-2xl px-12 py-8 inline-flex items-center gap-8 border border-red-500/40">
              <img 
                *ngIf="getDismissedImage()" 
                [src]="getDismissedImage()"
                class="w-36 h-36 rounded-full object-cover border-4 border-red-500 shadow-2xl grayscale"
              >
              <div *ngIf="!getDismissedImage()" class="w-36 h-36 rounded-full bg-gray-700 flex items-center justify-center border-4 border-red-500">
                <span class="text-6xl">🏏</span>
              </div>
              <div>
                <div class="text-5xl font-bold text-white">{{ data?.dismissedName }}</div>
                <div class="text-3xl text-red-400 mt-3">
                  {{ data?.dismissedRuns }} ({{ data?.dismissedBalls }})
                </div>
                <div class="mt-4 text-2xl text-gray-300">
                  {{ getDismissalDescription() }}
                </div>
              </div>
            </div>
            <div class="mt-6 text-3xl font-bold">
              <span class="text-white">{{ data?.totalScore || data?.scoreAfter?.runs || 0 }}</span>
              <span class="text-red-500">/{{ data?.totalWickets || data?.scoreAfter?.wickets || 0 }}</span>
            </div>
          </div>
        </div>
        
        <!-- Dismiss hint -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-sm cursor-pointer z-20">
          Click anywhere to dismiss
        </div>
      </div>

      <!-- ==================== MILESTONES (50, 100) ==================== -->
      <!-- FIFTY Overlay -->
      <div *ngIf="type === 'fifty'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative text-center">
          <div class="text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 leading-none" 
               style="text-shadow: 0 0 80px rgba(234, 179, 8, 0.8);">
            50
          </div>
          <div class="text-5xl font-black uppercase tracking-[0.2em] text-white mt-[-1rem]">FIFTY!</div>
          <div class="mt-6 bg-black/60 backdrop-blur-md rounded-2xl px-8 py-5 inline-flex items-center gap-6 border border-yellow-500/40">
            <img *ngIf="getPlayerImage()" [src]="getPlayerImage()"
                 class="w-28 h-28 rounded-full object-cover border-4 border-yellow-500 shadow-2xl">
            <div *ngIf="!getPlayerImage()" class="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-yellow-500">
              <span class="text-5xl">⭐</span>
            </div>
            <div>
              <div class="text-3xl font-bold text-white">{{ getPlayerName() }}</div>
              <div class="text-2xl text-yellow-400 mt-2">{{ getPlayerRuns() }} ({{ getPlayerBalls() }})</div>
              <div class="mt-1 text-lg text-gray-300 flex gap-4">
                <span>4s: {{ data?.fours || 0 }}</span>
                <span>6s: {{ data?.sixes || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- HUNDRED Overlay -->
      <div *ngIf="type === 'hundred'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div class="relative text-center animate-pulse">
          <div class="text-[16rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 leading-none animate-bounce"
               style="text-shadow: 0 0 100px rgba(245, 158, 11, 0.9);">
            💯
          </div>
          <div class="text-6xl font-black uppercase tracking-[0.2em] text-white mt-[-1rem]">CENTURY!</div>
          <div class="mt-6 bg-black/70 backdrop-blur-md rounded-2xl px-10 py-6 inline-flex items-center gap-8 border border-amber-500/50">
            <img *ngIf="getPlayerImage()" [src]="getPlayerImage()"
                 class="w-32 h-32 rounded-full object-cover border-4 border-amber-500 shadow-2xl">
            <div *ngIf="!getPlayerImage()" class="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-amber-500">
              <span class="text-6xl">🏆</span>
            </div>
            <div>
              <div class="text-4xl font-bold text-white">{{ getPlayerName() }}</div>
              <div class="text-3xl text-amber-400 mt-2">{{ getPlayerRuns() }}* ({{ getPlayerBalls() }})</div>
              <div class="mt-2 text-xl text-gray-300 flex gap-5">
                <span>4s: {{ data?.fours || 0 }}</span>
                <span>6s: {{ data?.sixes || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== THIRD UMPIRE DECISION ==================== -->
      <div *ngIf="type === 'third-umpire'" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div class="relative text-center w-full px-8 z-10">
          <!-- Decision pending state -->
          <div *ngIf="!thirdUmpireDecision">
            <div class="text-5xl font-bold text-white mb-8 tracking-widest">3RD UMPIRE REVIEW</div>
            <div class="flex items-center justify-center gap-16">
              <div 
                class="text-[10rem] font-black uppercase tracking-wider animate-third-umpire-notout-highlight px-12 py-6 rounded-3xl transition-all"
                style="text-shadow: 0 0 60px rgba(34, 197, 94, 0.8), 0 0 120px rgba(34, 197, 94, 0.5);">
                NOT OUT
              </div>
              <div class="h-48 w-1 bg-gray-600"></div>
              <div 
                class="text-[10rem] font-black uppercase tracking-wider animate-third-umpire-out-highlight px-12 py-6 rounded-3xl transition-all"
                style="text-shadow: 0 0 60px rgba(239, 68, 68, 0.8), 0 0 120px rgba(239, 68, 68, 0.5);">
                OUT
              </div>
            </div>
            <div class="mt-12 flex items-center justify-center gap-3">
              <div class="w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
              <span class="text-3xl text-yellow-400 font-semibold">Decision Pending...</span>
              <div class="w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
            </div>
          </div>
          
          <!-- Decision made -->
          <div *ngIf="thirdUmpireDecision" (click)="onDismiss()">
            <div 
              class="text-[14rem] font-black uppercase tracking-wider leading-none"
              [style.color]="thirdUmpireDecision === 'out' ? '#ef4444' : '#22c55e'"
              [style.text-shadow]="thirdUmpireDecision === 'out' ? '0 0 80px rgba(239, 68, 68, 0.9), 0 0 150px rgba(239, 68, 68, 0.6)' : '0 0 80px rgba(34, 197, 94, 0.9), 0 0 150px rgba(34, 197, 94, 0.6)'">
              {{ thirdUmpireDecision === 'out' ? 'OUT' : 'NOT OUT' }}
            </div>
            <div class="text-4xl font-bold text-white mt-6 tracking-widest">3RD UMPIRE DECISION</div>
            <div *ngIf="thirdUmpireDecision === 'out' && data?.dismissedName" 
                 class="mt-8 bg-black/60 backdrop-blur-md rounded-2xl px-10 py-6 inline-flex items-center gap-6 border border-red-500/40">
              <img 
                *ngIf="getDismissedImage()" 
                [src]="getDismissedImage()"
                class="w-32 h-32 rounded-full object-cover border-4 border-red-500 shadow-2xl grayscale"
              >
              <div *ngIf="!getDismissedImage()" class="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-red-500">
                <span class="text-5xl">🏏</span>
              </div>
              <div>
                <div class="text-4xl font-bold text-white">{{ data?.dismissedName }}</div>
                <div *ngIf="data?.dismissedRuns !== undefined" class="text-2xl text-red-400 mt-2">
                  {{ data?.dismissedRuns }} ({{ data?.dismissedBalls }})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== CUSTOM MESSAGE ==================== -->
      <div *ngIf="type === 'custom-message'" 
           class="fixed top-24 left-1/2 -translate-x-1/2 z-50"
           (click)="onDismiss()">
        <div class="bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-md rounded-2xl px-12 py-8 border border-gray-600/50 shadow-2xl">
          <div class="text-5xl font-bold text-white leading-tight text-center">{{ customMessage }}</div>
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    @keyframes third-umpire-notout-highlight {
      0%, 50% { 
        color: #22c55e;
        background: rgba(34, 197, 94, 0.3);
        border: 4px solid #22c55e;
        transform: scale(1.05);
        text-shadow: 0 0 80px rgba(34, 197, 94, 1), 0 0 150px rgba(34, 197, 94, 0.8);
      }
      50.01%, 100% { 
        color: #4b5563;
        background: transparent;
        border: 4px solid transparent;
        transform: scale(1);
        text-shadow: none;
      }
    }
    @keyframes third-umpire-out-highlight {
      0%, 50% { 
        color: #4b5563;
        background: transparent;
        border: 4px solid transparent;
        transform: scale(1);
        text-shadow: none;
      }
      50.01%, 100% { 
        color: #ef4444;
        background: rgba(239, 68, 68, 0.3);
        border: 4px solid #ef4444;
        transform: scale(1.05);
        text-shadow: 0 0 80px rgba(239, 68, 68, 1), 0 0 150px rgba(239, 68, 68, 0.8);
      }
    }
    .animate-third-umpire-notout-highlight {
      animation: third-umpire-notout-highlight 1s ease-in-out infinite;
    }
    .animate-third-umpire-out-highlight {
      animation: third-umpire-out-highlight 1s ease-in-out infinite;
    }
  `]
})
export class NotificationOverlayComponent {
  @Input() show = false;
  @Input() type: 'six' | 'four' | 'wicket' | 'fifty' | 'hundred' | 'third-umpire' | 'custom-message' | null = null;
  @Input() data: any = null;
  @Input() thirdUmpireDecision: 'out' | 'not-out' | null = null;
  @Input() customMessage = '';
  
  @Output() dismiss = new EventEmitter<void>();

  onDismiss(): void {
    this.dismiss.emit();
  }

  // ============ Helper Methods for Image URLs ============

  getBatsmanImage(): string | null {
    const path = this.data?.batsmanImage;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${path}`;
  }

  getDismissedImage(): string | null {
    const path = this.data?.dismissedImage;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${path}`;
  }

  getBowlerImage(): string | null {
    const path = this.data?.bowlerImage;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${path}`;
  }

  getPlayerImage(): string | null {
    const path = this.data?.playerImage || this.data?.batsmanImage;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${path}`;
  }

  // ============ Helper Methods for Player Info ============

  getPlayerName(): string {
    return this.data?.playerName || this.data?.batsmanName || 'Batsman';
  }

  getPlayerRuns(): number {
    return this.data?.runs || this.data?.batsmanRuns || 0;
  }

  getPlayerBalls(): number {
    return this.data?.balls || this.data?.batsmanBalls || 0;
  }

  // ============ Helper Methods for Dismissal ============

  getDismissalDescription(): string {
    const type = this.data?.dismissalType;
    const bowler = this.data?.bowlerName;
    const fielder = this.data?.fielderName;
    
    if (this.data?.dismissalDescription) {
      return this.data.dismissalDescription;
    }
    
    switch(type) {
      case 'bowled': return `b ${bowler}`;
      case 'caught': return fielder ? `c ${fielder} b ${bowler}` : `c & b ${bowler}`;
      case 'lbw': return `lbw b ${bowler}`;
      case 'run-out': return fielder ? `run out (${fielder})` : 'run out';
      case 'stumped': return `st b ${bowler}`;
      case 'hit-wicket': return `hit wicket b ${bowler}`;
      default: return '';
    }
  }

  calculateSR(runs: number, balls: number): string {
    if (!balls || balls === 0) return '0.00';
    return ((runs / balls) * 100).toFixed(2);
  }

  getStrikeRate(): string {
    const runs = this.data?.dismissedRuns || 0;
    const balls = this.data?.dismissedBalls || 0;
    if (!balls || balls === 0) return '0.00';
    return ((runs / balls) * 100).toFixed(1);
  }
}
