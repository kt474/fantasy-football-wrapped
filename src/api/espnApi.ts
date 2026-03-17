const ESPN_BASE_URL = "https://lm-api-reads.fantasy.espn.com";

export const getData = async (season: string, league_id: string) => {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${league_id}`
    );
    return response.json();
  } catch (e) {
    console.error(e);
  }
};
