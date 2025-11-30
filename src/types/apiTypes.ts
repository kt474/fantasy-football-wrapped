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

export interface Draft {
  draft_id: string;
  draft_slot: number;
  is_keeper: null;
  metadata: DraftMetadata;
  pick_no: number;
  picked_by: string;
  player_id: string;
  reactions: null;
  roster_id: number;
  round: number;
}

export interface DraftMetadata {
  first_name: string;
  injury_status: string;
  last_name: string;
  news_updated: string;
  number: string;
  player_id: string;
  position: string;
  sport: string;
  status: string;
  team: string;
  team_abbr: string;
  team_changed_at: string;
  years_exp: string;
}

export interface Roster {
  co_owners: null;
  keepers: null;
  league_id: string;
  metadata: RosterMetadata;
  owner_id: string;
  player_map: null;
  players: string[];
  reserve: string[];
  roster_id: number;
  settings: { [key: string]: number };
  starters: string[];
  taxi: null;
}

export interface RosterMetadata {
  record: string;
  streak: string;
}

export interface User {
  avatar: string;
  display_name: string;
  is_bot: boolean;
  is_owner: boolean;
  league_id: string;
  metadata: Record<string, string>;
  settings: null;
  user_id: string;
}

export interface Matchup {
  points: number;
  players: string[];
  roster_id: number;
  custom_points: null;
  matchup_id: number;
  starters: string[];
  starters_points: number[];
  players_points: { [key: string]: number };
}
