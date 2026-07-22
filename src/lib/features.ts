export const leagueFeatures = [
  { id: "Home" },
  { id: "Standings" },
  { id: "Power Rankings" },
  { id: "Expected Wins" },
  { id: "Roster Management" },
  { id: "Weekly Report", unavailableForGuillotine: true },
  { id: "Playoffs" },
  { id: "Start/Sit" },
  { id: "Season Forecast", unavailableForGuillotine: true },
  { id: "Trade Lab" },
  { id: "Draft" },
  { id: "League History" },
  { id: "Manager Profiles", unavailableForGuillotine: true },
  { id: "Wrapped" },
  { id: "ESPN", hiddenFromNavigation: true },
] as const;

export type LeagueFeature = (typeof leagueFeatures)[number]["id"];

export const customizableLeagueFeatures = [
  {
    id: "Expected Wins",
    description: "Expected records, luck, and schedule analysis.",
  },
  {
    id: "Start/Sit",
    description: "Weekly lineup recommendations.",
  },
  {
    id: "Season Forecast",
    description: "Rest-of-season schedule simulations.",
  },
  {
    id: "Trade Lab",
    description: "Trade comparisons and analysis.",
  },
  {
    id: "Manager Profiles",
    description: "Detailed manager tendencies and identities.",
  },
] as const satisfies ReadonlyArray<{
  id: LeagueFeature;
  description: string;
}>;

const customizableLeagueFeatureIds = new Set<LeagueFeature>(
  customizableLeagueFeatures.map(({ id }) => id)
);

export const isCustomizableLeagueFeature = (
  value: unknown
): value is (typeof customizableLeagueFeatures)[number]["id"] =>
  typeof value === "string" &&
  customizableLeagueFeatureIds.has(value as LeagueFeature);

const leagueFeatureIds = new Set<string>(
  leagueFeatures.map((feature) => feature.id)
);

export const isLeagueFeature = (value: string): value is LeagueFeature =>
  leagueFeatureIds.has(value);

export const normalizeLeagueFeature = (value: string): LeagueFeature => {
  if (value === "Schedule Simulator") return "Season Forecast";
  return isLeagueFeature(value) ? value : "Standings";
};

export const sidebarLeagueFeatures = leagueFeatures.filter(
  (feature) => !("hiddenFromNavigation" in feature)
);

export const isLeagueFeatureAvailable = (
  featureId: LeagueFeature,
  seasonType: string
) => {
  const feature = leagueFeatures.find(({ id }) => id === featureId);
  return !(
    seasonType === "Guillotine" &&
    feature &&
    "unavailableForGuillotine" in feature
  );
};
