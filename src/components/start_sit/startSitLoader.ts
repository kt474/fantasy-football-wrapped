export const START_SIT_CONCURRENCY = 6;

export const getOrderedRosterPlayerIds = (
  players: string[],
  starters: string[][] | undefined,
  week: number
) => {
  const weekStarters = starters?.[Math.max(0, week - 1)] ?? [];
  const starterSet = new Set(weekStarters);

  return [
    ...weekStarters,
    ...players.filter((playerId) => !starterSet.has(playerId)),
  ];
};
