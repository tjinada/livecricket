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
          muted
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
        
        <!-- Dark Overlay for readability -->
        <div class="absolute inset-0 bg-black/40"></div>
      </div>

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
              <div class="text-center mb-6">
                <!-- Team Badge & Name -->
                <div class="flex items-center justify-center gap-3 mb-4">
                  <div class="w-14 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-lg font-bold shadow-lg">
                    {{ getBattingTeamCode() }}
                  </div>
                  <span class="text-2xl font-light text-gray-300">{{ getBattingTeamName() }}</span>
                </div>
                
                <!-- Big Score -->
                <div class="relative">
                  <div class="flex items-baseline justify-center gap-2">
                    <span class="text-8xl font-black tracking-tight text-white drop-shadow-lg">{{ currentInnings?.totalRuns || 0 }}</span>
                    <span class="text-5xl font-light text-gray-400">/</span>
                    <span class="text-6xl font-bold text-gray-300">{{ currentInnings?.totalWickets || 0 }}</span>
                  </div>
                  <div class="text-xl text-gray-400 mt-2 font-light">
                    <span class="text-gray-500">(</span>{{ getOversDisplay() }} overs<span class="text-gray-500">)</span>
                  </div>
                </div>
              </div>

              <!-- Current Batsmen Card -->
              <div class="bg-gradient-to-r from-gray-800/80 via-gray-700/80 to-gray-800/80 backdrop-blur-sm rounded-xl px-8 py-4 mb-4 shadow-xl border border-gray-700/30">
                <div class="flex items-center gap-12">
                  <!-- Striker -->
                  <div class="flex items-center gap-3">
                    <span class="text-yellow-400 text-xl">●</span>
                    <div>
                      <div class="font-bold text-lg">{{ getStrikerName() }}</div>
                      <div class="text-gray-400 text-sm">Striker</div>
                    </div>
                    <div class="text-right ml-4">
                      <div class="text-2xl font-bold">{{ getStrikerRuns() }}<span class="text-gray-500 text-base ml-1">({{ getStrikerBalls() }})</span></div>
                      <div class="text-xs text-gray-500">SR: {{ getStrikerSR() }}</div>
                    </div>
                  </div>
                  
                  <div class="w-px h-12 bg-gray-600"></div>
                  
                  <!-- Non-Striker -->
                  <div class="flex items-center gap-3">
                    <span class="text-gray-500 text-xl">○</span>
                    <div>
                      <div class="font-semibold text-gray-300">{{ getNonStrikerName() }}</div>
                      <div class="text-gray-500 text-sm">Non-striker</div>
                    </div>
                    <div class="text-right ml-4">
                      <div class="text-xl text-gray-300">{{ getNonStrikerRuns() }}<span class="text-gray-500 text-sm ml-1">({{ getNonStrikerBalls() }})</span></div>
                      <div class="text-xs text-gray-500">SR: {{ getNonStrikerSR() }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- Partnership -->
                <div class="mt-3 pt-3 border-t border-gray-600/50 text-center">
                  <span class="text-gray-500 text-sm">Partnership: </span>
                  <span class="text-white font-semibold">{{ getPartnershipRuns() }}</span>
                  <span class="text-gray-500 text-sm"> ({{ getPartnershipBalls() }} balls)</span>
                </div>
              </div>

              <!-- Last Wicket Info (if any wickets have fallen) -->
              <div *ngIf="getLastWicket()" class="bg-red-900/30 backdrop-blur-sm rounded-lg px-6 py-2 mb-4 border border-red-700/30">
                <span class="text-red-400 text-sm">Last Wkt: </span>
                <span class="text-white font-medium">{{ getLastWicket() }}</span>
              </div>

              <!-- Recent Overs Timeline -->
              <div *ngIf="getRecentOvers().length > 0" class="bg-gray-800/60 backdrop-blur-sm rounded-xl px-6 py-4 mb-4">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3 text-center">Recent Overs</div>
                <div class="flex items-center justify-center gap-4">
                  <ng-container *ngFor="let over of getRecentOvers(); let i = index">
                    <div class="flex flex-col items-center">
                      <div class="text-xs text-gray-500 mb-1">Ov {{ over.overNumber }}</div>
                      <div class="flex gap-1">
                        <ng-container *ngFor="let ball of over.balls">
                          <div 
                            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md"
                            [ngClass]="getBallColorClass(ball)"
                          >
                            {{ ball.display === '0' ? '•' : ball.display }}
                          </div>
                        </ng-container>
                      </div>
                      <div class="text-xs text-gray-400 mt-1">{{ over.runs }} runs</div>
                    </div>
                    <div *ngIf="i < getRecentOvers().length - 1" class="w-px h-10 bg-gray-600"></div>
                  </ng-container>
                </div>
              </div>

            </div>

            <!-- Bottom Stats Bar -->
            <div class="bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm border-t border-gray-700/50">
              <div class="max-w-6xl mx-auto px-6 py-3">
                <div class="flex items-center justify-between">
                  
                  <!-- Current Bowler -->
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-7 bg-gray-600 rounded flex items-center justify-center text-xs font-bold">
                      {{ getBowlingTeamCode() }}
                    </div>
                    <div>
                      <div class="font-semibold">{{ getCurrentBowlerName() }}</div>
                      <div class="text-gray-400 text-sm">{{ getCurrentBowlerFullFigures() }}</div>
                    </div>
                  </div>

                  <!-- This Over -->
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500 uppercase mr-2">This Over</span>
                    <ng-container *ngFor="let ball of getCurrentOverBalls()">
                      <div 
                        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md"
                        [ngClass]="getBallColorClass(ball)"
                      >
                        {{ ball.display === '0' ? '•' : ball.display }}
                      </div>
                    </ng-container>
                    <ng-container *ngFor="let i of getRemainingBallsInOver()">
                      <div class="w-8 h-8 rounded-full border-2 border-gray-600 border-dashed flex items-center justify-center text-xs text-gray-600">
                      </div>
                    </ng-container>
                  </div>

                  <!-- Run Rates -->
                  <div class="flex items-center gap-6 text-sm">
                    <div>
                      <span class="text-gray-500">CRR </span>
                      <span class="text-xl font-bold text-green-400">{{ getCurrentRunRate() }}</span>
                    </div>
                    <div *ngIf="match.currentInnings === 1">
                      <span class="text-gray-500">RRR </span>
                      <span class="text-xl font-bold text-orange-400">{{ getRequiredRunRate() }}</span>
                    </div>
                    <div *ngIf="match.currentInnings === 1" class="pl-4 border-l border-gray-600">
                      <span class="text-gray-500">Need </span>
                      <span class="text-yellow-400 font-bold">{{ getRunsNeeded() }}</span>
                      <span class="text-gray-500"> from </span>
                      <span class="text-yellow-400 font-bold">{{ getBallsRemaining() }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ==================== PLAYER STATS VIEW ==================== -->
          <div *ngIf="displayView === 'player-stats'" class="p-6 max-w-5xl mx-auto overflow-y-auto">
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-blue-400 uppercase tracking-wider">{{ getBattingTeamName() }}</h1>
              <p class="text-gray-400">{{ match.format }} • {{ getInningsLabel() }}</p>
            </div>

            <!-- Batting Card -->
            <div class="bg-gradient-to-r from-blue-900/90 to-blue-800/90 rounded-lg overflow-hidden shadow-xl mb-6 backdrop-blur-sm">
              <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-blue-950/90 text-xs text-gray-400 uppercase">
                <div class="col-span-4">Batsman</div>
                <div class="col-span-3">How Out</div>
                <div class="col-span-1 text-center">R</div>
                <div class="col-span-1 text-center">B</div>
                <div class="col-span-1 text-center">4s</div>
                <div class="col-span-1 text-center">6s</div>
                <div class="col-span-1 text-center">SR</div>
              </div>

              <ng-container *ngFor="let batsman of getBattingStats()">
                <div 
                  class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-blue-700/30 hover:bg-blue-800/50 transition-colors"
                  [ngClass]="{'bg-yellow-900/20': isCurrentBatsman(batsman)}"
                >
                  <div class="col-span-4 flex items-center gap-2">
                    <span *ngIf="isStriker(batsman)" class="text-yellow-400 text-xs">*</span>
                    <span class="font-semibold" [ngClass]="{'text-yellow-300': isCurrentBatsman(batsman)}">
                      {{ getBatsmanName(batsman) }}
                    </span>
                  </div>
                  <div class="col-span-3 text-sm text-gray-400">{{ getHowOut(batsman) }}</div>
                  <div class="col-span-1 text-center font-bold text-lg">{{ batsman.runs || 0 }}</div>
                  <div class="col-span-1 text-center text-gray-400">{{ batsman.balls || 0 }}</div>
                  <div class="col-span-1 text-center text-green-400">{{ batsman.fours || 0 }}</div>
                  <div class="col-span-1 text-center text-purple-400">{{ batsman.sixes || 0 }}</div>
                  <div class="col-span-1 text-center text-gray-300">{{ getStrikeRate(batsman) }}</div>
                </div>
              </ng-container>

              <div *ngIf="getYetToBat().length > 0" class="px-4 py-2 text-gray-500 text-sm">
                Yet to bat: {{ getYetToBat().join(', ') }}
              </div>

              <div class="px-4 py-3 bg-blue-950/50">
                <div class="flex justify-between items-center text-sm">
                  <div class="text-gray-400">
                    EXTRAS <span class="text-white ml-2">{{ getTotalExtras() }}</span>
                    <span class="text-gray-500 ml-2">({{ getExtrasBreakdown() }})</span>
                  </div>
                  <div class="text-gray-400">OVERS <span class="text-white ml-2">{{ getOversDisplay() }}</span></div>
                </div>
                <div class="flex justify-between items-center mt-2">
                  <div class="text-xl font-bold">TOTAL</div>
                  <div class="text-3xl font-bold">{{ currentInnings?.totalRuns || 0 }}/{{ currentInnings?.totalWickets || 0 }}</div>
                </div>
              </div>
            </div>

            <!-- Bowling Card -->
            <div class="bg-gradient-to-r from-gray-800/90 to-gray-700/90 rounded-lg overflow-hidden shadow-xl backdrop-blur-sm">
              <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-900/90 text-xs text-gray-400 uppercase">
                <div class="col-span-4">Bowler</div>
                <div class="col-span-1 text-center">O</div>
                <div class="col-span-1 text-center">M</div>
                <div class="col-span-2 text-center">R</div>
                <div class="col-span-2 text-center">W</div>
                <div class="col-span-2 text-center">Econ</div>
              </div>

              <ng-container *ngFor="let bowler of getBowlingStats()">
                <div 
                  class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-600/30 hover:bg-gray-600/50 transition-colors"
                  [ngClass]="{'bg-green-900/20': isCurrentBowler(bowler)}"
                >
                  <div class="col-span-4 font-semibold" [ngClass]="{'text-green-300': isCurrentBowler(bowler)}">
                    {{ getBowlerName(bowler) }}
                    <span *ngIf="isCurrentBowler(bowler)" class="text-green-400 text-xs ml-1">*</span>
                  </div>
                  <div class="col-span-1 text-center">{{ getBowlerOversDisplay(bowler) }}</div>
                  <div class="col-span-1 text-center text-gray-400">{{ bowler.maidens || 0 }}</div>
                  <div class="col-span-2 text-center">{{ bowler.runs || 0 }}</div>
                  <div class="col-span-2 text-center font-bold text-green-400">{{ bowler.wickets || 0 }}</div>
                  <div class="col-span-2 text-center text-gray-300">{{ getBowlerEconomy(bowler) }}</div>
                </div>
              </ng-container>
            </div>

            <!-- Fall of Wickets -->
            <div *ngIf="getFallOfWickets().length > 0" class="mt-6 bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm">
              <h3 class="text-sm text-gray-400 uppercase mb-2">Fall of Wickets</h3>
              <div class="flex flex-wrap gap-4 text-sm">
                <span *ngFor="let fow of getFallOfWickets()" class="text-gray-300">
                  {{ fow.wicketNumber }}-{{ fow.runs }} ({{ getFOWPlayerName(fow) }}, {{ fow.overs }})
                </span>
              </div>
            </div>
          </div>

          <!-- ==================== MATCH SUMMARY VIEW ==================== -->
          <div *ngIf="displayView === 'overall-summary'" class="p-6 max-w-5xl mx-auto overflow-y-auto">
            <div class="bg-gradient-to-r from-blue-600/90 to-blue-800/90 rounded-t-lg px-6 py-4 backdrop-blur-sm">
              <h1 class="text-xl font-bold uppercase tracking-wider">Match Summary</h1>
              <p class="text-blue-200 text-sm">{{ match.team1?.name }} vs {{ match.team2?.name }} • {{ match.format }}</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <ng-container *ngFor="let innings of match.innings; let idx = index">
                <div 
                  class="bg-gradient-to-b from-gray-800/90 to-gray-900/90 p-4 backdrop-blur-sm"
                  [ngClass]="{'border-r border-gray-700': idx === 0}"
                >
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-7 bg-blue-600 rounded flex items-center justify-center text-xs font-bold">
                        {{ getTeamCode(innings.battingTeam) }}
                      </div>
                      <div>
                        <div class="font-bold text-lg">{{ getTeamName(innings.battingTeam) }}</div>
                        <div class="text-gray-400 text-xs uppercase">{{ idx === 0 ? '1st' : '2nd' }} Innings</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-3xl font-bold">{{ innings.totalRuns || 0 }}</div>
                      <div class="text-gray-400 text-sm">{{ innings.totalWickets || 0 }} wkts, {{ getInningsOvers(innings) }} ov</div>
                    </div>
                  </div>

                  <div class="space-y-2 mb-4">
                    <ng-container *ngFor="let batsman of getTopBatsmen(innings, 3)">
                      <div class="flex justify-between items-center text-sm bg-gray-700/30 rounded px-3 py-2">
                        <div class="flex-1">
                          <span class="font-medium">{{ getBatsmanName(batsman) }}</span>
                          <span *ngIf="batsman.isOut" class="text-gray-500 ml-2 text-xs">{{ getShortHowOut(batsman) }}</span>
                          <span *ngIf="!batsman.isOut && (batsman.isNotOut || isCurrentBatsman(batsman))" class="text-yellow-400 ml-2 text-xs">*</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-lg">{{ batsman.runs }}</span>
                          <span class="text-gray-500 text-xs">{{ batsman.balls }}b</span>
                        </div>
                      </div>
                    </ng-container>
                  </div>

                  <div class="border-t border-gray-700 pt-4">
                    <div class="text-xs text-gray-500 uppercase mb-2">Bowling</div>
                    <div class="space-y-2">
                      <ng-container *ngFor="let bowler of getTopBowlersForInnings(idx, 3)">
                        <div class="flex justify-between items-center text-sm">
                          <span class="text-gray-300">{{ getBowlerName(bowler) }}</span>
                          <span class="text-gray-400">{{ bowler.wickets }}-{{ bowler.runs }} ({{ getBowlerOversDisplay(bowler) }})</span>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                </div>
              </ng-container>
            </div>

            <div class="bg-gradient-to-r from-gray-700/90 to-gray-800/90 rounded-b-lg px-6 py-4 backdrop-blur-sm">
              <div *ngIf="match.status === 'completed' && match.result" class="text-center text-lg font-semibold">
                <span *ngIf="match.result.winner" class="text-green-400">{{ getTeamName(match.result.winner) }}</span>
                <span *ngIf="match.result.winner" class="text-gray-300"> won by {{ match.result.winMargin }}</span>
                <span *ngIf="!match.result.winner" class="text-yellow-400">{{ match.result.winMargin }}</span>
              </div>
              <div *ngIf="match.status !== 'completed' && match.currentInnings === 1" class="text-center">
                <span class="text-cyan-400">{{ getSecondBattingTeamName() }}</span>
                <span class="text-gray-300"> need </span>
                <span class="text-yellow-400 font-bold">{{ getRunsNeeded() }}</span>
                <span class="text-gray-300"> runs from </span>
                <span class="text-yellow-400 font-bold">{{ getBallsRemaining() }}</span>
                <span class="text-gray-300"> balls</span>
              </div>
              <div *ngIf="match.status !== 'completed' && match.currentInnings !== 1" class="text-center text-gray-400">
                {{ getBattingTeamName() }} batting
              </div>
            </div>
          </div>

          <!-- ==================== PROJECTIONS VIEW ==================== -->
          <div *ngIf="displayView === 'projections'" class="p-6 max-w-5xl mx-auto overflow-y-auto">
            <div class="text-center mb-8">
              <h1 class="text-2xl font-bold uppercase tracking-wider text-cyan-400">Scoring Comparison</h1>
              <div class="flex justify-center gap-6 mt-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-4 bg-cyan-500 rounded"></div>
                  <span class="text-gray-300">{{ getFirstInningsTeamName() }}</span>
                </div>
                <div *ngIf="match.innings && match.innings.length > 1" class="flex items-center gap-2">
                  <div class="w-8 h-4 bg-orange-500 rounded"></div>
                  <span class="text-gray-300">{{ getSecondInningsTeamName() }}</span>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-lg p-6 mb-6 backdrop-blur-sm">
              <div class="relative" style="height: 300px;">
                <svg class="w-full h-full" viewBox="0 0 500 300" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#374151" stroke-width="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="450" height="250" x="40" y="10" fill="url(#grid)"/>
                  
                  <text *ngFor="let label of [0, 50, 100, 150, 200, 250]" x="35" [attr.y]="260 - label" class="fill-gray-500" style="font-size: 10px" text-anchor="end">
                    {{ label }}
                  </text>
                  
                  <text *ngFor="let over of getOversAxisLabels()" [attr.x]="40 + (over * getOversScale())" y="280" class="fill-gray-500" style="font-size: 10px" text-anchor="middle">
                    {{ over }}
                  </text>
                  
                  <polyline 
                    *ngIf="getFirstInningsData().length > 0"
                    [attr.points]="getFirstInningsLinePoints()"
                    fill="none" 
                    stroke="#06b6d4" 
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle 
                    *ngFor="let point of getFirstInningsData()"
                    [attr.cx]="40 + (point.over * getOversScale())" 
                    [attr.cy]="260 - point.runs"
                    r="5"
                    fill="#06b6d4"
                  />

                  <polyline 
                    *ngIf="getSecondInningsData().length > 0"
                    [attr.points]="getSecondInningsLinePoints()"
                    fill="none" 
                    stroke="#f97316" 
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle 
                    *ngFor="let point of getSecondInningsData()"
                    [attr.cx]="40 + (point.over * getOversScale())" 
                    [attr.cy]="260 - point.runs"
                    r="5"
                    fill="#f97316"
                  />

                  <text x="250" y="298" class="fill-gray-400" style="font-size: 10px" text-anchor="middle">OVERS</text>
                  <text x="15" y="130" class="fill-gray-400" style="font-size: 10px" text-anchor="middle" transform="rotate(-90, 15, 130)">RUNS</text>
                </svg>
              </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                <div class="text-gray-400 text-xs uppercase">Current RR</div>
                <div class="text-2xl font-bold text-cyan-400">{{ getCurrentRunRate() }}</div>
              </div>
              <ng-container *ngIf="match.currentInnings === 1">
                <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                  <div class="text-gray-400 text-xs uppercase">Required RR</div>
                  <div class="text-2xl font-bold text-orange-400">{{ getRequiredRunRate() }}</div>
                </div>
                <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                  <div class="text-gray-400 text-xs uppercase">Runs Needed</div>
                  <div class="text-2xl font-bold text-yellow-400">{{ getRunsNeeded() }}</div>
                </div>
                <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                  <div class="text-gray-400 text-xs uppercase">Balls Left</div>
                  <div class="text-2xl font-bold text-gray-300">{{ getBallsRemaining() }}</div>
                </div>
              </ng-container>
              <ng-container *ngIf="match.currentInnings !== 1">
                <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                  <div class="text-gray-400 text-xs uppercase">Projected Score</div>
                  <div class="text-2xl font-bold text-green-400">{{ getProjectedScore() }}</div>
                </div>
                <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                  <div class="text-gray-400 text-xs uppercase">Overs</div>
                  <div class="text-2xl font-bold text-gray-300">{{ getOversDisplay() }}</div>
                </div>
                <div class="bg-gray-800/90 rounded-lg p-4 text-center backdrop-blur-sm">
                  <div class="text-gray-400 text-xs uppercase">Wickets</div>
                  <div class="text-2xl font-bold text-red-400">{{ currentInnings?.totalWickets || 0 }}</div>
                </div>
              </ng-container>
            </div>

            <div *ngIf="match.currentInnings === 1" class="bg-gradient-to-r from-blue-900/90 to-blue-800/90 rounded-lg px-6 py-4 text-center backdrop-blur-sm">
              <span class="text-gray-300">{{ getSecondBattingTeamName() }} need </span>
              <span class="text-yellow-400 font-bold text-xl">{{ getRunsNeeded() }}</span>
              <span class="text-gray-300"> more to win from </span>
              <span class="text-yellow-400 font-bold text-xl">{{ getOversRemaining() }}</span>
              <span class="text-gray-300"> overs at </span>
              <span class="text-cyan-400 font-bold text-xl">{{ getRequiredRunRate() }}</span>
              <span class="text-gray-300"> RPO</span>
            </div>

            <div *ngIf="match.currentInnings === 1" class="mt-6 bg-gray-800/90 rounded-lg p-6 backdrop-blur-sm">
              <h3 class="text-center text-gray-400 uppercase text-sm mb-4">Win Probability</h3>
              <div class="flex items-center gap-4">
                <div class="text-right flex-1">
                  <div class="font-bold">{{ getSecondBattingTeamName() }}</div>
                  <div class="text-2xl font-bold text-cyan-400">{{ getWinProbability() }}%</div>
                </div>
                <div class="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                    [style.width.%]="getWinProbability()"
                  ></div>
                </div>
                <div class="flex-1">
                  <div class="font-bold">{{ getFirstBattingTeamName() }}</div>
                  <div class="text-2xl font-bold text-orange-400">{{ 100 - getWinProbability() }}%</div>
                </div>
              </div>
            </div>
          </div>

          <!-- View Indicator -->
          <div class="fixed bottom-4 right-4 bg-black/50 px-3 py-1 rounded text-xs text-gray-400 backdrop-blur-sm">
            {{ getViewName() }}
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
  
  private eventSource: EventSource | null = null;
  private playerNameCache: Map<string, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') || '';
    if (this.matchId) {
      this.loadMatch();
      this.connectSSE();
    } else {
      this.error = 'Invalid match ID';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.disconnectSSE();
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
    if (matchBackground?.type !== 'none' && matchBackground?.url) {
      this.currentBackground = matchBackground;
      return;
    }
    if (this.match?.backgrounds?.useTeamBackground !== false) {
      const battingTeam = this.currentInnings?.battingTeam;
      if (battingTeam?.background?.type !== 'none' && battingTeam?.background?.url) {
        this.currentBackground = battingTeam.background;
        return;
      }
    }
    this.currentBackground = { type: 'none', url: null };
  }

  buildPlayerNameCache() {
    if (!this.match) return;
    const cacheFromSquad = (squad: any[]) => {
      if (!squad) return;
      squad.forEach(p => {
        const playerId = p.player?._id || p.player;
        const playerName = p.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
    };
    cacheFromSquad(this.match.squads?.team1);
    cacheFromSquad(this.match.squads?.team2);
    this.match.innings?.forEach((inn: any) => {
      inn.battingStats?.forEach((bs: any) => {
        const playerId = bs.player?._id || bs.player;
        const playerName = bs.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
      inn.bowlingStats?.forEach((bs: any) => {
        const playerId = bs.player?._id || bs.player;
        const playerName = bs.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
      inn.fallOfWickets?.forEach((fow: any) => {
        const playerId = fow.player?._id || fow.player;
        const playerName = fow.player?.name;
        if (playerId && playerName) {
          this.playerNameCache.set(playerId.toString(), playerName);
        }
      });
    });
  }

  connectSSE() {
    this.eventSource = new EventSource(`/api/matches/${this.matchId}/live`);
    const events = ['score-update', 'wicket', 'over-complete', 'innings-complete', 
                    'innings-start', 'match-complete', 'batsmen-change', 'bowler-change', 'background-change'];
    events.forEach(event => {
      this.eventSource!.addEventListener(event, () => this.reloadMatch());
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
      'projections': 'Projections'
    };
    return names[this.displayView] || 'Live Score';
  }

  getPlayerName(player: any): string {
    if (!player) return 'Unknown';
    if (player.name) return player.name;
    const playerId = player._id || player;
    return this.playerNameCache.get(playerId?.toString()) || 'Unknown';
  }

  // ==================== LIVE SCORE VIEW HELPERS ====================

  getBattingTeamCode(): string {
    if (!this.currentInnings?.battingTeam) return '???';
    return this.currentInnings.battingTeam.code || this.getTeamCode(this.currentInnings.battingTeam);
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

  getCurrentBowlerName(): string {
    const bowler = this.currentInnings?.currentBowler;
    const name = this.getPlayerName(bowler);
    return name?.split(' ').pop() || 'Unknown';
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
    return this.currentInnings?.battingStats || [];
  }

  getBowlingStats(): any[] {
    return this.currentInnings?.bowlingStats || [];
  }

  getBatsmanName(batsman: any): string {
    return this.getPlayerName(batsman.player);
  }

  getBowlerName(bowler: any): string {
    return this.getPlayerName(bowler.player);
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

  getFirstInningsData(): { over: number; runs: number }[] {
    const innings = this.match?.innings?.[0];
    if (!innings) return [];
    const totalBalls = innings.totalBalls || 0;
    const totalRuns = innings.totalRuns || 0;
    const overs = Math.floor(totalBalls / 6);
    const points = [];
    if (overs > 0) {
      const avgPerOver = totalRuns / overs;
      for (let i = 1; i <= overs; i++) {
        points.push({ over: i, runs: Math.min(250, Math.round(avgPerOver * i)) });
      }
    }
    return points;
  }

  getSecondInningsData(): { over: number; runs: number }[] {
    const innings = this.match?.innings?.[1];
    if (!innings) return [];
    const totalBalls = innings.totalBalls || 0;
    const totalRuns = innings.totalRuns || 0;
    const overs = Math.floor(totalBalls / 6);
    const points = [];
    if (overs > 0) {
      const avgPerOver = totalRuns / overs;
      for (let i = 1; i <= overs; i++) {
        points.push({ over: i, runs: Math.min(250, Math.round(avgPerOver * i)) });
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
}
