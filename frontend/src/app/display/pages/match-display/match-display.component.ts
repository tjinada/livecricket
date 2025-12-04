import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
          <div *ngIf="displayView === 'score-summary'" class="h-full flex flex-col">
            
            <!-- Top Header Bar -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <div class="max-w-6xl mx-auto px-6 py-3">
                <div class="flex items-center justify-between">
                  <!-- Match Info -->
                  <div class="flex items-center gap-4">
                    <!-- Live Badge -->
                    <div class="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                      <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      <span class="text-xs font-bold uppercase tracking-wider">Live</span>
                    </div>
                    <!-- Match Title -->
                    <div>
                      <h1 class="text-lg font-bold tracking-wide">
                        <span class="text-blue-400">{{ getBattingTeamName() }}</span>
                        <span class="text-gray-500 mx-2">vs</span>
                        <span class="text-gray-300">{{ getBowlingTeamName() }}</span>
                      </h1>
                      <p class="text-xs text-gray-500">{{ match.format }} Match • {{ getInningsLabel() }}</p>
                    </div>
                  </div>
                  <!-- Format Badge -->
                  <div class="bg-gray-700/50 px-4 py-1 rounded text-sm font-medium">
                    {{ match.format }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content Area - Centered -->
            <div class="flex-1 flex flex-col justify-center items-center px-6 py-4">
              
              <!-- Central Score Display -->
              <div class="flex flex-col items-center mb-8">
                <!-- Team Badge, Flag & Name with backdrop -->
                <div class="flex items-center justify-center gap-5 mb-6 bg-black/50 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10">
                  <div class="w-20 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-2xl font-black shadow-lg border border-blue-400/30">
                    {{ getBattingTeamCode() }}
                  </div>
                  <!-- Team Flag -->
                  <img 
                    *ngIf="getBattingTeamFlag()"
                    [src]="getBattingTeamFlag()"
                    class="w-14 h-10 object-cover rounded shadow-lg border border-white/20"
                  >
                  <span class="text-5xl font-semibold text-white" style="text-shadow: 0 2px 8px rgba(0,0,0,0.9);">{{ getBattingTeamName() }}</span>
                </div>
                
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
                
                <!-- Partnership -->
                <div class="mt-4 pt-4 border-t border-gray-600/50 text-center">
                  <span class="text-gray-500 text-lg">Partnership: </span>
                  <span class="text-white font-semibold text-xl">{{ getPartnershipRuns() }}</span>
                  <span class="text-gray-500 text-lg"> ({{ getPartnershipBalls() }} balls)</span>
                </div>
              </div>

            </div>

            <!-- Bottom Stats Bar -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
              <div class="w-full px-6 py-4">
                <div class="flex items-center justify-between">
                  
                  <!-- Left: Previous Overs (Last 2 completed overs) -->
                  <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-500 uppercase">Previous</span>
                    <ng-container *ngFor="let over of getPreviousOvers(); let i = index">
                      <div class="flex items-center gap-1">
                        <span class="text-xs text-gray-600 mr-1">{{ over.overNumber }}</span>
                        <ng-container *ngFor="let ball of over.balls">
                          <div 
                            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            [ngClass]="getBallColorClass(ball)"
                          >
                            {{ ball.display === '0' ? '•' : ball.display }}
                          </div>
                        </ng-container>
                        <span class="text-xs text-gray-500 ml-1">({{ over.runs }})</span>
                      </div>
                      <div *ngIf="i < getPreviousOvers().length - 1" class="w-px h-6 bg-gray-700"></div>
                    </ng-container>
                    <div *ngIf="getPreviousOvers().length === 0" class="text-gray-600 text-sm italic">No previous overs</div>
                  </div>

                  <!-- Center: This Over -->
                  <div class="flex items-center gap-3">
                    <span class="text-base text-gray-500 uppercase mr-2">This Over</span>
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

                  <!-- Right Side: Last Wicket + Run Rates -->
                  <div class="flex items-center gap-6">
                    <!-- Last Wicket -->
                    <div *ngIf="getLastWicket()" class="flex items-center gap-2 bg-red-900/40 rounded-lg px-4 py-2 border border-red-600/40">
                      <span class="text-red-400 text-sm">Last Wkt:</span>
                      <span class="text-white font-medium text-sm">{{ getLastWicket() }}</span>
                    </div>
                    
                    <!-- Run Rates -->
                    <div class="flex items-center gap-6 text-xl pl-4 border-l border-gray-700">
                      <div>
                        <span class="text-gray-500">CRR </span>
                        <span class="text-3xl font-bold text-green-400">{{ getCurrentRunRate() }}</span>
                      </div>
                      <div *ngIf="match.currentInnings === 1">
                        <span class="text-gray-500">RRR </span>
                        <span class="text-3xl font-bold text-orange-400">{{ getRequiredRunRate() }}</span>
                      </div>
                      <div *ngIf="match.currentInnings === 1" class="pl-4 border-l border-gray-600">
                        <span class="text-gray-500">Need </span>
                        <span class="text-yellow-400 font-bold text-2xl">{{ getRunsNeeded() }}</span>
                        <span class="text-gray-500"> from </span>
                        <span class="text-yellow-400 font-bold text-2xl">{{ getBallsRemaining() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ==================== PLAYER STATS VIEW (Card-Based Grid) ==================== -->
          <div *ngIf="displayView === 'player-stats'" class="h-full flex flex-col">
            
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

          <!-- ==================== MATCH SUMMARY VIEW (Context-Aware) ==================== -->
          <div *ngIf="displayView === 'overall-summary'" class="h-full flex flex-col">
            
            <!-- Top Header Bar -->
            <div class="bg-gradient-to-r from-blue-600/95 to-blue-800/95 backdrop-blur-sm border-b border-blue-500/30">
              <div class="max-w-6xl mx-auto px-6 py-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h1 class="text-xl font-bold uppercase tracking-wider">Match Summary</h1>
                    <p class="text-blue-200 text-sm">{{ match.team1?.name }} vs {{ match.team2?.name }} • {{ match.format }}</p>
                  </div>
                  <div class="bg-blue-900/50 px-3 py-1 rounded text-sm">
                    {{ match.status === 'completed' ? 'Completed' : 'In Progress' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- ===== STATE 1: First Innings In Progress ===== -->
            <div *ngIf="match.status !== 'completed' && match.currentInnings === 0" class="flex-1 flex flex-col justify-center px-6 py-4">
              <div class="max-w-3xl mx-auto w-full">
                
                <!-- Centered Team Score -->
                <div class="text-center mb-8">
                  <div class="flex items-center justify-center gap-4 mb-4">
                    <div class="w-16 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-xl font-bold shadow-lg">
                      {{ getTeamCode(match.innings[0]?.battingTeam) }}
                    </div>
                    <span class="text-2xl font-light text-gray-300">{{ getTeamName(match.innings[0]?.battingTeam) }}</span>
                    <span class="text-xs text-gray-500 uppercase bg-gray-700/50 px-2 py-1 rounded">Batting</span>
                  </div>
                  <div class="text-7xl font-black mb-2">{{ match.innings[0]?.totalRuns || 0 }}/{{ match.innings[0]?.totalWickets || 0 }}</div>
                  <div class="text-xl text-gray-400">({{ getInningsOvers(match.innings[0]) }} overs)</div>
                  <div class="text-lg text-cyan-400 mt-2">CRR: {{ getSummaryRunRate(0) }}</div>
                </div>

                <!-- Two Column: Top Batsmen & Top Bowlers -->
                <div class="grid grid-cols-2 gap-6 mb-6">
                  <!-- Top Batsmen -->
                  <div class="bg-gray-800/60 rounded-lg p-5 backdrop-blur-sm">
                    <div class="text-sm text-gray-500 uppercase mb-4">Top Batsmen</div>
                    <div class="space-y-3">
                      <ng-container *ngFor="let batsman of getTopBatsmen(match.innings[0], 3)">
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-3">
                            <img 
                              *ngIf="getTopBatsmanImage(batsman)" 
                              [src]="getTopBatsmanImage(batsman)"
                              class="w-10 h-10 rounded-full object-cover"
                              [ngClass]="{'border-3 border-yellow-400': isBatsmanCurrentlyBatting(batsman, 0), 'border-2 border-gray-600': !isBatsmanCurrentlyBatting(batsman, 0)}"
                            >
                            <div *ngIf="!getTopBatsmanImage(batsman)" 
                              class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"
                              [ngClass]="{'border-3 border-yellow-400': isBatsmanCurrentlyBatting(batsman, 0), 'border-2 border-gray-600': !isBatsmanCurrentlyBatting(batsman, 0)}">
                              <span class="text-base">🏏</span>
                            </div>
                            <span class="font-medium text-lg">{{ getShortPlayerName(batsman.player) }}</span>
                            <span *ngIf="isBatsmanCurrentlyBatting(batsman, 0)" class="text-yellow-400 text-sm">*</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-2xl">{{ batsman.runs }}</span>
                            <span class="text-gray-500 text-base">({{ batsman.balls }})</span>
                          </div>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                  
                  <!-- Top Bowlers -->
                  <div class="bg-gray-800/60 rounded-lg p-5 backdrop-blur-sm">
                    <div class="text-sm text-gray-500 uppercase mb-4">Top Bowlers</div>
                    <div class="space-y-3">
                      <ng-container *ngFor="let bowler of getSummaryBowlers(0, 3)">
                        <div class="flex justify-between items-center">
                          <div class="flex items-center gap-3">
                            <img 
                              *ngIf="getTopBowlerImage(bowler)" 
                              [src]="getTopBowlerImage(bowler)"
                              class="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                            >
                            <div *ngIf="!getTopBowlerImage(bowler)" class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                              <span class="text-base">⚾</span>
                            </div>
                            <span class="font-medium text-lg">{{ getShortPlayerName(bowler.player) }}</span>
                          </div>
                          <span class="text-gray-300 text-lg">{{ bowler.wickets }}-{{ bowler.runs }} ({{ getBowlerOversDisplay(bowler) }})</span>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-5 gap-4 mb-6">
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="text-green-400 text-3xl font-bold">{{ getSummaryFours(0) }}</div>
                    <div class="text-gray-500 text-sm uppercase">Fours</div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="text-purple-400 text-3xl font-bold">{{ getSummarySixes(0) }}</div>
                    <div class="text-gray-500 text-sm uppercase">Sixes</div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="text-yellow-400 text-3xl font-bold">{{ getSummaryExtras(0) }}</div>
                    <div class="text-gray-500 text-sm uppercase">Extras</div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="text-cyan-400 text-3xl font-bold">{{ getSummaryRunRate(0) }}</div>
                    <div class="text-gray-500 text-sm uppercase">Run Rate</div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="text-gray-300 text-3xl font-bold">{{ getSummaryBallsRemaining(0) }}</div>
                    <div class="text-gray-500 text-sm uppercase">Balls Left</div>
                  </div>
                </div>

                <!-- Bottom Status -->
                <div class="bg-gray-800/40 rounded-lg px-6 py-5 text-center backdrop-blur-sm">
                  <span class="text-gray-400 text-lg">{{ getTeamName(match.innings[0]?.bowlingTeam) }}</span>
                  <span class="text-gray-500 text-lg"> to bat next</span>
                </div>
              </div>
            </div>

            <!-- ===== STATE 2: Second Innings In Progress (The Chase) ===== -->
            <div *ngIf="match.status !== 'completed' && match.currentInnings === 1" class="flex-1 flex flex-col justify-center px-6 py-4">
              <div class="max-w-5xl mx-auto w-full">
                
                <!-- Two Innings Side by Side -->
                <div class="grid grid-cols-2 gap-8 mb-8">
                  
                  <!-- 1st Innings (Completed) -->
                  <div class="bg-gray-800/60 rounded-xl p-8 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-6">
                      <div class="flex items-center gap-4">
                        <div class="w-16 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center text-lg font-bold">
                          {{ getTeamCode(match.innings[0]?.battingTeam) }}
                        </div>
                        <div>
                          <div class="font-bold text-2xl">{{ getTeamName(match.innings[0]?.battingTeam) }}</div>
                          <div class="text-gray-500 text-base uppercase">1st Innings</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-5xl font-bold">{{ match.innings[0]?.totalRuns || 0 }}/{{ match.innings[0]?.totalWickets || 0 }}</div>
                        <div class="text-gray-500 text-lg">({{ getInningsOvers(match.innings[0]) }} ov)</div>
                      </div>
                    </div>
                    <div class="space-y-3">
                      <ng-container *ngFor="let batsman of getTopBatsmen(match.innings[0], 3)">
                        <div class="flex justify-between items-center text-lg">
                          <div class="flex items-center gap-4">
                            <img 
                              *ngIf="getTopBatsmanImage(batsman)" 
                              [src]="getTopBatsmanImage(batsman)"
                              class="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                            >
                            <div *ngIf="!getTopBatsmanImage(batsman)" class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                              <span class="text-base">🏏</span>
                            </div>
                            <span class="text-gray-300 text-xl">{{ getShortPlayerName(batsman.player) }}</span>
                          </div>
                          <span><span class="font-bold text-2xl">{{ batsman.runs }}</span> <span class="text-gray-500 text-lg">({{ batsman.balls }})</span></span>
                        </div>
                      </ng-container>
                    </div>
                  </div>

                  <!-- 2nd Innings (In Progress) -->
                  <div class="bg-gradient-to-br from-blue-900/60 to-blue-950/60 rounded-xl p-8 backdrop-blur-sm border border-blue-700/30">
                    <div class="flex items-center justify-between mb-6">
                      <div class="flex items-center gap-4">
                        <div class="w-16 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-lg font-bold">
                          {{ getTeamCode(match.innings[1]?.battingTeam) }}
                        </div>
                        <div>
                          <div class="font-bold text-blue-300 text-2xl">{{ getTeamName(match.innings[1]?.battingTeam) }}</div>
                          <div class="text-blue-400 text-base uppercase">2nd Innings • Batting</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-5xl font-bold text-white">{{ match.innings[1]?.totalRuns || 0 }}/{{ match.innings[1]?.totalWickets || 0 }}</div>
                        <div class="text-blue-400 text-lg">({{ getInningsOvers(match.innings[1]) }} ov)</div>
                      </div>
                    </div>
                    <div class="space-y-3">
                      <ng-container *ngFor="let batsman of getTopBatsmen(match.innings[1], 3)">
                        <div class="flex justify-between items-center text-lg">
                          <div class="flex items-center gap-4">
                            <img 
                              *ngIf="getTopBatsmanImage(batsman)" 
                              [src]="getTopBatsmanImage(batsman)"
                              class="w-10 h-10 rounded-full object-cover"
                              [ngClass]="{'border-3 border-yellow-400': isBatsmanCurrentlyBatting(batsman, 1), 'border-2 border-gray-600': !isBatsmanCurrentlyBatting(batsman, 1)}"
                            >
                            <div *ngIf="!getTopBatsmanImage(batsman)" 
                              class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"
                              [ngClass]="{'border-3 border-yellow-400': isBatsmanCurrentlyBatting(batsman, 1), 'border-2 border-gray-600': !isBatsmanCurrentlyBatting(batsman, 1)}">
                              <span class="text-base">🏏</span>
                            </div>
                            <span class="text-gray-200 text-xl">{{ getShortPlayerName(batsman.player) }}</span>
                            <span *ngIf="isBatsmanCurrentlyBatting(batsman, 1)" class="text-yellow-400 text-base">*</span>
                          </div>
                          <span><span class="font-bold text-2xl">{{ batsman.runs }}</span> <span class="text-gray-500 text-lg">({{ batsman.balls }})</span></span>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                </div>

                <!-- Win Probability Bar -->
                <div class="bg-gray-800/60 rounded-xl p-6 mb-6 backdrop-blur-sm">
                  <div class="flex items-center gap-6">
                    <div class="text-right w-48">
                      <div class="font-semibold text-xl">{{ getTeamName(match.innings[1]?.battingTeam) }}</div>
                      <div class="text-3xl font-bold text-cyan-400">{{ getWinProbability() }}%</div>
                    </div>
                    <div class="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        class="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                        [style.width.%]="getWinProbability()"
                      ></div>
                    </div>
                    <div class="w-48">
                      <div class="font-semibold text-xl">{{ getTeamName(match.innings[0]?.battingTeam) }}</div>
                      <div class="text-3xl font-bold text-orange-400">{{ 100 - getWinProbability() }}%</div>
                    </div>
                  </div>
                </div>

                <!-- Chase Equation -->
                <div class="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl px-10 py-6 text-center backdrop-blur-sm border border-yellow-700/30">
                  <div class="text-4xl font-bold">
                    <span class="text-gray-300">{{ getTeamName(match.innings[1]?.battingTeam) }} need </span>
                    <span class="text-yellow-400">{{ getRunsNeeded() }}</span>
                    <span class="text-gray-300"> runs from </span>
                    <span class="text-yellow-400">{{ getBallsRemaining() }}</span>
                    <span class="text-gray-300"> balls</span>
                  </div>
                  <div class="text-gray-400 mt-4 text-xl">
                    Required Rate: <span class="text-orange-400 font-bold">{{ getRequiredRunRate() }}</span> • 
                    Current Rate: <span class="text-cyan-400 font-bold">{{ getSummaryRunRate(1) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ===== STATE 3: Match Completed ===== -->
            <div *ngIf="match.status === 'completed'" class="flex-1 flex flex-col justify-center px-6 py-4">
              <div class="max-w-5xl mx-auto w-full">
                
                <!-- Result Banner -->
                <div class="bg-gradient-to-r from-blue-900/60 to-blue-800/60 rounded-lg px-8 py-6 mb-6 text-center backdrop-blur-sm border border-blue-700/30">
                  <div class="text-3xl font-bold">
                    <span *ngIf="match.result?.winner" class="text-white">{{ getTeamName(match.result.winner) }}</span>
                    <span *ngIf="match.result?.winner" class="text-blue-300"> won by {{ match.result.winMargin }}</span>
                    <span *ngIf="!match.result?.winner" class="text-yellow-400">{{ match.result?.winMargin || 'Match Tied' }}</span>
                  </div>
                </div>

                <!-- Two Innings Side by Side -->
                <div class="grid grid-cols-2 gap-6 mb-6">
                  
                  <!-- 1st Innings -->
                  <div class="bg-gray-800/60 rounded-lg p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-5">
                      <div class="flex items-center gap-3">
                        <div class="w-14 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded flex items-center justify-center text-base font-bold">
                          {{ getTeamCode(match.innings[0]?.battingTeam) }}
                        </div>
                        <div>
                          <div class="font-bold text-lg">{{ getTeamName(match.innings[0]?.battingTeam) }}</div>
                          <div class="text-gray-500 text-sm uppercase">1st Innings</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-4xl font-bold">{{ match.innings[0]?.totalRuns || 0 }}/{{ match.innings[0]?.totalWickets || 0 }}</div>
                        <div class="text-gray-500 text-base">({{ getInningsOvers(match.innings[0]) }} ov)</div>
                      </div>
                    </div>
                    <div class="space-y-2 mb-4">
                      <ng-container *ngFor="let batsman of getTopBatsmen(match.innings[0], 3)">
                        <div class="flex justify-between items-center text-base">
                          <div class="flex items-center gap-3">
                            <img 
                              *ngIf="getTopBatsmanImage(batsman)" 
                              [src]="getTopBatsmanImage(batsman)"
                              class="w-8 h-8 rounded-full object-cover border-2 border-gray-600"
                            >
                            <div *ngIf="!getTopBatsmanImage(batsman)" class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                              <span class="text-sm">🏏</span>
                            </div>
                            <span class="text-gray-300">{{ getShortPlayerName(batsman.player) }}</span>
                          </div>
                          <span><span class="font-bold text-lg">{{ batsman.runs }}</span> <span class="text-gray-500">({{ batsman.balls }})</span></span>
                        </div>
                      </ng-container>
                    </div>
                    <div class="border-t border-gray-700 pt-4">
                      <div class="text-sm text-gray-500 uppercase mb-2">Best Bowler</div>
                      <div *ngIf="getSummaryBowlers(0, 1)[0] as bowler" class="flex justify-between items-center text-base">
                        <div class="flex items-center gap-3">
                          <img 
                            *ngIf="getTopBowlerImage(bowler)" 
                            [src]="getTopBowlerImage(bowler)"
                            class="w-8 h-8 rounded-full object-cover border-2 border-cyan-500"
                          >
                          <div *ngIf="!getTopBowlerImage(bowler)" class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-cyan-500">
                            <span class="text-sm">⚾</span>
                          </div>
                          <span class="text-gray-300">{{ getShortPlayerName(bowler.player) }}</span>
                        </div>
                        <span class="text-cyan-400 font-semibold text-lg">{{ bowler.wickets }}-{{ bowler.runs }} ({{ getBowlerOversDisplay(bowler) }})</span>
                      </div>
                    </div>
                  </div>

                  <!-- 2nd Innings -->
                  <div class="bg-gray-800/60 rounded-lg p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-5">
                      <div class="flex items-center gap-3">
                        <div class="w-14 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded flex items-center justify-center text-base font-bold">
                          {{ getTeamCode(match.innings[1]?.battingTeam) }}
                        </div>
                        <div>
                          <div class="font-bold text-lg">{{ getTeamName(match.innings[1]?.battingTeam) }}</div>
                          <div class="text-gray-500 text-sm uppercase">2nd Innings</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-4xl font-bold">{{ match.innings[1]?.totalRuns || 0 }}/{{ match.innings[1]?.totalWickets || 0 }}</div>
                        <div class="text-gray-500 text-base">({{ getInningsOvers(match.innings[1]) }} ov)</div>
                      </div>
                    </div>
                    <div class="space-y-2 mb-4">
                      <ng-container *ngFor="let batsman of getTopBatsmen(match.innings[1], 3)">
                        <div class="flex justify-between items-center text-base">
                          <div class="flex items-center gap-3">
                            <img 
                              *ngIf="getTopBatsmanImage(batsman)" 
                              [src]="getTopBatsmanImage(batsman)"
                              class="w-8 h-8 rounded-full object-cover border-2 border-gray-600"
                            >
                            <div *ngIf="!getTopBatsmanImage(batsman)" class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                              <span class="text-sm">🏏</span>
                            </div>
                            <span class="text-gray-300">{{ getShortPlayerName(batsman.player) }}</span>
                          </div>
                          <span><span class="font-bold text-lg">{{ batsman.runs }}</span> <span class="text-gray-500">({{ batsman.balls }})</span></span>
                        </div>
                      </ng-container>
                    </div>
                    <div class="border-t border-gray-700 pt-4">
                      <div class="text-sm text-gray-500 uppercase mb-2">Best Bowler</div>
                      <div *ngIf="getSummaryBowlers(1, 1)[0] as bowler" class="flex justify-between items-center text-base">
                        <div class="flex items-center gap-3">
                          <img 
                            *ngIf="getTopBowlerImage(bowler)" 
                            [src]="getTopBowlerImage(bowler)"
                            class="w-8 h-8 rounded-full object-cover border-2 border-cyan-500"
                          >
                          <div *ngIf="!getTopBowlerImage(bowler)" class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-cyan-500">
                            <span class="text-sm">⚾</span>
                          </div>
                          <span class="text-gray-300">{{ getShortPlayerName(bowler.player) }}</span>
                        </div>
                        <span class="text-cyan-400 font-semibold text-lg">{{ bowler.wickets }}-{{ bowler.runs }} ({{ getBowlerOversDisplay(bowler) }})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Stats Comparison -->
                <div class="grid grid-cols-4 gap-4">
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="flex justify-center gap-5 text-lg">
                      <span class="text-gray-400">{{ getSummaryFours(0) }}</span>
                      <span class="text-green-400 font-bold">4s</span>
                      <span class="text-gray-400">{{ getSummaryFours(1) }}</span>
                    </div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="flex justify-center gap-5 text-lg">
                      <span class="text-gray-400">{{ getSummarySixes(0) }}</span>
                      <span class="text-purple-400 font-bold">6s</span>
                      <span class="text-gray-400">{{ getSummarySixes(1) }}</span>
                    </div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="flex justify-center gap-5 text-lg">
                      <span class="text-gray-400">{{ getSummaryExtras(0) }}</span>
                      <span class="text-yellow-400 font-bold">Ext</span>
                      <span class="text-gray-400">{{ getSummaryExtras(1) }}</span>
                    </div>
                  </div>
                  <div class="bg-gray-800/60 rounded-lg p-4 text-center backdrop-blur-sm">
                    <div class="flex justify-center gap-5 text-lg">
                      <span class="text-gray-400">{{ getSummaryRunRate(0) }}</span>
                      <span class="text-cyan-400 font-bold">RR</span>
                      <span class="text-gray-400">{{ getSummaryRunRate(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ==================== PROJECTIONS VIEW ==================== -->
          <div *ngIf="displayView === 'projections'" class="h-full flex flex-row p-4 gap-4 overflow-hidden">
            
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
          <div *ngIf="displayView === 'partnership'" class="h-full flex flex-col relative">
            
            <!-- Player Image Overlays (like flag overlays) -->
            <div class="absolute inset-0 z-0 pointer-events-none">
              <!-- Striker Image (Left Side) -->
              <div 
                *ngIf="getStrikerImage()" 
                class="absolute left-0 bottom-0 h-full w-1/2 flex items-end justify-start overflow-hidden"
              >
                <img 
                  [src]="getStrikerImage()"
                  class="h-[90%] w-auto object-contain object-bottom opacity-30"
                  style="filter: grayscale(30%); mix-blend-mode: luminosity;"
                >
              </div>
              
              <!-- Non-Striker Image (Right Side) -->
              <div 
                *ngIf="getNonStrikerImage()" 
                class="absolute right-0 bottom-0 h-full w-1/2 flex items-end justify-end overflow-hidden"
              >
                <img 
                  [src]="getNonStrikerImage()"
                  class="h-[90%] w-auto object-contain object-bottom opacity-30"
                  style="filter: grayscale(30%); mix-blend-mode: luminosity; transform: scaleX(-1);"
                >
              </div>
              
              <!-- Center gradient overlay for better text readability -->
              <div class="absolute inset-0" style="background: linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 25%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.7) 100%);"></div>
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
  displayView = 'score-summary';
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
  private playerNameCache: Map<string, string> = new Map();
  private playerImageCache: Map<string, string> = new Map();
  
  // ESPN CDN base URL for player images
  private readonly ESPN_CDN_BASE = 'https://img1.hscicdn.com/image/upload';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
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
  }

  loadMatch() {
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.match = response.data;
          this.displayView = this.match.displayView || 'score-summary';
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
          this.displayView = this.match.displayView || 'score-summary';
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
    // Get flag videos from current batting and bowling teams
    const battingTeam = this.currentInnings?.battingTeam;
    const bowlingTeam = this.currentInnings?.bowlingTeam;
    
    // For batting team flag video, check if team object has flagVideo
    this.battingTeamFlagVideo = battingTeam?.flagVideo || this.getTeamFlagVideo(battingTeam);
    this.bowlingTeamFlagVideo = bowlingTeam?.flagVideo || this.getTeamFlagVideo(bowlingTeam);
  }

  getTeamFlagVideo(team: any): string | null {
    if (!team) return null;
    
    // If team has flagVideo directly
    if (team.flagVideo) return team.flagVideo;
    
    // Try to find from match teams
    const teamId = team._id || team;
    if (this.match?.team1?._id === teamId || this.match?.team1 === teamId) {
      return this.match.team1?.flagVideo || null;
    }
    if (this.match?.team2?._id === teamId || this.match?.team2 === teamId) {
      return this.match.team2?.flagVideo || null;
    }
    return null;
  }

  buildPlayerNameCache() {
    if (!this.match) return;
    const cachePlayer = (player: any) => {
      if (!player) return;
      const playerId = player._id || player;
      if (playerId && player.name) {
        this.playerNameCache.set(playerId.toString(), player.name);
      }
      if (playerId && player.headshotPath) {
        // Store the full URL in cache
        const fullUrl = this.buildImageUrl(player.headshotPath);
        if (fullUrl) {
          this.playerImageCache.set(playerId.toString(), fullUrl);
        }
      }
    };
    const cacheFromSquad = (squad: any[]) => {
      if (!squad) return;
      squad.forEach(p => cachePlayer(p.player));
    };
    cacheFromSquad(this.match.squads?.team1);
    cacheFromSquad(this.match.squads?.team2);
    this.match.innings?.forEach((inn: any) => {
      cachePlayer(inn.currentBatsmen?.striker);
      cachePlayer(inn.currentBatsmen?.nonStriker);
      cachePlayer(inn.currentBowler);
      inn.battingStats?.forEach((bs: any) => cachePlayer(bs.player));
      inn.bowlingStats?.forEach((bs: any) => cachePlayer(bs.player));
      inn.fallOfWickets?.forEach((fow: any) => cachePlayer(fow.player));
    });
  }

  connectSSE() {
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);
    const events = ['score-update', 'over-complete', 'innings-complete', 
                    'innings-start', 'match-complete', 'batsmen-change', 'bowler-change', 'background-change'];
    events.forEach(event => {
      this.eventSource!.addEventListener(event, () => this.reloadMatch());
    });
    
    // Special notification events
    this.eventSource.addEventListener('six', (event: any) => {
      const data = JSON.parse(event.data);
      this.showBigNotification('six', data);
      this.reloadMatch();
    });
    
    this.eventSource.addEventListener('four', (event: any) => {
      const data = JSON.parse(event.data);
      this.showBigNotification('four', data);
      this.reloadMatch();
    });
    
    this.eventSource.addEventListener('wicket', (event: any) => {
      const data = JSON.parse(event.data);
      this.showBigNotification('wicket', data);
      this.reloadMatch();
    });
    
    // Third Umpire events
    this.eventSource.addEventListener('third-umpire-start', (event: any) => {
      this.showThirdUmpireOverlay();
    });
    
    this.eventSource.addEventListener('third-umpire-decision', (event: any) => {
      const data = JSON.parse(event.data);
      this.showThirdUmpireDecision(data.decision);
    });
    
    // Custom message events
    this.eventSource.addEventListener('custom-message', (event: any) => {
      const data = JSON.parse(event.data);
      this.showCustomMessage(data.message);
    });
    
    this.eventSource.addEventListener('custom-message-dismiss', () => {
      this.dismissNotification();
    });
    
    this.eventSource.addEventListener('view-change', (event: any) => {
      const data = JSON.parse(event.data);
      if (data.view) {
        this.displayView = data.view;
        this.updateBackground();
      }
      this.reloadMatch();
    });
    this.eventSource.addEventListener('match-state', (event: any) => {
      const data = JSON.parse(event.data);
      if (data.displayView) {
        this.displayView = data.displayView;
        this.updateBackground();
      }
      this.reloadMatch();
    });
    this.eventSource.onerror = () => {
      this.disconnectSSE();
      setTimeout(() => this.connectSSE(), 3000);
    };
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
      'score-summary': 'Live Score',
      'player-stats': 'Scorecard',
      'overall-summary': 'Match Summary',
      'projections': 'Projections',
      'partnership': 'Partnership'
    };
    return names[this.displayView] || 'Live Score';
  }

  getPlayerName(player: any): string {
    if (!player) return 'Unknown';
    if (player.name) return player.name;
    const playerId = player._id || player;
    return this.playerNameCache.get(playerId?.toString()) || 'Unknown';
  }

  getPlayerImage(player: any): string | null {
    if (!player) return null;
    
    // Check for headshotPath and build full URL
    if (player.headshotPath) {
      return this.buildImageUrl(player.headshotPath);
    }
    
    // Check for already-built imageUrl
    if (player.imageUrl) {
      return player.imageUrl;
    }
    
    // Try to find in cache if player is just an ID
    const playerId = player._id || player;
    return this.playerImageCache.get(playerId?.toString()) || null;
  }

  // Build full ESPN CDN URL from relative path
  private buildImageUrl(headshotPath: string): string | null {
    if (!headshotPath) return null;
    
    // If it's already a full URL, return as-is
    if (headshotPath.startsWith('http')) {
      return headshotPath;
    }
    
    // Build full URL from relative path
    return `${this.ESPN_CDN_BASE}${headshotPath}`;
  }

  // ==================== LIVE SCORE VIEW HELPERS ====================

  getBattingTeamCode(): string {
    if (!this.currentInnings?.battingTeam) return '???';
    return this.currentInnings.battingTeam.code || this.getTeamCode(this.currentInnings.battingTeam);
  }

  getBattingTeamFlag(): string | null {
    const battingTeam = this.currentInnings?.battingTeam;
    if (!battingTeam) return null;
    
    // Check for flag directly on team object
    if (battingTeam.flag) return battingTeam.flag;
    
    // Try to find from match teams
    const teamId = battingTeam._id || battingTeam;
    if (this.match?.team1?._id === teamId || this.match?.team1 === teamId) {
      return this.match.team1?.flag || null;
    }
    if (this.match?.team2?._id === teamId || this.match?.team2 === teamId) {
      return this.match.team2?.flag || null;
    }
    return null;
  }

  getBowlingTeamCode(): string {
    if (!this.currentInnings?.bowlingTeam) return '???';
    return this.currentInnings.bowlingTeam.code || this.getTeamCode(this.currentInnings.bowlingTeam);
  }

  getTeamCode(team: any): string {
    if (!team) return '???';
    if (team.code) return team.code;
    const teamId = team._id || team;
    if (this.match.team1?._id === teamId || this.match.team1 === teamId) {
      return this.match.team1?.code || 'T1';
    }
    if (this.match.team2?._id === teamId || this.match.team2 === teamId) {
      return this.match.team2?.code || 'T2';
    }
    return '???';
  }

  getTeamName(team: any): string {
    if (!team) return 'Unknown';
    if (team.name) return team.name;
    const teamId = team._id || team;
    if (this.match.team1?._id === teamId || this.match.team1 === teamId) {
      return this.match.team1?.name || 'Team 1';
    }
    if (this.match.team2?._id === teamId || this.match.team2 === teamId) {
      return this.match.team2?.name || 'Team 2';
    }
    return 'Unknown';
  }

  getBattingTeamName(): string {
    return this.getTeamName(this.currentInnings?.battingTeam);
  }

  getBowlingTeamName(): string {
    return this.getTeamName(this.currentInnings?.bowlingTeam);
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
    const balls = this.currentInnings?.totalBalls || 0;
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }

  getCurrentRunRate(): string {
    const balls = this.currentInnings?.totalBalls || 0;
    const runs = this.currentInnings?.totalRuns || 0;
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
  }

  getRequiredRunRate(): string {
    if (this.match?.currentInnings !== 1) return '-';
    const runsNeeded = this.getRunsNeeded();
    const ballsRemaining = this.getBallsRemaining();
    if (ballsRemaining <= 0) return '-';
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  }

  getTarget(): number {
    if (!this.match?.innings?.[0]) return 0;
    return (this.match.innings[0].totalRuns || 0) + 1;
  }

  getRunsNeeded(): number {
    return Math.max(0, this.getTarget() - (this.currentInnings?.totalRuns || 0));
  }

  getBallsRemaining(): number {
    const maxBalls = this.match?.format === 'T20' ? 120 : 300;
    return Math.max(0, maxBalls - (this.currentInnings?.totalBalls || 0));
  }

  getOversRemaining(): string {
    const balls = this.getBallsRemaining();
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }

  // ==================== PLAYER STATS VIEW HELPERS ====================

  getInningsLabel(): string {
    const idx = this.match?.currentInnings || 0;
    return idx === 0 ? '1st Innings' : '2nd Innings';
  }

  getBattingStats(): any[] {
    // Get all 11 batsmen in batting order with DNB for those who haven't batted
    const battingTeamId = this.currentInnings?.battingTeam?._id || this.currentInnings?.battingTeam;
    const team1Id = this.match?.team1?._id || this.match?.team1;
    const isTeam1 = battingTeamId === team1Id || battingTeamId?.toString() === team1Id?.toString();
    const squad = isTeam1 ? this.match?.squads?.team1 : this.match?.squads?.team2;
    
    if (!squad) return this.currentInnings?.battingStats || [];
    
    // Get Playing XI sorted by batting order
    const playingXI = squad
      .filter((p: any) => p.isPlayingXI)
      .sort((a: any, b: any) => (a.battingOrder || 99) - (b.battingOrder || 99));
    
    if (playingXI.length === 0) return this.currentInnings?.battingStats || [];
    
    // Create a map of actual batting stats by player ID
    const battingStatsMap = new Map<string, any>();
    (this.currentInnings?.battingStats || []).forEach((stat: any) => {
      const playerId = (stat.player?._id || stat.player)?.toString();
      if (playerId) {
        battingStatsMap.set(playerId, stat);
      }
    });
    
    // Build combined list: actual stats for those who batted, DNB placeholder for others
    return playingXI.map((squadPlayer: any) => {
      const playerId = (squadPlayer.player?._id || squadPlayer.player)?.toString();
      const existingStats = battingStatsMap.get(playerId);
      
      if (existingStats) {
        return existingStats;
      }
      
      // DNB placeholder
      return {
        player: squadPlayer.player,
        runs: null,
        balls: null,
        fours: 0,
        sixes: 0,
        isOut: false,
        isNotOut: false,
        isDNB: true, // Flag for "Did Not Bat"
        battingOrder: squadPlayer.battingOrder
      };
    });
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
    if (!batsman.isOut) {
      if (batsman.isNotOut || this.isCurrentBatsman(batsman)) return 'not out';
      return 'did not bat';
    }
    const d = batsman.dismissal;
    if (!d?.type) return 'out';
    switch (d.type) {
      case 'bowled': return `b ${this.getPlayerName(d.bowler)}`;
      case 'caught':
        const fielder = this.getPlayerName(d.fielder);
        const bowler = this.getPlayerName(d.bowler);
        return fielder === bowler ? `c & b ${bowler}` : `c ${fielder} b ${bowler}`;
      case 'lbw': return `lbw b ${this.getPlayerName(d.bowler)}`;
      case 'run-out': return `run out (${this.getPlayerName(d.fielder)})`;
      case 'stumped': return `st ${this.getPlayerName(d.fielder)} b ${this.getPlayerName(d.bowler)}`;
      case 'hit-wicket': return `hit wicket b ${this.getPlayerName(d.bowler)}`;
      default: return 'out';
    }
  }

  getShortHowOut(batsman: any): string {
    if (!batsman.isOut || !batsman.dismissal?.type) return '';
    const d = batsman.dismissal;
    switch (d.type) {
      case 'bowled': return 'b';
      case 'caught': return 'c';
      case 'lbw': return 'lbw';
      case 'run-out': return 'r/o';
      case 'stumped': return 'st';
      case 'hit-wicket': return 'hw';
      default: return '';
    }
  }

  getStrikeRate(batsman: any): string {
    if (!batsman.balls) return '0.00';
    return ((batsman.runs / batsman.balls) * 100).toFixed(2);
  }

  getBowlerOversDisplay(bowler: any): string {
    return `${bowler.overs || 0}.${bowler.balls || 0}`;
  }

  getBowlerEconomy(bowler: any): string {
    const totalBalls = ((bowler.overs || 0) * 6) + (bowler.balls || 0);
    if (totalBalls === 0) return '0.00';
    return ((bowler.runs / totalBalls) * 6).toFixed(2);
  }

  getTotalExtras(): number {
    const e = this.currentInnings?.extras;
    if (!e) return 0;
    return (e.wides || 0) + (e.noBalls || 0) + (e.byes || 0) + (e.legByes || 0);
  }

  getExtrasBreakdown(): string {
    const e = this.currentInnings?.extras;
    if (!e) return '';
    const parts = [];
    if (e.wides) parts.push(`W ${e.wides}`);
    if (e.noBalls) parts.push(`NB ${e.noBalls}`);
    if (e.byes) parts.push(`B ${e.byes}`);
    if (e.legByes) parts.push(`LB ${e.legByes}`);
    return parts.join(', ');
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
    const balls = innings?.totalBalls || 0;
    return `${Math.floor(balls / 6)}.${balls % 6}`;
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
    if (!this.match?.innings?.[1]) {
      return this.getTeamName(this.match?.innings?.[0]?.bowlingTeam);
    }
    return this.getTeamName(this.match.innings[1].battingTeam);
  }

  getFirstBattingTeamName(): string {
    return this.getTeamName(this.match?.innings?.[0]?.battingTeam);
  }

  // ==================== PROJECTIONS VIEW HELPERS ====================

  getFirstInningsTeamName(): string {
    return this.getTeamName(this.match?.innings?.[0]?.battingTeam);
  }

  getSecondInningsTeamName(): string {
    return this.getTeamName(this.match?.innings?.[1]?.battingTeam);
  }

  getOversAxisLabels(): number[] {
    const maxOvers = this.match?.format === 'T20' ? 20 : 50;
    const step = maxOvers === 20 ? 5 : 10;
    const labels = [];
    for (let i = 0; i <= maxOvers; i += step) {
      labels.push(i);
    }
    return labels;
  }

  getOversScale(): number {
    const maxOvers = this.match?.format === 'T20' ? 20 : 50;
    return 450 / maxOvers;
  }

  getOversScaleLarge(): number {
    const maxOvers = this.match?.format === 'T20' ? 20 : 50;
    return 530 / maxOvers;
  }

  getFirstInningsData(): { over: number; runs: number }[] {
    return this.getInningsGraphData(0);
  }

  getSecondInningsData(): { over: number; runs: number }[] {
    return this.getInningsGraphData(1);
  }

  getInningsGraphData(inningsIndex: number): { over: number; runs: number }[] {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return [];
    
    const points: { over: number; runs: number }[] = [];
    
    // Get the total completed overs
    const completedOvers = Math.floor((innings.totalBalls || 0) / 6);
    const totalRuns = innings.totalRuns || 0;
    
    if (completedOvers === 0) return [];
    
    // Try to use over-by-over data if available
    const overs = innings.overs || [];
    
    if (overs.length > 0 && overs.length >= completedOvers) {
      // We have complete over data - use it directly
      let cumulativeRuns = 0;
      
      overs.forEach((over: any, idx: number) => {
        let overRuns = 0;
        if (typeof over.runs === 'number' && over.runs > 0) {
          overRuns = over.runs;
        } else if (over.balls && over.balls.length > 0) {
          overRuns = over.balls.reduce((sum: number, ball: any) => sum + (ball.runs || 0), 0);
        }
        cumulativeRuns += overRuns;
        points.push({ over: idx + 1, runs: cumulativeRuns });
      });
      
      // Adjust if there's a discrepancy
      if (points.length > 0 && totalRuns > 0) {
        const lastPointRuns = points[points.length - 1].runs;
        if (Math.abs(lastPointRuns - totalRuns) > 2) {
          const scaleFactor = totalRuns / lastPointRuns;
          points.forEach(p => {
            p.runs = Math.round(p.runs * scaleFactor);
          });
          points[points.length - 1].runs = totalRuns;
        }
      }
    } else if (overs.length > 0 && overs.length < completedOvers) {
      // PARTIAL DATA: We have some overs but not all
      // Use actual data for available overs, then interpolate the rest
      let cumulativeRuns = 0;
      
      // First, add the overs we have data for
      overs.forEach((over: any, idx: number) => {
        let overRuns = 0;
        if (typeof over.runs === 'number' && over.runs > 0) {
          overRuns = over.runs;
        } else if (over.balls && over.balls.length > 0) {
          overRuns = over.balls.reduce((sum: number, ball: any) => sum + (ball.runs || 0), 0);
        }
        cumulativeRuns += overRuns;
        points.push({ over: idx + 1, runs: cumulativeRuns });
      });
      
      // Calculate remaining runs and overs
      const remainingRuns = totalRuns - cumulativeRuns;
      const remainingOvers = completedOvers - overs.length;
      
      if (remainingOvers > 0 && remainingRuns > 0) {
        const avgRunsPerRemainingOver = remainingRuns / remainingOvers;
        
        // Add interpolated points for the remaining overs
        for (let i = 1; i <= remainingOvers; i++) {
          cumulativeRuns += avgRunsPerRemainingOver;
          points.push({ 
            over: overs.length + i, 
            runs: Math.round(cumulativeRuns) 
          });
        }
      }
      
      // Ensure last point matches exact total
      if (points.length > 0) {
        points[points.length - 1].runs = totalRuns;
      }
    } else {
      // No over data - use pure linear interpolation
      const runsPerOver = totalRuns / completedOvers;
      
      for (let i = 1; i <= completedOvers; i++) {
        points.push({ 
          over: i, 
          runs: Math.round(runsPerOver * i) 
        });
      }
      
      if (points.length > 0) {
        points[points.length - 1].runs = totalRuns;
      }
    }
    
    return points;
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
    const balls = this.currentInnings?.totalBalls || 0;
    const runs = this.currentInnings?.totalRuns || 0;
    if (balls === 0) return 0;
    const maxBalls = this.match?.format === 'T20' ? 120 : 300;
    const runRate = runs / balls;
    return Math.round(runRate * maxBalls);
  }

  getWinProbability(): number {
    if (this.match?.currentInnings !== 1) return 50;
    const runsNeeded = this.getRunsNeeded();
    const ballsRemaining = this.getBallsRemaining();
    const wicketsInHand = 10 - (this.currentInnings?.totalWickets || 0);
    if (runsNeeded <= 0) return 100;
    if (wicketsInHand === 0 || ballsRemaining === 0) return 0;
    const requiredRunRate = (runsNeeded / ballsRemaining) * 6;
    const currentRunRate = this.currentInnings?.totalBalls > 0 
      ? (this.currentInnings.totalRuns / this.currentInnings.totalBalls) * 6 
      : 0;
    let probability = 50;
    const runRateDiff = currentRunRate - requiredRunRate;
    probability += runRateDiff * 8;
    probability += (wicketsInHand - 5) * 4;
    const maxBalls = this.match?.format === 'T20' ? 120 : 300;
    const ballsFactor = ballsRemaining / maxBalls;
    probability = probability * (0.6 + ballsFactor * 0.4);
    return Math.max(5, Math.min(95, Math.round(probability)));
  }

  // ==================== NEW PLAYER STATS VIEW HELPERS ====================

  getShortDismissal(batsman: any): string {
    // Handle DNB (Did Not Bat)
    if (batsman.isDNB) {
      return 'DNB';
    }
    
    if (!batsman.isOut) {
      if (batsman.isNotOut || this.isCurrentBatsman(batsman)) return 'not out';
      return '';
    }
    const d = batsman.dismissal;
    if (!d?.type) return 'out';
    const bowlerName = this.getPlayerName(d.bowler)?.split(' ').pop() || '';
    switch (d.type) {
      case 'bowled': return `b ${bowlerName}`;
      case 'caught': return `c b ${bowlerName}`;
      case 'lbw': return `lbw ${bowlerName}`;
      case 'run-out': return 'run out';
      case 'stumped': return `st b ${bowlerName}`;
      case 'hit-wicket': return 'hit wkt';
      default: return 'out';
    }
  }

  getShortPlayerName(player: any): string {
    const name = this.getPlayerName(player);
    return name?.split(' ').pop() || 'Unknown';
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
    const battingStats = this.currentInnings?.battingStats || [];
    return battingStats.reduce((sum: number, b: any) => sum + (b.fours || 0), 0);
  }

  getTotalSixes(): number {
    const battingStats = this.currentInnings?.battingStats || [];
    return battingStats.reduce((sum: number, b: any) => sum + (b.sixes || 0), 0);
  }

  getDotBallsPercentage(): number {
    const bowlingStats = this.currentInnings?.bowlingStats || [];
    const totalDots = bowlingStats.reduce((sum: number, b: any) => sum + (b.dotBalls || 0), 0);
    const totalBalls = this.currentInnings?.totalBalls || 0;
    if (totalBalls === 0) return 0;
    return Math.round((totalDots / totalBalls) * 100);
  }

  // ==================== SUMMARY VIEW HELPERS ====================

  getSummaryRunRate(inningsIndex: number): string {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return '0.00';
    const balls = innings.totalBalls || 0;
    const runs = innings.totalRuns || 0;
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
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
    if (!innings?.battingStats) return 0;
    return innings.battingStats.reduce((sum: number, b: any) => sum + (b.fours || 0), 0);
  }

  getSummarySixes(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings?.battingStats) return 0;
    return innings.battingStats.reduce((sum: number, b: any) => sum + (b.sixes || 0), 0);
  }

  getSummaryExtras(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings?.extras) return 0;
    const e = innings.extras;
    return (e.wides || 0) + (e.noBalls || 0) + (e.byes || 0) + (e.legByes || 0);
  }

  getSummaryBallsRemaining(inningsIndex: number): number {
    const innings = this.match?.innings?.[inningsIndex];
    if (!innings) return 0;
    const maxBalls = this.match?.format === 'T20' ? 120 : 300;
    return Math.max(0, maxBalls - (innings.totalBalls || 0));
  }

  // ==================== PROJECTIONS VIEW HELPERS (NEW LAYOUT) ====================

  getYAxisLabels(): number[] {
    const maxRuns = this.getMaxRunsForGraph();
    const step = maxRuns <= 150 ? 25 : maxRuns <= 250 ? 50 : 100;
    const labels = [];
    for (let i = 0; i <= maxRuns; i += step) {
      labels.push(i);
    }
    return labels;
  }

  getMaxRunsForGraph(): number {
    const firstMax = this.match?.innings?.[0]?.totalRuns || 0;
    const secondMax = this.match?.innings?.[1]?.totalRuns || 0;
    const target = this.getTarget();
    const maxRuns = Math.max(firstMax, secondMax, target, 100);
    // Round up to nearest 50 for clean axis
    return Math.ceil(maxRuns / 50) * 50;
  }

  getXScale(): number {
    const maxOvers = this.match?.format === 'T20' ? 20 : 50;
    return 620 / maxOvers;  // Graph width is 620
  }

  getYScale(): number {
    const maxRuns = this.getMaxRunsForGraph();
    return 320 / maxRuns;  // Graph height is 320
  }

  getFirstInningsLinePointsXL(): string {
    return this.getFirstInningsData()
      .map(p => `${60 + (p.over * this.getXScale())},${350 - (p.runs * this.getYScale())}`)
      .join(' ');
  }

  getSecondInningsLinePointsXL(): string {
    return this.getSecondInningsData()
      .map(p => `${60 + (p.over * this.getXScale())},${350 - (p.runs * this.getYScale())}`)
      .join(' ');
  }

  getFirstInningsAreaPoints(): string {
    const data = this.getFirstInningsData();
    if (data.length === 0) return '';
    const baseY = 350;
    const startX = 60 + (data[0].over * this.getXScale());
    const endX = 60 + (data[data.length - 1].over * this.getXScale());
    const linePoints = data.map(p => `${60 + (p.over * this.getXScale())},${350 - (p.runs * this.getYScale())}`).join(' ');
    return `${startX},${baseY} ${linePoints} ${endX},${baseY}`;
  }

  getSecondInningsAreaPoints(): string {
    const data = this.getSecondInningsData();
    if (data.length === 0) return '';
    const baseY = 350;
    const startX = 60 + (data[0].over * this.getXScale());
    const endX = 60 + (data[data.length - 1].over * this.getXScale());
    const linePoints = data.map(p => `${60 + (p.over * this.getXScale())},${350 - (p.runs * this.getYScale())}`).join(' ');
    return `${startX},${baseY} ${linePoints} ${endX},${baseY}`;
  }

  // ==================== PARTNERSHIP VIEW HELPERS ====================

  getStrikerDots(): number {
    const stats = this.getStrikerStats();
    if (!stats) return 0;
    // If dotBalls is tracked
    if (stats.dotBalls !== undefined) return stats.dotBalls;
    // Otherwise calculate: balls - (runs scored on balls) roughly
    // Simplified: balls - (fours*1 + sixes*1 + other scoring shots)
    // For simplicity, just count non-boundary non-zero balls
    const balls = stats.balls || 0;
    const fours = stats.fours || 0;
    const sixes = stats.sixes || 0;
    const runs = stats.runs || 0;
    // Rough estimate: dots = balls - boundary balls - singles/doubles/triples balls
    // More accurate: dots = balls where 0 runs scored
    // Without ball-by-ball data, estimate based on runs
    const boundaryBalls = fours + sixes;
    const nonBoundaryRuns = runs - (fours * 4) - (sixes * 6);
    const nonBoundaryBalls = balls - boundaryBalls;
    // Assume non-boundary runs came from non-boundary balls (1-3 runs each)
    const scoringNonBoundaryBalls = nonBoundaryRuns > 0 ? Math.min(nonBoundaryRuns, nonBoundaryBalls) : 0;
    const dotBalls = Math.max(0, nonBoundaryBalls - scoringNonBoundaryBalls);
    return dotBalls;
  }

  getNonStrikerDots(): number {
    const stats = this.getNonStrikerStats();
    if (!stats) return 0;
    if (stats.dotBalls !== undefined) return stats.dotBalls;
    const balls = stats.balls || 0;
    const fours = stats.fours || 0;
    const sixes = stats.sixes || 0;
    const runs = stats.runs || 0;
    const boundaryBalls = fours + sixes;
    const nonBoundaryRuns = runs - (fours * 4) - (sixes * 6);
    const nonBoundaryBalls = balls - boundaryBalls;
    const scoringNonBoundaryBalls = nonBoundaryRuns > 0 ? Math.min(nonBoundaryRuns, nonBoundaryBalls) : 0;
    const dotBalls = Math.max(0, nonBoundaryBalls - scoringNonBoundaryBalls);
    return dotBalls;
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
