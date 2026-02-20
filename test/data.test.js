import { afterEach, describe, expect, test, vi } from "vitest";
import { getLeague, getRosters } from "../src/api/api.ts";

const mockFetchResponse = (status, data) =>
  Promise.resolve({
    status,
    json: async () => data,
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
});
