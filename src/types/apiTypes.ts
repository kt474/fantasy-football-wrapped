export const seasonType: { [key: number]: string } = {
  0: "Redraft",
  1: "Keeper",
  2: "Dynasty",
  3: "Guillotine",
};

export interface Player {
  player_id: string;
  position: string;
  name: string;
  team: string;
}

export interface LeagueCountResponse {
  league_id_count: number;
}

export interface WeeklyStats {
  rank: number;
  points: number;
  overallRank: number;
  ppg: number;
  firstName: string;
  lastName: string;
  position: string;
  team: string;
  id: string;
  gp: number;
}

export interface SingleWeekProjection {
  stats: number;
  opponent: string;
  away: boolean;
}

interface WeekStat {
  rec?: number;
  rec_yd?: number;
  rush_att?: number;
  rush_yd?: number;
  rush_td?: number;
  pass_td?: number;
  rec_td?: number;
  pass_yd?: number;
  snaps?: number;
  team_snaps?: number;
  fgm?: number;
  fga?: number;
  xpm?: number;
  xpa?: number;
  sack?: number;
  int?: number;
  ff?: number;
  pts_allow?: number;
  yds_allow?: number;
}

export interface SingleWeekStats {
  points: (number | string | undefined)[];
  ranks: (number | string | undefined)[];
  stats: WeekStat[];
}
