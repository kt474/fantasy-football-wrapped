import {
  getWeeklyPoints,
  getTotalTransactions,
  getTrades,
  calculateDraftRank,
} from "./helper";
import { round, mean } from "lodash";

export const seasonType: { [key: number]: string } = {
  0: "Redraft",
  1: "Keeper",
  2: "Dynasty",
};

export const getPlayerNames = async (playerIds: string[]) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_PLAYERS_URL}${playerIds.join(",")}`
    );
    const result = await response.json();
    return result.players.map((playerObj: any) => {
      if (playerObj) {
        return playerObj.name ? playerObj.name : playerObj.team;
      }
      return "";
    });
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

export const generateSummary = async (prompt: any, metadata: any) => {
  try {
    const response = await fetch(import.meta.env.VITE_LEAGUE_RECAP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          leagueMetadata: metadata,
          teamData: prompt,
        },
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
    };
  }
};

export const generateReport = async (prompt: any, metadata: any) => {
  try {
    const response = await fetch(import.meta.env.VITE_WEEKLY_REPORT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          leagueMetadata: metadata,
          matchups: prompt,
        },
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
    };
  }
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

export const getStats = async (
  player: string,
  year: string,
  scoringType: number
) => {
  let rank = "pos_rank_ppr";
  let ppg = "pts_ppr";
  if (scoringType === 0) {
    rank = "pos_rank_std";
    ppg = "pts_std";
  } else if (scoringType === 0.5) {
    rank = "pos_rank_half_ppr";
    ppg = "pts_half_ppr";
  }
  const response = await fetch(
    `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}`
  );
  const result = await response.json();
  return result
    ? {
        rank: result["stats"][rank],
        points: result["stats"][ppg],
        ppg: result["stats"][ppg] / result["stats"]["gp"],
        firstName: result["player"]["first_name"],
        lastName: result["player"]["last_name"],
        position: result["player"]["position"],
        team: result["player"]["position"],
        id: result["player_id"],
      }
    : null;
};

export const getTradeValue = async (
  player: string,
  year: string,
  weekTraded: number,
  scoringType: number
) => {
  let rank = "pos_rank_ppr";
  if (scoringType === 0) {
    rank = "pos_rank_std";
  } else if (scoringType === 0.5) {
    rank = "pos_rank_half_ppr";
  }
  const response = await fetch(
    `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
  );
  const result = await response.json();
  const weeklyRanks = Object.values(result)
    .slice(weekTraded)
    .map((week: any) => {
      return week && week["stats"] ? week["stats"][rank] : 0;
    })
    .filter((num) => num !== 0 && num !== 999);

  return weeklyRanks.length > 1
    ? parseFloat(mean(weeklyRanks).toFixed(1))
    : null;
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

export const getDraftMetadata = async (draftId: string) => {
  const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}`);
  return await response.json();
};

export const getDraftPicks = async (
  draftId: string,
  season: string,
  scoringType: number,
  seasonType: string
) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/draft/${draftId}/picks`
  );
  const draftPicks = await response.json();

  const picksWithStats = await Promise.all(
    draftPicks.map(async (pick: any) => {
      const playerStats: any = await getStats(
        pick["player_id"],
        season,
        scoringType
      );

      return {
        firstName: pick["metadata"]["first_name"],
        lastName: pick["metadata"]["last_name"],
        playerId: pick["player_id"],
        position: pick["metadata"]["position"],
        pickNumber: pick["pick_no"],
        draftSlot: pick["draft_slot"],
        team: pick["metadata"]["team"],
        round: pick["round"],
        rosterId: pick["roster_id"],
        userId: pick["picked_by"],
        rank: playerStats["rank"],
        pickRank: calculateDraftRank(
          pick["pick_no"],
          seasonType === "Dynasty" && draftPicks.length < 100
            ? playerStats["rank"] / 6
            : playerStats["rank"],
          pick["round"],
          pick["metadata"]["position"],
          playerStats["ppg"]
        ),
      };
    })
  );
  return picksWithStats;
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
        playoffType: 0,
        draftId: "",
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
      playoffType: league["settings"]["playoff_type"],
      draftId: league["draft_id"],
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
      matchupId: game["matchup_id"],
      starters: game["starters"],
      starterPoints: game["starters_points"],
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
  // Initial parallel requests for base league data
  const [leagueInfo, rosters, winnersBracket, losersBracket]: [
    any,
    any[],
    any[],
    any[]
  ] = await Promise.all([
    getLeague(leagueId),
    getRosters(leagueId),
    getWinnersBracket(leagueId),
    getLosersBracket(leagueId),
  ]);

  const newLeagueInfo: any = {
    ...leagueInfo,
    rosters,
    winnersBracket,
    losersBracket,
    previousLeagues: [],
  };

  // Determine the number of weeks to process
  let numberOfWeeks: any;
  let currentWeek: number | undefined;
  let legacyWinner: number | undefined;

  if (newLeagueInfo.status === "in_season") {
    const leagueState = await getCurrentLeagueState();
    currentWeek = leagueState.week;
    numberOfWeeks = currentWeek;
    newLeagueInfo.currentWeek = currentWeek;
  } else {
    numberOfWeeks = newLeagueInfo.regularSeasonLength;
    winnersBracket.forEach((matchup) => {
      if (matchup.p === 1) {
        legacyWinner = matchup.w;
      }
    });
  }

  // Parallel requests for weekly data
  const trades: any = [];
  const [weeklyPoints, users, transactionPromises] = await Promise.all([
    getWeeklyPoints(leagueId, currentWeek ?? newLeagueInfo.lastScoredWeek),
    getUsers(leagueId),
    Promise.all(
      Array.from({ length: numberOfWeeks + 1 }, async (_, i) => {
        const weeklyTransaction = await getTransactions(leagueId, i + 1);
        trades.push(getTrades(weeklyTransaction));
        return getTotalTransactions(weeklyTransaction);
      })
    ),
  ]);

  // Process playoff points in parallel with avatar fetching
  const [processedUsers] = await Promise.all([
    Promise.all(
      users.map(async (user: any) => ({
        ...user,
        avatarImg: user.avatar ? await getAvatar(user.avatar) : null,
      }))
    ),
  ]);

  // Combine all transactions
  const transactions = transactionPromises.reduce((acc, obj) => {
    Object.entries(obj).forEach(([id, value]) => {
      acc[id] = (acc[id] || 0) + (value as number);
    });
    return acc;
  }, {} as Record<string, number>);

  return {
    ...newLeagueInfo,
    weeklyPoints,
    users: processedUsers,
    transactions,
    trades: trades.flat(),
    legacyWinner: legacyWinner,
    lastUpdated: new Date().getTime(),
  };
};
