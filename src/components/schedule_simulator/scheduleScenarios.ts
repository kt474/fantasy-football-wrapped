import type { TableDataType } from "@/types/types";
import { percentile, recordPoints } from "./seasonSimulation";

export type OpponentMatrix = (number | null)[][];

export type SimulatedTeamRecord = {
  index: number;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winDelta: number;
};

export type ScheduleMatchupWeek = {
  week: number;
  value: string;
  rows: Array<{
    teamA: number;
    teamB: number;
    pointsA: number;
    pointsB: number;
    winner: number | null;
    changed: boolean;
  }>;
};

export type ScheduleMonteCarloSummary = {
  mode: number;
  average: number;
  p10: number;
  p50: number;
  p90: number;
};

export type ScheduleMonteCarloResult = {
  distributions: number[][];
  summaryByTeam: Record<number, ScheduleMonteCarloSummary>;
  runCount: number;
};

const getWeekPoints = (
  tableData: TableDataType[],
  teamIndex: number,
  week: number
) => {
  const points = tableData[teamIndex]?.points?.[week];
  return Number.isFinite(points) ? points : 0;
};

const isValidMatchupNumber = (
  matchupNumber: number | null | undefined
): matchupNumber is number =>
  Number.isFinite(matchupNumber) && Number(matchupNumber) > 0;

export const createOpponentMatrix = (
  tableData: TableDataType[],
  weeks: number
): OpponentMatrix => {
  const matrix = tableData.map(() =>
    Array.from({ length: weeks }, () => null as number | null)
  );

  for (let week = 0; week < weeks; week++) {
    const matchupMap = new Map<number, number[]>();
    tableData.forEach((team, teamIndex) => {
      const matchupNumber = team.matchups?.[week];
      if (!isValidMatchupNumber(matchupNumber)) return;
      const teams = matchupMap.get(matchupNumber) || [];
      teams.push(teamIndex);
      matchupMap.set(matchupNumber, teams);
    });

    matchupMap.forEach((teamIndexes) => {
      for (let index = 0; index < teamIndexes.length; index += 2) {
        const teamA = teamIndexes[index];
        const teamB = teamIndexes[index + 1];
        if (teamA === undefined || teamB === undefined) continue;
        matrix[teamA][week] = teamB;
        matrix[teamB][week] = teamA;
      }
    });
  }

  return matrix;
};

export const calculateWeeklyMedians = (
  tableData: TableDataType[],
  weeks: number
) =>
  Array.from({ length: weeks }, (_, week) => {
    const scores = tableData
      .map((team) => team.points?.[week])
      .filter((points): points is number => Number.isFinite(points));
    if (scores.length === 0) return null;
    const sorted = [...scores].sort((a, b) => a - b);
    const midpoint = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
      : sorted[midpoint];
  });

export const compareTeamRecords = (
  a: Pick<SimulatedTeamRecord, "wins" | "ties" | "pointsFor">,
  b: Pick<SimulatedTeamRecord, "wins" | "ties" | "pointsFor">
) => {
  const recordDifference =
    recordPoints(b.wins, b.ties) - recordPoints(a.wins, a.ties);
  return recordDifference || b.pointsFor - a.pointsFor;
};

export const calculateSimulatedStandings = ({
  tableData,
  opponents,
  weeks,
  medianScoring,
  weeklyMedians,
  teamName,
}: {
  tableData: TableDataType[];
  opponents: OpponentMatrix;
  weeks: number;
  medianScoring: boolean;
  weeklyMedians: Array<number | null>;
  teamName: (team: TableDataType) => string;
}) => {
  const records: SimulatedTeamRecord[] = tableData.map((team, index) => ({
    index,
    name: teamName(team),
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winDelta: 0,
  }));

  for (let week = 0; week < weeks; week++) {
    const seen = new Set<number>();
    for (let teamIndex = 0; teamIndex < tableData.length; teamIndex++) {
      const opponent = opponents[teamIndex]?.[week];
      const teamPoints = getWeekPoints(tableData, teamIndex, week);
      records[teamIndex].pointsFor += teamPoints;
      if (opponent == null || seen.has(teamIndex) || seen.has(opponent)) {
        continue;
      }

      const opponentPoints = getWeekPoints(tableData, opponent, week);
      records[teamIndex].pointsAgainst += opponentPoints;
      records[opponent].pointsAgainst += teamPoints;
      if (teamPoints > opponentPoints) {
        records[teamIndex].wins += 1;
        records[opponent].losses += 1;
      } else if (teamPoints < opponentPoints) {
        records[teamIndex].losses += 1;
        records[opponent].wins += 1;
      } else {
        records[teamIndex].ties += 1;
        records[opponent].ties += 1;
      }
      seen.add(teamIndex);
      seen.add(opponent);
    }

    if (!medianScoring) continue;
    const weekMedian = weeklyMedians[week];
    if (weekMedian == null) continue;
    for (let teamIndex = 0; teamIndex < tableData.length; teamIndex++) {
      const teamPoints = getWeekPoints(tableData, teamIndex, week);
      if (teamPoints > weekMedian) records[teamIndex].wins += 1;
      else if (teamPoints < weekMedian) records[teamIndex].losses += 1;
      else records[teamIndex].ties += 1;
    }
  }

  records.forEach((record) => {
    const team = tableData[record.index];
    const actualRecordPoints = recordPoints(team.wins, team.ties ?? 0);
    record.winDelta = Number(
      (recordPoints(record.wins, record.ties) - actualRecordPoints).toFixed(1)
    );
  });

  return records.sort(compareTeamRecords);
};

export const buildActualStandings = (
  tableData: TableDataType[],
  teamName: (team: TableDataType) => string
) =>
  tableData
    .map((team, index): SimulatedTeamRecord => ({
      index,
      name: teamName(team),
      wins: team.wins,
      losses: team.losses,
      ties: team.ties ?? 0,
      pointsFor: team.pointsFor,
      pointsAgainst: team.pointsAgainst,
      winDelta: 0,
    }))
    .sort(compareTeamRecords);

export const buildMatchupsByWeek = ({
  tableData,
  opponents,
  originalOpponents,
  weeks,
}: {
  tableData: TableDataType[];
  opponents: OpponentMatrix;
  originalOpponents: OpponentMatrix;
  weeks: number;
}): ScheduleMatchupWeek[] =>
  Array.from({ length: weeks }, (_, week) => {
    const rows: ScheduleMatchupWeek["rows"] = [];
    const seen = new Set<number>();
    tableData.forEach((_, teamIndex) => {
      if (seen.has(teamIndex)) return;
      const opponent = opponents[teamIndex]?.[week];
      if (opponent == null || seen.has(opponent)) return;
      const pointsA = getWeekPoints(tableData, teamIndex, week);
      const pointsB = getWeekPoints(tableData, opponent, week);
      rows.push({
        teamA: teamIndex,
        teamB: opponent,
        pointsA,
        pointsB,
        winner:
          pointsA === pointsB ? null : pointsA > pointsB ? teamIndex : opponent,
        changed: originalOpponents[teamIndex]?.[week] !== opponent,
      });
      seen.add(teamIndex);
      seen.add(opponent);
    });
    return { week: week + 1, value: `week-${week + 1}`, rows };
  });

export const shuffleScheduleWeeks = ({
  opponents,
  originalOpponents,
  weekIndexes,
  random = Math.random,
}: {
  opponents: OpponentMatrix;
  originalOpponents: OpponentMatrix;
  weekIndexes: number[];
  random?: () => number;
}) => {
  const nextOpponents = opponents.map((teamWeeks) => [...teamWeeks]);
  const teamIndexes = opponents.map((_, index) => index);
  weekIndexes.forEach((week) => {
    const byes = teamIndexes.filter(
      (index) => originalOpponents[index]?.[week] === null
    );
    const activeTeams = teamIndexes.filter((index) => !byes.includes(index));
    for (let index = activeTeams.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [activeTeams[index], activeTeams[swapIndex]] = [
        activeTeams[swapIndex],
        activeTeams[index],
      ];
    }
    teamIndexes.forEach((teamIndex) => {
      nextOpponents[teamIndex][week] = null;
    });
    for (let index = 0; index < activeTeams.length; index += 2) {
      const teamA = activeTeams[index];
      const teamB = activeTeams[index + 1];
      if (teamA === undefined || teamB === undefined) continue;
      nextOpponents[teamA][week] = teamB;
      nextOpponents[teamB][week] = teamA;
    }
  });
  return nextOpponents;
};

export const swapTeamSchedules = (
  opponents: OpponentMatrix,
  teamA: number,
  teamB: number,
  weeks: number
) => {
  const nextOpponents = opponents.map((teamWeeks) => [...teamWeeks]);
  for (let week = 0; week < weeks; week++) {
    const opponentA = nextOpponents[teamA]?.[week] ?? null;
    const opponentB = nextOpponents[teamB]?.[week] ?? null;
    if (opponentA === teamB || opponentB === teamA) continue;
    if (opponentA !== null) nextOpponents[opponentA][week] = null;
    if (opponentB !== null) nextOpponents[opponentB][week] = null;
    nextOpponents[teamA][week] = opponentB;
    if (opponentB !== null) nextOpponents[opponentB][week] = teamA;
    nextOpponents[teamB][week] = opponentA;
    if (opponentA !== null) nextOpponents[opponentA][week] = teamB;
  }
  return nextOpponents;
};

export const runScheduleMonteCarlo = ({
  tableData,
  originalOpponents,
  weeks,
  medianScoring,
  weeklyMedians,
  runs,
  random = Math.random,
}: {
  tableData: TableDataType[];
  originalOpponents: OpponentMatrix;
  weeks: number;
  medianScoring: boolean;
  weeklyMedians: Array<number | null>;
  runs: number;
  random?: () => number;
}): ScheduleMonteCarloResult => {
  const teamCount = tableData.length;
  const safeRuns = Math.max(100, Math.min(10000, Math.floor(runs)));
  if (teamCount === 0 || weeks === 0) {
    return { distributions: [], summaryByTeam: {}, runCount: 0 };
  }

  const byesByWeek = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: teamCount }, (_, index) => index).filter(
      (index) => originalOpponents[index]?.[week] === null
    )
  );
  const distributions = Array.from(
    { length: teamCount },
    () => [] as number[]
  );

  for (let run = 0; run < safeRuns; run++) {
    const wins = Array.from({ length: teamCount }, () => 0);
    const ties = Array.from({ length: teamCount }, () => 0);
    for (let week = 0; week < weeks; week++) {
      const activeTeams = Array.from(
        { length: teamCount },
        (_, index) => index
      ).filter((index) => !byesByWeek[week].includes(index));
      for (let index = activeTeams.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(random() * (index + 1));
        [activeTeams[index], activeTeams[swapIndex]] = [
          activeTeams[swapIndex],
          activeTeams[index],
        ];
      }
      for (let index = 0; index < activeTeams.length; index += 2) {
        const teamA = activeTeams[index];
        const teamB = activeTeams[index + 1];
        if (teamA === undefined || teamB === undefined) continue;
        const pointsA = tableData[teamA]?.points[week] ?? 0;
        const pointsB = tableData[teamB]?.points[week] ?? 0;
        if (pointsA > pointsB) wins[teamA] += 1;
        else if (pointsB > pointsA) wins[teamB] += 1;
        else {
          ties[teamA] += 1;
          ties[teamB] += 1;
        }
      }
      if (!medianScoring) continue;
      const weekMedian = weeklyMedians[week];
      if (weekMedian == null) continue;
      for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
        const points = tableData[teamIndex]?.points[week] ?? 0;
        if (points > weekMedian) wins[teamIndex] += 1;
        else if (points === weekMedian) ties[teamIndex] += 1;
      }
    }
    distributions.forEach((values, index) => {
      values.push(Number((wins[index] + ties[index] * 0.5).toFixed(1)));
    });
  }

  const summaryByTeam: Record<number, ScheduleMonteCarloSummary> = {};
  distributions.forEach((values, index) => {
    const sorted = [...values].sort((a, b) => a - b);
    const frequencies = new Map<number, number>();
    sorted.forEach((value) => {
      frequencies.set(value, (frequencies.get(value) || 0) + 1);
    });
    let mode = 0;
    let maxCount = -1;
    frequencies.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mode = value;
      }
    });
    const average =
      sorted.reduce((total, value) => total + value, 0) /
      Math.max(sorted.length, 1);
    summaryByTeam[index] = {
      mode,
      average: Number(average.toFixed(2)),
      p10: percentile(sorted, 0.1),
      p50: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
    };
  });

  return { distributions, summaryByTeam, runCount: safeRuns };
};
