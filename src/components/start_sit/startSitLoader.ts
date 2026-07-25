export const START_SIT_CONCURRENCY = 6;

const NON_STARTING_SLOTS = new Set(["BN", "BENCH", "IR", "TAXI", "RESERVE"]);

export type OrderedRosterPlayerEntry = {
  playerId: string;
  rosterSlot: string;
};

export type StartSitInsightCandidate = {
  id: string;
  position?: string;
  rosterSlot?: string;
  projection: number;
  recentAverage: number;
  recentFloor: number;
  averageRank: number;
  tradeValue?: number;
};

export type StartSitInsight = {
  id: string;
  startId: string;
  sitId: string;
  projectionGap: number;
  recentGap: number;
  valueGap: number | null;
  scoreGap: number;
  confidence: "Strong start" | "Start" | "Lean start";
};

type StartSitWeekInfo = {
  currentWeek?: number;
  lastScoredWeek?: number;
  status?: string;
};

export const getStartingRosterSlots = (rosterPositions: string[] = []) =>
  rosterPositions.filter(
    (position) => !NON_STARTING_SLOTS.has(position.toUpperCase())
  );

export const getEligiblePositionsForSlot = (slot: string) => {
  const normalizedSlot = slot.toUpperCase();
  const positionGroups: Record<string, string[]> = {
    FLEX: ["RB", "WR", "TE"],
    "RB/WR/TE": ["RB", "WR", "TE"],
    REC_FLEX: ["WR", "TE"],
    "WR/TE": ["WR", "TE"],
    WRRB_FLEX: ["RB", "WR"],
    "RB/WR": ["RB", "WR"],
    SUPER_FLEX: ["QB", "RB", "WR", "TE"],
    OP: ["QB", "RB", "WR", "TE"],
  };

  return positionGroups[normalizedSlot] ?? [normalizedSlot];
};

export const canPlayerFillLineupSlot = (
  playerPosition: string | undefined,
  slot: string | undefined
) => {
  if (!playerPosition || !slot) return false;

  return getEligiblePositionsForSlot(slot).includes(
    playerPosition.toUpperCase()
  );
};

const getCandidateScore = (player: StartSitInsightCandidate) => {
  const rankBonus =
    player.averageRank > 0
      ? Math.max(0, 48 - player.averageRank) / 12
      : 0;
  const valueBonus =
    typeof player.tradeValue === "number" ? player.tradeValue * 0.025 : 0;

  return (
    player.projection * 0.55 +
    player.recentAverage * 0.3 +
    player.recentFloor * 0.1 +
    rankBonus +
    valueBonus
  );
};

export const buildStartSitInsights = (
  players: StartSitInsightCandidate[],
  starterCount: number,
  limit = 5
): StartSitInsight[] => {
  const starters = players.slice(0, starterCount);
  const bench = players.slice(starterCount);
  const usedStarterIds = new Set<string>();
  const usedBenchIds = new Set<string>();

  return bench
    .flatMap((benchPlayer) => {
      if (benchPlayer.projection <= 0) return [];

      return starters
        .filter((starter) => {
          if (!benchPlayer.position || !starter.position) return false;
          return starter.rosterSlot
            ? canPlayerFillLineupSlot(
                benchPlayer.position,
                starter.rosterSlot
              )
            : benchPlayer.position === starter.position;
        })
        .map((starter) => {
          const projectionGap = benchPlayer.projection - starter.projection;
          const recentGap =
            benchPlayer.recentAverage - starter.recentAverage;
          const valueGap =
            typeof benchPlayer.tradeValue === "number" &&
            typeof starter.tradeValue === "number"
              ? benchPlayer.tradeValue - starter.tradeValue
              : null;
          const scoreGap =
            getCandidateScore(benchPlayer) - getCandidateScore(starter);
          const hasWeeklyEdge = projectionGap >= 0.75;
          const hasFormEdge = scoreGap >= 1 && projectionGap >= -0.5;
          const hasValueTiebreaker =
            valueGap !== null &&
            valueGap >= 6 &&
            projectionGap >= -0.5 &&
            recentGap >= -1;

          if (!hasWeeklyEdge && !hasFormEdge && !hasValueTiebreaker) {
            return null;
          }

          const alignedSignals =
            Number(projectionGap >= 1) +
            Number(recentGap >= 0) +
            Number(valueGap !== null && valueGap >= 0);
          const confidence: StartSitInsight["confidence"] =
            (projectionGap >= 3 && recentGap >= 0) ||
            (projectionGap >= 2 && alignedSignals >= 2)
              ? "Strong start"
              : projectionGap >= 1.25 || alignedSignals >= 2
                ? "Start"
                : "Lean start";

          return {
            id: `${benchPlayer.id}-${starter.id}`,
            startId: benchPlayer.id,
            sitId: starter.id,
            projectionGap,
            recentGap,
            valueGap,
            scoreGap,
            confidence,
          } satisfies StartSitInsight;
        })
        .filter((insight): insight is StartSitInsight => insight !== null);
    })
    .sort(
      (a, b) =>
        b.scoreGap - a.scoreGap || b.projectionGap - a.projectionGap
    )
    .filter((insight) => {
      if (
        usedStarterIds.has(insight.sitId) ||
        usedBenchIds.has(insight.startId)
      ) {
        return false;
      }

      usedStarterIds.add(insight.sitId);
      usedBenchIds.add(insight.startId);
      return true;
    })
    .slice(0, limit);
};

export const getStartSitWeek = (league?: StartSitWeekInfo | null) => {
  const lastScoredWeek = Number(league?.lastScoredWeek ?? 0);
  if (!Number.isFinite(lastScoredWeek) || lastScoredWeek <= 0) {
    return 1;
  }

  if (league?.status === "complete") {
    return lastScoredWeek;
  }

  const currentWeek = Number(league?.currentWeek ?? 0);
  if (!Number.isFinite(currentWeek) || currentWeek <= 0) {
    return lastScoredWeek;
  }

  return Math.max(currentWeek, lastScoredWeek);
};

export const getRecentStartSitWeekLabel = (
  league: StartSitWeekInfo | undefined | null,
  index: number
) => {
  const lastScoredWeek = Number(league?.lastScoredWeek ?? 0);
  const cardWeek = lastScoredWeek - index;

  return Number.isFinite(cardWeek) && cardWeek > 0 ? `Week ${cardWeek}` : "N/A";
};

export const getOrderedRosterPlayerEntries = (
  players: string[],
  starters: string[][] | undefined,
  week: number,
  rosterPositions: string[] = []
): OrderedRosterPlayerEntry[] => {
  const weekStarters = starters?.[Math.max(0, week - 1)] ?? [];
  const starterSet = new Set(weekStarters);
  const starterSlots = getStartingRosterSlots(rosterPositions);

  return [
    ...weekStarters.map((playerId, index) => ({
      playerId,
      rosterSlot: starterSlots[index] ?? "",
    })),
    ...players
      .filter((playerId) => !starterSet.has(playerId))
      .map((playerId) => ({
        playerId,
        rosterSlot: "BN",
      })),
  ];
};

export const getOrderedRosterPlayerIds = (
  players: string[],
  starters: string[][] | undefined,
  week: number
) => {
  return getOrderedRosterPlayerEntries(players, starters, week).map(
    (entry) => entry.playerId
  );
};
