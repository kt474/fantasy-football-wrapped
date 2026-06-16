import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inputLeague: vi.fn(),
  getPlayerIdLookupMap: vi.fn(),
  getPlayerIdsByNameTeamMap: vi.fn(),
  getStats: vi.fn(),
}));

vi.mock("../src/api/api.ts", () => ({
  inputLeague: mocks.inputLeague,
  getPlayerIdLookupMap: mocks.getPlayerIdLookupMap,
  getPlayerIdsByNameTeamMap: mocks.getPlayerIdsByNameTeamMap,
}));

vi.mock("../src/api/sleeperApi.ts", () => ({
  getStats: mocks.getStats,
}));

import {
  getEspnLeagueInfo,
  getLastScoredWeek,
  getLeagueData,
  getLeagueStatus,
} from "../src/api/espnApi.ts";

const mockFetchResponse = (status, data) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
  });

const buildEspnFixture = () => {
  const members = [
    {
      id: "owner-1",
      firstName: "Ava",
      lastName: "Coach",
      displayName: "ava",
    },
    {
      id: "owner-2",
      firstName: "Ben",
      lastName: "Manager",
      displayName: "ben",
    },
  ];

  const teamData = {
    teams: [
      {
        id: 1,
        location: "Ava",
        nickname: "Aces",
        primaryOwner: "owner-1",
        owners: ["owner-1"],
        logo: "https://example.com/ava.png",
        rankCalculatedFinal: 1,
        playoffSeed: 1,
        record: {
          overall: {
            wins: 2,
            losses: 0,
            ties: 0,
            pointsFor: 220.4,
            pointsAgainst: 190.2,
          },
        },
      },
      {
        id: 2,
        location: "Ben",
        nickname: "Bruisers",
        primaryOwner: "owner-2",
        owners: ["owner-2"],
        logo: "https://example.com/ben.png",
        rankCalculatedFinal: 2,
        playoffSeed: 2,
        record: {
          overall: {
            wins: 0,
            losses: 2,
            ties: 0,
            pointsFor: 190.2,
            pointsAgainst: 220.4,
          },
        },
      },
    ],
  };

  const makeEntry = ({
    id,
    name,
    team,
    position,
    lineupSlotId,
    points,
    eligibleSlots,
  }) => ({
    playerId: id,
    lineupSlotId,
    playerPoolEntry: {
      appliedStatTotal: points,
      player: {
        id,
        fullName: name,
        proTeamId: team,
        defaultPositionId: position,
        eligibleSlots,
        stats: [
          {
            statSourceId: 0,
            statSplitTypeId: 1,
            appliedTotal: points,
          },
        ],
      },
    },
  });

  const team1Week1Roster = {
    entries: [
      makeEntry({
        id: 101,
        name: "Alpha Runner",
        team: 1,
        position: 2,
        lineupSlotId: 2,
        points: 24,
        eligibleSlots: [2, 3, 23],
      }),
      makeEntry({
        id: 102,
        name: "Alpha Receiver",
        team: 2,
        position: 3,
        lineupSlotId: 4,
        points: 14,
        eligibleSlots: [4, 3, 23],
      }),
      makeEntry({
        id: 103,
        name: "Alpha Bench",
        team: 1,
        position: 2,
        lineupSlotId: 20,
        points: 19,
        eligibleSlots: [2, 3, 23],
      }),
    ],
  };
  const team2Week1Roster = {
    entries: [
      makeEntry({
        id: 201,
        name: "Beta Runner",
        team: 2,
        position: 2,
        lineupSlotId: 2,
        points: 16,
        eligibleSlots: [2, 3, 23],
      }),
      makeEntry({
        id: 202,
        name: "Beta Receiver",
        team: 1,
        position: 3,
        lineupSlotId: 4,
        points: 12,
        eligibleSlots: [4, 3, 23],
      }),
    ],
  };
  const team1Week2Roster = {
    entries: [
      makeEntry({
        id: 101,
        name: "Alpha Runner",
        team: 1,
        position: 2,
        lineupSlotId: 2,
        points: 22,
        eligibleSlots: [2, 3, 23],
      }),
      makeEntry({
        id: 102,
        name: "Alpha Receiver",
        team: 2,
        position: 3,
        lineupSlotId: 4,
        points: 15,
        eligibleSlots: [4, 3, 23],
      }),
    ],
  };
  const team2Week2Roster = {
    entries: [
      makeEntry({
        id: 201,
        name: "Beta Runner",
        team: 2,
        position: 2,
        lineupSlotId: 2,
        points: 17,
        eligibleSlots: [2, 3, 23],
      }),
      makeEntry({
        id: 202,
        name: "Beta Receiver",
        team: 1,
        position: 3,
        lineupSlotId: 4,
        points: 13,
        eligibleSlots: [4, 3, 23],
      }),
    ],
  };

  return {
    league: {
      id: 12345,
      name: "Fixture League Root",
      members,
      status: {
        currentMatchupPeriod: 3,
        latestScoringPeriod: 2,
        finalScoringPeriod: 2,
        previousSeasons: ["2024", "2023"],
      },
      settings: {
        name: "Fixture League",
        size: 2,
        scheduleSettings: {
          matchupPeriodCount: 2,
          playoffTeamCount: 2,
        },
        rosterSettings: {
          lineupSlotCounts: {
            2: 1,
            4: 1,
            20: 1,
          },
        },
        acquisitionSettings: {
          isUsingAcquisitionBudget: true,
        },
        scoringSettings: {
          scoringItems: [{ statId: 53, points: 0.5 }],
        },
        draftSettings: {
          keeperCount: 0,
        },
      },
    },
    teamData,
    rosterData: {
      teams: [
        {
          ...teamData.teams[0],
          roster: team1Week2Roster,
        },
        {
          ...teamData.teams[1],
          roster: team2Week2Roster,
        },
      ],
    },
    draftData: {
      id: "draft-123",
      draftDetail: {
        id: "draft-detail-123",
        picks: [
          {
            playerId: 101,
            player: {
              id: 101,
              fullName: "Alpha Runner",
              firstName: "Alpha",
              lastName: "Runner",
              proTeamId: 1,
              defaultPositionId: 2,
            },
            teamId: 1,
            memberId: "owner-1",
            overallPickNumber: 1,
            roundId: 1,
            roundPickNumber: 1,
            bidAmount: 0,
          },
          {
            playerId: 201,
            player: {
              id: 201,
              fullName: "Beta Runner",
              firstName: "Beta",
              lastName: "Runner",
              proTeamId: 2,
              defaultPositionId: 2,
            },
            teamId: 2,
            memberId: "owner-2",
            overallPickNumber: 2,
            roundId: 1,
            roundPickNumber: 2,
            bidAmount: 0,
          },
        ],
      },
    },
    playoffData: {
      schedule: [
        {
          id: 91,
          matchupPeriodId: 2,
          playoffTierType: "WINNERS_BRACKET",
          winner: "HOME",
          home: { teamId: 1, totalPoints: 120.4 },
          away: { teamId: 2, totalPoints: 98.1 },
        },
      ],
    },
    weeklyScoring: [
      {
        schedule: [
          {
            home: {
              teamId: 1,
              totalPoints: 110.1,
              rosterForCurrentScoringPeriod: team1Week1Roster,
            },
            away: {
              teamId: 2,
              totalPoints: 95.2,
              rosterForCurrentScoringPeriod: team2Week1Roster,
            },
          },
        ],
      },
      {
        schedule: [
          {
            home: {
              teamId: 1,
              totalPoints: 110.3,
              rosterForCurrentScoringPeriod: team1Week2Roster,
            },
            away: {
              teamId: 2,
              totalPoints: 95.0,
              rosterForCurrentScoringPeriod: team2Week2Roster,
            },
          },
        ],
      },
    ],
    waivers: [
      {
        transactions: [
          {
            status: "EXECUTED",
            type: "WAIVER",
            teamId: 1,
            memberId: "owner-1",
            scoringPeriodId: 1,
            bidAmount: 7,
            items: [{ type: "ADD", playerId: 103 }],
          },
          {
            status: "EXECUTED",
            type: "DRAFT",
            teamId: 2,
            memberId: "owner-2",
            scoringPeriodId: 1,
            items: [{ type: "ADD", playerId: 202 }],
          },
        ],
      },
      {
        transactions: [
          {
            status: "EXECUTED",
            type: "FREEAGENT",
            teamId: 2,
            memberId: "owner-2",
            scoringPeriodId: 2,
            items: [{ type: "ADD", playerId: 202 }],
          },
        ],
      },
    ],
  };
};

const installEspnFetchMock = (fixture) => {
  const fullScoreboardData = fixture.scoreboardData ?? {
    schedule: [
      ...fixture.weeklyScoring.flatMap((weekData, weekIndex) =>
        weekData.schedule.map((matchup, matchupIndex) => ({
          id: weekIndex * 100 + matchupIndex + 1,
          matchupPeriodId: weekIndex + 1,
          playoffTierType: "NONE",
          winner:
            Number(matchup.home?.totalPoints ?? 0) >=
            Number(matchup.away?.totalPoints ?? 0)
              ? "HOME"
              : "AWAY",
          ...matchup,
        }))
      ),
      ...fixture.playoffData.schedule,
    ],
  };
  const fetchMock = vi.fn(async (url) => {
    const urlString = String(url);

    if (urlString.includes("view=mSettings")) {
      return mockFetchResponse(200, fixture.league);
    }
    if (urlString.includes("view=mTeam")) {
      return mockFetchResponse(200, fixture.teamData);
    }
    if (urlString.includes("view=mRoster")) {
      return mockFetchResponse(200, fixture.rosterData);
    }
    if (urlString.includes("view=mDraftDetail")) {
      return mockFetchResponse(200, fixture.draftData);
    }
    if (
      urlString.includes("view=mMatchupScore") &&
      urlString.includes("scoringPeriodId=1")
    ) {
      return mockFetchResponse(200, fixture.weeklyScoring[0]);
    }
    if (
      urlString.includes("view=mMatchupScore") &&
      urlString.includes("scoringPeriodId=2")
    ) {
      return mockFetchResponse(200, fixture.weeklyScoring[1]);
    }
    if (urlString.includes("view=mTransactions2&scoringPeriodId=1")) {
      return mockFetchResponse(200, fixture.waivers[0]);
    }
    if (urlString.includes("view=mTransactions2&scoringPeriodId=2")) {
      return mockFetchResponse(200, fixture.waivers[1]);
    }
    if (urlString.includes("view=mMatchupScore")) {
      return mockFetchResponse(200, fullScoreboardData);
    }

    throw new Error(`Unhandled ESPN fixture URL: ${urlString}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mocks.inputLeague.mockReset();
  mocks.getPlayerIdLookupMap.mockReset();
  mocks.getPlayerIdsByNameTeamMap.mockReset();
  mocks.getStats.mockReset();
});

describe("ESPN API transforms", () => {
  test("normalizes completed ESPN seasons to the app completed status", () => {
    expect(getLeagueStatus(15, 14, 14)).toBe("complete");
  });

  test("keeps active ESPN playoff leagues in season until the final scoring period is complete", () => {
    expect(getLeagueStatus(15, 14, 14, 17)).toBe("in_season");
  });

  test("normalizes ESPN leagues to complete after the final scoring period", () => {
    expect(getLeagueStatus(18, 17, 14, 17)).toBe("complete");
  });

  test("uses ESPN latest scoring period to complete leagues with stale final matchup periods", () => {
    expect(getLastScoredWeek(16, 19, 17)).toBe(17);
    expect(getLeagueStatus(16, getLastScoredWeek(16, 19, 17), 14, 17)).toBe(
      "complete"
    );
  });

  test("does not count ESPN week 1 as scored before week 1 is complete", () => {
    expect(getLastScoredWeek(1, 1, 17)).toBe(0);
  });

  test("keeps active ESPN seasons in season", () => {
    expect(getLeagueStatus(8, 7, 14)).toBe("in_season");
  });

  test("detects ESPN pre-draft leagues", () => {
    expect(getLeagueStatus(0, 0, 14)).toBe("pre_draft");
  });

  test("detects ESPN pre-draft leagues after ESPN advances to matchup period 1", () => {
    expect(getLeagueStatus(1, 0, 14, 17, false)).toBe("pre_draft");
  });

  test("keeps post-draft ESPN preseason leagues eligible for draft news", () => {
    expect(getLeagueStatus(1, 0, 14, 17, true)).toBe("in_season");
  });

  test("fetches private ESPN league data through the credential proxy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(200, { settings: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await getLeagueData("2025", "12345", {
      swid: "{abc}",
      espnS2: "secret",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/espn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/12345?view=mSettings",
        swid: "{abc}",
        espnS2: "secret",
      }),
    });
  });

  test("normalizes ESPN league data into the app league shape", async () => {
    const fixture = buildEspnFixture();
    const fetchMock = installEspnFetchMock(fixture);
    const playerIdMap = new Map([
      ["alpha runner::ATL", "s-alpha-runner"],
      ["alpha receiver::BUF", "s-alpha-receiver"],
      ["alpha bench::ATL", "s-alpha-bench"],
      ["beta runner::BUF", "s-beta-runner"],
      ["beta receiver::ATL", "s-beta-receiver"],
    ]);

    mocks.getPlayerIdLookupMap.mockResolvedValue(playerIdMap);
    mocks.getPlayerIdsByNameTeamMap.mockImplementation(async (players) =>
      players.map(
        ({ name, team }) =>
          playerIdMap.get(`${name.trim().toLowerCase()}::${team}`) ?? null
      )
    );
    mocks.getStats.mockResolvedValue({
      rank: 8,
      ppg: 12,
      points: 144,
      overallRank: 24,
      firstName: "Mock",
      lastName: "Player",
      position: "RB",
      team: "ATL",
      id: "mock",
      gp: 12,
    });

    const league = await getEspnLeagueInfo("2025", "12345");

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(mocks.inputLeague).toHaveBeenCalledWith(
      "12345",
      "Fixture League",
      2,
      "Redraft",
      "2025",
      "espn"
    );
    expect(mocks.getPlayerIdLookupMap).toHaveBeenCalled();

    expect(league).toMatchObject({
      platform: "espn",
      name: "Fixture League",
      regularSeasonLength: 2,
      medianScoring: 0,
      totalRosters: 2,
      season: "2025",
      seasonType: "Redraft",
      leagueId: "12345",
      leagueWinner: "1",
      lastScoredWeek: 2,
      status: "complete",
      currentWeek: 3,
      scoringType: 0.5,
      rosterPositions: ["RB", "WR"],
      playoffTeams: 2,
      playoffType: 0,
      draftId: "draft-123",
      waiverType: 2,
      sport: "nfl",
    });

    expect(league.users).toEqual([
      {
        id: "owner-1",
        avatar: "owner-1",
        avatarImg: "owner-1",
        name: "Ava Aces",
        username: "ava",
      },
      {
        id: "owner-2",
        avatar: "owner-2",
        avatarImg: "owner-2",
        name: "Ben Bruisers",
        username: "ben",
      },
    ]);

    expect(league.rosters).toEqual([
      {
        id: "owner-1",
        rosterId: 1,
        pointsFor: 220.4,
        pointsAgainst: 190.2,
        potentialPoints: 75,
        managerEfficiency: 2.939,
        wins: 2,
        losses: 0,
        ties: 0,
        recordByWeek: "WW",
        players: ["s-alpha-runner", "s-alpha-receiver"],
      },
      {
        id: "owner-2",
        rosterId: 2,
        pointsFor: 190.2,
        pointsAgainst: 220.4,
        potentialPoints: 58,
        managerEfficiency: 3.279,
        wins: 0,
        losses: 2,
        ties: 0,
        recordByWeek: "LL",
        players: ["s-beta-runner", "s-beta-receiver"],
      },
    ]);

    expect(league.weeklyPoints).toEqual([
      {
        rosterId: 1,
        points: [110.1, 110.3],
        matchups: [1, 1],
        starters: [
          ["s-alpha-runner", "s-alpha-receiver"],
          ["s-alpha-runner", "s-alpha-receiver"],
        ],
        starterNames: [
          ["Alpha Runner", "Alpha Receiver"],
          ["Alpha Runner", "Alpha Receiver"],
        ],
        starterPoints: [
          [24, 14],
          [22, 15],
        ],
        benchPlayers: [["s-alpha-bench"], []],
        benchPoints: [[19], []],
      },
      {
        rosterId: 2,
        points: [95.2, 95],
        matchups: [1, 1],
        starters: [
          ["s-beta-runner", "s-beta-receiver"],
          ["s-beta-runner", "s-beta-receiver"],
        ],
        starterNames: [
          ["Beta Runner", "Beta Receiver"],
          ["Beta Runner", "Beta Receiver"],
        ],
        starterPoints: [
          [16, 12],
          [17, 13],
        ],
        benchPlayers: [[], []],
        benchPoints: [[], []],
      },
    ]);

    expect(league.transactions).toEqual({
      "owner-1": 1,
      "owner-2": 1,
    });
    expect(league.waivers).toEqual([
      {
        adds: { "s-alpha-bench": 1 },
        status: "complete",
        type: "waiver",
        roster_ids: [1],
        week: 1,
        settings: { waiver_bid: 7 },
        creator: "owner-1",
        leg: 1,
      },
      {
        adds: { "s-beta-receiver": 2 },
        status: "complete",
        type: "free_agent",
        roster_ids: [2],
        week: 2,
        settings: { waiver_bid: undefined },
        creator: "owner-2",
        leg: 2,
      },
    ]);
    expect(league.trades).toEqual([]);

    expect(league.draftPicks).toHaveLength(2);
    expect(league.draftPicks?.[0]).toMatchObject({
      firstName: "Alpha",
      lastName: "Runner",
      amount: 0,
      playerId: "s-alpha-runner",
      position: "RB",
      pickNumber: 1,
      draftSlot: 1,
      team: "ATL",
      round: 1,
      rosterId: 1,
      userId: "owner-1",
      rank: 8,
    });
    expect(league.draftMetadata).toMatchObject({
      roundReversal: 0,
      draftType: "snake",
      order: [
        {
          id: "owner-1",
          name: "Ava Aces",
          username: "ava",
          avatar: "owner-1",
          avatarImg: "owner-1",
          placement: 0,
        },
        {
          id: "owner-2",
          name: "Ben Bruisers",
          username: "ben",
          avatar: "owner-2",
          avatarImg: "owner-2",
          placement: 0,
        },
      ],
    });
    expect(league.espnWinnersBracket).toHaveLength(1);
    expect(league.espnLosersBracket).toEqual([]);
    expect(league.previousLeagues).toEqual(["2024", "2023"]);
  });

  test("falls back to weekly ESPN scoring when the full scoreboard omits roster detail", async () => {
    const fixture = buildEspnFixture();
    fixture.scoreboardData = {
      schedule: [
        {
          id: 1,
          matchupPeriodId: 1,
          playoffTierType: "NONE",
          winner: "HOME",
          home: { teamId: 1, totalPoints: 110.1 },
          away: { teamId: 2, totalPoints: 95.2 },
        },
        {
          id: 2,
          matchupPeriodId: 2,
          playoffTierType: "NONE",
          winner: "HOME",
          home: { teamId: 1, totalPoints: 110.3 },
          away: { teamId: 2, totalPoints: 95 },
        },
        ...fixture.playoffData.schedule,
      ],
    };
    const fetchMock = installEspnFetchMock(fixture);
    const playerIdMap = new Map([
      ["alpha runner::ATL", "s-alpha-runner"],
      ["alpha receiver::BUF", "s-alpha-receiver"],
      ["alpha bench::ATL", "s-alpha-bench"],
      ["beta runner::BUF", "s-beta-runner"],
      ["beta receiver::ATL", "s-beta-receiver"],
    ]);

    mocks.getPlayerIdLookupMap.mockResolvedValue(playerIdMap);
    mocks.getPlayerIdsByNameTeamMap.mockImplementation(async (players) =>
      players.map(
        ({ name, team }) =>
          playerIdMap.get(`${name.trim().toLowerCase()}::${team}`) ?? null
      )
    );
    mocks.getStats.mockResolvedValue({
      rank: 8,
      ppg: 12,
    });

    const league = await getEspnLeagueInfo("2025", "12345");

    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(league.rosters.map((roster) => roster.recordByWeek)).toEqual([
      "WW",
      "LL",
    ]);
    expect(league.weeklyPoints[0]).toMatchObject({
      points: [110.1, 110.3],
      starters: [
        ["s-alpha-runner", "s-alpha-receiver"],
        ["s-alpha-runner", "s-alpha-receiver"],
      ],
    });
  });

  test("keeps ESPN weekly data when potential-points inputs are incomplete", async () => {
    const fixture = buildEspnFixture();
    delete fixture.weeklyScoring[0].schedule[0].home
      .rosterForCurrentScoringPeriod.entries[0].playerPoolEntry.player
      .eligibleSlots;
    const fetchMock = installEspnFetchMock(fixture);
    const playerIdMap = new Map([
      ["alpha runner::ATL", "s-alpha-runner"],
      ["alpha receiver::BUF", "s-alpha-receiver"],
      ["alpha bench::ATL", "s-alpha-bench"],
      ["beta runner::BUF", "s-beta-runner"],
      ["beta receiver::ATL", "s-beta-receiver"],
    ]);

    mocks.getPlayerIdLookupMap.mockResolvedValue(playerIdMap);
    mocks.getPlayerIdsByNameTeamMap.mockImplementation(async (players) =>
      players.map(
        ({ name, team }) =>
          playerIdMap.get(`${name.trim().toLowerCase()}::${team}`) ?? null
      )
    );
    mocks.getStats.mockResolvedValue({
      rank: 8,
      ppg: 12,
    });

    const league = await getEspnLeagueInfo("2025", "12345");

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(league.rosters[0]).toMatchObject({
      pointsFor: 220.4,
      potentialPoints: 220.4,
      managerEfficiency: 1,
      recordByWeek: "WW",
    });
    expect(league.rosters[1]).toMatchObject({
      potentialPoints: 58,
      recordByWeek: "LL",
    });
    expect(league.weeklyPoints[0]).toMatchObject({
      points: [110.1, 110.3],
      starters: [
        ["s-alpha-runner", "s-alpha-receiver"],
        ["s-alpha-runner", "s-alpha-receiver"],
      ],
    });
  });

  test("normalizes ESPN leagues with no scores or picks as pre-draft", async () => {
    const fixture = buildEspnFixture();
    fixture.league.status.currentMatchupPeriod = 1;
    fixture.league.status.latestScoringPeriod = 0;
    fixture.league.status.finalScoringPeriod = 17;
    fixture.draftData.draftDetail.drafted = false;
    fixture.draftData.draftDetail.picks = [
      {
        playerId: -1,
        teamId: 1,
        overallPickNumber: 1,
        roundId: 1,
        roundPickNumber: 1,
      },
      {
        playerId: -1,
        teamId: 2,
        overallPickNumber: 2,
        roundId: 1,
        roundPickNumber: 2,
      },
    ];
    fixture.weeklyScoring = [];
    fixture.waivers = [];

    const fetchMock = installEspnFetchMock(fixture);
    mocks.getPlayerIdLookupMap.mockResolvedValue(new Map());
    mocks.getPlayerIdsByNameTeamMap.mockResolvedValue([]);

    const league = await getEspnLeagueInfo("2026", "2127");

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(league).toMatchObject({
      platform: "espn",
      leagueId: "2127",
      season: "2026",
      lastScoredWeek: 0,
      status: "pre_draft",
      draftPicks: [],
    });
  });

  test("maps ESPN draft pick owners from team ids when member ids are missing", async () => {
    const fixture = buildEspnFixture();
    delete fixture.draftData.draftDetail.picks[0].memberId;
    delete fixture.draftData.draftDetail.picks[1].memberId;
    const fetchMock = installEspnFetchMock(fixture);
    const playerIdMap = new Map([
      ["alpha runner::ATL", "s-alpha-runner"],
      ["beta runner::BUF", "s-beta-runner"],
    ]);

    mocks.getPlayerIdLookupMap.mockResolvedValue(playerIdMap);
    mocks.getPlayerIdsByNameTeamMap.mockImplementation(async (players) =>
      players.map(
        ({ name, team }) =>
          playerIdMap.get(`${name.trim().toLowerCase()}::${team}`) ?? null
      )
    );
    mocks.getStats.mockResolvedValue({
      rank: 8,
      ppg: 12,
    });

    const league = await getEspnLeagueInfo("2025", "12345");

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(league.draftPicks?.map((pick) => pick.userId)).toEqual([
      "owner-1",
      "owner-2",
    ]);
  });

  test("does not assign an ESPN league winner before the season is complete", async () => {
    const fixture = buildEspnFixture();
    fixture.league.status.currentMatchupPeriod = 2;
    fixture.league.status.latestScoringPeriod = 1;
    fixture.league.status.finalScoringPeriod = 17;
    fixture.league.settings.scheduleSettings.matchupPeriodCount = 15;
    fixture.weeklyScoring = [fixture.weeklyScoring[0]];
    fixture.waivers = [fixture.waivers[0]];
    const fetchMock = installEspnFetchMock(fixture);
    const playerIdMap = new Map([
      ["alpha runner::ATL", "s-alpha-runner"],
      ["alpha receiver::BUF", "s-alpha-receiver"],
      ["alpha bench::ATL", "s-alpha-bench"],
      ["beta runner::BUF", "s-beta-runner"],
      ["beta receiver::ATL", "s-beta-receiver"],
    ]);

    mocks.getPlayerIdLookupMap.mockResolvedValue(playerIdMap);
    mocks.getPlayerIdsByNameTeamMap.mockImplementation(async (players) =>
      players.map(
        ({ name, team }) =>
          playerIdMap.get(`${name.trim().toLowerCase()}::${team}`) ?? null
      )
    );
    mocks.getStats.mockResolvedValue({
      rank: 8,
      ppg: 12,
    });

    const league = await getEspnLeagueInfo("2025", "12345");

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(league.status).toBe("in_season");
    expect(league.leagueWinner).toBeNull();
  });
});
