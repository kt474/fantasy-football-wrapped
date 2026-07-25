const NON_STARTING_SLOTS = new Set([
  "BN",
  "BENCH",
  "IR",
  "TAXI",
  "RESERVE",
]);

const FLEX_POSITION_GROUPS: Record<string, string[]> = {
  FLEX: ["RB", "WR", "TE"],
  "RB/WR/TE": ["RB", "WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  "WR/TE": ["WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  "RB/WR": ["RB", "WR"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  OP: ["QB", "RB", "WR", "TE"],
  DEF: ["DEF"],
  DST: ["DEF"],
  "D/ST": ["DEF"],
  IDP_FLEX: ["DL", "LB", "DB"],
};

export type ProjectedLineupPlayer = {
  position: string;
  projection: number;
};

export type OptimalProjectedLineupPlayer = ProjectedLineupPlayer & {
  slot: string;
};

export type OptimalProjectedLineup = {
  selected: OptimalProjectedLineupPlayer[];
  positionTotals: Record<string, number>;
  startingSlots: string[];
  total: number;
};

export const getStartingRosterSlots = (rosterPositions: string[] = []) =>
  rosterPositions
    .map((position) => position.toUpperCase())
    .filter((position) => !NON_STARTING_SLOTS.has(position));

export const getEligiblePositionsForSlot = (slot: string) => {
  const normalizedSlot = slot.toUpperCase();
  return FLEX_POSITION_GROUPS[normalizedSlot] ?? [normalizedSlot];
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

export const isSuperflexLeague = (rosterPositions: string[] = []) => {
  const startingSlots = getStartingRosterSlots(rosterPositions);
  return (
    startingSlots.filter((position) => position === "QB").length > 1 ||
    startingSlots.some((position) =>
      ["SUPER_FLEX", "OP"].includes(position)
    )
  );
};

export const getOptimalProjectedLineup = (
  players: ProjectedLineupPlayer[],
  rosterPositions: string[] = []
): OptimalProjectedLineup => {
  const startingSlots = getStartingRosterSlots(rosterPositions);
  const playersByPosition = players.reduce<
    Record<string, ProjectedLineupPlayer[]>
  >((acc, player) => {
    const position = String(player.position ?? "").toUpperCase();
    const projection = Number(player.projection);
    if (!position || !Number.isFinite(projection)) return acc;

    if (!acc[position]) acc[position] = [];
    acc[position].push({ position, projection });
    return acc;
  }, {});

  Object.values(playersByPosition).forEach((positionPlayers) => {
    positionPlayers.sort((a, b) => b.projection - a.projection);
  });

  const positions = Object.keys(playersByPosition).sort();
  const positionIndexes = new Map(
    positions.map((position, index) => [position, index])
  );
  const orderedSlots = [...startingSlots].sort(
    (a, b) =>
      getEligiblePositionsForSlot(a).length -
      getEligiblePositionsForSlot(b).length
  );
  const memo = new Map<string, { score: number; position: string | null }>();

  const findBestScore = (slotIndex: number, usedCounts: number[]): number => {
    if (slotIndex >= orderedSlots.length) return 0;

    const key = `${slotIndex}:${usedCounts.join(",")}`;
    const cached = memo.get(key);
    if (cached) return cached.score;

    let bestScore = findBestScore(slotIndex + 1, usedCounts);
    let bestPosition: string | null = null;

    for (const position of getEligiblePositionsForSlot(
      orderedSlots[slotIndex]
    )) {
      const positionIndex = positionIndexes.get(position);
      if (positionIndex === undefined) continue;

      const nextPlayer = playersByPosition[position][usedCounts[positionIndex]];
      if (!nextPlayer) continue;

      const nextUsedCounts = [...usedCounts];
      nextUsedCounts[positionIndex] += 1;
      const score =
        nextPlayer.projection +
        findBestScore(slotIndex + 1, nextUsedCounts);

      if (score > bestScore) {
        bestScore = score;
        bestPosition = position;
      }
    }

    memo.set(key, { score: bestScore, position: bestPosition });
    return bestScore;
  };

  const usedCounts = positions.map(() => 0);
  const total = findBestScore(0, usedCounts);
  const selected: OptimalProjectedLineupPlayer[] = [];

  orderedSlots.forEach((slot, slotIndex) => {
    const key = `${slotIndex}:${usedCounts.join(",")}`;
    const position = memo.get(key)?.position;
    if (!position) return;

    const positionIndex = positionIndexes.get(position);
    if (positionIndex === undefined) return;

    const player = playersByPosition[position][usedCounts[positionIndex]];
    if (!player) return;

    selected.push({ ...player, slot });
    usedCounts[positionIndex] += 1;
  });

  const positionTotals = selected.reduce<Record<string, number>>(
    (acc, player) => {
      acc[player.position] = (acc[player.position] ?? 0) + player.projection;
      return acc;
    },
    {}
  );

  return {
    selected,
    positionTotals,
    startingSlots,
    total,
  };
};
