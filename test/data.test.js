import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getLeague,
  getPlayersByIdsMap,
  getRosters,
  getUsers,
} from "../src/api/api.ts";

const mockFetchResponse = (status, data, overrides = {}) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
    ...overrides,
  });

afterEach(() => {
  vi.restoreAllMocks();
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
        avatar: null,
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
});
