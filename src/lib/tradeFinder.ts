import {
  getFairnessPercent,
  getPackageTradeValue,
  getPlayerTradeScore,
  type TradeLabPlayer,
  type TradeLabRoster,
} from "@/lib/tradeValues";

export type TradeFinderGoal = "balanced" | "starters" | "depth";

export type TradeRecommendation = {
  id: string;
  targetRosterId: number;
  targetManagerName: string;
  sourceSends: TradeLabPlayer[];
  targetSends: TradeLabPlayer[];
  sourceValue: number;
  targetValue: number;
  fairnessPercent: number;
  score: number;
  headline: string;
  rationale: string;
};

type FindTradeCandidatesOptions = {
  rosters: TradeLabRoster[];
  sourceRosterId: number | null;
  rosterPositions?: string[];
  targetPosition?: string;
  goal?: TradeFinderGoal;
  maxResults?: number;
};

const tradePositions = ["QB", "RB", "WR", "TE"] as const;
const startingPositionDefaults: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DEF: 1,
};

const getStarterTargets = (rosterPositions: string[] = []) => {
  const targets = { ...startingPositionDefaults };

  if (rosterPositions.length === 0) {
    return targets;
  }

  const filtered = rosterPositions.filter(
    (slot) => !["BN", "BE", "IR", "TAXI"].includes(slot)
  );
  const explicitCounts: Record<string, number> = {};
  filtered.forEach((slot) => {
    if (slot in startingPositionDefaults) {
      explicitCounts[slot] = (explicitCounts[slot] || 0) + 1;
    }
    if (slot === "SUPER_FLEX") {
      explicitCounts.QB = (explicitCounts.QB || 0) + 0.6;
    }
    if (slot === "FLEX" || slot === "REC_FLEX") {
      explicitCounts.RB = (explicitCounts.RB || 0) + 0.35;
      explicitCounts.WR = (explicitCounts.WR || 0) + 0.45;
      explicitCounts.TE = (explicitCounts.TE || 0) + 0.2;
    }
  });

  return {
    ...targets,
    ...explicitCounts,
  };
};

const groupPlayersByPosition = (players: TradeLabPlayer[]) => {
  return players.reduce(
    (groups, player) => {
      if (!groups[player.position]) {
        groups[player.position] = [];
      }
      groups[player.position].push(player);
      return groups;
    },
    {} as Record<string, TradeLabPlayer[]>
  );
};

const sortByTradeScore = (players: TradeLabPlayer[]) => {
  return [...players].sort(
    (a, b) => getPlayerTradeScore(b) - getPlayerTradeScore(a)
  );
};

const getNeedScore = (
  roster: TradeLabRoster,
  position: string,
  starterTargets: Record<string, number>
) => {
  const players = sortByTradeScore(
    roster.players.filter((player) => player.position === position)
  );
  const targetCount = Math.max(1, Math.ceil(starterTargets[position] ?? 1));
  const starterPool = players.slice(0, targetCount);
  const depthPool = players.slice(targetCount, targetCount + 2);
  const starterStrength = starterPool.reduce(
    (sum, player) => sum + getPlayerTradeScore(player),
    0
  );
  const depthStrength = depthPool.reduce(
    (sum, player) => sum + getPlayerTradeScore(player) * 0.45,
    0
  );
  const expectedStrength = targetCount * 9.5;
  const missingPenalty = Math.max(0, targetCount - starterPool.length) * 8;

  return Math.max(
    0,
    expectedStrength - starterStrength - depthStrength + missingPenalty
  );
};

const getSurplusPlayers = (
  roster: TradeLabRoster,
  starterTargets: Record<string, number>
) => {
  const byPosition = groupPlayersByPosition(roster.players);
  return Object.values(byPosition)
    .flatMap((players) => {
      const sorted = sortByTradeScore(players);
      const keepCount = Math.max(
        1,
        Math.ceil(starterTargets[sorted[0]?.position ?? ""] ?? 1)
      );
      return sorted.slice(keepCount);
    })
    .sort((a, b) => getPlayerTradeScore(b) - getPlayerTradeScore(a));
};

const getTopPlayers = (roster: TradeLabRoster, targetPosition?: string) => {
  return sortByTradeScore(
    roster.players.filter(
      (player) =>
        tradePositions.includes(player.position as (typeof tradePositions)[number]) &&
        (!targetPosition || player.position === targetPosition)
    )
  );
};

const getSimplicityScore = (sourceCount: number, targetCount: number) => {
  const assetCount = sourceCount + targetCount;
  if (assetCount <= 2) return 10;
  if (assetCount === 3) return 7;
  return 4;
};

const getRecommendationScore = ({
  sourceNeedGain,
  targetNeedGain,
  fairnessPercent,
  sourceCount,
  targetCount,
  goal,
}: {
  sourceNeedGain: number;
  targetNeedGain: number;
  fairnessPercent: number;
  sourceCount: number;
  targetCount: number;
  goal: TradeFinderGoal;
}) => {
  const fairnessScore = Math.max(0, 30 - fairnessPercent);
  const sourceWeight = goal === "starters" ? 1.25 : goal === "depth" ? 0.85 : 1;
  const targetWeight = goal === "depth" ? 1.05 : 1;

  return Number(
    (
      fairnessScore * 0.36 +
      sourceNeedGain * sourceWeight * 0.34 +
      targetNeedGain * targetWeight * 0.2 +
      getSimplicityScore(sourceCount, targetCount) * 0.1
    ).toFixed(2)
  );
};

const formatNames = (players: TradeLabPlayer[]) => {
  return players
    .map((player) => player.name || `${player.team} Defense`)
    .join(" + ");
};

const makeRecommendation = ({
  sourceSends,
  targetSends,
  targetRoster,
  sourceNeedGain,
  targetNeedGain,
  goal,
}: {
  sourceSends: TradeLabPlayer[];
  targetSends: TradeLabPlayer[];
  targetRoster: TradeLabRoster;
  sourceNeedGain: number;
  targetNeedGain: number;
  goal: TradeFinderGoal;
}): TradeRecommendation | null => {
  const sourceValue = getPackageTradeValue(sourceSends);
  const targetValue = getPackageTradeValue(targetSends);
  if (sourceValue <= 0 || targetValue <= 0) return null;

  const fairnessPercent = getFairnessPercent(sourceValue, targetValue);
  if (fairnessPercent > 30) return null;

  const score = getRecommendationScore({
    sourceNeedGain,
    targetNeedGain,
    fairnessPercent,
    sourceCount: sourceSends.length,
    targetCount: targetSends.length,
    goal,
  });

  return {
    id: `${targetRoster.id}:${sourceSends.map((p) => p.player_id).join("-")}:${targetSends.map((p) => p.player_id).join("-")}`,
    targetRosterId: targetRoster.id,
    targetManagerName: targetRoster.managerName,
    sourceSends,
    targetSends,
    sourceValue,
    targetValue,
    fairnessPercent,
    score,
    headline: `Send ${formatNames(sourceSends)} for ${formatNames(targetSends)}`,
    rationale: `Targets your ${targetSends[0]?.position ?? "roster"} need while giving ${targetRoster.managerName} help at ${sourceSends.map((player) => player.position).join("/")}.`,
  };
};

export const findTradeCandidates = ({
  rosters,
  sourceRosterId,
  rosterPositions = [],
  targetPosition,
  goal = "balanced",
  maxResults = 8,
}: FindTradeCandidatesOptions) => {
  const sourceRoster = rosters.find((roster) => roster.id === sourceRosterId);
  if (!sourceRoster) return [];

  const starterTargets = getStarterTargets(rosterPositions);
  const sourceSurplus = getSurplusPlayers(sourceRoster, starterTargets);
  const recommendations = new Map<string, TradeRecommendation>();

  rosters
    .filter((roster) => roster.id !== sourceRoster.id)
    .forEach((targetRoster) => {
      const targetPlayers = getTopPlayers(targetRoster, targetPosition).slice(
        0,
        8
      );
      const sourcePlayers = sourceSurplus.slice(0, 10);

      sourcePlayers.forEach((sourcePlayer) => {
        targetPlayers.forEach((targetPlayer) => {
          const sourceNeedGain = getNeedScore(
            sourceRoster,
            targetPlayer.position,
            starterTargets
          );
          const targetNeedGain = getNeedScore(
            targetRoster,
            sourcePlayer.position,
            starterTargets
          );
          if (sourceNeedGain <= 0.5 || targetNeedGain <= 0.5) return;

          const recommendation = makeRecommendation({
            sourceSends: [sourcePlayer],
            targetSends: [targetPlayer],
            targetRoster,
            sourceNeedGain,
            targetNeedGain,
            goal,
          });
          if (recommendation) recommendations.set(recommendation.id, recommendation);
        });
      });

      for (let firstIndex = 0; firstIndex < sourcePlayers.length; firstIndex += 1) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < sourcePlayers.length;
          secondIndex += 1
        ) {
          const sourcePackage = [
            sourcePlayers[firstIndex],
            sourcePlayers[secondIndex],
          ];
          targetPlayers.forEach((targetPlayer) => {
            const sourceNeedGain = getNeedScore(
              sourceRoster,
              targetPlayer.position,
              starterTargets
            );
            const targetNeedGain = sourcePackage.reduce(
              (sum, player) =>
                sum + getNeedScore(targetRoster, player.position, starterTargets),
              0
            );
            if (sourceNeedGain <= 0.5 || targetNeedGain <= 1) return;

            const recommendation = makeRecommendation({
              sourceSends: sourcePackage,
              targetSends: [targetPlayer],
              targetRoster,
              sourceNeedGain,
              targetNeedGain,
              goal,
            });
            if (recommendation) recommendations.set(recommendation.id, recommendation);
          });
        }
      }
    });

  return [...recommendations.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};
