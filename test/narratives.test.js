import { describe, expect, test } from "vitest";

import {
  getDraftHistoryForManager,
  getDraftGrade,
  getDraftPrediction,
  getDraftPressureLevel,
  getDraftPositionWindows,
  getDraftRoomPulse,
  getDraftRoomCheatSheetSummary,
  getDraftRoundSummaries,
  getDraftStrategyResult,
  getDraftStrategyShifts,
  getDraftStrategyLabel,
  getDraftTendency,
  getLeagueRelativeDraftInsights,
  getPositionalDraftPlan,
  normalizeHistoricalSeasons,
} from "../src/lib/narratives.ts";
import {
  getAuctionBudgetPlan,
  getAuctionHistoryForManager,
  getAuctionPositionPriceBands,
  getAuctionRoomBenchmarks,
  getAuctionTendency,
  getAuctionTendencySummary,
} from "../src/lib/auctionNarratives.ts";

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
      {
        userId: "manager-1",
        pickNumber: 1,
        round: 1,
        position: "RB",
        keeper: true,
      },
      {
        userId: "manager-1",
        pickNumber: 4,
        round: 2,
        position: "WR",
        keeper: false,
      },
      {
        userId: "manager-1",
        pickNumber: 2,
        round: 1,
        position: "QB",
        keeper: false,
      },
      {
        userId: "manager-2",
        pickNumber: 3,
        round: 2,
        position: "TE",
        keeper: false,
      },
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

  test("retains the first eight non-keeper picks for deeper planning", () => {
    const positions = [
      "RB",
      "WR",
      "QB",
      "TE",
      "RB",
      "WR",
      "RB",
      "WR",
      "DEF",
      "K",
    ];
    const draftPicks = positions.map((position, index) => ({
      userId: "manager-1",
      pickNumber: index + 1,
      round: index + 1,
      position,
      keeper: false,
    }));

    const history = getDraftHistoryForManager(
      {
        season: "2025",
        seasonType: "Redraft",
        draftType: "snake",
        draftPicks,
        rosterPositions: ["QB", "RB", "WR", "TE", "FLEX"],
      },
      "manager-1"
    );

    expect(history?.positions).toEqual(positions.slice(0, 8));
    expect(getDraftPositionWindows(history)).toEqual({
      opening: positions.slice(0, 3),
      insights: positions.slice(0, 5),
      planning: positions.slice(0, 8),
    });
  });

  test("keeps existing insights scoped to the first five picks", () => {
    const history = ["2025", "2024"].map((season) => ({
      season,
      seasonType: "Redraft",
      positions: ["RB", "RB", "RB", "WR", "WR", "WR", "WR", "WR"],
    }));

    expect(getDraftStrategyLabel(history)).toBe("RB Heavy");
    expect(getDraftRoomCheatSheetSummary(history)).toMatchObject({
      dominantPosition: "RB",
      dominantPositionShare: 0.6,
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

  test("projects only repeated openings from comparable draft formats", () => {
    const prediction = getDraftPrediction([
      {
        season: "2025",
        seasonType: "Redraft",
        positions: ["WR", "RB", "WR"],
      },
      {
        season: "2024",
        seasonType: "Redraft",
        positions: ["WR", "RB", "TE"],
      },
      {
        season: "2023",
        seasonType: "Redraft",
        positions: ["RB", "WR", "RB"],
      },
      {
        season: "2022",
        seasonType: "Dynasty",
        draftLabel: "Rookie",
        positions: ["QB", "WR"],
      },
    ]);

    expect(prediction).toEqual({
      positions: ["WR", "RB"],
      observedCount: 2,
      eligibleDraftCount: 3,
      draftLabel: "Redraft",
    });
  });

  test("builds league relative position and quarterback scouting", () => {
    const manager = {
      userId: "manager-1",
      draftHistory: [
        {
          season: "2025",
          seasonType: "Redraft",
          positions: ["WR", "WR", "RB"],
          firstQBRound: 7,
        },
        {
          season: "2024",
          seasonType: "Redraft",
          positions: ["WR", "WR", "TE"],
          firstQBRound: 8,
        },
      ],
    };
    const otherManager = {
      userId: "manager-2",
      draftHistory: [
        {
          season: "2025",
          seasonType: "Redraft",
          positions: ["RB", "RB", "WR"],
          firstQBRound: 3,
        },
        {
          season: "2024",
          seasonType: "Redraft",
          positions: ["RB", "WR", "QB"],
          firstQBRound: 4,
        },
      ],
    };

    expect(
      getLeagueRelativeDraftInsights(manager, [manager, otherManager])
    ).toEqual([
      "League's most WR-heavy early drafter (67% of first-five picks).",
      "Takes a first QB 4.0 rounds later than the league.",
    ]);
  });

  test("summarizes each opponent for the league draft room cheat sheet", () => {
    const summary = getDraftRoomCheatSheetSummary([
      {
        season: "2025",
        seasonType: "Redraft",
        positions: ["WR", "RB", "WR"],
        firstQBRound: 6,
      },
      {
        season: "2024",
        seasonType: "Redraft",
        positions: ["WR", "RB", "TE"],
        firstQBRound: 5,
      },
      {
        season: "2023",
        seasonType: "Redraft",
        positions: ["WR", "RB", "QB"],
        firstQBRound: null,
      },
      {
        season: "2022",
        seasonType: "Redraft",
        positions: ["RB", "WR", "RB"],
        firstQBRound: 4,
      },
    ]);

    expect(summary).toEqual({
      draftLabel: "Redraft",
      trackedDrafts: 4,
      projectedPositions: ["WR", "RB"],
      projectedObservedCount: 3,
      dominantPosition: "WR",
      dominantPositionShare: 5 / 12,
      averageFirstQBRound: 5,
      firstQBDraftCount: 3,
      patternStrength: "Strong pattern",
    });
  });

  test("identifies recent position and quarterback strategy shifts", () => {
    const shifts = getDraftStrategyShifts([
      {
        season: "2025",
        seasonType: "Redraft",
        positions: ["WR", "WR", "RB"],
        firstQBRound: 3,
      },
      {
        season: "2024",
        seasonType: "Redraft",
        positions: ["WR", "WR", "RB"],
        firstQBRound: 4,
      },
      {
        season: "2023",
        seasonType: "Redraft",
        positions: ["RB", "RB", "WR"],
        firstQBRound: 6,
      },
      {
        season: "2022",
        seasonType: "Redraft",
        positions: ["RB", "RB", "WR"],
        firstQBRound: 7,
      },
    ]);

    expect(shifts).toEqual([
      "Leaning more WR lately (67% of recent early picks, up from 33%).",
      "Taking the first QB 3.0 rounds earlier lately (R3.5 vs R6.5).",
    ]);
  });

  test("builds a format-aware league draft room pulse", () => {
    const buildDraft = (season, positions, firstQBRound) => ({
      season,
      seasonType: "Redraft",
      positions,
      firstQBRound,
    });
    const managers = [
      {
        userId: "manager-a",
        displayName: "Alex",
        draftHistory: [
          buildDraft("2025", ["WR", "WR", "RB"], 3),
          buildDraft("2024", ["WR", "WR", "RB"], 4),
          buildDraft("2023", ["RB", "RB", "WR"], 6),
          buildDraft("2022", ["RB", "RB", "WR"], 7),
        ],
      },
      {
        userId: "manager-b",
        displayName: "Blake",
        draftHistory: [
          buildDraft("2025", ["WR", "RB", "WR"], 4),
          buildDraft("2024", ["WR", "RB", "WR"], 5),
          buildDraft("2023", ["WR", "RB", "WR"], 6),
        ],
      },
      {
        userId: "manager-c",
        displayName: "Casey",
        draftHistory: [
          buildDraft("2025", ["RB", "WR", "RB"], 2),
          buildDraft("2024", ["RB", "WR", "RB"], 3),
          buildDraft("2023", ["RB", "WR", "RB"], 4),
        ],
      },
    ];

    expect(getDraftRoomPulse(managers)).toEqual([
      {
        label: "Room lean",
        value: "WR early",
        detail: "2 of 3 Redraft managers emphasize WR most.",
      },
      {
        label: "QB pressure",
        value: "Rounds 3–5",
        detail: "3 of 3 managers typically enter the QB market here.",
      },
      {
        label: "Most predictable",
        value: "Blake",
        detail: "Repeated WR → RB in 3 of 3 drafts.",
      },
      {
        label: "Changing approach",
        value: "Alex, Blake, Casey",
        detail:
          "These managers' recent early-round behavior differs materially from older drafts.",
      },
    ]);
  });

  test("builds a slot-aware four-round positional draft plan", () => {
    const buildHistory = (first, second) =>
      ["2025", "2024", "2023"].map((season) => ({
        season,
        seasonType: "Redraft",
        positions: [first, second, "RB", "WR", "QB", "TE", "RB", "WR"],
      }));
    const managers = [
      {
        userId: "manager-a",
        displayName: "Alex",
        draftHistory: buildHistory("WR", "RB"),
      },
      {
        userId: "manager-b",
        displayName: "Blake",
        draftHistory: buildHistory("RB", "WR"),
      },
      {
        userId: "manager-c",
        displayName: "Casey",
        draftHistory: buildHistory("RB", "WR"),
      },
      {
        userId: "manager-d",
        displayName: "Drew",
        draftHistory: buildHistory("RB", "WR"),
      },
    ];

    const plan = getPositionalDraftPlan(managers[0], managers, 2);

    expect(plan).toMatchObject({
      managerId: "manager-a",
      managerName: "Alex",
      draftLabel: "Redraft",
      draftSlot: 2,
      leagueSize: 4,
    });
    expect(plan?.rounds).toHaveLength(4);
    expect(plan?.rounds[0]).toMatchObject({
      round: 1,
      overallPick: 2,
      picksBeforePick: 1,
      pressure: [{ position: "RB", expectedPicks: 1 }],
      pressureLevel: "Low",
      threats: ["Blake", "Casey", "Drew"],
      guidance:
        "Alex usually drafts WR in Round 1; opponents lean RB before #2. Keep both paths open.",
    });
    expect(plan?.rounds[1]).toMatchObject({
      round: 2,
      overallPick: 7,
      picksBeforePick: 4,
      pressure: [
        { position: "RB", expectedPicks: 2 },
        { position: "WR", expectedPicks: 2 },
      ],
      pressureLevel: "Medium",
      guidance:
        "RB and WR demand is nearly even before #7: 2 vs 2 projected picks. Stay flexible.",
    });
    expect(plan?.rounds[2]).toMatchObject({
      round: 3,
      overallPick: 10,
      picksBeforePick: 2,
    });
  });

  test("normalizes draft pressure for the number of picks before the turn", () => {
    expect(getDraftPressureLevel(1, 1)).toBe("Low");
    expect(getDraftPressureLevel(6, 18)).toBe("Low");
    expect(getDraftPressureLevel(7, 20)).toBe("Medium");
    expect(getDraftPressureLevel(9, 20)).toBe("High");
    expect(getDraftPressureLevel(0, 8, false)).toBe("Unknown");
  });

  test("uses the current league size instead of the historical manager count", () => {
    const buildHistory = (position) => [
      {
        season: "2025",
        seasonType: "Redraft",
        positions: [position, "WR", "RB", "QB"],
      },
    ];
    const managers = [
      {
        userId: "manager-a",
        displayName: "Alex",
        draftHistory: buildHistory("WR"),
      },
      {
        userId: "manager-b",
        displayName: "Blake",
        draftHistory: buildHistory("RB"),
      },
    ];

    const plan = getPositionalDraftPlan(managers[0], managers, 13, 12);

    expect(plan).toMatchObject({ leagueSize: 12, draftSlot: 12 });
    expect(plan?.rounds[0]).toMatchObject({ overallPick: 12 });
  });

  test("connects a repeated opening to completed-season results", () => {
    const result = getDraftStrategyResult([
      {
        season: "2025",
        seasonType: "Redraft",
        positions: ["RB", "WR", "TE"],
        madePlayoffs: true,
        pointsFor: 1700,
      },
      {
        season: "2024",
        seasonType: "Redraft",
        positions: ["RB", "WR", "QB"],
        madePlayoffs: false,
        pointsFor: 1500,
      },
      {
        season: "2023",
        seasonType: "Redraft",
        positions: ["RB", "WR", "RB"],
        madePlayoffs: true,
        pointsFor: 1750,
      },
      {
        season: "2022",
        seasonType: "Redraft",
        positions: ["WR", "WR", "RB"],
        madePlayoffs: true,
        pointsFor: 1800,
      },
    ]);

    expect(result).toEqual({
      opening: "RB → WR",
      seasons: 3,
      playoffAppearances: 2,
      playoffRate: 2 / 3,
      averagePoints: 1650,
      draftLabel: "Redraft",
    });
  });
});

describe("manager auction tendencies", () => {
  const buildAuctionHistory = (season, purchases, overrides = {}) => ({
    season,
    seasonType: "Redraft",
    draftLabel: "Redraft",
    purchases: purchases.map(([position, amount]) => ({
      position,
      amount,
    })),
    totalSpent: purchases.reduce((sum, [, amount]) => sum + amount, 0),
    ...overrides,
  });

  test("builds auction history from winning bids while excluding keepers", () => {
    const history = getAuctionHistoryForManager(
      {
        season: "2025",
        seasonType: "Keeper",
        draftType: "auction",
        draftPicks: [
          {
            userId: "manager-1",
            playerId: "keeper",
            firstName: "Kept",
            lastName: "Player",
            position: "RB",
            amount: 40,
            pickNumber: 1,
            keeper: true,
          },
          {
            userId: "manager-1",
            playerId: "wr-1",
            firstName: "Wide",
            lastName: "Receiver",
            position: "wr",
            amount: 31,
            pickNumber: 3,
          },
          {
            userId: "manager-1",
            playerId: "qb-1",
            firstName: "Quarter",
            lastName: "Back",
            position: "QB",
            amount: 17,
            pickNumber: 2,
          },
        ],
      },
      "manager-1"
    );

    expect(history).toMatchObject({
      draftLabel: "Keeper",
      totalSpent: 48,
      purchases: [
        { position: "QB", amount: 17 },
        { position: "WR", amount: 31 },
      ],
    });
  });

  test("normalizes spend shares across auctions with different totals", () => {
    const history = [
      buildAuctionHistory("2025", [
        ["WR", 34],
        ["WR", 33],
        ["WR", 33],
        ["RB", 25],
        ["RB", 25],
        ["QB", 15],
        ["QB", 10],
        ["TE", 15],
        ["TE", 10],
      ]),
      buildAuctionHistory("2024", [
        ["WR", 17],
        ["WR", 16],
        ["WR", 17],
        ["RB", 13],
        ["RB", 12],
        ["QB", 8],
        ["QB", 7],
        ["TE", 5],
        ["TE", 5],
      ]),
    ];

    expect(getAuctionTendencySummary(history)).toMatchObject({
      trackedDrafts: 2,
      averageTotalSpent: 150,
      dominantPosition: "WR",
      dominantPositionShare: 0.5,
      strategyLabel: "WR Investor",
    });
    expect(getAuctionTendency(history)).toContain("50% of auction spend to WR");
  });

  test("creates a budget plan whose allocations add up to the requested budget", () => {
    const manager = {
      userId: "manager-a",
      displayName: "Alex",
      auctionHistory: [
        buildAuctionHistory("2025", [
          ["RB", 80],
          ["WR", 70],
          ["QB", 25],
          ["TE", 15],
          ["DEF", 10],
        ]),
      ],
    };

    const plan = getAuctionBudgetPlan(manager, 250);

    expect(plan).toMatchObject({ budget: 250 });
    expect(
      plan.allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
    ).toBe(250);
    expect(
      plan.allocations.find(({ position }) => position === "RB")
    ).toMatchObject({ amount: 100, share: 0.4 });
  });

  test("benchmarks position budgets across the room", () => {
    const managers = [
      {
        displayName: "Alex",
        auctionHistory: [
          buildAuctionHistory("2025", [
            ["RB", 80],
            ["WR", 70],
            ["QB", 25],
            ["TE", 15],
            ["DEF", 10],
          ]),
        ],
      },
      {
        displayName: "Blake",
        auctionHistory: [
          buildAuctionHistory("2025", [
            ["RB", 40],
            ["WR", 100],
            ["QB", 30],
            ["TE", 20],
            ["DEF", 10],
          ]),
        ],
      },
    ];

    expect(getAuctionRoomBenchmarks(managers, 200)).toContainEqual({
      position: "WR",
      averageShare: 0.425,
      averageAmount: 85,
      likelySpenders: ["Blake", "Alex"],
    });
  });

  test("builds first- and second-purchase price bands by position", () => {
    const managers = [
      {
        displayName: "Alex",
        auctionHistory: [
          buildAuctionHistory("2025", [
            ["QB", 50],
            ["QB", 20],
          ]),
          buildAuctionHistory("2024", [
            ["QB", 40],
            ["QB", 10],
          ]),
        ],
      },
      {
        displayName: "Blake",
        auctionHistory: [
          buildAuctionHistory("2025", [
            ["QB", 60],
            ["QB", 30],
          ]),
          buildAuctionHistory("2024", [
            ["QB", 45],
            ["QB", 15],
          ]),
        ],
      },
    ];

    expect(getAuctionPositionPriceBands(managers)).toEqual([
      {
        position: "QB",
        tier: 1,
        medianAmount: 48,
        lowAmount: 44,
        highAmount: 53,
        sampleSize: 4,
      },
      {
        position: "QB",
        tier: 2,
        medianAmount: 18,
        lowAmount: 14,
        highAmount: 23,
        sampleSize: 4,
      },
    ]);
  });
});
