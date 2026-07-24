import type { LeagueFeature } from "@/lib/features";

export const leagueFeatureDestinations = [
  "player_values",
  "trade_finder",
] as const;

export type LeagueFeatureDestination =
  (typeof leagueFeatureDestinations)[number];

const destinationTabs = {
  player_values: "Player Values",
  trade_finder: "Trade Lab",
} as const satisfies Record<LeagueFeatureDestination, LeagueFeature>;

export const getLeagueFeatureDestinationTab = (
  value: unknown
): LeagueFeature | null => {
  const destination = Array.isArray(value) ? value[0] : value;
  if (
    typeof destination !== "string" ||
    !leagueFeatureDestinations.includes(
      destination as LeagueFeatureDestination
    )
  ) {
    return null;
  }

  return destinationTabs[destination as LeagueFeatureDestination];
};
