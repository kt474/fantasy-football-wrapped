import type { Player } from "@/types/apiTypes";

export type TradeLabPlayer = Player & {
  projection: number;
  overallRank: number;
};

export type TradeLabRoster = {
  id: number;
  managerName: string;
  players: TradeLabPlayer[];
};

export type TradeDraftPickAsset = {
  id: string;
  season: number;
  round: number;
};

export const positionWeights: Record<string, number> = {
  QB: 0.82,
  RB: 1.3,
  WR: 1.16,
  TE: 1.08,
  K: 0.35,
  DEF: 0.45,
};

export const depthMultipliers = [1, 0.64, 0.38, 0.2];
export const faabValuePerDollar = 0.17;

export const rankToScore = (rank: number) => {
  if (!rank || rank <= 0) return 0;
  return 100 / Math.sqrt(rank + 2);
};

export const getPlayerTradeScore = (player: TradeLabPlayer) => {
  const posScore = rankToScore(player.projection);
  const overallScore = rankToScore(player.overallRank);
  const baseScore = posScore * 0.67 + overallScore * 0.33;
  const positionWeight = positionWeights[player.position] ?? 1;
  return baseScore * positionWeight;
};

export const getPackageTradeValue = (players: TradeLabPlayer[]) => {
  if (players.length === 0) return 0;
  const sortedScores = players
    .map((player) => getPlayerTradeScore(player))
    .sort((a, b) => b - a);

  const total = sortedScores.reduce((sum, score, index) => {
    const multiplier =
      depthMultipliers[index] ?? depthMultipliers[depthMultipliers.length - 1];
    return sum + score * multiplier;
  }, 0);

  return Number(total.toFixed(2));
};

export const getDraftPickTradeValue = (
  pick: TradeDraftPickAsset,
  currentDraftSeason: number
) => {
  const roundBaseValue =
    {
      1: 38,
      2: 24,
      3: 14,
      4: 8,
      5: 5,
      6: 3.2,
      7: 2.2,
      8: 1.6,
      9: 1.2,
      10: 0.9,
      11: 0.7,
      12: 0.55,
    }[pick.round] ?? Math.max(0.4, 7 / (pick.round + 1));

  const seasonGap = Math.max(0, pick.season - currentDraftSeason);
  const seasonMultiplier = Math.max(0.74, 1 - seasonGap * 0.1);

  return Number((roundBaseValue * seasonMultiplier).toFixed(2));
};

export const getFairnessPercent = (sideAValue: number, sideBValue: number) => {
  const maxSide = Math.max(sideAValue, sideBValue, 1);
  return Number(((Math.abs(sideAValue - sideBValue) / maxSide) * 100).toFixed(1));
};

export const getFairnessLabel = (sideAValue: number, sideBValue: number) => {
  if (sideAValue === 0 && sideBValue === 0) {
    return "No assets selected";
  }
  const fairnessPercent = getFairnessPercent(sideAValue, sideBValue);
  if (fairnessPercent <= 10) return "Very fair";
  if (fairnessPercent <= 22) return "Reasonably fair";
  if (fairnessPercent <= 35) return "Slightly uneven";
  return "Very uneven";
};
