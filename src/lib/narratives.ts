import { getTradeValue } from "../api/sleeperApi";
import { LeagueInfoType } from "../types/types";
import {
  DraftPick,
  WeeklyWaiver,
  WaiverStatus,
  WaiverType,
} from "../types/apiTypes";
import {
  getPreviousLeagueEntries,
  isLeagueInfoEntry,
} from "./previousSeason";

type PlayoffParticipantMatchup = {
  t1?: number | null;
  t2?: number | null;
};

type EspnPlayoffMatchup = {
  home?: {
    teamId?: number | string | null;
  };
  away?: {
    teamId?: number | string | null;
  };
};

export type HistoricalSeasonInput = {
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string | null;
  scoringType: number;
  rosters: LeagueInfoType["rosters"];
  weeklyPoints: LeagueInfoType["weeklyPoints"];
  users: LeagueInfoType["users"];
  trades: LeagueInfoType["trades"];
  waivers: LeagueInfoType["waivers"];
  rosterPositions: string[];
  playoffs: PlayoffParticipantMatchup[];
  draftPicks?: DraftPick[];
  draftType?: string;
};

export type ManagerDraftHistory = {
  season: string;
  positions: string[];
  seasonType: string;
  draftLabel?: string;
  firstQBRound?: number | null;
  firstTERound?: number | null;
  requiresTightEnd?: boolean;
};

export type DraftRoundMetric = {
  averageRound: number | null;
  draftedCount: number;
  eligibleDraftCount: number;
};

export type DraftRoundSummary = {
  draftLabel: string;
  firstQB: DraftRoundMetric;
  firstTE: DraftRoundMetric | null;
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
  draftHistory?: ManagerDraftHistory;
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
  draftHistory: ManagerDraftHistory[];
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
  draftHistory: ManagerDraftHistory[];
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

const getEspnPlayoffParticipantMatchups = (
  matchups: unknown[]
): PlayoffParticipantMatchup[] => {
  return (matchups as EspnPlayoffMatchup[])
    .map((matchup) => ({
      t1: Number(matchup.home?.teamId),
      t2: Number(matchup.away?.teamId),
    }))
    .filter(
      (matchup) => !Number.isNaN(matchup.t1) || !Number.isNaN(matchup.t2)
    );
};

const getPlayoffParticipantMatchups = (
  season: LeagueInfoType
): PlayoffParticipantMatchup[] => {
  if (season.winnersBracket?.length > 0) {
    return season.winnersBracket;
  }

  if (season.platform === "espn" && season.espnWinnersBracket.length > 0) {
    return getEspnPlayoffParticipantMatchups(season.espnWinnersBracket);
  }

  return [];
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

const isKeeperPick = (keeper: unknown) =>
  keeper === true || keeper === 1 || keeper === "1" || keeper === "true";

export const getDraftHistoryForManager = (
  season: HistoricalSeasonInput,
  userId: string
): ManagerDraftHistory | undefined => {
  if (
    !season.draftPicks?.length ||
    season.draftType?.toLowerCase() === "auction"
  ) {
    return undefined;
  }

  const managerPicks = season.draftPicks
    .filter((pick) => pick.userId === userId && !isKeeperPick(pick.keeper))
    .sort((left, right) => left.pickNumber - right.pickNumber);
  const positions = managerPicks
    .map((pick) => pick.position?.trim().toUpperCase() ?? "")
    .filter((position) => position && position !== "NA")
    .slice(0, 5);

  const isRookieDraft =
    season.seasonType?.toLowerCase() === "dynasty" &&
    season.draftPicks.length < 100;

  return positions.length
    ? {
        season: season.season,
        positions,
        seasonType: season.seasonType,
        draftLabel: isRookieDraft ? "Rookie" : season.seasonType,
        firstQBRound:
          managerPicks.find(
            (pick) => pick.position?.trim().toUpperCase() === "QB"
          )?.round ?? null,
        firstTERound:
          managerPicks.find(
            (pick) => pick.position?.trim().toUpperCase() === "TE"
          )?.round ?? null,
        requiresTightEnd: (season.rosterPositions ?? []).some(
          (position) => position.trim().toUpperCase() === "TE"
        ),
      }
    : undefined;
};

export const getDraftTendency = (
  history: ManagerDraftHistory[]
): string | null => {
  if (history.length < 2) return null;

  for (const prefixLength of [3, 2]) {
    const counts = new Map<string, number>();
    history.forEach(({ positions }) => {
      if (positions.length < prefixLength) return;
      const prefix = positions.slice(0, prefixLength).join(" → ");
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    });

    const mostCommon = [...counts.entries()].sort(
      (left, right) => right[1] - left[1]
    )[0];
    if (mostCommon && mostCommon[1] >= 2) {
      const [sequence, count] = mostCommon;
      return count === history.length
        ? `Started ${sequence} in all ${count} tracked drafts.`
        : `Started ${sequence} in ${count} of ${history.length} tracked drafts.`;
    }
  }

  const firstPositionCounts = new Map<string, number>();
  history.forEach(({ positions }) => {
    const firstPosition = positions[0];
    if (firstPosition) {
      firstPositionCounts.set(
        firstPosition,
        (firstPositionCounts.get(firstPosition) ?? 0) + 1
      );
    }
  });
  const mostCommonFirstPosition = [...firstPositionCounts.entries()].sort(
    (left, right) => right[1] - left[1]
  )[0];

  if (mostCommonFirstPosition && mostCommonFirstPosition[1] >= 2) {
    const [position, count] = mostCommonFirstPosition;
    return `Used the first pick on ${position} in ${count} of ${history.length} tracked drafts.`;
  }

  return null;
};

export const getDraftRoundSummaries = (
  history: ManagerDraftHistory[]
): DraftRoundSummary[] => {
  const groups = new Map<string, ManagerDraftHistory[]>();
  history.forEach((draft) => {
    const label = draft.draftLabel ?? draft.seasonType ?? "Draft";
    groups.set(label, [...(groups.get(label) ?? []), draft]);
  });

  const summarize = (
    drafts: ManagerDraftHistory[],
    key: "firstQBRound" | "firstTERound"
  ): DraftRoundMetric => {
    const rounds = drafts
      .map((draft) => draft[key])
      .filter(
        (round): round is number =>
          typeof round === "number" && Number.isFinite(round) && round > 0
      );

    return {
      averageRound: rounds.length
        ? rounds.reduce((sum, round) => sum + round, 0) / rounds.length
        : null,
      draftedCount: rounds.length,
      eligibleDraftCount: drafts.length,
    };
  };

  return [...groups.entries()].map(([draftLabel, drafts]) => {
    const tightEndDrafts = drafts.filter((draft) => draft.requiresTightEnd);
    return {
      draftLabel,
      firstQB: summarize(drafts, "firstQBRound"),
      firstTE: tightEndDrafts.length
        ? summarize(tightEndDrafts, "firstTERound")
        : null,
    };
  });
};

export const getDraftGrade = (score: number | null): string | null => {
  if (score === null) return null;
  if (score >= 2.5) return "A+";
  if (score >= 2.1) return "A";
  if (score >= 1.75) return "A-";
  if (score >= 1.4) return "B+";
  if (score >= 1.1) return "B";
  if (score >= 0.75) return "B-";
  if (score >= 0.5) return "C+";
  if (score >= 0.25) return "C";
  if (score >= 0) return "C-";
  if (score >= -0.6) return "D+";
  if (score >= -1.2) return "D";
  if (score >= -1.75) return "D-";
  return "F";
};

export const getDraftStrategyLabel = (
  history: ManagerDraftHistory[]
): string | null => {
  if (!history.length) return null;

  const zeroRbStarts = history.filter(
    (draft) => !draft.positions.slice(0, 2).includes("RB")
  ).length;
  if (history.length >= 2 && zeroRbStarts / history.length >= 0.6) {
    return "Zero RB Lean";
  }

  const qbRounds = history
    .map((draft) => draft.firstQBRound)
    .filter(
      (round): round is number =>
        typeof round === "number" && Number.isFinite(round) && round > 0
    );
  const qbCoverage = qbRounds.length / history.length;
  const averageQbRound = qbRounds.length
    ? qbRounds.reduce((sum, round) => sum + round, 0) / qbRounds.length
    : null;

  if (averageQbRound !== null && qbCoverage >= 0.6) {
    if (averageQbRound <= 2.5) return "Early QB";
    if (averageQbRound >= 6) return "Waits on QB";
  }

  const positions = history.flatMap((draft) => draft.positions);
  const shareFor = (position: string) =>
    positions.filter((candidate) => candidate === position).length /
    positions.length;
  const rbShare = shareFor("RB");
  const wrShare = shareFor("WR");

  if (rbShare >= 0.4 && rbShare > wrShare) return "RB Heavy";
  if (wrShare >= 0.4 && wrShare > rbShare) return "WR Heavy";
  return "Balanced Builder";
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
      const draftHistory = getDraftHistoryForManager(season, user.id);

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
          (obj) =>
            Number(obj.t1) === roster.rosterId ||
            Number(obj.t2) === roster.rosterId
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
        draftHistory,
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
        draftHistory: record.draftHistory ? [record.draftHistory] : [],
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
    if (record.draftHistory) existing.draftHistory.push(record.draftHistory);
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
        draftHistory: [...manager.draftHistory].sort(
          (left, right) => Number(right.season) - Number(left.season)
        ),
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
    ...getPreviousLeagueEntries(currentLeague).filter(isLeagueInfoEntry),
  ].filter((season) => season.lastScoredWeek !== 0);
  return seasons.map((season) => ({
    season: season.season,
    seasonType: season.seasonType,
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
    rosterPositions: season.rosterPositions,
    playoffs: getPlayoffParticipantMatchups(season),
    draftPicks: season.draftPicks,
    draftType:
      season.draftMetadata?.draftType ??
      (season.draftPicks?.some((pick) => Number(pick.amount ?? 0) > 0)
        ? "auction"
        : undefined),
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
