import { describe, expect, test } from "vitest";
import { formatOrdinal, getFinalPlacements } from "../src/lib/seasonFinish.ts";

const user = (id, rosterId, name) => ({
  id,
  rosterId,
  name,
  username: name.toLowerCase(),
  avatar: "",
  avatarImg: "",
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  winsAgainstAll: 0,
  lossesAgainstAll: 0,
  winsWithMedian: 0,
  lossesWithMedian: 0,
  rating: 0,
  randomScheduleWins: 0,
  potentialPoints: 0,
  managerEfficiency: 0,
  regularSeasonRank: rosterId,
  expectedWinsSTD: 0,
  recordByWeek: "",
  players: [],
  points: [],
  matchups: [],
  starters: [],
  starterPoints: [],
  benchPlayers: [],
  benchPoints: [],
});

describe("season finish helpers", () => {
  test("formats ordinal placements", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(21)).toBe("21st");
  });

  test("derives Sleeper final placements from completed playoff brackets", () => {
    const tableData = [
      user("u1", 1, "Alpha"),
      user("u2", 2, "Beta"),
      user("u3", 3, "Gamma"),
      user("u4", 4, "Delta"),
    ];
    const league = {
      platform: "sleeper",
      status: "complete",
      totalRosters: 4,
      playoffType: 0,
      winnersBracket: [
        { m: 1, r: 2, t1: 1, t2: 2, w: 2, l: 1, p: 1 },
        { m: 2, r: 2, t1: 3, t2: 4, w: 3, l: 4, p: 3 },
      ],
      losersBracket: [],
      rosters: tableData.map((team) => ({
        id: team.id,
        rosterId: team.rosterId,
      })),
      users: tableData.map((team) => ({
        id: team.id,
        name: team.name,
        username: team.username,
        avatar: "",
        avatarImg: "",
      })),
    };

    expect(
      getFinalPlacements(league, tableData).map((placement) => ({
        rosterId: placement.rosterId,
        placement: placement.placement,
      }))
    ).toEqual([
      { rosterId: 2, placement: 1 },
      { rosterId: 1, placement: 2 },
      { rosterId: 3, placement: 3 },
      { rosterId: 4, placement: 4 },
    ]);
  });
});
