import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SquadPlayer {
  name: string;
  image: string | null;
  role: string;
  battingOrder: number;
}

@Component({
  selector: 'app-starting-xi-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex items-center justify-center min-h-0 relative overflow-hidden">
      
      <!-- Vignette overlay for focus -->
      <div class="absolute inset-0 pointer-events-none z-10"
           style="background: radial-gradient(ellipse at center, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%);">
      </div>
      
      <!-- Main Content -->
      <div class="relative z-20 w-full max-w-7xl mx-auto px-6 py-4">
        
        <!-- Header with Team Flag and Name -->
        <div class="flex items-center justify-center gap-6 mb-8 team-entry" [class.animate-team]="animationStarted">
          <div class="relative">
            <div class="absolute inset-0 bg-teal-500/30 rounded-xl blur-xl scale-110"></div>
            <div class="relative w-28 h-24 md:w-36 md:h-28 lg:w-44 lg:h-36 rounded-xl overflow-hidden border-2 border-teal-400/50 shadow-xl">
              <img *ngIf="teamFlag" [src]="teamFlag" class="w-full h-full object-cover" [alt]="teamCode">
              <div *ngIf="!teamFlag" class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                <span class="text-3xl font-bold text-white/60">{{ teamCode }}</span>
              </div>
            </div>
          </div>
          <div class="text-center">
            <div class="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-wider mb-2"
                 style="text-shadow: 0 4px 20px rgba(20,184,166,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ teamCode }}
            </div>
            <div class="text-2xl md:text-3xl lg:text-4xl font-bold text-teal-400 tracking-wide"
                 style="text-shadow: 0 2px 10px rgba(20,184,166,0.3);">
              STARTING XI
            </div>
          </div>
        </div>
        
        <!-- No Players Message -->
        <div *ngIf="players.length === 0" class="text-center py-12 info-card" [class.animate-info-card]="animationStarted">
          <p class="text-2xl text-white/60">Playing XI not yet announced</p>
          <p class="text-sm text-white/40 mt-2">Squad selection pending</p>
        </div>
        
        <!-- Players Grid - Two Rows (only when players exist) -->
        <div *ngIf="players.length > 0" class="space-y-5 info-card" [class.animate-info-card]="animationStarted">
          
          <!-- Top Row (5 players) -->
          <div class="flex justify-center gap-4 md:gap-6 lg:gap-8">
            <div *ngFor="let player of topRowPlayers; let i = index" 
                 class="flex flex-col items-center player-card"
                 [style.animation-delay.ms]="i * 80">
              <!-- Player Card -->
              <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-white/10 hover:bg-white/10 transition-all shadow-xl relative">
                <!-- Batting Order Badge -->
                <div class="absolute -top-2 -left-2 w-7 h-7 md:w-8 md:h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {{ player.battingOrder }}
                </div>
                <!-- Player Image -->
                <div class="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-3 border-white/20 mb-3 bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner">
                  <img *ngIf="getPlayerImageUrl(player.image)" [src]="getPlayerImageUrl(player.image)" class="w-full h-full object-cover" [alt]="player.name">
                  <div *ngIf="!getPlayerImageUrl(player.image)" class="w-full h-full flex items-center justify-center">
                    <span class="text-3xl md:text-4xl text-white/40">👤</span>
                  </div>
                </div>
                <!-- Player Name & Role -->
                <div class="text-center">
                  <div class="text-sm md:text-base lg:text-lg font-semibold text-white truncate max-w-24 md:max-w-28 lg:max-w-32"
                       [title]="player.name">
                    {{ getShortName(player.name) }}
                  </div>
                  <div class="text-xs md:text-sm text-teal-400 font-medium">{{ formatRole(player.role) }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Bottom Row (6 players) -->
          <div class="flex justify-center gap-4 md:gap-6 lg:gap-8">
            <div *ngFor="let player of bottomRowPlayers; let i = index" 
                 class="flex flex-col items-center player-card"
                 [style.animation-delay.ms]="(i + 5) * 80">
              <!-- Player Card -->
              <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-white/10 hover:bg-white/10 transition-all shadow-xl relative">
                <!-- Batting Order Badge -->
                <div class="absolute -top-2 -left-2 w-7 h-7 md:w-8 md:h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {{ player.battingOrder }}
                </div>
                <!-- Player Image -->
                <div class="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-3 border-white/20 mb-3 bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner">
                  <img *ngIf="getPlayerImageUrl(player.image)" [src]="getPlayerImageUrl(player.image)" class="w-full h-full object-cover" [alt]="player.name">
                  <div *ngIf="!getPlayerImageUrl(player.image)" class="w-full h-full flex items-center justify-center">
                    <span class="text-3xl md:text-4xl text-white/40">👤</span>
                  </div>
                </div>
                <!-- Player Name & Role -->
                <div class="text-center">
                  <div class="text-sm md:text-base lg:text-lg font-semibold text-white truncate max-w-24 md:max-w-28 lg:max-w-32"
                       [title]="player.name">
                    {{ getShortName(player.name) }}
                  </div>
                  <div class="text-xs md:text-sm text-teal-400 font-medium">{{ formatRole(player.role) }}</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Format Badge -->
        <div class="text-center mt-6 format-badge" [class.animate-format]="animationStarted">
          <span class="inline-block px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-lg font-medium border border-white/10">
            {{ format }} Match
          </span>
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    .team-entry { opacity: 0; transform: scale(0.95) translateY(20px); }
    .animate-team { animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
    
    @keyframes scaleIn {
      0% { opacity: 0; transform: scale(0.9) translateY(30px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    .info-card { opacity: 0; transform: translateY(40px); }
    .animate-info-card { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards; }
    
    @keyframes slideUpFade {
      0% { opacity: 0; transform: translateY(40px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .format-badge { opacity: 0; transform: translateY(20px); }
    .animate-format { animation: fadeInUp 0.5s ease-out 1.2s forwards; }
    
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .player-card {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
      animation: playerFadeIn 0.5s ease-out forwards;
    }
    
    @keyframes playerFadeIn {
      0% { opacity: 0; transform: translateY(30px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .animate-info-card .player-card {
      animation-play-state: running;
    }
  `]
})
export class StartingXiViewComponent implements OnInit, OnChanges {
  @Input() teamName: string = '';
  @Input() teamCode: string = '';
  @Input() teamFlag: string | null = null;
  @Input() players: SquadPlayer[] = [];
  @Input() format: string = 'T20';
  
  animationStarted = false;
  
  // Helper to split players into two rows (5 top + 6 bottom)
  get topRowPlayers(): SquadPlayer[] {
    const sorted = [...this.players].sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
    return sorted.slice(0, 5);
  }
  
  get bottomRowPlayers(): SquadPlayer[] {
    const sorted = [...this.players].sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
    return sorted.slice(5, 11);
  }
  
  ngOnInit(): void {
    console.log('[StartingXI] ngOnInit - teamCode:', this.teamCode, 'players:', this.players.length);
    // Start animations after a brief delay
    setTimeout(() => {
      this.animationStarted = true;
    }, 100);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Only log on actual changes, don't reset animation state constantly
    if (changes['teamCode']?.currentValue !== changes['teamCode']?.previousValue ||
        changes['players']?.currentValue?.length !== changes['players']?.previousValue?.length) {
      console.log('[StartingXI] ngOnChanges - teamCode:', this.teamCode, 'players count:', this.players?.length);
      
      // Only reset animation if teamCode actually changed
      if (changes['teamCode']?.currentValue !== changes['teamCode']?.previousValue && 
          changes['teamCode']?.previousValue !== undefined) {
        this.animationStarted = false;
        setTimeout(() => {
          this.animationStarted = true;
        }, 50);
      }
    }
  }
  
  // Helper to transform headshotPath to full Cloudinary URL
  getPlayerImageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://img1.hscicdn.com/image/upload${path}`;
  }
  
  // Get short player name (last name or abbreviated)
  getShortName(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return fullName;
    // Return last name, or first initial + last name if name is too short
    const lastName = parts[parts.length - 1];
    if (lastName.length <= 3 && parts.length > 1) {
      return `${parts[0].charAt(0)}. ${lastName}`;
    }
    return lastName;
  }
  
  // Format role display
  formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'batsman': 'Batsman',
      'bowler': 'Bowler',
      'all-rounder': 'All-Rounder',
      'wicket-keeper': 'WK-Batsman'
    };
    return roleMap[role] || role || 'Player';
  }
}
