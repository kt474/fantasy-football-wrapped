import mean from "lodash/mean";
import round from "lodash/round";
import { calculateDraftRank } from "./helper";
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
  Player,
} from "../types/apiTypes";
import { RosterType, UserType, UserLeagueListItem } from "../types/types";

const assertOk = (response: Response, context: string) => {
  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}`);
  }
};

const parseJson = async <T>(
  response: Response,
  context: string
): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON`);
  }
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const limit = Math.max(1, concurrency);
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
};

type SleeperPlayerStatsResponse = {
  stats?: Record<string, number>;
  player?: {
    first_name?: string;
    last_name?: string;
    position?: string;
  };
  team?: string;
  player_id?: string;
};

type SleeperWeekStatsMap = Record<string, { stats?: Record<string, number> }>;

type SleeperWeekProjectionMap = Record<
  string,
  {
    stats?: Record<string, number>;
    opponent?: string;
    is_away_team?: boolean;
  }
>;

type SleeperLeagueResponse = {
  name?: string;
  settings?: Record<string, number>;
  total_rosters?: number;
  season?: string;
  league_id?: string;
  metadata?: Record<string, string | number | null> | null;
  previous_league_id?: string | null;
  status?: string;
  scoring_settings?: Record<string, number>;
  roster_positions?: string[];
  draft_id?: string;
  sport?: string;
};

export type SleeperUserLookupResponse = {
  user_id?: string;
  display_name?: string;
};

export const getStats = async (
  player: string,
  year: string,
  scoringType: number
): Promise<WeeklyStats | null> => {
  try {
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
    assertOk(response, "Player stats request");
    const result = await parseJson<SleeperPlayerStatsResponse>(
      response,
      "Player stats"
    );
    const stats = result?.stats ?? null;
    const playerInfo = result?.player ?? null;
    if (!stats || !playerInfo) {
      return null;
    }
    return {
      rank: stats[rank] ?? 0,
      points: stats[ppg] ?? 0,
      overallRank: stats[overall_rank] ?? 0,
      ppg: stats["gp"] ? (stats[ppg] ?? 0) / stats["gp"] : 0,
      firstName: playerInfo.first_name ?? "",
      lastName: playerInfo.last_name ?? "",
      position: playerInfo.position ?? "",
      team: result.team ?? "",
      id: result.player_id ?? player,
      gp: stats["gp"] ?? 0,
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return null;
  }
};

export const getTradeValue = async (
  player: string,
  year: string,
  weekTraded: number,
  scoringType: number,
  position?: string
): Promise<number | null> => {
  try {
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
      assertOk(response, "Trade value stats request");
      const result: SeasonStats = await parseJson<SeasonStats>(
        response,
        "Trade value stats"
      );
      return result && result["stats"] ? result["stats"][rank] : 0;
    }
    const response = await fetch(
      `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
    );
    assertOk(response, "Trade value weekly stats request");
    const result: SeasonStatsWeekly = await parseJson<SeasonStatsWeekly>(
      response,
      "Trade value weekly stats"
    );
    const weeklyRanks = Object.values(result)
      .slice(weekTraded - 1)
      .map((week) => {
        return week && week["stats"] ? week["stats"][rank] : 0;
      })
      .filter((num) => num !== 0 && num !== 999);

    return weeklyRanks.length >= 1
      ? parseFloat(mean(weeklyRanks).toFixed(1))
      : null;
  } catch (error) {
    console.error("Error calculating trade value:", error);
    return null;
  }
};

export const getSingleWeekProjection = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
): Promise<SingleWeekProjection> => {
  try {
    const response = await fetch(
      `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
    );
    assertOk(response, "Single week projection request");
    const allWeeks = await parseJson<SleeperWeekProjectionMap>(
      response,
      "Single week projection"
    );
    let scoring = "pts_ppr";
    if (scoringType === 0) {
      scoring = "pts_std";
    } else if (scoringType === 0.5) {
      scoring = "pts_half_ppr";
    }
    if (allWeeks[week] && allWeeks[week]["stats"]?.[scoring]) {
      return {
        stats: allWeeks[week]["stats"]?.[scoring] ?? 0,
        opponent: allWeeks[week]["opponent"] ?? "",
        away: allWeeks[week]["is_away_team"] ?? true,
      };
    }
  } catch (error) {
    console.error("Error fetching single week projection:", error);
  }
  return {
    stats: 0,
    opponent: "",
    away: true,
  };
};

export const getSingleWeekStats = async (
  player: string,
  year: string,
  week: number,
  scoringType: number
): Promise<SingleWeekStats> => {
  let allWeeks: SleeperWeekStatsMap = {};
  try {
    const response = await fetch(
      `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
    );
    assertOk(response, "Single week stats request");
    allWeeks = await parseJson<SleeperWeekStatsMap>(
      response,
      "Single week stats"
    );
  } catch (error) {
    console.error("Error fetching single week stats:", error);
  }
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
  let allWeeks: SleeperWeekProjectionMap = {};
  try {
    const response = await fetch(
      `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
    );
    assertOk(response, "Weekly projections request");
    allWeeks = await parseJson<SleeperWeekProjectionMap>(
      response,
      "Weekly projections"
    );
  } catch (error) {
    console.error("Error fetching weekly projections:", error);
    return 0;
  }
  let totalProjection = 0;
  let scoring = "pts_ppr";
  if (scoringType === 0) {
    scoring = "pts_std";
  } else if (scoringType === 0.5) {
    scoring = "pts_half_ppr";
  }
  for (const scoredWeek in allWeeks) {
    const weekStats = allWeeks[scoredWeek]?.stats;
    if (
      weekStats &&
      weekStats[scoring] !== undefined &&
      Number(scoredWeek) >= week
    ) {
      totalProjection += weekStats[scoring] ?? 0;
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
    assertOk(response, "Draft projections request");
    const playerInfo = await parseJson<SleeperPlayerStatsResponse>(
      response,
      "Draft projections"
    );
    return {
      adp: playerInfo.stats?.[adpName],
      projectedPoints: playerInfo.stats?.[ptsName],
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
    assertOk(response, "Player projection request");
    const playerInfo = await parseJson<SleeperPlayerStatsResponse>(
      response,
      "Player projection"
    );
    const playerProjection = await getWeeklyProjections(
      player,
      year,
      week,
      scoringType
    );

    return {
      projection: playerProjection,
      position: playerInfo.player?.position ?? "",
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
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`
    );
    assertOk(response, "Winners bracket request");
    return await parseJson<Bracket[]>(response, "Winners bracket");
  } catch (error) {
    console.error("Error fetching winners bracket:", error);
    return [];
  }
};

export const getLosersBracket = async (
  leagueId: string
): Promise<Bracket[]> => {
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}/losers_bracket`
    );
    assertOk(response, "Losers bracket request");
    return await parseJson<Bracket[]>(response, "Losers bracket");
  } catch (error) {
    console.error("Error fetching losers bracket:", error);
    return [];
  }
};

export const getUsername = async (
  username: string
): Promise<SleeperUserLookupResponse | null> => {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/user/${username}`);
    if (response.status === 404) {
      return null;
    }
    assertOk(response, "Username lookup request");
    return await parseJson<SleeperUserLookupResponse>(
      response,
      "Username lookup"
    );
  } catch (error) {
    console.error("Error fetching username:", error);
    return null;
  }
};

export const getAllLeagues = async (
  userId: string,
  season: string
): Promise<UserLeagueListItem[]> => {
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`
    );
    assertOk(response, "User leagues request");
    return await parseJson<UserLeagueListItem[]>(response, "User leagues");
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    return [];
  }
};

export const getDraftMetadata = async (draftId: string) => {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}`);
    assertOk(response, "Draft metadata request");
    return await parseJson<Record<string, unknown>>(response, "Draft metadata");
  } catch (error) {
    console.error("Error fetching draft metadata:", error);
    return {};
  }
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
  assertOk(response, "Draft picks request");
  const draftPicks: Draft[] = await parseJson<Draft[]>(response, "Draft picks");
  const playerStatsCache = new Map<string, Promise<WeeklyStats | null>>();

  const picksWithStats = await mapWithConcurrency(
    draftPicks,
    10,
    async (pick) => {
      const metadata = pick["metadata"] ?? {};
      const playerId = pick["player_id"];
      const playerStatsPromise =
        playerStatsCache.get(playerId) ??
        getStats(playerId, season, scoringType).catch((error) => {
          console.error("Error fetching draft player stats:", error);
          return null;
        });
      playerStatsCache.set(playerId, playerStatsPromise);
      const playerStats = await playerStatsPromise;

      return {
        keeper: pick["is_keeper"],
        firstName: metadata["first_name"] ?? "",
        lastName: metadata["last_name"] ?? "",
        amount: metadata["amount"] ?? 0,
        playerId,
        position: metadata["position"] ?? "",
        pickNumber: pick["pick_no"],
        draftSlot: pick["draft_slot"],
        team: metadata["team"] ?? "",
        round: pick["round"],
        rosterId: pick["roster_id"],
        userId: pick["picked_by"],
        rank: playerStats ? playerStats["rank"] : 0,
        pickRank: playerStats
          ? calculateDraftRank(
              draftType !== "auction"
                ? pick["pick_no"]
                : (metadata["amount"] ?? 0),
              seasonType === "Dynasty" && draftPicks.length < 100
                ? playerStats["rank"] / 6
                : playerStats["rank"],
              draftType !== "auction" ? pick["round"] : 1,
              metadata["position"] ?? "",
              playerStats["ppg"]
            )
          : "0.0",
      };
    }
  );
  return picksWithStats;
};

export const getLeague = async (leagueId: string): Promise<LeagueOriginal> => {
  const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
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
  assertOk(response, "League request");
  const league = await parseJson<SleeperLeagueResponse>(response, "League");
  const settings = league["settings"] ?? {};
  const scoringSettings = league["scoring_settings"] ?? {};
  const leagueType = settings["type"];

  return {
    name: league["name"] ?? "",
    regularSeasonLength: Math.max(0, (settings["playoff_week_start"] ?? 1) - 1),
    lastScoredWeek: settings["last_scored_leg"] ?? 0,
    medianScoring: settings["league_average_match"] ?? 0,
    totalRosters: league["total_rosters"] ?? 0,
    season: league["season"] ?? "",
    seasonType: seasonType[leagueType] ?? "",
    leagueId: league["league_id"] ?? "",
    leagueWinner:
      league.metadata?.latest_league_winner_roster_id != null
        ? String(league.metadata.latest_league_winner_roster_id)
        : null,
    previousLeagueId: league["previous_league_id"] ?? "",
    status: league["status"] ?? "",
    scoringType: scoringSettings["rec"] ?? 1,
    rosterPositions: Array.isArray(league["roster_positions"])
      ? league["roster_positions"]
      : [],
    playoffTeams: settings["playoff_teams"] ?? 0,
    playoffType: settings["playoff_type"] ?? 0,
    draftId: league["draft_id"] ?? "",
    waiverType: settings["waiver_type"] ?? 0,
    sport: league["sport"] ?? "",
  };
};

export const getRosters = async (leagueId: string): Promise<RosterType[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
  );
  assertOk(response, "Rosters request");
  const rosters: Roster[] = await parseJson<Roster[]>(response, "Rosters");
  return rosters.map((roster) => {
    const settings = roster["settings"] ?? {};
    return {
      id: roster["owner_id"],
      pointsFor: settings["fpts"] ?? 0,
      pointsAgainst: settings["fpts_against"] ?? 0,
      potentialPoints: settings["ppts"] ?? 0,
      managerEfficiency: settings["ppts"]
        ? round((settings["fpts"] ?? 0) / settings["ppts"], 3)
        : 0,
      wins: settings["wins"] ?? 0,
      losses: settings["losses"] ?? 0,
      ties: settings["ties"] ?? 0,
      rosterId: roster["roster_id"],
      recordByWeek: roster["metadata"] ? roster["metadata"]["record"] : "",
      players: Array.isArray(roster["players"]) ? roster["players"] : [],
    };
  });
};

export const getUsers = async (leagueId: string): Promise<UserType[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/users`
  );
  assertOk(response, "Users request");
  const users: User[] = await parseJson<User[]>(response, "Users");
  return users.map((user) => {
    return {
      id: user["user_id"],
      name: user["metadata"]?.["team_name"] || user["display_name"],
      username: user["display_name"],
      avatar: user["avatar"] ?? "",
    };
  });
};

export const getMatchup = async (week: number, leagueId: string) => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
  );
  assertOk(response, "Matchup request");
  const matchup: Matchup[] = await parseJson<Matchup[]>(response, "Matchup");
  return matchup.map((game) => {
    const players = Array.isArray(game["players"]) ? game["players"] : [];
    const starters = Array.isArray(game["starters"]) ? game["starters"] : [];
    const playersPoints = game["players_points"] ?? {};
    const benchPlayers = players.filter(
      (value: string) => !starters.includes(value)
    );
    const benchPoints = benchPlayers?.map(
      (player: string) => playersPoints[player] ?? 0
    );
    return {
      rosterId: game["roster_id"],
      points: game["points"],
      matchupId: game["matchup_id"],
      starters,
      starterPoints: Array.isArray(game["starters_points"])
        ? game["starters_points"]
        : [],
      benchPlayers: benchPlayers,
      benchPoints: benchPoints,
    };
  });
};

export const getAvatar = async (avatarId: string) => {
  if (!avatarId) {
    return null;
  }
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
};

export const getTransactions = async (
  leagueId: string,
  week: number
): Promise<WeeklyWaiver[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`
  );
  assertOk(response, "Transactions request");
  return await parseJson<WeeklyWaiver[]>(response, "Transactions");
};

export const getCurrentLeagueState = async () => {
  const response = await fetch("https://api.sleeper.app/v1/state/nfl");
  assertOk(response, "Current league state request");
  const state = await parseJson<{ week?: number }>(
    response,
    "Current league state"
  );
  return {
    ...state,
    week: state.week ?? 0,
  };
};

export type { Player };
