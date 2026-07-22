import type { Bracket, DraftPick, DraftGrades, WeeklyWaiver } from "./apiTypes";
import type { Player } from "./apiTypes";

export type LeagueInfoType = {
  platform?: string;
  name: string;
  regularSeasonLength: number;
  medianScoring: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string | null;
  legacyWinner?: number;
  lastUpdated: number;
  previousLeagueId: string | null;
  lastScoredWeek: number;
  winnersBracket: Bracket[];
  losersBracket: Bracket[];
  espnWinnersBracket: any[];
  espnLosersBracket: any[];
  users: UserType[];
  rosters: RosterType[];
  weeklyPoints: PointsType[];
  transactions: Record<string, number>;
  trades: WeeklyWaiver[];
  waivers: WeeklyWaiver[];
  waiverMoves?: WaiverMove[];
  tradeNames?: TradeNameRow[];
  previousLeagues: LeagueInfoType[];
  status: string;
  currentWeek: number;
  scoringType: number;
  rosterPositions: string[];
  playoffTeams: number;
  espnPlayoffMatchupPeriods?: number[][];
  espnTradeDataAvailable?: boolean;
  playoffProjections?: PlayoffProjection[];
  weeklyReport?: string;
  premiumWeeklyReports?: Record<number, PremiumReport>;
  weeklyPreview?: string;
  managerProfiles?: Record<string, string>;
  rivalryReports?: Record<string, string>;
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

export type PremiumReport = {
  frontPage: {
    headline: string;
    subheadline: string;
    lead: string;
  };
  matchupReports: Array<{
    matchupNumber: number;
    bracket: "regular" | "winners" | "losers" | "unknown";
    headline: string;
    recap: string;
    teams?: PremiumReportTeamIdentity[];
  }>;
  teamOfTheWeek: {
    teamName: string;
    avatarUrl?: string;
    pointsScored: number;
    headline: string;
    analysis: string;
  };
  weeklyLowlights: {
    headline: string;
    entries: Array<{
      teamName: string;
      avatarUrl?: string;
      category:
        | "bench_burn"
        | "starter_disaster"
        | "defensive_meltdown"
        | "weekly_low"
        | "lineup_efficiency"
        | "waiver_flop";
      headline: string;
      analysis: string;
    }>;
  };
};

export type PremiumReportTeamIdentity = {
  teamName: string;
  avatarUrl?: string;
  record?: string;
  pointsScored?: number;
};

export type WeeklyRecapVideoProps = {
  schemaVersion: 1;
  templateVersion: "weekly-v1";
  league: {
    id?: string;
    name: string;
    season: string;
    week: number;
  };
  report: PremiumReport;
  facts: {
    matchups: Array<{
      matchupNumber: number;
      teams: [
        { name: string; score: number; avatarUrl?: string },
        { name: string; score: number; avatarUrl?: string },
      ];
      margin: number;
      bracket: "regular" | "winners" | "losers" | "unknown";
    }>;
    topTeams: Array<{ name: string; score: number; avatarUrl?: string }>;
    topPlayers: Array<{
      name: string;
      points: number;
      teamName: string;
      position?: string;
      imageUrl?: string;
    }>;
    benchPain: Array<{
      playerName: string;
      points: number;
      teamName: string;
      startedPlayerName?: string;
      pointsLost?: number;
      imageUrl?: string;
    }>;
    standingsMoves: Array<{
      teamName: string;
      from: number;
      to: number;
    }>;
  };
  branding: {
    callToAction: string;
    destination: string;
  };
};

export type WeeklyRecapVideoJobStatus =
  | "starting"
  | "queued"
  | "rendering"
  | "complete"
  | "failed"
  | "cancelled"
  | "expired";

export type WeeklyRecapVideoJob = {
  jobId: string;
  status: WeeklyRecapVideoJobStatus;
  progress: number;
  createdAt: string;
  expiresAt: string | null;
  videoUrl: string | null;
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
  projectionStartWeek?: number;
  playerNames?: { name: string; position: string }[];
};

export type PointsType = {
  rosterId: number;
  points: number[];
  matchups?: number[];
  starters: (string | null)[][];
  starterPoints: number[][];
  starterNames?: any[][];
  benchPlayers: (string | null)[][];
  benchPoints: number[][];
  benchNames?: any[][];
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
  username: string;
  placement?: number;
};

export interface TradeNameRow {
  team1: {
    user: { name: string; username?: string; avatarImg?: string };
    players: string[];
    playerIds: string[];
    draftPicks: { owner_id: number; season: string; round: number }[];
    waiverBudget: { receiver: number; amount: number }[];
    week?: number;
    value: Array<number | null>;
  };
  team2: {
    user: { name: string; username?: string; avatarImg?: string };
    players: string[];
    playerIds: string[];
    draftPicks: { owner_id: number; season: string; round: number }[];
    waiverBudget: { receiver: number; amount: number }[];
    week?: number;
    value: Array<number | null>;
  };
}

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
  headToHeadWins: number;
  headToHeadLosses: number;
  headToHeadTies: number;
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
  starterNames?: Player[][];
  benchNames?: Player[][];
  benchPlayers: string[][];
  benchPoints: number[][];
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
  auctionBudget?: number;
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
  score: number;
  currentWins: number;
  originalWins: number;
  playoffPercentage: number;
  name: string;
  id: string;
  placement: number[];
  projectedWinsTotal: number;
}

export interface UserLeagueListItem {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  settings: {
    type: number;
    [key: string]: number | string | boolean | null | undefined;
  };
  sport?: string;
}
