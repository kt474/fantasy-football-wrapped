const ESPN_BASE_URL = "https://lm-api-reads.fantasy.espn.com";

export const getLeagueData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mSettings`
    );
    const json = await response.json();
    return {
      leagueName: json.settings.name,
      currentWeek: json.status.currentMatchupPeriod,
      draftDetail: json.draftDetail,
      waivers: json.settings.acquisitionSettings,
      draftSettings: json.settings.draftSettings,
      isPublic: json.settings.isPublic,
      scoringSettings: json.settings.scoringSettings,
    };
  } catch (e) {
    console.error(e);
  }
};

export const getTeamData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mTeam`
    );
    const json = await response.json();
    return {
      users: json.members,
      rosters: json.teams,
    };
  } catch (e) {
    console.error(e);
  }
};

export const getRosterData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mRoster`
    );
    const json = await response.json();
    return {
      users: json.members,
      currentWeek: json.status.currentMatchupPeriod,
      finalWeek: json.finalScoringPeriod,
      previousSeasons: json.previousSeasons,
      rosters: json.teams,
    };
  } catch (e) {
    console.error(e);
  }
};

export const getMatchups = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mMatchupScore`
    );
    const json = await response.json();
    return json.schedule;
  } catch (e) {
    console.error(e);
  }
};

export const getDraftData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mDraftDetail`
    );
    return response.json();
  } catch (e) {
    console.error(e);
  }
};
