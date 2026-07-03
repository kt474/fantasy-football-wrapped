import type { LeagueInfoType, TableDataType } from "@/types/types";

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const hasPositiveNumber = (value: unknown) =>
  hasFiniteNumber(value) && value > 0;

const hasGameResults = ({
  wins,
  losses,
  ties,
  pointsFor,
  pointsAgainst,
  recordByWeek,
}: {
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  recordByWeek?: string;
}) =>
  (wins ?? 0) +
    (losses ?? 0) +
    (ties ?? 0) +
    (pointsFor ?? 0) +
    (pointsAgainst ?? 0) >
    0 || /[WLT]/i.test(recordByWeek ?? "");

export const hasLeagueSeasonData = (
  league: LeagueInfoType,
  tableData: TableDataType[] = []
) => {
  if (!league.leagueId || !league.season) return false;

  const users = Array.isArray(league.users) ? league.users : [];
  const rosters = Array.isArray(league.rosters) ? league.rosters : [];
  const weeklyPoints = Array.isArray(league.weeklyPoints)
    ? league.weeklyPoints
    : [];
  const hasTeams =
    tableData.length > 0 || users.length > 0 || rosters.length > 0;
  const hasScoredWeek = Number(league.lastScoredWeek ?? 0) > 0;
  if (league.platform !== "espn" && !hasScoredWeek) {
    return false;
  }

  const hasWeeklyScores = weeklyPoints.some(
    (week) =>
      Array.isArray(week.points) &&
      (week.points.some((points) => hasPositiveNumber(points)) ||
        (week.matchups?.length ?? 0) > 0 ||
        (week.starters?.length ?? 0) > 0)
  );
  const hasRosterResults = rosters.some(hasGameResults);
  const hasTableResults = tableData.some(hasGameResults);

  return (
    hasTeams &&
    (hasScoredWeek || hasWeeklyScores || hasRosterResults || hasTableResults)
  );
};
