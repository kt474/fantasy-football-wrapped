export type LeagueInfoType = {
  name: string;
  regularSeasonLength: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string;
  lastUpdated: number;
  users: [];
  rosters: [];
  weeklyPoints: [];
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
};
