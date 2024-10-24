import { getWeeklyPoints, getTotalTransactions } from "./helper";
import { round } from "lodash";

export const seasonType: { [key: number]: string } = {
  0: "Redraft",
  1: "Keeper",
  2: "Dynasty",
};

export const inputUsername = async (username: string, year: string) => {
  try {
    await fetch(import.meta.env.VITE_USERNAME_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          username: username,
          year: year,
        },
      }),
    });
  } catch (error) {
    console.error("Error:", error);
  }
};

export const inputLeague = async (
  leagueId: string,
  name: string,
  size: number,
  type: string,
  year: string
) => {
  try {
    await fetch(import.meta.env.VITE_LEAGUE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          league_id: leagueId,
          name: name,
          size: size,
          type: type,
          year: year,
        },
      }),
    });
  } catch (error) {
    console.error("Error:", error);
  }
};

export const getWeeklyProjections = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
) => {
  const response = await fetch(
    `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
  );

  const allWeeks = await response.json();
  let totalProjection = 0;
  let scoring = "pts_ppr";
  if (scoringType === 0) {
    scoring = "pts_std";
  } else if (scoringType === 0.5) {
    scoring = "pts_half_ppr";
  }
  for (const scoredWeek in allWeeks) {
    if (
      allWeeks[scoredWeek] &&
      allWeeks[scoredWeek]["stats"]["pts_std"] &&
      Number(scoredWeek) >= week
    ) {
      totalProjection += allWeeks[scoredWeek]["stats"][scoring];
    }
  }
  return Math.round(totalProjection);
};

export const getProjections = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
) => {
  try {
    const response = await fetch(
      `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}`
    );
    const playerInfo = await response.json();
    const playerProjection = await getWeeklyProjections(
      player,
      year,
      week,
      scoringType
    );

    return {
      projection: playerProjection,
      position: playerInfo["player"]["position"],
    };
  } catch (e) {
    console.error(e);
    return {
      projection: 0,
      position: "",
    };
  }
};
export const getWinnersBracket = async (leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`
  );
  return await response.json();
};

export const getLosersBracket = async (leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/losers_bracket`
  );
  return await response.json();
};

export const getUsername = async (username: string) => {
  const response = await fetch(`https://api.sleeper.app/v1/user/${username}`);
  return await response.json();
};

export const getAllLeagues = async (userId: string, season: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`
  );
  return await response.json();
};

export const getLeague = async (leagueId: string) => {
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}`
    );
    if (response.status === 404) {
      return {
        name: "",
        regularSeasonLength: 0,
        medianScoring: 0,
        totalRosters: 0,
        season: "",
        seasonType: "",
        leagueId: "",
        leagueWinner: "",
        previousLeagueId: "",
        lastScoredWeek: 0,
        status: "",
        scoringType: 1,
        rosterPositions: [],
        playoffTeams: 0,
      };
    }
    const league = await response.json();
    return {
      name: league["name"],
      regularSeasonLength: league["settings"]["playoff_week_start"] - 1,
      lastScoredWeek: league["settings"]["last_scored_leg"],
      medianScoring: league["settings"]["league_average_match"],
      totalRosters: league["total_rosters"],
      season: league["season"],
      seasonType: seasonType[league["settings"]["type"]],
      leagueId: league["league_id"],
      leagueWinner: league["metadata"]
        ? league["metadata"]["latest_league_winner_roster_id"]
        : null,
      previousLeagueId: league["previous_league_id"],
      status: league["status"],
      scoringType: league["scoring_settings"]["rec"],
      rosterPositions: league["roster_positions"],
      playoffTeams: league["settings"]["playoff_teams"],
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
  return rosters.map((roster: any) => {
    return {
      id: roster["owner_id"],
      pointsFor: roster["settings"]["fpts"],
      pointsAgainst: roster["settings"]["fpts_against"],
      potentialPoints: roster["settings"]["ppts"],
      managerEfficiency: roster["settings"]["ppts"]
        ? round(roster["settings"]["fpts"] / roster["settings"]["ppts"], 3)
        : 0,
      wins: roster["settings"]["wins"],
      losses: roster["settings"]["losses"],
      ties: roster["settings"]["ties"],
      rosterId: roster["roster_id"],
      recordByWeek: roster["metadata"] ? roster["metadata"]["record"] : "",
      players: roster["players"],
    };
  });
};

export const getUsers = async (leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/users`
  );
  const users = await response.json();
  return users.map((user: any) => {
    return {
      id: user["user_id"],
      name: user["metadata"]["team_name"] || user["display_name"],
      avatar: user["avatar"],
    };
  });
};

export const getMatchup = async (week: number, leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
  );
  const matchup = await response.json();
  return matchup.map((game: any) => {
    return {
      rosterId: game["roster_id"],
      points: game["points"],
    };
  });
};

export const getAvatar = async (avatarId: string) => {
  try {
    const response = await fetch(
      `https://sleepercdn.com/avatars/thumbs/${avatarId}`
    );
    return response.url;
  } catch (error) {
    return null;
  }
};

export const getTransactions = async (leagueId: string, week: number) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`
  );
  return await response.json();
};

export const getCurrentLeagueState = async () => {
  const response = await fetch("https://api.sleeper.app/v1/state/nfl");
  return await response.json();
};

export const getData = async (leagueId: string) => {
  const newLeagueInfo: any = await getLeague(leagueId);
  newLeagueInfo["rosters"] = await getRosters(leagueId);
  newLeagueInfo["winnersBracket"] = await getWinnersBracket(leagueId);
  newLeagueInfo["losersBracket"] = await getLosersBracket(leagueId);

  const transactions = [];
  if (newLeagueInfo["status"] == "in_season") {
    const currentWeek = await getCurrentLeagueState();
    newLeagueInfo["currentWeek"] = currentWeek.week;
    newLeagueInfo["weeklyPoints"] = await getWeeklyPoints(
      leagueId,
      currentWeek.week
    );

    for (let i = 0; i <= newLeagueInfo["currentWeek"]; i++) {
      transactions.push(
        getTotalTransactions(await getTransactions(leagueId, i + 1))
      );
    }
  } else {
    newLeagueInfo["weeklyPoints"] = await getWeeklyPoints(
      leagueId,
      newLeagueInfo["regularSeasonLength"]
    );

    for (let i = 0; i <= newLeagueInfo["regularSeasonLength"]; i++) {
      transactions.push(
        getTotalTransactions(await getTransactions(leagueId, i + 1))
      );
    }
  }
  newLeagueInfo["playoffPoints"] = await getWeeklyPoints(
    leagueId,
    newLeagueInfo["lastScoredWeek"],
    newLeagueInfo["regularSeasonLength"]
  );
  newLeagueInfo["users"] = await getUsers(leagueId);
  for (const val of newLeagueInfo["users"]) {
    if (val["avatar"] !== null) {
      val["avatarImg"] = await getAvatar(val["avatar"]);
    }
  }
  let sumById: any = {};
  transactions.forEach((obj) => {
    for (const id in obj) {
      if (obj.hasOwnProperty(id)) {
        sumById[id] = (sumById[id] || 0) + obj[id];
      }
    }
  });
  newLeagueInfo["transactions"] = sumById;
  const date = new Date();
  newLeagueInfo["lastUpdated"] = date.getTime();
  newLeagueInfo["previousLeagues"] = [];
  return newLeagueInfo;
};
