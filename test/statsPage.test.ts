import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const mockGetMatchupsForWeek = vi.fn();
const mockGetPlayersDirectory = vi.fn();
const mockGetDraftPicksMap = vi.fn();
const mockGetLeague = vi.fn();
const mockGetRosters = vi.fn();
const mockGetUsers = vi.fn();

vi.mock("../src/api/sleeperClient", () => ({
  getPlayersDirectory: mockGetPlayersDirectory,
  getDraftPicksMap: mockGetDraftPicksMap,
  getMatchupsForWeek: mockGetMatchupsForWeek,
}));

vi.mock("../src/api/api", () => ({
  getLeague: mockGetLeague,
  getRosters: mockGetRosters,
  getUsers: mockGetUsers,
}));

describe("loadStatsData aggregation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clamps weeks and uses latest owner when players move teams", async () => {
    mockGetLeague.mockResolvedValue({
      season: "2024",
      seasonType: "regular",
      lastScoredWeek: 2,
      regularSeasonLength: 14,
      rosterPositions: ["QB"],
      scoringSettings: {},
      name: "Test League",
      draftId: "draft1",
    });

    mockGetRosters.mockResolvedValue([
      { rosterId: 1, id: "u1", wins: 1, losses: 0, ties: 0 },
      { rosterId: 2, id: "u2", wins: 0, losses: 1, ties: 0 },
    ]);
    mockGetUsers.mockResolvedValue([
      { id: "u1", name: "Owner One" },
      { id: "u2", name: "Owner Two" },
    ]);

    mockGetPlayersDirectory.mockResolvedValue({
      p1: { first_name: "Alex", last_name: "Ace", position: "QB", team: "DAL" },
    });
    mockGetDraftPicksMap.mockResolvedValue(new Map([["p1", { round: 1, rosterId: 1 }]]));

    mockGetMatchupsForWeek
      .mockResolvedValueOnce([
        {
          roster_id: 1,
          starters: ["p1"],
          players: ["p1"],
          players_points: { p1: 10 },
        },
      ])
      .mockResolvedValueOnce([
        {
          roster_id: 2,
          starters: ["p1"],
          players: ["p1"],
          players_points: { p1: 7 },
        },
      ]);

    const { loadStatsData } = await import("../src/api/statsPage");

    const result = await loadStatsData({
      leagueId: "L1",
      startWeek: 1,
      endWeek: 18,
    });

    expect(result.weeks).toEqual([1, 2]);
    expect(mockGetMatchupsForWeek).toHaveBeenCalledTimes(2);
    expect(result.playerRows.length).toBe(1);
    expect(result.playerRows[0].ownerName).toBe("Owner Two");
    expect(result.playerRows[0].totalPoints).toBe(17);
    expect(result.playerRows[0].draftRound).toBe(1);
  });
});
