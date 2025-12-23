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

export interface SeasonStats {
  status: null;
  date: null;
  stats: { [key: string]: number };
  category: string;
  last_modified: number;
  week: null;
  season: string;
  season_type: string;
  sport: string;
  player: PlayerSeasonStats;
  team: string;
  player_id: string;
  game_id: string;
  updated_at: number;
  week_shard: string;
  company: string;
  opponent: null;
}

export interface PlayerSeasonStats {
  fantasy_positions: string[];
  first_name: string;
  injury_body_part: null;
  injury_notes: null;
  injury_start_date: null;
  injury_status: null;
  last_name: string;
  metadata: PlayerMetadata;
  news_updated: number;
  position: string;
  team: string;
  team_abbr: null;
  team_changed_at: null;
  years_exp: number;
}

export interface PlayerMetadata {
  channel_id: string;
  rookie_year: string;
}

export interface SeasonStatsWeekly {
  status: null;
  date: Date;
  stats: { [key: string]: number };
  category: string;
  last_modified: number;
  week: number;
  season: string;
  season_type: string;
  sport: string;
  team: string;
  player_id: string;
  updated_at: number;
  game_id: string;
  week_shard: string;
  company: string;
  opponent: string;
  is_away_team: boolean;
}

export interface LeagueOriginal {
  name: string;
  regularSeasonLength: number;
  medianScoring: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string;
  previousLeagueId: string;
  lastScoredWeek: number;
  status: string;
  scoringType: number;
  rosterPositions: string[];
  playoffTeams: number;
  playoffType: number;
  draftId: string;
  waiverType: number;
  sport: string;
}

export interface Bracket {
  m: number;
  r: number;
  l: null;
  w: number | null;
  t1: number | null;
  t2: number | null;
  t2_from?: BracketTeam;
  p?: number;
  t1_from?: BracketTeam;
}

export interface BracketTeam {
  w?: number;
  l?: number;
}

export interface WeeklyWaiver {
  status: WaiverStatus;
  type: WaiverType;
  metadata: string | null;
  created: number;
  settings: WaiverSettings | null;
  leg: number;
  draft_picks: any[];
  creator: string;
  transaction_id: string;
  adds: { [key: string]: number } | null;
  consenter_ids: number[];
  drops: { [key: string]: number } | null;
  roster_ids: number[];
  status_updated: number;
  waiver_budget: WaiverBudget[];
}

export interface WaiverSettings {
  seq: number;
  waiver_bid: number;
  priority?: number;
}

export enum WaiverStatus {
  Complete = "complete",
  Failed = "failed",
}

export enum WaiverType {
  FreeAgent = "free_agent",
  Trade = "trade",
  Waiver = "waiver",
}

export interface WaiverBudget {
  amount: number;
  receiver: number;
  sender: number;
}
