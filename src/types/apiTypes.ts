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
