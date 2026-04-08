import { getTradeValue } from "../api/sleeperApi";
import { LeagueInfoType } from "../types/types";
import {
  Bracket,
  DraftPick,
  WeeklyWaiver,
  WaiverStatus,
  WaiverType,
} from "../types/apiTypes";

export type HistoricalSeasonInput = {
  season: string;
  leagueId: string;
  leagueWinner: string | null;
  scoringType: number;
  rosters: LeagueInfoType["rosters"];
  weeklyPoints: LeagueInfoType["weeklyPoints"];
  users: LeagueInfoType["users"];
  trades: LeagueInfoType["trades"];
  waivers: LeagueInfoType["waivers"];
  playoffs: Bracket[];
  draftPicks?: DraftPick[];
};

export type ManagerSeasonRecord = {
  userId: string;
  rosterId: number;
  season: string;
  name: string;
  username: string;
  avatarImg?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  managerEfficiency: number;
  weeklyScores: number[];
  matchupIds: (number | null)[];
  tradeCount: number;
  tradeValueGained: number;
  waiverCount: number;
  draftPickRankTotal: number;
  draftPickCount: number;
  isChampion: boolean;
  madePlayoffs: boolean;
};

export type ManagerArchetype = {
  userId: string;
  displayName: string;
  avatarImg?: string;
  seasons: number;
  titles: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  totalTrades: number;
  tradeValueGained: number;
  totalWaivers: number;
  averageEfficiency: number;
  averagePointsPerSeason: number;
  averageTradesPerSeason: number;
  averageWaiversPerSeason: number;
  winRate: number;
  weeklyScoreStdDev: number;
  playoffAppearances: number;
  averageDraftPickRank: number | null;
};

export type NarrativeBundle = {
  managerArchetypes: ManagerArchetype[];
};

type ManagerAggregate = {
  userId: string;
  displayName: string;
  avatarImg?: string;
  seasons: number;
  titles: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  totalTrades: number;
  tradeValueGained: number;
  totalWaivers: number;
  avgEfficiency: number;
  scoreVariance: number;
  playoffAppearances: number;
  draftPickRankTotal: number;
  draftPickCount: number;
};

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const stdDev = (values: number[]) => {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const getTradeScore = (rank: number | null) => {
  if (rank === null) {
    return 0;
  }

  return Math.max(0, 100 - rank);
};

const countTransactionsForManager = (
  transactions: WeeklyWaiver[],
  userId: string,
  rosterId: number,
  type: "trade" | "waiver"
) => {
  return transactions.filter((transaction) => {
    if (transaction.status !== WaiverStatus.Complete) {
      return false;
    }

    if (type === "trade" && transaction.type !== WaiverType.Trade) {
      return false;
    }

    if (
      type === "waiver" &&
      transaction.type !== WaiverType.Waiver &&
      transaction.type !== WaiverType.FreeAgent
    ) {
      return false;
    }

    return (
      transaction.creator === userId ||
      transaction.roster_ids.includes(rosterId) ||
      transaction?.consenter_ids?.includes(rosterId)
    );
  }).length;
};

const getChampionRosterId = (season: HistoricalSeasonInput) => {
  if (!season.leagueWinner) return null;
  const parsed = Number(season.leagueWinner);
  return Number.isNaN(parsed) ? null : parsed;
};

const getDraftSummaryForManager = (
  draftPicks: DraftPick[] | undefined,
  userId: string
) => {
  if (!draftPicks?.length) {
    return {
      draftPickRankTotal: 0,
      draftPickCount: 0,
    };
  }

  return draftPicks.reduce(
    (accumulator, pick) => {
      if (pick.userId !== userId) {
        return accumulator;
      }

      const pickRank = Number.parseFloat(pick.pickRank);
      if (Number.isNaN(pickRank)) {
        return accumulator;
      }

      accumulator.draftPickRankTotal += pickRank;
      accumulator.draftPickCount += 1;
      return accumulator;
    },
    {
      draftPickRankTotal: 0,
      draftPickCount: 0,
    }
  );
};

const getTradeValueDeltaForRoster = async (
  season: HistoricalSeasonInput,
  rosterId: number
): Promise<number> => {
  const completedTrades = season.trades.filter(
    (trade) =>
      trade.status === WaiverStatus.Complete &&
      trade.type === WaiverType.Trade &&
      trade.roster_ids.includes(rosterId) &&
      trade.adds
  );

  if (!completedTrades.length) {
    return 0;
  }

  const tradeDeltas = await Promise.all(
    completedTrades.map(async (trade) => {
      const playerIds = Object.keys(trade.adds ?? {});
      const playerValues = await Promise.all(
        playerIds.map(async (playerId) => ({
          score: getTradeScore(
            (await getTradeValue(
              playerId,
              season.season,
              trade.leg,
              season.scoringType
            )) ?? null
          ),
          receivingRosterId: trade.adds?.[playerId] ?? null,
        }))
      );

      return playerValues.reduce((sum, player) => {
        if (player.receivingRosterId === rosterId) {
          return sum + player.score;
        }
        return sum - player.score;
      }, 0);
    })
  );

  return tradeDeltas.reduce((sum, delta) => sum + delta, 0);
};

const buildSeasonRecords = async (
  season: HistoricalSeasonInput
): Promise<ManagerSeasonRecord[]> => {
  const championRosterId = getChampionRosterId(season);
  const records: Array<ManagerSeasonRecord | null> = await Promise.all(
    season.rosters.map(async (roster) => {
      const user = season.users.find((candidate) => candidate.id === roster.id);
      const points = season.weeklyPoints.find(
        (weeklyEntry) => weeklyEntry.rosterId === roster.rosterId
      );

      if (!user || !points) {
        return null;
      }

      const draftSummary = getDraftSummaryForManager(
        season.draftPicks,
        user.id
      );

      return {
        userId: user.id,
        rosterId: roster.rosterId,
        season: season.season,
        name: user.name,
        username: user.username,
        avatarImg: user.avatarImg,
        wins: roster.wins,
        losses: roster.losses,
        ties: roster.ties,
        pointsFor: roster.pointsFor,
        pointsAgainst: roster.pointsAgainst,
        managerEfficiency: roster.managerEfficiency,
        weeklyScores: points.points,
        madePlayoffs: season.playoffs.some(
          (obj) => obj.t1 === roster.rosterId || obj.t2 === roster.rosterId
        ),
        matchupIds: points.matchups ?? [],
        tradeCount: countTransactionsForManager(
          season.trades,
          user.id,
          roster.rosterId,
          "trade"
        ),
        tradeValueGained: await getTradeValueDeltaForRoster(
          season,
          roster.rosterId
        ),
        waiverCount: countTransactionsForManager(
          season.waivers,
          user.id,
          roster.rosterId,
          "waiver"
        ),
        draftPickRankTotal: draftSummary.draftPickRankTotal,
        draftPickCount: draftSummary.draftPickCount,
        isChampion: championRosterId === roster.rosterId,
      } satisfies ManagerSeasonRecord;
    })
  );

  return records.filter(
    (record): record is ManagerSeasonRecord => record !== null
  );
};

const aggregateManagers = (records: ManagerSeasonRecord[]) => {
  const map = new Map<string, ManagerAggregate>();
  records.forEach((record) => {
    const existing = map.get(record.userId);
    const weeklyVariance = stdDev(record.weeklyScores);

    if (!existing) {
      map.set(record.userId, {
        userId: record.userId,
        displayName: record.username || record.name,
        avatarImg: record.avatarImg,
        seasons: 1,
        titles: record.isChampion ? 1 : 0,
        totalWins: record.wins,
        totalLosses: record.losses,
        totalTies: record.ties,
        totalPointsFor: record.pointsFor,
        totalPointsAgainst: record.pointsAgainst,
        totalTrades: record.tradeCount,
        tradeValueGained: record.tradeValueGained,
        totalWaivers: record.waiverCount,
        avgEfficiency: record.managerEfficiency,
        scoreVariance: weeklyVariance,
        playoffAppearances: record.madePlayoffs ? 1 : 0,
        draftPickRankTotal: record.draftPickRankTotal,
        draftPickCount: record.draftPickCount,
      });
      return;
    }

    const totalSeasons = existing.seasons + 1;
    existing.seasons = totalSeasons;
    existing.titles += record.isChampion ? 1 : 0;
    existing.totalWins += record.wins;
    existing.totalLosses += record.losses;
    existing.totalTies += record.ties;
    existing.totalPointsFor += record.pointsFor;
    existing.totalPointsAgainst += record.pointsAgainst;
    existing.totalTrades += record.tradeCount;
    existing.tradeValueGained += record.tradeValueGained;
    existing.playoffAppearances += record.madePlayoffs ? 1 : 0;
    existing.totalWaivers += record.waiverCount;
    existing.draftPickRankTotal += record.draftPickRankTotal;
    existing.draftPickCount += record.draftPickCount;
    existing.avgEfficiency =
      (existing.avgEfficiency * (totalSeasons - 1) + record.managerEfficiency) /
      totalSeasons;
    existing.scoreVariance =
      (existing.scoreVariance * (totalSeasons - 1) + weeklyVariance) /
      totalSeasons;
  });

  return Array.from(map.values());
};

const buildManagerArchetypes = (records: ManagerSeasonRecord[]) => {
  const aggregates = aggregateManagers(records);

  return aggregates
    .map((manager) => {
      const averagePointsPerSeason = manager.totalPointsFor / manager.seasons;
      const averageTradesPerSeason = manager.totalTrades / manager.seasons;
      const averageWaiversPerSeason = manager.totalWaivers / manager.seasons;
      const averageDraftPickRank = manager.draftPickCount
        ? manager.draftPickRankTotal / manager.draftPickCount
        : null;
      const winRate =
        (manager.totalWins + manager.totalTies * 0.5) /
        Math.max(
          1,
          manager.totalWins + manager.totalLosses + manager.totalTies
        );

      return {
        userId: manager.userId,
        displayName: manager.displayName,
        avatarImg: manager.avatarImg,
        seasons: manager.seasons,
        titles: manager.titles,
        totalWins: manager.totalWins,
        totalLosses: manager.totalLosses,
        totalTies: manager.totalTies,
        totalPointsFor: manager.totalPointsFor,
        totalPointsAgainst: manager.totalPointsAgainst,
        totalTrades: manager.totalTrades,
        tradeValueGained: manager.tradeValueGained,
        totalWaivers: manager.totalWaivers,
        averageEfficiency: manager.avgEfficiency,
        playoffAppearances: manager.playoffAppearances,
        averagePointsPerSeason,
        averageTradesPerSeason,
        averageWaiversPerSeason,
        winRate,
        weeklyScoreStdDev: manager.scoreVariance,
        averageDraftPickRank,
      } satisfies ManagerArchetype;
    })
    .sort((left, right) => {
      if (right.titles !== left.titles) {
        return right.titles - left.titles;
      }
      return right.winRate - left.winRate;
    });
};

export const normalizeHistoricalSeasons = (
  currentLeague?: LeagueInfoType
): HistoricalSeasonInput[] => {
  if (!currentLeague) {
    return [];
  }

  const seasons = [
    currentLeague,
    ...(currentLeague.previousLeagues ?? []),
  ].filter((season) => season.lastScoredWeek !== 0);
  return seasons.map((season) => ({
    season: season.season,
    leagueId: season.leagueId,
    leagueWinner:
      season.leagueWinner !== null && season.leagueWinner !== undefined
        ? String(season.leagueWinner)
        : season.legacyWinner !== null && season.legacyWinner !== undefined
          ? String(season.legacyWinner)
          : null,
    scoringType: season.scoringType,
    rosters: season.rosters,
    weeklyPoints: season.weeklyPoints,
    users: season.users,
    trades: season.trades,
    waivers: season.waivers,
    playoffs: season.winnersBracket,
    draftPicks: season.draftPicks,
  }));
};

export const buildNarrativeBundle = async (
  seasons: HistoricalSeasonInput[]
): Promise<NarrativeBundle> => {
  const managerSeasonGroups = await Promise.all(
    seasons.map((season) => buildSeasonRecords(season))
  );
  const managerSeasons = managerSeasonGroups.flat();

  return {
    managerArchetypes: buildManagerArchetypes(managerSeasons),
  };
};
