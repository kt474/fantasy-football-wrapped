import {
  getWeeklyPoints,
  getTotalTransactions,
  getWaiverMoves,
} from "./helper";
import { LeagueCountResponse, NewLeagueInfoType } from "../types/apiTypes";
import { LeagueInfoType } from "../types/types";
import { mapWithConcurrency } from "@/lib/async";
import {
  fetchWithRetry,
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

export {
  getLatestWeeklyRecapVideo,
  getWeeklyRecapVideo,
  startWeeklyRecapVideo,
} from "./weeklyRecapVideoApi";
export {
  getSharedReport,
  sharePremiumReport,
  type SharedReportResponse,
  type ShareReportPayload,
} from "./sharedReportsApi";
export {
  getPlayerTradeDatabase,
  type TradeDatabaseAsset,
  type TradeDatabaseFilters,
  type TradeDatabaseResponse,
  type TradeDatabaseResult,
} from "./tradeDatabaseApi";
export {
  getPlayerIdLookupMap,
  getPlayerIdsByNameTeamMap,
  getPlayerNews,
  getPlayersByIdsMap,
  resolvePlayerIdLookupEndpoint,
  searchPlayers,
  type PlayerNewsResult,
} from "./playerApi";
export {
  generatePreview,
  generatePremiumReport,
  generateReport,
  generateSummary,
  generateTrends,
} from "./reportGenerationApi";
export {
  generateManagerArchetype,
  generateManagerComparison,
  type ManagerBlurbsPayload,
  type ManagerBlurbsResponse,
  type ManagerComparisonPayload,
  type ManagerComparisonResponse,
} from "./managerNarrativesApi";

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
