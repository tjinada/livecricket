/**
 * Shared interfaces for match display sub-components
 */

export interface BallDisplay {
  display: string;
  runs?: number;
  isWicket?: boolean;
  isExtra?: boolean;
  extraType?: string;
}

export interface OverDisplay {
  overNumber: number;
  balls: BallDisplay[];
  runs: number;
}

export interface BatsmanStats {
  player: any;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate?: number;
  isOut?: boolean;
  isDNB?: boolean;
  dismissal?: any;
}

export interface BowlerStats {
  player: any;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens?: number;
  economy?: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  overs: string;
  player: any;
}

export interface GraphDataPoint {
  over: number;
  runs: number;
}

export interface BackgroundState {
  type: string;
  url: string | null;
}
