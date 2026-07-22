import { describe, expect, test } from "vitest";
import {
  buildSharedReportCards,
  DEFAULT_SHARED_REPORT_CARD_IDS,
  getAvailableSharedReportCardIds,
  getTopStandingsMoves,
  getTopStartedWaiverImpact,
  normalizeSharedReportCardIds,
} from "../src/lib/sharedReportCards.ts";

const report = {
  frontPage: { headline: "Headline", subheadline: "Subheadline", lead: "Lead" },
  matchupReports: [],
  teamOfTheWeek: {
    teamName: "Alpha",
    pointsScored: 140,
    headline: "Big week",
    analysis: "Analysis",
  },
  weeklyLowlights: {
    headline: "Lowlights",
    entries: [
      {
        teamName: "Beta",
        category: "bench_burn",
        headline: "Pain",
        analysis: "Analysis",
      },
    ],
  },
};

const source = {
  matchups: [
    {
      matchupNumber: 1,
      teams: [
        { name: "Alpha", points: 140 },
        { name: "Beta", points: 135 },
      ],
      margin: 5,
    },
  ],
  weeklyAwards: [
    {
      id: "deserved-better",
      title: "Deserved Better",
      teamName: "Beta",
      description: "A tough loss.",
      metricLabel: "Score rank",
      metricValue: "#2",
    },
  ],
  teamScores: [
    { name: "Alpha", points: 140 },
    { name: "Beta", points: 135 },
  ],
  standingsMoves: [
    { teamName: "Alpha", from: 3, to: 1, change: 2 },
  ],
  waiverImpact: [
    {
      teamName: "Alpha",
      playerName: "Player D",
      acquisitionType: "waiver",
      faabBid: 12,
      startedThisWeek: true,
      pointsScored: 18,
    },
  ],
  playerLeaders: {
    top: [{ name: "Player A", user: "Alpha", points: 30 }],
    bottom: [{ name: "Player B", user: "Beta", points: 1 }],
    bench: [{ name: "Player C", user: "Beta", points: 25 }],
  },
};

describe("shared report cards", () => {
  test("defaults team scoring and waiver impact to off", () => {
    expect(DEFAULT_SHARED_REPORT_CARD_IDS).toEqual([
      "matchup_results",
      "weekly_awards",
      "player_leaders",
      "standings_movers",
    ]);
    expect(DEFAULT_SHARED_REPORT_CARD_IDS).not.toContain("team_scoring");
    expect(DEFAULT_SHARED_REPORT_CARD_IDS).not.toContain("waiver_impact");
  });

  test("normalizes card ids and removes unsupported or duplicate values", () => {
    expect(
      normalizeSharedReportCardIds([
        "weekly_awards",
        "weekly_awards",
        "biggest_blowout",
        "not-a-card",
      ])
    ).toEqual(["weekly_awards", "biggest_blowout"]);
  });

  test("stores only the structured data needed by the selected cards", () => {
    expect(
      buildSharedReportCards({
        selected: ["closest_matchup", "weekly_awards"],
        source,
      })
    ).toEqual({
      version: 1,
      selected: ["closest_matchup", "weekly_awards"],
      matchups: source.matchups,
      weeklyAwards: source.weeklyAwards,
    });
  });

  test("stores standings and waiver data when those cards are selected", () => {
    expect(
      buildSharedReportCards({
        selected: ["standings_movers", "waiver_impact"],
        source,
      })
    ).toEqual({
      version: 1,
      selected: ["standings_movers", "waiver_impact"],
      standingsMoves: source.standingsMoves,
      waiverImpact: source.waiverImpact,
    });
  });

  test("reports which cards have enough weekly data to publish", () => {
    expect(getAvailableSharedReportCardIds({ report, source })).toEqual([
      "matchup_results",
      "weekly_awards",
      "player_leaders",
      "team_scoring",
      "standings_movers",
      "waiver_impact",
    ]);
  });

  test("limits waiver impact to the top four additions that started", () => {
    const moves = [
      { playerName: "Bench Star", startedThisWeek: false, pointsScored: 40 },
      { playerName: "Fifth", startedThisWeek: true, pointsScored: 5 },
      { playerName: "First", startedThisWeek: true, pointsScored: 25 },
      { playerName: "Third", startedThisWeek: true, pointsScored: 15 },
      { playerName: "Second", startedThisWeek: true, pointsScored: 20 },
      { playerName: "Fourth", startedThisWeek: true, pointsScored: 10 },
    ].map((move) => ({
      teamName: "Alpha",
      acquisitionType: "waiver",
      ...move,
    }));

    expect(getTopStartedWaiverImpact(moves).map((move) => move.playerName)).toEqual([
      "First",
      "Second",
      "Third",
      "Fourth",
    ]);
  });

  test("limits standings movers to the four largest changes", () => {
    const moves = [
      { teamName: "One", from: 6, to: 1, change: 5 },
      { teamName: "Two", from: 1, to: 5, change: -4 },
      { teamName: "Three", from: 5, to: 2, change: 3 },
      { teamName: "Four", from: 2, to: 4, change: -2 },
      { teamName: "Five", from: 4, to: 3, change: 1 },
    ];

    expect(getTopStandingsMoves(moves).map((move) => move.teamName)).toEqual([
      "One",
      "Two",
      "Three",
      "Four",
    ]);
  });
});
