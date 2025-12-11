import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toss-screen-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex items-center justify-center min-h-0 relative overflow-hidden">
      
      <!-- Vignette overlay for focus -->
      <div class="absolute inset-0 pointer-events-none z-10"
           style="background: radial-gradient(ellipse at center, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%);">
      </div>
      
      <!-- Main Content -->
      <div class="relative z-20 text-center px-8">
        
        <!-- Match Title -->
        <div class="title-entry" [class.animate-title]="animationStarted">
          <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white/80 tracking-wide mb-8"
              style="text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
            {{ format }} Match
          </h1>
        </div>
        
        <!-- Teams Row -->
        <div class="flex items-center justify-center gap-12 md:gap-16 lg:gap-24 xl:gap-32 mb-12">
          
          <!-- Team 1 -->
          <div class="flex flex-col items-center team-entry team-1" [class.animate-team-1]="animationStarted">
            <div class="relative mb-4">
              <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-xl scale-110 opacity-50"></div>
              <div class="relative w-32 h-24 md:w-44 md:h-32 lg:w-52 lg:h-40 xl:w-60 xl:h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl">
                <img *ngIf="team1Flag" [src]="team1Flag" class="w-full h-full object-cover" [alt]="team1Code">
                <div *ngIf="!team1Flag" class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <span class="text-3xl font-bold text-white/60">{{ team1Code }}</span>
                </div>
              </div>
            </div>
            <span class="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-wider"
                  [class.text-yellow-400]="isTeam1Winner"
                  style="text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ team1Code }}
            </span>
          </div>
          
          <!-- VS Badge -->
          <div class="vs-badge" [class.animate-vs]="animationStarted">
            <span class="text-4xl md:text-5xl lg:text-6xl font-black text-white/80 tracking-widest"
                  style="text-shadow: 0 0 30px rgba(255,255,255,0.3), 0 4px 15px rgba(0,0,0,0.5);">
              VS
            </span>
          </div>
          
          <!-- Team 2 -->
          <div class="flex flex-col items-center team-entry team-2" [class.animate-team-2]="animationStarted">
            <div class="relative mb-4">
              <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-xl scale-110 opacity-50"></div>
              <div class="relative w-32 h-24 md:w-44 md:h-32 lg:w-52 lg:h-40 xl:w-60 xl:h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl">
                <img *ngIf="team2Flag" [src]="team2Flag" class="w-full h-full object-cover" [alt]="team2Code">
                <div *ngIf="!team2Flag" class="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <span class="text-3xl font-bold text-white/60">{{ team2Code }}</span>
                </div>
              </div>
            </div>
            <span class="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-wider"
                  [class.text-yellow-400]="isTeam2Winner"
                  style="text-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.8);">
              {{ team2Code }}
            </span>
          </div>
        </div>
        
        <!-- Toss Result Card -->
        <div class="toss-card" [class.animate-toss-card]="animationStarted">
          <div class="relative bg-gradient-to-b from-yellow-500/20 to-amber-600/10 backdrop-blur-xl rounded-3xl px-12 py-8 md:px-16 md:py-10 lg:px-20 lg:py-12 inline-block border-2 border-yellow-400/40 shadow-2xl overflow-hidden">
            <!-- Coin animation background -->
            <div class="absolute top-3 right-4 text-5xl md:text-6xl animate-spin-slow opacity-30">🪙</div>
            
            <!-- Top shine -->
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>
            
            <div class="relative z-10">
              <!-- Toss Winner -->
              <div class="flex items-center justify-center gap-4 mb-4">
                <div class="w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden border border-yellow-400/50 shadow-lg">
                  <img *ngIf="tossWinnerFlag" [src]="tossWinnerFlag" class="w-full h-full object-cover" [alt]="tossWinnerCode">
                  <div *ngIf="!tossWinnerFlag" class="w-full h-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                    <span class="text-lg font-bold text-white">{{ tossWinnerCode }}</span>
                  </div>
                </div>
                <span class="text-3xl md:text-4xl lg:text-5xl font-black text-yellow-400 tracking-wide"
                      style="text-shadow: 0 4px 20px rgba(251,191,36,0.4), 0 2px 10px rgba(0,0,0,0.5);">
                  {{ tossWinnerCode }}
                </span>
              </div>
              
              <!-- Won the toss -->
              <div class="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 tracking-wide"
                   style="text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                won the toss
              </div>
              
              <!-- Decision -->
              <div class="flex items-center justify-center gap-3 text-xl md:text-2xl lg:text-3xl">
                <span class="text-white/80">elected to</span>
                <span class="px-5 py-2 rounded-full font-bold uppercase tracking-wider"
                      [class.bg-green-500]="tossDecision === 'bat'"
                      [class.bg-blue-500]="tossDecision === 'bowl'"
                      [class.text-white]="true">
                  {{ tossDecision === 'bat' ? '🏏 BAT' : '⚾ BOWL' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Venue (if provided) -->
        <div *ngIf="venue" class="venue-entry mt-8" [class.animate-venue]="animationStarted">
          <div class="flex items-center justify-center gap-2 text-lg md:text-xl text-white/60">
            <span>📍</span>
            <span>{{ venue }}</span>
          </div>
        </div>
        
      </div>
      
    </div>
  `,
  styles: [`
    .title-entry { opacity: 0; transform: translateY(-20px); }
    .animate-title { animation: fadeInDown 0.6s ease-out 0.1s forwards; }
    
    @keyframes fadeInDown {
      0% { opacity: 0; transform: translateY(-20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .team-entry { opacity: 0; }
    .team-1 { transform: translateX(-60px) scale(0.9); }
    .team-2 { transform: translateX(60px) scale(0.9); }
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
    .animate-vs { animation: vsPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s forwards; }
    
    @keyframes vsPopIn {
      0% { opacity: 0; transform: scale(0.5); }
      70% { transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    
    .toss-card { opacity: 0; transform: translateY(40px) scale(0.95); }
    .animate-toss-card { animation: tossCardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards; }
    
    @keyframes tossCardIn {
      0% { opacity: 0; transform: translateY(40px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .venue-entry { opacity: 0; transform: translateY(20px); }
    .animate-venue { animation: fadeInUp 0.5s ease-out 1.3s forwards; }
    
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .animate-spin-slow {
      animation: spinSlow 8s linear infinite;
    }
    
    @keyframes spinSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class TossScreenViewComponent implements OnInit, OnChanges {
  @Input() team1Name: string = '';
  @Input() team1Code: string = '';
  @Input() team1Flag: string | null = null;
  @Input() team2Name: string = '';
  @Input() team2Code: string = '';
  @Input() team2Flag: string | null = null;
  @Input() tossWinnerCode: string = '';
  @Input() tossWinnerFlag: string | null = null;
  @Input() tossDecision: 'bat' | 'bowl' = 'bat';
  @Input() format: string = 'T20';
  @Input() venue: string = '';
  
  animationStarted = false;
  
  get isTeam1Winner(): boolean {
    return this.tossWinnerCode === this.team1Code;
  }
  
  get isTeam2Winner(): boolean {
    return this.tossWinnerCode === this.team2Code;
  }
  
  ngOnInit(): void {
    setTimeout(() => {
      this.animationStarted = true;
    }, 100);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Reset animation when data changes
    if (changes['tossWinnerCode'] || changes['team1Code'] || changes['team2Code']) {
      this.animationStarted = false;
      setTimeout(() => {
        this.animationStarted = true;
      }, 50);
    }
  }
}
