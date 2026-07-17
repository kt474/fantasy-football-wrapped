import type { LeagueInfoType, TableDataType } from "@/types/types";
import { createTableData } from "@/api/helper";
import { isLeagueInfoEntry } from "@/lib/previousSeason";

export interface HistoricalPointSeason {
  season: string;
  points: number[];
}

export interface HistoricalManagerRow {
  name: string;
  username: string;
  id: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  pointsArr: number[];
  pointSeason: HistoricalPointSeason[];
  avatarImg?: string;
  rosterId: number;
  matchups: (number | null)[];
  managerEfficiency: number;
  randomScheduleWins: number;
  leagueWinner: (number | null)[];
  seasons: string[];
}

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

export const getHistoricalTableData = (league: LeagueInfoType) => {
  if (!league.leagueId || !league.season) return [];

  return createTableData(
    league.users,
    league.rosters,
    league.weeklyPoints,
    league.medianScoring === 1
  );
};

export const buildHistoricalManagerRows = (
  tableData: TableDataType[],
  currentLeague?: LeagueInfoType
): HistoricalManagerRow[] => {
  const result = tableData.map((user) => {
    const latestWinner =
      currentLeague?.status === "complete"
        ? currentLeague.leagueWinner
          ? Number(currentLeague.leagueWinner)
          : (currentLeague.legacyWinner ?? null)
        : null;

    return {
      name: user.name,
      username: user.username,
      id: user.id,
      wins: user.wins,
      losses: user.losses,
      ties: user.ties,
      points: user.pointsFor,
      pointsArr: user.points ? [...user.points] : [],
      pointSeason: currentLeague
        ? [
            {
              season: currentLeague.season,
              points: user.points ? [...user.points] : [],
            },
          ]
        : [
            {
              season: "2023",
              points: Array.from({ length: 5 }, () =>
                Number((Math.random() * 100 + 100).toFixed(2))
              ),
            },
            {
              season: "2024",
              points: Array.from({ length: 5 }, () =>
                Number((Math.random() * 100 + 100).toFixed(2))
              ),
            },
          ],
      avatarImg: user.avatarImg,
      rosterId: user.rosterId,
      matchups: user.matchups ? [...user.matchups] : [],
      managerEfficiency: currentLeague
        ? user.managerEfficiency
        : 2 * user.managerEfficiency,
      randomScheduleWins: currentLeague
        ? user.randomScheduleWins
        : 3 * user.randomScheduleWins,
      leagueWinner: [latestWinner],
      seasons: currentLeague
        ? [currentLeague.season]
        : ["2023", "2022", "2021"],
    };
  });

  currentLeague?.previousLeagues
    .filter(isLeagueInfoEntry)
    .forEach((league) => {
      const historicalTableData = getHistoricalTableData(league);
      if (!hasLeagueSeasonData(league, historicalTableData)) return;

      historicalTableData.forEach((user) => {
        const resultUser = result.find(({ id }) => id === user.id);
        if (!resultUser) return;

        resultUser.wins += user.wins;
        resultUser.losses += user.losses;
        resultUser.ties += user.ties;
        resultUser.points += user.pointsFor;
        resultUser.randomScheduleWins += user.randomScheduleWins;
        resultUser.managerEfficiency += user.managerEfficiency;

        if (league.weeklyPoints.length > 0) {
          resultUser.seasons.push(league.season);
        }
        if (league.leagueWinner) {
          resultUser.leagueWinner.push(Number(league.leagueWinner));
        } else if (league.legacyWinner) {
          resultUser.leagueWinner.push(league.legacyWinner);
        }
        if (user.matchups?.length) resultUser.matchups.push(...user.matchups);
        if (user.points?.length) {
          resultUser.pointsArr.push(...user.points);
          resultUser.pointSeason.push({
            season: league.season,
            points: user.points,
          });
        }
      });

      const maxLength = Math.max(...result.map(({ matchups }) => matchups.length));
      result.forEach((row) => {
        while (row.matchups.length < maxLength) row.matchups.push(null);
      });
    });

  if (!currentLeague) {
    result.forEach((user) => {
      user.wins *= 3;
      user.losses *= 3;
      user.points *= 3;
      user.pointsArr.push(...user.pointsArr, ...user.pointsArr);
      user.matchups.push(...user.matchups, ...user.matchups);
    });
  }

  return result;
};
