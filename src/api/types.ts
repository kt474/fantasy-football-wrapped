export type LeagueInfoType = {
  name: string;
  regularSeasonLength: number;
  medianScoring: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string;
  lastUpdated: number;
  previousLeagueId: string;
  lastScoredWeek: number;
  winnersBracket: any[];
  losersBracket: any[];
  users: any[];
  rosters: any[];
  weeklyPoints: [];
  playoffPoints: [];
  transactions: [];
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
};

export type UserType = {
  id: string;
  avatar: string;
  avatarImg: string;
  name: string;
};

export type TableDataType = {
  name: string;
  wins: number;
  losses: number;
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
  potentialPoints: number;
  managerEfficiency: number;
  regularSeasonRank: number;
};
