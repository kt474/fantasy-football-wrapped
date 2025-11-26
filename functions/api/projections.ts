type Env = {
  AWARDS_KV?: KVNamespace;
};

type ProjectionRequest = {
  playerIds: string[];
  season: string;
  week: number;
  scoringType: number;
};

type ProjectionResult = {
  playerId: string;
  projection: number;
  position: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const normalizeScoringKey = (scoringType: number) => {
  if (scoringType === 0) return "pts_std";
  if (scoringType === 0.5) return "pts_half_ppr";
  return "pts_ppr";
};

const computeWeeklyProjection = (
  weeksJson: any,
  startWeek: number,
  scoringKey: string
) => {
  let total = 0;
  for (const wk in weeksJson) {
    const wkNum = Number(wk);
    if (
      Number.isFinite(wkNum) &&
      wkNum >= startWeek &&
      weeksJson[wk]?.stats?.[scoringKey] !== undefined
    ) {
      total += Number(weeksJson[wk].stats[scoringKey]) || 0;
    }
  }
  return Math.round(total);
};

const fetchProjection = async (
  playerId: string,
  season: string,
  week: number,
  scoringType: number
): Promise<ProjectionResult> => {
  const scoringKey = normalizeScoringKey(scoringType);
  try {
    const [seasonRes, weeklyRes] = await Promise.all([
      fetch(
        `https://api.sleeper.com/projections/nfl/player/${playerId}?season_type=regular&season=${season}`
      ),
      fetch(
        `https://api.sleeper.com/projections/nfl/player/${playerId}?season_type=regular&season=${season}&grouping=week`
      ),
    ]);
    const seasonJson = await seasonRes.json();
    const weeklyJson = await weeklyRes.json();
    const projection = computeWeeklyProjection(weeklyJson, week, scoringKey);
    const position = seasonJson?.player?.position || "";
    return { playerId, projection, position };
  } catch (error) {
    console.error("Projection fetch failed", playerId, error);
    return { playerId, projection: 0, position: "" };
  }
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await request.json()) as ProjectionRequest;
    const playerIds = Array.isArray(body?.playerIds)
      ? (body.playerIds.filter((id) => typeof id === "string") as string[])
      : [];
    const season = body?.season;
    const week = Number(body?.week || 0);
    const scoringType = Number.isFinite(Number(body?.scoringType))
      ? Number(body.scoringType)
      : 1;

    if (!playerIds.length || !season) {
      return new Response(
        JSON.stringify({ message: "playerIds and season are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Basic guard to avoid excessive fan-out
    const uniqueIds = Array.from(new Set(playerIds)).slice(0, 500);

    const results = await Promise.all(
      uniqueIds.map((id) => fetchProjection(id, season, week, scoringType))
    );

    return Response.json({ projections: results }, { headers: corsHeaders });
  } catch (error) {
    console.error("Projections API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
