import type {
  PremiumReport,
  SharedReportAward,
  SharedReportCardId,
  SharedReportCards,
  SharedReportMatchup,
  SharedReportPlayerScore,
  SharedReportStandingMove,
  SharedReportTeamScore,
  SharedReportWaiverImpact,
} from "@/types/types";

export const SHARED_REPORT_CARD_OPTIONS: Array<{
  id: SharedReportCardId;
  title: string;
  description: string;
}> = [
  {
    id: "matchup_results",
    title: "Weekly scoreboard",
    description: "Every head-to-head score and winner.",
  },
  {
    id: "weekly_awards",
    title: "Weekly awards",
    description: "The week's most memorable wins, losses, and decisions.",
  },
  {
    id: "player_leaders",
    title: "Player leaders",
    description: "Best, worst, and benched player performances.",
  },
  {
    id: "team_scoring",
    title: "Team scoring leaderboard",
    description: "Every team ranked by points scored this week.",
  },
  {
    id: "standings_movers",
    title: "Standings movers",
    description: "Teams that rose or fell in the standings this week.",
  },
  {
    id: "waiver_impact",
    title: "Waiver impact",
    description: "Top weekly additions that made the starting lineup.",
  },
];

export const DEFAULT_SHARED_REPORT_CARD_IDS: SharedReportCardId[] = [
  "matchup_results",
  "weekly_awards",
  "player_leaders",
  "standings_movers",
];

// Keep retired ids valid so reports shared before the options were removed
// continue to render as originally published.
const VALID_CARD_IDS = new Set<SharedReportCardId>([
  ...SHARED_REPORT_CARD_OPTIONS.map((option) => option.id),
  "closest_matchup",
  "team_of_week",
  "biggest_blowout",
  "weekly_lowlights",
]);

export const normalizeSharedReportCardIds = (
  value: unknown
): SharedReportCardId[] => {
  if (!Array.isArray(value)) return [];

  return [...new Set(value)].filter(
    (id): id is SharedReportCardId =>
      typeof id === "string" && VALID_CARD_IDS.has(id as SharedReportCardId)
  );
};

export type SharedReportCardSource = {
  matchups: SharedReportMatchup[];
  weeklyAwards: SharedReportAward[];
  teamScores: SharedReportTeamScore[];
  standingsMoves: SharedReportStandingMove[];
  waiverImpact: SharedReportWaiverImpact[];
  playerLeaders: {
    top: SharedReportPlayerScore[];
    bottom: SharedReportPlayerScore[];
    bench: SharedReportPlayerScore[];
  };
};

export const getTopStartedWaiverImpact = (
  moves: SharedReportWaiverImpact[],
  limit = 4
) =>
  moves
    .filter((move) => move.startedThisWeek)
    .sort(
      (a, b) =>
        (b.pointsScored ?? Number.NEGATIVE_INFINITY) -
        (a.pointsScored ?? Number.NEGATIVE_INFINITY)
    )
    .slice(0, limit);

export const getTopStandingsMoves = (
  moves: SharedReportStandingMove[],
  limit = 4
) =>
  [...moves]
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, limit);

export const buildSharedReportCards = ({
  selected,
  source,
}: {
  selected: SharedReportCardId[];
  source: SharedReportCardSource;
}): SharedReportCards => {
  const normalizedSelected = normalizeSharedReportCardIds(selected);
  const includesMatchupData = normalizedSelected.some((id) =>
    ["matchup_results", "closest_matchup", "biggest_blowout"].includes(id)
  );

  return {
    version: 1,
    selected: normalizedSelected,
    ...(includesMatchupData ? { matchups: source.matchups } : {}),
    ...(normalizedSelected.includes("weekly_awards")
      ? { weeklyAwards: source.weeklyAwards }
      : {}),
    ...(normalizedSelected.includes("team_scoring")
      ? { teamScores: source.teamScores }
      : {}),
    ...(normalizedSelected.includes("player_leaders")
      ? { playerLeaders: source.playerLeaders }
      : {}),
    ...(normalizedSelected.includes("standings_movers")
      ? { standingsMoves: source.standingsMoves }
      : {}),
    ...(normalizedSelected.includes("waiver_impact")
      ? { waiverImpact: source.waiverImpact }
      : {}),
  };
};

export const getAvailableSharedReportCardIds = ({
  report,
  source,
}: {
  report: PremiumReport;
  source: SharedReportCardSource;
}): SharedReportCardId[] =>
  SHARED_REPORT_CARD_OPTIONS.filter((option) => {
    switch (option.id) {
      case "matchup_results":
      case "closest_matchup":
      case "biggest_blowout":
        return source.matchups.length > 0;
      case "weekly_awards":
        return source.weeklyAwards.length > 0;
      case "player_leaders":
        return Object.values(source.playerLeaders).some(
          (players) => players.length > 0
        );
      case "team_scoring":
        return source.teamScores.length > 0;
      case "standings_movers":
        return source.standingsMoves.length > 0;
      case "waiver_impact":
        return source.waiverImpact.length > 0;
      case "team_of_week":
        return Boolean(report.teamOfTheWeek?.teamName);
      case "weekly_lowlights":
        return report.weeklyLowlights.entries.length > 0;
    }
  }).map((option) => option.id);
