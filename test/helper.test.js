import { afterEach, describe, expect, test, vi } from "vitest";
import {
  calculateDraftRank,
  createTableData,
  getMedian,
  getTotalTransactions,
  getWaiverMoves,
  getWeeklyPoints,
  getWinProbability,
  winsOnWeek,
  zScoreToPValue,
} from "../src/api/helper.ts";
import * as sleeperApi from "../src/api/sleeperApi.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("helper utilities", () => {
  const buildUser = (id, name = `Team ${id}`) => ({
    id,
    avatar: "",
    avatarImg: "",
    name,
    username: name,
  });

  const buildRoster = ({
    id,
    rosterId,
    wins,
    losses,
    pointsFor,
    pointsAgainst = 0,
    recordByWeek,
  }) => ({
    id,
    rosterId,
    pointsFor,
    pointsAgainst,
    potentialPoints: pointsFor,
    managerEfficiency: 1,
    wins,
    losses,
    ties: 0,
    recordByWeek,
    players: [],
  });

  const buildPoints = (rosterId, points) => ({
    rosterId,
    points,
    matchups: points.map((_, index) => index + 1),
    starters: points.map(() => []),
    starterPoints: points.map(() => []),
    benchPlayers: points.map(() => []),
    benchPoints: points.map(() => []),
  });

  test("calculateDraftRank handles did-not-play and minimum floor", () => {
    expect(calculateDraftRank(10, 0, 1, "RB", 10)).toBe("0.0");
    expect(calculateDraftRank(1, 999, 1, "RB", 0)).toBe("-3.0");
  });

  test("calculateDraftRank rewards early first-round value", () => {
    const firstRound = Number(calculateDraftRank(8, 8, 1, "RB", 14));
    const laterRound = Number(calculateDraftRank(8, 8, 2, "RB", 14));

    expect(firstRound).toBeGreaterThan(laterRound);
  });

  test("getMedian returns expected results for odd, even, and empty lists", () => {
    expect(getMedian([9, 1, 5])).toBe(5);
    expect(getMedian([1, 3, 5, 7])).toBe(4);
    expect(getMedian([])).toBeUndefined();
  });

  test("winsOnWeek counts wins through the target week", () => {
    expect(winsOnWeek("WLWWL", 3)).toBe(3);
    expect(winsOnWeek("LLLL", 2)).toBe(0);
  });

  test("getTotalTransactions counts only complete transactions with adds", () => {
    const totals = getTotalTransactions([
      { creator: "u1", status: "complete", adds: { p1: 1 }, type: "waiver" },
      { creator: "u1", status: "complete", adds: { p2: 1 }, type: "trade" },
      { creator: "u2", status: "complete", adds: null, type: "waiver" },
      { creator: "u2", status: "pending", adds: { p3: 1 }, type: "waiver" },
    ]);

    expect(totals).toEqual({ u1: 2 });
  });

  test("getWaiverMoves separates complete trades from waiver/free_agent moves", () => {
    const moves = getWaiverMoves([
      { creator: "u1", status: "complete", adds: { p1: 1 }, type: "trade" },
      { creator: "u1", status: "pending", adds: { p2: 1 }, type: "trade" },
      { creator: "u2", status: "pending", adds: { p3: 1 }, type: "waiver" },
      { creator: "u3", status: "complete", adds: { p4: 1 }, type: "free_agent" },
    ]);

    expect(moves.trades).toHaveLength(1);
    expect(moves.waivers).toHaveLength(2);
  });

  test("z-score helpers return sane probabilities", () => {
    expect(getWinProbability(0)).toBeCloseTo(0.5, 6);
    expect(zScoreToPValue(1.96)).toBeCloseTo(0.05, 2);
    expect(zScoreToPValue(-1.96)).toBeCloseTo(zScoreToPValue(1.96), 8);
  });

  test("createTableData calculates record-vs-all by roster when weekly scores tie", () => {
    const tableData = createTableData(
      [buildUser("u1", "Alpha"), buildUser("u2", "Beta"), buildUser("u3", "Gamma")],
      [
        buildRoster({
          id: "u1",
          rosterId: 1,
          wins: 0,
          losses: 0,
          pointsFor: 100,
          recordByWeek: "T",
        }),
        buildRoster({
          id: "u2",
          rosterId: 2,
          wins: 0,
          losses: 0,
          pointsFor: 100,
          recordByWeek: "T",
        }),
        buildRoster({
          id: "u3",
          rosterId: 3,
          wins: 0,
          losses: 0,
          pointsFor: 90,
          recordByWeek: "L",
        }),
      ],
      [
        buildPoints(1, [100]),
        buildPoints(2, [100]),
        buildPoints(3, [90]),
      ],
      false
    );

    expect(tableData.map(({ rosterId, winsAgainstAll, lossesAgainstAll }) => ({
      rosterId,
      winsAgainstAll,
      lossesAgainstAll,
    }))).toEqual([
      { rosterId: 1, winsAgainstAll: 1, lossesAgainstAll: 1 },
      { rosterId: 2, winsAgainstAll: 1, lossesAgainstAll: 1 },
      { rosterId: 3, winsAgainstAll: 0, lossesAgainstAll: 2 },
    ]);
  });

  test("createTableData avoids self-matchups when simulating random schedule wins", () => {
    let randomCallCount = 0;
    vi.spyOn(Math, "random").mockImplementation(() => {
      randomCallCount += 1;
      return randomCallCount <= 20000 ? 0.75 : 0.25;
    });

    const tableData = createTableData(
      [buildUser("u1", "Alpha"), buildUser("u2", "Beta")],
      [
        buildRoster({
          id: "u1",
          rosterId: 1,
          wins: 2,
          losses: 0,
          pointsFor: 220,
          recordByWeek: "WW",
        }),
        buildRoster({
          id: "u2",
          rosterId: 2,
          wins: 0,
          losses: 2,
          pointsFor: 180,
          recordByWeek: "LL",
        }),
      ],
      [buildPoints(1, [110, 110]), buildPoints(2, [90, 90])],
      false
    );

    expect(tableData.map(({ rosterId, randomScheduleWins }) => ({
      rosterId,
      randomScheduleWins,
    }))).toEqual([
      { rosterId: 1, randomScheduleWins: 2 },
      { rosterId: 2, randomScheduleWins: 0 },
    ]);
  });

  test("createTableData adds median wins and losses for non-median leagues", () => {
    const tableData = createTableData(
      [buildUser("u1", "Alpha"), buildUser("u2", "Beta"), buildUser("u3", "Gamma")],
      [
        buildRoster({
          id: "u1",
          rosterId: 1,
          wins: 1,
          losses: 1,
          pointsFor: 210,
          recordByWeek: "WL",
        }),
        buildRoster({
          id: "u2",
          rosterId: 2,
          wins: 1,
          losses: 1,
          pointsFor: 190,
          recordByWeek: "LW",
        }),
        buildRoster({
          id: "u3",
          rosterId: 3,
          wins: 1,
          losses: 1,
          pointsFor: 170,
          recordByWeek: "WL",
        }),
      ],
      [
        buildPoints(1, [100, 110]),
        buildPoints(2, [90, 100]),
        buildPoints(3, [80, 90]),
      ],
      false
    );

    expect(tableData.map(({ rosterId, winsWithMedian, lossesWithMedian }) => ({
      rosterId,
      winsWithMedian,
      lossesWithMedian,
    }))).toEqual([
      { rosterId: 1, winsWithMedian: 3, lossesWithMedian: 1 },
      { rosterId: 2, winsWithMedian: 1, lossesWithMedian: 3 },
      { rosterId: 3, winsWithMedian: 1, lossesWithMedian: 3 },
    ]);
  });

  test("createTableData reconstructs head-to-head records for median leagues", () => {
    const tableData = createTableData(
      [buildUser("u1", "Alpha"), buildUser("u2", "Beta")],
      [
        {
          ...buildRoster({
            id: "u1",
            rosterId: 1,
            wins: 3,
            losses: 1,
            pointsFor: 210,
            recordByWeek: "WWWL",
          }),
          ties: 0,
        },
        {
          ...buildRoster({
            id: "u2",
            rosterId: 2,
            wins: 0,
            losses: 3,
            pointsFor: 190,
            recordByWeek: "LLLT",
          }),
          ties: 1,
        },
      ],
      [
        { ...buildPoints(1, [110, 100]), matchups: [1, 1] },
        { ...buildPoints(2, [90, 100]), matchups: [1, 1] },
      ],
      true
    );

    expect(
      tableData.map(
        ({ rosterId, headToHeadWins, headToHeadLosses, headToHeadTies }) => ({
          rosterId,
          headToHeadWins,
          headToHeadLosses,
          headToHeadTies,
        })
      )
    ).toEqual([
      { rosterId: 1, headToHeadWins: 1, headToHeadLosses: 0, headToHeadTies: 1 },
      { rosterId: 2, headToHeadWins: 0, headToHeadLosses: 1, headToHeadTies: 1 },
    ]);
  });

  test("createTableData includes ghost rosters without a matching user", () => {
    const tableData = createTableData(
      [buildUser("u1", "Alpha")],
      [
        buildRoster({
          id: "u1",
          rosterId: 1,
          wins: 1,
          losses: 0,
          pointsFor: 100,
          recordByWeek: "W",
        }),
        buildRoster({
          id: null,
          rosterId: 2,
          wins: 0,
          losses: 1,
          pointsFor: 80,
          recordByWeek: "L",
        }),
      ],
      [buildPoints(1, [100]), buildPoints(2, [80])],
      false
    );

    expect(tableData).toHaveLength(2);
    expect(tableData.find((team) => team.rosterId === 2)).toMatchObject({
      id: null,
      rosterId: 2,
      points: [80],
    });
  });

  test("getWeeklyPoints consolidates starters and bench values by roster", async () => {
    vi.spyOn(sleeperApi, "getMatchup")
      .mockResolvedValueOnce([
        {
          rosterId: 1,
          points: 101,
          matchupId: 11,
          starters: ["p1"],
          starterPoints: [101],
          benchPlayers: ["b1"],
          benchPoints: [7],
        },
        null,
      ])
      .mockResolvedValueOnce([
        {
          rosterId: 1,
          points: 88,
          matchupId: 12,
          starters: ["p2"],
          starterPoints: [88],
          benchPlayers: ["b2"],
          benchPoints: [4],
        },
      ]);

    const weekly = await getWeeklyPoints("league-1", 2);

    expect(sleeperApi.getMatchup).toHaveBeenCalledTimes(2);
    expect(sleeperApi.getMatchup).toHaveBeenNthCalledWith(1, 1, "league-1");
    expect(sleeperApi.getMatchup).toHaveBeenNthCalledWith(2, 2, "league-1");
    expect(weekly).toEqual([
      {
        rosterId: 1,
        points: [101, 88],
        matchups: [11, 12],
        starters: [["p1"], ["p2"]],
        starterPoints: [[101], [88]],
        benchPlayers: [["b1"], ["b2"]],
        benchPoints: [[7], [4]],
      },
    ]);
  });
});
