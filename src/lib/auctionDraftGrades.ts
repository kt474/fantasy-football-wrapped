export type AuctionGradeInput = {
  key: string;
  adp: number | null;
  projectedPoints: number;
  bid: number;
  draftOrder: number;
};

export type AuctionValueResult = {
  expectedValue: number;
  surplus: number;
};

const normalizedAdp = (adp: number | null) =>
  adp != null && Number.isFinite(adp) && adp > 0
    ? adp
    : Number.POSITIVE_INFINITY;

export const calculateExpectedAuctionValues = (
  players: AuctionGradeInput[]
) => {
  const rankedPlayers = [...players].sort(
    (a, b) =>
      normalizedAdp(a.adp) - normalizedAdp(b.adp) ||
      b.projectedPoints - a.projectedPoints ||
      a.draftOrder - b.draftOrder
  );
  const rankedBids = players
    .map((player) => Math.max(0, Number(player.bid) || 0))
    .sort((a, b) => b - a);

  return new Map<string, AuctionValueResult>(
    rankedPlayers.map((player, index) => {
      const expectedValue = rankedBids[index] ?? 0;
      const bid = Math.max(0, Number(player.bid) || 0);
      return [
        player.key,
        {
          expectedValue,
          surplus: expectedValue - bid,
        },
      ];
    })
  );
};
