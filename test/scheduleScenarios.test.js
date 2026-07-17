import { describe, expect, test } from "vitest";

import {
  buildActualStandings,
  buildMatchupsByWeek,
  calculateSimulatedStandings,
  calculateWeeklyMedians,
  createOpponentMatrix,
  runScheduleMonteCarlo,
  shuffleScheduleWeeks,
  swapTeamSchedules,
} from "../src/components/schedule_simulator/scheduleScenarios.ts";

const team = (overrides) => ({
  id: String(overrides.rosterId),
  rosterId: overrides.rosterId,
  name: `Team ${overrides.rosterId}`,
  username: `team_${overrides.rosterId}`,
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  points: [],
  matchups: [],
  ...overrides,
});

const displayName = (value) => value.name;

describe("schedule scenario calculations", () => {
  test("builds symmetric opponent matrices and matchup rows", () => {
    const tableData = [
      team({ rosterId: 1, points: [100], matchups: [1] }),
      team({ rosterId: 2, points: [90], matchups: [1] }),
      team({ rosterId: 3, points: [80], matchups: [2] }),
      team({ rosterId: 4, points: [70], matchups: [2] }),
    ];
    const opponents = createOpponentMatrix(tableData, 1);

    expect(opponents).toEqual([[1], [0], [3], [2]]);
    expect(
      buildMatchupsByWeek({
        tableData,
        opponents,
        originalOpponents: opponents,
        weeks: 1,
      })[0].rows
    ).toMatchObject([
      { teamA: 0, teamB: 1, winner: 0, changed: false },
      { teamA: 2, teamB: 3, winner: 2, changed: false },
    ]);
  });

  test("calculates standings and median results from the selected schedule", () => {
    const tableData = [
      team({
        rosterId: 1,
        wins: 1,
        losses: 1,
        pointsFor: 180,
        points: [100, 80],
        matchups: [1, 1],
      }),
      team({
        rosterId: 2,
        wins: 1,
        losses: 1,
        pointsFor: 190,
        points: [90, 100],
        matchups: [1, 1],
      }),
    ];
    const opponents = createOpponentMatrix(tableData, 2);
    const medians = calculateWeeklyMedians(tableData, 2);

    expect(medians).toEqual([95, 90]);
    expect(
      calculateSimulatedStandings({
        tableData,
        opponents,
        weeks: 2,
        medianScoring: true,
        weeklyMedians: medians,
        teamName: displayName,
      }).map(({ name, wins, losses, winDelta }) => ({
        name,
        wins,
        losses,
        winDelta,
      }))
    ).toEqual([
      { name: "Team 2", wins: 2, losses: 2, winDelta: 1 },
      { name: "Team 1", wins: 2, losses: 2, winDelta: 1 },
    ]);
    expect(buildActualStandings(tableData, displayName)[0].name).toBe(
      "Team 2"
    );
  });

  test("keeps shuffle and team-swap matrices symmetric", () => {
    const opponents = [[1], [0], [3], [2]];
    const shuffled = shuffleScheduleWeeks({
      opponents,
      originalOpponents: opponents,
      weekIndexes: [0],
      random: () => 0,
    });
    shuffled.forEach((teamWeeks, teamIndex) => {
      const opponent = teamWeeks[0];
      expect(shuffled[opponent][0]).toBe(teamIndex);
    });

    expect(swapTeamSchedules(opponents, 0, 2, 1)).toEqual([
      [3],
      [2],
      [1],
      [0],
    ]);
  });

  test("summarizes randomized schedule outcomes", () => {
    const tableData = [
      team({ rosterId: 1, points: [100, 120], matchups: [1, 1] }),
      team({ rosterId: 2, points: [90, 80], matchups: [1, 1] }),
    ];
    const result = runScheduleMonteCarlo({
      tableData,
      originalOpponents: createOpponentMatrix(tableData, 2),
      weeks: 2,
      medianScoring: false,
      weeklyMedians: calculateWeeklyMedians(tableData, 2),
      runs: 5,
      random: () => 0.5,
    });

    expect(result.runCount).toBe(100);
    expect(result.distributions[0]).toHaveLength(100);
    expect(result.summaryByTeam[0]).toMatchObject({
      mode: 2,
      average: 2,
      p10: 2,
      p90: 2,
    });
  });
});
