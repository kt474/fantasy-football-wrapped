import type {
  DynastyPerspective,
  TradeFinderPlayer,
  TradeValuationMode,
} from "@/lib/tradeFinder";

export type TradeValueTierLabel =
  | "Elite"
  | "High"
  | "Starter"
  | "Depth"
  | "Replacement";

type ExplanationOptions = {
  player: TradeFinderPlayer;
  players: TradeFinderPlayer[];
  valuationMode?: TradeValuationMode;
  dynastyPerspective: DynastyPerspective;
};

export const getTradeValueTierLabel = (
  value: number
): TradeValueTierLabel => {
  if (value >= 80) return "Elite";
  if (value >= 60) return "High";
  if (value >= 35) return "Starter";
  if (value > 0) return "Depth";
  return "Replacement";
};

const formatNumber = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

const getRankContext = (player: TradeFinderPlayer) => {
  const hasPositionRank = player.positionRank > 0;
  const hasOverallRank = player.overallRank > 0;

  if (!hasPositionRank && !hasOverallRank) {
    return `currently unranked at ${player.position} and overall`;
  }
  if (!hasPositionRank) {
    return `#${player.overallRank} overall`;
  }
  if (!hasOverallRank) {
    return `${player.position}${player.positionRank}`;
  }
  if (player.positionRank === 1) {
    return `the top ranked ${player.position} and #${player.overallRank} overall`;
  }
  if (player.positionRank <= 3) {
    return `a top three ${player.position} at ${player.position}${player.positionRank}, and #${player.overallRank} overall`;
  }
  if (player.positionRank <= 12) {
    return `inside the top 12 at ${player.position}${player.positionRank}, with a #${player.overallRank} overall rank`;
  }
  return `${player.position}${player.positionRank} and #${player.overallRank} overall`;
};

const getProductionContext = (
  player: TradeFinderPlayer,
  valuationMode?: TradeValuationMode
) => {
  const resultMode = valuationMode === "season results";
  const pointsVerb = resultMode ? "scored" : "projects for";
  const baselineVerb = resultMode ? "finished" : "sits";
  const points = formatNumber(player.projectedPoints);
  const baseline = formatNumber(player.replacementPoints);
  const vorp = formatNumber(Math.abs(player.vorp));

  if (player.vorp > 0) {
    return `${pointsVerb} ${points} points, ${vorp} above this league's ${player.position} replacement mark of ${baseline}`;
  }
  if (player.vorp < 0) {
    return `${pointsVerb} ${points} points, ${vorp} below this league's ${player.position} replacement mark of ${baseline}`;
  }
  return `${pointsVerb} ${points} points and ${baselineVerb} right at this league's ${player.position} replacement mark`;
};

const getOrdinal = (value: number) => {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
};

const getPositionVorpContext = (
  player: TradeFinderPlayer,
  players: TradeFinderPlayer[]
) => {
  const peers = players
    .filter(
      (candidate) =>
        candidate.position === player.position &&
        Number.isFinite(candidate.vorp)
    )
    .sort(
      (a, b) =>
        b.vorp - a.vorp ||
        b.tradeValue - a.tradeValue ||
        a.overallRank - b.overallRank
    );

  if (peers.length < 2) return null;

  const playerIndex = peers.findIndex(
    (candidate) => candidate.playerId === player.playerId
  );
  if (playerIndex < 0) return null;

  const sortedVorp = peers
    .map((candidate) => candidate.vorp)
    .sort((a, b) => a - b);
  const middle = Math.floor(sortedVorp.length / 2);
  const median =
    sortedVorp.length % 2 === 0
      ? (sortedVorp[middle - 1] + sortedVorp[middle]) / 2
      : sortedVorp[middle];
  const medianDifference = player.vorp - median;
  const rank =
    peers.filter((candidate) => candidate.vorp > player.vorp).length + 1;
  const percentile = Math.max(
    1,
    Math.ceil((rank / peers.length) * 100)
  );
  const medianContext =
    Math.abs(medianDifference) < 1
      ? "is in line with the position median"
      : `is ${formatNumber(Math.abs(medianDifference))} points ${
          medianDifference > 0 ? "above" : "below"
        } the position median`;
  const positionGroup =
    player.position === "DEF" ? "defenses" : `${player.position}s`;

  return {
    rank,
    percentile,
    medianDifference,
    positionGroup,
    text: `That VORP ranks ${getOrdinal(rank)} among ${
      peers.length
    } rostered ${positionGroup} and ${medianContext}.`,
  };
};

const getNearbyAlternativeContext = (
  player: TradeFinderPlayer,
  players: TradeFinderPlayer[]
) => {
  const tolerance = Math.max(3, Math.abs(player.vorp) * 0.1);
  const alternatives = players
    .filter(
      (candidate) =>
        candidate.playerId !== player.playerId &&
        candidate.position === player.position &&
        Number.isFinite(candidate.vorp) &&
        player.tradeValue - candidate.tradeValue >= 5 &&
        candidate.vorp >= player.vorp - tolerance
    )
    .sort(
      (a, b) =>
        Math.abs(a.vorp - player.vorp) - Math.abs(b.vorp - player.vorp) ||
        a.tradeValue - b.tradeValue
    );
  const alternative = alternatives[0];
  if (!alternative) return null;

  const alternativeName =
    alternative.name || `${alternative.team} Defense`;
  const valueSavings = player.tradeValue - alternative.tradeValue;
  const vorpDifference = Math.abs(player.vorp - alternative.vorp);

  if (alternative.vorp >= player.vorp) {
    return `${alternativeName} has equal or better VORP with a trade value ${formatNumber(
      valueSavings
    )} points lower, creating meaningful price competition at ${player.position}.`;
  }

  return `${alternativeName} is within ${formatNumber(
    vorpDifference
  )} VORP points with a trade value ${formatNumber(
    valueSavings
  )} points lower, offering a nearby lower priced alternative at ${player.position}.`;
};

const getTierBoundaryContext = (player: TradeFinderPlayer) => {
  const value = player.tradeValue;
  const currentTier = getTradeValueTierLabel(value);
  const nextTier =
    value < 0.1
      ? { label: "Depth", threshold: 0.1 }
      : value < 35
        ? { label: "Starter", threshold: 35 }
        : value < 60
          ? { label: "High", threshold: 60 }
          : value < 80
            ? { label: "Elite", threshold: 80 }
            : null;
  const lowerTier =
    value >= 80
      ? { label: "High", threshold: 80 }
      : value >= 60
        ? { label: "Starter", threshold: 60 }
        : value >= 35
          ? { label: "Depth", threshold: 35 }
          : value > 0
            ? { label: "Replacement", threshold: 0 }
            : null;

  if (nextTier) {
    const distance = nextTier.threshold - value;
    if (distance > 0 && distance <= 5) {
      return {
        priority: 60,
        text: `The rating is only ${formatNumber(
          distance
        )} points short of ${nextTier.label}, placing it near the upper edge of the ${currentTier} tier.`,
      };
    }
  }

  if (lowerTier) {
    const distance = value - lowerTier.threshold;
    if (distance >= 0 && distance <= 3) {
      const distanceContext =
        distance < 0.05
          ? "right at"
          : `only ${formatNumber(distance)} points above`;
      return {
        priority: 55,
        text: `The rating sits ${distanceContext} the boundary between ${currentTier} and ${lowerTier.label}.`,
      };
    }
  }

  return null;
};

const getDynastyComparison = (
  player: TradeFinderPlayer,
  dynastyPerspective: DynastyPerspective
) => {
  const adp = Number(player.dynastyAdp);
  const hasAdp = Number.isFinite(adp) && adp > 0;
  const perspectiveLabel = {
    balanced: "balanced",
    contender: "win now",
    rebuilder: "long term",
  }[dynastyPerspective];
  const perspectiveContext = `The ${perspectiveLabel} setting blends that league fit with long term market value.`;

  if (!hasAdp || player.overallRank <= 0) {
    return {
      direction: "missing" as const,
      difference: 0,
      text: `No reliable market ADP is available, so the ${perspectiveLabel} setting leans on league fit and projected production.`,
    };
  }

  const roundedAdp = Math.round(adp);
  const rankDifference = roundedAdp - player.overallRank;

  if (rankDifference >= 12) {
    return {
      direction: "league" as const,
      difference: rankDifference,
      text: `The league adjusted rank is ${rankDifference} spots ahead of dynasty market ADP #${roundedAdp}, signaling a better fit here than the broader market suggests. ${perspectiveContext}`,
    };
  }
  if (rankDifference <= -12) {
    return {
      direction: "market" as const,
      difference: Math.abs(rankDifference),
      text: `Dynasty market ADP #${roundedAdp} is ${Math.abs(
        rankDifference
      )} spots ahead of the league adjusted rank, so market appeal is stronger than the immediate league fit. ${perspectiveContext}`,
    };
  }
  return {
    direction: "aligned" as const,
    difference: Math.abs(rankDifference),
    text: `Dynasty market ADP #${roundedAdp} broadly agrees with the league adjusted rank. ${perspectiveContext}`,
  };
};

export const buildTradeValueExplanation = ({
  player,
  players,
  valuationMode,
  dynastyPerspective,
}: ExplanationOptions) => {
  const playerName = player.name || `${player.team} Defense`;
  const value = formatNumber(player.tradeValue);
  const tier = getTradeValueTierLabel(player.tradeValue).toLowerCase();
  const rankContext = getRankContext(player);
  const productionContext = getProductionContext(player, valuationMode);
  const positionContext = getPositionVorpContext(player, players);
  const nearbyAlternative = getNearbyAlternativeContext(player, players);
  const tierBoundary = getTierBoundaryContext(player);
  const dynastyComparison =
    valuationMode === "dynasty"
      ? getDynastyComparison(player, dynastyPerspective)
      : null;
  let headline: string;

  if (dynastyComparison?.direction === "league") {
    headline = `${playerName}'s ${value} ${tier} rating stands out more in this league than in the broader dynasty market.`;
  } else if (dynastyComparison?.direction === "market") {
    headline = `${playerName}'s ${value} ${tier} rating receives more support from dynasty market demand than from immediate league fit.`;
  } else if (player.vorp <= 0) {
    headline = `Limited separation from replacement is the main constraint on ${playerName}'s ${value} ${tier} rating.`;
  } else if (nearbyAlternative) {
    headline = `${playerName} carries a ${value} ${tier} rating, but similar production is available elsewhere at the position.`;
  } else if (tierBoundary) {
    headline = `${playerName}'s ${value} rating lands near an important tier boundary rather than squarely in the middle of ${tier}.`;
  } else if (positionContext?.rank === 1) {
    headline = `${playerName} leads all rostered ${positionContext.positionGroup} in VORP, a key reason for the ${value} ${tier} rating.`;
  } else if (
    positionContext &&
    positionContext.percentile <= 20 &&
    positionContext.medianDifference > 0
  ) {
    headline = `${playerName}'s production advantage over the positional median is the clearest strength behind the ${value} ${tier} rating.`;
  } else if (player.positionRank === 1) {
    headline = `${playerName}'s place at the top of the ${player.position} rankings gives strong support to the ${value} ${tier} rating.`;
  } else if (player.positionRank === 2) {
    headline = `A ${player.position}2 standing is an important source of ${playerName}'s ${value} ${tier} rating.`;
  } else if (player.positionRank === 3) {
    headline = `${playerName}'s top three standing at ${player.position} adds meaningful weight to the ${value} ${tier} rating.`;
  } else {
    headline = `${playerName}'s ${value} ${tier} rating reflects a balanced profile rather than one dominant signal.`;
  }

  const evidence = `${playerName} is ${rankContext} and ${productionContext}.`;
  const comparativeSignals: Array<{
    priority: number;
    text: string;
  }> = [];

  if (positionContext) {
    comparativeSignals.push({
      priority:
        positionContext.percentile <= 20 || positionContext.percentile >= 80
          ? 85
          : 65,
      text: positionContext.text,
    });
  }
  if (dynastyComparison) {
    comparativeSignals.push({
      priority:
        dynastyComparison.direction === "league" ||
        dynastyComparison.direction === "market"
          ? 95 + Math.min(dynastyComparison.difference, 30)
          : dynastyComparison.direction === "missing"
            ? 45
            : 50,
      text: dynastyComparison.text,
    });
  }
  if (nearbyAlternative) {
    comparativeSignals.push({
      priority: 75,
      text: nearbyAlternative,
    });
  }
  if (tierBoundary) {
    comparativeSignals.push(tierBoundary);
  }

  const supportingContext = comparativeSignals
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2)
    .map((signal) => signal.text)
    .join(" ");

  return [headline, evidence, supportingContext].filter(Boolean).join(" ");
};
