import { describe, expect, test } from "vitest";
import {
  attachRosterIdsToStats,
  hasUsablePlayerRankingData,
} from "../src/components/power_rankings/teamRankingData.ts";

const playerStats = {
  rank: 1,
  points: 25,
  overallRank: 2,
  ppg: 25,
  firstName: "Test",
  lastName: "Quarterback",
  position: "QB",
  team: "BUF",
  id: "player-1",
  gp: 1,
};

describe("team ranking data", () => {
  test("drops players without season stats before adding roster metadata", () => {
    expect(
      attachRosterIdsToStats(
        [null, playerStats, null],
        [{ rosterId: 4 }, { rosterId: 7 }, { rosterId: 9 }]
      )
    ).toEqual([{ ...playerStats, rosterId: 7 }]);
  });

  test("rejects the invalid cached undefined-position group", () => {
    expect(
      hasUsablePlayerRankingData({
        undefined: Array.from({ length: 5 }, () => ({ rosterId: 4 })),
      })
    ).toBe(false);
    expect(
      hasUsablePlayerRankingData({
        QB: [{ ...playerStats, rosterId: 7 }],
      })
    ).toBe(true);
  });
});
