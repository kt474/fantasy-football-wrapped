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
import { LeagueInfoType, PremiumReport } from "../types/types";
import { authenticatedFetch } from "@/lib/authFetch";
import { mapWithConcurrency } from "@/lib/async";
import { normalizePremiumReport } from "@/lib/premiumReport";
import {
  fetchWithRetry,
  isRequestCancellation,
  LEAGUE_LOAD_TIMEOUT_MS,
  runWithRequestTimeout,
  type RequestOptions,
} from "@/lib/request";
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
import { assertOk, parseJson } from "@/lib/http";
import {
  getPlayerLookupKey,
  type PlayerNameTeamLookup,
} from "@/lib/playerLookup";

export {
  getPlayerLookupKey,
  type PlayerNameTeamLookup,
} from "@/lib/playerLookup";

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

export interface ManagerComparisonPayload {
  managers: {
    displayName: string;
    seasons: string[];
    championships: number;
    record: {
      wins: number;
      losses: number;
    };
    scoring: {
      totalPoints: number;
      pointsPerGame: number;
      recentScoresBySeason: {
        season: string;
        points: number[];
      }[];
    };
    lineupEfficiency: {
      averageManagerEfficiency: number;
    };
    managementStyle: {
      totalTrades: number | null;
      tradeValueGained: number | null;
      totalWaivers: number | null;
      averageDraftPickRank: number | null;
      playoffAppearances: number | null;
      weeklyScoreStdDev: number | null;
    };
  }[];
  headToHead: Record<string, string>;
}

export interface ManagerComparisonResponse {
  text: string;
}

export type SharedReportResponse = {
  leagueId?: string | null;
  platform?: "sleeper" | "espn" | null;
  leagueName: string;
  season: string;
  week: number;
  report: PremiumReport;
  createdAt: string;
};

export type ShareReportPayload = {
  leagueId: string;
  platform: "sleeper" | "espn";
  leagueName: string;
  season: string;
  week: number;
  report: PremiumReport;
};

const getBackendApiUrl = (path: string) => {
  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
    /\/$/,
    ""
  );
  return `${backendBaseUrl}${path}`;
};

export type TradeDatabaseAsset = {
  type: "player" | "draft_pick" | "faab";
  fromSide: string | null;
  toSide: string | null;
  playerId: string | null;
  pickSeason: number | null;
  pickRound: number | null;
  faabAmount: number | null;
};

export type TradeDatabaseResult = {
  tradeId: number;
  season: string | null;
  week: number;
  league: {
    size: number | null;
    type: string | null;
  };
  sides: Array<{
    side: string;
    received: TradeDatabaseAsset[];
  }>;
};

export type TradeDatabaseResponse = {
  playerId: string;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  trades: TradeDatabaseResult[];
};

export type TradeDatabaseFilters = {
  leagueType?: string;
  leagueSize?: string;
  week?: number;
};

export const getPlayerTradeDatabase = async (
  playerId: string,
  offset = 0,
  limit = 20,
  filters: TradeDatabaseFilters = {}
): Promise<TradeDatabaseResponse> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/trades"), origin);
  endpoint.searchParams.set("playerId", playerId);
  endpoint.searchParams.set("offset", String(offset));
  endpoint.searchParams.set("limit", String(limit));
  if (filters.leagueType) {
    endpoint.searchParams.set("leagueType", filters.leagueType);
  }
  if (filters.leagueSize) {
    endpoint.searchParams.set("leagueSize", filters.leagueSize);
  }
  if (filters.week) {
    endpoint.searchParams.set("week", String(filters.week));
  }

  const response = await fetch(endpoint);
  assertOk(response, "Trade database request");
  return await parseJson<TradeDatabaseResponse>(
    response,
    "Trade database request"
  );
};

export const sharePremiumReport = async (
  payload: ShareReportPayload
): Promise<{ token: string; url: string }> => {
  const response = await authenticatedFetch(
    getBackendApiUrl("/api/shareReport"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  assertOk(response, "Share report request");
  return await parseJson<{ token: string; url: string }>(
    response,
    "Share report"
  );
};

export const getSharedReport = async (
  token: string
): Promise<SharedReportResponse | null> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/getSharedReport"), origin);
  endpoint.searchParams.set("token", token);

  const response = await fetch(endpoint);
  if (response.status === 404) {
    return null;
  }

  assertOk(response, "Shared report request");
  const sharedReport = await parseJson<
    Omit<SharedReportResponse, "report"> & { report: unknown }
  >(response, "Shared report");
  const report = normalizePremiumReport(sharedReport.report);

  return report ? { ...sharedReport, report } : null;
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

interface PlayerIdLookupResponse {
  name: string;
  team?: string;
  player_id: string | null;
}

interface PlayerIdLookupListResponse {
  players: PlayerIdLookupResponse[];
}

export const resolvePlayerIdLookupEndpoint = (
  lookupEndpoint?: string,
  backendBaseUrl?: string
) => {
  if (lookupEndpoint?.trim()) {
    return lookupEndpoint;
  }

  if (backendBaseUrl?.trim()) {
    return new URL("/api/getPlayerId", backendBaseUrl).toString();
  }

  return "";
};

export const getPlayerIdLookupMap = async (
  players: PlayerNameTeamLookup[],
  signal?: AbortSignal
): Promise<Map<string, string>> => {
  if (players.length === 0) {
    return new Map();
  }

  const uniquePlayers = Array.from(
    new Map(
      players.map((player) => [getPlayerLookupKey(player), player])
    ).values()
  );

  try {
    const endpoint = resolvePlayerIdLookupEndpoint(
      import.meta.env.VITE_PLAYER_ID_LOOKUP,
      import.meta.env.VITE_BACKEND_URL
    );
    if (!endpoint) {
      throw new Error("Player ID lookup endpoint is not configured");
    }
    const url = new URL(endpoint);

    uniquePlayers.forEach(({ name, team }) => {
      url.searchParams.append("name", name);
      url.searchParams.append("team", team);
    });

    const response = await fetchWithRetry(url.toString(), { signal });
    assertOk(response, "Player ID lookup request");

    const result = await parseJson<
      PlayerIdLookupResponse | PlayerIdLookupListResponse
    >(response, "Player ID lookup");
    const matches = "players" in result ? result.players : [result];
    const playerLookupMap = new Map<string, string>();

    uniquePlayers.forEach((player, index) => {
      const playerId = matches[index]?.player_id;

      if (playerId) {
        playerLookupMap.set(getPlayerLookupKey(player), playerId);
      }
    });

    return playerLookupMap;
  } catch (error) {
    if (isRequestCancellation(error)) throw error;
    console.error("Error fetching player IDs by name/team:", error);
    return new Map();
  }
};

export const getPlayerIdsByNameTeamMap = async (
  players: PlayerNameTeamLookup[],
  signal?: AbortSignal
): Promise<(string | null)[]> => {
  if (players.length === 0) {
    return [];
  }

  const playerLookupMap = await getPlayerIdLookupMap(players, signal);

  return players.map(
    (player) => playerLookupMap.get(getPlayerLookupKey(player)) ?? null
  );
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
): Promise<{ bulletPoints: string[] }> => {
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

  const result = await parseJson<unknown>(response, "Trends generation");
  if (
    typeof result !== "object" ||
    result === null ||
    !("bulletPoints" in result) ||
    !Array.isArray(result.bulletPoints) ||
    !result.bulletPoints.every((bulletPoint) => typeof bulletPoint === "string")
  ) {
    throw new Error("Trends generation returned an invalid response");
  }

  return { bulletPoints: result.bulletPoints };
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
  currentWeek: number,
  season: string
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
        season: season,
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
): Promise<{ report?: PremiumReport; text?: string }> => {
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
    const payload = await parseJson<{ report?: unknown; text?: string }>(
      response,
      "Premium report"
    );
    if (payload.report == null && payload.text) {
      return { text: payload.text };
    }
    const report = normalizePremiumReport(payload.report);
    if (!report) {
      throw new Error("Premium report response was invalid.");
    }
    return { report };
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

export const generateManagerComparison = async (
  leagueId: string,
  payload: ManagerComparisonPayload
): Promise<ManagerComparisonResponse> => {
  try {
    const response = await authenticatedFetch(
      import.meta.env.VITE_MANAGER_COMPARISON,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leagueId,
          data: payload,
        }),
      }
    );
    if (response.status === 401) {
      throw new Error("Please sign in to generate manager comparison");
    }
    assertOk(response, "Manager comparison request");
    return await parseJson<ManagerComparisonResponse>(
      response,
      "Manager Comparison"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate manager comparison.";
    if (message.includes("Please sign in")) {
      throw new Error("Please sign in to generate manager comparison.");
    }
    throw new Error(
      "Unable to generate manager comparison right now. Please try again later."
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
    console.warn("Unable to record username lookup:", error);
  }
};

export const inputLeague = async (
  leagueId: string,
  name: string,
  size: number,
  type: string,
  year: string,
  platform: string
): Promise<void> => {
  try {
    const response = await fetchWithRetry(import.meta.env.VITE_LEAGUE_URL, {
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
          platform: platform,
        },
      }),
      retries: 0,
      attemptTimeoutMs: 5_000,
    });
    assertOk(response, "League input request");
  } catch (error) {
    console.warn("Unable to record league input:", error);
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

export const getLeagueDataWeekCount = ({
  status,
  currentWeek,
  lastScoredWeek,
}: {
  status: string;
  currentWeek: number;
  lastScoredWeek: number;
}) => {
  if (status === "in_season" || status === "post_season") {
    if (lastScoredWeek <= 0) {
      return 1;
    }
    return Math.max(currentWeek, lastScoredWeek, 0);
  }
  if (status === "complete") {
    return Math.max(lastScoredWeek, 0);
  }
  return Math.max(lastScoredWeek, 1);
};

const getDataWithSignal = async (
  leagueId: string,
  signal: AbortSignal
): Promise<LeagueInfoType> => {
  const [leagueInfo, rosters, winnersBracket, losersBracket] =
    await Promise.all([
      getLeague(leagueId, signal),
      getRosters(leagueId, signal),
      getWinnersBracket(leagueId, signal),
      getLosersBracket(leagueId, signal),
    ]);

  const newLeagueInfo: NewLeagueInfoType = {
    ...leagueInfo,
    rosters,
    winnersBracket,
    losersBracket,
    previousLeagues: [],
    currentWeek: 0,
  };

  let currentWeek: number = 0;
  let legacyWinner: number | null = 0;

  if (
    newLeagueInfo.status === "in_season" ||
    newLeagueInfo.status === "post_season"
  ) {
    const leagueState = await getCurrentLeagueState(signal);
    currentWeek = leagueState.week;
    newLeagueInfo.currentWeek = currentWeek;
  } else {
    winnersBracket?.forEach((matchup) => {
      if (matchup.p === 1) {
        legacyWinner = matchup.w;
      }
    });
  }

  const weekCount = getLeagueDataWeekCount({
    status: newLeagueInfo.status,
    currentWeek,
    lastScoredWeek: newLeagueInfo.lastScoredWeek,
  });
  const weeks = Array.from({ length: weekCount }, (_, index) => index + 1);

  const [weeklyPoints, users, weeklyTransactionResults] = await Promise.all([
    getWeeklyPoints(leagueId, weekCount, 0, signal),
    getUsers(leagueId, signal),
    mapWithConcurrency(weeks, 4, async (week) => {
      const weeklyTransaction = await getTransactions(leagueId, week, signal);
      const waiverMoves = getWaiverMoves(weeklyTransaction);
      return {
        totals: getTotalTransactions(weeklyTransaction),
        trades: waiverMoves["trades"],
        waivers: waiverMoves["waivers"],
      };
    }),
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
    espnWinnersBracket: [],
    espnLosersBracket: [],
  };
};

export const getData = async (
  leagueId: string,
  { signal, timeoutMs = LEAGUE_LOAD_TIMEOUT_MS }: RequestOptions = {}
): Promise<LeagueInfoType> =>
  runWithRequestTimeout(
    (requestSignal) => getDataWithSignal(leagueId, requestSignal),
    { signal, timeoutMs }
  );
