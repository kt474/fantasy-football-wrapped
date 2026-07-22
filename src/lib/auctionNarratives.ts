import type { DraftPick } from "@/types/apiTypes";

export type AuctionPurchase = {
  position: string;
  amount: number;
};

export type AuctionDraftHistory = {
  season: string;
  seasonType: string;
  draftLabel: string;
  purchases: AuctionPurchase[];
  totalSpent: number;
};

export type AuctionSeasonInput = {
  season: string;
  seasonType: string;
  draftType?: string;
  draftPicks?: DraftPick[];
};

export type AuctionManager = {
  displayName: string;
  auctionHistory?: AuctionDraftHistory[];
};

export type AuctionTendencySummary = {
  draftLabel: string;
  trackedDrafts: number;
  averageTotalSpent: number;
  averageTopPurchase: number;
  averageTopPurchaseShare: number;
  averageTopThreeSpendShare: number;
  positionSpendShares: Record<string, number>;
  dominantPosition: string | null;
  dominantPositionShare: number;
  strategyLabel: string;
};

export type AuctionBudgetPlan = {
  budget: number;
  suggestedTopBid: number;
  allocations: Array<{
    position: string;
    amount: number;
    share: number;
  }>;
};

export type AuctionRoomBenchmark = {
  position: (typeof AUCTION_PLAN_POSITIONS)[number];
  averageShare: number;
  averageAmount: number;
  likelySpenders: string[];
};

export type AuctionPositionPriceBand = {
  position: (typeof AUCTION_PLAN_POSITIONS)[number];
  tier: 1 | 2;
  medianAmount: number;
  lowAmount: number;
  highAmount: number;
  sampleSize: number;
};

export const AUCTION_PLAN_POSITIONS = ["RB", "WR", "QB", "TE"] as const;

const isKeeperPick = (keeper: unknown) =>
  keeper === true || keeper === 1 || keeper === "1" || keeper === "true";

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const normalizeBudget = (budget: number) =>
  Math.min(10_000, Math.max(1, Math.round(budget) || 200));

const percentile = (values: number[], percentileValue: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
};

const getPrimaryDraftGroup = (history: AuctionDraftHistory[]) => {
  const groups = new Map<string, AuctionDraftHistory[]>();
  history.forEach((draft) => {
    const label = draft.draftLabel || draft.seasonType || "Auction";
    groups.set(label, [...(groups.get(label) ?? []), draft]);
  });

  return (
    [...groups.entries()].sort(
      (left, right) => right[1].length - left[1].length
    )[0] ?? ["Auction", []]
  );
};

export const getAuctionHistoryForManager = (
  season: AuctionSeasonInput,
  userId: string
): AuctionDraftHistory | undefined => {
  if (
    season.draftType?.toLowerCase() !== "auction" ||
    !season.draftPicks?.length
  ) {
    return undefined;
  }

  const purchases = season.draftPicks
    .filter(
      (pick) =>
        pick.userId === userId &&
        !isKeeperPick(pick.keeper) &&
        Number.isFinite(Number(pick.amount)) &&
        Number(pick.amount) > 0
    )
    .sort((left, right) => left.pickNumber - right.pickNumber)
    .map((pick) => ({
      position: pick.position.trim().toUpperCase() || "OTHER",
      amount: Number(pick.amount),
    }));

  if (!purchases.length) return undefined;

  const isRookieDraft =
    season.seasonType.toLowerCase() === "dynasty" &&
    season.draftPicks.length < 100;

  return {
    season: season.season,
    seasonType: season.seasonType,
    draftLabel: isRookieDraft ? "Rookie" : season.seasonType,
    purchases,
    totalSpent: purchases.reduce((sum, purchase) => sum + purchase.amount, 0),
  };
};

const getDraftPositionShares = (draft: AuctionDraftHistory) => {
  const shares = new Map<string, number>();
  if (draft.totalSpent <= 0) return shares;

  draft.purchases.forEach((purchase) => {
    shares.set(
      purchase.position,
      (shares.get(purchase.position) ?? 0) +
        purchase.amount / draft.totalSpent
    );
  });
  return shares;
};

const getStrategyLabel = (
  topThreeShare: number,
  positionShares: Record<string, number>,
  dominantPosition: string | null,
  dominantShare: number
) => {
  if (topThreeShare >= 0.62) return "Stars & Scrubs";
  if ((positionShares.QB ?? 0) >= 0.16) return "QB Spender";
  if (
    dominantPosition &&
    ["RB", "WR", "TE"].includes(dominantPosition) &&
    dominantShare >= 0.42
  ) {
    return `${dominantPosition} Investor`;
  }
  return "Balanced Bidder";
};

export const getAuctionTendencySummary = (
  history: AuctionDraftHistory[]
): AuctionTendencySummary | null => {
  const [draftLabel, drafts] = getPrimaryDraftGroup(history);
  if (!drafts.length) return null;

  const positions = new Set(
    drafts.flatMap((draft) =>
      draft.purchases.map((purchase) => purchase.position)
    )
  );
  const positionSpendShares = Object.fromEntries(
    [...positions].map((position) => [
      position,
      average(
        drafts.map((draft) => getDraftPositionShares(draft).get(position) ?? 0)
      ),
    ])
  );
  const dominantPositionEntry = AUCTION_PLAN_POSITIONS.map((position) => [
    position,
    positionSpendShares[position] ?? 0,
  ] as const).sort((left, right) => right[1] - left[1])[0];
  const topPurchaseAmounts = drafts.map((draft) =>
    Math.max(0, ...draft.purchases.map((purchase) => purchase.amount))
  );
  const topPurchaseShares = drafts.map((draft, index) =>
    draft.totalSpent > 0 ? topPurchaseAmounts[index] / draft.totalSpent : 0
  );
  const topThreeShares = drafts.map((draft) => {
    const spend = [...draft.purchases]
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 3)
      .reduce((sum, purchase) => sum + purchase.amount, 0);
    return draft.totalSpent > 0 ? spend / draft.totalSpent : 0;
  });
  const averageTopThreeSpendShare = average(topThreeShares);
  const dominantPosition = dominantPositionEntry?.[0] ?? null;
  const dominantPositionShare = dominantPositionEntry?.[1] ?? 0;

  return {
    draftLabel,
    trackedDrafts: drafts.length,
    averageTotalSpent: average(drafts.map((draft) => draft.totalSpent)),
    averageTopPurchase: average(topPurchaseAmounts),
    averageTopPurchaseShare: average(topPurchaseShares),
    averageTopThreeSpendShare,
    positionSpendShares,
    dominantPosition,
    dominantPositionShare,
    strategyLabel: getStrategyLabel(
      averageTopThreeSpendShare,
      positionSpendShares,
      dominantPosition,
      dominantPositionShare
    ),
  };
};

export const getAuctionTendency = (history: AuctionDraftHistory[]) => {
  const summary = getAuctionTendencySummary(history);
  if (!summary) return null;

  if (summary.averageTopThreeSpendShare >= 0.62) {
    return `Puts about ${Math.round(
      summary.averageTopThreeSpendShare * 100
    )}% of auction spend into the three biggest purchases.`;
  }
  return `Directs about ${Math.round(
    summary.dominantPositionShare * 100
  )}% of auction spend to ${summary.dominantPosition}.`;
};

export const getAuctionBudgetPlan = (
  manager: AuctionManager,
  requestedBudget: number
): AuctionBudgetPlan | null => {
  const summary = getAuctionTendencySummary(manager.auctionHistory ?? []);
  if (!summary) return null;

  const budget = normalizeBudget(requestedBudget);
  const coreShare = AUCTION_PLAN_POSITIONS.reduce(
    (sum, position) => sum + (summary.positionSpendShares[position] ?? 0),
    0
  );
  const shares = [
    ...AUCTION_PLAN_POSITIONS.map((position) => ({
      position,
      share: summary.positionSpendShares[position] ?? 0,
    })),
    { position: "Other / endgame", share: Math.max(0, 1 - coreShare) },
  ];
  let allocated = 0;
  const allocations = shares.map((allocation, index) => {
    const amount =
      index === shares.length - 1
        ? budget - allocated
        : Math.floor(budget * allocation.share);
    allocated += amount;
    return { ...allocation, amount };
  });

  return {
    budget,
    suggestedTopBid: Math.round(budget * summary.averageTopPurchaseShare),
    allocations,
  };
};

export const getAuctionPositionPriceBands = (
  managers: AuctionManager[]
): AuctionPositionPriceBand[] => {
  const bidsByTier = new Map<string, number[]>();

  managers.forEach((manager) => {
    const [, drafts] = getPrimaryDraftGroup(manager.auctionHistory ?? []);
    drafts.forEach((draft) => {
      AUCTION_PLAN_POSITIONS.forEach((position) => {
        const bids = draft.purchases
          .filter((purchase) => purchase.position === position)
          .map((purchase) => purchase.amount)
          .sort((left, right) => right - left)
          .slice(0, 2);
        bids.forEach((bid, index) => {
          const key = `${position}:${index + 1}`;
          bidsByTier.set(key, [...(bidsByTier.get(key) ?? []), bid]);
        });
      });
    });
  });

  return AUCTION_PLAN_POSITIONS.flatMap((position) =>
    ([1, 2] as const).flatMap((tier) => {
      const bids = bidsByTier.get(`${position}:${tier}`) ?? [];
      return bids.length
        ? [
            {
              position,
              tier,
              medianAmount: Math.round(percentile(bids, 0.5)),
              lowAmount: Math.round(percentile(bids, 0.25)),
              highAmount: Math.round(percentile(bids, 0.75)),
              sampleSize: bids.length,
            },
          ]
        : [];
    })
  );
};

export const getAuctionRoomBenchmarks = (
  managers: AuctionManager[],
  requestedBudget: number
): AuctionRoomBenchmark[] => {
  const budget = normalizeBudget(requestedBudget);
  const rows = managers.flatMap((manager) => {
    const summary = getAuctionTendencySummary(manager.auctionHistory ?? []);
    return summary ? [{ manager, summary }] : [];
  });
  if (!rows.length) return [];

  return AUCTION_PLAN_POSITIONS.map((position) => {
    const averageShare = average(
      rows.map(({ summary }) => summary.positionSpendShares[position] ?? 0)
    );
    const likelySpenders = [...rows]
      .sort(
        (left, right) =>
          (right.summary.positionSpendShares[position] ?? 0) -
          (left.summary.positionSpendShares[position] ?? 0)
      )
      .slice(0, 2)
      .map(({ manager }) => manager.displayName);

    return {
      position,
      averageShare,
      averageAmount: Math.round(budget * averageShare),
      likelySpenders,
    };
  });
};
