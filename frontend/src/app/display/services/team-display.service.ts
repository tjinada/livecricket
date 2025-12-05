import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TeamDisplayService {

  /**
   * Get team name from team object or ID
   * Requires match context to resolve team IDs
   */
  getTeamName(team: any, match: any): string {
    if (!team) return 'Unknown';
    if (team.name) return team.name;
    
    const teamId = team._id || team;
    if (match?.team1?._id === teamId || match?.team1 === teamId) {
      return match.team1?.name || 'Team 1';
    }
    if (match?.team2?._id === teamId || match?.team2 === teamId) {
      return match.team2?.name || 'Team 2';
    }
    return 'Unknown';
  }

  /**
   * Get team code (short code like "IND", "AUS")
   */
  getTeamCode(team: any, match: any): string {
    if (!team) return '???';
    if (team.code) return team.code;
    
    const teamId = team._id || team;
    if (match?.team1?._id === teamId || match?.team1 === teamId) {
      return match.team1?.code || 'T1';
    }
    if (match?.team2?._id === teamId || match?.team2 === teamId) {
      return match.team2?.code || 'T2';
    }
    return '???';
  }

  /**
   * Get team flag URL
   */
  getTeamFlag(team: any, match: any): string | null {
    if (!team) return null;
    if (team.flagUrl) return team.flagUrl;
    
    const teamId = team._id || team;
    if (match?.team1?._id === teamId || match?.team1 === teamId) {
      return match.team1?.flagUrl || null;
    }
    if (match?.team2?._id === teamId || match?.team2 === teamId) {
      return match.team2?.flagUrl || null;
    }
    return null;
  }

  /**
   * Get team flag video URL (animated flag)
   */
  getTeamFlagVideo(team: any, match: any): string | null {
    if (!team) return null;
    if (team.flagVideo) return team.flagVideo;
    
    const teamId = team._id || team;
    if (match?.team1?._id === teamId || match?.team1 === teamId) {
      return match.team1?.flagVideo || null;
    }
    if (match?.team2?._id === teamId || match?.team2 === teamId) {
      return match.team2?.flagVideo || null;
    }
    return null;
  }

  /**
   * Get batting team name from current innings
   */
  getBattingTeamName(innings: any, match: any): string {
    return this.getTeamName(innings?.battingTeam, match);
  }

  /**
   * Get bowling team name from current innings
   */
  getBowlingTeamName(innings: any, match: any): string {
    return this.getTeamName(innings?.bowlingTeam, match);
  }

  /**
   * Get batting team code from current innings
   */
  getBattingTeamCode(innings: any, match: any): string {
    if (!innings?.battingTeam) return '???';
    return innings.battingTeam.code || this.getTeamCode(innings.battingTeam, match);
  }

  /**
   * Get bowling team code from current innings
   */
  getBowlingTeamCode(innings: any, match: any): string {
    if (!innings?.bowlingTeam) return '???';
    return innings.bowlingTeam.code || this.getTeamCode(innings.bowlingTeam, match);
  }

  /**
   * Get batting team flag from current innings
   */
  getBattingTeamFlag(innings: any, match: any): string | null {
    const battingTeam = innings?.battingTeam;
    if (!battingTeam) return null;
    
    if (battingTeam.flagUrl) return battingTeam.flagUrl;
    return this.getTeamFlag(battingTeam, match);
  }

  /**
   * Get first batting team name (1st innings)
   */
  getFirstBattingTeamName(match: any): string {
    return this.getTeamName(match?.innings?.[0]?.battingTeam, match);
  }

  /**
   * Get second batting team name (2nd innings or bowling team from 1st)
   */
  getSecondBattingTeamName(match: any): string {
    if (!match?.innings?.[1]) {
      return this.getTeamName(match?.innings?.[0]?.bowlingTeam, match);
    }
    return this.getTeamName(match.innings[1].battingTeam, match);
  }

  /**
   * Get first innings team name (alias for first batting)
   */
  getFirstInningsTeamName(match: any): string {
    return this.getFirstBattingTeamName(match);
  }

  /**
   * Get second innings team name
   */
  getSecondInningsTeamName(match: any): string {
    return this.getTeamName(match?.innings?.[1]?.battingTeam, match);
  }

  /**
   * Check if a team ID matches team1 in the match
   */
  isTeam1(teamId: any, match: any): boolean {
    const team1Id = match?.team1?._id || match?.team1;
    return teamId === team1Id || teamId?.toString() === team1Id?.toString();
  }

  /**
   * Get the squad for a given team
   */
  getSquadForTeam(teamId: any, match: any): any[] | null {
    if (this.isTeam1(teamId, match)) {
      return match?.squads?.team1 || null;
    }
    return match?.squads?.team2 || null;
  }

  /**
   * Get innings label (1st or 2nd Innings)
   */
  getInningsLabel(currentInningsIndex: number): string {
    return currentInningsIndex === 0 ? '1st Innings' : '2nd Innings';
  }
}
