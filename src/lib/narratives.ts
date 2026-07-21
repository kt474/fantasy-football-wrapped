import { getTradeValue } from "../api/sleeperApi";
import { LeagueInfoType } from "../types/types";
import {
  DraftPick,
  WeeklyWaiver,
  WaiverStatus,
  WaiverType,
} from "../types/apiTypes";
import { getPreviousLeagueEntries, isLeagueInfoEntry } from "./previousSeason";

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
  status?: string;
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
  madePlayoffs?: boolean;
  pointsFor?: number;
};

export const DRAFT_HISTORY_PICK_LIMIT = 8;
export const DRAFT_INSIGHT_PICK_LIMIT = 5;
export const DRAFT_OPENING_PICK_LIMIT = 3;

export type DraftPositionWindows = {
  opening: string[];
  insights: string[];
  planning: string[];
};

export const getDraftPositionWindows = (
  draft: ManagerDraftHistory
): DraftPositionWindows => {
  const planning = draft.positions.slice(0, DRAFT_HISTORY_PICK_LIMIT);
  return {
    opening: planning.slice(0, DRAFT_OPENING_PICK_LIMIT),
    insights: planning.slice(0, DRAFT_INSIGHT_PICK_LIMIT),
    planning,
  };
};

const getDraftInsightPositions = (draft: ManagerDraftHistory) =>
  getDraftPositionWindows(draft).insights;

export type DraftPrediction = {
  positions: string[];
  observedCount: number;
  eligibleDraftCount: number;
  draftLabel: string;
};

export type DraftStrategyResult = {
  opening: string;
  seasons: number;
  playoffAppearances: number;
  playoffRate: number;
  averagePoints: number | null;
  draftLabel: string;
};

export type DraftRoomCheatSheetSummary = {
  draftLabel: string;
  trackedDrafts: number;
  projectedPositions: string[] | null;
  projectedObservedCount: number;
  dominantPosition: string | null;
  dominantPositionShare: number;
  averageFirstQBRound: number | null;
  firstQBDraftCount: number;
  patternStrength:
    | "Strong pattern"
    | "Consistent"
    | "Early signal"
    | "Mixed openings"
    | "Limited history";
};

export type DraftRoomPulseInsight = {
  label: string;
  value: string;
  detail: string;
};

export type DraftPlanPressure = {
  position: string;
  expectedPicks: number;
};

export type PositionalDraftPlanRound = {
  round: number;
  overallPick: number;
  picksBeforePick: number;
  pressure: DraftPlanPressure[];
  pressureLevel: "High" | "Medium" | "Low" | "Unknown";
  threats: string[];
  guidance: string;
};

export type PositionalDraftPlan = {
  managerId: string;
  managerName: string;
  draftLabel: string;
  draftSlot: number;
  leagueSize: number;
  rounds: PositionalDraftPlanRound[];
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
  userId: string,
  outcome?: Pick<ManagerDraftHistory, "madePlayoffs" | "pointsFor">
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
    .slice(0, DRAFT_HISTORY_PICK_LIMIT);

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
        ...outcome,
      }
    : undefined;
};

const getDraftLabel = (draft: ManagerDraftHistory) =>
  draft.draftLabel ?? draft.seasonType ?? "Draft";

const getPrimaryDraftGroup = (history: ManagerDraftHistory[]) => {
  const groups = new Map<string, ManagerDraftHistory[]>();
  history.forEach((draft) => {
    const label = getDraftLabel(draft);
    groups.set(label, [...(groups.get(label) ?? []), draft]);
  });

  return (
    [...groups.entries()].sort(
      (left, right) => right[1].length - left[1].length
    )[0] ?? ["Draft", []]
  );
};

export const getDraftPrediction = (
  history: ManagerDraftHistory[]
): DraftPrediction | null => {
  const [draftLabel, drafts] = getPrimaryDraftGroup(history);
  if (drafts.length < 2) return null;

  for (const prefixLength of [2, 1]) {
    const counts = new Map<string, number>();
    drafts.forEach(({ positions }) => {
      if (positions.length < prefixLength) return;
      const key = positions.slice(0, prefixLength).join("|");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const mostCommon = [...counts.entries()].sort(
      (left, right) => right[1] - left[1]
    )[0];
    if (
      mostCommon &&
      mostCommon[1] >= 2 &&
      mostCommon[1] / drafts.length >= 0.5
    ) {
      return {
        positions: mostCommon[0].split("|"),
        observedCount: mostCommon[1],
        eligibleDraftCount: drafts.length,
        draftLabel,
      };
    }
  }

  return null;
};

const getAverageRound = (
  drafts: ManagerDraftHistory[],
  key: "firstQBRound" | "firstTERound"
) => {
  const rounds = drafts
    .map((draft) => draft[key])
    .filter(
      (round): round is number =>
        typeof round === "number" && Number.isFinite(round) && round > 0
    );
  return rounds.length
    ? rounds.reduce((sum, round) => sum + round, 0) / rounds.length
    : null;
};

export const getDraftRoomCheatSheetSummary = (
  history: ManagerDraftHistory[]
): DraftRoomCheatSheetSummary | null => {
  const [draftLabel, drafts] = getPrimaryDraftGroup(history);
  if (!drafts.length) return null;

  const prediction = getDraftPrediction(history);
  const positions = drafts.flatMap(getDraftInsightPositions);
  const positionCounts = new Map<string, number>();
  positions.forEach((position) =>
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1)
  );
  const dominantPosition = [...positionCounts.entries()].sort(
    (left, right) => right[1] - left[1]
  )[0];
  const firstQBRounds = drafts
    .map((draft) => draft.firstQBRound)
    .filter(
      (round): round is number =>
        typeof round === "number" && Number.isFinite(round) && round > 0
    );

  let patternStrength: DraftRoomCheatSheetSummary["patternStrength"];
  if (drafts.length < 2) {
    patternStrength = "Limited history";
  } else if (!prediction) {
    patternStrength = "Mixed openings";
  } else if (drafts.length === 2) {
    patternStrength = "Early signal";
  } else if (prediction.observedCount / drafts.length >= 0.75) {
    patternStrength = "Strong pattern";
  } else {
    patternStrength = "Consistent";
  }

  return {
    draftLabel,
    trackedDrafts: drafts.length,
    projectedPositions: prediction?.positions ?? null,
    projectedObservedCount: prediction?.observedCount ?? 0,
    dominantPosition: dominantPosition?.[0] ?? null,
    dominantPositionShare:
      dominantPosition && positions.length
        ? dominantPosition[1] / positions.length
        : 0,
    averageFirstQBRound: getAverageRound(drafts, "firstQBRound"),
    firstQBDraftCount: firstQBRounds.length,
    patternStrength,
  };
};

const getPositionShares = (drafts: ManagerDraftHistory[]) => {
  const positions = drafts.flatMap(getDraftInsightPositions);
  const shares = new Map<string, number>();
  if (!positions.length) return shares;

  new Set(positions).forEach((position) => {
    shares.set(
      position,
      positions.filter((candidate) => candidate === position).length /
        positions.length
    );
  });
  return shares;
};

export const getDraftStrategyShifts = (
  history: ManagerDraftHistory[]
): string[] => {
  const [, drafts] = getPrimaryDraftGroup(history);
  if (drafts.length < 3) return [];

  const recentDrafts = drafts.slice(0, 2);
  const priorDrafts = drafts.slice(2);
  const recentShares = getPositionShares(recentDrafts);
  const priorShares = getPositionShares(priorDrafts);
  const positionChanges = [
    ...new Set([...recentShares.keys(), ...priorShares.keys()]),
  ]
    .map((position) => ({
      position,
      recentShare: recentShares.get(position) ?? 0,
      priorShare: priorShares.get(position) ?? 0,
    }))
    .map((change) => ({
      ...change,
      difference: change.recentShare - change.priorShare,
    }))
    .sort(
      (left, right) => Math.abs(right.difference) - Math.abs(left.difference)
    );

  const insights: string[] = [];
  const biggestPositionChange = positionChanges[0];
  if (
    biggestPositionChange &&
    Math.abs(biggestPositionChange.difference) >= 0.25
  ) {
    const recentPercent = Math.round(biggestPositionChange.recentShare * 100);
    const priorPercent = Math.round(biggestPositionChange.priorShare * 100);
    insights.push(
      biggestPositionChange.difference > 0
        ? "Leaning more " +
            biggestPositionChange.position +
            " lately (" +
            recentPercent +
            "% of recent early picks, up from " +
            priorPercent +
            "%)."
        : "Using fewer " +
            biggestPositionChange.position +
            "s early lately (" +
            recentPercent +
            "%, down from " +
            priorPercent +
            "%)."
    );
  }

  const recentQbRounds = recentDrafts
    .map((draft) => draft.firstQBRound)
    .filter(
      (round): round is number =>
        typeof round === "number" && Number.isFinite(round) && round > 0
    );
  const priorQbRounds = priorDrafts
    .map((draft) => draft.firstQBRound)
    .filter(
      (round): round is number =>
        typeof round === "number" && Number.isFinite(round) && round > 0
    );
  if (recentQbRounds.length === 2 && priorQbRounds.length) {
    const recentAverage =
      recentQbRounds.reduce((sum, round) => sum + round, 0) /
      recentQbRounds.length;
    const priorAverage =
      priorQbRounds.reduce((sum, round) => sum + round, 0) /
      priorQbRounds.length;
    const difference = recentAverage - priorAverage;
    if (Math.abs(difference) >= 1.5) {
      insights.push(
        "Taking the first QB " +
          Math.abs(difference).toFixed(1) +
          " rounds " +
          (difference < 0 ? "earlier" : "later") +
          " lately (R" +
          recentAverage.toFixed(1) +
          " vs R" +
          priorAverage.toFixed(1) +
          ")."
      );
    }
  }

  return insights.slice(0, 2);
};

export const getDraftRoomPulse = (
  managers: ManagerArchetype[]
): DraftRoomPulseInsight[] => {
  const rows = managers.flatMap((manager) => {
    const summary = getDraftRoomCheatSheetSummary(manager.draftHistory);
    return summary ? [{ manager, summary }] : [];
  });
  if (!rows.length) return [];

  const labelCounts = new Map<string, number>();
  rows.forEach(({ summary }) =>
    labelCounts.set(
      summary.draftLabel,
      (labelCounts.get(summary.draftLabel) ?? 0) + 1
    )
  );
  const primaryLabel = [...labelCounts.entries()].sort(
    (left, right) => right[1] - left[1]
  )[0]?.[0];
  const comparableRows = rows.filter(
    ({ summary }) => summary.draftLabel === primaryLabel
  );
  const insights: DraftRoomPulseInsight[] = [];

  const leanCounts = new Map<string, number>();
  comparableRows.forEach(({ summary }) => {
    if (!summary.dominantPosition) return;
    leanCounts.set(
      summary.dominantPosition,
      (leanCounts.get(summary.dominantPosition) ?? 0) + 1
    );
  });
  const roomLean = [...leanCounts.entries()].sort(
    (left, right) => right[1] - left[1]
  )[0];
  if (roomLean && roomLean[1] >= 2) {
    insights.push({
      label: "Room lean",
      value: roomLean[0] + " early",
      detail:
        roomLean[1] +
        " of " +
        comparableRows.length +
        " " +
        primaryLabel +
        " managers emphasize " +
        roomLean[0] +
        " most.",
    });
  }

  const qbRows = comparableRows.filter(
    ({ summary }) => summary.averageFirstQBRound !== null
  );
  if (qbRows.length >= 2) {
    const maxRound = Math.max(
      ...qbRows.map(({ summary }) =>
        Math.ceil(summary.averageFirstQBRound ?? 0)
      )
    );
    const windows = Array.from(
      { length: Math.max(1, maxRound) },
      (_, index) => {
        const start = index + 1;
        const end = start + 2;
        const count = qbRows.filter(({ summary }) => {
          const round = summary.averageFirstQBRound ?? 0;
          return round >= start && round <= end;
        }).length;
        return { start, end, count };
      }
    );
    const busiestWindow = windows.sort(
      (left, right) => right.count - left.count || left.start - right.start
    )[0];
    if (busiestWindow?.count >= 2) {
      insights.push({
        label: "QB pressure",
        value: "Rounds " + busiestWindow.start + "–" + busiestWindow.end,
        detail:
          busiestWindow.count +
          " of " +
          qbRows.length +
          " managers typically enter the QB market here.",
      });
    }
  }

  const predictableRows = comparableRows
    .filter(
      ({ summary }) =>
        summary.trackedDrafts >= 3 &&
        summary.projectedPositions &&
        summary.projectedObservedCount >= 2
    )
    .sort((left, right) => {
      const leftRate =
        left.summary.projectedObservedCount / left.summary.trackedDrafts;
      const rightRate =
        right.summary.projectedObservedCount / right.summary.trackedDrafts;
      return (
        rightRate - leftRate ||
        right.summary.trackedDrafts - left.summary.trackedDrafts
      );
    });
  const mostPredictable = predictableRows[0];
  if (mostPredictable) {
    insights.push({
      label: "Most predictable",
      value: mostPredictable.manager.displayName,
      detail:
        "Repeated " +
        mostPredictable.summary.projectedPositions?.join(" → ") +
        " in " +
        mostPredictable.summary.projectedObservedCount +
        " of " +
        mostPredictable.summary.trackedDrafts +
        " drafts.",
    });
  }

  const shiftingManagerNames = comparableRows
    .filter(
      ({ manager }) => getDraftStrategyShifts(manager.draftHistory).length
    )
    .map(({ manager }) => manager.displayName);
  if (shiftingManagerNames.length) {
    const visibleNames = shiftingManagerNames.slice(0, 3);

    insights.push({
      label: "Changing approach",
      value: visibleNames.join(", "),
      detail:
        shiftingManagerNames.length === 1
          ? "This manager's recent early-round behavior differs materially from older drafts."
          : "These managers' recent early-round behavior differs materially from older drafts.",
    });
  }

  return insights.slice(0, 4);
};

const DRAFT_PLAN_POSITIONS = ["RB", "WR", "QB", "TE"];
const DRAFT_PLAN_ROUND_LIMIT = 4;
const DRAFT_PLAN_MEDIUM_PRESSURE_MIN_PICKS = 2;
const DRAFT_PLAN_MEDIUM_PRESSURE_MIN_SHARE = 0.35;
const DRAFT_PLAN_HIGH_PRESSURE_MIN_PICKS = 3;
const DRAFT_PLAN_HIGH_PRESSURE_MIN_SHARE = 0.45;

export const getDraftPressureLevel = (
  expectedPicks: number,
  picksBeforePick: number,
  hasProjection = true
): PositionalDraftPlanRound["pressureLevel"] => {
  if (picksBeforePick > 0 && !hasProjection) return "Unknown";
  if (picksBeforePick === 0) return "Low";

  const projectedShare = expectedPicks / picksBeforePick;
  if (
    expectedPicks >= DRAFT_PLAN_HIGH_PRESSURE_MIN_PICKS &&
    projectedShare >= DRAFT_PLAN_HIGH_PRESSURE_MIN_SHARE
  ) {
    return "High";
  }
  if (
    expectedPicks >= DRAFT_PLAN_MEDIUM_PRESSURE_MIN_PICKS &&
    projectedShare >= DRAFT_PLAN_MEDIUM_PRESSURE_MIN_SHARE
  ) {
    return "Medium";
  }
  return "Low";
};

const formatProjectedSelections = (position: string, expectedPicks: number) => {
  if (expectedPicks < 1) return `Fewer than 1 ${position} pick`;

  const lower = Math.floor(expectedPicks);
  const upper = Math.ceil(expectedPicks);
  const estimate = lower === upper ? String(lower) : `${lower}–${upper}`;
  return `About ${estimate} ${position} ${upper === 1 ? "pick" : "picks"}`;
};

const formatProjectedPickRange = (expectedPicks: number) => {
  if (expectedPicks < 1) return "fewer than 1";
  const lower = Math.floor(expectedPicks);
  const upper = Math.ceil(expectedPicks);
  return lower === upper ? String(lower) : `${lower}–${upper}`;
};

const getRoundPositionCounts = (
  drafts: ManagerDraftHistory[],
  roundIndex: number
) => {
  const counts = new Map<string, number>();
  let observations = 0;
  drafts.forEach((draft) => {
    const position = getDraftPositionWindows(draft).planning[roundIndex];
    if (!DRAFT_PLAN_POSITIONS.includes(position)) return;
    counts.set(position, (counts.get(position) ?? 0) + 1);
    observations += 1;
  });
  return { counts, observations };
};

export const getPositionalDraftPlan = (
  manager: ManagerArchetype,
  managers: ManagerArchetype[],
  requestedDraftSlot: number,
  requestedLeagueSize = managers.length
): PositionalDraftPlan | null => {
  const [draftLabel, managerDrafts] = getPrimaryDraftGroup(
    manager.draftHistory
  );
  if (!managerDrafts.length || managers.length < 2) return null;

  const leagueSize = Math.max(
    2,
    Math.round(requestedLeagueSize) || managers.length
  );
  const draftSlot = Math.min(
    leagueSize,
    Math.max(1, Math.round(requestedDraftSlot) || 1)
  );
  const opponents = managers
    .filter((candidate) => candidate.userId !== manager.userId)
    .map((candidate) => ({
      manager: candidate,
      drafts: candidate.draftHistory.filter(
        (draft) => getDraftLabel(draft) === draftLabel
      ),
    }))
    .filter(({ drafts }) => drafts.length);
  if (!opponents.length) return null;

  const roundCount = Math.min(
    DRAFT_PLAN_ROUND_LIMIT,
    Math.max(
      ...managerDrafts.map(
        (draft) => getDraftPositionWindows(draft).planning.length
      ),
      ...opponents.flatMap(({ drafts }) =>
        drafts.map((draft) => getDraftPositionWindows(draft).planning.length)
      )
    )
  );

  const rounds = Array.from(
    { length: roundCount },
    (_, roundIndex): PositionalDraftPlanRound => {
      const round = roundIndex + 1;
      const isOddRound = round % 2 === 1;
      const overallPick =
        roundIndex * leagueSize +
        (isOddRound ? draftSlot : leagueSize - draftSlot + 1);
      const halfWait =
        round === 1
          ? draftSlot - 1
          : isOddRound
            ? draftSlot - 1
            : leagueSize - draftSlot;
      const picksBeforePick = round === 1 ? halfWait : halfWait * 2;
      const relevantRounds =
        round === 1
          ? [{ index: roundIndex, picks: halfWait }]
          : [
              { index: roundIndex - 1, picks: halfWait },
              { index: roundIndex, picks: halfWait },
            ];
      const expectedByPosition = new Map<string, number>();
      let observations = 0;

      relevantRounds.forEach(({ index, picks }) => {
        const roundDrafts = opponents.flatMap(({ drafts }) => drafts);
        const roundCounts = getRoundPositionCounts(roundDrafts, index);
        observations += roundCounts.observations;
        if (!roundCounts.observations || !picks) return;
        DRAFT_PLAN_POSITIONS.forEach((position) => {
          const share =
            (roundCounts.counts.get(position) ?? 0) / roundCounts.observations;
          expectedByPosition.set(
            position,
            (expectedByPosition.get(position) ?? 0) + share * picks
          );
        });
      });

      const pressure = DRAFT_PLAN_POSITIONS.map((position) => ({
        position,
        expectedPicks: expectedByPosition.get(position) ?? 0,
      }))
        .filter(({ expectedPicks }) => expectedPicks >= 0.25)
        .sort(
          (left, right) =>
            right.expectedPicks - left.expectedPicks ||
            DRAFT_PLAN_POSITIONS.indexOf(left.position) -
              DRAFT_PLAN_POSITIONS.indexOf(right.position)
        )
        .slice(0, 2);
      const watchPosition = pressure[0]?.position;
      const expectedWatchPicks = pressure[0]?.expectedPicks ?? 0;
      const pressureLevel = getDraftPressureLevel(
        expectedWatchPicks,
        picksBeforePick,
        Boolean(watchPosition)
      );
      const sampleTarget = opponents.length * relevantRounds.length * 2;
      const hasThinHistory = observations < sampleTarget * 0.75;

      const threats = watchPosition
        ? opponents
            .map(({ manager: opponent, drafts }) => {
              let matches = 0;
              let eligible = 0;
              relevantRounds.forEach(({ index }) => {
                drafts.forEach((draft) => {
                  const position =
                    getDraftPositionWindows(draft).planning[index];
                  if (!DRAFT_PLAN_POSITIONS.includes(position)) return;
                  eligible += 1;
                  if (position === watchPosition) matches += 1;
                });
              });
              return {
                name: opponent.displayName,
                probability: eligible ? matches / eligible : 0,
              };
            })
            .filter(({ probability }) => probability >= 0.5)
            .sort((left, right) => right.probability - left.probability)
            .slice(0, 3)
            .map(({ name }) => name)
        : [];

      const managerRoundCounts = getRoundPositionCounts(
        managerDrafts,
        roundIndex
      );
      const managerPreferenceEntry = [
        ...managerRoundCounts.counts.entries(),
      ].sort((left, right) => right[1] - left[1])[0];
      const managerPreference =
        managerPreferenceEntry &&
        managerRoundCounts.observations >= 2 &&
        managerPreferenceEntry[1] / managerRoundCounts.observations >= 0.6
          ? managerPreferenceEntry[0]
          : null;
      const secondaryPressure = pressure[1];
      const hasSplitDemand = Boolean(
        secondaryPressure &&
        secondaryPressure.expectedPicks >= expectedWatchPicks * 0.75
      );

      let guidance: string;
      if (picksBeforePick === 0) {
        guidance =
          round === 1
            ? "You pick first. Build around your preferred opening."
            : "No opponent picks between your two selections.";
      } else if (!watchPosition) {
        guidance = `${picksBeforePick} picks before #${overallPick}. Not enough history for a reliable position read.`;
      } else if (hasThinHistory) {
        guidance = `Thin history makes #${overallPick} hard to read. ${watchPosition} is the early lean, but keep the plan flexible.`;
      } else if (pressureLevel === "High") {
        guidance = `${watchPosition} run alert: ${formatProjectedPickRange(
          expectedWatchPicks
        )} of the next ${picksBeforePick} picks project at ${watchPosition}. ${
          round === 1
            ? "Queue alternatives for this slot."
            : `Prioritize ${watchPosition} on the previous turn if it matters to your build.`
        }`;
      } else if (managerPreference && managerPreference !== watchPosition) {
        guidance = `${manager.displayName} usually drafts ${managerPreference} in Round ${round}; opponents lean ${watchPosition} before #${overallPick}. Keep both paths open.`;
      } else if (hasSplitDemand && secondaryPressure) {
        const primaryEstimate = formatProjectedPickRange(expectedWatchPicks);
        const secondaryEstimate = formatProjectedPickRange(
          secondaryPressure.expectedPicks
        );
        guidance =
          round <= 2
            ? `${watchPosition} and ${secondaryPressure.position} demand is nearly even before #${overallPick}: ${primaryEstimate} vs ${secondaryEstimate} projected picks. Stay flexible.`
            : `No single pressure point before #${overallPick}. Expect roughly ${primaryEstimate} ${watchPosition} and ${secondaryEstimate} ${secondaryPressure.position} picks.`;
      } else if (pressureLevel === "Medium" && threats.length >= 2) {
        guidance = `${threats.slice(0, 2).join(" and ")} show the strongest ${watchPosition} lean near this turn. Expect ${formatProjectedPickRange(
          expectedWatchPicks
        )} ${watchPosition} picks before #${overallPick}.`;
      } else if (picksBeforePick <= 2) {
        guidance = `Only ${picksBeforePick} ${
          picksBeforePick === 1 ? "pick" : "picks"
        } until #${overallPick}; ${watchPosition} demand looks manageable.`;
      } else if (pressureLevel === "Medium") {
        guidance = `${formatProjectedSelections(
          watchPosition,
          expectedWatchPicks
        )} expected before #${overallPick}. Queue another ${watchPosition} option and a fallback.`;
      } else {
        guidance = `${watchPosition} demand is spread out: ${formatProjectedPickRange(
          expectedWatchPicks
        )} projected across ${picksBeforePick} picks before #${overallPick}. Waiting is reasonable.`;
      }

      return {
        round,
        overallPick,
        picksBeforePick,
        pressure,
        pressureLevel,
        threats,
        guidance,
      };
    }
  );

  return {
    managerId: manager.userId,
    managerName: manager.displayName,
    draftLabel,
    draftSlot,
    leagueSize,
    rounds,
  };
};

export const getLeagueRelativeDraftInsights = (
  manager: ManagerArchetype,
  managers: ManagerArchetype[]
): string[] => {
  const [draftLabel, managerDrafts] = getPrimaryDraftGroup(
    manager.draftHistory
  );
  if (managerDrafts.length < 2) return [];

  const comparableManagers = managers
    .map((candidate) => ({
      manager: candidate,
      drafts: candidate.draftHistory.filter(
        (draft) => getDraftLabel(draft) === draftLabel
      ),
    }))
    .filter(({ drafts }) => drafts.length >= 2);
  if (comparableManagers.length < 2) return [];

  const insights: string[] = [];
  const managerPositions = managerDrafts.flatMap(getDraftInsightPositions);
  const positionCounts = new Map<string, number>();
  managerPositions.forEach((position) =>
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1)
  );
  const dominantPosition = [...positionCounts.entries()].sort(
    (left, right) => right[1] - left[1]
  )[0];

  if (dominantPosition && managerPositions.length) {
    const [position, positionCount] = dominantPosition;
    const share = positionCount / managerPositions.length;
    const ranked = comparableManagers
      .map(({ manager: candidate, drafts }) => {
        const positions = drafts.flatMap(getDraftInsightPositions);
        return {
          userId: candidate.userId,
          share: positions.length
            ? positions.filter((value) => value === position).length /
              positions.length
            : 0,
        };
      })
      .sort((left, right) => right.share - left.share);
    const higherShares = ranked.filter(
      (candidate) => candidate.share > share
    ).length;
    const tiedShares = ranked.filter(
      (candidate) => candidate.share === share
    ).length;
    const rank = higherShares + 1;
    if (share >= 0.3) {
      insights.push(
        rank === 1 && tiedShares === 1
          ? `League's most ${position}-heavy early drafter (${Math.round(
              share * 100
            )}% of first-five picks).`
          : rank === 1
            ? `Tied for the league lead in early ${position} emphasis (${Math.round(
                share * 100
              )}% of first-five picks).`
            : `Ranks #${rank} in early ${position} emphasis (${Math.round(
                share * 100
              )}% of first-five picks).`
      );
    }
  }

  const managerQbRound = getAverageRound(managerDrafts, "firstQBRound");
  const otherQbRounds = comparableManagers
    .filter(({ manager: candidate }) => candidate.userId !== manager.userId)
    .map(({ drafts }) => getAverageRound(drafts, "firstQBRound"))
    .filter((round): round is number => round !== null);
  if (managerQbRound !== null && otherQbRounds.length) {
    const leagueQbRound =
      otherQbRounds.reduce((sum, round) => sum + round, 0) /
      otherQbRounds.length;
    const difference = managerQbRound - leagueQbRound;
    if (Math.abs(difference) >= 1) {
      insights.push(
        `Takes a first QB ${Math.abs(difference).toFixed(1)} rounds ${
          difference > 0 ? "later" : "earlier"
        } than the league.`
      );
    }
  }

  return insights.slice(0, 2);
};

export const getDraftStrategyResult = (
  history: ManagerDraftHistory[]
): DraftStrategyResult | null => {
  const completedDrafts = history.filter(
    (draft) =>
      typeof draft.madePlayoffs === "boolean" && draft.positions.length >= 2
  );
  if (completedDrafts.length < 2) return null;

  const groups = new Map<string, ManagerDraftHistory[]>();
  completedDrafts.forEach((draft) => {
    const opening = draft.positions.slice(0, 2).join(" → ");
    const key = `${getDraftLabel(draft)}|${opening}`;
    groups.set(key, [...(groups.get(key) ?? []), draft]);
  });
  const repeated = [...groups.entries()]
    .filter(([, drafts]) => drafts.length >= 2)
    .sort((left, right) => right[1].length - left[1].length)[0];
  if (!repeated) return null;

  const [key, drafts] = repeated;
  const separatorIndex = key.indexOf("|");
  const draftLabel = key.slice(0, separatorIndex);
  const opening = key.slice(separatorIndex + 1);
  const playoffAppearances = drafts.filter(
    (draft) => draft.madePlayoffs
  ).length;
  const points = drafts
    .map((draft) => draft.pointsFor)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );

  return {
    opening,
    seasons: drafts.length,
    playoffAppearances,
    playoffRate: playoffAppearances / drafts.length,
    averagePoints: points.length
      ? points.reduce((sum, value) => sum + value, 0) / points.length
      : null,
    draftLabel,
  };
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
    const label = getDraftLabel(draft);
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

  const positions = history.flatMap(getDraftInsightPositions);
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
      const hasPlayoffResults =
        season.status?.toLowerCase() === "complete" &&
        season.playoffs.length > 0;
      const madePlayoffs = season.playoffs.some(
        (obj) =>
          Number(obj.t1) === roster.rosterId ||
          Number(obj.t2) === roster.rosterId
      );
      const draftHistory = getDraftHistoryForManager(
        season,
        user.id,
        hasPlayoffResults
          ? { madePlayoffs, pointsFor: roster.pointsFor }
          : undefined
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
        madePlayoffs,
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
    status: season.status,
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
