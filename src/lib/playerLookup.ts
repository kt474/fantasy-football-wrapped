export interface PlayerNameTeamLookup {
  name: string;
  team: string;
}

export const getPlayerLookupKey = ({
  name,
  team,
}: PlayerNameTeamLookup): string =>
  `${name.trim().toLowerCase()}::${team.trim().toUpperCase()}`;
