import type { FantasyProviderId } from "@/types/types";

export const providerCapabilities = {
  sleeper: {
    usernameLookup: true,
    tabs: new Set([
      "Home",
      "Standings",
      "Power Rankings",
      "Expected Wins",
      "Roster Management",
      "Playoffs",
      "Weekly Report",
      "Start/Sit",
      "Schedule Simulator",
      "Trade Lab",
      "Draft",
      "League History",
      "Manager Profiles",
      "Wrapped",
    ]),
  },
  espn: {
    usernameLookup: false,
    tabs: new Set([
      "Home",
      "Standings",
      "Expected Wins",
      "Schedule Simulator",
    ]),
  },
} as const satisfies Record<
  FantasyProviderId,
  {
    usernameLookup: boolean;
    tabs: Set<string>;
  }
>;

export const isTabSupported = (
  provider: FantasyProviderId,
  tab: string
) => providerCapabilities[provider].tabs.has(tab);
