export type LeagueInfoType = {
  name: string;
  regularSeasonLength: number;
  medianScoring: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string;
  legacyWinner: number;
  lastUpdated: number;
  previousLeagueId: string;
  lastScoredWeek: number;
  winnersBracket: Record<string, any>[];
  losersBracket: Record<string, any>[];
  users: any[];
  rosters: any[];
  weeklyPoints: [];
  transactions: [];
  trades: [];
  waivers: [];
  waiverMoves: WaiverMove[];
  tradeNames: any[];
  previousLeagues: any[];
  status: string;
  currentWeek: number;
  scoringType: number;
  scoringSettings: Record<string, number>;
  rosterPositions: string[];
  playoffTeams: number;
  playoffProjections?: any[];
  weeklyReport?: string;
  yearEndReport?: string;
  currentTrends?: string[];
  playoffType: number;
  draftId: string;
  draftPicks: any[];
  draftMetadata: any;
  draftGrades: any[];
  playerRankings: any;
  rosterRankings: any;
  waiverType: number;
};

export type RosterType = {
  id: string;
  pointsFor: number;
  pointsAgainst: number;
  potentialPoints: number;
  managerEfficiency: number;
  wins: number;
  losses: number;
  rosterId: number;
  recordByWeek: string;
  players?: string[];
  projections?: { projection: number; position: string }[];
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
  value: number;
  position: string;
  player_id: string;
  bid: number | null;
  status: string;
}

export type UserType = {
  id: string;
  avatar: string;
  avatarImg: string;
  name: string;
  username?: string;
};

export type TableDataType = {
  name: string;
  username: string;
  wins: number;
  losses: number;
  ties?: number;
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
  starters: string[];
  starterPoints: number[][];
  benchPlayers: string[];
  benchPoints: number[];
};

export type SeasonalAwardId = "award-i" | "award-ii" | "award-iii" | "award-iv" | "award-v";

export type SeasonalAward = {
  id: SeasonalAwardId;
  title: string;
  informalLabel: string;
  definition: string;
  amount: number;
  winnerOwnerId?: string | null;
  winnerNameOverride?: string | null;
};

export type WeeklyBonus = {
  week: number;
  label: string;
  note?: string;
  amount: number;
  winnerOwnerId?: string | null;
  winnerNameOverride?: string | null;
  score?: number | null;
};
