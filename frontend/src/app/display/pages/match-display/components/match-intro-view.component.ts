import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

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
      <div *ngIf="introType === 'matchIntro'" class="relative z-20 text-center">
        
        <!-- Teams Row -->
        <div class="flex items-center justify-center gap-6 md:gap-12 lg:gap-20 mb-10">
          
          <!-- Team 1 -->
          <div class="flex flex-col items-center team-entry team-1"
               [class.animate-team-1]="animationStarted">
            <div class="relative mb-4">
              <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl blur-xl scale-110 opacity-50"></div>
              <div class="relative w-24 h-20 md:w-32 md:h-24 lg:w-40 lg:h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl flag-container">
                <img *ngIf="team1Flag" 
                     [src]="team1Flag" 
                     class="w-full h-full object-cover"
                     [alt]="team1Code">
                <div *ngIf="!team1Flag" 
                     class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <span class="text-3xl font-bold text-white/60">{{ team1Code }}</span>
                </div>
              </div>
            </div>
            <span class="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-wider team-code"
                  style="text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ team1Code }}
            </span>
          </div>
          
          <!-- VS Badge -->
          <div class="vs-badge" [class.animate-vs]="animationStarted">
            <span class="text-4xl md:text-5xl lg:text-6xl font-black text-white/90 tracking-widest"
                  style="text-shadow: 0 0 30px rgba(255,255,255,0.3), 0 4px 15px rgba(0,0,0,0.5);">
              VS
            </span>
          </div>
          
          <!-- Team 2 -->
          <div class="flex flex-col items-center team-entry team-2"
               [class.animate-team-2]="animationStarted">
            <div class="relative mb-4">
              <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl blur-xl scale-110 opacity-50"></div>
              <div class="relative w-24 h-20 md:w-32 md:h-24 lg:w-40 lg:h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl flag-container">
                <img *ngIf="team2Flag" 
                     [src]="team2Flag" 
                     class="w-full h-full object-cover"
                     [alt]="team2Code">
                <div *ngIf="!team2Flag" 
                     class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <span class="text-3xl font-bold text-white/60">{{ team2Code }}</span>
                </div>
              </div>
            </div>
            <span class="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-wider team-code"
                  style="text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ team2Code }}
            </span>
          </div>
        </div>
        
        <!-- Match Info Card -->
        <div class="info-card" [class.animate-info-card]="animationStarted">
          <div class="relative bg-white/10 backdrop-blur-xl rounded-2xl px-10 py-6 md:px-14 md:py-8 inline-block border border-white/20 shadow-2xl overflow-hidden">
            <div class="absolute inset-0 rounded-2xl p-[1px] pointer-events-none"
                 style="background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%);"></div>
            <div class="absolute inset-0 rounded-2xl pointer-events-none"
                 style="box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.1);"></div>
            <div class="relative z-10">
              <div class="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-wide">
                {{ format }} Match
              </div>
              <div *ngIf="venue" class="text-lg md:text-xl text-gray-300 mb-1">{{ venue }}</div>
              <div *ngIf="tossWinner" class="text-base md:text-lg text-gray-400 mt-4 pt-4 border-t border-white/10">
                <span class="text-white font-semibold">{{ tossWinnerCode }}</span> won toss, elected to 
                <span class="text-yellow-400 font-semibold">{{ tossDecision }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ==================== INNINGS INTRO ==================== -->
      <div *ngIf="introType === 'inningsIntro'" class="relative z-20 text-center">
        <div class="flex items-center justify-center gap-6 mb-8 team-entry team-1" [class.animate-team-1]="animationStarted">
          <div class="relative">
            <div class="absolute inset-0 bg-blue-500/30 rounded-xl blur-xl scale-110"></div>
            <div class="relative w-28 h-22 md:w-36 md:h-28 rounded-xl overflow-hidden border-2 border-blue-400/50 shadow-2xl">
              <img *ngIf="battingTeamFlag" [src]="battingTeamFlag" class="w-full h-full object-cover">
            </div>
          </div>
          <span class="text-6xl md:text-7xl font-black text-white tracking-wider"
                style="text-shadow: 0 4px 20px rgba(59,130,246,0.5), 0 2px 10px rgba(0,0,0,0.8);">
            {{ battingTeamCode }}
          </span>
        </div>
        <div class="info-card" [class.animate-info-card]="animationStarted">
          <div class="relative bg-gradient-to-br from-blue-600/90 to-blue-800/90 backdrop-blur-xl rounded-2xl px-12 py-8 md:px-20 md:py-10 inline-block border border-blue-400/30 shadow-2xl overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer-effect"></div>
            <div class="relative z-10">
              <div class="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 tracking-wider"
                   style="text-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                {{ headline || 'BAT FIRST' }}
              </div>
              <div class="text-xl md:text-2xl text-blue-100">{{ format }} &bull; {{ totalOvers }} Overs</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ==================== CHASE SETUP ==================== -->
      <div *ngIf="introType === 'chaseSetup'" class="relative z-20 text-center">
        <div class="flex items-center justify-center gap-6 mb-8 team-entry team-1" [class.animate-team-1]="animationStarted">
          <div class="relative">
            <div class="absolute inset-0 bg-orange-500/30 rounded-xl blur-xl scale-110"></div>
            <div class="relative w-28 h-22 md:w-36 md:h-28 rounded-xl overflow-hidden border-2 border-orange-400/50 shadow-2xl">
              <img *ngIf="battingTeamFlag" [src]="battingTeamFlag" class="w-full h-full object-cover">
            </div>
          </div>
          <span class="text-6xl md:text-7xl font-black text-white tracking-wider"
                style="text-shadow: 0 4px 20px rgba(249,115,22,0.5), 0 2px 10px rgba(0,0,0,0.8);">
            {{ battingTeamCode }}
          </span>
        </div>
        <div class="info-card" [class.animate-info-card]="animationStarted">
          <div class="relative bg-gradient-to-br from-orange-500/90 via-amber-500/90 to-orange-600/90 backdrop-blur-xl rounded-2xl px-12 py-8 md:px-20 md:py-10 inline-block border border-orange-300/30 shadow-2xl overflow-hidden">
            <div class="absolute inset-0 rounded-2xl border-4 border-yellow-400/20 animate-pulse"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer-effect"></div>
            <div class="relative z-10">
              <div class="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-3 tracking-wider"
                   style="text-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 40px rgba(251,191,36,0.3);">
                {{ headline || 'TARGET: 0' }}
              </div>
              <div class="text-xl md:text-2xl text-orange-100 mb-2">{{ subheadline }}</div>
              <div class="text-lg md:text-xl text-orange-200/80">{{ narrative }}</div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    .team-entry { opacity: 0; }
    .team-1 { transform: translateX(-60px); }
    .team-2 { transform: translateX(60px); }
    .animate-team-1 { animation: slideInLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; }
    .animate-team-2 { animation: slideInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; }
    @keyframes slideInLeft {
      0% { opacity: 0; transform: translateX(-60px) scale(0.9); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes slideInRight {
      0% { opacity: 0; transform: translateX(60px) scale(0.9); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    .vs-badge { opacity: 0; transform: scale(0.5); }
    .animate-vs { animation: vsPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s forwards; }
    @keyframes vsPopIn {
      0% { opacity: 0; transform: scale(0.5); }
      70% { transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    .info-card { opacity: 0; transform: translateY(40px); }
    .animate-info-card { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.0s forwards; }
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
    .shimmer-effect { animation: shimmer 2s ease-in-out infinite; }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class MatchIntroViewComponent implements OnInit, OnDestroy {
  @Input() introType: 'matchIntro' | 'inningsIntro' | 'chaseSetup' = 'matchIntro';
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
  
  animationStarted = false;
  
  ngOnInit(): void {
    setTimeout(() => {
      this.animationStarted = true;
    }, 100);
  }
  
  ngOnDestroy(): void {}
}
