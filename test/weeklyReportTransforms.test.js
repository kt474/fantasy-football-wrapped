import { describe, expect, test } from "vitest";
import {
  buildPremiumReportPrompt,
  buildReportPrompt,
  buildWeeklyRecapVideoProps,
  buildWeeklyWaiverContext,
  getBenchPerformers,
  getBracketRosterIds,
  getExportPlayers,
  getExportTopTeams,
  getMatchupNumbers,
  getMatchupWinner,
  getPlayoffRoundMetadata,
  getRecordForWeek,
  getSortedTableData,
  getWeeklyAwards,
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
  test("uses ESPN matchup periods to identify semifinal and final rounds", () => {
    const playoffSettings = {
      regularSeasonLength: 15,
      playoffTeams: 4,
      espnPlayoffMatchupPeriods: [[16], [17]],
    };

    expect(
      getPlayoffRoundMetadata({ ...playoffSettings, currentWeek: 16 })
    ).toEqual({
      playoffRound: "Semifinal round",
      championshipMatchup: false,
    });
    expect(
      getPlayoffRoundMetadata({ ...playoffSettings, currentWeek: 17 })
    ).toEqual({
      playoffRound: "Final Championship round",
      championshipMatchup: true,
    });
  });

  test("keeps multi-week ESPN playoff matchups in the same round", () => {
    const playoffSettings = {
      regularSeasonLength: 14,
      playoffTeams: 4,
      espnPlayoffMatchupPeriods: [
        [15, 16],
        [17, 18],
      ],
    };

    expect(
      getPlayoffRoundMetadata({ ...playoffSettings, currentWeek: 16 })
        .playoffRound
    ).toBe("Semifinal round");
    expect(
      getPlayoffRoundMetadata({ ...playoffSettings, currentWeek: 17 })
    ).toEqual({
      playoffRound: "Final Championship round",
      championshipMatchup: true,
    });
  });

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
    [player("Beta Bench", "b2", "SF", "RB")],
    [player("Gamma Bench", "b3", "KC", "WR")],
  ];

  test("sorts teams by selected week points and lists matchup numbers", () => {
    const sorted = getSortedTableData(tableData, 0);

    expect(sorted.map((user) => user.rosterId)).toEqual([3, 2, 1]);
    expect(getMatchupNumbers(sorted, 0)).toEqual([8, 7]);
    expect(getMatchupWinner(sorted, 7, 0)).toBe(101);
  });

  test("builds regular season report prompts", () => {
    expect(
      buildReportPrompt({
        tableData,
        playerNames,
        benchPlayerNames,
        weekIndex: 0,
        showUsernames: true,
        isPlayoffs: false,
      })
    ).toEqual([
      {
        teams: [
          {
            name: "alpha",
            result: "win",
            pointsScored: 101,
            weeklyScoreRank: 1,
            starters: [
              { name: "Alpha WR", team: "BUF", points: 20 },
              { name: "Bills", team: "BUF", points: 12 },
            ],
            bench: [{ name: "Alpha Bench", team: "DAL", points: 14 }],
            recordAfterWeek: "1-0",
            rankAfterWeek: 1,
          },
          {
            name: "beta",
            result: "loss",
            pointsScored: 89,
            weeklyScoreRank: 2,
            starters: [
              { name: "Beta WR", team: "BUF", points: 18 },
              { name: "Beta RB", team: "MIA", points: 4 },
            ],
            bench: [{ name: "Beta Bench", team: "SF", points: 30 }],
            recordAfterWeek: "1-0",
            rankAfterWeek: 2,
          },
        ],
      },
      {
        teams: [
          {
            name: "gamma",
            result: "win",
            pointsScored: 76,
            weeklyScoreRank: 3,
            starters: [
              { name: "Gamma WR", team: "BUF", points: 11 },
              { name: "Gamma TE", team: "NYJ", points: 9 },
            ],
            bench: [{ name: "Gamma Bench", team: "KC", points: 5 }],
            recordAfterWeek: "1-0",
            rankAfterWeek: 3,
          },
        ],
      },
    ]);
  });

  test("handles preseason rosters without record history", () => {
    const preseasonTableData = tableData.slice(0, 2).map((entry) => ({
      ...entry,
      points: [0],
      recordByWeek: undefined,
    }));
    const preseasonPlayers = playerNames.slice(0, 2);
    const preseasonBenchPlayers = benchPlayerNames.slice(0, 2);

    const standardReport = buildReportPrompt({
      tableData: preseasonTableData,
      playerNames: preseasonPlayers,
      benchPlayerNames: preseasonBenchPlayers,
      weekIndex: 0,
      showUsernames: true,
      isPlayoffs: false,
    });
    const premiumReport = buildPremiumReportPrompt({
      tableData: preseasonTableData,
      playerNames: preseasonPlayers,
      benchPlayerNames: preseasonBenchPlayers,
      weekIndex: 0,
      showUsernames: true,
      isPlayoffs: false,
      losersBracketIds: [],
      winnersBracketIds: [],
    });

    expect(standardReport[0].teams).toMatchObject([
      { recordAfterWeek: "0-0" },
      { recordAfterWeek: "0-0" },
    ]);
    expect(premiumReport[0].teams).toMatchObject([
      {
        recordBeforeWeek: "0-0",
        recordAfterWeek: "0-0",
        currentStreak: "N/A",
      },
      {
        recordBeforeWeek: "0-0",
        recordAfterWeek: "0-0",
        currentStreak: "N/A",
      },
    ]);
  });

  test("adds authoritative playoff context to standard report matchups", () => {
    const result = buildReportPrompt({
      tableData,
      playerNames,
      benchPlayerNames,
      weekIndex: 0,
      showUsernames: false,
      isPlayoffs: true,
      winnersBracket: [
        { t1: 1, t2: 2, w: 1, l: 2, r: 3, p: 1, m: 6 },
      ],
    });

    expect(result[0].playoffContext).toEqual({
      bracket: "winners",
      round: 3,
      placement: 1,
      isChampionship: true,
      leagueChampion: "Alpha Team",
    });
    expect(result[0].teams).toMatchObject([
      { name: "Alpha Team", result: "win", bracket: "winners" },
      { name: "Beta Team", result: "loss", bracket: "winners" },
    ]);
    expect(result[0].teams[0].bench).toEqual([
      { name: "Alpha Bench", team: "DAL", points: 14 },
    ]);
    expect(result[0].teams[0]).not.toHaveProperty("lineupEfficiency");
  });

  test("builds playoff premium report prompts with bracket membership", () => {
    const result = buildPremiumReportPrompt({
      tableData,
      playerNames,
      benchPlayerNames,
      weekIndex: 0,
      showUsernames: false,
      isPlayoffs: true,
      losersBracketIds: [3],
      winnersBracketIds: [1, 2],
      winnersBracket: [
        { t1: 1, t2: 2, w: 1, l: 2, r: 3, p: 1, m: 6 },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty("matchupNumber");
    expect(result[0]).not.toHaveProperty("margin");
    expect(result[0]).not.toHaveProperty("combinedPoints");
    expect(result[0].playoffContext).toEqual({
      bracket: "winners",
      round: 3,
      placement: 1,
      isChampionship: true,
      leagueChampion: "Alpha Team",
    });
    expect(result[0].teams.map((team) => team.name)).toEqual([
      "Alpha Team",
      "Beta Team",
    ]);
    expect(result[0].teams[0]).toMatchObject({
      result: "win",
      bracket: "winners",
      weeklyScoreRank: 1,
      lineupEfficiency: 1,
      pointsLeftOnBench: 0,
      starters: [
        {
          name: "Alpha WR",
          team: "BUF",
          points: 20,
        },
        {
          name: "Bills",
          team: "BUF",
          points: 12,
        },
      ],
    });
    expect(result[0].teams[0]).not.toHaveProperty("currentStreak");
    expect(result[0].teams[1]).toMatchObject({
      result: "loss",
      bracket: "winners",
      optimalPoints: 48,
      pointsLeftOnBench: 26,
      bestBenchSwap: {
        benched: { name: "Beta Bench", points: 30 },
        started: { name: "Beta RB", points: 4 },
        pointsLost: 26,
      },
    });
    expect(result[1].teams[0]).toMatchObject({
      name: "Gamma Team",
      bracket: "unknown",
    });
    expect(result[1].playoffContext).toEqual({
      bracket: "unknown",
      round: null,
      placement: null,
      isChampionship: false,
      leagueChampion: null,
    });
  });

  test("adds standings history to regular season premium matchups", () => {
    const result = buildPremiumReportPrompt({
      tableData,
      playerNames,
      benchPlayerNames,
      weekIndex: 0,
      showUsernames: true,
      isPlayoffs: false,
      losersBracketIds: [],
      winnersBracketIds: [],
    });

    expect(result[0].teams[0]).toMatchObject({
      name: "alpha",
      recordBeforeWeek: "0-0",
      recordAfterWeek: "1-0",
      rankBeforeWeek: 1,
      rankAfterWeek: 1,
      rankChange: 0,
      seasonAverageThroughWeek: 101,
      seasonAverageBeforeWeek: null,
      scoreVsSeasonAverageBeforeWeek: null,
      currentStreak: "W1",
    });
    expect(result[0]).not.toHaveProperty("previousHeadToHeadResult");
    expect(result[0].teams[0]).not.toHaveProperty("previousMatchupResult");
  });

  test("adds each team's previous result and separate head-to-head history", () => {
    const historicalTableData = [
      {
        ...tableData[0],
        points: [104, 110, 101],
        matchups: [9, 10, 7],
        starterPoints: [
          tableData[0].starterPoints[0],
          tableData[0].starterPoints[0],
          tableData[0].starterPoints[0],
        ],
        benchPoints: [
          tableData[0].benchPoints[0],
          tableData[0].benchPoints[0],
          tableData[0].benchPoints[0],
        ],
        recordByWeek: "LWW",
      },
      {
        ...tableData[1],
        points: [108, 95, 89],
        matchups: [9, 11, 7],
        starterPoints: [
          tableData[1].starterPoints[0],
          tableData[1].starterPoints[0],
          tableData[1].starterPoints[0],
        ],
        benchPoints: [
          tableData[1].benchPoints[0],
          tableData[1].benchPoints[0],
          tableData[1].benchPoints[0],
        ],
        recordByWeek: "WLL",
      },
      {
        ...tableData[2],
        points: [80, 105, 0],
        matchups: [3, 10, null],
        recordByWeek: "WL",
      },
      {
        ...tableData[2],
        id: "user-4",
        rosterId: 4,
        name: "Delta Team",
        username: "delta",
        points: [70, 100, 0],
        matchups: [4, 11, null],
        recordByWeek: "WW",
      },
    ];

    const result = buildPremiumReportPrompt({
      tableData: historicalTableData,
      playerNames: [...playerNames.slice(0, 2), [], []],
      benchPlayerNames: [...benchPlayerNames.slice(0, 2), [], []],
      weekIndex: 2,
      showUsernames: false,
      isPlayoffs: false,
      losersBracketIds: [],
      winnersBracketIds: [],
    });

    expect(result[0].teams[0].previousMatchupResult).toEqual({
      week: 2,
      opponentName: "Gamma Team",
      result: "win",
      pointsScored: 110,
      opponentPoints: 105,
      margin: 5,
    });
    expect(result[0].teams[0]).toMatchObject({
      seasonAverageBeforeWeek: 107,
      scoreVsSeasonAverageBeforeWeek: -6,
    });
    expect(result[0].teams[1].previousMatchupResult).toEqual({
      week: 2,
      opponentName: "Delta Team",
      result: "loss",
      pointsScored: 95,
      opponentPoints: 100,
      margin: 5,
    });
    expect(result[0].previousHeadToHeadResult).toEqual({
      week: 1,
      margin: 4,
      teams: [
        {
          name: "Beta Team",
          pointsScored: 108,
          result: "win",
        },
        {
          name: "Alpha Team",
          pointsScored: 104,
          result: "loss",
        },
      ],
    });
  });

  test("skips bye weeks when finding a team's previous matchup", () => {
    const historicalTableData = tableData.slice(0, 2).map((entry, index) => ({
      ...entry,
      points: index === 0 ? [110, 0, 101] : [95, 0, 89],
      matchups: index === 0 ? [1, null, 7] : [1, null, 7],
      starterPoints: [
        entry.starterPoints[0],
        entry.starterPoints[0],
        entry.starterPoints[0],
      ],
      benchPoints: [
        entry.benchPoints[0],
        entry.benchPoints[0],
        entry.benchPoints[0],
      ],
      recordByWeek: index === 0 ? "WW" : "LL",
    }));

    const result = buildPremiumReportPrompt({
      tableData: historicalTableData,
      playerNames: playerNames.slice(0, 2),
      benchPlayerNames: benchPlayerNames.slice(0, 2),
      weekIndex: 2,
      showUsernames: false,
      isPlayoffs: false,
      losersBracketIds: [],
      winnersBracketIds: [],
    });

    expect(result[0].teams[0].previousMatchupResult).toMatchObject({
      week: 1,
      opponentName: "Beta Team",
      result: "win",
      pointsScored: 110,
      opponentPoints: 95,
    });
  });

  test("treats ESPN D/ST roster slots as DEF when calculating optimal points", () => {
    const result = buildPremiumReportPrompt({
      tableData: [
        team({
          rosterId: 1,
          name: "Defense Team",
          username: "defense",
          points: 18,
          matchup: 1,
          starterPoints: [6],
          benchPoints: [18],
        }),
      ],
      playerNames: [[player("Bills", "BUF", "BUF", "DEF")]],
      benchPlayerNames: [[player("Cowboys", "DAL", "DAL", "DEF")]],
      weekIndex: 0,
      showUsernames: true,
      isPlayoffs: false,
      losersBracketIds: [],
      winnersBracketIds: [],
      rosterPositions: ["D/ST"],
    });

    expect(result[0].teams[0]).toMatchObject({
      optimalPoints: 18,
      pointsLeftOnBench: 12,
      lineupEfficiency: 0.333,
    });
  });

  test("builds weekly awards from matchup and lineup context", () => {
    const awardTableData = [
      team({
        rosterId: 1,
        name: "Alpha Team",
        username: "alpha",
        points: 100,
        matchup: 1,
        starterPoints: [60, 40],
        benchPoints: [1, 0],
      }),
      team({
        rosterId: 2,
        name: "Beta Team",
        username: "beta",
        points: 92,
        matchup: 1,
        starterPoints: [50, 42],
        benchPoints: [60, 20],
      }),
      team({
        rosterId: 3,
        name: "Gamma Team",
        username: "gamma",
        points: 80,
        matchup: 2,
        starterPoints: [50, 30],
        benchPoints: [70, 30],
      }),
      team({
        rosterId: 4,
        name: "Delta Team",
        username: "delta",
        points: 78,
        matchup: 2,
        starterPoints: [70, 8],
        benchPoints: [1, 0],
      }),
    ];
    const awardPlayerNames = [
      [player("Alpha WR", "a1", "BUF", "WR"), player("Alpha RB", "a2", "BUF", "RB")],
      [player("Beta WR", "b1", "BUF", "WR"), player("Beta RB", "b2", "BUF", "RB")],
      [player("Gamma WR", "g1", "BUF", "WR"), player("Gamma RB", "g2", "BUF", "RB")],
      [player("Delta WR", "d1", "BUF", "WR"), player("Delta RB", "d2", "BUF", "RB")],
    ];
    const awardBenchNames = [
      [player("Alpha Bench WR", "ab1", "BUF", "WR"), player("Alpha Bench RB", "ab2", "BUF", "RB")],
      [player("Beta Bench WR", "bb1", "BUF", "WR"), player("Beta Bench RB", "bb2", "BUF", "RB")],
      [player("Gamma Bench WR", "gb1", "BUF", "WR"), player("Gamma Bench RB", "gb2", "BUF", "RB")],
      [player("Delta Bench WR", "db1", "BUF", "WR"), player("Delta Bench RB", "db2", "BUF", "RB")],
    ];

    expect(
      getWeeklyAwards({
        tableData: awardTableData,
        playerNames: awardPlayerNames,
        benchPlayerNames: awardBenchNames,
        weekIndex: 0,
        showUsernames: false,
        rosterPositions: ["WR", "RB"],
      }).map((award) => ({
        id: award.id,
        teamName: award.teamName,
      }))
    ).toEqual([
      { id: "self-inflicted-wound", teamName: "Beta Team" },
      { id: "got-away-with-it", teamName: "Gamma Team" },
      { id: "deserved-better", teamName: "Beta Team" },
      { id: "one-player-carry", teamName: "Delta Team" },
    ]);
  });

  test("adds completed weekly waiver impact to premium report teams", () => {
    const waiverContext = buildWeeklyWaiverContext({
      waivers: [
        {
          status: "complete",
          type: "waiver",
          leg: 1,
          adds: { p1: 1 },
          drops: { d1: 1 },
          settings: { waiver_bid: 18 },
        },
        {
          status: "complete",
          type: "free_agent",
          leg: 1,
          adds: { b2: 2 },
          drops: null,
          settings: null,
        },
        {
          status: "failed",
          type: "waiver",
          leg: 1,
          adds: { p4: 3 },
          drops: null,
          settings: { waiver_bid: 25 },
        },
        {
          status: "complete",
          type: "waiver",
          leg: 2,
          adds: { p5: 3 },
          drops: null,
          settings: { waiver_bid: 5 },
        },
      ],
      tableData: tableData.map((entry, index) => ({
        ...entry,
        starters: [[playerNames[index][0].player_id]],
        benchPlayers: [[benchPlayerNames[index][0].player_id]],
      })),
      playerLookup: new Map([
        ["p1", player("Alpha WR", "p1")],
        ["b2", player("Beta Bench", "b2", "SF", "RB")],
      ]),
      weekIndex: 0,
    });

    const result = buildPremiumReportPrompt({
      tableData,
      playerNames,
      benchPlayerNames,
      weekIndex: 0,
      showUsernames: false,
      isPlayoffs: false,
      losersBracketIds: [],
      winnersBracketIds: [],
      waiverMovesByRoster: waiverContext,
    });

    expect(result[0].teams[0].waiverMoves).toEqual([
      {
        playerName: "Alpha WR",
        acquisitionType: "waiver",
        faabBid: 18,
        startedThisWeek: true,
        pointsScored: 20,
      },
    ]);
    expect(result[0].teams[1].waiverMoves).toEqual([
      {
        playerName: "Beta Bench",
        acquisitionType: "free_agent",
        startedThisWeek: false,
        pointsScored: 30,
      },
    ]);
    expect(result[1].teams[0]).not.toHaveProperty("waiverMoves");
  });

  test("identifies an ESPN championship and its league winner", () => {
    const result = buildPremiumReportPrompt({
      tableData,
      playerNames,
      benchPlayerNames,
      weekIndex: 0,
      showUsernames: false,
      isPlayoffs: true,
      losersBracketIds: [],
      winnersBracketIds: [],
      espnWinnersBracket: [
        {
          id: 91,
          matchupPeriodId: 2,
          playoffTierType: "WINNERS_BRACKET",
          winner: "HOME",
          home: { teamId: 1 },
          away: { teamId: 2 },
        },
      ],
    });

    expect(result[0].playoffContext).toEqual({
      bracket: "winners",
      round: 1,
      placement: 1,
      isChampionship: true,
      leagueChampion: "Alpha Team",
    });
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

  test("builds the versioned Remotion payload from report facts", () => {
    const report = {
      frontPage: { headline: "Headline", subheadline: "Sub", lead: "Lead" },
      matchupReports: [],
      teamOfTheWeek: {
        teamName: "Alpha Team",
        pointsScored: 101,
        headline: "Alpha wins",
        analysis: "Analysis",
      },
      weeklyLowlights: { headline: "Lowlights", entries: [] },
    };
    const matchups = [
      {
        teams: [
          {
            name: "Alpha Team",
            pointsScored: 101,
            bestBenchSwap: {
              benched: { name: "Bench Star", team: "BUF", points: 20 },
              started: { name: "Starter", team: "NYJ", points: 5 },
              pointsLost: 15,
            },
            rankBeforeWeek: 3,
            rankAfterWeek: 1,
          },
          { name: "Beta Team", pointsScored: 89, bestBenchSwap: null },
        ],
      },
    ];

    const result = buildWeeklyRecapVideoProps({
      league: { id: "league-1", name: "League", season: "2025", week: 7 },
      report,
      matchups,
      topTeams: [{ name: "Alpha Team", points: 101, avatar: "not-a-url" }],
      topPlayers: [
        { name: "Top Player", user: "Alpha Team", points: 25, position: "WR" },
      ],
      benchPlayers: [
        { name: "Bench Star", user: "Alpha Team", points: 20, position: "RB" },
      ],
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.facts.matchups[0]).toMatchObject({
      matchupNumber: 1,
      margin: 12,
      bracket: "regular",
    });
    expect(result.facts.topTeams[0].avatarUrl).toBeUndefined();
    expect(result.facts.benchPain[0]).toMatchObject({
      startedPlayerName: "Starter",
      pointsLost: 15,
    });
    expect(result.facts.standingsMoves).toEqual([
      { teamName: "Alpha Team", from: 3, to: 1 },
    ]);
  });
});
