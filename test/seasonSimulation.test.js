import { describe, expect, it } from "vitest";
import {
  getProjectedStarterTotal,
  runForecastSimulation,
  runReplaySimulation,
  shouldUseLiveSeasonForecast,
} from "../src/components/schedule_simulator/seasonSimulation";

const fixedRandom = () => 0.5;

describe("season simulation engine", () => {
  it("uses replay mode for completed current-year leagues", () => {
    expect(
      shouldUseLiveSeasonForecast(
        { season: "2026", status: "complete", remainingWeeks: 0 },
        2026
      )
    ).toBe(false);
    expect(
      shouldUseLiveSeasonForecast(
        { season: "2026", status: "in_season", remainingWeeks: 8 },
        2026
      )
    ).toBe(true);
  });

  it("uses the configured starter counts instead of fixed position limits", () => {
    const projections = [
      { position: "QB", projection: 30 },
      { position: "RB", projection: 25 },
      { position: "RB", projection: 20 },
      { position: "WR", projection: 24 },
      { position: "WR", projection: 18 },
      { position: "TE", projection: 15 },
    ];

    expect(
      getProjectedStarterTotal(projections, ["QB", "RB", "WR", "TE", "BN"])
    ).toBe(94);
    expect(
      getProjectedStarterTotal(projections, ["QB", "RB", "WR", "FLEX", "BN"])
    ).toBe(99);
  });

  it("assigns quarterbacks to super-flex slots without stealing fixed slots", () => {
    const projections = [
      { position: "QB", projection: 30 },
      { position: "QB", projection: 28 },
      { position: "RB", projection: 25 },
      { position: "WR", projection: 24 },
    ];

    expect(
      getProjectedStarterTotal(projections, ["QB", "RB", "WR", "SUPER_FLEX"])
    ).toBe(107);
  });

  it("simulates every remaining preseason week", () => {
    const result = runForecastSimulation({
      teams: [
        { index: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, mean: 100, deviation: 0 },
        { index: 1, wins: 0, losses: 0, ties: 0, pointsFor: 0, mean: 50, deviation: 0 },
      ],
      opponents: [
        [1, 1],
        [0, 0],
      ],
      completedWeeks: 0,
      regularSeasonWeeks: 2,
      playoffCutoff: 1,
      medianScoring: false,
      runs: 10,
      random: fixedRandom,
    });

    expect(result.summaryByTeam[0]).toMatchObject({
      averageWins: 2,
      p10Wins: 2,
      p90Wins: 2,
      playoffOdds: 100,
    });
    expect(result.weeklyWinsByTeam[0]).toEqual([1, 2]);
  });

  it("creates neutral pairings when a future schedule is unavailable", () => {
    const result = runForecastSimulation({
      teams: [
        { index: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, mean: 100, deviation: 0 },
        { index: 1, wins: 0, losses: 0, ties: 0, pointsFor: 0, mean: 50, deviation: 0 },
      ],
      opponents: [[], []],
      completedWeeks: 0,
      regularSeasonWeeks: 1,
      playoffCutoff: 1,
      medianScoring: false,
      runs: 5,
      random: fixedRandom,
    });

    expect(result.summaryByTeam[0].averageWins).toBe(1);
    expect(result.summaryByTeam[1].averageWins).toBe(0);
  });

  it("counts both matchup and median results", () => {
    const result = runForecastSimulation({
      teams: [
        { index: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, mean: 100, deviation: 0 },
        { index: 1, wins: 0, losses: 0, ties: 0, pointsFor: 0, mean: 50, deviation: 0 },
      ],
      opponents: [[1], [0]],
      completedWeeks: 0,
      regularSeasonWeeks: 1,
      playoffCutoff: 1,
      medianScoring: true,
      runs: 5,
      random: fixedRandom,
    });

    expect(result.summaryByTeam[0].averageWins).toBe(2);
    expect(result.summaryByTeam[1].averageWins).toBe(0);
  });

  it("keeps checkpoint results before replaying later weeks", () => {
    const result = runReplaySimulation({
      teams: [
        { index: 0, wins: 1, losses: 1, ties: 0, pointsFor: 10, scores: [0], actualSeed: 1 },
        { index: 1, wins: 1, losses: 1, ties: 0, pointsFor: 10, scores: [10], actualSeed: 2 },
      ],
      actualScores: [
        [10, 0],
        [0, 10],
      ],
      opponents: [
        [1, 1],
        [0, 0],
      ],
      weeks: 2,
      keepResultsThroughWeek: 1,
      playoffCutoff: 1,
      medianScoring: false,
      runs: 5,
      random: fixedRandom,
    });

    expect(result.summaryByTeam[0].averageWins).toBe(1.5);
    expect(result.summaryByTeam[1].averageWins).toBe(0.5);
    expect(result.weeklyWinsByTeam[0]).toEqual([1, 1.5]);
    expect(result.weeklyWinsByTeam[1]).toEqual([0, 0.5]);
  });

  it("does not use scores recorded after the replay checkpoint", () => {
    const options = {
      actualScores: [
        [100, 80, 200],
        [90, 120, 10],
      ],
      opponents: [
        [1, 1, 1],
        [0, 0, 0],
      ],
      weeks: 3,
      keepResultsThroughWeek: 1,
      playoffCutoff: 1,
      medianScoring: false,
      runs: 5,
      random: fixedRandom,
    };
    const sharedTeams = [
      { index: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, actualSeed: 1 },
      { index: 1, wins: 0, losses: 0, ties: 0, pointsFor: 0, actualSeed: 2 },
    ];

    const first = runReplaySimulation({
      ...options,
      teams: [
        { ...sharedTeams[0], scores: [100, 1, 1] },
        { ...sharedTeams[1], scores: [90, 500, 500] },
      ],
    });
    const second = runReplaySimulation({
      ...options,
      teams: [
        { ...sharedTeams[0], scores: [100, 500, 500] },
        { ...sharedTeams[1], scores: [90, 1, 1] },
      ],
    });

    expect(first).toEqual(second);
  });
});
