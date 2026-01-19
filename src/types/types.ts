import { DraftPick, DraftGrades } from "./apiTypes";

export type LeagueInfoType = {
  name: string;
  regularSeasonLength: number;
  medianScoring: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string;
  legacyWinner?: number;
  lastUpdated: number;
  previousLeagueId: string;
  lastScoredWeek: number;
  winnersBracket: Record<string, any>[];
  losersBracket: Record<string, any>[];
  users: any[];
  rosters: any[];
  weeklyPoints: any[];
  transactions: Record<string, any>;
  trades: any[];
  waivers: any[];
  waiverMoves?: WaiverMove[];
  tradeNames?: any[];
  previousLeagues: any[];
  status: string;
  currentWeek: number;
  scoringType: number;
  rosterPositions: string[];
  playoffTeams: number;
  playoffProjections?: PlayoffProjection[];
  weeklyReport?: string;
  yearEndReport?: string;
  currentTrends?: string[];
  playoffType: number;
  draftId: string;
  draftPicks?: DraftPick[];
  draftMetadata?: LeagueDraftMetadata;
  draftGrades?: DraftGrades[];
  playerRankings?: PlayerRankingsType;
  rosterRankings?: Record<string, PlayerType[]>;
  waiverType: number;
  sport: string;
};

export type RosterType = {
  id: string;
  pointsFor: number;
  pointsAgainst: number;
  potentialPoints: number;
  managerEfficiency: number;
  wins: number;
  losses: number;
  ties: number;
  rosterId: number;
  recordByWeek: string;
  players?: string[];
  projections?: { projection: number; position: string }[];
};

export type PointsType = {
  rosterId: number;
  points: number[];
  matchups?: number[];
  starters: string[][];
  starterPoints: number[][];
  benchPlayers: string[][];
  benchPoints: number[][];
};

export interface WaiverMove {
  id: number | string;
  user: {
    username: string;
    avatarImg?: string;
    name: string;
  };
  adds: string;
  week: number;
  value: number | null;
  position: string;
  player_id: string;
  bid: number | null;
  status: string;
}

export type UserType = {
  id: string;
  avatar: string;
  avatarImg?: string;
  name: string;
  username?: string;
};

export type TableDataType = {
  name: string;
  username: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winsAgainstAll: number;
  lossesAgainstAll: number;
  winsWithMedian: number;
  lossesWithMedian: number;
  rating: number;
  randomScheduleWins: number;
  avatarImg: string;
  points: number[];
  matchups: (number | null)[];
  potentialPoints: number;
  managerEfficiency: number;
  regularSeasonRank: number;
  id: string;
  rosterId: number;
  expectedWinsSTD: number;
  recordByWeek: string;
  players: string[];
  starters: string[][];
  starterPoints: number[][];
  benchPlayers: string[];
  benchPoints: number[];
};

export type PowerRankingEntry = {
  name: string;
  type: string;
  ratings: number[];
  data?: number[];
};

export interface PlayerRankingsType {
  WR: PlayerType[];
  RB: PlayerType[];
  K: PlayerType[];
  TE: PlayerType[];
  QB: PlayerType[];
  DEF: PlayerType[];
}

export interface PlayerType {
  rank: number;
  overallRank: number;
  firstName: string;
  lastName: string;
  position: string;
  team: string;
  id: string;
  rosterId: number;
  points?: number;
  ppg?: number;
  gp?: number;
}

export interface RosterOnly {
  rosterId: number;
}

export type WeeklyEntry = PlayerType | RosterOnly;

export interface LeagueDraftMetadata {
  order: Order[];
  roundReversal: number;
  draftType: string;
}

export interface Order {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarImg: string;
  placement: number;
}

export interface PlayoffProjection {
  username?: string;
  score?: number;
  currentWins?: number;
  originalWins?: number;
  playoffPercentage?: number;
  name: string;
  id: string;
  placement: number[];
  projectedWinsTotal: number;
}
