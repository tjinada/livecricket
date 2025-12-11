import { Country } from './country.model';

export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
export type BattingStyle = 'right-hand' | 'left-hand';
export type PlayerGender = 'M' | 'F';
export type BowlingStyle = 
  | 'right-arm-fast' 
  | 'right-arm-medium' 
  | 'left-arm-fast' 
  | 'left-arm-medium'
  | 'right-arm-off-spin' 
  | 'right-arm-leg-spin'
  | 'left-arm-orthodox' 
  | 'left-arm-chinaman'
  | 'none';

export interface Player {
  _id: string;
  name: string;
  country: Country | string;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  isActive: boolean;
  gender: PlayerGender;
  headshotPath?: string | null;
  imageUrl?: string | null;  // Full quality original image
  espnId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlayerDto {
  name: string;
  country: string;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
}

export interface UpdatePlayerDto {
  name?: string;
  country?: string;
  role?: PlayerRole;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  isActive?: boolean;
}
