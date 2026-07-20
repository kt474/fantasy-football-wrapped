import { describe, expect, test } from "vitest";

import {
  getDraftHistoryForManager,
  getDraftGrade,
  getDraftRoundSummaries,
  getDraftStrategyLabel,
  getDraftTendency,
  normalizeHistoricalSeasons,
} from "../src/lib/narratives.ts";

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

describe("manager draft tendencies", () => {
  test("describes a repeated three-position opening", () => {
    const history = [
      {
        season: "2025",
        positions: ["RB", "RB", "WR"],
        seasonType: "Redraft",
        draftLabel: "Redraft",
      },
      {
        season: "2024",
        positions: ["RB", "RB", "WR"],
        seasonType: "Redraft",
        draftLabel: "Redraft",
      },
      {
        season: "2023",
        positions: ["RB", "WR", "RB"],
        seasonType: "Redraft",
        draftLabel: "Redraft",
      },
    ];

    expect(getDraftTendency(history)).toBe(
      "Started RB → RB → WR in 2 of 3 tracked drafts."
    );
  });

  test("does not overstate a tendency from one draft", () => {
    expect(
      getDraftTendency([
        {
          season: "2025",
          positions: ["RB", "RB", "RB"],
          seasonType: "Redraft",
          draftLabel: "Redraft",
        },
      ])
    ).toBeNull();
  });

  test("orders picks while excluding keepers", () => {
    const draftPicks = [
      { userId: "manager-1", pickNumber: 1, round: 1, position: "RB", keeper: true },
      { userId: "manager-1", pickNumber: 4, round: 2, position: "WR", keeper: false },
      { userId: "manager-1", pickNumber: 2, round: 1, position: "QB", keeper: false },
      { userId: "manager-2", pickNumber: 3, round: 2, position: "TE", keeper: false },
    ];
    const history = getDraftHistoryForManager(
      {
        season: "2025",
        seasonType: "Keeper",
        draftType: "snake",
        draftPicks,
        rosterPositions: ["QB", "RB", "WR", "TE", "FLEX"],
      },
      "manager-1"
    );

    expect(history).toMatchObject({
      positions: ["QB", "WR"],
      draftLabel: "Keeper",
      firstQBRound: 1,
      firstTERound: null,
      requiresTightEnd: true,
    });
  });

  test("suppresses auction order and labels short dynasty drafts as rookie drafts", () => {
    const draftPicks = [
      { userId: "manager-1", pickNumber: 1, position: "WR", keeper: false },
    ];

    expect(
      getDraftHistoryForManager(
        {
          season: "2025",
          seasonType: "Redraft",
          draftType: "auction",
          draftPicks,
          rosterPositions: ["QB", "RB", "WR", "TE"],
        },
        "manager-1"
      )
    ).toBeUndefined();
    expect(
      getDraftHistoryForManager(
        {
          season: "2025",
          seasonType: "Dynasty",
          draftType: "snake",
          draftPicks,
          rosterPositions: ["QB", "RB", "WR", "TE"],
        },
        "manager-1"
      )
    ).toMatchObject({ draftLabel: "Rookie" });
  });

  test("summarizes first QB and TE rounds by comparable draft format", () => {
    const summaries = getDraftRoundSummaries([
      {
        season: "2025",
        positions: ["RB", "WR"],
        seasonType: "Redraft",
        draftLabel: "Redraft",
        firstQBRound: 4,
        firstTERound: 6,
        requiresTightEnd: true,
      },
      {
        season: "2024",
        positions: ["WR", "RB"],
        seasonType: "Redraft",
        draftLabel: "Redraft",
        firstQBRound: 6,
        firstTERound: null,
        requiresTightEnd: true,
      },
      {
        season: "2023",
        positions: ["QB", "WR"],
        seasonType: "Dynasty",
        draftLabel: "Rookie",
        firstQBRound: 1,
        firstTERound: 3,
        requiresTightEnd: false,
      },
    ]);

    expect(summaries).toEqual([
      {
        draftLabel: "Redraft",
        firstQB: {
          averageRound: 5,
          draftedCount: 2,
          eligibleDraftCount: 2,
        },
        firstTE: {
          averageRound: 6,
          draftedCount: 1,
          eligibleDraftCount: 2,
        },
      },
      {
        draftLabel: "Rookie",
        firstQB: {
          averageRound: 1,
          draftedCount: 1,
          eligibleDraftCount: 1,
        },
        firstTE: null,
      },
    ]);
  });

  test("assigns stable strategy labels from early draft behavior", () => {
    expect(
      getDraftStrategyLabel([
        {
          season: "2025",
          seasonType: "Redraft",
          positions: ["WR", "WR", "RB", "QB", "TE"],
          firstQBRound: 4,
        },
        {
          season: "2024",
          seasonType: "Redraft",
          positions: ["WR", "TE", "WR", "RB", "QB"],
          firstQBRound: 5,
        },
      ])
    ).toBe("Zero RB Lean");

    expect(
      getDraftStrategyLabel([
        {
          season: "2025",
          seasonType: "Redraft",
          positions: ["RB", "QB", "WR", "RB", "TE"],
          firstQBRound: 2,
        },
        {
          season: "2024",
          seasonType: "Redraft",
          positions: ["WR", "QB", "RB", "WR", "TE"],
          firstQBRound: 2,
        },
      ])
    ).toBe("Early QB");
  });

  test("uses the existing draft-performance grading bands", () => {
    expect(getDraftGrade(1.5)).toBe("B+");
    expect(getDraftGrade(0.3)).toBe("C");
    expect(getDraftGrade(null)).toBeNull();
  });
});
