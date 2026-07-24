import { afterEach, describe, expect, test, vi } from "vitest";
import * as authFetchModule from "../src/lib/authFetch.ts";
import {
  getPlayerValues,
  getTradeQuote,
  TradeValuesAccessError,
} from "../src/api/tradeValuesApi.ts";

const response = (status, payload) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => payload,
});

const request = {
  league: {
    leagueId: "league-1",
    season: "2026",
    status: "in_season",
    scoringType: 1,
    scoringSettings: { rec: 1 },
    rosterPositions: ["QB", "RB", "WR", "BN"],
    totalRosters: 2,
    seasonType: "Redraft",
    platform: "sleeper",
  },
  rosters: [
    { id: 1, managerName: "Alpha", playerIds: ["p1"] },
    { id: 2, managerName: "Beta", playerIds: ["p2"] },
  ],
  selectedWeek: 1,
  remainingWeeks: 18,
  dynastyPerspective: "balanced",
};

afterEach(() => vi.restoreAllMocks());

describe("trade value backend client", () => {
  test("accepts a limited preview without manufacturing omitted players", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      response(200, {
        access: "preview",
        previewLimit: 10,
        totalPlayers: 42,
        rankings: [{ playerId: "p1", overallRank: 1 }],
      })
    );

    const result = await getPlayerValues(request);
    expect(result.access).toBe("preview");
    expect(result.rankings).toHaveLength(1);
    expect(result.totalPlayers).toBe(42);
  });

  test("surfaces server-side finder entitlement failures", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      response(403, { message: "Premium subscription required" })
    );

    await expect(
      getPlayerValues({ ...request, finderForRosterId: 1 })
    ).rejects.toMatchObject({
      status: 403,
      message: "Premium subscription required",
    });
    await expect(
      getPlayerValues({ ...request, finderForRosterId: 1 })
    ).rejects.toBeInstanceOf(TradeValuesAccessError);
  });

  test("sends only selected assets to the free quote endpoint", async () => {
    const fetchMock = vi
      .spyOn(authFetchModule, "authenticatedFetch")
      .mockResolvedValue(
        response(200, {
          fairnessLabel: "Very fair",
          favoredSide: "team_a",
          gapBand: "within_10_percent",
        })
      );

    await getTradeQuote(request, {
      teamARosterId: 1,
      teamBRosterId: 2,
      teamAPlayerIds: ["p1"],
      teamBPlayerIds: ["p2"],
      teamAPicks: [],
      teamBPicks: [],
      teamAFaab: 0,
      teamBFaab: 0,
      firstDraftSeason: 2026,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.quote.teamARosterId).toBe(1);
    expect(body.quote.teamBRosterId).toBe(2);
    expect(body.quote.teamAPlayerIds).toEqual(["p1"]);
    expect(body).not.toHaveProperty("rankings");
    expect(body.finderForRosterId).toBeNull();
  });
});
