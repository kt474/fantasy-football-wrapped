import { describe, expect, test } from "vitest";
import {
  buildPremiumReportPrompt,
  buildReportPrompt,
  getBenchPerformers,
  getBracketRosterIds,
  getExportPlayers,
  getExportTopTeams,
  getMatchupNumbers,
  getMatchupWinner,
  getRecordForWeek,
  getSortedTableData,
  getWeeklyPerformers,
} from "../src/components/weekly_report/weeklyReportTransforms.ts";

const player = (name, player_id, team = "BUF", position = "WR") => ({
  name,
  player_id,
  team,
  position,
});

const team = ({
  rosterId,
  name,
  username,
  points,
  matchup,
  starterPoints,
  benchPoints,
  wins = 1,
  losses = 0,
  regularSeasonRank = rosterId,
}) => ({
  id: `user-${rosterId}`,
  rosterId,
  name,
  username,
  avatarImg: `${rosterId}.png`,
  wins,
  losses,
  ties: 0,
  pointsFor: points,
  pointsAgainst: 0,
  winsAgainstAll: 0,
  lossesAgainstAll: 0,
  winsWithMedian: 0,
  lossesWithMedian: 0,
  rating: 0,
  randomScheduleWins: 0,
  potentialPoints: 0,
  managerEfficiency: 0,
  regularSeasonRank,
  expectedWinsSTD: 0,
  recordByWeek: "WL",
  players: [],
  points: [points],
  matchups: [matchup],
  starters: [[]],
  starterPoints: [starterPoints],
  benchPlayers: [[]],
  benchPoints: [benchPoints],
});

describe("weekly report transforms", () => {
  const tableData = [
    team({
      rosterId: 1,
      name: "Alpha Team",
      username: "alpha",
      points: 101,
      matchup: 7,
      starterPoints: [20, 12],
      benchPoints: [14],
      regularSeasonRank: 1,
    }),
    team({
      rosterId: 2,
      name: "Beta Team",
      username: "beta",
      points: 89,
      matchup: 7,
      starterPoints: [18, 4],
      benchPoints: [30],
      regularSeasonRank: 2,
      wins: 0,
      losses: 1,
    }),
    team({
      rosterId: 3,
      name: "Gamma Team",
      username: "gamma",
      points: 76,
      matchup: 8,
      starterPoints: [11, 9],
      benchPoints: [5],
      regularSeasonRank: 3,
      wins: 0,
      losses: 1,
    }),
  ];

  const playerNames = [
    [player("Alpha WR", "p1"), player("Bills", "BUF", "BUF", "DEF")],
    [player("Beta WR", "p2"), player("Beta RB", "p3", "MIA", "RB")],
    [player("Gamma WR", "p4"), player("Gamma TE", "p5", "NYJ", "TE")],
  ];
  const benchPlayerNames = [
    [player("Alpha Bench", "b1", "DAL", "RB")],
    [player("Beta Bench", "b2", "SF", "QB")],
    [player("Gamma Bench", "b3", "KC", "WR")],
  ];

  test("sorts teams by selected week points and lists matchup numbers", () => {
    const sorted = getSortedTableData(tableData, 0);

    expect(sorted.map((user) => user.rosterId)).toEqual([3, 2, 1]);
    expect(getMatchupNumbers(sorted, 0)).toEqual([8, 7]);
    expect(getMatchupWinner(sorted, 7, 0)).toBe(101);
  });

  test("builds regular season report prompts", () => {
    const sorted = getSortedTableData(tableData, 0);

    expect(
      buildReportPrompt({
        tableData,
        sortedTableData: sorted,
        playerNames,
        weekIndex: 0,
        showUsernames: true,
        isPlayoffs: false,
        losersBracketIds: [],
        winnersBracketIds: [],
      })
    ).toEqual([
      {
        name: "alpha",
        matchupNumber: 7,
        playerPoints: [20, 12],
        pointsScored: 101,
        winner: true,
        playerNames: ["Alpha WR", "Bills"],
        currentRecord: "1-0",
        currentRank: 1,
      },
      {
        name: "beta",
        matchupNumber: 7,
        playerPoints: [18, 4],
        pointsScored: 89,
        winner: false,
        playerNames: ["Beta WR", "Beta RB"],
        currentRecord: "0-1",
        currentRank: 2,
      },
      {
        name: "gamma",
        matchupNumber: 8,
        playerPoints: [11, 9],
        pointsScored: 76,
        winner: true,
        playerNames: ["Gamma WR", "Gamma TE"],
        currentRecord: "0-1",
        currentRank: 3,
      },
    ]);
  });

  test("builds playoff premium report prompts with bracket membership", () => {
    const sorted = getSortedTableData(tableData, 0);

    expect(
      buildPremiumReportPrompt({
        tableData,
        sortedTableData: sorted,
        playerNames,
        benchPlayerNames,
        weekIndex: 0,
        showUsernames: false,
        isPlayoffs: true,
        losersBracketIds: [3],
        winnersBracketIds: [1, 2],
      })
    ).toEqual([
      {
        name: "Alpha Team",
        matchupNumber: 7,
        winner: true,
        starterPlayerPoints: [20, 12],
        starterPlayerNames: ["Alpha WR", "Bills"],
        benchPlayerPoints: [14],
        benchPlayerNames: ["Alpha Bench"],
        pointsScored: 101,
        inLosersBracket: false,
        inWinnersBracket: true,
      },
      {
        name: "Beta Team",
        matchupNumber: 7,
        winner: false,
        starterPlayerPoints: [18, 4],
        starterPlayerNames: ["Beta WR", "Beta RB"],
        benchPlayerPoints: [30],
        benchPlayerNames: ["Beta Bench"],
        pointsScored: 89,
        inLosersBracket: false,
        inWinnersBracket: true,
      },
      {
        name: "Gamma Team",
        matchupNumber: 8,
        winner: true,
        starterPlayerPoints: [11, 9],
        starterPlayerNames: ["Gamma WR", "Gamma TE"],
        benchPlayerPoints: [5],
        benchPlayerNames: ["Gamma Bench"],
        pointsScored: 76,
        inLosersBracket: true,
        inWinnersBracket: false,
      },
    ]);
  });

  test("ranks starter and bench performers", () => {
    expect(
      getWeeklyPerformers({
        tableData,
        playerNames,
        weekIndex: 0,
        showUsernames: true,
        sortDirection: "desc",
        limit: 3,
      }).map(({ player, points, user }) => ({
        player: player.name,
        points,
        user,
      }))
    ).toEqual([
      { player: "Alpha WR", points: 20, user: "alpha" },
      { player: "Beta WR", points: 18, user: "beta" },
      { player: "Bills", points: 12, user: "alpha" },
    ]);

    expect(
      getBenchPerformers({
        tableData,
        benchPlayerNames,
        weekIndex: 0,
        showUsernames: false,
        limit: 2,
      }).map(({ player, points, user }) => ({
        player: player.name,
        points,
        user,
      }))
    ).toEqual([
      { player: "Beta Bench", points: 30, user: "Beta Team" },
      { player: "Alpha Bench", points: 14, user: "Alpha Team" },
    ]);
  });

  test("builds share-card exports and records", () => {
    const sorted = getSortedTableData(tableData, 0);
    const performers = getWeeklyPerformers({
      tableData,
      playerNames,
      weekIndex: 0,
      showUsernames: true,
      sortDirection: "desc",
      limit: 1,
    });

    expect(getExportTopTeams(sorted, 0, false)).toEqual([
      { name: "Alpha Team", points: 101, avatar: "1.png" },
      { name: "Beta Team", points: 89, avatar: "2.png" },
      { name: "Gamma Team", points: 76, avatar: "3.png" },
    ]);
    expect(getExportPlayers(performers)).toEqual([
      {
        name: "Alpha WR",
        user: "alpha",
        points: 20,
        player_id: "p1",
        position: "WR",
      },
    ]);
    expect(getRecordForWeek("WWLL", 2, false)).toBe("2 - 0");
    expect(getRecordForWeek("WLWL", 1, true)).toBe("1 - 1");
  });

  test("extracts bracket roster ids", () => {
    expect(
      getBracketRosterIds([
        { t1: 1, t2: 2, w: 1, l: 2, r: 1, m: 1 },
        { t1: 3, t2: 4, w: 3, l: 4, r: 1, m: 2 },
      ])
    ).toEqual([1, 2, 3, 4]);
  });
});
