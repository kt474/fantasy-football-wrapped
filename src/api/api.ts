export const getLeague = async (leagueId: string) => {
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}`
    );
    if (response.status === 404) {
      return { name: "", regularSeasonLength: 0 };
    }
    const league = await response.json();
    return {
      name: league["name"],
      regularSeasonLength: league["settings"]["playoff_week_start"] - 1,
      rosters: league["total_rosters"],
      season: league["season"],
      seasonType: league["season_type"],
    };
  } catch (error) {
    return error;
  }
};

export const getRosters = async (leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
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

export const getUsers = async (leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/users`
  );
  const users = await response.json();
  const result = users.map((user: any) => {
    return {
      id: user["user_id"],
      name: user["metadata"]["team_name"] || user["display_name"],
      avatar: user["avatar"],
    };
  });
  return result;
};

export const getMatchup = async (week: number, leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
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

export const getAvatar = async (avatarId: string) => {
  const response = await fetch(`https://sleepercdn.com/avatars/${avatarId}`);
  const avatar = await response.blob();
  return URL.createObjectURL(avatar);
};
