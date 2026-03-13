import {
  getWeeklyPoints,
  getTotalTransactions,
  getWaiverMoves,
} from "./helper";
import {
  LeagueCountResponse,
  NewLeagueInfoType,
  Player,
} from "../types/apiTypes";
import { LeagueInfoType } from "../types/types";
import { authenticatedFetch } from "@/lib/authFetch";
import {
  getAvatar,
  getCurrentLeagueState,
  getLeague,
  getLosersBracket,
  getRosters,
  getTransactions,
  getUsers,
  getWinnersBracket,
} from "./sleeperApi";

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

export interface ManagerBlurbsPayload {
  league: {
    leagueId: string;
    leagueName: string;
    seasonsAnalyzed: number;
    totalManagers: number;
  };
  managers: {
    userId: string;
    name: string;
    seasons: number;
    titles: number;
    record: string;
    winRate: number;
    totalPointsScored: number;
    totalPointsAgainst: number;
    totalTrades: number;
    tradeValueGained: number;
    totalWaivers: number;
    averageEfficiency: number;
    averageDraftPickRank: number | null;
    playoffAppearances: number;
    relative: {
      titlesRank: number;
      winRateRank: number;
      pointsScoredRank: number;
      pointsAgainstRank: number;
      tradesRank: number;
      waiversRank: number;
      efficiencyRank: number;
      tradeValueGainedRank: number;
      draftAbilityRank: number;
    };
  }[];
}

export interface ManagerBlurbsResponse {
  blurbs: {
    userId: string;
    name: string;
    blurb: string;
  }[];
}

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
  metadata: Record<string, unknown>,
  leagueId: string,
  currentWeek: number
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
        leagueId: leagueId,
        currentWeek: currentWeek,
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

export const generateManagerArchetype = async (
  payload: ManagerBlurbsPayload
): Promise<ManagerBlurbsResponse> => {
  try {
    const response = await authenticatedFetch(
      import.meta.env.VITE_MANAGER_PROFILES,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: payload,
        }),
      }
    );
    if (response.status === 401) {
      throw new Error("Please sign in to generate manager profiles");
    }
    assertOk(response, "Manager archetype request");
    return await parseJson<ManagerBlurbsResponse>(
      response,
      "Manager Archetype"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to generate report.";
    if (message.includes("Please sign in")) {
      throw new Error("Please sign in to generate manager profiles.");
    }
    throw new Error(
      "Unable to generate manager profiles right now. Please try again later."
    );
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

export const newUserAlert = async (email: string): Promise<void> => {
  try {
    const response = await fetch(import.meta.env.VITE_ACCOUNT_ALERT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          email: email,
        },
      }),
    });
    assertOk(response, "New user alert");
  } catch (error) {
    console.error("Error:", error);
  }
};

export const getData = async (leagueId: string): Promise<LeagueInfoType> => {
  const [leagueInfo, rosters, winnersBracket, losersBracket] =
    await Promise.all([
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

  const [processedUsers] = await Promise.all([
    Promise.all(
      users.map(async (user) => ({
        ...user,
        avatarImg: user.avatar
          ? ((await getAvatar(user.avatar)) ?? undefined)
          : undefined,
      }))
    ),
  ]);

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
