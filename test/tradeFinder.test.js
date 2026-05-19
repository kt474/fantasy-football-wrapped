import { describe, expect, test } from "vitest";
import {
  getFairnessLabel,
  getPackageTradeValue,
} from "../src/lib/tradeValues.ts";
import { findTradeCandidates } from "../src/lib/tradeFinder.ts";

const player = (id, name, position, projection, overallRank, team = "FA") => ({
  player_id: id,
  name,
  position,
  projection,
  overallRank,
  team,
});

describe("trade finder", () => {
  test("values packages with depth discounts", () => {
    const single = getPackageTradeValue([
      player("rb1", "RB One", "RB", 8, 18),
    ]);
    const packageValue = getPackageTradeValue([
      player("rb1", "RB One", "RB", 8, 18),
      player("wr1", "WR One", "WR", 20, 45),
    ]);

    expect(packageValue).toBeGreaterThan(single);
    expect(packageValue).toBeLessThan(single * 2);
    expect(getFairnessLabel(10, 11)).toBe("Very fair");
  });

  test("finds mutually useful player offers", () => {
    const rosters = [
      {
        id: 1,
        managerName: "Source",
        players: [
          player("qb1", "QB One", "QB", 8, 40),
          player("rb1", "RB One", "RB", 5, 12),
          player("rb2", "RB Two", "RB", 13, 28),
          player("rb3", "RB Three", "RB", 22, 54),
          player("wr1", "WR One", "WR", 62, 150),
          player("te1", "TE One", "TE", 8, 90),
        ],
      },
      {
        id: 2,
        managerName: "Target",
        players: [
          player("qb2", "QB Two", "QB", 9, 45),
          player("rb4", "RB Four", "RB", 200, 260),
          player("rb5", "RB Five", "RB", 220, 280),
          player("wr2", "WR Two", "WR", 18, 40),
          player("wr3", "WR Three", "WR", 22, 52),
          player("te2", "TE Two", "TE", 9, 95),
        ],
      },
    ];

    const recommendations = findTradeCandidates({
      rosters,
      sourceRosterId: 1,
      targetPosition: "WR",
      maxResults: 3,
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].targetRosterId).toBe(2);
    expect(recommendations[0].sourceSends.some((p) => p.position === "RB")).toBe(
      true
    );
    expect(recommendations[0].targetSends[0].position).toBe("WR");
  });
});
