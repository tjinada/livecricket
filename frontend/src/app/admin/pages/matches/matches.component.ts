import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';
import { CountryService, PlayerService } from '../../../core/services';
import { EspnService, EspnMatchCreationPreview, EspnTeamPreview, EspnPlayerPreview, UnmatchedPlayer } from '../../../core/services/espn.service';
import { Country, Player, PlayerGender } from '../../../core/models';
import { EspnMatchImportComponent } from '../../components/espn-match-import/espn-match-import.component';

type MatchStep = 'list' | 'create' | 'squad' | 'toss' | 'start';

interface SquadPlayer {
  player: string;
  playerData?: Player;
  isPlayingXI: boolean;
  battingOrder?: number;
}

const MIN_SQUAD_SIZE = 11;

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, EspnMatchImportComponent],
  styles: [`
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12);
      background: white;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
  template: `
    <div>
      <!-- Match List View -->
      @if (currentStep === 'list') {
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Matches</h2>
          <button 
            (click)="openCreateMatch()"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            [disabled]="countries.length < 2"
          >
            + Create Match
          </button>
        </div>

        <!-- Status Filter Tabs -->
        <div class="flex gap-2 mb-6">
          <button 
            (click)="filterStatus = ''; loadMatches()"
            class="px-4 py-2 rounded-lg text-sm font-medium"
            [class.bg-green-600]="filterStatus === ''"
            [class.text-white]="filterStatus === ''"
            [class.bg-gray-200]="filterStatus !== ''"
            [class.text-gray-700]="filterStatus !== ''"
          >
            All
          </button>
          <button 
            (click)="filterStatus = 'upcoming'; loadMatches()"
            class="px-4 py-2 rounded-lg text-sm font-medium"
            [class.bg-yellow-500]="filterStatus === 'upcoming'"
            [class.text-white]="filterStatus === 'upcoming'"
            [class.bg-gray-200]="filterStatus !== 'upcoming'"
            [class.text-gray-700]="filterStatus !== 'upcoming'"
          >
            Upcoming
          </button>
          <button 
            (click)="filterStatus = 'live'; loadMatches()"
            class="px-4 py-2 rounded-lg text-sm font-medium"
            [class.bg-red-500]="filterStatus === 'live'"
            [class.text-white]="filterStatus === 'live'"
            [class.bg-gray-200]="filterStatus !== 'live'"
            [class.text-gray-700]="filterStatus !== 'live'"
          >
            Live
          </button>
          <button 
            (click)="filterStatus = 'completed'; loadMatches()"
            class="px-4 py-2 rounded-lg text-sm font-medium"
            [class.bg-gray-500]="filterStatus === 'completed'"
            [class.text-white]="filterStatus === 'completed'"
            [class.bg-gray-200]="filterStatus !== 'completed'"
            [class.text-gray-700]="filterStatus !== 'completed'"
          >
            Completed
          </button>
        </div>

        @if (loading) {
          <div class="text-center py-12">
            <p class="text-gray-500">Loading matches...</p>
          </div>
        } @else if (countries.length < 2) {
          <div class="text-center py-12 bg-white rounded-lg shadow">
            <p class="text-gray-500 mb-4">You need at least 2 countries to create a match</p>
            <a href="/admin/countries" class="text-green-600 hover:text-green-800">
              Add Countries →
            </a>
          </div>
        } @else if (matches.length === 0) {
          <div class="text-center py-12 bg-white rounded-lg shadow">
            <p class="text-gray-500 mb-4">No matches found</p>
            <button 
              (click)="openCreateMatch()"
              class="text-green-600 hover:text-green-800"
            >
              Create your first match
            </button>
          </div>
        } @else {
          <!-- Matches Grid -->
          <div class="grid gap-4">
            @for (match of matches; track match._id) {
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-semibold text-gray-800">
                        {{ getMatchDisplayTitle(match) }}
                      </h3>
                      @if (match.gender === 'women') {
                        <span class="px-2 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700">Women</span>
                      }
                      <span 
                        class="px-2 py-1 text-xs rounded-full"
                        [class.bg-yellow-100]="match.status === 'upcoming'"
                        [class.text-yellow-800]="match.status === 'upcoming'"
                        [class.bg-red-100]="match.status === 'live'"
                        [class.text-red-800]="match.status === 'live'"
                        [class.bg-gray-100]="match.status === 'completed'"
                        [class.text-gray-800]="match.status === 'completed'"
                      >
                        {{ match.status | uppercase }}
                      </span>
                    </div>
                    <p class="text-gray-500 text-sm">
                      {{ match.format }} • {{ match.venue }} • {{ match.date | date:'mediumDate' }}
                    </p>
                    @if (match.toss && match.toss.winner) {
                      <p class="text-gray-500 text-sm mt-1">
                        Toss: {{ match.toss.winner.name }} chose to {{ match.toss.decision }}
                      </p>
                    }
                    @if (match.status === 'live' && match.innings && match.innings.length > 0) {
                      <p class="text-green-600 font-semibold mt-2">
                        {{ getCurrentScore(match) }}
                      </p>
                    }
                    @if (match.status === 'completed' && match.result) {
                      <p class="text-gray-700 font-medium mt-2">
                        {{ match.result.winner?.name }} won by {{ match.result.winMargin }} {{ match.result.winType }}
                      </p>
                    }
                  </div>
                  <div class="flex gap-2">
                    @if (match.status === 'upcoming') {
                      @if (!hasSquad(match)) {
                        <button 
                          (click)="setupSquad(match)"
                          class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Set Squad
                        </button>
                      } @else if (!match.toss?.winner) {
                        <button 
                          (click)="setupToss(match)"
                          class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Record Toss
                        </button>
                      } @else {
                        <button 
                          (click)="startMatchDirectly(match)"
                          class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Start Match
                        </button>
                      }
                      <button 
                        (click)="setupSquad(match)"
                        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        [class.hidden]="!hasSquad(match)"
                      >
                        Edit Squad
                      </button>
                      <button 
                        (click)="confirmDelete(match)"
                        class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    }
                    @if (match.status === 'live') {
                      <button 
                        (click)="goToScoring(match)"
                        class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Score Match
                      </button>
                      <button 
                        (click)="goToEditor(match)"
                        class="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                        title="Open Match Editor in new window"
                      >
                        📝 Editor
                      </button>
                      <button 
                        (click)="confirmDelete(match)"
                        class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    }
                    @if (match.status === 'completed') {
                      <button 
                        (click)="goToScoring(match)"
                        class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        Manage Display
                      </button>
                      <button 
                        (click)="goToEditor(match)"
                        class="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                        title="Open Match Editor"
                      >
                        📝 Editor
                      </button>
                      <button 
                        (click)="confirmDelete(match)"
                        class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    }
                    <a 
                      [href]="'/display/' + match._id" 
                      target="_blank"
                      class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Create Match Form -->
      @if (currentStep === 'create') {
        <div class="max-w-2xl">
          <div class="flex items-center gap-4 mb-6">
            <button (click)="currentStep = 'list'" class="text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <h2 class="text-2xl font-bold text-gray-800">Create New Match</h2>
          </div>

          <!-- ESPN Import Component -->
          <app-espn-match-import 
            [countries]="countries" 
            (importApplied)="applyEspnImport($event)"
          ></app-espn-match-import>

          <div class="bg-white rounded-lg shadow p-6">
            <form (ngSubmit)="createMatch()">
              <!-- Gender Selection -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      [(ngModel)]="matchForm.gender" 
                      name="gender" 
                      value="men"
                      (ngModelChange)="updateTitlePreview()"
                      class="text-blue-600 focus:ring-blue-500"
                    >
                    <span class="text-gray-700">Men</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      [(ngModel)]="matchForm.gender" 
                      name="gender" 
                      value="women"
                      (ngModelChange)="updateTitlePreview()"
                      class="text-pink-600 focus:ring-pink-500"
                    >
                    <span class="text-gray-700">Women</span>
                  </label>
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select 
                  [(ngModel)]="matchForm.format"
                  name="format"
                  required
                  (ngModelChange)="updateTitlePreview()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="T20">T20 (20 overs)</option>
                  <option value="ODI">ODI (50 overs)</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Team 1</label>
                  <select 
                    [(ngModel)]="matchForm.team1"
                    name="team1"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Team</option>
                    @for (country of countries; track country._id) {
                      <option [value]="country._id" [disabled]="country._id === matchForm.team2">
                        {{ country.name }}
                      </option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Team 2</label>
                  <select 
                    [(ngModel)]="matchForm.team2"
                    name="team2"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Team</option>
                    @for (country of countries; track country._id) {
                      <option [value]="country._id" [disabled]="country._id === matchForm.team1">
                        {{ country.name }}
                      </option>
                    }
                  </select>
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input 
                  type="text"
                  [(ngModel)]="matchForm.venue"
                  name="venue"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Melbourne Cricket Ground"
                >
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date"
                  [(ngModel)]="matchForm.date"
                  name="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
              </div>

              <!-- Match Title (auto-generated, editable) -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Match Title</label>
                <input 
                  type="text"
                  [(ngModel)]="matchForm.title"
                  name="title"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Auto-generated if left empty"
                >
                <p class="text-xs text-gray-500 mt-1">Preview: {{ getTitlePreview() }}</p>
              </div>

              @if (error) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ error }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <button 
                  type="button"
                  (click)="currentStep = 'list'"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  [disabled]="saving"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {{ saving ? 'Creating...' : 'Create Match' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Squad Selection - Three Panel Layout (Available, Playing XI, Reserves) -->
      @if (currentStep === 'squad' && selectedMatch) {
        <div>
          <div class="flex items-center gap-4 mb-6">
            <button (click)="currentStep = 'list'" class="text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <h2 class="text-2xl font-bold text-gray-800">
              Select Squads: {{ selectedMatch.team1?.name }} vs {{ selectedMatch.team2?.name }}
            </h2>
            <span class="text-sm text-gray-500 ml-auto">
              Select at least 11 players per team
            </span>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Team 1 -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-4 py-3 border-b bg-gray-50 rounded-t-lg flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-800">{{ selectedMatch.team1?.name }}</h3>
                <span class="text-sm text-gray-500">Squad: {{ getSquadCount('team1') }} (min 11)</span>
              </div>
              
              <div class="grid grid-cols-2 divide-x" style="height: calc(100vh - 280px);">
                <!-- Available Players -->
                <div class="flex flex-col">
                  <div class="px-2 py-2 border-b bg-gray-50">
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-xs font-medium text-gray-600">Available</span>
                      <select 
                        [(ngModel)]="team1RoleFilter"
                        class="text-xs px-1 py-0.5 border rounded bg-white w-20"
                      >
                        <option value="">All</option>
                        <option value="batsman">Bat</option>
                        <option value="bowler">Bowl</option>
                        <option value="all-rounder">AR</option>
                        <option value="wicket-keeper">WK</option>
                      </select>
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto">
                    @for (player of getAvailablePlayers('team1'); track player._id) {
                      <div 
                        class="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                        (click)="addToSquad('team1', player)"
                      >
                        <div class="flex-1 min-w-0">
                          <div class="text-xs font-medium text-gray-900 truncate">{{ player.name }}</div>
                          <div class="text-xs text-gray-400">{{ formatRole(player.role) }}</div>
                        </div>
                        <button 
                          class="w-5 h-5 flex items-center justify-center rounded-full text-xs flex-shrink-0 bg-green-100 text-green-600"
                        >
                          +
                        </button>
                      </div>
                    }
                    @if (getAvailablePlayers('team1').length === 0) {
                      <div class="p-3 text-center text-gray-400 text-xs">
                        @if (team1Players.length === 0) {
                          No players
                        } @else {
                          All selected
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Selected Squad -->
                <div class="flex flex-col">
                  <div class="px-2 py-2 border-b bg-green-50">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-green-700">Selected Squad</span>
                      <span 
                        class="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        [class.bg-green-200]="getSquadCount('team1') >= 11"
                        [class.text-green-800]="getSquadCount('team1') >= 11"
                        [class.bg-yellow-200]="getSquadCount('team1') < 11"
                        [class.text-yellow-800]="getSquadCount('team1') < 11"
                      >
                        {{ getSquadCount('team1') }}
                      </span>
                    </div>
                  </div>
                  <div 
                    class="flex-1 overflow-y-auto"
                    cdkDropList
                    #team1SquadList="cdkDropList"
                    [cdkDropListData]="squadForm.team1"
                    (cdkDropListDropped)="dropPlayer('team1', $event)"
                  >
                    @for (squadPlayer of squadForm.team1; track squadPlayer.player; let i = $index) {
                      <div 
                        class="flex items-center gap-1 px-1 py-1 border-b border-gray-100 bg-green-50/50 cursor-grab active:cursor-grabbing"
                        cdkDrag
                        [cdkDragData]="squadPlayer"
                      >
                        <div class="cdk-drag-placeholder" *cdkDragPlaceholder>
                          <div class="h-8 bg-green-200 border-2 border-dashed border-green-400 rounded"></div>
                        </div>
                        <span class="w-4 h-4 flex items-center justify-center text-xs font-bold text-green-700 bg-green-200 rounded flex-shrink-0">
                          {{ squadPlayer.battingOrder }}
                        </span>
                        <div class="flex-1 min-w-0">
                          <div class="text-xs font-medium text-gray-900 truncate">{{ squadPlayer.playerData?.name }}</div>
                        </div>
                        <div class="flex items-center gap-0.5 flex-shrink-0">
                          <button 
                            class="w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 text-xs"
                            (click)="removeFromSquad('team1', squadPlayer.player); $event.stopPropagation()"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    }
                    @if (getSquadCount('team1') === 0) {
                      <div class="p-3 text-center text-gray-400 text-xs">
                        Add players →
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Team 2 -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-4 py-3 border-b bg-gray-50 rounded-t-lg flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-800">{{ selectedMatch.team2?.name }}</h3>
                <span class="text-sm text-gray-500">Squad: {{ getSquadCount('team2') }} (min 11)</span>
              </div>
              
              <div class="grid grid-cols-2 divide-x" style="height: calc(100vh - 280px);">
                <!-- Available Players -->
                <div class="flex flex-col">
                  <div class="px-2 py-2 border-b bg-gray-50">
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-xs font-medium text-gray-600">Available</span>
                      <select 
                        [(ngModel)]="team2RoleFilter"
                        class="text-xs px-1 py-0.5 border rounded bg-white w-20"
                      >
                        <option value="">All</option>
                        <option value="batsman">Bat</option>
                        <option value="bowler">Bowl</option>
                        <option value="all-rounder">AR</option>
                        <option value="wicket-keeper">WK</option>
                      </select>
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto">
                    @for (player of getAvailablePlayers('team2'); track player._id) {
                      <div 
                        class="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                        (click)="addToSquad('team2', player)"
                      >
                        <div class="flex-1 min-w-0">
                          <div class="text-xs font-medium text-gray-900 truncate">{{ player.name }}</div>
                          <div class="text-xs text-gray-400">{{ formatRole(player.role) }}</div>
                        </div>
                        <button 
                          class="w-5 h-5 flex items-center justify-center rounded-full text-xs flex-shrink-0 bg-green-100 text-green-600"
                        >
                          +
                        </button>
                      </div>
                    }
                    @if (getAvailablePlayers('team2').length === 0) {
                      <div class="p-3 text-center text-gray-400 text-xs">
                        @if (team2Players.length === 0) {
                          No players
                        } @else {
                          All selected
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Selected Squad -->
                <div class="flex flex-col">
                  <div class="px-2 py-2 border-b bg-green-50">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-green-700">Selected Squad</span>
                      <span 
                        class="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        [class.bg-green-200]="getSquadCount('team2') >= 11"
                        [class.text-green-800]="getSquadCount('team2') >= 11"
                        [class.bg-yellow-200]="getSquadCount('team2') < 11"
                        [class.text-yellow-800]="getSquadCount('team2') < 11"
                      >
                        {{ getSquadCount('team2') }}
                      </span>
                    </div>
                  </div>
                  <div 
                    class="flex-1 overflow-y-auto"
                    cdkDropList
                    #team2SquadList="cdkDropList"
                    [cdkDropListData]="squadForm.team2"
                    (cdkDropListDropped)="dropPlayer('team2', $event)"
                  >
                    @for (squadPlayer of squadForm.team2; track squadPlayer.player; let i = $index) {
                      <div 
                        class="flex items-center gap-1 px-1 py-1 border-b border-gray-100 bg-green-50/50 cursor-grab active:cursor-grabbing"
                        cdkDrag
                        [cdkDragData]="squadPlayer"
                      >
                        <div class="cdk-drag-placeholder" *cdkDragPlaceholder>
                          <div class="h-8 bg-green-200 border-2 border-dashed border-green-400 rounded"></div>
                        </div>
                        <span class="w-4 h-4 flex items-center justify-center text-xs font-bold text-green-700 bg-green-200 rounded flex-shrink-0">
                          {{ squadPlayer.battingOrder }}
                        </span>
                        <div class="flex-1 min-w-0">
                          <div class="text-xs font-medium text-gray-900 truncate">{{ squadPlayer.playerData?.name }}</div>
                        </div>
                        <div class="flex items-center gap-0.5 flex-shrink-0">
                          <button 
                            class="w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 text-xs"
                            (click)="removeFromSquad('team2', squadPlayer.player); $event.stopPropagation()"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    }
                    @if (getSquadCount('team2') === 0) {
                      <div class="p-3 text-center text-gray-400 text-xs">
                        Add players →
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          @if (error) {
            <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {{ error }}
            </div>
          }

          <div class="mt-6 flex justify-end gap-3">
            <button 
              (click)="currentStep = 'list'"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button 
              (click)="saveSquad()"
              [disabled]="saving || getSquadCount('team1') < 11 || getSquadCount('team2') < 11"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Squads' }}
            </button>
          </div>
        </div>
      }

      <!-- Toss Recording -->
      @if (currentStep === 'toss' && selectedMatch) {
        <div class="max-w-md mx-auto">
          <div class="flex items-center gap-4 mb-6">
            <button (click)="currentStep = 'list'" class="text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <h2 class="text-2xl font-bold text-gray-800">Record Toss</h2>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-gray-600 mb-6">
              {{ selectedMatch.team1?.name }} vs {{ selectedMatch.team2?.name }}
            </p>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Who won the toss?</label>
              <div class="space-y-2">
                <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  [class.border-green-500]="tossForm.winner === selectedMatch.team1?._id"
                  [class.bg-green-50]="tossForm.winner === selectedMatch.team1?._id">
                  <input 
                    type="radio"
                    [(ngModel)]="tossForm.winner"
                    [value]="selectedMatch.team1?._id"
                    name="tossWinner"
                    class="text-green-600 focus:ring-green-500"
                  >
                  <span class="font-medium">{{ selectedMatch.team1?.name }}</span>
                </label>
                <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  [class.border-green-500]="tossForm.winner === selectedMatch.team2?._id"
                  [class.bg-green-50]="tossForm.winner === selectedMatch.team2?._id">
                  <input 
                    type="radio"
                    [(ngModel)]="tossForm.winner"
                    [value]="selectedMatch.team2?._id"
                    name="tossWinner"
                    class="text-green-600 focus:ring-green-500"
                  >
                  <span class="font-medium">{{ selectedMatch.team2?.name }}</span>
                </label>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Decision</label>
              <div class="flex gap-4">
                <label class="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  [class.border-green-500]="tossForm.decision === 'bat'"
                  [class.bg-green-50]="tossForm.decision === 'bat'">
                  <input 
                    type="radio"
                    [(ngModel)]="tossForm.decision"
                    value="bat"
                    name="tossDecision"
                    class="text-green-600 focus:ring-green-500"
                  >
                  <span class="font-medium">Bat</span>
                </label>
                <label class="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  [class.border-green-500]="tossForm.decision === 'bowl'"
                  [class.bg-green-50]="tossForm.decision === 'bowl'">
                  <input 
                    type="radio"
                    [(ngModel)]="tossForm.decision"
                    value="bowl"
                    name="tossDecision"
                    class="text-green-600 focus:ring-green-500"
                  >
                  <span class="font-medium">Bowl</span>
                </label>
              </div>
            </div>

            @if (error) {
              <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {{ error }}
              </div>
            }

            <div class="flex justify-end gap-3">
              <button 
                (click)="currentStep = 'list'"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="saveToss()"
                [disabled]="saving || !tossForm.winner || !tossForm.decision"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : 'Record Toss' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Start Match -->
      @if (currentStep === 'start' && selectedMatch) {
        <div class="max-w-md mx-auto">
          <div class="flex items-center gap-4 mb-6">
            <button (click)="currentStep = 'list'" class="text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <h2 class="text-2xl font-bold text-gray-800">Start Match</h2>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
              <p class="text-gray-600">
                <strong>{{ selectedMatch.toss?.winner?.name }}</strong> won the toss and chose to 
                <strong>{{ selectedMatch.toss?.decision }}</strong>
              </p>
              <p class="text-green-600 font-medium mt-2">
                {{ getBattingTeamName() }} will bat first
              </p>
            </div>

            <p class="text-sm text-gray-500 mb-4">
              Opening batsmen and bowler selections are optional. You can set them later in the scoring screen.
            </p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Opening Striker <span class="text-gray-400">(optional)</span></label>
              <select 
                [(ngModel)]="startForm.striker"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Striker</option>
                @for (player of battingTeamPlayers; track player.player._id) {
                  <option [value]="player.player._id" [disabled]="player.player._id === startForm.nonStriker">
                    #{{ player.battingOrder }} - {{ player.player.name }}
                  </option>
                }
              </select>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Opening Non-Striker <span class="text-gray-400">(optional)</span></label>
              <select 
                [(ngModel)]="startForm.nonStriker"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Non-Striker</option>
                @for (player of battingTeamPlayers; track player.player._id) {
                  <option [value]="player.player._id" [disabled]="player.player._id === startForm.striker">
                    #{{ player.battingOrder }} - {{ player.player.name }}
                  </option>
                }
              </select>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Opening Bowler <span class="text-gray-400">(optional)</span></label>
              <select 
                [(ngModel)]="startForm.bowler"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Bowler</option>
                @for (player of bowlingTeamPlayers; track player.player._id) {
                  <option [value]="player.player._id">
                    {{ player.player.name }}
                  </option>
                }
              </select>
            </div>

            @if (error) {
              <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {{ error }}
              </div>
            }

            <div class="flex justify-end gap-3">
              <button 
                (click)="currentStep = 'list'"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                (click)="startMatch()"
                [disabled]="saving"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {{ saving ? 'Starting...' : 'Start Match' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Match</h3>
              <p class="text-gray-600 mb-4">
                Are you sure you want to delete 
                <strong>{{ deletingMatch?.team1?.name }} vs {{ deletingMatch?.team2?.name }}</strong>?
              </p>
              @if (deletingMatch?.status !== 'upcoming') {
                <div class="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                  ⚠️ This {{ deletingMatch?.status }} match has scoring data that will be permanently deleted.
                </div>
              }

              @if (deleteError) {
                <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {{ deleteError }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <button 
                  (click)="closeDeleteModal()"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  (click)="deleteMatch()"
                  [disabled]="deleting"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MatchesComponent implements OnInit {
  currentStep: MatchStep = 'list';
  loading = true;
  saving = false;
  error = '';

  matches: Match[] = [];
  countries: Country[] = [];
  filterStatus = '';

  // Create Match Form
  matchForm = {
    format: 'T20' as 'T20' | 'ODI',
    gender: 'men' as 'men' | 'women',
    team1: '',
    team2: '',
    venue: '',
    date: '',
    title: ''
  };

  // Squad Selection
  selectedMatch: Match | null = null;
  team1Players: Player[] = [];
  team2Players: Player[] = [];
  team1RoleFilter = '';
  team2RoleFilter = '';
  squadForm: {
    team1: SquadPlayer[];
    team2: SquadPlayer[];
  } = { team1: [], team2: [] };

  // Toss Form
  tossForm = {
    winner: '',
    decision: '' as 'bat' | 'bowl' | ''
  };

  // Start Match Form
  startForm = {
    striker: '',
    nonStriker: '',
    bowler: ''
  };
  battingTeamPlayers: any[] = [];
  bowlingTeamPlayers: any[] = [];

  // Delete Modal
  showDeleteModal = false;
  deletingMatch: Match | null = null;
  deleting = false;
  deleteError = '';

  // ESPN Import data - stored to auto-populate squads after match creation
  pendingEspnSquads: {
    team1Squad: { playerId: string; espnName: string }[];
    team2Squad: { playerId: string; espnName: string }[];
    espnUrl?: string;
  } | null = null;

  constructor(
    private matchService: MatchService,
    private countryService: CountryService,
    private playerService: PlayerService,
    private espnService: EspnService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCountries();
    this.loadMatches();
  }

  loadCountries() {
    this.countryService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.countries = response.data;
        }
      }
    });
  }

  loadMatches() {
    this.loading = true;
    const filters = this.filterStatus ? { status: this.filterStatus } : undefined;
    
    this.matchService.getAll(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.matches = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCreateMatch() {
    this.matchForm = {
      format: 'T20',
      gender: 'men',
      team1: '',
      team2: '',
      venue: '',
      date: '',
      title: ''
    };
    this.error = '';
    this.currentStep = 'create';
  }

  createMatch() {
    if (!this.matchForm.team1 || !this.matchForm.team2 || !this.matchForm.venue || !this.matchForm.date) {
      this.error = 'All fields are required';
      return;
    }

    if (this.matchForm.team1 === this.matchForm.team2) {
      this.error = 'Teams must be different';
      return;
    }

    this.saving = true;
    this.error = '';

    // Generate title if not provided
    const title = this.matchForm.title.trim() || this.getTitlePreview();

    this.matchService.create({
      format: this.matchForm.format,
      gender: this.matchForm.gender,
      team1: this.matchForm.team1,
      team2: this.matchForm.team2,
      venue: this.matchForm.venue,
      date: new Date(this.matchForm.date).toISOString(),
      title
    }).subscribe({
      next: (response) => {
        if (response.success) {
          const createdMatch = response.data;
          
          // If we have a pending ESPN URL from import, set it on the match
          if (this.pendingEspnSquads?.espnUrl && createdMatch?._id) {
            this.setEspnUrlOnMatch(createdMatch._id);
          }
          
          this.loadMatches();
          this.currentStep = 'list';
        } else {
          this.error = response.message || 'Failed to create match';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create match';
        this.saving = false;
      }
    });
  }

  // Squad Management - Two Panel
  setupSquad(match: Match) {
    this.selectedMatch = match;
    this.error = '';
    this.team1RoleFilter = '';
    this.team2RoleFilter = '';
    
    // Initialize squad form with existing squad or empty
    this.squadForm = { team1: [], team2: [] };

    // Load players for both teams
    const team1Id = match.team1._id || match.team1;
    const team2Id = match.team2._id || match.team2;

    // Determine gender filter based on match gender
    const genderFilter = match.gender === 'women' ? 'F' : 'M';

    this.playerService.getAll({ country: team1Id, gender: genderFilter }).subscribe({
      next: (response) => {
        if (response.success) {
          this.team1Players = response.data;
          // Populate existing squad with player data (both Playing XI and Reserves)
          if (match.squads?.team1 && match.squads.team1.length > 0) {
            this.squadForm.team1 = match.squads.team1
              .map(p => {
                const playerId = p.player._id || p.player;
                const playerData = this.team1Players.find(pl => pl._id === playerId);
                return {
                  player: playerId,
                  playerData: playerData || p.player,
                  isPlayingXI: p.isPlayingXI,
                  battingOrder: p.battingOrder || 0
                };
              })
              .sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
            // Reassign batting orders to be sequential
            this.reorderPlayingXI('team1');
            this.reorderReserves('team1');
          } else if (this.pendingEspnSquads?.team1Squad?.length) {
            // Auto-populate from ESPN import data
            console.log('Auto-populating Team 1 squad from ESPN data...');
            this.autoPopulateSquadFromEspn('team1', this.pendingEspnSquads.team1Squad);
          }
        }
      }
    });

    this.playerService.getAll({ country: team2Id, gender: genderFilter }).subscribe({
      next: (response) => {
        if (response.success) {
          this.team2Players = response.data;
          // Populate existing squad with player data (both Playing XI and Reserves)
          if (match.squads?.team2 && match.squads.team2.length > 0) {
            this.squadForm.team2 = match.squads.team2
              .map(p => {
                const playerId = p.player._id || p.player;
                const playerData = this.team2Players.find(pl => pl._id === playerId);
                return {
                  player: playerId,
                  playerData: playerData || p.player,
                  isPlayingXI: p.isPlayingXI,
                  battingOrder: p.battingOrder || 0
                };
              })
              .sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
            // Reassign batting orders to be sequential
            this.reorderPlayingXI('team2');
            this.reorderReserves('team2');
          } else if (this.pendingEspnSquads?.team2Squad?.length) {
            // Auto-populate from ESPN import data
            console.log('Auto-populating Team 2 squad from ESPN data...');
            this.autoPopulateSquadFromEspn('team2', this.pendingEspnSquads.team2Squad);
          }
        }
      }
    });

    this.currentStep = 'squad';
  }

  /**
   * Auto-populate squad from ESPN import data
   * Matches ESPN players to local players by ID
   */
  private autoPopulateSquadFromEspn(
    team: 'team1' | 'team2', 
    espnSquad: { playerId: string; espnName: string }[]
  ): void {
    const players = team === 'team1' ? this.team1Players : this.team2Players;
    let battingOrder = 1;
    
    for (const espnPlayer of espnSquad) {
      // Find player by ID
      const localPlayer = players.find(p => p._id === espnPlayer.playerId);
      
      if (localPlayer) {
        this.squadForm[team].push({
          player: localPlayer._id,
          playerData: localPlayer,
          isPlayingXI: true,
          battingOrder: battingOrder++
        });
      } else {
        console.warn(`Could not find player with ID ${espnPlayer.playerId} (${espnPlayer.espnName})`);
      }
    }
    
    console.log(`  Auto-populated ${this.squadForm[team].length} players for ${team}`);
  }

  getAvailablePlayers(team: 'team1' | 'team2'): Player[] {
    const players = team === 'team1' ? this.team1Players : this.team2Players;
    const roleFilter = team === 'team1' ? this.team1RoleFilter : this.team2RoleFilter;
    const selectedIds = this.squadForm[team].map(p => p.player);
    
    return players.filter(p => {
      const notSelected = !selectedIds.includes(p._id);
      const matchesRole = !roleFilter || p.role === roleFilter;
      return notSelected && matchesRole;
    });
  }

  getPlayingXI(team: 'team1' | 'team2'): SquadPlayer[] {
    return this.squadForm[team].filter(p => p.isPlayingXI).sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));
  }

  getPlayingXICount(team: 'team1' | 'team2'): number {
    return this.squadForm[team].filter(p => p.isPlayingXI).length;
  }

  getReserves(team: 'team1' | 'team2'): SquadPlayer[] {
    return this.squadForm[team]
      .filter(p => !p.isPlayingXI)
      .sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }

  getReservesCount(team: 'team1' | 'team2'): number {
    return this.squadForm[team].filter(p => !p.isPlayingXI).length;
  }

  getSquadCount(team: 'team1' | 'team2'): number {
    return this.squadForm[team].length;
  }

  addToSquad(team: 'team1' | 'team2', player: Player) {
    // Check if we've hit the max squad size (15)
    if (this.getSquadCount(team) >= 15) return;
    
    // Add player with next batting order
    const nextOrder = this.getSquadCount(team) + 1;
    this.squadForm[team].push({
      player: player._id,
      playerData: player,
      isPlayingXI: true,  // All selected squad players are eligible to play
      battingOrder: nextOrder
    });
  }

  removeFromSquad(team: 'team1' | 'team2', playerId: string) {
    const index = this.squadForm[team].findIndex(p => p.player === playerId);
    if (index >= 0) {
      this.squadForm[team].splice(index, 1);
      // Reorder all players
      this.reorderSquad(team);
    }
  }

  // Legacy functions - no longer used but kept for compatibility
  moveToReserves(team: 'team1' | 'team2', playerId: string) {
    // No longer applicable - all players are in squad
  }

  promoteToPlayingXI(team: 'team1' | 'team2', playerId: string) {
    // No longer applicable - all players are in squad
  }

  // Reorder all squad players sequentially
  private reorderSquad(team: 'team1' | 'team2') {
    this.squadForm[team]
      .sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99))
      .forEach((p, i) => p.battingOrder = i + 1);
  }

  // Legacy methods for compatibility
  private reorderPlayingXI(team: 'team1' | 'team2') {
    this.reorderSquad(team);
  }

  private reorderReserves(team: 'team1' | 'team2') {
    // No-op, reorderSquad handles everything now
  }

  dropPlayer(team: 'team1' | 'team2', event: CdkDragDrop<SquadPlayer[]>) {
    if (event.previousIndex === event.currentIndex) return;
    
    // Get the full squad sorted by batting order
    const squad = this.squadForm[team].sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
    
    // Move the item in the array
    moveItemInArray(squad, event.previousIndex, event.currentIndex);
    
    // Reassign batting orders based on new positions
    squad.forEach((player, index) => {
      player.battingOrder = index + 1;
    });
  }

  dropReserveToPlayingXI(team: 'team1' | 'team2', event: CdkDragDrop<SquadPlayer[]>) {
    // Legacy function - no longer used with simplified squad model
  }

  formatRole(role: string): string {
    if (!role) return '';
    return role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  saveSquad() {
    if (this.getSquadCount('team1') < MIN_SQUAD_SIZE || this.getSquadCount('team2') < MIN_SQUAD_SIZE) {
      this.error = 'Both teams must have at least 11 players in squad';
      return;
    }

    this.saving = true;
    this.error = '';

    // Convert to backend format - use type assertion to match SquadPlayer from service
    const team1Data = this.squadForm.team1.map(p => ({
      player: p.player,
      isPlayingXI: p.isPlayingXI,
      battingOrder: p.battingOrder
    } as { player: string; isPlayingXI: boolean; battingOrder?: number }));

    const team2Data = this.squadForm.team2.map(p => ({
      player: p.player,
      isPlayingXI: p.isPlayingXI,
      battingOrder: p.battingOrder
    } as { player: string; isPlayingXI: boolean; battingOrder?: number }));

    this.matchService.setSquad(this.selectedMatch!._id, {
      team1: team1Data,
      team2: team2Data
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadMatches();
          this.currentStep = 'list';
        } else {
          this.error = response.message || 'Failed to save squad';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save squad';
        this.saving = false;
      }
    });
  }

  // Toss Management
  setupToss(match: Match) {
    this.selectedMatch = match;
    this.tossForm = { winner: '', decision: '' };
    this.error = '';
    this.currentStep = 'toss';
  }

  saveToss() {
    if (!this.tossForm.winner || !this.tossForm.decision) {
      this.error = 'Please select toss winner and decision';
      return;
    }

    this.saving = true;
    this.error = '';

    this.matchService.recordToss(this.selectedMatch!._id, {
      winner: this.tossForm.winner,
      decision: this.tossForm.decision as 'bat' | 'bowl'
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadMatches();
          this.currentStep = 'list';
        } else {
          this.error = response.message || 'Failed to record toss';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to record toss';
        this.saving = false;
      }
    });
  }

  // Start Match
  // Start match directly without selecting batsmen/bowler - they'll be set in scoring screen
  startMatchDirectly(match: Match) {
    this.saving = true;
    this.error = '';

    // Start match with no pre-selected players
    this.matchService.startMatch(match._id, {}).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadMatches();
          // Navigate directly to scoring page
          this.router.navigate(['/admin/scoring', match._id]);
        } else {
          this.error = response.message || 'Failed to start match';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to start match';
        this.saving = false;
      }
    });
  }

  // Legacy method - kept for compatibility but no longer used from UI
  setupStart(match: Match) {
    // Reload match to get populated squad
    this.matchService.getById(match._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedMatch = response.data;
          this.startForm = { striker: '', nonStriker: '', bowler: '' };
          this.error = '';
          
          // Determine batting and bowling teams based on toss
          const tossWinnerId = this.selectedMatch!.toss?.winner?._id || this.selectedMatch!.toss?.winner;
          const team1Id = this.selectedMatch!.team1?._id || this.selectedMatch!.team1;
          
          if (this.selectedMatch!.toss?.decision === 'bat') {
            // Toss winner bats
            if (tossWinnerId === team1Id) {
              this.battingTeamPlayers = this.selectedMatch!.squads.team1 || [];
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team2 || [];
            } else {
              this.battingTeamPlayers = this.selectedMatch!.squads.team2 || [];
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team1 || [];
            }
          } else {
            // Toss winner bowls
            if (tossWinnerId === team1Id) {
              this.battingTeamPlayers = this.selectedMatch!.squads.team2 || [];
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team1 || [];
            } else {
              this.battingTeamPlayers = this.selectedMatch!.squads.team1 || [];
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team2 || [];
            }
          }
          
          // Auto-select openers based on batting order
          const sortedBatsmen = [...this.battingTeamPlayers].sort((a, b) => 
            (a.battingOrder || 99) - (b.battingOrder || 99)
          );
          
          // Replace battingTeamPlayers with sorted version for display
          this.battingTeamPlayers = sortedBatsmen;
          
          // Pre-select batting order #1 as striker
          const opener1 = sortedBatsmen.find(p => p.battingOrder === 1);
          if (opener1) {
            this.startForm.striker = opener1.player._id || opener1.player;
          }
          
          // Pre-select batting order #2 as non-striker
          const opener2 = sortedBatsmen.find(p => p.battingOrder === 2);
          if (opener2) {
            this.startForm.nonStriker = opener2.player._id || opener2.player;
          }
          
          this.currentStep = 'start';
        }
      }
    });
  }

  getBattingTeamName(): string {
    if (!this.selectedMatch?.toss) return '';
    
    const tossWinnerId = this.selectedMatch.toss.winner?._id || this.selectedMatch.toss.winner;
    const team1Id = this.selectedMatch.team1?._id || this.selectedMatch.team1;
    
    if (this.selectedMatch.toss.decision === 'bat') {
      return tossWinnerId === team1Id 
        ? this.selectedMatch.team1?.name 
        : this.selectedMatch.team2?.name;
    } else {
      return tossWinnerId === team1Id 
        ? this.selectedMatch.team2?.name 
        : this.selectedMatch.team1?.name;
    }
  }

  startMatch() {
    // Opening batsmen and bowler are now optional - can be set later in scoring screen

    this.saving = true;
    this.error = '';

    // Build request - only include values if they're set
    const requestData: any = {};
    if (this.startForm.striker || this.startForm.nonStriker) {
      requestData.openingBatsmen = {};
      if (this.startForm.striker) {
        requestData.openingBatsmen.striker = this.startForm.striker;
      }
      if (this.startForm.nonStriker) {
        requestData.openingBatsmen.nonStriker = this.startForm.nonStriker;
      }
    }
    if (this.startForm.bowler) {
      requestData.openingBowler = this.startForm.bowler;
    }
    
    this.matchService.startMatch(this.selectedMatch!._id, requestData).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadMatches();
          this.currentStep = 'list';
          // Navigate to scoring page
          this.router.navigate(['/admin/scoring', this.selectedMatch!._id]);
        } else {
          this.error = response.message || 'Failed to start match';
        }
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to start match';
        this.saving = false;
      }
    });
  }

  // Delete Match
  confirmDelete(match: Match) {
    this.deletingMatch = match;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletingMatch = null;
    this.deleteError = '';
  }

  deleteMatch() {
    if (!this.deletingMatch) return;

    this.deleting = true;
    this.deleteError = '';

    this.matchService.delete(this.deletingMatch._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadMatches();
          this.closeDeleteModal();
        } else {
          this.deleteError = response.message || 'Failed to delete match';
        }
        this.deleting = false;
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete match';
        this.deleting = false;
      }
    });
  }

  // Helpers
  hasSquad(match: Match): boolean {
    return (match.squads?.team1?.length || 0) >= 11 &&
           (match.squads?.team2?.length || 0) >= 11;
  }

  getCurrentScore(match: Match): string {
    if (!match.innings || match.innings.length === 0) return '';
    const currentInnings = match.innings[match.currentInnings || 0];
    if (!currentInnings) return '';
    
    const overs = Math.floor(currentInnings.totalBalls / 6);
    const balls = currentInnings.totalBalls % 6;
    return `${currentInnings.totalRuns}/${currentInnings.totalWickets} (${overs}.${balls} ov)`;
  }

  goToScoring(match: Match) {
    this.router.navigate(['/admin/scoring', match._id]);
  }

  goToEditor(match: Match) {
    // Open editor in a new tab/window - ideal for dual monitor setup
    window.open(`/admin/editor/${match._id}`, '_blank');
  }

  // Title generation helpers
  getMatchDisplayTitle(match: Match): string {
    if (match.title) {
      return match.title;
    }
    // Fallback to generated title
    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    if (match.gender === 'women') {
      return `Women's ${match.format}: ${team1Name} vs ${team2Name}`;
    }
    return `${team1Name} vs ${team2Name}`;
  }

  getTitlePreview(): string {
    const team1 = this.countries.find(c => c._id === this.matchForm.team1);
    const team2 = this.countries.find(c => c._id === this.matchForm.team2);
    const team1Name = team1?.name || 'Team 1';
    const team2Name = team2?.name || 'Team 2';
    
    if (this.matchForm.gender === 'women') {
      return `Women's ${this.matchForm.format}: ${team1Name} vs ${team2Name}`;
    }
    return `${team1Name} vs ${team2Name}`;
  }

  updateTitlePreview() {
    // This method is called when gender or format changes
    // Title preview is computed in getTitlePreview()
  }

  // ESPN Import
  applyEspnImport(data: any): void {
    // Apply the imported data to the form
    this.matchForm.format = data.format;
    this.matchForm.gender = data.gender;
    this.matchForm.team1 = data.team1Id;
    this.matchForm.team2 = data.team2Id;
    this.matchForm.venue = data.venue;
    this.matchForm.date = data.date;
    this.matchForm.title = data.title;
    
    // Store squad info and ESPN URL for auto-population
    // Convert squad URL to scorecard URL: replace /match-squads with /full-scorecard
    let scorecardUrl = data.espnUrl || '';
    if (scorecardUrl.includes('/match-squads')) {
      scorecardUrl = scorecardUrl.replace('/match-squads', '/full-scorecard');
    } else if (!scorecardUrl.includes('/full-scorecard') && scorecardUrl.includes('/live-cricket-score')) {
      // Already a live score URL, convert to full scorecard
      scorecardUrl = scorecardUrl.replace('/live-cricket-score', '/full-scorecard');
    }
    
    if (data.team1Squad?.length > 0 || data.team2Squad?.length > 0 || scorecardUrl) {
      this.pendingEspnSquads = {
        team1Squad: data.team1Squad || [],
        team2Squad: data.team2Squad || [],
        espnUrl: scorecardUrl
      };
      console.log('ESPN data stored for auto-population');
      console.log('  Team 1:', this.pendingEspnSquads.team1Squad.length, 'players');
      console.log('  Team 2:', this.pendingEspnSquads.team2Squad.length, 'players');
      console.log('  Scorecard URL:', scorecardUrl);
    }
  }

  /**
   * Set the ESPN URL on a newly created match
   */
  private setEspnUrlOnMatch(matchId: string): void {
    if (!this.pendingEspnSquads?.espnUrl) return;
    
    this.espnService.setMatchEspnUrl(matchId, this.pendingEspnSquads.espnUrl).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('ESPN URL set on match:', this.pendingEspnSquads?.espnUrl);
        } else {
          console.warn('Failed to set ESPN URL:', response.message);
        }
      },
      error: (err) => {
        console.warn('Error setting ESPN URL:', err);
      }
    });
  }
}
