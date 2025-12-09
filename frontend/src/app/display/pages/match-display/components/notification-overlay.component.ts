import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show">
      
      <!-- ==================== COMPACT BOUNDARY NOTIFICATIONS (Right Side) ==================== -->
      <!-- FOUR - Compact Right Side -->
      <div *ngIf="type === 'four'" 
           class="fixed top-28 right-6 z-40 animate-slideInRight"
           (click)="onDismiss()">
        <div class="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl shadow-2xl border-2 border-green-400/50 overflow-hidden"
             style="box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);">
          <!-- Header -->
          <div class="bg-green-500 px-6 py-3 flex items-center gap-3">
            <span class="text-3xl">🏏</span>
            <span class="text-2xl font-black text-white uppercase tracking-wider">FOUR!</span>
          </div>
          <!-- Content -->
          <div class="px-6 py-4 flex items-center gap-4">
            <img *ngIf="data?.batsmanImage" 
                 [src]="data?.batsmanImage"
                 class="w-20 h-20 rounded-full object-cover border-3 border-green-400 shadow-lg">
            <div *ngIf="!data?.batsmanImage" 
                 class="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center border-3 border-green-400">
              <span class="text-3xl">🏏</span>
            </div>
            <div>
              <div class="text-xl font-bold text-white">{{ data?.batsmanName }}</div>
              <div class="text-green-300 text-lg font-semibold">
                {{ data?.batsmanRuns }} <span class="text-green-400/70">({{ data?.batsmanBalls }})</span>
              </div>
              <div class="text-sm text-gray-400">SR: {{ data?.strikeRate || calculateSR(data?.batsmanRuns, data?.batsmanBalls) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SIX - Compact Right Side -->
      <div *ngIf="type === 'six'" 
           class="fixed top-28 right-6 z-40 animate-slideInRight"
           (click)="onDismiss()">
        <div class="bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl shadow-2xl border-2 border-purple-400/50 overflow-hidden"
             style="box-shadow: 0 0 50px rgba(168, 85, 247, 0.6);">
          <!-- Header -->
          <div class="bg-gradient-to-r from-purple-500 to-yellow-500 px-6 py-3 flex items-center gap-3">
            <span class="text-3xl">🔥</span>
            <span class="text-2xl font-black text-white uppercase tracking-wider">SIX!</span>
            <span class="text-3xl">🔥</span>
          </div>
          <!-- Content -->
          <div class="px-6 py-4 flex items-center gap-4">
            <img *ngIf="data?.batsmanImage" 
                 [src]="data?.batsmanImage"
                 class="w-20 h-20 rounded-full object-cover border-3 border-yellow-400 shadow-lg">
            <div *ngIf="!data?.batsmanImage" 
                 class="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center border-3 border-yellow-400">
              <span class="text-3xl">🏏</span>
            </div>
            <div>
              <div class="text-xl font-bold text-white">{{ data?.batsmanName }}</div>
              <div class="text-yellow-300 text-lg font-semibold">
                {{ data?.batsmanRuns }} <span class="text-yellow-400/70">({{ data?.batsmanBalls }})</span>
              </div>
              <div class="text-sm text-gray-400">SR: {{ data?.strikeRate || calculateSR(data?.batsmanRuns, data?.batsmanBalls) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== WICKET OVERLAY (Clean Minimal Focus - Option D) ==================== -->
      <div *ngIf="type === 'wicket'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        
        <!-- Full screen subtle backdrop -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80 backdrop-blur-sm"></div>
        
        <!-- Red vignette effect -->
        <div class="absolute inset-0 pointer-events-none"
             style="background: radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(127, 29, 29, 0.4) 100%);"></div>
        
        <!-- Main Card -->
        <div class="relative animate-wicketCardIn">
          <!-- Outer glow -->
          <div class="absolute -inset-4 bg-red-500/20 rounded-[3rem] blur-2xl"></div>
          
          <!-- Card Container -->
          <div class="relative bg-gradient-to-b from-black/70 via-black/80 to-black/90 backdrop-blur-xl rounded-[2.5rem] px-12 py-10 md:px-16 md:py-12 border border-red-500/30 shadow-2xl overflow-hidden min-w-[400px]"
               style="box-shadow: 0 25px 80px -20px rgba(0,0,0,0.8), 0 0 60px rgba(239, 68, 68, 0.2);">
            
            <!-- Top red accent line -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            
            <!-- Batsman Photo (Hero) -->
            <div class="flex justify-center mb-6">
              <div class="relative">
                <!-- Pulsing red ring -->
                <div class="absolute -inset-2 bg-red-500/40 rounded-full blur-md animate-pulse"></div>
                <!-- Photo container -->
                <div class="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-red-500 shadow-2xl"
                     style="box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);">
                  <img *ngIf="getDismissedImage()" 
                       [src]="getDismissedImage()" 
                       class="w-full h-full object-cover">
                  <div *ngIf="!getDismissedImage()" 
                       class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <span class="text-5xl text-gray-500">🏏</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Player Name -->
            <div class="text-center mb-3">
              <h2 class="text-3xl md:text-4xl font-bold text-white tracking-wide">
                {{ data?.dismissedName }}
              </h2>
            </div>
            
            <!-- OUT Badge -->
            <div class="flex justify-center mb-5">
              <div class="bg-red-600 px-6 py-2 rounded-full">
                <span class="text-xl md:text-2xl font-black text-white uppercase tracking-widest">
                  {{ getDismissalTypeLabel() }}
                </span>
              </div>
            </div>
            
            <!-- Score Display -->
            <div class="text-center mb-4">
              <div class="inline-flex items-baseline gap-1">
                <span class="text-6xl md:text-7xl font-black text-white"
                      style="text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                  {{ data?.dismissedRuns }}
                </span>
                <span class="text-2xl md:text-3xl text-gray-400 font-medium">
                  ({{ data?.dismissedBalls }})
                </span>
              </div>
            </div>
            
            <!-- Stats Row -->
            <div class="flex justify-center gap-6 mb-6">
              <div class="flex items-center gap-2">
                <span class="text-green-400 text-lg font-semibold">{{ data?.dismissedFours || 0 }}</span>
                <span class="text-gray-500 text-sm">× 4s</span>
              </div>
              <div class="w-px h-5 bg-gray-600"></div>
              <div class="flex items-center gap-2">
                <span class="text-purple-400 text-lg font-semibold">{{ data?.dismissedSixes || 0 }}</span>
                <span class="text-gray-500 text-sm">× 6s</span>
              </div>
              <div class="w-px h-5 bg-gray-600"></div>
              <div class="flex items-center gap-2">
                <span class="text-blue-400 text-lg font-semibold">{{ getStrikeRate() }}</span>
                <span class="text-gray-500 text-sm">SR</span>
              </div>
            </div>
            
            <!-- Divider -->
            <div class="w-24 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent mx-auto mb-5"></div>
            
            <!-- Dismissal Description -->
            <div class="text-center mb-4">
              <span class="text-lg md:text-xl text-gray-300 italic">
                {{ data?.dismissalDescription || getDismissalDescription() }}
              </span>
            </div>
            
            <!-- Bowler Info -->
            <div *ngIf="data?.bowlerName" class="flex justify-center items-center gap-3 text-gray-400">
              <div class="w-8 h-8 rounded-full overflow-hidden border border-gray-600 flex-shrink-0">
                <img *ngIf="getBowlerImage()" [src]="getBowlerImage()" class="w-full h-full object-cover">
                <div *ngIf="!getBowlerImage()" class="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span class="text-xs">🎯</span>
                </div>
              </div>
              <span class="text-sm">{{ data?.bowlerName }}</span>
              <span *ngIf="data?.bowlerFigures" class="text-green-400 text-sm font-medium">{{ data?.bowlerFigures }}</span>
            </div>
            
          </div>
        </div>
      </div>

      <!-- ==================== MILESTONES (50, 100) - Centered but smaller ==================== -->
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
        <div class="relative text-center w-full px-8">
          <!-- Decision pending state -->
          <div *ngIf="!thirdUmpireDecision">
            <div class="text-4xl font-bold text-white mb-8 tracking-widest">3RD UMPIRE REVIEW</div>
            <div class="flex items-center justify-center gap-12">
              <div class="text-[8rem] font-black uppercase tracking-wider animate-third-umpire-notout-highlight px-8 py-4 rounded-3xl">
                NOT OUT
              </div>
              <div class="h-40 w-1 bg-gray-600"></div>
              <div class="text-[8rem] font-black uppercase tracking-wider animate-third-umpire-out-highlight px-8 py-4 rounded-3xl">
                OUT
              </div>
            </div>
            <div class="mt-10 flex items-center justify-center gap-3">
              <div class="w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
              <span class="text-2xl text-yellow-400 font-semibold">Decision Pending...</span>
              <div class="w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
            </div>
          </div>
          
          <!-- Decision made -->
          <div *ngIf="thirdUmpireDecision" (click)="onDismiss()">
            <div class="text-[12rem] font-black uppercase tracking-wider leading-none"
                 [style.color]="thirdUmpireDecision === 'out' ? '#ef4444' : '#22c55e'">
              {{ thirdUmpireDecision === 'out' ? 'OUT' : 'NOT OUT' }}
            </div>
            <div class="text-3xl font-bold text-white mt-4 tracking-widest">3RD UMPIRE DECISION</div>
          </div>
        </div>
      </div>

      <!-- ==================== CUSTOM MESSAGE ==================== -->
      <div *ngIf="type === 'custom-message'" 
           class="fixed inset-0 z-50 flex items-center justify-center"
           (click)="onDismiss()">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-md rounded-3xl px-12 py-10 border border-gray-600/50 shadow-2xl max-w-4xl">
          <div class="text-4xl font-bold text-white leading-tight text-center">{{ customMessage }}</div>
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    @keyframes slideInRight {
      0% { 
        opacity: 0; 
        transform: translateX(100px); 
      }
      100% { 
        opacity: 1; 
        transform: translateX(0); 
      }
    }
    .animate-slideInRight {
      animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes wicketCardIn {
      0% { 
        opacity: 0; 
        transform: scale(0.8) translateY(30px);
      }
      100% { 
        opacity: 1; 
        transform: scale(1) translateY(0);
      }
    }
    .animate-wicketCardIn {
      animation: wicketCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes third-umpire-notout-highlight {
      0%, 50% { 
        color: #22c55e;
        background: rgba(34, 197, 94, 0.3);
        border: 4px solid #22c55e;
        transform: scale(1.05);
      }
      50.01%, 100% { 
        color: #4b5563;
        background: transparent;
        border: 4px solid transparent;
        transform: scale(1);
      }
    }
    @keyframes third-umpire-out-highlight {
      0%, 50% { 
        color: #4b5563;
        background: transparent;
        border: 4px solid transparent;
        transform: scale(1);
      }
      50.01%, 100% { 
        color: #ef4444;
        background: rgba(239, 68, 68, 0.3);
        border: 4px solid #ef4444;
        transform: scale(1.05);
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

  getDismissalTypeLabel(): string {
    const type = this.data?.dismissalType;
    const labels: Record<string, string> = {
      'bowled': 'BOWLED!',
      'caught': 'CAUGHT!',
      'lbw': 'LBW!',
      'run-out': 'RUN OUT!',
      'stumped': 'STUMPED!',
      'hit-wicket': 'HIT WICKET!'
    };
    return labels[type] || 'OUT!';
  }

  getDismissalDescription(): string {
    const type = this.data?.dismissalType;
    const bowler = this.data?.bowlerName;
    const fielder = this.data?.fielderName;
    
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

  getPlayerName(): string {
    return this.data?.playerName || this.data?.batsmanName || 'Batsman';
  }

  getPlayerImage(): string | null {
    const path = this.data?.playerImage || this.data?.batsmanImage;
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload/f_auto,t_h_100_2x/lsci${path}`;
  }

  getPlayerRuns(): number {
    return this.data?.runs || this.data?.batsmanRuns || 0;
  }

  getPlayerBalls(): number {
    return this.data?.balls || this.data?.batsmanBalls || 0;
  }
}
