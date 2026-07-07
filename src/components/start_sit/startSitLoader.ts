export const START_SIT_CONCURRENCY = 6;

const NON_STARTING_SLOTS = new Set(["BN", "BENCH", "IR", "TAXI", "RESERVE"]);

export type OrderedRosterPlayerEntry = {
  playerId: string;
  rosterSlot: string;
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
