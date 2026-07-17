import {
  canPlayerFillLineupSlot,
  getStartingRosterSlots,
} from "../start_sit/startSitLoader";

export type SimulationTeam = {
  index: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
};

export type ForecastTeam = SimulationTeam & {
  mean: number;
  deviation: number;
};

export type ForecastSummary = {
  averageWins: number;
  p10Wins: number;
  p90Wins: number;
  playoffOdds: number;
  topSeedOdds: number;
  averageSeed: number;
};

export type ReplaySummary = ForecastSummary & {
  sameSeedOdds: number;
};

type SimulationOptions = {
  opponents: (number | null)[][];
  playoffCutoff: number;
  medianScoring: boolean;
  runs: number;
  random?: () => number;
};

export type ForecastOptions = SimulationOptions & {
  teams: ForecastTeam[];
  completedWeeks: number;
  regularSeasonWeeks: number;
};

export type ReplayTeam = SimulationTeam & {
  scores: number[];
  actualSeed: number;
};

export type ReplayOptions = SimulationOptions & {
  teams: ReplayTeam[];
  weeks: number;
  keepResultsThroughWeek: number;
  actualScores: number[][];
};

type ForecastResult = {
  summaryByTeam: Record<number, ForecastSummary>;
  weeklyWinsByTeam: number[][];
  runCount: number;
};

type ReplayResult = {
  summaryByTeam: Record<number, ReplaySummary>;
  weeklyWinsByTeam: number[][];
  runCount: number;
};

export const recordPoints = (wins: number, ties = 0) => wins + ties * 0.5;

export const shouldUseLiveSeasonForecast = (
  league: {
    season?: string;
    status?: string;
    remainingWeeks: number;
  },
  currentYear = new Date().getFullYear()
) =>
  String(league.season || "") === String(currentYear) &&
  ["pre_draft", "drafting", "in_season"].includes(league.status || "") &&
  league.remainingWeeks > 0;

type PlayerProjection = {
  projection: number;
  position: string;
};

const isEligibleForSlot = (playerPosition: string, slot: string) => {
  const normalizedPlayerPosition = playerPosition.toUpperCase();
  const normalizedSlot = slot.toUpperCase();
  if (
    ["DEF", "DST", "D/ST"].includes(normalizedPlayerPosition) &&
    ["DEF", "DST", "D/ST"].includes(normalizedSlot)
  ) {
    return true;
  }
  return canPlayerFillLineupSlot(normalizedPlayerPosition, normalizedSlot);
};

export const getProjectedStarterTotal = (
  projections: PlayerProjection[],
  rosterPositions: string[]
) => {
  const starterSlots = getStartingRosterSlots(rosterPositions);
  if (starterSlots.length === 0 || projections.length === 0) return 0;

  // Find the maximum-value legal assignment of players to starter slots.
  // Dummy columns let unsupported or empty slots remain unfilled at zero points.
  const rowCount = starterSlots.length;
  const realPlayerCount = projections.length;
  const columnCount = realPlayerCount + rowCount;
  const rowPotential = Array.from({ length: rowCount + 1 }, () => 0);
  const columnPotential = Array.from({ length: columnCount + 1 }, () => 0);
  const matchedRowByColumn = Array.from(
    { length: columnCount + 1 },
    () => 0
  );
  const previousColumn = Array.from(
    { length: columnCount + 1 },
    () => 0
  );
  const ineligibleCost = 1_000_000;
  const cost = (row: number, column: number) => {
    if (column >= realPlayerCount) return 0;
    const player = projections[column];
    return isEligibleForSlot(player.position, starterSlots[row])
      ? -Math.max(0, player.projection)
      : ineligibleCost;
  };

  for (let row = 1; row <= rowCount; row++) {
    matchedRowByColumn[0] = row;
    let currentColumn = 0;
    const minimumValue = Array.from(
      { length: columnCount + 1 },
      () => Number.POSITIVE_INFINITY
    );
    const used = Array.from({ length: columnCount + 1 }, () => false);

    do {
      used[currentColumn] = true;
      const currentRow = matchedRowByColumn[currentColumn];
      let delta = Number.POSITIVE_INFINITY;
      let nextColumn = 0;
      for (let column = 1; column <= columnCount; column++) {
        if (used[column]) continue;
        const currentValue =
          cost(currentRow - 1, column - 1) -
          rowPotential[currentRow] -
          columnPotential[column];
        if (currentValue < minimumValue[column]) {
          minimumValue[column] = currentValue;
          previousColumn[column] = currentColumn;
        }
        if (minimumValue[column] < delta) {
          delta = minimumValue[column];
          nextColumn = column;
        }
      }
      for (let column = 0; column <= columnCount; column++) {
        if (used[column]) {
          rowPotential[matchedRowByColumn[column]] += delta;
          columnPotential[column] -= delta;
        } else {
          minimumValue[column] -= delta;
        }
      }
      currentColumn = nextColumn;
    } while (matchedRowByColumn[currentColumn] !== 0);

    do {
      const nextColumn = previousColumn[currentColumn];
      matchedRowByColumn[currentColumn] = matchedRowByColumn[nextColumn];
      currentColumn = nextColumn;
    } while (currentColumn !== 0);
  }

  let total = 0;
  for (let column = 1; column <= realPlayerCount; column++) {
    const matchedRow = matchedRowByColumn[column];
    if (
      matchedRow > 0 &&
      isEligibleForSlot(
        projections[column - 1].position,
        starterSlots[matchedRow - 1]
      )
    ) {
      total += Math.max(0, projections[column - 1].projection);
    }
  }
  return total;
};

const compareRecords = (a: SimulationTeam, b: SimulationTeam) => {
  const recordDifference =
    recordPoints(b.wins, b.ties) - recordPoints(a.wins, a.ties);
  return recordDifference || b.pointsFor - a.pointsFor;
};

export const percentile = (sorted: number[], p: number) => {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p))
  );
  return sorted[index];
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const applyMedianResult = (records: SimulationTeam[], scores: number[]) => {
  const weeklyMedian = median(scores);
  if (weeklyMedian === null) return;
  scores.forEach((score, index) => {
    if (score > weeklyMedian) records[index].wins += 1;
    else if (score < weeklyMedian) records[index].losses += 1;
    else records[index].ties += 1;
  });
};

const applyMatchupResults = (
  records: SimulationTeam[],
  scores: number[],
  weekOpponents: (number | null)[]
) => {
  const seen = new Set<number>();
  for (let teamIndex = 0; teamIndex < records.length; teamIndex++) {
    records[teamIndex].pointsFor += scores[teamIndex];
    const opponent = weekOpponents[teamIndex];
    if (opponent == null || seen.has(teamIndex) || seen.has(opponent)) continue;
    if (scores[teamIndex] > scores[opponent]) {
      records[teamIndex].wins += 1;
      records[opponent].losses += 1;
    } else if (scores[teamIndex] < scores[opponent]) {
      records[teamIndex].losses += 1;
      records[opponent].wins += 1;
    } else {
      records[teamIndex].ties += 1;
      records[opponent].ties += 1;
    }
    seen.add(teamIndex);
    seen.add(opponent);
  }
};

const randomWeekOpponents = (teamCount: number, random: () => number) => {
  const shuffled = Array.from({ length: teamCount }, (_, index) => index);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const opponents = Array.from(
    { length: teamCount },
    () => null as number | null
  );
  for (let i = 0; i < shuffled.length; i += 2) {
    const teamA = shuffled[i];
    const teamB = shuffled[i + 1];
    if (teamA === undefined || teamB === undefined) continue;
    opponents[teamA] = teamB;
    opponents[teamB] = teamA;
  }
  return opponents;
};

const resolveWeekOpponents = (
  opponents: (number | null)[][],
  week: number,
  teamCount: number,
  random: () => number
) => {
  const published = opponents.map((teamWeeks) => teamWeeks?.[week] ?? null);
  return published.some((opponent) => opponent != null)
    ? published
    : randomWeekOpponents(teamCount, random);
};

const randomNormal = (random: () => number) => {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

const standardDeviation = (values: number[], mean: number) => {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
};

const getReplayScoreModels = (
  teams: ReplayTeam[],
  lockedWeeks: number
) => {
  const knownScoresByTeam = teams.map((team) =>
    team.scores
      .slice(0, lockedWeeks)
      .filter((score) => Number.isFinite(score) && score >= 0)
  );
  const leagueScores = knownScoresByTeam.flat();
  const leagueMean = leagueScores.length > 0 ? average(leagueScores) : 100;
  const observedLeagueDeviation = standardDeviation(leagueScores, leagueMean);
  const leagueDeviation = Math.max(
    observedLeagueDeviation,
    leagueMean * 0.12,
    8
  );

  return knownScoresByTeam.map((scores) => {
    const teamMean = scores.length > 0 ? average(scores) : leagueMean;
    // Three league-average games keep very small samples from dominating.
    const teamWeight = scores.length / (scores.length + 3);
    const mean = teamMean * teamWeight + leagueMean * (1 - teamWeight);
    const teamDeviation = standardDeviation(scores, teamMean);
    const deviation = Math.max(
      8,
      teamDeviation * teamWeight + leagueDeviation * (1 - teamWeight)
    );
    return { mean, deviation };
  });
};

const summarize = (
  winsByTeam: number[][],
  seedsByTeam: number[][],
  playoffCounts: number[],
  topSeedCounts: number[],
  runs: number
) => {
  const summary: Record<number, ForecastSummary> = {};
  winsByTeam.forEach((values, index) => {
    const wins = [...values].sort((a, b) => a - b);
    const seeds = seedsByTeam[index];
    summary[index] = {
      averageWins: Number(
        (wins.reduce((total, value) => total + value, 0) / runs).toFixed(2)
      ),
      p10Wins: percentile(wins, 0.1),
      p90Wins: percentile(wins, 0.9),
      playoffOdds: Number(((playoffCounts[index] / runs) * 100).toFixed(1)),
      topSeedOdds: Number(((topSeedCounts[index] / runs) * 100).toFixed(1)),
      averageSeed: Number(
        (seeds.reduce((total, value) => total + value, 0) / runs).toFixed(1)
      ),
    };
  });
  return summary;
};

export const runForecastSimulation = ({
  teams,
  opponents,
  completedWeeks,
  regularSeasonWeeks,
  playoffCutoff,
  medianScoring,
  runs,
  random = Math.random,
}: ForecastOptions): ForecastResult => {
  const teamCount = teams.length;
  const safeRuns = Math.max(1, Math.floor(runs));
  const remainingWeeks = Math.max(regularSeasonWeeks - completedWeeks, 0);
  const winsByTeam = Array.from({ length: teamCount }, () => [] as number[]);
  const seedsByTeam = Array.from({ length: teamCount }, () => [] as number[]);
  const playoffCounts = Array.from({ length: teamCount }, () => 0);
  const topSeedCounts = Array.from({ length: teamCount }, () => 0);
  const weeklyWinSums = Array.from({ length: teamCount }, () =>
    Array.from({ length: remainingWeeks }, () => 0)
  );

  for (let run = 0; run < safeRuns; run++) {
    const records = teams.map(({ mean: _mean, deviation: _deviation, ...team }) => ({
      ...team,
    }));
    for (let week = completedWeeks; week < regularSeasonWeeks; week++) {
      const scores = teams.map((team) =>
        Math.max(0, team.mean + team.deviation * randomNormal(random))
      );
      applyMatchupResults(
        records,
        scores,
        resolveWeekOpponents(opponents, week, teamCount, random)
      );
      if (medianScoring) applyMedianResult(records, scores);
      const forecastWeekIndex = week - completedWeeks;
      records.forEach((record) => {
        weeklyWinSums[record.index][forecastWeekIndex] += recordPoints(
          record.wins,
          record.ties
        );
      });
    }

    [...records].sort(compareRecords).forEach((record, seedIndex) => {
      winsByTeam[record.index].push(recordPoints(record.wins, record.ties));
      seedsByTeam[record.index].push(seedIndex + 1);
      if (seedIndex < playoffCutoff) playoffCounts[record.index] += 1;
      if (seedIndex === 0) topSeedCounts[record.index] += 1;
    });
  }

  return {
    summaryByTeam: summarize(
      winsByTeam,
      seedsByTeam,
      playoffCounts,
      topSeedCounts,
      safeRuns
    ),
    weeklyWinsByTeam: weeklyWinSums.map((values) =>
      values.map((value) => Number((value / safeRuns).toFixed(2)))
    ),
    runCount: safeRuns,
  };
};

export const runReplaySimulation = ({
  teams,
  opponents,
  weeks,
  keepResultsThroughWeek,
  actualScores,
  playoffCutoff,
  medianScoring,
  runs,
  random = Math.random,
}: ReplayOptions): ReplayResult => {
  const teamCount = teams.length;
  const safeRuns = Math.max(1, Math.floor(runs));
  const lockedWeeks = Math.min(Math.max(keepResultsThroughWeek, 0), weeks);
  const baseRecords = teams.map(({ scores: _scores, actualSeed: _seed, ...team }) => ({
    ...team,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
  }));
  const weeklyWinSums = Array.from({ length: teamCount }, () =>
    Array.from({ length: weeks }, () => 0)
  );

  for (let week = 0; week < lockedWeeks; week++) {
    const scores = actualScores.map((teamScores) => teamScores[week] ?? 0);
    applyMatchupResults(
      baseRecords,
      scores,
      resolveWeekOpponents(opponents, week, teamCount, random)
    );
    if (medianScoring) applyMedianResult(baseRecords, scores);
    baseRecords.forEach((record) => {
      weeklyWinSums[record.index][week] =
        recordPoints(record.wins, record.ties) * safeRuns;
    });
  }

  const winsByTeam = Array.from({ length: teamCount }, () => [] as number[]);
  const seedsByTeam = Array.from({ length: teamCount }, () => [] as number[]);
  const playoffCounts = Array.from({ length: teamCount }, () => 0);
  const topSeedCounts = Array.from({ length: teamCount }, () => 0);
  const sameSeedCounts = Array.from({ length: teamCount }, () => 0);
  const scoreModels = getReplayScoreModels(teams, lockedWeeks);

  for (let run = 0; run < safeRuns; run++) {
    const records = baseRecords.map((record) => ({ ...record }));
    for (let week = lockedWeeks; week < weeks; week++) {
      const scores = scoreModels.map((model) =>
        Math.max(0, model.mean + model.deviation * randomNormal(random))
      );
      applyMatchupResults(
        records,
        scores,
        resolveWeekOpponents(opponents, week, teamCount, random)
      );
      if (medianScoring) applyMedianResult(records, scores);
      records.forEach((record) => {
        weeklyWinSums[record.index][week] += recordPoints(
          record.wins,
          record.ties
        );
      });
    }

    [...records].sort(compareRecords).forEach((record, seedIndex) => {
      winsByTeam[record.index].push(recordPoints(record.wins, record.ties));
      seedsByTeam[record.index].push(seedIndex + 1);
      if (seedIndex < playoffCutoff) playoffCounts[record.index] += 1;
      if (seedIndex === 0) topSeedCounts[record.index] += 1;
      if (seedIndex + 1 === teams[record.index].actualSeed) {
        sameSeedCounts[record.index] += 1;
      }
    });
  }

  const baseSummary = summarize(
    winsByTeam,
    seedsByTeam,
    playoffCounts,
    topSeedCounts,
    safeRuns
  );
  const summaryByTeam: Record<number, ReplaySummary> = {};
  teams.forEach((_, index) => {
    summaryByTeam[index] = {
      ...baseSummary[index],
      sameSeedOdds: Number(
        ((sameSeedCounts[index] / safeRuns) * 100).toFixed(1)
      ),
    };
  });

  return {
    summaryByTeam,
    weeklyWinsByTeam: weeklyWinSums.map((values) =>
      values.map((value) => Number((value / safeRuns).toFixed(2)))
    ),
    runCount: safeRuns,
  };
};
