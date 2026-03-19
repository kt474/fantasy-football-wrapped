const ESPN_BASE_URL = "https://lm-api-reads.fantasy.espn.com";

export const getLeagueData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mSettings`
    );
    return response.json();
  } catch (e) {
    console.error(e);
  }
};

export const getTeamData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mTeam`
    );
    return response.json();
  } catch (e) {
    console.error(e);
  }
};

export const getRosterData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mRoster`
    );
    return response.json();
  } catch (e) {
    console.error(e);
  }
};

export const getMatchups = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}?view=mMatchupScore`
    );
    return response.json();
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
