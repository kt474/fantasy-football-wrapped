import { afterEach, describe, expect, test, vi } from "vitest";
import {
  calculateDraftRank,
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
