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
    return "Create shareable weekly newsletters and video recaps with custom commentary styles for every league you manage.";
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
    return "Unlock complete league adjusted player rankings, including dynasty and rest-of-season values, for every league you manage.";
  }
  if (intent === "trade_finder") {
    return "Generate league specific one-for-one and two-for-one trade ideas designed to improve both lineups.";
  }
  return "Get customizable shared weekly newsletters, video recaps, draft scouting, manager profiles, rivalry reports, complete player rankings, and Trade Finder for every league you manage.";
};
