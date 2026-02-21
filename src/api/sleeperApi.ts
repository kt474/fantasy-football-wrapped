import { calculateDraftRank } from "./helper";
import mean from "lodash/mean";
import round from "lodash/round";

import {
  seasonType,
  WeeklyStats,
  SingleWeekProjection,
  SingleWeekStats,
  Draft,
  Roster,
  User,
  Matchup,
  SeasonStats,
  SeasonStatsWeekly,
  LeagueOriginal,
  Bracket,
  WeeklyWaiver,
  DraftPick,
} from "../types/apiTypes";

import { RosterType, UserType } from "../types/types";

export const getStats = async (
  player: string,
  year: string,
  scoringType: number
): Promise<WeeklyStats | null> => {
  let rank = "pos_rank_ppr";
  let ppg = "pts_ppr";
  let overall_rank = "rank_ppr";
  if (scoringType === 0) {
    rank = "pos_rank_std";
    ppg = "pts_std";
    overall_rank = "rank_std";
  } else if (scoringType === 0.5) {
    rank = "pos_rank_half_ppr";
    ppg = "pts_half_ppr";
    overall_rank = "rank_half_ppr";
  }
  const response = await fetch(
    `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}`
  );
  const result = await response.json();
  return result
    ? {
        rank: result["stats"][rank],
        points: result["stats"][ppg],
        overallRank: result["stats"][overall_rank],
        ppg: result["stats"][ppg] / result["stats"]["gp"],
        firstName: result["player"]["first_name"],
        lastName: result["player"]["last_name"],
        position: result["player"]["position"],
        team: result["team"],
        id: result["player_id"],
        gp: result["stats"]["gp"],
      }
    : null;
};

export const getTradeValue = async (
  player: string,
  year: string,
  weekTraded: number,
  scoringType: number,
  position?: string
): Promise<number | null> => {
  let rank = "pos_rank_ppr";
  if (scoringType === 0) {
    rank = "pos_rank_std";
  } else if (scoringType === 0.5) {
    rank = "pos_rank_half_ppr";
  }
  if (position === "DEF" || position === "K") {
    const response = await fetch(
      `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}`
    );
    const result: SeasonStats = await response.json();
    return result && result["stats"] ? result["stats"][rank] : 0;
  }
  const response = await fetch(
    `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
  );
  const result: SeasonStatsWeekly = await response.json();
  const weeklyRanks = Object.values(result)
    .slice(weekTraded - 1)
    .map((week) => {
      return week && week["stats"] ? week["stats"][rank] : 0;
    })
    .filter((num) => num !== 0 && num !== 999);

  return weeklyRanks.length >= 1
    ? parseFloat(mean(weeklyRanks).toFixed(1))
    : null;
};

export const getSingleWeekProjection = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
): Promise<SingleWeekProjection> => {
  const response = await fetch(
    `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
  );
  const allWeeks = await response.json();
  let scoring = "pts_ppr";
  if (scoringType === 0) {
    scoring = "pts_std";
  } else if (scoringType === 0.5) {
    scoring = "pts_half_ppr";
  }
  if (allWeeks[week] && allWeeks[week]["stats"][scoring]) {
    return {
      stats: allWeeks[week]["stats"][scoring],
      opponent: allWeeks[week]["opponent"],
      away: allWeeks[week]["is_away_team"],
    };
  }
  return {
    stats: 0,
    opponent: "",
    away: true,
  };
};

export const getDraftMetadata = async (draftId: string) => {
  const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}`);
  return await response.json();
};

export const getDraftPicks = async (
  draftId: string,
  season: string,
  scoringType: number,
  seasonType: string,
  draftType?: string
): Promise<DraftPick[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/draft/${draftId}/picks`
  );
  const draftPicks: Draft[] = await response.json();

  const picksWithStats = await Promise.all(
    draftPicks.map(async (pick) => {
      const playerStats = await getStats(
        pick["player_id"],
        season,
        scoringType
      );
      return {
        keeper: pick["is_keeper"],
        firstName: pick["metadata"]["first_name"],
        lastName: pick["metadata"]["last_name"],
        amount: pick["metadata"]["amount"] ?? 0,
        playerId: pick["player_id"],
        position: pick["metadata"]["position"],
        pickNumber: pick["pick_no"],
        draftSlot: pick["draft_slot"],
        team: pick["metadata"]["team"],
        round: pick["round"],
        rosterId: pick["roster_id"],
        userId: pick["picked_by"],
        rank: playerStats ? playerStats["rank"] : 0,
        pickRank: playerStats
          ? calculateDraftRank(
              draftType !== "auction"
                ? pick["pick_no"]
                : (pick["metadata"]["amount"] ?? 0),
              seasonType === "Dynasty" && draftPicks.length < 100
                ? playerStats["rank"] / 6
                : playerStats["rank"],
              draftType !== "auction" ? pick["round"] : 1,
              pick["metadata"]["position"],
              playerStats["ppg"]
            )
          : "0.0",
      };
    })
  );
  return picksWithStats;
};

export const getLeague = async (leagueId: string): Promise<LeagueOriginal> => {
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
        waiverType: 0,
        sport: "",
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
      waiverType: league["settings"]["waiver_type"],
      sport: league["sport"],
    };
  } catch (error) {
    throw error;
  }
};

export const getRosters = async (leagueId: string): Promise<RosterType[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
  );
  const rosters: Roster[] = await response.json();
  return rosters.map((roster) => {
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

export const getUsers = async (leagueId: string): Promise<UserType[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/users`
  );
  const users: User[] = await response.json();
  return users.map((user) => {
    return {
      id: user["user_id"],
      name: user["metadata"]["team_name"] || user["display_name"],
      username: user["display_name"],
      avatar: user["avatar"],
    };
  });
};

export const getMatchup = async (week: number, leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
  );
  const matchup: Matchup[] = await response.json();
  return matchup.map((game) => {
    const benchPlayers = game["players"]?.filter(
      (value: string) => !game["starters"]?.includes(value)
    );
    const benchPoints = benchPlayers?.map(
      (player: string) => game["players_points"][player]
    );
    return {
      rosterId: game["roster_id"],
      points: game["points"],
      matchupId: game["matchup_id"],
      starters: game["starters"],
      starterPoints: game["starters_points"],
      benchPlayers: benchPlayers,
      benchPoints: benchPoints,
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

export const getTransactions = async (
  leagueId: string,
  week: number
): Promise<WeeklyWaiver[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`
  );
  return await response.json();
};

export const getCurrentLeagueState = async () => {
  const response = await fetch("https://api.sleeper.app/v1/state/nfl");
  return await response.json();
};

export const getSingleWeekStats = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
): Promise<SingleWeekStats> => {
  const response = await fetch(
    `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
  );
  const allWeeks = await response.json();
  let scoringKey = "pts_ppr";
  let rankKey = "pos_rank_ppr";
  if (scoringType === 0) {
    scoringKey = "pts_std";
    rankKey = "pos_rank_std";
  } else if (scoringType === 0.5) {
    scoringKey = "pts_half_ppr";
    rankKey = "pos_rank_half_ppr";
  }

  const points: (number | string | undefined)[] = [];
  const ranks: (number | string | undefined)[] = [];
  const stats = [];

  for (let i = 0; i < 7; i++) {
    const currentWeek = week - i;
    if (allWeeks[currentWeek] && allWeeks[currentWeek]["stats"]) {
      points.push(allWeeks[currentWeek]["stats"][scoringKey]);
      ranks.push(allWeeks[currentWeek]["stats"][rankKey]);
      stats.push({
        rec: allWeeks[currentWeek]["stats"]["rec"],
        rec_yd: allWeeks[currentWeek]["stats"]["rec_yd"],
        rush_att: allWeeks[currentWeek]["stats"]["rush_att"],
        rush_yd: allWeeks[currentWeek]["stats"]["rush_yd"],
        rush_td: allWeeks[currentWeek]["stats"]["rush_td"],
        pass_td: allWeeks[currentWeek]["stats"]["pass_td"],
        rec_td: allWeeks[currentWeek]["stats"]["rec_td"],
        pass_yd: allWeeks[currentWeek]["stats"]["pass_yd"],
        snaps: allWeeks[currentWeek]["stats"]["off_snp"],
        team_snaps: allWeeks[currentWeek]["stats"]["tm_off_snp"],
        fgm: allWeeks[currentWeek]["stats"]["fgm"],
        fga: allWeeks[currentWeek]["stats"]["fga"],
        xpm: allWeeks[currentWeek]["stats"]["xpm"],
        xpa: allWeeks[currentWeek]["stats"]["xpa"],
        sack: allWeeks[currentWeek]["stats"]["sack"],
        int: allWeeks[currentWeek]["stats"]["int"],
        ff: allWeeks[currentWeek]["stats"]["ff"],
        pts_allow: allWeeks[currentWeek]["stats"]["pts_allow"],
        yds_allow: allWeeks[currentWeek]["stats"]["yds_allow"],
      });
    } else {
      points.push("DNP");
      ranks.push("DNP");
      stats.push({});
    }
  }

  return {
    points,
    ranks,
    stats,
  };
};

export const getWeeklyProjections = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
): Promise<number> => {
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

export const getDraftProjections = async (
  player: string,
  year: string,
  scoringType: number,
  leagueType: string,
  superFlex: boolean = false,
  idp: boolean = false
) => {
  try {
    let adpName;
    let ptsName = "pts_ppr";
    if (scoringType === 0.5) {
      ptsName = "pts_half_ppr";
    } else if (scoringType === 0) {
      ptsName = "pts_std";
    }
    const baseMap: Record<number, string> = {
      0: "adp_std",
      0.5: "adp_half_ppr",
      1: "adp_ppr",
    };

    const dynastyMap: Record<number, string> = {
      0: "adp_dynasty_std",
      0.5: "adp_dynasty_half_ppr",
      1: "adp_dynasty_ppr",
    };
    if (idp) {
      adpName = "adp_idp";
    } else {
      if (leagueType === "Dynasty") {
        if (superFlex) {
          adpName = "adp_dynasty_2qb";
        } else adpName = dynastyMap[scoringType] || "adp_dynasty_ppr";
      } else {
        if (superFlex) {
          adpName = "adp_2qb";
        } else adpName = baseMap[scoringType] || "adp_ppr";
      }
    }
    const response = await fetch(
      `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}`
    );
    const playerInfo = await response.json();
    return {
      adp: playerInfo["stats"][adpName],
      projectedPoints: playerInfo["stats"][ptsName],
    };
  } catch (e) {
    console.error(e);
    return {
      adp: null,
      projectedPoints: null,
    };
  }
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
export const getWinnersBracket = async (
  leagueId: string
): Promise<Bracket[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`
  );
  return await response.json();
};

export const getLosersBracket = async (
  leagueId: string
): Promise<Bracket[]> => {
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
