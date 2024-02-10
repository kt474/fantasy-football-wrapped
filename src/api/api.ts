import { getWeeklyPoints, getTotalTransactions } from "./helper";
import { round } from "lodash";
export const getLeague = async (leagueId: string) => {
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}`
    );
    if (response.status === 404) {
      return {
        name: "",
        regularSeasonLength: 0,
        totalRosters: 0,
        season: "",
        seasonType: "",
        leagueId: "",
        leagueWinner: "",
      };
    }
    const league = await response.json();
    return {
      name: league["name"],
      regularSeasonLength: league["settings"]["playoff_week_start"] - 1,
      totalRosters: league["total_rosters"],
      season: league["season"],
      seasonType: league["season_type"],
      leagueId: league["league_id"],
      leagueWinner: league["metadata"]
        ? league["metadata"]["latest_league_winner_roster_id"]
        : null,
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
      potentialPoints: roster["settings"]["ppts"],
      managerEfficiency: round(
        roster["settings"]["fpts"] / roster["settings"]["ppts"],
        3
      ),
      wins: roster["settings"]["wins"],
      losses: roster["settings"]["losses"],
      rosterId: roster["roster_id"],
      recordByWeek: roster["metadata"]["record"],
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
  const transactions = await response.json();
  return transactions;
};

export const getData = async (leagueId: string) => {
  const newLeagueInfo: any = await getLeague(leagueId);
  newLeagueInfo["rosters"] = await getRosters(leagueId);
  newLeagueInfo["weeklyPoints"] = await getWeeklyPoints(
    leagueId,
    newLeagueInfo["regularSeasonLength"]
  );
  newLeagueInfo["users"] = await getUsers(leagueId);
  for (const val of newLeagueInfo["users"]) {
    if (val["avatar"] !== null) {
      val["avatarImg"] = await getAvatar(val["avatar"]);
    }
  }
  const transactions = [];
  for (let i = 1; i <= newLeagueInfo["regularSeasonLength"]; i++) {
    transactions.push(
      getTotalTransactions(await getTransactions(leagueId, i + 1))
    );
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
  return newLeagueInfo;
};
