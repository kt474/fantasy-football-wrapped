import { describe, expect, test } from "vitest";
import { hasLeagueSeasonData } from "../src/lib/leagueHistory.ts";

const baseLeague = {
  leagueId: "12345",
  season: "2024",
  users: [],
  rosters: [],
  weeklyPoints: [],
  lastScoredWeek: 0,
};

describe("league history helpers", () => {
  test("rejects historical league seasons with no real season data", () => {
    expect(hasLeagueSeasonData(baseLeague)).toBe(false);
  });

  test("rejects Sleeper shell seasons with teams but no games", () => {
    expect(
      hasLeagueSeasonData({
        ...baseLeague,
        users: [{ id: "u1", name: "Team", username: "team", avatar: "" }],
        rosters: [
          {
            id: "u1",
            rosterId: 1,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            recordByWeek: "",
          },
        ],
      })
    ).toBe(false);
  });

  test("rejects cached rows when every result is zero", () => {
    expect(
      hasLeagueSeasonData(baseLeague, [
        {
          id: "u1",
          rosterId: 1,
          name: "Team",
          username: "team",
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          recordByWeek: "",
        },
      ])
    ).toBe(false);
  });

  test("rejects zero-filled weekly scores without matchups", () => {
    expect(
      hasLeagueSeasonData({
        ...baseLeague,
        users: [{ id: "u1", name: "Team", username: "team", avatar: "" }],
        weeklyPoints: [{ rosterId: 1, points: [0, 0] }],
      })
    ).toBe(false);
  });

  test("rejects the 2022 Sleeper renewal shell for Sanduskys Playhouse", () => {
    expect(
      hasLeagueSeasonData(
        {
          ...baseLeague,
          leagueId: "863906396951990272",
          season: "2022",
          status: "complete",
          totalRosters: 10,
          users: [{ id: "u1", name: "Team", username: "team", avatar: "" }],
          rosters: [
            {
              id: "u1",
              rosterId: 1,
              wins: 0,
              losses: 0,
              ties: 0,
              pointsFor: 0,
              pointsAgainst: 0,
              recordByWeek: "",
            },
          ],
        },
        [
          {
            id: "u1",
            rosterId: 1,
            name: "Team",
            username: "team",
            wins: 7,
            losses: 7,
            ties: 0,
            pointsFor: 1400,
            pointsAgainst: 1350,
            recordByWeek: "WLWLWLWLWLWLWL",
          },
        ]
      )
    ).toBe(false);
  });

  test("accepts seasons with scored weeks", () => {
    expect(
      hasLeagueSeasonData({
        ...baseLeague,
        users: [{ id: "u1", name: "Team", username: "team", avatar: "" }],
        rosters: [{ id: "u1", rosterId: 1, wins: 0, losses: 0, ties: 0 }],
        lastScoredWeek: 1,
      })
    ).toBe(true);
  });

  test("rejects Sleeper roster results when lastScoredWeek is missing", () => {
    expect(
      hasLeagueSeasonData({
        ...baseLeague,
        rosters: [
          {
            id: "u1",
            rosterId: 1,
            wins: 1,
            losses: 0,
            ties: 0,
            pointsFor: 101.2,
            pointsAgainst: 88.4,
          },
        ],
      })
    ).toBe(false);
  });
});
