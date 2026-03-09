import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getData,
  getPlayersByIdsMap,
  generatePremiumReport,
} from "../src/api/api.ts";
import {
  getAvatar,
  getDraftPicks,
  getLeague,
  getRosters,
  getSingleWeekStats,
  getUsers,
} from "../src/api/sleeperApi.ts";
import * as authFetchModule from "../src/lib/authFetch.ts";

const mockFetchResponse = (status, data, overrides = {}) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
    ...overrides,
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Sleeper API data transforms", () => {
  test("maps league response into app league shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockFetchResponse(200, {
          name: "Sample League",
          settings: {
            playoff_week_start: 15,
            last_scored_leg: 17,
            league_average_match: 1,
            type: 0,
            playoff_teams: 6,
            playoff_type: 1,
            waiver_type: 2,
          },
          total_rosters: 12,
          season: "2023",
          league_id: "992195707941212160",
          metadata: {
            latest_league_winner_roster_id: "7",
          },
          previous_league_id: "863906396951990272",
          status: "complete",
          scoring_settings: {
            rec: 1,
          },
          roster_positions: ["QB", "RB", "WR", "TE", "FLEX", "BN"],
          draft_id: "111",
          sport: "nfl",
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const data = await getLeague("992195707941212160");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(data).toEqual({
      name: "Sample League",
      regularSeasonLength: 14,
      lastScoredWeek: 17,
      medianScoring: 1,
      totalRosters: 12,
      season: "2023",
      seasonType: "Redraft",
      leagueId: "992195707941212160",
      leagueWinner: "7",
      previousLeagueId: "863906396951990272",
      status: "complete",
      scoringType: 1,
      rosterPositions: ["QB", "RB", "WR", "TE", "FLEX", "BN"],
      playoffTeams: 6,
      playoffType: 1,
      draftId: "111",
      waiverType: 2,
      sport: "nfl",
    });
  });

  test("maps roster response and computes manager efficiency", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockFetchResponse(200, [
          {
            owner_id: "730602883782926336",
            settings: {
              fpts: 1379,
              fpts_against: 1509,
              ppts: 1577,
              wins: 5,
              losses: 9,
              ties: 0,
            },
            roster_id: 1,
            metadata: {
              record: "LLLWWWLLLLWLWL",
            },
            players: ["10222", "10236", "NYJ"],
          },
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    const rosters = await getRosters("992195707941212160");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(rosters).toEqual([
      {
        id: "730602883782926336",
        pointsFor: 1379,
        pointsAgainst: 1509,
        potentialPoints: 1577,
        managerEfficiency: 0.874,
        wins: 5,
        losses: 9,
        ties: 0,
        rosterId: 1,
        recordByWeek: "LLLWWWLLLLWLWL",
        players: ["10222", "10236", "NYJ"],
      },
    ]);
  });

  test("returns default league shape for 404 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(404, {}));
    vi.stubGlobal("fetch", fetchMock);

    const data = await getLeague("missing-league");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(data).toEqual({
      name: "",
      regularSeasonLength: 0,
      medianScoring: 0,
      totalRosters: 0,
      season: "",
      seasonType: "",
      leagueId: "",
      leagueWinner: "",
      previousLeagueId: "",
      lastScoredWeek: 0,
      status: "",
      scoringType: 1,
      rosterPositions: [],
      playoffTeams: 0,
      playoffType: 0,
      draftId: "",
      waiverType: 0,
      sport: "",
    });
  });

  test("maps users even when team metadata is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, [
        {
          user_id: "u1",
          metadata: null,
          display_name: "Manager One",
          avatar: "avatar-a",
        },
        {
          user_id: "u2",
          display_name: "Manager Two",
          avatar: null,
        },
      ])
    );

    vi.stubGlobal("fetch", fetchMock);

    const users = await getUsers("league-id");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(users).toEqual([
      {
        id: "u1",
        name: "Manager One",
        username: "Manager One",
        avatar: "avatar-a",
      },
      {
        id: "u2",
        name: "Manager Two",
        username: "Manager Two",
        avatar: "",
      },
    ]);
  });

  test("returns empty player map when players endpoint is non-200", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(500, { message: "server error" }));
    vi.stubGlobal("fetch", fetchMock);

    const playersMap = await getPlayersByIdsMap(["1", "2"]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(playersMap.size).toBe(0);
  });

  test("maps players by id and ignores invalid player rows", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, {
        players: [
          { player_id: "p1", first_name: "A", last_name: "B" },
          { first_name: "Missing", last_name: "Id" },
          null,
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const playersMap = await getPlayersByIdsMap(["p1"]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(playersMap.size).toBe(1);
    expect(playersMap.get("p1")).toEqual({
      player_id: "p1",
      first_name: "A",
      last_name: "B",
    });
  });

  test("getDraftPicks handles missing metadata and avoids duplicate stats fetches", async () => {
    let statsRequestCount = 0;
    const fetchMock = vi.fn(async (url) => {
      const rawUrl = String(url);
      if (rawUrl.includes("/draft/draft-1/picks")) {
        return mockFetchResponse(200, [
          {
            player_id: "p1",
            is_keeper: false,
            metadata: {
              first_name: "Alpha",
              last_name: "One",
              amount: 25,
              position: "RB",
              team: "KC",
            },
            pick_no: 1,
            draft_slot: 1,
            round: 1,
            roster_id: 1,
            picked_by: "u1",
          },
          {
            player_id: "p1",
            is_keeper: false,
            metadata: null,
            pick_no: 2,
            draft_slot: 2,
            round: 1,
            roster_id: 2,
            picked_by: "u2",
          },
        ]);
      }

      if (rawUrl.includes("/stats/nfl/player/p1")) {
        statsRequestCount += 1;
        return mockFetchResponse(200, {
          stats: {
            pos_rank_ppr: 4,
            pts_ppr: 140,
            rank_ppr: 25,
            gp: 14,
          },
          player: {
            first_name: "Alpha",
            last_name: "One",
            position: "RB",
          },
          team: "KC",
          player_id: "p1",
        });
      }

      return mockFetchResponse(404, {});
    });

    vi.stubGlobal("fetch", fetchMock);

    const picks = await getDraftPicks("draft-1", "2025", 1, "Redraft");

    expect(statsRequestCount).toBe(1);
    expect(picks).toHaveLength(2);
    expect(picks[0].firstName).toBe("Alpha");
    expect(picks[1].firstName).toBe("");
    expect(picks[1].position).toBe("");
    expect(picks[1].team).toBe("");
    expect(picks[1].amount).toBe(0);
  });

  test("getAvatar returns deterministic cdn URL without fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const avatarUrl = await getAvatar("avatar123");
    const noAvatarUrl = await getAvatar("");

    expect(avatarUrl).toBe("https://sleepercdn.com/avatars/thumbs/avatar123");
    expect(noAvatarUrl).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("getSingleWeekStats returns fallback rows when stats fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getSingleWeekStats("p1", "2025", 8, 1);

    expect(result.points).toHaveLength(7);
    expect(result.ranks).toHaveLength(7);
    expect(result.stats).toHaveLength(7);
    expect(result.points.every((value) => value === "DNP")).toBe(true);
    expect(result.ranks.every((value) => value === "DNP")).toBe(true);
  });

  test("generatePremiumReport returns api payload when authenticated request succeeds", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      mockFetchResponse(200, { text: "premium summary" })
    );

    const result = await generatePremiumReport([], {}, "normal");

    expect(result).toEqual({ text: "premium summary" });
  });

  test("generatePremiumReport returns sign-in message on 401", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      mockFetchResponse(401, { message: "unauthorized" })
    );

    const result = await generatePremiumReport([], {}, "normal");

    expect(result).toEqual({ text: "Please sign in to use premium reports." });
  });

  test("generatePremiumReport returns transient failure message on non-401 errors", async () => {
    vi.spyOn(authFetchModule, "authenticatedFetch").mockResolvedValue(
      mockFetchResponse(500, { message: "server down" })
    );

    const result = await generatePremiumReport([], {}, "normal");

    expect(result).toEqual({
      text: "Unable to generate premium report right now. Please try again later.",
    });
  });

  test("getData composes league, matchup, transactions, and avatar URL data", async () => {
    const fetchMock = vi.fn(async (url) => {
      const rawUrl = String(url);

      if (rawUrl.endsWith("/league/league-1")) {
        return mockFetchResponse(200, {
          name: "Test League",
          settings: {
            playoff_week_start: 2,
            last_scored_leg: 1,
            league_average_match: 0,
            type: 0,
            playoff_teams: 4,
            playoff_type: 1,
            waiver_type: 2,
          },
          total_rosters: 2,
          season: "2025",
          league_id: "league-1",
          metadata: { latest_league_winner_roster_id: "1" },
          previous_league_id: null,
          status: "complete",
          scoring_settings: { rec: 1 },
          roster_positions: ["QB", "RB", "WR"],
          draft_id: "draft-1",
          sport: "nfl",
        });
      }

      if (rawUrl.endsWith("/league/league-1/rosters")) {
        return mockFetchResponse(200, [
          {
            owner_id: "u1",
            settings: {
              fpts: 100,
              fpts_against: 90,
              ppts: 120,
              wins: 1,
              losses: 0,
              ties: 0,
            },
            roster_id: 1,
            metadata: { record: "W" },
            players: ["p1"],
          },
          {
            owner_id: "u2",
            settings: {
              fpts: 90,
              fpts_against: 100,
              ppts: 110,
              wins: 0,
              losses: 1,
              ties: 0,
            },
            roster_id: 2,
            metadata: { record: "L" },
            players: ["p2"],
          },
        ]);
      }

      if (rawUrl.endsWith("/league/league-1/winners_bracket")) {
        return mockFetchResponse(200, [{ p: 1, w: 1 }]);
      }

      if (rawUrl.endsWith("/league/league-1/losers_bracket")) {
        return mockFetchResponse(200, []);
      }

      if (rawUrl.endsWith("/league/league-1/users")) {
        return mockFetchResponse(200, [
          {
            user_id: "u1",
            metadata: { team_name: "Team One" },
            display_name: "Manager One",
            avatar: "avatar1",
          },
          {
            user_id: "u2",
            metadata: null,
            display_name: "Manager Two",
            avatar: null,
          },
        ]);
      }

      if (rawUrl.endsWith("/league/league-1/matchups/1")) {
        return mockFetchResponse(200, [
          {
            roster_id: 1,
            points: 100,
            matchup_id: 1,
            players: ["p1", "b1"],
            starters: ["p1"],
            starters_points: [100],
            players_points: { p1: 100, b1: 5 },
          },
          {
            roster_id: 2,
            points: 90,
            matchup_id: 1,
            players: ["p2", "b2"],
            starters: ["p2"],
            starters_points: [90],
            players_points: { p2: 90, b2: 7 },
          },
        ]);
      }

      if (rawUrl.endsWith("/league/league-1/transactions/1")) {
        return mockFetchResponse(200, [
          {
            creator: "u1",
            status: "complete",
            adds: { p3: 1 },
            type: "waiver",
          },
          { creator: "u2", status: "pending", adds: { p4: 1 }, type: "waiver" },
        ]);
      }

      if (rawUrl.endsWith("/league/league-1/transactions/2")) {
        return mockFetchResponse(200, [
          {
            creator: "u1",
            status: "complete",
            adds: { p5: 1 },
            type: "trade",
          },
          {
            creator: "u2",
            status: "complete",
            adds: null,
            type: "waiver",
          },
        ]);
      }

      return mockFetchResponse(404, {});
    });

    vi.stubGlobal("fetch", fetchMock);

    const leagueData = await getData("league-1");

    expect(leagueData.users[0].avatarImg).toBe(
      "https://sleepercdn.com/avatars/thumbs/avatar1"
    );
    expect(leagueData.transactions).toEqual({ u1: 2 });
    expect(leagueData.trades).toHaveLength(1);
    expect(leagueData.waivers).toHaveLength(3);
    expect(leagueData.weeklyPoints).toHaveLength(2);
    expect(leagueData.legacyWinner).toBe(1);
  });
});
