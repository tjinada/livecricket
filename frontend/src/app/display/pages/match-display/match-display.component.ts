import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PlayerCacheService } from '../../services/player-cache.service';
import { MatchCalculationsService, GraphDataPoint } from '../../services/match-calculations.service';
import { TeamDisplayService } from '../../services/team-display.service';
import { DismissalFormatterService } from '../../services/dismissal-formatter.service';

@Component({
  selector: 'app-match-display',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <!-- Background Layer -->
      <div class="absolute inset-0 z-0">
        <!-- Video Background -->
        <video 
          *ngIf="currentBackground?.type === 'video' && currentBackground?.url"
          [src]="currentBackground!.url!"
          autoplay
          loop
          [muted]="true"
          playsinline
          class="w-full h-full object-cover"
        ></video>
        
        <!-- Image Background -->
        <div 
          *ngIf="currentBackground?.type === 'image' && currentBackground?.url"
          class="w-full h-full bg-cover bg-center"
          [style.backgroundImage]="'url(' + currentBackground!.url! + ')'"
        ></div>
        
        <!-- Default Gradient Background -->
        <div 
          *ngIf="!currentBackground?.url || currentBackground?.type === 'none'"
          class="w-full h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"
        ></div>
        
        <!-- Flag Overlays (only when using default backgrounds) -->
        <ng-container *ngIf="showFlagOverlays">
          <!-- Batting Team Flag (Left Side) -->
          <video 
            *ngIf="battingTeamFlagVideo"
            [src]="battingTeamFlagVideo"
            autoplay
            loop
            [muted]="true"
            playsinline
            class="absolute left-0 bottom-0 h-2/3 w-auto object-contain opacity-40 pointer-events-none"
            style="mix-blend-mode: screen;"
          ></video>
          
          <!-- Bowling Team Flag (Right Side) -->
          <video 
            *ngIf="bowlingTeamFlagVideo"
            [src]="bowlingTeamFlagVideo"
            autoplay
            loop
            [muted]="true"
            playsinline
            class="absolute right-0 bottom-0 h-2/3 w-auto object-contain opacity-40 pointer-events-none"
            style="mix-blend-mode: screen; transform: scaleX(-1);"
          ></video>
        </ng-container>
        
        <!-- Dark Overlay for readability -->
        <div class="absolute inset-0 bg-black/30"></div>
        
        <!-- Vignette Effect - dark edges, clear center -->
        <div class="absolute inset-0" style="background: radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%);"></div>
      </div>

      <!-- ==================== NOTIFICATION OVERLAY ==================== -->
      <div 
        *ngIf="showNotification" 
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Dark backdrop for better visibility -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="dismissNotification()"></div>
        
        <!-- SIX Overlay -->
        <div *ngIf="notificationType === 'six'" class="text-center animate-pulse relative z-10" (click)="dismissNotification()">
          <!-- Explosion/Firework effect background -->
          <div class="absolute inset-0 bg-gradient-radial from-purple-600/40 via-purple-900/20 to-transparent"></div>
          
          <!-- Main content -->
          <div class="relative">
            <!-- Big 6 -->
            <div class="text-[20rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-orange-600 leading-none drop-shadow-2xl animate-bounce" style="text-shadow: 0 0 80px rgba(234, 179, 8, 0.8), 0 0 120px rgba(234, 179, 8, 0.5);">
              6
            </div>
            
            <!-- SIX text -->
            <div class="text-6xl font-black uppercase tracking-[0.3em] text-white mt-[-2rem]" style="text-shadow: 0 0 40px rgba(168, 85, 247, 0.8);">
              MAXIMUM!
            </div>
            
            <!-- Batsman info -->
            <div class="mt-8 bg-black/60 backdrop-blur-md rounded-2xl px-8 py-4 inline-flex items-center gap-6 border border-yellow-500/30">
              <img 
                *ngIf="notificationData?.batsmanImage" 
                [src]="notificationData?.batsmanImage"
                class="w-32 h-32 rounded-full object-cover border-4 border-yellow-500 shadow-2xl"
              >
              <div *ngIf="!notificationData?.batsmanImage" class="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-yellow-500">
                <span class="text-5xl">🏏</span>
              </div>
              <div>
                <div class="text-4xl font-bold text-white">{{ notificationData?.batsmanName }}</div>
                <div class="text-2xl text-yellow-400 mt-2">
                  {{ notificationData?.batsmanRuns }} ({{ notificationData?.batsmanBalls }})
                </div>
              </div>
            </div>
            
            <!-- Score update -->
            <div class="mt-4 text-2xl text-gray-300">
              {{ notificationData?.totalScore }}/{{ notificationData?.totalWickets }}
            </div>
          </div>
          
          <!-- Decorative circles -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-4 border-yellow-500/20 rounded-full animate-ping"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-purple-500/30 rounded-full animate-ping" style="animation-delay: 0.2s;"></div>
        </div>

        <!-- FOUR Overlay -->
        <div *ngIf="notificationType === 'four'" class="text-center relative z-10" (click)="dismissNotification()">
          <!-- Background effect -->
          <div class="absolute inset-0 bg-gradient-radial from-green-600/30 via-green-900/20 to-transparent"></div>
          
          <!-- Main content -->
          <div class="relative">
            <!-- Big 4 -->
            <div class="text-[16rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 via-green-500 to-emerald-600 leading-none drop-shadow-2xl" style="text-shadow: 0 0 60px rgba(34, 197, 94, 0.7), 0 0 100px rgba(34, 197, 94, 0.4);">
              4
            </div>
            
            <!-- FOUR text -->
            <div class="text-5xl font-black uppercase tracking-[0.2em] text-white mt-[-1rem]" style="text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);">
              BOUNDARY!
            </div>
            
            <!-- Batsman info -->
            <div class="mt-6 bg-black/60 backdrop-blur-md rounded-xl px-6 py-3 inline-flex items-center gap-5 border border-green-500/30">
              <img 
                *ngIf="notificationData?.batsmanImage" 
                [src]="notificationData?.batsmanImage"
                class="w-28 h-28 rounded-full object-cover border-4 border-green-500 shadow-2xl"
              >
              <div *ngIf="!notificationData?.batsmanImage" class="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-green-500">
                <span class="text-4xl">🏏</span>
              </div>
              <div>
                <div class="text-3xl font-bold text-white">{{ notificationData?.batsmanName }}</div>
                <div class="text-xl text-green-400 mt-1">
                  {{ notificationData?.batsmanRuns }} ({{ notificationData?.batsmanBalls }})
                </div>
              </div>
            </div>
            
            <!-- Score update -->
            <div class="mt-3 text-xl text-gray-300">
              {{ notificationData?.totalScore }}/{{ notificationData?.totalWickets }}
            </div>
          </div>
          
          <!-- Decorative circle -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-4 border-green-500/20 rounded-full animate-ping"></div>
        </div>

        <!-- WICKET Overlay -->
        <div *ngIf="notificationType === 'wicket'" class="text-center relative z-10" (click)="dismissNotification()">
          <!-- Red dramatic background -->
          <div class="absolute inset-0 bg-gradient-radial from-red-900/60 via-red-950/40 to-transparent"></div>
          
          <!-- Main content -->
          <div class="relative">
            <!-- WICKET text -->
            <div class="text-[10rem] font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-600 to-red-800 leading-none" style="text-shadow: 0 0 60px rgba(239, 68, 68, 0.8), 0 0 100px rgba(239, 68, 68, 0.5);">
              WICKET!
            </div>
            
            <!-- OUT badge -->
            <div class="mt-4">
              <span class="bg-red-600 text-white text-4xl font-black px-8 py-2 rounded-lg uppercase tracking-widest">
                OUT
              </span>
            </div>
            
            <!-- Dismissed batsman info -->
            <div class="mt-8 bg-black/70 backdrop-blur-md rounded-2xl px-12 py-8 inline-flex items-center gap-8 border border-red-500/40">
              <img 
                *ngIf="notificationData?.dismissedImage" 
                [src]="notificationData?.dismissedImage"
                class="w-36 h-36 rounded-full object-cover border-4 border-red-500 shadow-2xl grayscale"
              >
              <div *ngIf="!notificationData?.dismissedImage" class="w-36 h-36 rounded-full bg-gray-700 flex items-center justify-center border-4 border-red-500">
                <span class="text-6xl">🏏</span>
              </div>
              <div>
                <div class="text-5xl font-bold text-white">{{ notificationData?.dismissedName }}</div>
                <div class="text-3xl text-red-400 mt-3">
                  {{ notificationData?.dismissedRuns }} ({{ notificationData?.dismissedBalls }})
                </div>
                
                <!-- Dismissal details -->
                <div class="mt-4 text-2xl text-gray-300">
                  <span *ngIf="notificationData?.dismissalType === 'bowled'">b {{ notificationData?.bowlerName }}</span>
                  <span *ngIf="notificationData?.dismissalType === 'caught'">
                    c <span *ngIf="notificationData?.fielderName">{{ notificationData?.fielderName }}</span> b {{ notificationData?.bowlerName }}
                  </span>
                  <span *ngIf="notificationData?.dismissalType === 'lbw'">lbw b {{ notificationData?.bowlerName }}</span>
                  <span *ngIf="notificationData?.dismissalType === 'run-out'">run out</span>
                  <span *ngIf="notificationData?.dismissalType === 'stumped'">st b {{ notificationData?.bowlerName }}</span>
                  <span *ngIf="notificationData?.dismissalType === 'hit-wicket'">hit wicket b {{ notificationData?.bowlerName }}</span>
                </div>
              </div>
            </div>
            
            <!-- Updated score -->
            <div class="mt-6 text-3xl font-bold">
              <span class="text-white">{{ notificationData?.totalScore }}</span>
              <span class="text-red-500">/{{ notificationData?.totalWickets }}</span>
            </div>
          </div>
          
          <!-- Dramatic red pulse -->
          <div class="absolute inset-0 bg-red-600/10 animate-pulse"></div>
        </div>

        <!-- THIRD UMPIRE DECISION Overlay -->
        <div *ngIf="notificationType === 'third-umpire'" class="text-center relative z-10 w-full px-8">
          <!-- Decision pending state - side by side with alternating highlights -->
          <div *ngIf="!thirdUmpireDecision" class="relative">
            <!-- 3rd Umpire label at top -->
            <div class="text-5xl font-bold text-white mb-8 tracking-widest">3RD UMPIRE REVIEW</div>
            
            <!-- Side by side NOT OUT and OUT -->
            <div class="flex items-center justify-center gap-16">
              <!-- NOT OUT on LEFT (Green) -->
              <div 
                class="text-[10rem] font-black uppercase tracking-wider animate-third-umpire-notout-highlight px-12 py-6 rounded-3xl transition-all"
                style="text-shadow: 0 0 60px rgba(34, 197, 94, 0.8), 0 0 120px rgba(34, 197, 94, 0.5);">
                NOT OUT
              </div>
              
              <!-- Divider -->
              <div class="h-48 w-1 bg-gray-600"></div>
              
              <!-- OUT on RIGHT (Red) -->
              <div 
                class="text-[10rem] font-black uppercase tracking-wider animate-third-umpire-out-highlight px-12 py-6 rounded-3xl transition-all"
                style="text-shadow: 0 0 60px rgba(239, 68, 68, 0.8), 0 0 120px rgba(239, 68, 68, 0.5);">
                OUT
              </div>
            </div>
            
            <!-- Pending indicator -->
            <div class="mt-12 flex items-center justify-center gap-3">
              <div class="w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
              <span class="text-3xl text-yellow-400 font-semibold">Decision Pending...</span>
              <div class="w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
            </div>
          </div>
          
          <!-- Decision made state -->
          <div *ngIf="thirdUmpireDecision" class="relative">
            <!-- Final Decision -->
            <div 
              class="text-[14rem] font-black uppercase tracking-wider leading-none"
              [style.color]="thirdUmpireDecision === 'out' ? '#ef4444' : '#22c55e'"
              [style.text-shadow]="thirdUmpireDecision === 'out' ? '0 0 80px rgba(239, 68, 68, 0.9), 0 0 150px rgba(239, 68, 68, 0.6)' : '0 0 80px rgba(34, 197, 94, 0.9), 0 0 150px rgba(34, 197, 94, 0.6)'">
              {{ thirdUmpireDecision === 'out' ? 'OUT' : 'NOT OUT' }}
            </div>
            
            <!-- Decision label -->
            <div class="text-4xl font-bold text-white mt-6 tracking-widest">3RD UMPIRE DECISION</div>
            
            <!-- Batsman info (if out) -->
            <div *ngIf="thirdUmpireDecision === 'out' && notificationData?.dismissedName" 
                 class="mt-8 bg-black/60 backdrop-blur-md rounded-2xl px-10 py-6 inline-flex items-center gap-6 border border-red-500/40">
              <img 
                *ngIf="notificationData?.dismissedImage" 
                [src]="notificationData?.dismissedImage"
                class="w-32 h-32 rounded-full object-cover border-4 border-red-500 shadow-2xl grayscale"
              >
              <div *ngIf="!notificationData?.dismissedImage" class="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-red-500">
                <span class="text-5xl">🏏</span>
              </div>
              <div>
                <div class="text-4xl font-bold text-white">{{ notificationData?.dismissedName }}</div>
                <div *ngIf="notificationData?.dismissedRuns !== undefined" class="text-2xl text-red-400 mt-2">
                  {{ notificationData?.dismissedRuns }} ({{ notificationData?.dismissedBalls }})
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CUSTOM MESSAGE Overlay -->
        <div *ngIf="notificationType === 'custom-message'" class="text-center relative z-10 max-w-4xl mx-auto px-8">
          <div class="bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-md rounded-3xl px-12 py-10 border border-gray-600/50 shadow-2xl">
            <!-- Custom message text -->
            <div 
              class="text-5xl font-bold text-white leading-tight"
              style="text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
              {{ customMessage }}
            </div>
          </div>
        </div>
        
        <!-- Dismiss hint (only for auto-dismissable notifications) -->
        <div 
          *ngIf="notificationType !== 'third-umpire' || thirdUmpireDecision"
          class="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-sm cursor-pointer z-20" 
          (click)="dismissNotification()">
          Click anywhere to dismiss
        </div>
      </div>

      <!-- CSS for third umpire animation -->
      <style>
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
      </style>

      <!-- Content Layer -->
      <div class="relative z-10 h-screen flex flex-col">
        <!-- Loading State -->
        <div *ngIf="loading" class="flex items-center justify-center h-screen">
          <div class="text-center">
            <div class="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-xl text-gray-400">Loading match...</p>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="!loading && error" class="flex flex-col items-center justify-center h-screen">
          <p class="text-xl text-red-400 mb-4">{{ error }}</p>
          <a routerLink="/display" class="text-green-400 hover:text-green-300">← Back to matches</a>
        </div>

        <!-- Match Content -->
        <div *ngIf="!loading && !error && match" class="h-full flex flex-col">
        
          <!-- ==================== LIVE SCORE VIEW ==================== -->
          <div *ngIf="displayView === 'live-score'" class="h-full flex flex-col">
            
            <!-- Top Header Bar -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <div class="max-w-7xl mx-auto px-10 py-6">
                <div class="flex items-center justify-between">
                  <!-- Left: Live Badge -->
                  <div class="flex items-center gap-3 bg-red-600 px-5 py-2.5 rounded-full">
                    <span class="w-3.5 h-3.5 bg-white rounded-full animate-pulse"></span>
                    <span class="text-base font-bold uppercase tracking-wider">Live</span>
                  </div>
                  
                  <!-- Center: Match Title -->
                  <div class="text-center">
                    <h1 class="text-3xl font-bold tracking-wide">
                      <span class="text-blue-400">{{ getBattingTeamName() }}</span>
                      <span class="text-gray-500 mx-3">vs</span>
                      <span class="text-gray-300">{{ getBowlingTeamName() }}</span>
                    </h1>
                    <p class="text-base text-gray-500 mt-1">{{ match.format }} Match • {{ getInningsLabel() }}</p>
                  </div>
                  
                  <!-- Right: Format Badge -->
                  <div class="bg-gray-700/50 px-8 py-3 rounded-lg text-xl font-semibold">
                    {{ match.format }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content Area - Centered -->
            <div class="flex-1 flex flex-col justify-center items-center px-6 py-4">
              
              <!-- Central Score Display -->
              <div class="flex flex-col items-center mb-8">
                <!-- Team Flag & Name with backdrop -->
                <div class="flex items-center justify-center gap-5 mb-6 bg-black/50 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10">
                  <!-- Team Code Badge (only if no flag) -->
                  <div 
                    *ngIf="!getBattingTeamFlag()"
                    class="w-20 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-2xl font-black shadow-lg border border-blue-400/30"
                  >
                    {{ getBattingTeamCode() }}
                  </div>
                  <!-- Team Flag -->
                  <img 
                    *ngIf="getBattingTeamFlag()"
                    [src]="getBattingTeamFlag()"
                    class="w-16 h-12 object-cover rounded-lg shadow-lg border border-white/20"
                  >
                  <span class="text-5xl font-semibold text-white" style="text-shadow: 0 2px 8px rgba(0,0,0,0.9);">{{ getBattingTeamName() }}</span>
                </div>
                
                <!-- Score Row with Flanking Chase Info (2nd innings only) -->
                <div class="flex items-center justify-center gap-8">
                  
                  <!-- LEFT: Need X runs (2nd innings only) -->
                  <div 
                    *ngIf="isSecondInnings()" 
                    class="flex flex-col items-center justify-center bg-gradient-to-br from-yellow-600/30 to-orange-700/30 backdrop-blur-md px-8 py-6 rounded-2xl border-2 border-yellow-500/50 shadow-2xl min-w-[200px]"
                    style="box-shadow: 0 0 40px rgba(234, 179, 8, 0.2);"
                  >
                    <span class="text-yellow-400 text-xl font-semibold uppercase tracking-wider mb-2">Need</span>
                    <span class="text-white font-black text-6xl" style="text-shadow: 0 4px 20px rgba(234, 179, 8, 0.5);">{{ getRunsNeeded() }}</span>
                    <span class="text-yellow-300 text-lg font-medium mt-1">runs to win</span>
                  </div>
                  
                  <!-- Invisible spacer for layout balance (1st innings) -->
                  <div *ngIf="!isSecondInnings()" class="min-w-[200px]"></div>
                  
                  <!-- Big Score with subtle backdrop -->
                  <div class="relative">
                    <!-- Subtle dark pill behind score -->
                    <div class="absolute inset-0 -inset-x-12 -inset-y-4 bg-black/40 rounded-3xl blur-xl"></div>
                    <div class="relative text-center">
                      <div class="flex items-baseline justify-center gap-3">
                        <span class="font-black tracking-tight text-white" style="font-size: 14rem; line-height: 1; text-shadow: 0 6px 30px rgba(0,0,0,0.8), 0 3px 15px rgba(0,0,0,0.9), 0 0 80px rgba(255,255,255,0.15);">{{ currentInnings?.totalRuns || 0 }}</span>
                        <span class="text-7xl font-light text-gray-400">/</span>
                        <span class="font-bold text-gray-200" style="font-size: 9rem; line-height: 1; text-shadow: 0 3px 15px rgba(0,0,0,0.7);">{{ currentInnings?.totalWickets || 0 }}</span>
                      </div>
                      <!-- Bigger & Bolder Overs Display -->
                      <div class="text-5xl text-white mt-6 font-bold" style="text-shadow: 0 2px 8px rgba(0,0,0,0.9);">
                        <span class="text-gray-300">(</span>{{ getOversDisplay() }} overs<span class="text-gray-300">)</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- RIGHT: X balls remaining (2nd innings only) -->
                  <div 
                    *ngIf="isSecondInnings()" 
                    class="flex flex-col items-center justify-center bg-gradient-to-br from-cyan-600/30 to-blue-700/30 backdrop-blur-md px-8 py-6 rounded-2xl border-2 border-cyan-500/50 shadow-2xl min-w-[200px]"
                    style="box-shadow: 0 0 40px rgba(6, 182, 212, 0.2);"
                  >
                    <span class="text-cyan-400 text-xl font-semibold uppercase tracking-wider mb-2">From</span>
                    <span class="text-white font-black text-6xl" style="text-shadow: 0 4px 20px rgba(6, 182, 212, 0.5);">{{ getBallsRemaining() }}</span>
                    <span class="text-cyan-300 text-lg font-medium mt-1">balls</span>
                  </div>
                  
                  <!-- Invisible spacer for layout balance (1st innings) -->
                  <div *ngIf="!isSecondInnings()" class="min-w-[200px]"></div>
                </div>
              </div>

              <!-- Middle Row: Striker - Non-Striker | Bowler -->
              <div class="bg-gradient-to-r from-gray-800/90 via-gray-700/90 to-gray-800/90 backdrop-blur-md rounded-2xl px-10 py-6 shadow-2xl border border-gray-600/40 w-full max-w-6xl">
                <div class="flex items-center justify-between">
                  
                  <!-- Batsmen Section -->
                  <div class="flex items-center gap-8 flex-1">
                    <!-- Striker -->
                    <div class="flex items-center gap-4">
                      <div class="relative">
                        <img 
                          *ngIf="getStrikerImage()" 
                          [src]="getStrikerImage()"
                          class="w-24 h-24 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
                        >
                        <div *ngIf="!getStrikerImage()" class="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center border-4 border-yellow-400">
                          <span class="text-4xl">🏏</span>
                        </div>
                        <span class="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-sm text-black font-bold">●</span>
                      </div>
                      <div>
                        <div class="font-bold text-2xl text-white">{{ getStrikerName() }}</div>
                        <div class="text-yellow-400 text-sm font-medium">Striker</div>
                      </div>
                      <div class="text-right ml-2">
                        <div class="text-4xl font-bold">{{ getStrikerRuns() }}<span class="text-gray-500 text-lg ml-1">({{ getStrikerBalls() }})</span></div>
                        <div class="text-lg text-gray-500">SR: {{ getStrikerSR() }}</div>
                      </div>
                    </div>
                    
                    <div class="w-px h-16 bg-gray-600"></div>
                    
                    <!-- Non-Striker -->
                    <div class="flex items-center gap-4">
                      <div class="relative">
                        <img 
                          *ngIf="getNonStrikerImage()" 
                          [src]="getNonStrikerImage()"
                          class="w-20 h-20 rounded-full object-cover border-3 border-gray-500 shadow-lg opacity-90"
                        >
                        <div *ngIf="!getNonStrikerImage()" class="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center border-3 border-gray-500">
                          <span class="text-3xl">🏏</span>
                        </div>
                      </div>
                      <div>
                        <div class="font-semibold text-2xl text-gray-300">{{ getNonStrikerName() }}</div>
                        <div class="text-gray-500 text-sm">Non-striker</div>
                      </div>
                      <div class="text-right ml-2">
                        <div class="text-3xl font-bold text-gray-300">{{ getNonStrikerRuns() }}<span class="text-gray-500 text-lg ml-1">({{ getNonStrikerBalls() }})</span></div>
                        <div class="text-lg text-gray-500">SR: {{ getNonStrikerSR() }}</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Separator -->
                  <div class="w-px h-24 bg-gray-500 mx-8"></div>
                  
                  <!-- Bowler Section -->
                  <div class="flex items-center gap-4">
                    <div class="relative">
                      <img 
                        *ngIf="getCurrentBowlerImage()" 
                        [src]="getCurrentBowlerImage()"
                        class="w-24 h-24 rounded-full object-cover border-4 border-green-500 shadow-lg"
                      >
                      <div *ngIf="!getCurrentBowlerImage()" class="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center border-4 border-green-500">
                        <span class="text-4xl">⚾</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-bold text-2xl text-white">{{ getCurrentBowlerName() }}</div>
                      <div class="text-green-400 text-sm font-medium">Bowler</div>
                      <div class="text-gray-400 text-lg">{{ getCurrentBowlerFigures() }} <span class="text-gray-500">({{ getCurrentBowlerOvers() }})</span></div>
                    </div>
                  </div>
                </div>
                
                <!-- Partnership Info -->
                <div class="mt-4 pt-4 border-t border-gray-600/50">
                  <div>
                    <span class="text-gray-500 text-lg">Partnership: </span>
                    <span class="text-white font-semibold text-xl">{{ getPartnershipRuns() }}</span>
                    <span class="text-gray-500 text-lg"> ({{ getPartnershipBalls() }} balls)</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Bottom Stats Bar -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
              <div class="w-full px-6 py-4">
                <div class="flex items-center">
                  
                  <!-- Left: Previous Overs -->
                  <div class="flex-1 flex items-center justify-end gap-4 pr-4">
                    <span class="text-sm text-gray-500 uppercase">Previous</span>
                    <ng-container *ngFor="let over of getPreviousOvers(); let i = index">
                      <div class="flex items-center gap-1">
                        <span class="text-xs text-gray-500 mr-1">{{ over.overNumber }}</span>
                        <ng-container *ngFor="let ball of over.balls">
                          <div 
                            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            [ngClass]="getBallColorClass(ball)"
                          >
                            {{ ball.display === '0' ? '•' : ball.display }}
                          </div>
                        </ng-container>
                        <span class="text-sm text-gray-500 ml-1">({{ over.runs }})</span>
                      </div>
                      <div *ngIf="i < getPreviousOvers().length - 1" class="w-px h-6 bg-gray-700"></div>
                    </ng-container>
                    <div *ngIf="getPreviousOvers().length === 0" class="text-gray-600 text-sm italic">No previous overs</div>
                  </div>

                  <!-- Separator -->
                  <div class="w-px h-10 bg-gray-600 mx-8"></div>

                  <!-- Center: This Over (emphasized) -->
                  <div class="flex items-center gap-3 px-6 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <span class="text-base text-gray-400 uppercase font-semibold mr-2">This Over</span>
                    <ng-container *ngFor="let ball of getCurrentOverBalls()">
                      <div 
                        class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-md"
                        [ngClass]="getBallColorClass(ball)"
                      >
                        {{ ball.display === '0' ? '•' : ball.display }}
                      </div>
                    </ng-container>
                    <ng-container *ngFor="let i of getRemainingBallsInOver()">
                      <div class="w-12 h-12 rounded-full border-2 border-gray-600 border-dashed flex items-center justify-center text-lg text-gray-600">
                      </div>
                    </ng-container>
                  </div>

                  <!-- Separator -->
                  <div class="w-px h-10 bg-gray-600 mx-8"></div>

                  <!-- Right: Last Wicket + Run Rates -->
                  <div class="flex-1 flex items-center justify-start gap-6 pl-4">
                    <!-- Last Wicket -->
                    <div *ngIf="getLastWicket()" class="flex items-center gap-2 bg-red-900/40 rounded-lg px-4 py-2 border border-red-600/40">
                      <span class="text-red-400 text-sm">Last Wkt:</span>
                      <span class="text-white font-medium text-sm">{{ getLastWicket() }}</span>
                    </div>
                    
                    <!-- Run Rates -->
                    <div class="flex items-center gap-6 text-xl" [ngClass]="{'pl-4 border-l border-gray-700': getLastWicket()}">
                      <div>
                        <span class="text-gray-500">CRR </span>
                        <span class="text-3xl font-bold text-green-400">{{ getCurrentRunRate() }}</span>
                      </div>
                      <div *ngIf="isSecondInnings()">
                        <span class="text-gray-500">RRR </span>
                        <span class="text-3xl font-bold text-orange-400">{{ getRequiredRunRate() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ==================== PLAYER STATS VIEW (Card-Based Grid) ==================== -->
          <div *ngIf="displayView === 'live-match-summary'" class="h-full flex flex-col">
            
            <!-- Top Header Bar with Score -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <div class="max-w-7xl mx-auto px-4 py-2">
                <div class="flex items-center justify-between">
                  <!-- Left: Live Badge + Match Info -->
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 bg-red-600 px-2 py-0.5 rounded-full">
                      <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      <span class="text-xs font-bold uppercase">Live</span>
                    </div>
                    <div>
                      <span class="text-blue-400 font-semibold">{{ getBattingTeamName() }}</span>
                      <span class="text-gray-500 mx-1">vs</span>
                      <span class="text-gray-400">{{ getBowlingTeamName() }}</span>
                    </div>
                  </div>
                  
                  <!-- Center: Big Score -->
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-7 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center text-xs font-bold">
                      {{ getBattingTeamCode() }}
                    </div>
                    <div class="text-3xl font-black">{{ currentInnings?.totalRuns || 0 }}/{{ currentInnings?.totalWickets || 0 }}</div>
                    <div class="text-gray-400 text-sm">({{ getOversDisplay() }} ov)</div>
                    <div class="text-green-400 text-sm ml-2">CRR {{ getCurrentRunRate() }}</div>
                  </div>
                  
                  <!-- Right: Format -->
                  <div class="bg-gray-700/50 px-3 py-1 rounded text-xs font-medium">
                    {{ match.format }} • {{ getInningsLabel() }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content - Two Column Grid -->
            <div class="flex-1 p-4 max-w-7xl mx-auto w-full">
              <div class="h-full grid grid-cols-2 gap-4">
                
                <!-- LEFT COLUMN: Batting -->
                <div class="flex flex-col bg-gradient-to-b from-blue-900/80 to-blue-950/80 rounded-lg backdrop-blur-sm overflow-hidden">
                  
                  <!-- At the Crease Card -->
                  <div class="bg-yellow-900/30 border-b border-yellow-600/30 px-5 py-4">
                    <div class="text-base text-yellow-400 uppercase tracking-wider mb-3">At The Crease</div>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-6">
                        <!-- Striker -->
                        <div class="flex items-center gap-3">
                          <div class="relative">
                            <img 
                              *ngIf="getStrikerImage()" 
                              [src]="getStrikerImage()"
                              class="w-14 h-14 rounded-full object-cover border-3 border-yellow-400"
                            >
                            <div *ngIf="!getStrikerImage()" class="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center border-3 border-yellow-400">
                              <span class="text-xl">🏏</span>
                            </div>
                          </div>
                          <span class="font-semibold text-xl">{{ getStrikerName() }}</span>
                          <span class="text-white font-bold text-2xl">{{ getStrikerRuns() }}</span>
                          <span class="text-gray-400 text-lg">({{ getStrikerBalls() }})</span>
                        </div>
                        <div class="w-px h-8 bg-gray-600"></div>
                        <!-- Non-Striker -->
                        <div class="flex items-center gap-3">
                          <img 
                            *ngIf="getNonStrikerImage()" 
                            [src]="getNonStrikerImage()"
                            class="w-12 h-12 rounded-full object-cover border-2 border-gray-500 opacity-80"
                          >
                          <div *ngIf="!getNonStrikerImage()" class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-500">
                            <span class="text-lg">🏏</span>
                          </div>
                          <span class="text-gray-300 text-xl">{{ getNonStrikerName() }}</span>
                          <span class="text-gray-300 text-xl">{{ getNonStrikerRuns() }}</span>
                          <span class="text-gray-500 text-lg">({{ getNonStrikerBalls() }})</span>
                        </div>
                      </div>
                      <div class="text-lg text-gray-400">
                        P'ship: <span class="text-white font-semibold">{{ getPartnershipRuns() }}</span> ({{ getPartnershipBalls() }})
                      </div>
                    </div>
                  </div>
                  
                  <!-- Batting Header -->
                  <div class="grid grid-cols-12 gap-1 px-5 py-3 bg-blue-950/80 text-base text-gray-400 uppercase">
                    <div class="col-span-5">Batsman</div>
                    <div class="col-span-3">How Out</div>
                    <div class="col-span-2 text-center">R(B)</div>
                    <div class="col-span-2 text-center">4/6</div>
                  </div>
                  
                  <!-- Batting Rows -->
                  <div class="flex-1 overflow-hidden">
                    <ng-container *ngFor="let batsman of getBattingStats()">
                      <div 
                        class="grid grid-cols-12 gap-1 px-5 py-3 border-b border-blue-800/30 text-lg"
                        [ngClass]="{
                          'bg-yellow-900/20': isCurrentBatsman(batsman),
                          'opacity-50': batsman.isDNB
                        }"
                      >
                        <div class="col-span-5 flex items-center gap-3 truncate">
                          <img 
                            *ngIf="getBatsmanImage(batsman)" 
                            [src]="getBatsmanImage(batsman)"
                            class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            [ngClass]="{
                              'border-2 border-yellow-400': isStriker(batsman),
                              'border-2 border-gray-500': isCurrentBatsman(batsman) && !isStriker(batsman),
                              'border border-gray-600 opacity-60': batsman.isDNB
                            }"
                          >
                          <div *ngIf="!getBatsmanImage(batsman)" 
                            class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                            [ngClass]="{
                              'border-2 border-yellow-400': isStriker(batsman),
                              'border-2 border-gray-500': isCurrentBatsman(batsman) && !isStriker(batsman),
                              'border border-gray-600': !isCurrentBatsman(batsman)
                            }">
                            <span class="text-base">🏏</span>
                          </div>
                          <span class="truncate" [ngClass]="{
                            'text-yellow-300 font-semibold': isCurrentBatsman(batsman),
                            'text-gray-500': batsman.isDNB
                          }">
                            {{ getBatsmanName(batsman) }}
                          </span>
                        </div>
                        <div class="col-span-3 text-base truncate" [ngClass]="{'text-gray-600 italic': batsman.isDNB, 'text-gray-400': !batsman.isDNB}">
                          {{ getShortDismissal(batsman) }}
                        </div>
                        <div class="col-span-2 text-center">
                          <ng-container *ngIf="!batsman.isDNB">
                            <span class="font-bold text-xl">{{ batsman.runs || 0 }}</span>
                            <span class="text-gray-500 text-base">({{ batsman.balls || 0 }})</span>
                          </ng-container>
                          <span *ngIf="batsman.isDNB" class="text-gray-600">-</span>
                        </div>
                        <div class="col-span-2 text-center text-base">
                          <ng-container *ngIf="!batsman.isDNB">
                            <span class="text-green-400">{{ batsman.fours || 0 }}</span>
                            <span class="text-gray-600"> / </span>
                            <span class="text-purple-400">{{ batsman.sixes || 0 }}</span>
                          </ng-container>
                          <span *ngIf="batsman.isDNB" class="text-gray-600">-</span>
                        </div>
                      </div>
                    </ng-container>
                  </div>
                  
                  <!-- Extras & Total -->
                  <div class="bg-blue-950/80 px-3 py-2 border-t border-blue-800/50">
                    <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
                      <span>Extras: <span class="text-white">{{ getTotalExtras() }}</span> ({{ getExtrasBreakdown() }})</span>
                      <span>YTB: {{ getYetToBatCount() }}</span>
                    </div>
                  </div>
                </div>

                <!-- RIGHT COLUMN: Bowling + Stats -->
                <div class="flex flex-col gap-3">
                  
                  <!-- Bowling Card -->
                  <div class="flex-1 bg-gradient-to-b from-gray-800/80 to-gray-900/80 rounded-lg backdrop-blur-sm overflow-hidden flex flex-col">
                    
                    <!-- Bowling Now -->
                    <div class="bg-green-900/30 border-b border-green-700/30 px-5 py-4">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <img 
                            *ngIf="getCurrentBowlerImage()" 
                            [src]="getCurrentBowlerImage()"
                            class="w-14 h-14 rounded-full object-cover border-3 border-green-400"
                          >
                          <div *ngIf="!getCurrentBowlerImage()" class="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center border-3 border-green-400">
                            <span class="text-xl">⚾</span>
                          </div>
                          <span class="font-semibold text-green-300 text-xl">{{ getCurrentBowlerName() }}</span>
                          <span class="text-white text-xl">{{ getCurrentBowlerFigures() }}</span>
                          <span class="text-gray-400 text-lg">({{ getCurrentBowlerOvers() }})</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-base text-gray-500">This Over:</span>
                          <ng-container *ngFor="let ball of getCurrentOverBalls()">
                            <div 
                              class="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold"
                              [ngClass]="getBallColorClass(ball)"
                            >{{ ball.display === '0' ? '•' : ball.display }}</div>
                          </ng-container>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Bowling Header -->
                    <div class="grid grid-cols-12 gap-1 px-5 py-3 bg-gray-900/80 text-base text-gray-400 uppercase">
                      <div class="col-span-5">Bowler</div>
                      <div class="col-span-2 text-center">O</div>
                      <div class="col-span-2 text-center">R</div>
                      <div class="col-span-1 text-center">W</div>
                      <div class="col-span-2 text-center">Econ</div>
                    </div>
                    
                    <!-- Bowling Rows -->
                    <div class="flex-1 overflow-hidden">
                      <ng-container *ngFor="let bowler of getBowlingStats()">
                        <div 
                          class="grid grid-cols-12 gap-1 px-5 py-3 border-b border-gray-700/30 text-lg"
                          [ngClass]="{'bg-green-900/20': isCurrentBowler(bowler)}"
                        >
                          <div class="col-span-5 flex items-center gap-3 truncate" [ngClass]="{'text-green-300 font-semibold': isCurrentBowler(bowler)}">
                            <img 
                              *ngIf="getBowlerImage(bowler)" 
                              [src]="getBowlerImage(bowler)"
                              class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              [ngClass]="{
                                'border-2 border-green-400': isCurrentBowler(bowler),
                                'border border-gray-600': !isCurrentBowler(bowler)
                              }"
                            >
                            <div *ngIf="!getBowlerImage(bowler)" 
                              class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                              [ngClass]="{
                                'border-2 border-green-400': isCurrentBowler(bowler),
                                'border border-gray-600': !isCurrentBowler(bowler)
                              }">
                              <span class="text-base">⚾</span>
                            </div>
                            <span class="truncate">
                              {{ getBowlerName(bowler) }}
                            </span>
                            <span *ngIf="getBestBowler()?.player === bowler.player" class="text-yellow-400 ml-1 flex-shrink-0">🎯</span>
                          </div>
                          <div class="col-span-2 text-center">{{ getBowlerOversDisplay(bowler) }}</div>
                          <div class="col-span-2 text-center">{{ bowler.runs || 0 }}</div>
                          <div class="col-span-1 text-center font-bold text-green-400 text-xl">{{ bowler.wickets || 0 }}</div>
                          <div class="col-span-2 text-center text-gray-300">{{ getBowlerEconomy(bowler) }}</div>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                  
                  <!-- Stats Cards Row -->
                  <div class="grid grid-cols-4 gap-3">
                    <div class="bg-gray-800/80 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div class="text-green-400 text-2xl font-bold">{{ getTotalFours() }}</div>
                      <div class="text-gray-500 text-sm uppercase">Fours</div>
                    </div>
                    <div class="bg-gray-800/80 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div class="text-purple-400 text-2xl font-bold">{{ getTotalSixes() }}</div>
                      <div class="text-gray-500 text-sm uppercase">Sixes</div>
                    </div>
                    <div class="bg-gray-800/80 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div class="text-gray-300 text-2xl font-bold">{{ getDotBallsPercentage() }}%</div>
                      <div class="text-gray-500 text-sm uppercase">Dots</div>
                    </div>
                    <div class="bg-gray-800/80 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div class="text-yellow-400 text-2xl font-bold">{{ getTotalExtras() }}</div>
                      <div class="text-gray-500 text-sm uppercase">Extras</div>
                    </div>
                  </div>
                  
                  <!-- Fall of Wickets -->
                  <div *ngIf="getFallOfWickets().length > 0" class="bg-gray-800/60 rounded-lg px-4 py-3 backdrop-blur-sm">
                    <div class="text-sm text-gray-500 uppercase mb-2">Fall of Wickets</div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span *ngFor="let fow of getFallOfWickets()" class="text-gray-300">
                        {{ fow.wicketNumber }}-{{ fow.runs }}
                        <span class="text-gray-500">({{ getShortPlayerName(fow.player) }})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Bar (if chasing) -->
            <div *ngIf="match.currentInnings === 1" class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
              <div class="max-w-7xl mx-auto px-4 py-3">
                <div class="flex items-center justify-center gap-10 text-lg">
                  <span class="text-gray-400">Target: <span class="text-white font-bold text-xl">{{ getTarget() }}</span></span>
                  <span class="text-gray-400">Need: <span class="text-yellow-400 font-bold text-xl">{{ getRunsNeeded() }}</span> from <span class="text-yellow-400 font-bold text-xl">{{ getBallsRemaining() }}</span> balls</span>
                  <span class="text-gray-400">RRR: <span class="text-orange-400 font-bold text-xl">{{ getRequiredRunRate() }}</span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- ==================== MATCH SUMMARY VIEW (Side-by-Side Full Scorecard) ==================== -->
          <div *ngIf="displayView === 'final-match-summary'" class="h-full flex flex-col">
            
            <!-- Top Header Bar (matches score-summary style) -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <div class="max-w-7xl mx-auto px-10 py-6">
                <div class="flex items-center justify-between">
                  <!-- Left: Live/Completed Badge -->
                  <div *ngIf="match.status === 'live'" class="flex items-center gap-3 bg-red-600 px-5 py-2.5 rounded-full">
                    <span class="w-3.5 h-3.5 bg-white rounded-full animate-pulse"></span>
                    <span class="text-base font-bold uppercase tracking-wider">Live</span>
                  </div>
                  <div *ngIf="match.status === 'completed'" class="flex items-center gap-3 bg-green-600 px-5 py-2.5 rounded-full">
                    <span class="text-base font-bold uppercase tracking-wider">Completed</span>
                  </div>
                  <div *ngIf="match.status !== 'live' && match.status !== 'completed'" class="flex items-center gap-3 bg-gray-600 px-5 py-2.5 rounded-full">
                    <span class="text-base font-bold uppercase tracking-wider">{{ match.status }}</span>
                  </div>
                  
                  <!-- Center: Match Title -->
                  <div class="text-center">
                    <h1 class="text-3xl font-bold tracking-wide">
                      <span class="text-blue-400">{{ getTeamName(match.innings[0]?.battingTeam) }}</span>
                      <span class="text-gray-500 mx-3">vs</span>
                      <span class="text-gray-300">{{ getTeamName(match.innings[1]?.battingTeam || match.innings[0]?.bowlingTeam) }}</span>
                    </h1>
                    <p class="text-base text-gray-500 mt-1">{{ match.format }} Match • {{ getInningsLabel() }}</p>
                  </div>
                  
                  <!-- Right: Format Badge -->
                  <div class="bg-gray-700/50 px-8 py-3 rounded-lg text-xl font-semibold">
                    {{ match.format }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content - Two Teams Side by Side -->
            <div class="flex-1 flex overflow-hidden p-3">
              <div class="flex-1 grid grid-cols-2 gap-4 w-full">
                
                <!-- ===== LEFT COLUMN: First Innings ===== -->
                <div class="flex flex-col bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-xl backdrop-blur-sm border border-gray-700/50 overflow-hidden">
                  
                  <!-- Team Header with Score -->
                  <div class="bg-gradient-to-r from-yellow-600/30 to-yellow-700/20 px-6 py-3 border-b border-yellow-500/30">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <img 
                          *ngIf="getTeamFlag(match.innings[0]?.battingTeam)"
                          [src]="getTeamFlag(match.innings[0]?.battingTeam)"
                          class="w-14 h-10 object-cover rounded shadow border border-white/20"
                        >
                        <span class="text-3xl font-bold text-yellow-300">{{ getTeamName(match.innings[0]?.battingTeam) }}</span>
                      </div>
                      <div class="text-right">
                        <div class="text-6xl font-black text-white">{{ match.innings[0]?.totalRuns || 0 }}<span class="text-gray-400 text-4xl">/</span><span class="text-4xl">{{ match.innings[0]?.totalWickets || 0 }}</span></div>
                        <div class="text-gray-400 text-lg">({{ getInningsOvers(match.innings[0]) }} ov)</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Batting List Header -->
                  <div class="grid grid-cols-12 gap-2 px-5 py-1.5 bg-gray-900/80 text-sm text-gray-500 uppercase border-b border-gray-700/50">
                    <div class="col-span-5">Batsman</div>
                    <div class="col-span-4">Status</div>
                    <div class="col-span-3 text-right">R (B)</div>
                  </div>
                  
                  <!-- All Batsmen List -->
                  <div class="flex-1">
                    <ng-container *ngFor="let batsman of getFullBattingCard(0); let i = index">
                      <div 
                        class="grid grid-cols-12 gap-2 px-5 py-2 border-b border-gray-800/50"
                        [ngClass]="{
                          'bg-yellow-900/20': isBatsmanCurrentlyBatting(batsman, 0),
                          'opacity-50': batsman.isDNB
                        }"
                      >
                        <div class="col-span-5 flex items-center gap-3 min-w-0">
                          <span class="text-gray-600 text-base w-6 flex-shrink-0">{{ i + 1 }}</span>
                          <img 
                            *ngIf="getSummaryBatsmanImage(batsman)"
                            [src]="getSummaryBatsmanImage(batsman)"
                            class="w-11 h-11 rounded-full object-cover flex-shrink-0"
                            [ngClass]="{
                              'border-2 border-yellow-400': isBatsmanCurrentlyBatting(batsman, 0),
                              'border border-gray-600': !isBatsmanCurrentlyBatting(batsman, 0)
                            }"
                          >
                          <div *ngIf="!getSummaryBatsmanImage(batsman)" 
                            class="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                            [ngClass]="{
                              'border-2 border-yellow-400': isBatsmanCurrentlyBatting(batsman, 0),
                              'border border-gray-600': !isBatsmanCurrentlyBatting(batsman, 0)
                            }">
                            <span class="text-lg">🏏</span>
                          </div>
                          <span class="truncate text-2xl font-medium" [ngClass]="{
                            'text-yellow-300 font-semibold': isBatsmanCurrentlyBatting(batsman, 0),
                            'text-gray-400': batsman.isDNB,
                            'text-white': !batsman.isDNB && !isBatsmanCurrentlyBatting(batsman, 0)
                          }">{{ getShortPlayerName(batsman.player) }}</span>
                          <span *ngIf="isBatsmanCurrentlyBatting(batsman, 0)" class="text-yellow-400 text-base flex-shrink-0">*</span>
                        </div>
                        <div class="col-span-4 text-lg truncate flex items-center" [ngClass]="{
                          'text-gray-600 italic': batsman.isDNB,
                          'text-green-400': !batsman.isOut && !batsman.isDNB,
                          'text-red-400': batsman.isOut
                        }">
                          {{ getSummaryDismissal(batsman) }}
                        </div>
                        <div class="col-span-3 text-right flex items-center justify-end">
                          <ng-container *ngIf="!batsman.isDNB">
                            <span class="font-bold text-white text-3xl">{{ batsman.runs || 0 }}</span>
                            <span class="text-gray-500 text-base ml-1">({{ batsman.balls || 0 }})</span>
                          </ng-container>
                          <span *ngIf="batsman.isDNB" class="text-gray-600 text-lg">-</span>
                        </div>
                      </div>
                    </ng-container>
                    
                    <!-- Extras Row -->
                    <div class="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-800/50">
                      <div class="col-span-5 text-gray-400 text-xl">Extras</div>
                      <div class="col-span-4 text-lg text-gray-500">{{ getExtrasBreakdownForInnings(0) }}</div>
                      <div class="col-span-3 text-right font-bold text-yellow-400 text-3xl">{{ getSummaryExtras(0) }}</div>
                    </div>
                  </div>
                  
                  <!-- Bowling Summary -->
                  <div class="border-t border-gray-700/50 px-5 py-3 bg-gray-900/60">
                    <div class="text-sm text-gray-500 uppercase mb-2">Bowling</div>
                    <div class="flex flex-wrap gap-x-5 gap-y-1 text-lg">
                      <ng-container *ngFor="let bowler of getSummaryBowlers(0, 5)">
                        <span class="text-gray-300">
                          {{ getShortPlayerName(bowler.player) }} 
                          <span class="text-cyan-400 font-semibold">{{ bowler.wickets }}-{{ bowler.runs }}</span>
                          <span class="text-gray-500">({{ getBowlerOversDisplay(bowler) }})</span>
                        </span>
                      </ng-container>
                    </div>
                  </div>
                </div>

                <!-- ===== RIGHT COLUMN: Second Innings ===== -->
                <div class="flex flex-col bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-xl backdrop-blur-sm border border-gray-700/50 overflow-hidden"
                     [ngClass]="{'opacity-40': !match.innings[1]}">
                  
                  <!-- Team Header with Score -->
                  <div class="bg-gradient-to-r from-cyan-600/30 to-cyan-700/20 px-6 py-3 border-b border-cyan-500/30">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <img 
                          *ngIf="getTeamFlag(match.innings[1]?.battingTeam || match.innings[0]?.bowlingTeam)"
                          [src]="getTeamFlag(match.innings[1]?.battingTeam || match.innings[0]?.bowlingTeam)"
                          class="w-14 h-10 object-cover rounded shadow border border-white/20"
                        >
                        <span class="text-3xl font-bold text-cyan-300">{{ getTeamName(match.innings[1]?.battingTeam || match.innings[0]?.bowlingTeam) }}</span>
                      </div>
                      <div class="text-right">
                        <div *ngIf="match.innings[1]" class="text-6xl font-black text-white">{{ match.innings[1]?.totalRuns || 0 }}<span class="text-gray-400 text-4xl">/</span><span class="text-4xl">{{ match.innings[1]?.totalWickets || 0 }}</span></div>
                        <div *ngIf="match.innings[1]" class="text-gray-400 text-lg">({{ getInningsOvers(match.innings[1]) }} ov)</div>
                        <div *ngIf="!match.innings[1]" class="text-gray-500 text-2xl">Yet to bat</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Batting List Header -->
                  <div class="grid grid-cols-12 gap-2 px-5 py-1.5 bg-gray-900/80 text-sm text-gray-500 uppercase border-b border-gray-700/50">
                    <div class="col-span-5">Batsman</div>
                    <div class="col-span-4">Status</div>
                    <div class="col-span-3 text-right">R (B)</div>
                  </div>
                  
                  <!-- All Batsmen List (2nd Innings) -->
                  <div class="flex-1">
                    <ng-container *ngIf="match.innings[1]">
                      <ng-container *ngFor="let batsman of getFullBattingCard(1); let i = index">
                        <div 
                          class="grid grid-cols-12 gap-2 px-5 py-2 border-b border-gray-800/50"
                          [ngClass]="{
                            'bg-cyan-900/20': isBatsmanCurrentlyBatting(batsman, 1),
                            'opacity-50': batsman.isDNB
                          }"
                        >
                          <div class="col-span-5 flex items-center gap-3 min-w-0">
                            <span class="text-gray-600 text-base w-6 flex-shrink-0">{{ i + 1 }}</span>
                            <img 
                              *ngIf="getSummaryBatsmanImage(batsman)"
                              [src]="getSummaryBatsmanImage(batsman)"
                              class="w-11 h-11 rounded-full object-cover flex-shrink-0"
                              [ngClass]="{
                                'border-2 border-cyan-400': isBatsmanCurrentlyBatting(batsman, 1),
                                'border border-gray-600': !isBatsmanCurrentlyBatting(batsman, 1)
                              }"
                            >
                            <div *ngIf="!getSummaryBatsmanImage(batsman)" 
                              class="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"
                              [ngClass]="{
                                'border-2 border-cyan-400': isBatsmanCurrentlyBatting(batsman, 1),
                                'border border-gray-600': !isBatsmanCurrentlyBatting(batsman, 1)
                              }">
                              <span class="text-lg">🏏</span>
                            </div>
                            <span class="truncate text-2xl font-medium" [ngClass]="{
                              'text-cyan-300 font-semibold': isBatsmanCurrentlyBatting(batsman, 1),
                              'text-gray-400': batsman.isDNB,
                              'text-white': !batsman.isDNB && !isBatsmanCurrentlyBatting(batsman, 1)
                            }">{{ getShortPlayerName(batsman.player) }}</span>
                            <span *ngIf="isBatsmanCurrentlyBatting(batsman, 1)" class="text-cyan-400 text-base flex-shrink-0">*</span>
                          </div>
                          <div class="col-span-4 text-lg truncate flex items-center" [ngClass]="{
                            'text-gray-600 italic': batsman.isDNB,
                            'text-green-400': !batsman.isOut && !batsman.isDNB,
                            'text-red-400': batsman.isOut
                          }">
                            {{ getSummaryDismissal(batsman) }}
                          </div>
                          <div class="col-span-3 text-right flex items-center justify-end">
                            <ng-container *ngIf="!batsman.isDNB">
                              <span class="font-bold text-white text-3xl">{{ batsman.runs || 0 }}</span>
                              <span class="text-gray-500 text-base ml-1">({{ batsman.balls || 0 }})</span>
                            </ng-container>
                            <span *ngIf="batsman.isDNB" class="text-gray-600 text-lg">-</span>
                          </div>
                        </div>
                      </ng-container>
                      
                      <!-- Extras Row -->
                      <div class="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-800/50">
                        <div class="col-span-5 text-gray-400 text-xl">Extras</div>
                        <div class="col-span-4 text-lg text-gray-500">{{ getExtrasBreakdownForInnings(1) }}</div>
                        <div class="col-span-3 text-right font-bold text-yellow-400 text-3xl">{{ getSummaryExtras(1) }}</div>
                      </div>
                    </ng-container>
                    
                    <!-- Placeholder when 2nd innings hasn't started -->
                    <div *ngIf="!match.innings[1]" class="flex-1 flex items-center justify-center py-8">
                      <div class="text-center text-gray-500">
                        <div class="text-5xl mb-3">🏏</div>
                        <div class="text-xl">Innings not started</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Bowling Summary (2nd Innings) -->
                  <div *ngIf="match.innings[1]" class="border-t border-gray-700/50 px-5 py-3 bg-gray-900/60">
                    <div class="text-sm text-gray-500 uppercase mb-2">Bowling</div>
                    <div class="flex flex-wrap gap-x-5 gap-y-1 text-lg">
                      <ng-container *ngFor="let bowler of getSummaryBowlers(1, 5)">
                        <span class="text-gray-300">
                          {{ getShortPlayerName(bowler.player) }} 
                          <span class="text-cyan-400 font-semibold">{{ bowler.wickets }}-{{ bowler.runs }}</span>
                          <span class="text-gray-500">({{ getBowlerOversDisplay(bowler) }})</span>
                        </span>
                      </ng-container>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Bar: Match Status / Chase Info -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
              <div class="w-full px-10 py-5">
                <!-- Match Completed Result -->
                <div *ngIf="match.status === 'completed'" class="text-center">
                  <div class="text-5xl font-bold">
                    <span *ngIf="match.result?.winner" class="text-white">{{ getTeamName(match.result.winner) }}</span>
                    <span *ngIf="match.result?.winner" class="text-green-400"> won by {{ match.result.winMargin }}</span>
                    <span *ngIf="!match.result?.winner" class="text-yellow-400">{{ match.result?.winMargin || 'Match Tied' }}</span>
                  </div>
                </div>
                
                <!-- Chase Equation (2nd innings in progress) -->
                <div *ngIf="match.status !== 'completed' && match.currentInnings === 1" class="flex items-center justify-center">
                  <div class="text-3xl">
                    <span class="text-gray-400">{{ getTeamName(match.innings[1]?.battingTeam) }} need </span>
                    <span class="text-yellow-400 font-black text-6xl">{{ getRunsNeeded() }}</span>
                    <span class="text-gray-400"> from </span>
                    <span class="text-yellow-400 font-black text-6xl">{{ getBallsRemaining() }}</span>
                    <span class="text-gray-400"> balls</span>
                  </div>
                </div>
                
                <!-- First Innings in Progress -->
                <div *ngIf="match.status !== 'completed' && match.currentInnings === 0" class="flex items-center justify-center">
                  <div class="text-3xl text-gray-400">
                    {{ getTeamName(match.innings[0]?.bowlingTeam) }} to bat next
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ==================== PROJECTIONS VIEW ==================== -->
          <div *ngIf="displayView === 'run-rate-graph'" class="h-full flex flex-row p-4 gap-4 overflow-hidden">
            
            <!-- Left Side: Graph (takes ~75% of width) -->
            <div class="flex-1 flex flex-col min-w-0">
              <!-- Title -->
              <div class="text-center mb-3">
                <h1 class="text-2xl font-bold uppercase tracking-wider text-cyan-400">Scoring Comparison</h1>
                <div class="flex justify-center gap-6 mt-2">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-4 bg-cyan-500 rounded"></div>
                    <span class="text-gray-300 text-sm">{{ getFirstInningsTeamName() }}</span>
                  </div>
                  <div *ngIf="match.innings && match.innings.length > 1" class="flex items-center gap-2">
                    <div class="w-8 h-4 bg-orange-500 rounded"></div>
                    <span class="text-gray-300 text-sm">{{ getSecondInningsTeamName() }}</span>
                  </div>
                </div>
              </div>

              <!-- Large Graph Container -->
              <div class="flex-1 bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-xl p-4 backdrop-blur-sm">
                <div class="w-full h-full">
                  <svg class="w-full h-full" viewBox="0 0 700 400" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#374151" stroke-width="0.5"/>
                      </pattern>
                      <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#0891b2;stop-opacity:1" />
                      </linearGradient>
                      <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#ea580c;stop-opacity:1" />
                      </linearGradient>
                      <linearGradient id="cyanFill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:0.05" />
                      </linearGradient>
                      <linearGradient id="orangeFill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#f97316;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:#f97316;stop-opacity:0.05" />
                      </linearGradient>
                    </defs>
                    
                    <!-- Grid background -->
                    <rect width="620" height="320" x="60" y="30" fill="url(#grid)"/>
                    
                    <!-- Y-axis labels (Runs) -->
                    <text *ngFor="let label of getYAxisLabels()" x="55" [attr.y]="350 - (label * getYScale())" class="fill-gray-400" style="font-size: 13px" text-anchor="end">
                      {{ label }}
                    </text>
                    
                    <!-- X-axis labels (Overs) -->
                    <text *ngFor="let over of getOversAxisLabels()" [attr.x]="60 + (over * getXScale())" y="375" class="fill-gray-400" style="font-size: 13px" text-anchor="middle">
                      {{ over }}
                    </text>
                    
                    <!-- First innings area fill -->
                    <polygon 
                      *ngIf="getFirstInningsData().length > 0"
                      [attr.points]="getFirstInningsAreaPoints()"
                      fill="url(#cyanFill)"
                    />
                    
                    <!-- First innings line -->
                    <polyline 
                      *ngIf="getFirstInningsData().length > 0"
                      [attr.points]="getFirstInningsLinePointsXL()"
                      fill="none" 
                      stroke="url(#cyanGradient)" 
                      stroke-width="4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <!-- First innings points -->
                    <circle 
                      *ngFor="let point of getFirstInningsData()"
                      [attr.cx]="60 + (point.over * getXScale())" 
                      [attr.cy]="350 - (point.runs * getYScale())"
                      r="6"
                      fill="#06b6d4"
                      stroke="#fff"
                      stroke-width="2"
                    />

                    <!-- Second innings area fill -->
                    <polygon 
                      *ngIf="getSecondInningsData().length > 0"
                      [attr.points]="getSecondInningsAreaPoints()"
                      fill="url(#orangeFill)"
                    />
                    
                    <!-- Second innings line -->
                    <polyline 
                      *ngIf="getSecondInningsData().length > 0"
                      [attr.points]="getSecondInningsLinePointsXL()"
                      fill="none" 
                      stroke="url(#orangeGradient)" 
                      stroke-width="4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <!-- Second innings points -->
                    <circle 
                      *ngFor="let point of getSecondInningsData()"
                      [attr.cx]="60 + (point.over * getXScale())" 
                      [attr.cy]="350 - (point.runs * getYScale())"
                      r="6"
                      fill="#f97316"
                      stroke="#fff"
                      stroke-width="2"
                    />

                    <!-- Target line (if chasing) -->
                    <line 
                      *ngIf="match.currentInnings === 1 && getTarget() > 0"
                      x1="60" 
                      [attr.y1]="350 - (getTarget() * getYScale())" 
                      x2="680" 
                      [attr.y1]="350 - (getTarget() * getYScale())"
                      [attr.y2]="350 - (getTarget() * getYScale())"
                      stroke="#ef4444"
                      stroke-width="2"
                      stroke-dasharray="8,4"
                    />
                    <text 
                      *ngIf="match.currentInnings === 1 && getTarget() > 0"
                      x="685" 
                      [attr.y]="350 - (getTarget() * getYScale()) + 4" 
                      class="fill-red-400" 
                      style="font-size: 11px"
                    >Target</text>

                    <!-- Axis labels -->
                    <text x="370" y="395" class="fill-gray-400" style="font-size: 14px; font-weight: 600" text-anchor="middle">OVERS</text>
                    <text x="20" y="190" class="fill-gray-400" style="font-size: 14px; font-weight: 600" text-anchor="middle" transform="rotate(-90, 20, 190)">RUNS</text>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Right Side: Stats Panel (takes ~25% of width) -->
            <div class="w-72 flex flex-col gap-3">
              
              <!-- Current Score Card -->
              <div class="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Score</div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-10 h-7 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center text-xs font-bold">
                      {{ getBattingTeamCode() }}
                    </div>
                    <span class="text-sm text-gray-300">{{ getBattingTeamName() }}</span>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-black">{{ currentInnings?.totalRuns || 0 }}/{{ currentInnings?.totalWickets || 0 }}</div>
                    <div class="text-xs text-gray-500">({{ getOversDisplay() }} ov)</div>
                  </div>
                </div>
              </div>

              <!-- Run Rates Card -->
              <div class="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-xs text-gray-500 uppercase">Current RR</div>
                    <div class="text-2xl font-bold text-cyan-400">{{ getCurrentRunRate() }}</div>
                  </div>
                  <div *ngIf="match.currentInnings === 1" class="text-center">
                    <div class="text-xs text-gray-500 uppercase">Required RR</div>
                    <div class="text-2xl font-bold text-orange-400">{{ getRequiredRunRate() }}</div>
                  </div>
                  <div *ngIf="match.currentInnings !== 1" class="text-center">
                    <div class="text-xs text-gray-500 uppercase">Projected</div>
                    <div class="text-2xl font-bold text-green-400">{{ getProjectedScore() }}</div>
                  </div>
                </div>
              </div>

              <!-- Chase Info (if 2nd innings) -->
              <div *ngIf="match.currentInnings === 1" class="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-4 backdrop-blur-sm border border-yellow-700/30">
                <div class="text-xs text-yellow-400 uppercase tracking-wider mb-3">Chase Equation</div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Runs Needed</span>
                    <span class="text-xl font-bold text-yellow-400">{{ getRunsNeeded() }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Balls Left</span>
                    <span class="text-xl font-bold text-gray-200">{{ getBallsRemaining() }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Overs Left</span>
                    <span class="text-lg font-bold text-gray-300">{{ getOversRemaining() }}</span>
                  </div>
                </div>
              </div>

              <!-- 1st Innings Stats (if first innings) -->
              <div *ngIf="match.currentInnings !== 1" class="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Match Stats</div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Overs</span>
                    <span class="text-lg font-bold text-gray-200">{{ getOversDisplay() }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Wickets</span>
                    <span class="text-lg font-bold text-red-400">{{ currentInnings?.totalWickets || 0 }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Boundaries</span>
                    <span class="text-lg font-bold">
                      <span class="text-green-400">{{ getTotalFours() }}</span>
                      <span class="text-gray-600 mx-1">/</span>
                      <span class="text-purple-400">{{ getTotalSixes() }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Win Probability (if chasing) -->
              <div *ngIf="match.currentInnings === 1" class="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Win Probability</div>
                <div class="space-y-3">
                  <!-- Chasing Team -->
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-300">{{ getSecondBattingTeamName() }}</span>
                    <span class="text-xl font-bold text-cyan-400">{{ getWinProbability() }}%</span>
                  </div>
                  <!-- Progress Bar -->
                  <div class="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                      [style.width.%]="getWinProbability()"
                    ></div>
                  </div>
                  <!-- Defending Team -->
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-300">{{ getFirstBattingTeamName() }}</span>
                    <span class="text-xl font-bold text-orange-400">{{ 100 - getWinProbability() }}%</span>
                  </div>
                </div>
              </div>

              <!-- Match Info Footer -->
              <div class="mt-auto bg-gray-900/80 rounded-lg px-3 py-2 text-center">
                <span class="text-xs text-gray-500">{{ match.format }} Match • {{ getInningsLabel() }}</span>
              </div>
            </div>
          </div>

          <!-- View Indicator -->
          <div class="fixed bottom-4 right-4 bg-black/50 px-3 py-1 rounded text-xs text-gray-400 backdrop-blur-sm">
            {{ getViewName() }}
          </div>

          <!-- ==================== PARTNERSHIP VIEW ==================== -->
          <div *ngIf="displayView === 'current-partnership'" class="h-full flex flex-col relative">
            
            <!-- Player Image Overlays (like flag overlays) -->
            <div class="absolute inset-0 z-0 pointer-events-none">
              <!-- Striker Image (Left Side) -->
              <div 
                *ngIf="getStrikerImage()" 
                class="absolute left-0 top-0 h-full w-1/2 flex items-start justify-start overflow-hidden"
              >
                <img 
                  [src]="getStrikerImage()"
                  class="h-full w-auto object-cover object-top opacity-50"
                  style="filter: grayscale(20%); mix-blend-mode: normal;"
                >
              </div>
              
              <!-- Non-Striker Image (Right Side) -->
              <div 
                *ngIf="getNonStrikerImage()" 
                class="absolute right-0 top-0 h-full w-1/2 flex items-start justify-end overflow-hidden"
              >
                <img 
                  [src]="getNonStrikerImage()"
                  class="h-full w-auto object-cover object-top opacity-50"
                  style="filter: grayscale(20%); mix-blend-mode: normal; transform: scaleX(-1);"
                >
              </div>
              
              <!-- Center gradient overlay for better text readability -->
              <div class="absolute inset-0" style="background: linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.5) 100%);"></div>
            </div>

            <!-- Top Header Bar -->
            <div class="relative z-10 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <div class="max-w-6xl mx-auto px-6 py-3">
                <div class="flex items-center justify-between">
                  <!-- Match Info -->
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                      <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      <span class="text-xs font-bold uppercase tracking-wider">Live</span>
                    </div>
                    <div>
                      <h1 class="text-lg font-bold tracking-wide">
                        <span class="text-blue-400">{{ getBattingTeamName() }}</span>
                        <span class="text-gray-500 mx-2">vs</span>
                        <span class="text-gray-300">{{ getBowlingTeamName() }}</span>
                      </h1>
                      <p class="text-xs text-gray-500">{{ match.format }} Match • {{ getInningsLabel() }}</p>
                    </div>
                  </div>
                  
                  <!-- Score Display -->
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-lg font-bold">
                      {{ getBattingTeamCode() }}
                    </div>
                    <div class="text-4xl font-black">{{ currentInnings?.totalRuns || 0 }}/{{ currentInnings?.totalWickets || 0 }}</div>
                    <div class="text-gray-400 text-lg">({{ getOversDisplay() }} ov)</div>
                  </div>
                  
                  <!-- Partnership Label -->
                  <div class="bg-yellow-600/80 px-4 py-2 rounded-lg">
                    <div class="text-xs uppercase tracking-wider text-yellow-200">Partnership</div>
                    <div class="text-2xl font-black text-white">{{ getPartnershipRuns() }} <span class="text-lg font-normal text-yellow-200">({{ getPartnershipBalls() }})</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content - Two Player Cards Side by Side -->
            <div class="relative z-10 flex-1 flex items-center justify-center px-8 py-6">
              <div class="w-full max-w-6xl grid grid-cols-2 gap-8">
                
                <!-- STRIKER (Left Side) -->
                <div class="bg-gradient-to-br from-yellow-900/80 via-yellow-950/80 to-gray-900/80 backdrop-blur-md rounded-2xl p-8 border-2 border-yellow-500/50 shadow-2xl">
                  
                  <!-- Striker Badge -->
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                      <span class="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></span>
                      <span class="text-yellow-400 text-xl font-bold uppercase tracking-wider">Striker</span>
                    </div>
                    <div class="bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/40">
                      <span class="text-yellow-300 text-sm font-semibold">On Strike</span>
                    </div>
                  </div>
                  
                  <!-- Player Info -->
                  <div class="flex items-center gap-6 mb-8">
                    <div class="relative">
                      <img 
                        *ngIf="getStrikerImage()" 
                        [src]="getStrikerImage()"
                        class="w-28 h-28 rounded-full object-cover border-4 border-yellow-400 shadow-xl"
                      >
                      <div *ngIf="!getStrikerImage()" class="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-yellow-400">
                        <span class="text-5xl">🏏</span>
                      </div>
                    </div>
                    <div>
                      <div class="text-4xl font-black text-white mb-2">{{ getPlayerName(currentInnings?.currentBatsmen?.striker) }}</div>
                      <div class="text-gray-400 text-lg">{{ getStrikerBattingStyle() }}</div>
                    </div>
                  </div>
                  
                  <!-- Big Score -->
                  <div class="text-center mb-8">
                    <div class="text-8xl font-black text-white" style="text-shadow: 0 4px 20px rgba(234, 179, 8, 0.4);">{{ getStrikerRuns() }}</div>
                    <div class="text-3xl text-gray-400 mt-2">{{ getStrikerBalls() }} balls</div>
                  </div>
                  
                  <!-- Stats Grid -->
                  <div class="grid grid-cols-4 gap-4">
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-green-400 text-3xl font-bold">{{ getStrikerStats()?.fours || 0 }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">Fours</div>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-purple-400 text-3xl font-bold">{{ getStrikerStats()?.sixes || 0 }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">Sixes</div>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-cyan-400 text-3xl font-bold">{{ getStrikerSR() }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">SR</div>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-gray-300 text-3xl font-bold">{{ getStrikerDots() }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">Dots</div>
                    </div>
                  </div>
                </div>

                <!-- NON-STRIKER (Right Side) -->
                <div class="bg-gradient-to-br from-gray-800/80 via-gray-850/80 to-gray-900/80 backdrop-blur-md rounded-2xl p-8 border-2 border-gray-600/50 shadow-2xl">
                  
                  <!-- Non-Striker Badge -->
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                      <span class="w-4 h-4 bg-gray-500 rounded-full"></span>
                      <span class="text-gray-400 text-xl font-bold uppercase tracking-wider">Non-Striker</span>
                    </div>
                    <div class="bg-gray-600/20 px-3 py-1 rounded-full border border-gray-500/40">
                      <span class="text-gray-400 text-sm font-semibold">Waiting</span>
                    </div>
                  </div>
                  
                  <!-- Player Info -->
                  <div class="flex items-center gap-6 mb-8">
                    <div class="relative">
                      <img 
                        *ngIf="getNonStrikerImage()" 
                        [src]="getNonStrikerImage()"
                        class="w-28 h-28 rounded-full object-cover border-4 border-gray-500 shadow-xl opacity-90"
                      >
                      <div *ngIf="!getNonStrikerImage()" class="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-500">
                        <span class="text-5xl">🏏</span>
                      </div>
                    </div>
                    <div>
                      <div class="text-4xl font-black text-gray-200 mb-2">{{ getPlayerName(currentInnings?.currentBatsmen?.nonStriker) }}</div>
                      <div class="text-gray-500 text-lg">{{ getNonStrikerBattingStyle() }}</div>
                    </div>
                  </div>
                  
                  <!-- Big Score -->
                  <div class="text-center mb-8">
                    <div class="text-8xl font-black text-gray-300">{{ getNonStrikerRuns() }}</div>
                    <div class="text-3xl text-gray-500 mt-2">{{ getNonStrikerBalls() }} balls</div>
                  </div>
                  
                  <!-- Stats Grid -->
                  <div class="grid grid-cols-4 gap-4">
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-green-400 text-3xl font-bold">{{ getNonStrikerStats()?.fours || 0 }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">Fours</div>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-purple-400 text-3xl font-bold">{{ getNonStrikerStats()?.sixes || 0 }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">Sixes</div>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-cyan-400 text-3xl font-bold">{{ getNonStrikerSR() }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">SR</div>
                    </div>
                    <div class="bg-black/40 rounded-xl p-4 text-center">
                      <div class="text-gray-300 text-3xl font-bold">{{ getNonStrikerDots() }}</div>
                      <div class="text-gray-500 text-sm uppercase mt-1">Dots</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Stats Bar -->
            <div class="relative z-10 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
              <div class="max-w-6xl mx-auto px-6 py-4">
                <div class="flex items-center justify-between">
                  
                  <!-- Current Bowler -->
                  <div class="flex items-center gap-4">
                    <img 
                      *ngIf="getCurrentBowlerImage()" 
                      [src]="getCurrentBowlerImage()"
                      class="w-16 h-16 rounded-full object-cover border-3 border-green-500"
                    >
                    <div *ngIf="!getCurrentBowlerImage()" class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-3 border-green-500">
                      <span class="text-2xl">⚾</span>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500 uppercase">Bowling</div>
                      <div class="font-semibold text-xl">{{ getCurrentBowlerName() }}</div>
                      <div class="text-gray-400">{{ getCurrentBowlerFullFigures() }}</div>
                    </div>
                  </div>

                  <!-- This Over -->
                  <div class="flex items-center gap-3">
                    <span class="text-base text-gray-500 uppercase mr-2">This Over</span>
                    <ng-container *ngFor="let ball of getCurrentOverBalls()">
                      <div 
                        class="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shadow-md"
                        [ngClass]="getBallColorClass(ball)"
                      >
                        {{ ball.display === '0' ? '•' : ball.display }}
                      </div>
                    </ng-container>
                    <ng-container *ngFor="let i of getRemainingBallsInOver()">
                      <div class="w-10 h-10 rounded-full border-2 border-gray-600 border-dashed"></div>
                    </ng-container>
                  </div>

                  <!-- Run Rates -->
                  <div class="flex items-center gap-8 text-lg">
                    <div>
                      <span class="text-gray-500">CRR </span>
                      <span class="text-2xl font-bold text-green-400">{{ getCurrentRunRate() }}</span>
                    </div>
                    <div *ngIf="match.currentInnings === 1">
                      <span class="text-gray-500">RRR </span>
                      <span class="text-2xl font-bold text-orange-400">{{ getRequiredRunRate() }}</span>
                    </div>
                    <div *ngIf="match.currentInnings === 1" class="pl-6 border-l border-gray-600">
                      <span class="text-gray-500">Need </span>
                      <span class="text-yellow-400 font-bold text-xl">{{ getRunsNeeded() }}</span>
                      <span class="text-gray-500"> from </span>
                      <span class="text-yellow-400 font-bold text-xl">{{ getBallsRemaining() }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MatchDisplayComponent implements OnInit, OnDestroy {
  matchId: string = '';
  match: any = null;
  loading = true;
  error = '';
  displayView = 'live-score';
  currentBackground: { type: string; url: string | null } | null = null;
  
  // Flag overlay properties
  showFlagOverlays = false;  // True when using default background (not match-specific)
  defaultBackgrounds: any = {};  // Default backgrounds from settings
  battingTeamFlagVideo: string | null = null;
  bowlingTeamFlagVideo: string | null = null;
  
  // Notification overlay properties
  showNotification = false;
  notificationType: 'six' | 'four' | 'wicket' | 'third-umpire' | 'custom-message' | null = null;
  notificationData: any = null;
  notificationDuration = 10000; // 10 seconds (configurable)
  private notificationTimeout: any = null;
  
  // Third Umpire properties
  thirdUmpireDecision: 'out' | 'not-out' | null = null;
  
  // Custom Message properties
  customMessage: string = '';
  
  private eventSource: EventSource | null = null;
  
  // SSE connection state
  isConnected = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: any = null;
  private lastHeartbeat = Date.now();
  private heartbeatCheckInterval: any = null;
  
  // Version tracking for sync verification
  private serverVersion = 0;
  private lastKnownVersion = 0;
  private syncCheckInterval: any = null;
  private readonly SYNC_CHECK_INTERVAL = 30000; // Check sync every 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 25000; // Expect heartbeat within 25s (server sends every 15s)

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private playerCacheService: PlayerCacheService,
    private calcService: MatchCalculationsService,
    private teamService: TeamDisplayService,
    private dismissalService: DismissalFormatterService
  ) {}

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    if (this.matchId) {
      this.loadDefaultBackgrounds();
      this.loadMatch();
      this.connectSSE();
    } else {
      this.error = 'Invalid match ID';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.disconnectSSE();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
    }
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
    }
  }

  loadMatch() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'live-score';
          this.buildPlayerNameCache();
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
    this.http.get<{ success: boolean; data: any }>('/api/settings/backgrounds').subscribe({
      next: (response) => {
        if (response.success) {
          this.defaultBackgrounds = response.data;
          this.updateBackground();
        }
      },
      error: (err) => {
        console.error('Error loading default backgrounds:', err);
      }
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
    const viewKey = this.displayView;
    const matchViews = this.match?.backgrounds?.views;
    const matchBackground = matchViews ? matchViews[viewKey] : null;
    
    // Priority 1: Match-specific background (no flag overlay)
    if (matchBackground?.type !== 'none' && matchBackground?.url) {
      this.currentBackground = matchBackground;
      this.showFlagOverlays = false;
      this.battingTeamFlagVideo = null;
      this.bowlingTeamFlagVideo = null;
      return;
    }
    
    // Priority 2: Team background (no flag overlay)
    if (this.match?.backgrounds?.useTeamBackground !== false) {
      const battingTeam = this.currentInnings?.battingTeam;
      if (battingTeam?.background?.type !== 'none' && battingTeam?.background?.url) {
        this.currentBackground = battingTeam.background;
        this.showFlagOverlays = false;
        this.battingTeamFlagVideo = null;
        this.bowlingTeamFlagVideo = null;
        return;
      }
    }
    
    // Priority 3: Default background with flag overlays
    const defaultBg = this.defaultBackgrounds?.[viewKey];
    if (defaultBg?.type !== 'none' && defaultBg?.url) {
      this.currentBackground = defaultBg;
      this.showFlagOverlays = true;
      this.updateFlagOverlays();
      return;
    }
    
    // Fallback: No background, but still show flag overlays if available
    this.currentBackground = { type: 'none', url: null };
    this.showFlagOverlays = true;
    this.updateFlagOverlays();
  }

  updateFlagOverlays() {
    // For overall-summary view, use static team positions (Team1 left, Team2 right)
    // to match the two-column layout
    if (this.displayView === 'overall-summary') {
      // Left side: First innings batting team
      const leftTeam = this.match?.innings?.[0]?.battingTeam;
      // Right side: Second innings batting team OR first innings bowling team
      const rightTeam = this.match?.innings?.[1]?.battingTeam || this.match?.innings?.[0]?.bowlingTeam;
      
      this.battingTeamFlagVideo = leftTeam?.flagVideo || this.getTeamFlagVideo(leftTeam);
      this.bowlingTeamFlagVideo = rightTeam?.flagVideo || this.getTeamFlagVideo(rightTeam);
      return;
    }
    
    // For all other views, use current innings batting/bowling teams
    const battingTeam = this.currentInnings?.battingTeam;
    const bowlingTeam = this.currentInnings?.bowlingTeam;
    
    // For batting team flag video, check if team object has flagVideo
    this.battingTeamFlagVideo = battingTeam?.flagVideo || this.getTeamFlagVideo(battingTeam);
    this.bowlingTeamFlagVideo = bowlingTeam?.flagVideo || this.getTeamFlagVideo(bowlingTeam);
  }

  getTeamFlagVideo(team: any): string | null {
    return this.teamService.getTeamFlagVideo(team, this.match);
  }

  buildPlayerNameCache() {
    // Delegate to PlayerCacheService
    this.playerCacheService.buildCacheFromMatch(this.match);
  }

  connectSSE() {
    // Clean up any existing connection
    this.disconnectSSE();
    
    console.log('SSE: Connecting to live updates...');
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);
    
    // Connection opened successfully
    this.eventSource.addEventListener('connected', (event: any) => {
      console.log('SSE: Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      // Extract version from connected event if available
      try {
        const data = JSON.parse(event.data);
        if (data.version !== undefined) {
          this.serverVersion = data.version;
          this.lastKnownVersion = data.version;
        }
      } catch (e) { /* ignore parse errors */ }
      
      this.startHeartbeatCheck();
      this.startSyncCheck(); // Start periodic sync verification
    });
    
    // Handle heartbeat to track connection health and version
    this.eventSource.addEventListener('heartbeat', (event: any) => {
      this.lastHeartbeat = Date.now();
      this.isConnected = true;
      
      // Extract version from heartbeat if available
      try {
        const data = JSON.parse(event.data);
        if (data.version !== undefined) {
          this.serverVersion = data.version;
        }
      } catch (e) { /* ignore parse errors */ }
    });
    
    // Helper to extract version from event data
    // Backend sends _version (with underscore) in enriched data
    const extractVersion = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data._version !== undefined) {
          this.serverVersion = data._version;
        }
      } catch (e) { /* ignore */ }
    };
    
    const events = ['score-update', 'over-complete', 'innings-complete', 
                    'innings-start', 'match-complete', 'batsmen-change', 'bowler-change', 
                    'background-change', 'squad-change', 'zoom-change'];
    events.forEach(eventName => {
      this.eventSource!.addEventListener(eventName, (event: any) => {
        this.lastHeartbeat = Date.now();
        extractVersion(event);
        this.reloadMatch();
      });
    });
    
    // Special notification events
    this.eventSource.addEventListener('six', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      this.showBigNotification('six', data);
      this.reloadMatch();
    });
    
    this.eventSource.addEventListener('four', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      this.showBigNotification('four', data);
      this.reloadMatch();
    });
    
    this.eventSource.addEventListener('wicket', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      this.showBigNotification('wicket', data);
      this.reloadMatch();
    });
    
    // Third Umpire events
    this.eventSource.addEventListener('third-umpire-start', (event: any) => {
      this.lastHeartbeat = Date.now();
      extractVersion(event);
      this.showThirdUmpireOverlay();
    });
    
    this.eventSource.addEventListener('third-umpire-decision', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      this.showThirdUmpireDecision(data.decision);
    });
    
    // Custom message events
    this.eventSource.addEventListener('custom-message', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      this.showCustomMessage(data.message);
    });
    
    this.eventSource.addEventListener('custom-message-dismiss', (event: any) => {
      this.lastHeartbeat = Date.now();
      extractVersion(event);
      this.dismissNotification();
    });
    
    this.eventSource.addEventListener('view-change', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      if (data.view) {
        this.displayView = data.view;
        this.updateBackground();
      }
      this.reloadMatch();
    });
    
    this.eventSource.addEventListener('match-state', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = JSON.parse(event.data);
      if (data._version !== undefined) this.serverVersion = data._version;
      if (data.displayView) {
        this.displayView = data.displayView;
        this.updateBackground();
      }
      this.reloadMatch();
    });
    
    // Handle connection errors with exponential backoff
    this.eventSource.onerror = (error) => {
      console.error('SSE: Connection error', error);
      this.isConnected = false;
      this.disconnectSSE();
      this.scheduleReconnect();
    };
  }
  
  private startSyncCheck() {
    // Clear any existing sync check interval
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
    }
    
    // Periodic sync verification to catch missed updates
    this.syncCheckInterval = setInterval(() => {
      this.checkSync();
    }, this.SYNC_CHECK_INTERVAL);
  }
  
  private checkSync() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}/sync-check`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const serverVersion = response.data.version;
          
          // If server version is higher than our last known version, we missed updates
          if (serverVersion > this.lastKnownVersion) {
            console.log(`Sync: Version mismatch detected (server: ${serverVersion}, local: ${this.lastKnownVersion}). Reloading...`);
            this.reloadMatch();
          }
          
          // Update our tracking
          this.lastKnownVersion = serverVersion;
          this.serverVersion = serverVersion;
          
          // Also check if displayView changed
          if (response.data.displayView && response.data.displayView !== this.displayView) {
            console.log(`Sync: Display view changed (server: ${response.data.displayView}, local: ${this.displayView}). Updating...`);
            this.displayView = response.data.displayView;
            this.updateBackground();
          }
        }
      },
      error: (err) => {
        console.warn('Sync check failed:', err.message);
        // On sync check failure, do a full reload to be safe
        this.reloadMatch();
      }
    });
  }
  
  private startHeartbeatCheck() {
    // Clear any existing interval
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
    }
    
    // Check every 45 seconds if we've received a heartbeat (server sends every 30s)
    this.heartbeatCheckInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      // If no heartbeat for 60 seconds, connection is likely dead
      if (timeSinceLastHeartbeat > 60000) {
        console.warn('SSE: No heartbeat received, reconnecting...');
        this.isConnected = false;
        this.disconnectSSE();
        this.scheduleReconnect();
      }
    }, 45000);
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE: Max reconnect attempts reached');
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`SSE: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      // Reload match data first to catch up on any missed updates
      this.reloadMatch();
      this.connectSSE();
    }, delay);
  }
  
  showBigNotification(type: 'six' | 'four' | 'wicket', data: any) {
    // Clear any existing notification timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.notificationType = type;
    this.notificationData = data;
    this.showNotification = true;
    
    // Auto-dismiss after configured duration
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
    // Clear any existing notification
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.thirdUmpireDecision = null;
    this.notificationType = 'third-umpire';
    this.showNotification = true;
    // No auto-dismiss for pending decision - admin controls when to show decision
  }
  
  showThirdUmpireDecision(decision: 'out' | 'not-out') {
    this.thirdUmpireDecision = decision;
    
    // Auto-dismiss after showing decision
    this.notificationTimeout = setTimeout(() => {
      this.dismissNotification();
    }, this.notificationDuration);
  }
  
  showCustomMessage(message: string) {
    // Clear any existing notification
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    this.customMessage = message;
    this.notificationType = 'custom-message';
    this.showNotification = true;
    // Custom messages don't auto-dismiss - admin controls when to dismiss
  }

  disconnectSSE() {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
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
      'final-match-summary': 'Final Match Summary'
    };
    return names[this.displayView] || 'Live Score';
  }

  getPlayerName(player: any): string {
    return this.playerCacheService.getPlayerName(player);
  }

  getPlayerImage(player: any): string | null {
    return this.playerCacheService.getPlayerImage(player);
  }


  // ==================== LIVE SCORE VIEW HELPERS ====================

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

  getStrikerName(): string {
    const striker = this.currentInnings?.currentBatsmen?.striker;
    const name = this.getPlayerName(striker);
    return name?.split(' ').pop() || 'Unknown';
  }

  getStrikerImage(): string | null {
    const striker = this.currentInnings?.currentBatsmen?.striker;
    return this.getPlayerImage(striker);
  }

  getStrikerRuns(): number {
    return this.getStrikerStats()?.runs || 0;
  }

  getStrikerBalls(): number {
    return this.getStrikerStats()?.balls || 0;
  }

  getStrikerSR(): string {
    const stats = this.getStrikerStats();
    if (!stats?.balls) return '0.00';
    return ((stats.runs / stats.balls) * 100).toFixed(1);
  }

  getNonStrikerName(): string {
    const nonStriker = this.currentInnings?.currentBatsmen?.nonStriker;
    const name = this.getPlayerName(nonStriker);
    return name?.split(' ').pop() || 'Unknown';
  }

  getNonStrikerImage(): string | null {
    const nonStriker = this.currentInnings?.currentBatsmen?.nonStriker;
    return this.getPlayerImage(nonStriker);
  }

  getNonStrikerRuns(): number {
    return this.getNonStrikerStats()?.runs || 0;
  }

  getNonStrikerBalls(): number {
    return this.getNonStrikerStats()?.balls || 0;
  }

  getNonStrikerSR(): string {
    const stats = this.getNonStrikerStats();
    if (!stats?.balls) return '0.00';
    return ((stats.runs / stats.balls) * 100).toFixed(1);
  }

  getStrikerStats(): any {
    const strikerId = this.currentInnings?.currentBatsmen?.striker?._id || 
                      this.currentInnings?.currentBatsmen?.striker;
    return this.currentInnings?.battingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === strikerId || id?.toString() === strikerId?.toString();
    });
  }

  getNonStrikerStats(): any {
    const nonStrikerId = this.currentInnings?.currentBatsmen?.nonStriker?._id || 
                         this.currentInnings?.currentBatsmen?.nonStriker;
    return this.currentInnings?.battingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === nonStrikerId || id?.toString() === nonStrikerId?.toString();
    });
  }

  getPartnershipRuns(): number {
    return this.currentInnings?.partnership?.runs || 0;
  }

  getPartnershipBalls(): number {
    return this.currentInnings?.partnership?.balls || 0;
  }

  getLastWicket(): string | null {
    const fow = this.currentInnings?.fallOfWickets;
    if (!fow || fow.length === 0) return null;
    const last = fow[fow.length - 1];
    const playerName = this.getPlayerName(last.player);
    const shortName = playerName?.split(' ').pop() || 'Unknown';
    return `${shortName} ${last.runs} (${last.overs} ov)`;
  }

  getRecentOvers(): { overNumber: number; balls: any[]; runs: number }[] {
    const overs = this.currentInnings?.overs || [];
    // Get last 3 completed overs
    const recentCompleted = overs.slice(-3).map((over: any, idx: number) => {
      const overNumber = overs.length - (3 - idx - 1);
      const runs = over.balls?.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0) || 0;
      return {
        overNumber,
        balls: over.balls || [],
        runs
      };
    });
    return recentCompleted.filter((o: any) => o.balls.length > 0);
  }

  // Get last 2 completed overs (not including current over)
  getPreviousOvers(): { overNumber: number; balls: any[]; runs: number }[] {
    const overs = this.currentInnings?.overs || [];
    const totalBalls = this.currentInnings?.totalBalls || 0;
    const currentOverBallCount = totalBalls % 6;
    
    // If we're mid-over, the last item in overs array is the current over
    // Get the 2 overs before that
    let completedOvers = overs;
    if (currentOverBallCount > 0 && overs.length > 0) {
      // Current over is in progress, exclude it
      completedOvers = overs.slice(0, -1);
    }
    
    // Get last 2 completed overs
    const lastTwo = completedOvers.slice(-2);
    
    return lastTwo.map((over: any, idx: number) => {
      const overNumber = completedOvers.length - lastTwo.length + idx + 1;
      const runs = over.balls?.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0) || 0;
      return {
        overNumber,
        balls: over.balls || [],
        runs
      };
    }).filter((o: any) => o.balls.length > 0);
  }

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

  getCurrentBowlerFullFigures(): string {
    const bowlerId = this.currentInnings?.currentBowler?._id || this.currentInnings?.currentBowler;
    const stats = this.currentInnings?.bowlingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === bowlerId || id?.toString() === bowlerId?.toString();
    });
    if (!stats) return '0-0 (0.0 ov)';
    return `${stats.wickets}-${stats.runs} (${stats.overs || 0}.${stats.balls || 0} ov)`;
  }

  getCurrentOverBalls(): any[] {
    return this.currentInnings?.currentOver || [];
  }

  getRemainingBallsInOver(): number[] {
    const bowled = this.getCurrentOverBalls().filter(b => b.ballNumber !== null).length;
    return Array(Math.max(0, 6 - bowled)).fill(0);
  }

  getBallColorClass(ball: any): { [key: string]: boolean } {
    return {
      'bg-red-500 text-white': ball.isWicket,
      'bg-green-500 text-white': !ball.isWicket && ball.display === '4',
      'bg-purple-500 text-white': !ball.isWicket && ball.display === '6',
      'bg-yellow-500 text-black': !ball.isWicket && ball.isExtra,
      'bg-gray-600 text-gray-300': !ball.isWicket && !ball.isExtra && (ball.display === '•' || ball.display === '0' || ball.runs === 0),
      'bg-blue-500 text-white': !ball.isWicket && !ball.isExtra && ball.display !== '4' && ball.display !== '6' && ball.display !== '•' && ball.display !== '0' && ball.runs !== 0
    };
  }

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

  // ==================== PLAYER STATS VIEW HELPERS ====================

  getInningsLabel(): string {
    return this.teamService.getInningsLabel(this.match?.currentInnings || 0);
  }

  getBattingStats(): any[] {
    // Display batsmen in the ORDER THEY ACTUALLY BATTED
    // Players who have batted appear first (sorted by position), then DNB players
    const battingTeamId = this.currentInnings?.battingTeam?._id || this.currentInnings?.battingTeam;
    const team1Id = this.match?.team1?._id || this.match?.team1;
    const isTeam1 = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1 ? this.match?.squads?.team1 : this.match?.squads?.team2;
    
    if (!squad) return this.currentInnings?.battingStats || [];
    
    // Get Playing XI
    const playingXI = squad.filter((p: any) => p.isPlayingXI);
    
    if (playingXI.length === 0) return this.currentInnings?.battingStats || [];
    
    // Get actual batting stats sorted by position (order they came to bat)
    const battingStats = [...(this.currentInnings?.battingStats || [])]
      .sort((a: any, b: any) => (a.position || 99) - (b.position || 99));
    
    // Create a set of player IDs who have already batted
    const battedPlayerIds = new Set(
      battingStats.map((stat: any) => (stat.player?._id || stat.player)?.toString())
    );
    
    // Get DNB players (from Playing XI who haven't batted yet)
    // Sort them by scheduled batting order
    const dnbPlayers = playingXI
      .filter((p: any) => !battedPlayerIds.has((p.player?._id || p.player)?.toString()))
      .sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99))
      .map((squadPlayer: any) => ({
        player: squadPlayer.player,
        runs: null,
        balls: null,
        fours: 0,
        sixes: 0,
        isOut: false,
        isNotOut: false,
        isDNB: true,
        battingOrder: squadPlayer.battingOrder
      }));
    
    // Return batted players first (in order they batted), then DNB players
    return [...battingStats, ...dnbPlayers];
  }

  getBowlingStats(): any[] {
    return this.currentInnings?.bowlingStats || [];
  }

  getBatsmanName(batsman: any): string {
    return this.getPlayerName(batsman.player);
  }

  getBatsmanImage(batsman: any): string | null {
    return this.getPlayerImage(batsman.player);
  }

  getBowlerName(bowler: any): string {
    return this.getPlayerName(bowler.player);
  }

  getBowlerImage(bowler: any): string | null {
    return this.getPlayerImage(bowler.player);
  }

  isCurrentBatsman(batsman: any): boolean {
    const playerId = batsman.player?._id || batsman.player;
    const strikerId = this.currentInnings?.currentBatsmen?.striker?._id || 
                      this.currentInnings?.currentBatsmen?.striker;
    const nonStrikerId = this.currentInnings?.currentBatsmen?.nonStriker?._id || 
                         this.currentInnings?.currentBatsmen?.nonStriker;
    return playerId === strikerId || playerId?.toString() === strikerId?.toString() ||
           playerId === nonStrikerId || playerId?.toString() === nonStrikerId?.toString();
  }

  isStriker(batsman: any): boolean {
    const playerId = batsman.player?._id || batsman.player;
    const strikerId = this.currentInnings?.currentBatsmen?.striker?._id || 
                      this.currentInnings?.currentBatsmen?.striker;
    return playerId === strikerId || playerId?.toString() === strikerId?.toString();
  }

  isCurrentBowler(bowler: any): boolean {
    const playerId = bowler.player?._id || bowler.player;
    const bowlerId = this.currentInnings?.currentBowler?._id || this.currentInnings?.currentBowler;
    return playerId === bowlerId || playerId?.toString() === bowlerId?.toString();
  }

  getHowOut(batsman: any): string {
    return this.dismissalService.getHowOut(batsman, this.isCurrentBatsman(batsman));
  }

  getShortHowOut(batsman: any): string {
    return this.dismissalService.getShortHowOut(batsman);
  }

  getStrikeRate(batsman: any): string {
    return this.calcService.getStrikeRate(batsman.runs || 0, batsman.balls || 0);
  }

  getBowlerOversDisplay(bowler: any): string {
    return `${bowler.overs || 0}.${bowler.balls || 0}`;
  }

  getBowlerEconomy(bowler: any): string {
    return this.calcService.getBowlerEconomy(bowler.runs || 0, bowler.overs || 0, bowler.balls || 0);
  }

  getTotalExtras(): number {
    return this.calcService.getTotalExtras(this.currentInnings?.extras);
  }

  getExtrasBreakdown(): string {
    return this.calcService.getExtrasBreakdown(this.currentInnings?.extras);
  }

  getYetToBat(): string[] {
    const battingTeamId = this.currentInnings?.battingTeam?._id || this.currentInnings?.battingTeam;
    const team1Id = this.match.team1?._id || this.match.team1;
    const isTeam1 = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1 ? this.match.squads?.team1 : this.match.squads?.team2;
    if (!squad) return [];
    const battedIds = new Set(
      this.currentInnings?.battingStats?.map((b: any) => (b.player?._id || b.player)?.toString())
    );
    return squad
      .filter((p: any) => p.isPlayingXI && !battedIds.has((p.player?._id || p.player)?.toString()))
      .map((p: any) => this.getPlayerName(p.player));
  }

  getFallOfWickets(): any[] {
    return this.currentInnings?.fallOfWickets || [];
  }

  getFOWPlayerName(fow: any): string {
    return this.getPlayerName(fow.player);
  }

  // ==================== MATCH SUMMARY VIEW HELPERS ====================

  getInningsOvers(innings: any): string {
    return this.calcService.getOversDisplay(innings?.totalBalls || 0);
  }

  getTopBatsmen(innings: any, count: number): any[] {
    if (!innings?.battingStats) return [];
    return [...innings.battingStats]
      .sort((a: any, b: any) => (b.runs || 0) - (a.runs || 0))
      .slice(0, count);
  }

  getTopBatsmanImage(batsman: any): string | null {
    return this.getPlayerImage(batsman.player);
  }

  getTopBowlerImage(bowler: any): string | null {
    return this.getPlayerImage(bowler.player);
  }

  getTopBowlersForInnings(inningsIndex: number, count: number): any[] {
    const oppositeIndex = inningsIndex === 0 ? 0 : 1;
    const innings = this.match.innings?.[oppositeIndex];
    if (!innings?.bowlingStats) return [];
    return [...innings.bowlingStats]
      .sort((a: any, b: any) => (b.wickets || 0) - (a.wickets || 0) || (a.runs || 0) - (b.runs || 0))
      .slice(0, count);
  }

  getSecondBattingTeamName(): string {
    return this.teamService.getSecondBattingTeamName(this.match);
  }

  getFirstBattingTeamName(): string {
    return this.teamService.getFirstBattingTeamName(this.match);
  }

  // ==================== PROJECTIONS VIEW HELPERS ====================

  getFirstInningsTeamName(): string {
    return this.teamService.getFirstInningsTeamName(this.match);
  }

  getSecondInningsTeamName(): string {
    return this.teamService.getSecondInningsTeamName(this.match);
  }

  getOversAxisLabels(): number[] {
    return this.calcService.getOversAxisLabels(this.match?.format);
  }

  getOversScale(): number {
    return this.calcService.getXScale(this.match?.format, 450);
  }

  getOversScaleLarge(): number {
    return this.calcService.getXScale(this.match?.format, 530);
  }

  getFirstInningsData(): GraphDataPoint[] {
    return this.calcService.getInningsGraphData(this.match?.innings?.[0]);
  }

  getSecondInningsData(): GraphDataPoint[] {
    return this.calcService.getInningsGraphData(this.match?.innings?.[1]);
  }

  getFirstInningsLinePoints(): string {
    return this.getFirstInningsData()
      .map(p => `${40 + (p.over * this.getOversScale())},${260 - p.runs}`)
      .join(' ');
  }

  getSecondInningsLinePoints(): string {
    return this.getSecondInningsData()
      .map(p => `${40 + (p.over * this.getOversScale())},${260 - p.runs}`)
      .join(' ');
  }

  getFirstInningsLinePointsLarge(): string {
    return this.getFirstInningsData()
      .map(p => `${50 + (p.over * this.getOversScaleLarge())},${300 - (p.runs * 1.12)}`)
      .join(' ');
  }

  getSecondInningsLinePointsLarge(): string {
    return this.getSecondInningsData()
      .map(p => `${50 + (p.over * this.getOversScaleLarge())},${300 - (p.runs * 1.12)}`)
      .join(' ');
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

  // ==================== NEW PLAYER STATS VIEW HELPERS ====================

  getShortDismissal(batsman: any): string {
    return this.dismissalService.getShortDismissal(batsman, this.isCurrentBatsman(batsman));
  }

  getShortPlayerName(player: any): string {
    return this.playerCacheService.getShortPlayerName(player);
  }

  // Get team flag for display
  getTeamFlag(team: any): string | null {
    return this.teamService.getTeamFlag(team, this.match);
  }

  // Get full batting card for an innings (all 11 players with DNB status)
  // Display batsmen in the ORDER THEY ACTUALLY BATTED
  getFullBattingCard(inningsIndex: number): any[] {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return [];
    
    const battingTeamId = innings.battingTeam?._id || innings.battingTeam;
    const team1Id = this.match?.team1?._id || this.match?.team1;
    const isTeam1 = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1 ? this.match?.squads?.team1 : this.match?.squads?.team2;
    
    if (!squad) return innings.battingStats || [];
    
    // Get Playing XI
    const playingXI = squad.filter((p: any) => p.isPlayingXI);
    
    if (playingXI.length === 0) return innings.battingStats || [];
    
    // Get actual batting stats sorted by position (order they came to bat)
    const battingStats = [...(innings.battingStats || [])]
      .sort((a: any, b: any) => (a.position || 99) - (b.position || 99));
    
    // Create a set of player IDs who have already batted
    const battedPlayerIds = new Set(
      battingStats.map((stat: any) => (stat.player?._id || stat.player)?.toString())
    );
    
    // Get DNB players (from Playing XI who haven't batted yet)
    // Sort them by scheduled batting order
    const dnbPlayers = playingXI
      .filter((p: any) => !battedPlayerIds.has((p.player?._id || p.player)?.toString()))
      .sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99))
      .map((squadPlayer: any) => ({
        player: squadPlayer.player,
        runs: null,
        balls: null,
        fours: 0,
        sixes: 0,
        isOut: false,
        isNotOut: false,
        isDNB: true,
        battingOrder: squadPlayer.battingOrder
      }));
    
    // Return batted players first (in order they batted), then DNB players
    return [...battingStats, ...dnbPlayers];
  }

  // Get dismissal text for summary view
  getSummaryDismissal(batsman: any): string {
    return this.dismissalService.getSummaryDismissal(batsman, this.isCurrentBatsman(batsman));
  }

  // Get batsman image for summary view
  getSummaryBatsmanImage(batsman: any): string | null {
    return this.getPlayerImage(batsman.player);
  }

  // Get extras breakdown for a specific innings
  getExtrasBreakdownForInnings(inningsIndex: number): string {
    const innings = this.match?.innings?.[inningsIndex];
    return this.calcService.getExtrasBreakdown(innings?.extras);
  }

  getYetToBatCount(): number {
    // Count DNB players from the batting stats
    const battingStats = this.getBattingStats();
    return battingStats.filter((b: any) => b.isDNB).length;
  }

  getCurrentBowlerOvers(): string {
    const bowlerId = this.currentInnings?.currentBowler?._id || this.currentInnings?.currentBowler;
    const stats = this.currentInnings?.bowlingStats?.find((b: any) => {
      const id = b.player?._id || b.player;
      return id === bowlerId || id?.toString() === bowlerId?.toString();
    });
    if (!stats) return '0.0';
    return `${stats.overs || 0}.${stats.balls || 0}`;
  }

  getBestBowler(): any {
    const bowlingStats = this.currentInnings?.bowlingStats || [];
    if (bowlingStats.length === 0) return null;
    return [...bowlingStats].sort((a: any, b: any) => {
      if ((b.wickets || 0) !== (a.wickets || 0)) {
        return (b.wickets || 0) - (a.wickets || 0);
      }
      return (a.runs || 0) - (b.runs || 0);
    })[0];
  }

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

  // ==================== SUMMARY VIEW HELPERS ====================

  getSummaryRunRate(inningsIndex: number): string {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return '0.00';
    return this.calcService.getCurrentRunRate(innings.totalRuns || 0, innings.totalBalls || 0);
  }

  isBatsmanCurrentlyBatting(batsman: any, inningsIndex: number): boolean {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return false;
    const playerId = batsman.player?._id || batsman.player;
    const strikerId = innings.currentBatsmen?.striker?._id || innings.currentBatsmen?.striker;
    const nonStrikerId = innings.currentBatsmen?.nonStriker?._id || innings.currentBatsmen?.nonStriker;
    return playerId === strikerId || playerId?.toString() === strikerId?.toString() ||
           playerId === nonStrikerId || playerId?.toString() === nonStrikerId?.toString();
  }

  getSummaryBowlers(inningsIndex: number, count: number): any[] {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings?.bowlingStats) return [];
    return [...innings.bowlingStats]
      .sort((a: any, b: any) => (b.wickets || 0) - (a.wickets || 0) || (a.runs || 0) - (b.runs || 0))
      .slice(0, count);
  }

  getSummaryFours(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    return this.calcService.getTotalFours(innings?.battingStats);
  }

  getSummarySixes(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    return this.calcService.getTotalSixes(innings?.battingStats);
  }

  getSummaryExtras(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    return this.calcService.getTotalExtras(innings?.extras);
  }

  getSummaryBallsRemaining(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return 0;
    return this.calcService.getBallsRemaining(this.match?.format, innings.totalBalls || 0);
  }

  // ==================== PROJECTIONS VIEW HELPERS (NEW LAYOUT) ====================

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

  // ==================== PARTNERSHIP VIEW HELPERS ====================

  getStrikerDots(): number {
    const stats = this.getStrikerStats();
    if (!stats) return 0;
    if (stats.dotBalls !== undefined) return stats.dotBalls;
    return this.calcService.estimateDotBalls(
      stats.runs || 0,
      stats.balls || 0,
      stats.fours || 0,
      stats.sixes || 0
    );
  }

  getNonStrikerDots(): number {
    const stats = this.getNonStrikerStats();
    if (!stats) return 0;
    if (stats.dotBalls !== undefined) return stats.dotBalls;
    return this.calcService.estimateDotBalls(
      stats.runs || 0,
      stats.balls || 0,
      stats.fours || 0,
      stats.sixes || 0
    );
  }

  getStrikerBattingStyle(): string {
    const striker = this.currentInnings?.currentBatsmen?.striker;
    if (!striker) return '';
    // Try to get batting style from player object
    if (striker.battingStyle) return striker.battingStyle;
    // Try to find in squad
    const playerId = striker._id || striker;
    const squad = this.match?.squads?.team1?.concat(this.match?.squads?.team2 || []) || [];
    const squadPlayer = squad.find((p: any) => {
      const id = p.player?._id || p.player;
      return id === playerId || id?.toString() === playerId?.toString();
    });
    return squadPlayer?.player?.battingStyle || '';
  }

  getNonStrikerBattingStyle(): string {
    const nonStriker = this.currentInnings?.currentBatsmen?.nonStriker;
    if (!nonStriker) return '';
    if (nonStriker.battingStyle) return nonStriker.battingStyle;
    const playerId = nonStriker._id || nonStriker;
    const squad = this.match?.squads?.team1?.concat(this.match?.squads?.team2 || []) || [];
    const squadPlayer = squad.find((p: any) => {
      const id = p.player?._id || p.player;
      return id === playerId || id?.toString() === playerId?.toString();
    });
    return squadPlayer?.player?.battingStyle || '';
  }
}
