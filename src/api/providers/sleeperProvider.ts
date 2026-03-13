import {
  getWeeklyPoints,
  getTotalTransactions,
  getWaiverMoves,
} from "../helper";
import { NewLeagueInfoType } from "@/types/apiTypes";
import type { LeagueInfoType } from "@/types/types";
import type { FantasyProvider, ProviderLeagueRef } from "./types";
import { normalizeLeagueInfo } from "@/lib/leagueIdentity";
import {
  getAvatar,
  getCurrentLeagueState,
  getLeague,
  getLosersBracket,
  getRosters,
  getTransactions,
  getUsers,
  getWinnersBracket,
} from "../sleeperApi";

const buildSleeperLeagueBundle = async (
  leagueId: string
): Promise<LeagueInfoType> => {
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

  let numberOfWeeks = 0;
  let currentWeek = 0;
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
          trades: waiverMoves.trades,
          waivers: waiverMoves.waivers,
        };
      })
    ),
  ]);

  const processedUsers = await Promise.all(
    users.map(async (user) => ({
      ...user,
      avatarImg: user.avatar
        ? ((await getAvatar(user.avatar)) ?? undefined)
        : undefined,
    }))
  );

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

  return normalizeLeagueInfo({
    ...newLeagueInfo,
    weeklyPoints,
    users: processedUsers,
    transactions,
    trades,
    waivers,
    legacyWinner,
    lastUpdated: new Date().getTime(),
  });
};

export const sleeperProvider: FantasyProvider = {
  async validateLeague(ref: ProviderLeagueRef) {
    if (ref.provider !== "sleeper") {
      return null;
    }

    const league = await getLeague(ref.leagueId);
    return league.name ? league : null;
  },
  async getLeagueBundle(ref: ProviderLeagueRef) {
    return buildSleeperLeagueBundle(ref.leagueId);
  },
};
