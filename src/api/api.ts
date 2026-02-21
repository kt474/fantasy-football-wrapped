import {
  getWeeklyPoints,
  getTotalTransactions,
  getWaiverMoves,
} from "./helper";
import {
  Player,
  LeagueCountResponse,
  LeagueOriginal,
  Bracket,
  WeeklyWaiver,
  NewLeagueInfoType,
} from "../types/apiTypes";
import { LeagueInfoType, RosterType } from "../types/types";

import {
  getLeague,
  getRosters,
  getWinnersBracket,
  getLosersBracket,
  getCurrentLeagueState,
  getUsers,
  getTransactions,
  getAvatar,
} from "./sleeperApi";

export const getPlayerNews = async (
  playerNames: string[]
): Promise<Record<string, unknown>[]> => {
  let url = import.meta.env.VITE_PLAYER_NEWS;

  if (playerNames && playerNames.length > 0) {
    url += `?keywords=${playerNames.join(",")}`;
  }
  const response = await fetch(url);
  const result = await response.json();
  return result;
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
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    const playersMap = new Map<string, Player>();
    if (result.players && Array.isArray(result.players)) {
      result.players.forEach((playerObj: Player) => {
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
    return await response.json();
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
  return await response.json();
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
    return await response.json();
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
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
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
    return await response.json();
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
): Promise<void> => {
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
  const trades: WeeklyWaiver[][] = [];
  const waivers: WeeklyWaiver[][] = [];
  const [weeklyPoints, users, transactionPromises] = await Promise.all([
    getWeeklyPoints(
      leagueId,
      currentWeek !== 0 ? currentWeek : newLeagueInfo.lastScoredWeek
    ),
    getUsers(leagueId),
    Promise.all(
      Array.from({ length: numberOfWeeks + 1 }, async (_, i) => {
        const weeklyTransaction = await getTransactions(leagueId, i + 1);
        const waiverMoves = getWaiverMoves(weeklyTransaction);
        trades.push(waiverMoves["trades"]);
        waivers.push(waiverMoves["waivers"]);
        return getTotalTransactions(weeklyTransaction);
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
  const transactions = transactionPromises.reduce(
    (acc, obj) => {
      Object.entries(obj).forEach(([id, value]) => {
        acc[id] = (acc[id] || 0) + (value as number);
      });
      return acc;
    },
    {} as Record<string, number>
  );
  return {
    ...newLeagueInfo,
    weeklyPoints,
    users: processedUsers,
    transactions,
    trades: trades.flat(),
    waivers: waivers.flat(),
    legacyWinner: legacyWinner,
    lastUpdated: new Date().getTime(),
  };
};
