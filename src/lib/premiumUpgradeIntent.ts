export const premiumUpgradeIntents = [
  "premium_report",
  "manager_profiles",
  "rivalry_report",
  "draft_room",
  "player_values",
  "trade_finder",
] as const;

export type PremiumUpgradeIntent =
  | (typeof premiumUpgradeIntents)[number]
  | "premium";

const upgradeIntentSet = new Set<string>(premiumUpgradeIntents);

export const isPremiumUpgradeIntent = (
  value: unknown
): value is Exclude<PremiumUpgradeIntent, "premium"> =>
  typeof value === "string" && upgradeIntentSet.has(value);

export const normalizePremiumUpgradeIntent = (
  value: unknown
): PremiumUpgradeIntent => (isPremiumUpgradeIntent(value) ? value : "premium");

export const getPremiumUpgradeDescription = (
  intent: PremiumUpgradeIntent
): string => {
  if (intent === "premium_report") {
    return "Create shareable weekly newsletters and video recaps with custom commentary styles.";
  }
  if (intent === "manager_profiles") {
    return "Discover each manager’s tendencies, strengths, and identity across your league history.";
  }
  if (intent === "rivalry_report") {
    return "Turn your league history into personalized rivalry stories and bragging rights.";
  }
  if (intent === "draft_room") {
    return "Use your league’s draft history to plan each round and scout every manager’s tendencies before you are on the clock.";
  }
  if (intent === "player_values") {
    return "See complete league adjusted player rankings, including dynasty and rest of season values.";
  }
  if (intent === "trade_finder") {
    return "Find balanced player deals projected to improve both starting lineups.";
  }
  return "Get access to customizable shared weekly newsletters, video recaps, draft scouting, manager insights, complete player rankings, and a trade finder.";
};
