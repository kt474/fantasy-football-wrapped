import { describe, expect, test } from "vitest";

import { normalizeHistoricalSeasons } from "../src/lib/narratives.ts";

const buildLeague = (season, overrides = {}) => ({
  leagueId: "league-1",
  season,
  leagueWinner: null,
  scoringType: 1,
  rosters: [],
  weeklyPoints: [],
  users: [],
  trades: [],
  waivers: [],
  winnersBracket: [],
  espnWinnersBracket: [],
  previousLeagues: [],
  lastScoredWeek: 1,
  ...overrides,
});

describe("narrative season normalization", () => {
  test("ignores unresolved previous-season references", () => {
    const loadedSeason = buildLeague("2023");
    const currentLeague = buildLeague("2025", {
      platform: "espn",
      previousLeagues: ["2024", 2022, { season: "2021" }, loadedSeason],
    });

    expect(
      normalizeHistoricalSeasons(currentLeague).map((season) => season.season)
    ).toEqual(["2025", "2023"]);
  });
});
