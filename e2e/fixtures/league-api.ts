import type { Page, Route } from "@playwright/test";

export const SLEEPER_LEAGUE_ID = "1257467010120425472";
export const ESPN_LEAGUE_ID = "2127";
export const ESPN_SEASON = "2026";

export const SLEEPER_LEAGUE_NAME = "Sleeper League 1257467010120425472";
export const ESPN_LEAGUE_NAME = "ESPN League 2127";

type LeagueApiControls = {
  sleeperLeagueName: string;
  failSleeperRequests: boolean;
  failEspnRequests: boolean;
  sleeperLeagueRequests: number;
  espnRequests: number;
};

const jsonResponse = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const sleeperLeagueResponse = (name: string) => ({
  name,
  total_rosters: 2,
  season: ESPN_SEASON,
  league_id: SLEEPER_LEAGUE_ID,
  previous_league_id: null,
  status: "pre_draft",
  sport: "nfl",
  draft_id: null,
  metadata: {},
  settings: {
    playoff_week_start: 15,
    last_scored_leg: 0,
    league_average_match: 0,
    type: 0,
    playoff_teams: 2,
    playoff_type: 0,
    waiver_type: 2,
  },
  scoring_settings: {
    rec: 1,
  },
  roster_positions: ["QB", "RB", "WR", "FLEX", "BN"],
});

const sleeperRostersResponse = [
  {
    owner_id: "sleeper-owner-1",
    roster_id: 1,
    players: [],
    metadata: { record: "" },
    settings: {
      fpts: 0,
      fpts_against: 0,
      ppts: 0,
      wins: 0,
      losses: 0,
      ties: 0,
    },
  },
  {
    owner_id: "sleeper-owner-2",
    roster_id: 2,
    players: [],
    metadata: { record: "" },
    settings: {
      fpts: 0,
      fpts_against: 0,
      ppts: 0,
      wins: 0,
      losses: 0,
      ties: 0,
    },
  },
];

const sleeperUsersResponse = [
  {
    user_id: "sleeper-owner-1",
    display_name: "Sleeper Manager One",
    avatar: null,
    metadata: { team_name: "Sleeper Team One" },
  },
  {
    user_id: "sleeper-owner-2",
    display_name: "Sleeper Manager Two",
    avatar: null,
    metadata: { team_name: "Sleeper Team Two" },
  },
];

const sleeperMatchupsResponse = [
  {
    roster_id: 1,
    points: 0,
    matchup_id: 1,
    players: [],
    starters: [],
    starters_points: [],
    players_points: {},
  },
  {
    roster_id: 2,
    points: 0,
    matchup_id: 1,
    players: [],
    starters: [],
    starters_points: [],
    players_points: {},
  },
];

const espnMembers = [
  {
    id: "espn-owner-1",
    firstName: "ESPN",
    lastName: "Manager One",
    displayName: "espn-manager-one",
  },
  {
    id: "espn-owner-2",
    firstName: "ESPN",
    lastName: "Manager Two",
    displayName: "espn-manager-two",
  },
];

const espnTeams = [
  {
    id: 1,
    location: "ESPN",
    nickname: "Team One",
    primaryOwner: "espn-owner-1",
    owners: ["espn-owner-1"],
    record: {
      overall: {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    },
  },
  {
    id: 2,
    location: "ESPN",
    nickname: "Team Two",
    primaryOwner: "espn-owner-2",
    owners: ["espn-owner-2"],
    record: {
      overall: {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    },
  },
];

const espnLeagueResponse = {
  id: Number(ESPN_LEAGUE_ID),
  name: ESPN_LEAGUE_NAME,
  members: espnMembers,
  status: {
    currentMatchupPeriod: 0,
    latestScoringPeriod: 0,
    finalScoringPeriod: 17,
    previousSeasons: [],
  },
  settings: {
    name: ESPN_LEAGUE_NAME,
    size: 2,
    scheduleSettings: {
      matchupPeriodCount: 14,
      playoffTeamCount: 2,
      matchupPeriods: {},
    },
    rosterSettings: {
      lineupSlotCounts: {
        0: 1,
        2: 1,
        4: 1,
        20: 4,
      },
    },
    acquisitionSettings: {
      isUsingAcquisitionBudget: true,
    },
    scoringSettings: {
      scoringItems: [{ statId: 53, points: 1 }],
    },
    draftSettings: {
      keeperCount: 0,
    },
  },
};

const espnTeamResponse = {
  teams: espnTeams,
};

const espnRosterResponse = {
  teams: espnTeams.map((team) => ({
    ...team,
    roster: { entries: [] },
  })),
};

const espnDraftResponse = {
  id: "",
  draftDetail: {
    drafted: false,
    picks: [],
  },
};

const handleSleeperRequest = async (
  route: Route,
  controls: LeagueApiControls
) => {
  const url = new URL(route.request().url());
  const path = url.pathname;

  if (!path.includes(`/league/${SLEEPER_LEAGUE_ID}`)) {
    await route.continue();
    return;
  }

  if (controls.failSleeperRequests) {
    await jsonResponse(route, { error: "Sleeper unavailable" }, 503);
    return;
  }

  if (path === `/v1/league/${SLEEPER_LEAGUE_ID}`) {
    controls.sleeperLeagueRequests += 1;
    await jsonResponse(
      route,
      sleeperLeagueResponse(controls.sleeperLeagueName)
    );
    return;
  }
  if (path.endsWith("/rosters")) {
    await jsonResponse(route, sleeperRostersResponse);
    return;
  }
  if (path.endsWith("/users")) {
    await jsonResponse(route, sleeperUsersResponse);
    return;
  }
  if (path.endsWith("/winners_bracket") || path.endsWith("/losers_bracket")) {
    await jsonResponse(route, []);
    return;
  }
  if (path.endsWith("/matchups/1")) {
    await jsonResponse(route, sleeperMatchupsResponse);
    return;
  }
  if (path.endsWith("/transactions/1")) {
    await jsonResponse(route, []);
    return;
  }

  await jsonResponse(route, { error: `Unhandled Sleeper path: ${path}` }, 404);
};

const handleEspnRequest = async (
  route: Route,
  controls: LeagueApiControls
) => {
  controls.espnRequests += 1;

  if (controls.failEspnRequests) {
    await jsonResponse(route, { error: "ESPN unavailable" }, 503);
    return;
  }

  const url = new URL(route.request().url());
  const views = url.searchParams.getAll("view");

  if (views.includes("mSettings")) {
    await jsonResponse(route, espnLeagueResponse);
    return;
  }
  if (views.includes("mTeam")) {
    await jsonResponse(route, espnTeamResponse);
    return;
  }
  if (views.includes("mRoster")) {
    await jsonResponse(route, espnRosterResponse);
    return;
  }
  if (views.includes("mDraftDetail")) {
    await jsonResponse(route, espnDraftResponse);
    return;
  }
  if (views.includes("mMatchupScore") || views.includes("mScoreboard")) {
    await jsonResponse(route, { schedule: [] });
    return;
  }

  await jsonResponse(
    route,
    { error: `Unhandled ESPN request: ${url.toString()}` },
    404
  );
};

export const installLeagueApiMocks = async (
  page: Page
): Promise<LeagueApiControls> => {
  const controls: LeagueApiControls = {
    sleeperLeagueName: SLEEPER_LEAGUE_NAME,
    failSleeperRequests: false,
    failEspnRequests: false,
    sleeperLeagueRequests: 0,
    espnRequests: 0,
  };

  // League analytics are intentionally fire-and-forget in the app. Keeping
  // those writes local prevents the E2E suite from depending on a backend.
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.continue();
  });

  await page.route("https://api.sleeper.app/v1/**", (route) =>
    handleSleeperRequest(route, controls)
  );
  await page.route(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${ESPN_SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}**`,
    (route) => handleEspnRequest(route, controls)
  );

  return controls;
};

