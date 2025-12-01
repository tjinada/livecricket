import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatchService, Match } from '../../../core/services/match.service';
import { CountryService, PlayerService } from '../../../core/services';
import { Country, Player } from '../../../core/models';

type MatchStep = 'list' | 'create' | 'squad' | 'toss' | 'start';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
                        {{ match.team1?.name }} vs {{ match.team2?.name }}
                      </h3>
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
                      {{ match.format }} • {{ match.venue }} • {{ match.date | date:'medium' }}
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
                          (click)="setupStart(match)"
                          class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Start Match
                        </button>
                      }
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
                    }
                    @if (match.status === 'completed') {
                      <button 
                        (click)="goToScoring(match)"
                        class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        Manage Display
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

          <div class="bg-white rounded-lg shadow p-6">
            <form (ngSubmit)="createMatch()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select 
                  [(ngModel)]="matchForm.format"
                  name="format"
                  required
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

              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input 
                  type="datetime-local"
                  [(ngModel)]="matchForm.date"
                  name="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
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

      <!-- Squad Selection -->
      @if (currentStep === 'squad' && selectedMatch) {
        <div>
          <div class="flex items-center gap-4 mb-6">
            <button (click)="currentStep = 'list'" class="text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <h2 class="text-2xl font-bold text-gray-800">
              Select Squads: {{ selectedMatch.team1?.name }} vs {{ selectedMatch.team2?.name }}
            </h2>
          </div>

          <div class="bg-white rounded-lg shadow p-4 mb-4">
            <p class="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Enter batting order (1-11) for each player. Leave empty for players not in Playing XI.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Team 1 Squad -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                <h3 class="text-lg font-semibold text-gray-800 flex items-center justify-between">
                  <span>{{ selectedMatch.team1?.name }}</span>
                  <span class="text-sm font-medium px-2 py-1 rounded"
                    [class.bg-green-100]="getPlayingXICount('team1') === 11"
                    [class.text-green-700]="getPlayingXICount('team1') === 11"
                    [class.bg-yellow-100]="getPlayingXICount('team1') !== 11"
                    [class.text-yellow-700]="getPlayingXICount('team1') !== 11">
                    {{ getPlayingXICount('team1') }}/11
                  </span>
                </h3>
              </div>
              
              @if (team1Players.length === 0) {
                <div class="p-4">
                  <p class="text-gray-500 text-sm">No players found for this country</p>
                </div>
              } @else {
                <div class="divide-y max-h-[calc(100vh-320px)] overflow-y-auto">
                  @for (player of team1Players; track player._id) {
                    <div class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                      [class.bg-green-50]="isInSquad('team1', player._id)">
                      <input 
                        type="number"
                        [value]="getBattingOrder('team1', player._id) || null"
                        (input)="onBattingOrderChange('team1', player._id, $event)"
                        min="1"
                        max="11"
                        class="w-14 px-2 py-1 text-center border rounded text-sm font-medium"
                        [class.border-green-500]="isInSquad('team1', player._id)"
                        [class.bg-green-100]="isInSquad('team1', player._id)"
                        placeholder="-"
                      >
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-900">{{ player.name }}</span>
                      </div>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                        {{ formatRole(player.role) }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Team 2 Squad -->
            <div class="bg-white rounded-lg shadow">
              <div class="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                <h3 class="text-lg font-semibold text-gray-800 flex items-center justify-between">
                  <span>{{ selectedMatch.team2?.name }}</span>
                  <span class="text-sm font-medium px-2 py-1 rounded"
                    [class.bg-green-100]="getPlayingXICount('team2') === 11"
                    [class.text-green-700]="getPlayingXICount('team2') === 11"
                    [class.bg-yellow-100]="getPlayingXICount('team2') !== 11"
                    [class.text-yellow-700]="getPlayingXICount('team2') !== 11">
                    {{ getPlayingXICount('team2') }}/11
                  </span>
                </h3>
              </div>
              
              @if (team2Players.length === 0) {
                <div class="p-4">
                  <p class="text-gray-500 text-sm">No players found for this country</p>
                </div>
              } @else {
                <div class="divide-y max-h-[calc(100vh-320px)] overflow-y-auto">
                  @for (player of team2Players; track player._id) {
                    <div class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                      [class.bg-green-50]="isInSquad('team2', player._id)">
                      <input 
                        type="number"
                        [value]="getBattingOrder('team2', player._id) || null"
                        (input)="onBattingOrderChange('team2', player._id, $event)"
                        min="1"
                        max="11"
                        class="w-14 px-2 py-1 text-center border rounded text-sm font-medium"
                        [class.border-green-500]="isInSquad('team2', player._id)"
                        [class.bg-green-100]="isInSquad('team2', player._id)"
                        placeholder="-"
                      >
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-900">{{ player.name }}</span>
                      </div>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                        {{ formatRole(player.role) }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          @if (error) {
            <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {{ error }}
            </div>
          }

          @if (squadValidationErrors.length > 0) {
            <div class="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
              <ul class="list-disc list-inside">
                @for (err of squadValidationErrors; track err) {
                  <li>{{ err }}</li>
                }
              </ul>
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
              [disabled]="saving || getPlayingXICount('team1') !== 11 || getPlayingXICount('team2') !== 11 || squadValidationErrors.length > 0"
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

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Opening Striker</label>
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
              <label class="block text-sm font-medium text-gray-700 mb-2">Opening Non-Striker</label>
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
              <label class="block text-sm font-medium text-gray-700 mb-2">Opening Bowler</label>
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
                [disabled]="saving || !startForm.striker || !startForm.nonStriker || !startForm.bowler"
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
              <p class="text-gray-600 mb-6">
                Are you sure you want to delete 
                <strong>{{ deletingMatch?.team1?.name }} vs {{ deletingMatch?.team2?.name }}</strong>?
              </p>

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
    team1: '',
    team2: '',
    venue: '',
    date: ''
  };

  // Squad Selection
  selectedMatch: Match | null = null;
  team1Players: Player[] = [];
  team2Players: Player[] = [];
  squadForm: {
    team1: { player: string; isPlayingXI: boolean; battingOrder: number }[];
    team2: { player: string; isPlayingXI: boolean; battingOrder: number }[];
  } = { team1: [], team2: [] };
  squadValidationErrors: string[] = [];

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

  constructor(
    private matchService: MatchService,
    private countryService: CountryService,
    private playerService: PlayerService,
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
      team1: '',
      team2: '',
      venue: '',
      date: ''
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

    this.matchService.create({
      format: this.matchForm.format,
      team1: this.matchForm.team1,
      team2: this.matchForm.team2,
      venue: this.matchForm.venue,
      date: new Date(this.matchForm.date).toISOString()
    }).subscribe({
      next: (response) => {
        if (response.success) {
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

  // Squad Management
  setupSquad(match: Match) {
    this.selectedMatch = match;
    this.error = '';
    
    // Initialize squad form with existing squad or empty
    this.squadForm = {
      team1: match.squads?.team1?.map(p => ({
        player: p.player._id || p.player,
        isPlayingXI: p.isPlayingXI,
        battingOrder: p.battingOrder || 0
      })) || [],
      team2: match.squads?.team2?.map(p => ({
        player: p.player._id || p.player,
        isPlayingXI: p.isPlayingXI,
        battingOrder: p.battingOrder || 0
      })) || []
    };

    // Load players for both teams
    const team1Id = match.team1._id || match.team1;
    const team2Id = match.team2._id || match.team2;

    this.playerService.getAll({ country: team1Id }).subscribe({
      next: (response) => {
        if (response.success) {
          this.team1Players = response.data;
        }
      }
    });

    this.playerService.getAll({ country: team2Id }).subscribe({
      next: (response) => {
        if (response.success) {
          this.team2Players = response.data;
        }
      }
    });

    this.currentStep = 'squad';
  }

  isInSquad(team: 'team1' | 'team2', playerId: string): boolean {
    return this.squadForm[team].some(p => p.player === playerId && p.isPlayingXI);
  }

  getPlayingXICount(team: 'team1' | 'team2'): number {
    return this.squadForm[team].filter(p => p.isPlayingXI).length;
  }

  togglePlayer(team: 'team1' | 'team2', player: Player) {
    const index = this.squadForm[team].findIndex(p => p.player === player._id);
    
    if (index >= 0) {
      // Remove from squad
      this.squadForm[team].splice(index, 1);
    } else {
      // Add to squad
      const order = this.getPlayingXICount(team) + 1;
      this.squadForm[team].push({
        player: player._id,
        isPlayingXI: true,
        battingOrder: order
      });
    }
  }

  getBattingOrder(team: 'team1' | 'team2', playerId: string): number {
    const player = this.squadForm[team].find(p => p.player === playerId);
    return player?.battingOrder || 0;
  }

  onBattingOrderChange(team: 'team1' | 'team2', playerId: string, event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    const existingIndex = this.squadForm[team].findIndex(p => p.player === playerId);
    
    if (value >= 1 && value <= 11) {
      // Add or update player in squad
      if (existingIndex >= 0) {
        this.squadForm[team][existingIndex].battingOrder = value;
        this.squadForm[team][existingIndex].isPlayingXI = true;
      } else {
        this.squadForm[team].push({
          player: playerId,
          isPlayingXI: true,
          battingOrder: value
        });
      }
    } else {
      // Remove player from squad if value is cleared or invalid
      if (existingIndex >= 0) {
        this.squadForm[team].splice(existingIndex, 1);
      }
    }
    
    this.validateSquad();
  }

  validateSquad() {
    this.squadValidationErrors = [];
    
    // Check for duplicate batting orders in team1
    const team1Orders = this.squadForm.team1
      .filter(p => p.isPlayingXI && p.battingOrder > 0)
      .map(p => p.battingOrder);
    const team1Duplicates = team1Orders.filter((item, index) => team1Orders.indexOf(item) !== index);
    if (team1Duplicates.length > 0) {
      this.squadValidationErrors.push(`${this.selectedMatch?.team1?.name}: Duplicate batting order(s): ${[...new Set(team1Duplicates)].join(', ')}`);
    }
    
    // Check for duplicate batting orders in team2
    const team2Orders = this.squadForm.team2
      .filter(p => p.isPlayingXI && p.battingOrder > 0)
      .map(p => p.battingOrder);
    const team2Duplicates = team2Orders.filter((item, index) => team2Orders.indexOf(item) !== index);
    if (team2Duplicates.length > 0) {
      this.squadValidationErrors.push(`${this.selectedMatch?.team2?.name}: Duplicate batting order(s): ${[...new Set(team2Duplicates)].join(', ')}`);
    }
  }

  formatRole(role: string): string {
    return role.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  saveSquad() {
    if (this.getPlayingXICount('team1') !== 11 || this.getPlayingXICount('team2') !== 11) {
      this.error = 'Both teams must have exactly 11 players';
      return;
    }

    this.saving = true;
    this.error = '';

    this.matchService.setSquad(this.selectedMatch!._id, {
      team1: this.squadForm.team1,
      team2: this.squadForm.team2
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
              this.battingTeamPlayers = this.selectedMatch!.squads.team1.filter(p => p.isPlayingXI);
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team2.filter(p => p.isPlayingXI);
            } else {
              this.battingTeamPlayers = this.selectedMatch!.squads.team2.filter(p => p.isPlayingXI);
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team1.filter(p => p.isPlayingXI);
            }
          } else {
            // Toss winner bowls
            if (tossWinnerId === team1Id) {
              this.battingTeamPlayers = this.selectedMatch!.squads.team2.filter(p => p.isPlayingXI);
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team1.filter(p => p.isPlayingXI);
            } else {
              this.battingTeamPlayers = this.selectedMatch!.squads.team1.filter(p => p.isPlayingXI);
              this.bowlingTeamPlayers = this.selectedMatch!.squads.team2.filter(p => p.isPlayingXI);
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
    if (!this.startForm.striker || !this.startForm.nonStriker || !this.startForm.bowler) {
      this.error = 'Please select opening batsmen and bowler';
      return;
    }

    this.saving = true;
    this.error = '';

    this.matchService.startMatch(this.selectedMatch!._id, {
      openingBatsmen: {
        striker: this.startForm.striker,
        nonStriker: this.startForm.nonStriker
      },
      openingBowler: this.startForm.bowler
    }).subscribe({
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
    return match.squads?.team1?.filter(p => p.isPlayingXI).length === 11 &&
           match.squads?.team2?.filter(p => p.isPlayingXI).length === 11;
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
}
