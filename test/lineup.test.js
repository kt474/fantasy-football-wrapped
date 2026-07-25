import { describe, expect, test } from "vitest";
import {
  canPlayerFillLineupSlot,
  getOptimalProjectedLineup,
  getStartingRosterSlots,
  isSuperflexLeague,
} from "../src/lib/lineup.ts";

const player = (position, projection) => ({ position, projection });

describe("optimal projected lineup", () => {
  test("excludes non-starting roster slots", () => {
    expect(
      getStartingRosterSlots(["QB", "SUPER_FLEX", "BN", "IR", "TAXI"])
    ).toEqual(["QB", "SUPER_FLEX"]);
  });

  test.each([
    [["QB", "SUPER_FLEX"], true],
    [["QB", "OP"], true],
    [["QB", "QB"], true],
    [["QB", "FLEX"], false],
  ])("detects Superflex formats from %j", (rosterPositions, expected) => {
    expect(isSuperflexLeague(rosterPositions)).toBe(expected);
  });

  test("normalizes common defense slot aliases", () => {
    expect(canPlayerFillLineupSlot("DEF", "D/ST")).toBe(true);
    expect(canPlayerFillLineupSlot("DEF", "DST")).toBe(true);
  });

  test("counts a second quarterback in a Superflex lineup", () => {
    const result = getOptimalProjectedLineup(
      [
        player("QB", 347),
        player("QB", 346),
        player("RB", 300),
        player("WR", 250),
      ],
      ["QB", "SUPER_FLEX", "BN"]
    );

    expect(result.total).toBe(693);
    expect(result.positionTotals).toEqual({ QB: 693 });
    expect(result.selected.map(({ slot }) => slot)).toEqual([
      "QB",
      "SUPER_FLEX",
    ]);
  });

  test("uses a non-quarterback in Superflex when it projects better", () => {
    const result = getOptimalProjectedLineup(
      [player("QB", 300), player("QB", 100), player("RB", 200)],
      ["QB", "SUPER_FLEX"]
    );

    expect(result.total).toBe(500);
    expect(result.positionTotals).toEqual({ QB: 300, RB: 200 });
  });

  test("respects narrower receiving flex eligibility", () => {
    const result = getOptimalProjectedLineup(
      [
        player("RB", 300),
        player("RB", 250),
        player("WR", 200),
        player("TE", 150),
      ],
      ["RB", "REC_FLEX"]
    );

    expect(result.total).toBe(500);
    expect(result.positionTotals).toEqual({ RB: 300, WR: 200 });
  });

  test("does not use the same projected player in multiple slots", () => {
    const result = getOptimalProjectedLineup(
      [player("QB", 300)],
      ["QB", "SUPER_FLEX"]
    );

    expect(result.total).toBe(300);
    expect(result.selected).toHaveLength(1);
  });
});
