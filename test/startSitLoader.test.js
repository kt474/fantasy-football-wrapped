import { describe, expect, test, vi } from "vitest";
import {
  buildStartSitInsights,
  canPlayerFillLineupSlot,
  getOrderedRosterPlayerEntries,
  getOrderedRosterPlayerIds,
  getRecentStartSitWeekLabel,
  getStartingRosterSlots,
  getStartSitWeek,
} from "../src/components/start_sit/startSitLoader.ts";
import { mapWithConcurrency } from "../src/lib/async.ts";

const candidate = (overrides = {}) => ({
  id: "player",
  position: "WR",
  rosterSlot: "BN",
  projection: 10,
  recentAverage: 10,
  recentFloor: 5,
  averageRank: 24,
  tradeValue: 50,
  ...overrides,
});

describe("Start/Sit loader", () => {
  test("orders the selected roster with starters first", () => {
    expect(
      getOrderedRosterPlayerIds(
        ["bench-1", "starter-2", "starter-1", "bench-2"],
        [["starter-1", "starter-2"]],
        1
      )
    ).toEqual(["starter-1", "starter-2", "bench-1", "bench-2"]);
  });

  test("keeps lineup slots on ordered starter entries", () => {
    expect(
      getOrderedRosterPlayerEntries(
        ["bench-1", "starter-2", "starter-1", "bench-2"],
        [["starter-1", "starter-2"]],
        1,
        ["QB", "FLEX", "BN", "BN", "IR", "TAXI"]
      )
    ).toEqual([
      { playerId: "starter-1", rosterSlot: "QB" },
      { playerId: "starter-2", rosterSlot: "FLEX" },
      { playerId: "bench-1", rosterSlot: "BN" },
      { playerId: "bench-2", rosterSlot: "BN" },
    ]);
  });

  test("excludes non-playable roster slots from starter slots", () => {
    expect(
      getStartingRosterSlots(["QB", "RB", "FLEX", "BN", "IR", "TAXI"])
    ).toEqual(["QB", "RB", "FLEX"]);
  });

  test("checks player eligibility for flexible lineup slots", () => {
    expect(canPlayerFillLineupSlot("RB", "FLEX")).toBe(true);
    expect(canPlayerFillLineupSlot("TE", "WR/TE")).toBe(true);
    expect(canPlayerFillLineupSlot("QB", "SUPER_FLEX")).toBe(true);
    expect(canPlayerFillLineupSlot("QB", "FLEX")).toBe(false);
    expect(canPlayerFillLineupSlot("WR", "RB")).toBe(false);
  });

  test("only returns actionable lineup changes", () => {
    const players = [
      candidate({
        id: "starter",
        rosterSlot: "WR",
        projection: 14,
        recentAverage: 13,
        recentFloor: 8,
        averageRank: 18,
        tradeValue: 60,
      }),
      candidate({
        id: "worse-bench",
        projection: 11,
        averageRank: 34,
        tradeValue: 45,
      }),
    ];

    expect(buildStartSitInsights(players, 1)).toEqual([]);
  });

  test("uses league value as a tiebreaker without overriding a bad matchup", () => {
    const starter = candidate({
      id: "starter",
      position: "RB",
      rosterSlot: "FLEX",
      projection: 13,
      recentAverage: 12,
      recentFloor: 8,
      averageRank: 22,
    });
    const closeHighValueBench = candidate({
      id: "close-bench",
      projection: 12.7,
      recentAverage: 12,
      recentFloor: 8,
      averageRank: 20,
      tradeValue: 62,
    });
    const badMatchupBench = candidate({
      ...closeHighValueBench,
      id: "bad-matchup-bench",
      projection: 9,
      tradeValue: 80,
    });

    expect(
      buildStartSitInsights([starter, closeHighValueBench], 1)
    ).toMatchObject([
      {
        startId: "close-bench",
        sitId: "starter",
        valueGap: 12,
        confidence: "Start",
      },
    ]);
    expect(
      buildStartSitInsights([starter, badMatchupBench], 1)
    ).toEqual([]);
  });

  test("labels an aligned weekly edge as a strong start", () => {
    const insights = buildStartSitInsights(
      [
        candidate({
          id: "starter",
          rosterSlot: "WR",
          projection: 11,
          recentFloor: 6,
          averageRank: 31,
          tradeValue: 48,
        }),
        candidate({
          id: "bench",
          projection: 15,
          recentAverage: 14,
          recentFloor: 9,
          averageRank: 16,
          tradeValue: 64,
        }),
      ],
      1
    );

    expect(insights[0]).toMatchObject({
      startId: "bench",
      projectionGap: 4,
      recentGap: 4,
      valueGap: 16,
      confidence: "Strong start",
    });
  });

  test("uses the latest available starter week safely", () => {
    expect(getOrderedRosterPlayerIds(["p1", "p2"], undefined, 0)).toEqual([
      "p1",
      "p2",
    ]);
  });

  test("uses week 1 before the first scored week", () => {
    expect(getStartSitWeek({ currentWeek: 0, lastScoredWeek: 0 })).toBe(1);
    expect(getStartSitWeek({ currentWeek: 17, lastScoredWeek: 0 })).toBe(1);
  });

  test("uses the active week after games have been scored", () => {
    expect(getStartSitWeek({ currentWeek: 8, lastScoredWeek: 7 })).toBe(8);
    expect(getStartSitWeek({ currentWeek: 0, lastScoredWeek: 17 })).toBe(17);
  });

  test("uses the last scored week for completed leagues", () => {
    expect(
      getStartSitWeek({
        currentWeek: 18,
        lastScoredWeek: 17,
        status: "complete",
      })
    ).toBe(17);
    expect(
      getStartSitWeek({
        currentWeek: 0,
        lastScoredWeek: 17,
        status: "complete",
      })
    ).toBe(17);
  });

  test("labels recent weeks from the last scored week", () => {
    expect(getRecentStartSitWeekLabel({ lastScoredWeek: 7 }, 0)).toBe("Week 7");
    expect(getRecentStartSitWeekLabel({ lastScoredWeek: 7 }, 6)).toBe("Week 1");
    expect(getRecentStartSitWeekLabel({ lastScoredWeek: 0 }, 0)).toBe("N/A");
  });

  test("never exceeds the configured concurrency", async () => {
    let active = 0;
    let peak = 0;
    const releases = [];
    const mapper = vi.fn(async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => releases.push(resolve));
      active -= 1;
      return value * 2;
    });

    const resultPromise = mapWithConcurrency([1, 2, 3, 4, 5], 2, mapper);
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(2));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(3));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(4));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(5));
    releases.splice(0).forEach((release) => release());

    await expect(resultPromise).resolves.toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});
