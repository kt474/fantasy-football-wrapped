export const getEspnLeague = async (leagueId: string, season: string) => {
  try {
    const response = await fetch(
      `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mSettings&view=mTeam&view=mRoster&view=mMatchup`
    );
    return await response.json();
  } catch (error) {
    throw error;
  }
};
