import { expect, test } from "vitest";
import { getData } from "../src/api/api.ts";

test("Retrieving league data", async () => {
  let data = await getData("992195707941212160");
  expect(data.regularSeasonLength).toBe(14);
  expect(data.lastScoredWeek).toBe(17);
  expect(data.totalRosters).toBe(12);
  expect(data.season).toBe("2023");
  expect(data.seasonType).toBe("Redraft");
  expect(data.leagueId).toBe("992195707941212160");
  expect(data.leagueWinner).toBe("7");
  expect(data.previousLeagueId).toBe("863906396951990272");
  let rosters = data.rosters;
  expect(rosters.length).toBe(12);
  expect(rosters[0]).toEqual({
    id: "730602883782926336",
    pointsFor: 1379,
    pointsAgainst: 1509,
    potentialPoints: 1577,
    managerEfficiency: 0.874,
    wins: 5,
    losses: 9,
    rosterId: 1,
    recordByWeek: "LLLWWWLLLLWLWL",
    players: [
      "10222",
      "10236",
      "2747",
      "4866",
      "4981",
      "6111",
      "6797",
      "6803",
      "7543",
      "7553",
      "8112",
      "8137",
      "9511",
      "9753",
      "NYJ",
    ],
  });
  expect(data.winnersBracket.length).toBe(7);
  expect(data.losersBracket.length).toBe(7);
  let weeklyPoints = data.weeklyPoints;
  expect(weeklyPoints.length).toBe(12);
  expect(weeklyPoints[0].rosterId).toBe(1);
  expect(weeklyPoints[0].points.length).toBe(14);
  expect(data.playoffPoints[0].points.length).toBe(3);
  expect(data.users.length).toBe(12);
  expect(data.users[1]).toEqual({
    id: "666116213100867584",
    name: "kevkevkt",
    avatar: "a77d198f5c82bd93d3da5bd10493f7cd",
    avatarImg:
      "https://sleepercdn.com/avatars/thumbs/a77d198f5c82bd93d3da5bd10493f7cd",
  });
  expect(Object.keys(data.transactions).length).toBe(12);
});
