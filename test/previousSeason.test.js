import { describe, expect, test } from "vitest";
import {
  getLoadedPreviousLeagues,
  getPreviousSeasonOption,
  getPreviousSeasonReference,
  isSeasonWithoutStandings,
  reconcileEspnPreviousLeagueEntries,
} from "../src/lib/previousSeason.ts";

const buildLeague = (overrides = {}) => ({
  platform: "sleeper",
  name: "Current League",
  regularSeasonLength: 14,
  medianScoring: 0,
  totalRosters: 10,
  season: "2026",
  seasonType: "Redraft",
  leagueId: "current-id",
  leagueWinner: null,
  lastUpdated: 0,
  previousLeagueId: "previous-id",
  lastScoredWeek: 0,
  winnersBracket: [],
  losersBracket: [],
  espnWinnersBracket: [],
  espnLosersBracket: [],
  users: [],
  rosters: [],
  weeklyPoints: [],
  transactions: {},
  trades: [],
  waivers: [],
  previousLeagues: [],
  status: "pre_draft",
  currentWeek: 0,
  scoringType: 1,
  rosterPositions: [],
  playoffTeams: 6,
  playoffType: 0,
  draftId: "",
  waiverType: 0,
  sport: "nfl",
  ...overrides,
});

describe("previous season helpers", () => {
  test("recognizes a season with no standings results", () => {
    expect(isSeasonWithoutStandings(buildLeague())).toBe(true);
    expect(
      isSeasonWithoutStandings(buildLeague({ lastScoredWeek: 1 }))
    ).toBe(false);
  });

  test("offers the immediately previous Sleeper league", () => {
    expect(getPreviousSeasonOption(buildLeague())).toMatchObject({
      season: "2025",
      leagueId: "previous-id",
      platform: "sleeper",
    });
  });

  test("does not offer a Sleeper season without a previous league id", () => {
    expect(
      getPreviousSeasonOption(buildLeague({ previousLeagueId: null }))
    ).toBeNull();
  });

  test("recognizes ESPN season references returned in different formats", () => {
    const numericReference = buildLeague({
      platform: "espn",
      leagueId: "espn-id",
      previousLeagueId: null,
      previousLeagues: [2025, "2024"],
    });
    const objectReference = buildLeague({
      platform: "espn",
      leagueId: "espn-id",
      previousLeagueId: null,
      previousLeagues: [{ season: "2025" }],
    });

    expect(getPreviousSeasonOption(numericReference)).toMatchObject({
      season: "2025",
      leagueId: "espn-id",
      platform: "espn",
    });
    expect(getPreviousSeasonOption(objectReference)).toMatchObject({
      season: "2025",
      leagueId: "espn-id",
      platform: "espn",
    });
  });

  test("uses an already loaded prior season for the View action", () => {
    const current = buildLeague();
    const loaded = buildLeague({
      name: "Previous League",
      season: "2025",
      leagueId: "previous-id",
      previousLeagueId: "older-id",
      lastScoredWeek: 17,
      status: "complete",
    });

    expect(getPreviousSeasonOption(current, [current, loaded])?.loadedLeague).toBe(
      loaded
    );
  });

  test("does not mistake an unrelated loaded league for the previous season", () => {
    const current = buildLeague();
    const unrelated = buildLeague({
      season: "2025",
      leagueId: "another-league-id",
      lastScoredWeek: 17,
    });

    expect(
      getPreviousSeasonOption(current, [current, unrelated])?.loadedLeague
    ).toBeUndefined();
  });

  test("keeps full league objects distinct from lightweight season references", () => {
    expect(getPreviousSeasonReference({ season: "2025" })).toBe("2025");
    expect(
      getPreviousSeasonReference(
        buildLeague({ season: "2025", leagueId: "previous-id" })
      )
    ).toBeNull();
  });

  test("exposes only complete league objects to object-only consumers", () => {
    const loaded = buildLeague({ season: "2025", leagueId: "previous-id" });
    const current = buildLeague({
      platform: "espn",
      previousLeagues: ["2025", 2024, { season: "2023" }, loaded],
    });

    expect(getLoadedPreviousLeagues(current)).toEqual([loaded]);
  });

  test("keeps failed and unattempted ESPN season references retryable", () => {
    const loaded2025 = buildLeague({
      platform: "espn",
      leagueId: "espn-id",
      season: "2025",
    });
    const loaded2023 = buildLeague({
      platform: "espn",
      leagueId: "espn-id",
      season: "2023",
    });

    const reconciled = reconcileEspnPreviousLeagueEntries(
      ["2025", "2024", "2023", "2022"],
      [loaded2025, loaded2023],
      [{ season: "2025" }, { season: "2024" }, { season: "2023" }],
      [{ season: "2024" }]
    );

    expect(reconciled).toEqual([
      loaded2025,
      "2024",
      loaded2023,
      "2022",
    ]);
  });

  test("replaces a failed ESPN reference after a successful retry", () => {
    const loaded2025 = buildLeague({
      platform: "espn",
      leagueId: "espn-id",
      season: "2025",
    });
    const loaded2024 = buildLeague({
      platform: "espn",
      leagueId: "espn-id",
      season: "2024",
    });

    const reconciled = reconcileEspnPreviousLeagueEntries(
      [loaded2025, "2024", "2023"],
      [loaded2024],
      [{ season: "2024" }],
      []
    );

    expect(reconciled).toEqual([loaded2025, loaded2024, "2023"]);
  });
});
