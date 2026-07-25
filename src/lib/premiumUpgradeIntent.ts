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
const upgradeTitles: Record<PremiumUpgradeIntent, string> = {
  premium: "Premium",
  premium_report: "Premium Reports",
  manager_profiles: "Manager Profiles",
  rivalry_report: "Rivalry Reports",
  draft_room: "Draft Room",
  player_values: "Player Values",
  trade_finder: "Trade Finder",
};

export const isPremiumUpgradeIntent = (
  value: unknown
): value is Exclude<PremiumUpgradeIntent, "premium"> =>
  typeof value === "string" && upgradeIntentSet.has(value);

export const normalizePremiumUpgradeIntent = (
  value: unknown
): PremiumUpgradeIntent => (isPremiumUpgradeIntent(value) ? value : "premium");

export const getPremiumUpgradeTitle = (intent: PremiumUpgradeIntent) =>
  upgradeTitles[intent];

export const getPremiumUpgradeDescription = (
  intent: PremiumUpgradeIntent
): string => {
  if (intent === "premium_report") {
    return "Turn every week into a shareable league story with deeper matchup coverage, custom commentary, and video recaps.";
  }
  if (intent === "manager_profiles") {
    return "See what makes every manager unique through the tendencies, strengths, and identity they have built over time.";
  }
  if (intent === "rivalry_report") {
    return "Relive the matchups and milestones behind every rivalry and settle who owns the bragging rights.";
  }
  if (intent === "draft_room") {
    return "Walk into your draft with a plan built from your league’s history and every manager’s tendencies.";
  }
  if (intent === "player_values") {
    return "Know what every rostered player is worth in your league so you can compare options and make smarter moves.";
  }
  if (intent === "trade_finder") {
    return "Turn your league’s real rosters into balanced trade ideas designed to make both starting lineups better.";
  }
  return "Bring your league to life with personalized content, smarter insights, and more reasons to stay engaged all season long.";
};
