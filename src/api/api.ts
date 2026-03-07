import {
  getWeeklyPoints,
  getTotalTransactions,
  calculateDraftRank,
  getWaiverMoves,
} from "./helper";
import mean from "lodash/mean";
import round from "lodash/round";
import {
  seasonType,
  Player,
  LeagueCountResponse,
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
  NewLeagueInfoType,
  DraftPick,
} from "../types/apiTypes";
import { LeagueInfoType, RosterType, UserType } from "../types/types";
import { authenticatedFetch } from "@/lib/authFetch";

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

export const getPlayerNews = async (
  playerNames: string[]
): Promise<Record<string, unknown>[]> => {
  let url = import.meta.env.VITE_PLAYER_NEWS;

  if (playerNames && playerNames.length > 0) {
    url += `?keywords=${playerNames.join(",")}`;
  }
  try {
    const response = await fetch(url);
    assertOk(response, "Player news request");
    return await parseJson<Record<string, unknown>[]>(response, "Player news");
  } catch (error) {
    console.error("Error fetching player news:", error);
    return [];
  }
};

export const getPlayersByIdsMap = async (
  playerIds: string[] | string[][]
): Promise<Map<string, Player>> => {
  if (playerIds.length === 0) {
    return new Map();
  }
  try {
    const url = `${import.meta.env.VITE_PLAYERS_URL}${playerIds.join(",")}`;
    const response = await fetch(url);
    assertOk(response, "Players by IDs request");
    const result = await parseJson<Record<string, unknown>>(
      response,
      "Players by IDs"
    );
    const playersMap = new Map<string, Player>();
    const players = result["players"];
    if (players && Array.isArray(players)) {
      players.forEach((playerObj: Player) => {
        if (playerObj && playerObj.player_id) {
          playersMap.set(playerObj.player_id, playerObj);
        }
      });
    }
    return playersMap;
  } catch (error) {
    console.error("Error fetching players by IDs:", error);
    return new Map();
  }
};

export const getLeagueCount = async (): Promise<LeagueCountResponse> => {
  try {
    const response = await fetch(import.meta.env.VITE_LEAGUE_COUNT);
    assertOk(response, "League count request");
    return await parseJson<LeagueCountResponse>(response, "League count");
  } catch (error) {
    console.error(error);
    return { league_id_count: 0 };
  }
};

export const generateTrends = async (
  data: Record<string, unknown>[],
  wordLimit: number,
  bulletCount: number,
  leagueState: string = "in_season"
): Promise<Record<string, []>> => {
  try {
    const response = await fetch(import.meta.env.VITE_TRENDS_RECAP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        wordLimit,
        bulletCount,
        leagueState,
      }),
    });
    assertOk(response, "Trends generation request");
    return await parseJson<Record<string, []>>(response, "Trends generation");
  } catch (error) {
    console.error("Error generating trends:", error);
    return {} as Record<string, []>;
  }
};

export const generateSummary = async (
  prompt: Record<string, unknown>[],
  metadata: Record<string, unknown>
): Promise<Record<string, string>> => {
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
    assertOk(response, "League summary request");
    return await parseJson<Record<string, string>>(response, "League summary");
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
    };
  }
};

export const generateReport = async (
  prompt: Record<string, unknown>[],
  metadata: Record<string, unknown>
): Promise<Record<string, string>> => {
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
    assertOk(response, "Weekly report request");
    return await parseJson<Record<string, string>>(response, "Weekly report");
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
    };
  }
};

export const generatePremiumReport = async (
  prompt: Record<string, unknown>[],
  metadata: Record<string, unknown>,
  style: string
): Promise<Record<string, string>> => {
  try {
    const response = await authenticatedFetch(
      import.meta.env.VITE_PREMIUM_WEEKLY_REPORT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            leagueMetadata: metadata,
            matchups: prompt,
          },
          commentaryStyle: style,
        }),
      }
    );
    if (response.status === 401) {
      throw new Error("Please sign in to use premium reports.");
    }
    assertOk(response, "Premium report request");
    return await parseJson<Record<string, string>>(response, "Premium report");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to generate report.";
    if (message.includes("Please sign in")) {
      return {
        text: "Please sign in to use premium reports.",
      };
    }
    return {
      text: "Unable to generate premium report right now. Please try again later.",
    };
  }
};

export const generatePreview = async (
  prompt: Record<string, unknown>
): Promise<Record<string, string>> => {
  try {
    const response = await fetch(import.meta.env.VITE_WEEKLY_PREVIEW, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: prompt,
      }),
    });
    assertOk(response, "Weekly preview request");
    return await parseJson<Record<string, string>>(response, "Weekly preview");
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate preview. Please try again later.",
    };
  }
};

export const inputUsername = async (
  username: string,
  year: string
): Promise<void> => {
  try {
    const response = await fetch(import.meta.env.VITE_USERNAME_URL, {
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
    assertOk(response, "Username input request");
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
): Promise<void> => {
  try {
    const response = await fetch(import.meta.env.VITE_LEAGUE_URL, {
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
    assertOk(response, "League input request");
  } catch (error) {
    console.error("Error:", error);
  }
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
    const result = await parseJson<Record<string, any>>(
      response,
      "Player stats"
    );
    const stats = result["stats"];
    const playerInfo = result["player"];
    if (!stats || !playerInfo) {
      return null;
    }
    return {
      rank: stats[rank],
      points: stats[ppg],
      overallRank: stats[overall_rank],
      ppg: stats["gp"] ? stats[ppg] / stats["gp"] : 0,
      firstName: playerInfo["first_name"],
      lastName: playerInfo["last_name"],
      position: playerInfo["position"],
      team: result["team"],
      id: result["player_id"],
      gp: stats["gp"],
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
    const allWeeks = await parseJson<Record<string, any>>(
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
        stats: allWeeks[week]["stats"][scoring],
        opponent: allWeeks[week]["opponent"],
        away: allWeeks[week]["is_away_team"],
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
  let allWeeks: Record<string, any> = {};
  try {
    const response = await fetch(
      `https://api.sleeper.com/stats/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
    );
    assertOk(response, "Single week stats request");
    allWeeks = await parseJson<Record<string, any>>(
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
  let allWeeks: Record<string, any> = {};
  try {
    const response = await fetch(
      `https://api.sleeper.com/projections/nfl/player/${player}?season_type=regular&season=${year}&grouping=week`
    );
    assertOk(response, "Weekly projections request");
    allWeeks = await parseJson<Record<string, any>>(
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
    if (
      allWeeks[scoredWeek] &&
      allWeeks[scoredWeek]["stats"][scoring] &&
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
    assertOk(response, "Draft projections request");
    const playerInfo = await parseJson<Record<string, any>>(
      response,
      "Draft projections"
    );
    return {
      adp: playerInfo["stats"]?.[adpName],
      projectedPoints: playerInfo["stats"]?.[ptsName],
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
    const playerInfo = await parseJson<Record<string, any>>(
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
      position: playerInfo["player"]?.["position"] ?? "",
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

export const getUsername = async (username: string) => {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/user/${username}`);
    if (response.status === 404) {
      return null;
    }
    assertOk(response, "Username lookup request");
    return await parseJson<Record<string, any>>(response, "Username lookup");
  } catch (error) {
    console.error("Error fetching username:", error);
    return null;
  }
};

export const getAllLeagues = async (userId: string, season: string) => {
  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`
    );
    assertOk(response, "User leagues request");
    return await parseJson<Record<string, any>[]>(response, "User leagues");
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    return [];
  }
};

export const getDraftMetadata = async (draftId: string) => {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}`);
    assertOk(response, "Draft metadata request");
    return await parseJson<Record<string, any>>(response, "Draft metadata");
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
  const league = await parseJson<Record<string, any>>(response, "League");
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
};

export const getRosters = async (leagueId: string): Promise<RosterType[]> => {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
  );
  assertOk(response, "Rosters request");
  const rosters: Roster[] = await parseJson<Roster[]>(response, "Rosters");
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
  assertOk(response, "Users request");
  const users: User[] = await parseJson<User[]>(response, "Users");
  return users.map((user) => {
    return {
      id: user["user_id"],
      name: user["metadata"]?.["team_name"] || user["display_name"],
      username: user["display_name"],
      avatar: user["avatar"],
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
  return await parseJson<Record<string, any>>(response, "Current league state");
};

export const getData = async (leagueId: string): Promise<LeagueInfoType> => {
  // Initial parallel requests for base league data
  const [leagueInfo, rosters, winnersBracket, losersBracket]: [
    LeagueOriginal,
    RosterType[],
    Bracket[],
    Bracket[],
  ] = await Promise.all([
    getLeague(leagueId),
    getRosters(leagueId),
    getWinnersBracket(leagueId),
    getLosersBracket(leagueId),
  ]);

  const newLeagueInfo: NewLeagueInfoType = {
    ...leagueInfo,
    rosters,
    winnersBracket,
    losersBracket,
    previousLeagues: [],
    currentWeek: 0,
  };

  // Determine the number of weeks to process
  let numberOfWeeks: number = 0;
  let currentWeek: number = 0;
  let legacyWinner: number | null = 0;

  if (
    newLeagueInfo.status === "in_season" ||
    newLeagueInfo.status === "post_season"
  ) {
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
  const [weeklyPoints, users, weeklyTransactionResults] = await Promise.all([
    getWeeklyPoints(
      leagueId,
      currentWeek !== 0 ? currentWeek : newLeagueInfo.lastScoredWeek
    ),
    getUsers(leagueId),
    Promise.all(
      Array.from({ length: numberOfWeeks + 1 }, async (_, i) => {
        const weeklyTransaction = await getTransactions(leagueId, i + 1);
        const waiverMoves = getWaiverMoves(weeklyTransaction);
        return {
          totals: getTotalTransactions(weeklyTransaction),
          trades: waiverMoves["trades"],
          waivers: waiverMoves["waivers"],
        };
      })
    ),
  ]);

  // Process playoff points in parallel with avatar fetching
  const [processedUsers] = await Promise.all([
    Promise.all(
      users.map(async (user) => ({
        ...user,
        avatarImg: user.avatar ? await getAvatar(user.avatar) : null,
      }))
    ),
  ]);

  // Combine all transactions
  const transactions = weeklyTransactionResults.reduce(
    (acc, obj) => {
      Object.entries(obj.totals).forEach(([id, value]) => {
        acc[id] = (acc[id] || 0) + (value as number);
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const trades = weeklyTransactionResults.flatMap((result) => result.trades);
  const waivers = weeklyTransactionResults.flatMap((result) => result.waivers);

  return {
    ...newLeagueInfo,
    weeklyPoints,
    users: processedUsers,
    transactions,
    trades,
    waivers,
    legacyWinner: legacyWinner,
    lastUpdated: new Date().getTime(),
  };
};
