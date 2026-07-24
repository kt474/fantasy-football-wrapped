import { describe, expect, test } from "vitest";
import {
  applyTradeBuilderRankingResponse,
  buildDynastyDraftPickAssets,
  buildTradeValueRequest,
  getTradeValuationMode,
  mergeTradeBuilderRankings,
} from "../src/lib/leagueTradeValues";

describe("trade value request boundary", () => {
  test("derives the valuation mode from league settings", () => {
    expect(getTradeValuationMode({ seasonType: "Dynasty" })).toBe("dynasty");
    expect(
      getTradeValuationMode({ seasonType: "Redraft", status: "complete" })
    ).toBe("season-results");
    expect(
      getTradeValuationMode({ seasonType: "Redraft", status: "in_season" })
    ).toBe("ros-projection");
  });

  test("builds the bounded backend snapshot without player values", () => {
    const request = buildTradeValueRequest({
      league: {
        leagueId: "league-1",
        season: "2026",
        status: "in_season",
        scoringType: 1,
        scoringSettings: { rec: 1 },
        rosterPositions: ["QB", "RB", "WR", "BN"],
        totalRosters: 2,
        seasonType: "Dynasty",
        platform: "sleeper",
      },
      tableData: [
        {
          rosterId: 1,
          name: "Alpha",
          username: "alpha-user",
          starters: [["p1"]],
          benchPlayers: [["p2"]],
          players: ["p1", "p2"],
        },
        {
          rosterId: 2,
          name: "Beta",
          username: "beta-user",
          starters: [["p3"]],
          benchPlayers: [["p4"]],
          players: ["p3", "p4"],
        },
      ],
      selectedWeek: 1,
      showUsernames: false,
      dynastyPerspective: "balanced",
    });

    expect(request.rosters).toEqual([
      { id: 1, managerName: "Alpha", playerIds: ["p1", "p2"] },
      { id: 2, managerName: "Beta", playerIds: ["p3", "p4"] },
    ]);
    expect(JSON.stringify(request)).not.toContain("tradeValue");
    expect(JSON.stringify(request)).not.toContain("projectedPoints");
  });

  test("assigns future picks to their current dynasty owner", () => {
    const league = {
      season: "2025",
      status: "complete",
      totalRosters: 2,
      draftPicks: [],
      rosters: [
        { rosterId: 1, potentialPoints: 1200 },
        { rosterId: 2, potentialPoints: 1500 },
      ],
    };
    const rosters = [
      { id: 1, managerName: "Alpha" },
      { id: 2, managerName: "Beta" },
    ];
    const assets = buildDynastyDraftPickAssets({
      league,
      rosters,
      tradedPicks: [
        {
          season: "2026",
          round: 1,
          rosterId: 1,
          previousOwnerId: 1,
          ownerId: 2,
        },
      ],
    });

    expect(
      assets.find(
        (pick) =>
          pick.season === 2026 &&
          pick.round === 1 &&
          pick.originalRosterId === 1
      )
    ).toMatchObject({
      ownerRosterId: 2,
      label: "2026 Round 1 (from Alpha)",
    });
  });

  test("does not add a fourth round to a known three-round dynasty draft", () => {
    const assets = buildDynastyDraftPickAssets({
      league: {
        season: "2025",
        status: "complete",
        totalRosters: 2,
        draftPicks: [{ round: 1 }, { round: 2 }, { round: 3 }],
      },
      rosters: [
        { id: 1, managerName: "Alpha" },
        { id: 2, managerName: "Beta" },
      ],
      tradedPicks: [],
    });

    expect([...new Set(assets.map((pick) => pick.round))]).toEqual([1, 2, 3]);
  });

  test("keeps basic ranks for players omitted from premium rankings", () => {
    const rosters = [
      {
        id: 1,
        managerName: "Alpha",
        players: [
          {
            playerId: "p1",
            player_id: "p1",
            name: "Preview Player",
            position: "WR",
            team: "MIN",
            positionRank: 8,
            overallRank: 20,
          },
          {
            playerId: "p2",
            player_id: "p2",
            name: "Basic Rank Player",
            position: "RB",
            team: "DET",
            positionRank: 18,
            overallRank: 54,
          },
        ],
      },
    ];

    const merged = mergeTradeBuilderRankings(rosters, [
      {
        playerId: "p1",
        player_id: "p1",
        name: "Preview Player",
        position: "WR",
        team: "MIN",
        projectedPoints: 200,
        replacementPoints: 100,
        vorp: 100,
        tradeValue: 90,
        positionRank: 2,
        overallRank: 4,
      },
    ]);

    expect(merged[0].players).toEqual([
      expect.objectContaining({
        playerId: "p1",
        positionRank: 2,
        overallRank: 4,
      }),
      expect.objectContaining({
        playerId: "p2",
        positionRank: 18,
        overallRank: 54,
      }),
    ]);
  });

  test("does not mix league adjusted preview ranks into the free builder", () => {
    const rosters = [
      {
        id: 1,
        managerName: "Alpha",
        players: [
          {
            playerId: "p1",
            player_id: "p1",
            name: "Preview Player",
            position: "WR",
            team: "MIN",
            positionRank: 8,
            overallRank: 20,
          },
        ],
      },
    ];
    const rankings = [
      {
        playerId: "p1",
        player_id: "p1",
        name: "Preview Player",
        position: "WR",
        team: "MIN",
        projectedPoints: 200,
        replacementPoints: 100,
        vorp: 100,
        tradeValue: 90,
        positionRank: 2,
        overallRank: 4,
      },
    ];

    expect(
      applyTradeBuilderRankingResponse(rosters, {
        access: "preview",
        rankings,
      })[0].players[0]
    ).toMatchObject({ positionRank: 8, overallRank: 20 });
    expect(
      applyTradeBuilderRankingResponse(rosters, {
        access: "premium",
        rankings,
      })[0].players[0]
    ).toMatchObject({ positionRank: 2, overallRank: 4 });
  });
});
