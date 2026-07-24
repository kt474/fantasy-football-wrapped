import type { LeagueFeature } from "@/lib/features";

export type PostPurchaseActivation = {
  title: string;
  description: string;
  actionLabel: string;
  destinationTab: LeagueFeature;
  destinationMode?: "finder";
};

const activationByFeature: Record<string, PostPurchaseActivation> = {
  player_values: {
    title: "Complete Player Values are unlocked",
    description:
      "Open the full league adjusted rankings used by the Trade Lab.",
    actionLabel: "Open Player Values",
    destinationTab: "Player Values",
  },
  trade_finder: {
    title: "Trade Finder is unlocked",
    description:
      "Generate league specific trade ideas designed to improve both lineups.",
    actionLabel: "Open Trade Finder",
    destinationTab: "Trade Lab",
    destinationMode: "finder",
  },
  draft_room: {
    title: "Your Draft Room is unlocked",
    description:
      "Use your league's draft history to plan each round and scout every manager before you're on the clock.",
    actionLabel: "Open your Draft Room",
    destinationTab: "Manager Profiles",
  },
  manager_profiles: {
    title: "Manager Profiles are unlocked",
    description:
      "Explore every manager's tendencies, strengths, and identity across your league history.",
    actionLabel: "Open Manager Profiles",
    destinationTab: "Manager Profiles",
  },
  rivalry_report: {
    title: "Rivalry Reports are unlocked",
    description:
      "Turn your league history into personalized rivalry stories and fresh bragging rights.",
    actionLabel: "Open Rivalry Reports",
    destinationTab: "Manager Profiles",
  },
  premium_report: {
    title: "Premium Reports are unlocked",
    description:
      "Create a weekly newsletter, choose the insights in its share link, or export a video recap.",
    actionLabel: "Open Weekly Report",
    destinationTab: "Weekly Report",
  },
};

const defaultActivation: PostPurchaseActivation = {
  title: "Premium is active",
  description:
    "Your Premium features are ready across every league you manage.",
  actionLabel: "Explore Premium features",
  destinationTab: "Home",
};

export const getPostPurchaseActivation = (
  feature: string
): PostPurchaseActivation => activationByFeature[feature] ?? defaultActivation;
