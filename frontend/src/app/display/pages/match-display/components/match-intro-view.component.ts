import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Simple interface for lineup player data
interface LineupPlayer {
  name: string;
  image: string | null;
  role: string;
}

@Component({
  selector: 'app-match-intro-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex items-center justify-center min-h-0 relative overflow-hidden">
      
      <!-- Vignette overlay for focus -->
      <div class="absolute inset-0 pointer-events-none z-10"
           style="background: radial-gradient(ellipse at center, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%);">
      </div>
      
      <!-- ==================== MATCH INTRO (VS Display) ==================== -->
      <div *ngIf="introType === 'matchIntro'" class="relative z-20 text-center px-8">
        
        <!-- Teams Row -->
        <div class="flex items-center justify-center gap-12 md:gap-20 lg:gap-32 xl:gap-40 mb-12">
          
          <!-- Team 1 -->
          <div class="flex flex-col items-center team-entry team-1"
               [class.animate-team-1]="animationStarted">
            <div class="relative mb-6">
              <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-xl scale-110 opacity-50"></div>
              <div class="relative w-36 h-28 md:w-44 md:h-36 lg:w-52 lg:h-44 xl:w-60 xl:h-48 rounded-2xl overflow-hidden border-3 border-white/30 shadow-2xl flag-container">
                <img *ngIf="team1Flag" 
                     [src]="team1Flag" 
                     class="w-full h-full object-cover"
                     [alt]="team1Code">
                <div *ngIf="!team1Flag" 
                     class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <span class="text-4xl font-bold text-white/60">{{ team1Code }}</span>
                </div>
              </div>
            </div>
            <span class="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white tracking-wider team-code"
                  style="text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ team1Code }}
            </span>
          </div>
          
          <!-- VS Badge -->
          <div class="vs-badge" [class.animate-vs]="animationStarted">
            <span class="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white/90 tracking-widest"
                  style="text-shadow: 0 0 30px rgba(255,255,255,0.3), 0 4px 15px rgba(0,0,0,0.5);">
              VS
            </span>
          </div>
          
          <!-- Team 2 -->
          <div class="flex flex-col items-center team-entry team-2"
               [class.animate-team-2]="animationStarted">
            <div class="relative mb-6">
              <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-xl scale-110 opacity-50"></div>
              <div class="relative w-36 h-28 md:w-44 md:h-36 lg:w-52 lg:h-44 xl:w-60 xl:h-48 rounded-2xl overflow-hidden border-3 border-white/30 shadow-2xl flag-container">
                <img *ngIf="team2Flag" 
                     [src]="team2Flag" 
                     class="w-full h-full object-cover"
                     [alt]="team2Code">
                <div *ngIf="!team2Flag" 
                     class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <span class="text-4xl font-bold text-white/60">{{ team2Code }}</span>
                </div>
              </div>
            </div>
            <span class="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white tracking-wider team-code"
                  style="text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ team2Code }}
            </span>
          </div>
        </div>
        
        <!-- Match Info Card -->
        <div class="info-card" [class.animate-info-card]="animationStarted">
          <div class="relative bg-white/10 backdrop-blur-xl rounded-3xl px-14 py-8 md:px-20 md:py-10 lg:px-24 lg:py-12 inline-block border border-white/20 shadow-2xl overflow-hidden">
            <div class="absolute inset-0 rounded-3xl p-[1px] pointer-events-none"
                 style="background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%);"></div>
            <div class="absolute inset-0 rounded-3xl pointer-events-none"
                 style="box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.1);"></div>
            <div class="relative z-10">
              <div class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-wide">
                {{ format }} Match
              </div>
              <div *ngIf="venue" class="text-xl md:text-2xl lg:text-3xl text-gray-300 mb-2">{{ venue }}</div>
              <div *ngIf="tossWinner" class="text-lg md:text-xl lg:text-2xl text-gray-400 mt-5 pt-5 border-t border-white/10">
                <span class="text-white font-semibold">{{ tossWinnerCode }}</span> won toss, elected to 
                <span class="text-yellow-400 font-semibold">{{ tossDecision }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ==================== INNINGS INTRO (Clean Design) ==================== -->
      <div *ngIf="introType === 'inningsIntro'" class="relative z-20 text-center px-8 w-full">
        
        <!-- Unified Card with Flag -->
        <div class="team-entry team-1" [class.animate-team-1]="animationStarted">
          <div class="relative inline-block">
            <!-- Subtle outer glow -->
            <div class="absolute -inset-4 bg-white/5 rounded-[3rem] blur-2xl"></div>
            
            <!-- Main unified card -->
            <div class="relative bg-gradient-to-b from-black/40 via-black/50 to-black/60 backdrop-blur-xl rounded-[2.5rem] px-16 py-12 md:px-24 md:py-14 lg:px-32 lg:py-16 border border-white/10 shadow-2xl overflow-hidden"
                 style="box-shadow: 0 25px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);">
              
              <!-- Top shine -->
              <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              
              <!-- Flag Section -->
              <div class="mb-8">
                <div class="relative inline-block">
                  <!-- Flag glow -->
                  <div class="absolute -inset-3 bg-white/10 rounded-2xl blur-xl"></div>
                  <!-- Flag -->
                  <div class="relative w-48 h-36 md:w-64 md:h-48 lg:w-72 lg:h-56 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl"
                       style="box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);">
                    <img *ngIf="battingTeamFlag" [src]="battingTeamFlag" class="w-full h-full object-cover">
                    <div *ngIf="!battingTeamFlag" class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                      <span class="text-5xl font-black text-white/40">{{ battingTeamCode }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Team Code -->
              <div class="mb-6">
                <span class="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-widest"
                      style="text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                  {{ battingTeamCode }}
                </span>
              </div>
              
              <!-- Divider -->
              <div class="w-32 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto mb-6"></div>
              
              <!-- Action Text -->
              <div class="mb-4">
                <span class="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-wide"
                      style="text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                  {{ headline || 'BAT FIRST' }}
                </span>
              </div>
              
              <!-- Format Info -->
              <div class="flex items-center justify-center gap-3 text-xl md:text-2xl text-white/70">
                <span>{{ format }}</span>
                <span class="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                <span>{{ totalOvers }} Overs</span>
              </div>
              
            </div>
          </div>
        </div>
        
      </div>
      
      <!-- ==================== CHASE SETUP (Clean Design) ==================== -->
      <div *ngIf="introType === 'chaseSetup'" class="relative z-20 text-center px-8 w-full">
        
        <!-- Unified Card with Flag -->
        <div class="team-entry team-1" [class.animate-team-1]="animationStarted">
          <div class="relative inline-block">
            <!-- Amber outer glow for chase -->
            <div class="absolute -inset-4 bg-amber-500/10 rounded-[3rem] blur-2xl"></div>
            
            <!-- Main unified card -->
            <div class="relative bg-gradient-to-b from-black/40 via-black/50 to-black/60 backdrop-blur-xl rounded-[2.5rem] px-16 py-12 md:px-24 md:py-14 lg:px-32 lg:py-16 border border-amber-500/20 shadow-2xl overflow-hidden"
                 style="box-shadow: 0 25px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);">
              
              <!-- Top shine with amber tint -->
              <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"></div>
              
              <!-- Flag Section -->
              <div class="mb-8">
                <div class="relative inline-block">
                  <!-- Flag glow with amber tint -->
                  <div class="absolute -inset-3 bg-amber-500/15 rounded-2xl blur-xl"></div>
                  <!-- Flag -->
                  <div class="relative w-48 h-36 md:w-64 md:h-48 lg:w-72 lg:h-56 rounded-xl overflow-hidden border-2 border-amber-400/30 shadow-2xl"
                       style="box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);">
                    <img *ngIf="battingTeamFlag" [src]="battingTeamFlag" class="w-full h-full object-cover">
                    <div *ngIf="!battingTeamFlag" class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                      <span class="text-5xl font-black text-white/40">{{ battingTeamCode }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Team Code -->
              <div class="mb-6">
                <span class="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-widest"
                      style="text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                  {{ battingTeamCode }}
                </span>
              </div>
              
              <!-- Divider with amber -->
              <div class="w-32 h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto mb-6"></div>
              
              <!-- Target Text -->
              <div class="mb-3">
                <span class="text-5xl md:text-6xl lg:text-7xl font-black text-amber-400 tracking-wide"
                      style="text-shadow: 0 4px 20px rgba(251,191,36,0.4), 0 2px 10px rgba(0,0,0,0.5);">
                  {{ headline || 'TARGET: 0' }}
                </span>
              </div>
              
              <!-- Subheadline -->
              <div class="text-xl md:text-2xl lg:text-3xl text-white/80 mb-2">{{ subheadline }}</div>
              
              <!-- Narrative -->
              <div class="text-lg md:text-xl text-white/60">{{ narrative }}</div>
              
            </div>
          </div>
        </div>
        
      </div>
      
      <!-- ==================== TEAM LINEUP (Starting XI) ==================== -->
      <div *ngIf="introType === 'teamLineup'" class="relative z-20 w-full max-w-7xl mx-auto px-6 py-4">
        
        <!-- Header with Team Flag and Name -->
        <div class="flex items-center justify-center gap-6 mb-8 team-entry team-1" [class.animate-team-1]="animationStarted">
          <div class="relative">
            <div class="absolute inset-0 bg-teal-500/30 rounded-xl blur-xl scale-110"></div>
            <div class="relative w-24 h-20 md:w-28 md:h-24 rounded-xl overflow-hidden border-2 border-teal-400/50 shadow-xl">
              <img *ngIf="lineupTeamFlag" [src]="lineupTeamFlag" class="w-full h-full object-cover" [alt]="lineupTeamCode">
              <div *ngIf="!lineupTeamFlag" class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                <span class="text-xl font-bold text-white/60">{{ lineupTeamCode }}</span>
              </div>
            </div>
          </div>
          <div class="text-center">
            <div class="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-wider"
                 style="text-shadow: 0 4px 20px rgba(20,184,166,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ lineupHeadline || (lineupTeamName + ' - STARTING XI') }}
            </div>
          </div>
        </div>
        
        <!-- Players Grid - Two Rows -->
        <div class="space-y-4 info-card" [class.animate-info-card]="animationStarted">
          
          <!-- Top Row (5 players) -->
          <div class="flex justify-center gap-4 md:gap-6">
            <div *ngFor="let player of topRowPlayers; let i = index" 
                 class="flex flex-col items-center bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 hover:bg-white/10 transition-all"
                 [style.animation-delay.ms]="i * 100">
              <!-- Player Image -->
              <div class="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-white/20 mb-2 bg-gradient-to-br from-gray-700 to-gray-900">
                <img *ngIf="getPlayerImageUrl(player.image)" [src]="getPlayerImageUrl(player.image)" class="w-full h-full object-cover" [alt]="player.name">
                <div *ngIf="!getPlayerImageUrl(player.image)" class="w-full h-full flex items-center justify-center">
                  <span class="text-2xl md:text-3xl text-white/40">👤</span>
                </div>
              </div>
              <!-- Player Name & Role -->
              <div class="text-center">
                <div class="text-sm md:text-base lg:text-lg font-semibold text-white truncate max-w-24 md:max-w-28 lg:max-w-32"
                     [title]="player.name">
                  {{ player.name }}
                </div>
                <div class="text-xs md:text-sm text-gray-400">{{ player.role }}</div>
              </div>
            </div>
          </div>
          
          <!-- Bottom Row (6 players) -->
          <div class="flex justify-center gap-4 md:gap-6">
            <div *ngFor="let player of bottomRowPlayers; let i = index" 
                 class="flex flex-col items-center bg-white/5 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10 hover:bg-white/10 transition-all"
                 [style.animation-delay.ms]="(i + 5) * 100">
              <!-- Player Image -->
              <div class="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-white/20 mb-2 bg-gradient-to-br from-gray-700 to-gray-900">
                <img *ngIf="getPlayerImageUrl(player.image)" [src]="getPlayerImageUrl(player.image)" class="w-full h-full object-cover" [alt]="player.name">
                <div *ngIf="!getPlayerImageUrl(player.image)" class="w-full h-full flex items-center justify-center">
                  <span class="text-2xl md:text-3xl text-white/40">👤</span>
                </div>
              </div>
              <!-- Player Name & Role -->
              <div class="text-center">
                <div class="text-sm md:text-base lg:text-lg font-semibold text-white truncate max-w-24 md:max-w-28 lg:max-w-32"
                     [title]="player.name">
                  {{ player.name }}
                </div>
                <div class="text-xs md:text-sm text-gray-400">{{ player.role }}</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    .team-entry { opacity: 0; }
    .team-1 { transform: scale(0.95) translateY(20px); }
    .team-2 { transform: translateX(60px); }
    .animate-team-1 { animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
    .animate-team-2 { animation: slideInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; }
    @keyframes scaleIn {
      0% { opacity: 0; transform: scale(0.9) translateY(30px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes slideInLeft {
      0% { opacity: 0; transform: translateX(-60px) scale(0.9); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes slideInRight {
      0% { opacity: 0; transform: translateX(60px) scale(0.9); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    .vs-badge { opacity: 0; transform: scale(0.5); }
    .animate-vs { animation: vsPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s forwards; }
    @keyframes vsPopIn {
      0% { opacity: 0; transform: scale(0.5); }
      70% { transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    .info-card { opacity: 0; transform: translateY(40px); }
    .animate-info-card { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards; }
    @keyframes slideUpFade {
      0% { opacity: 0; transform: translateY(40px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .flag-container { transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .animate-team-1 .flag-container, .animate-team-2 .flag-container {
      animation: flagGlow 2s ease-in-out infinite alternate;
    }
    @keyframes flagGlow {
      0% { box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.1); }
      100% { box-shadow: 0 15px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.15); }
    }
    .animate-vs span { animation: vsPulse 2s ease-in-out infinite; }
    @keyframes vsPulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    .team-code { transition: text-shadow 0.3s ease; }
    .animate-team-1 .team-code, .animate-team-2 .team-code {
      animation: textGlow 3s ease-in-out infinite alternate;
    }
    @keyframes textGlow {
      0% { text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8); }
      100% { text-shadow: 0 4px 25px rgba(0,0,0,0.6), 0 2px 15px rgba(0,0,0,0.9), 0 0 40px rgba(255,255,255,0.1); }
    }
    .shimmer-effect { animation: shimmer 2.5s ease-in-out infinite; }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class MatchIntroViewComponent implements OnInit, OnDestroy {
  @Input() introType: 'matchIntro' | 'teamLineup' | 'inningsIntro' | 'chaseSetup' = 'matchIntro';
  @Input() team1Code: string = 'T1';
  @Input() team1Flag: string | null = null;
  @Input() team1Name: string = 'Team 1';
  @Input() team2Code: string = 'T2';
  @Input() team2Flag: string | null = null;
  @Input() team2Name: string = 'Team 2';
  @Input() battingTeamCode: string = 'TM';
  @Input() battingTeamFlag: string | null = null;
  @Input() battingTeamName: string = 'Team';
  @Input() format: string = 'T20';
  @Input() venue: string = '';
  @Input() tossWinner: string = '';
  @Input() tossWinnerCode: string = '';
  @Input() tossDecision: string = '';
  @Input() totalOvers: number = 20;
  @Input() headline: string = '';
  @Input() subheadline: string = '';
  @Input() narrative: string = '';
  
  // Team Lineup specific inputs
  @Input() lineupTeamName: string = '';
  @Input() lineupTeamCode: string = '';
  @Input() lineupTeamFlag: string | null = null;
  @Input() lineupPlayers: LineupPlayer[] = [];
  @Input() lineupHeadline: string = '';
  
  animationStarted = false;
  
  // Helper to split players into two rows (5 + 6)
  get topRowPlayers(): LineupPlayer[] {
    return this.lineupPlayers.slice(0, 5);
  }
  
  get bottomRowPlayers(): LineupPlayer[] {
    return this.lineupPlayers.slice(5);
  }
  
  // Helper to transform headshotPath to full Cloudinary URL
  getPlayerImageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path; // Already a full URL
    // Path like /lsci/db/PICTURES/... needs Cloudinary prefix
    return `https://img1.hscicdn.com/image/upload${path}`;
  }
  
  ngOnInit(): void {
    setTimeout(() => {
      this.animationStarted = true;
    }, 100);
  }
  
  ngOnDestroy(): void {}
}
