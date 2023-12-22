export const getLeague = async () => {
  const response = await fetch(
    "https://api.sleeper.app/v1/league/992195707941212160"
  );
  const league = await response.json();
  return {
    name: league["name"],
    regularSeasonLength: league["settings"]["playoff_week_start"] - 1,
  };
};

export const getRosters = async () => {
  const response = await fetch(
    "https://api.sleeper.app/v1/league/992195707941212160/rosters"
  );
  const rosters = await response.json();
  const result = rosters.map((roster: any) => {
    return {
      id: roster["owner_id"],
      pointsFor: roster["settings"]["fpts"],
      pointsAgainst: roster["settings"]["fpts_against"],
      wins: roster["settings"]["wins"],
      losses: roster["settings"]["losses"],
      rosterId: roster["roster_id"],
    };
  });
  return result;
};

export const getUsers = async () => {
  const response = await fetch(
    "https://api.sleeper.app/v1/league/992195707941212160/users"
  );
  const users = await response.json();
  const result = users.map((user: any) => {
    return {
      id: user["user_id"],
      name: user["metadata"]["team_name"] || user["display_name"],
    };
  });
  return result;
};

export const getMatchup = async (week: number) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/992195707941212160/matchups/${week}`
  );
  const matchup = await response.json();
  const result = matchup.map((matchup: any) => {
    return {
      rosterId: matchup["roster_id"],
      points: matchup["points"],
    };
  });
  return result;
};
