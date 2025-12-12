import { requireAccessForWrite } from "../lib/access";

export interface SeasonalAward {
  id: string;
  title: string;
  informalLabel: string;
  definition: string;
  amount: number;
  winnerOwnerId: string | null;
  winnerNameOverride?: string | null;
}

type Env = {
  DB?: D1Database;
  AWARDS_KV?: KVNamespace;
};

const defaultAwards: SeasonalAward[] = [
  {
    id: "award-i",
    title: "Very Stable Genius",
    informalLabel: "Most Impressive Draft",
    definition:
      "Awarded to the manager of the highest-scoring drafted players, *excluding* QBs and players drafted in any of the first three rounds. Based on the combined, total number of points recorded by all eligible players for the regular season, regardless of gameday lineups or end-of-year roster status. If you drafted them, they count for you.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-ii",
    title: "Fuck You For That Working Out",
    informalLabel: "Most Valuable Non-Draftee",
    definition:
      "Awarded to the manager with the highest-scoring non-drafted, non-QB player. The player must have been active on the team for at least one week. This player may have been acquired through trade or waiver/free-agent pickup.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-iii",
    title: "Somebody Get This Kid a Happy Meal",
    informalLabel: "Most Points Against",
    definition:
      "Awarded to the manager that had the most points scored against them over the course of the regular season.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-iv",
    title: "Damn Bro Chill",
    informalLabel: "Highest Single-Week High Score",
    definition:
      "Awarded to the manager whose starters combined to record the highest single-week score of the year -- regular season or postseason.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-v",
    title: "Dave Gettleman",
    informalLabel: "Least Valuable Early Draft Pick",
    definition:
      "Awarded to the owner of the player drafted in the first three rounds who scores the fewest points over the course of the season, provided that the player participated in at least 9 NFL games.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const validateAwards = (awards: unknown): awards is SeasonalAward[] => {
  if (!Array.isArray(awards)) return false;
  return awards.every((a) => {
    return (
      typeof a?.id === "string" &&
      typeof a?.title === "string" &&
      typeof a?.informalLabel === "string" &&
      typeof a?.definition === "string" &&
      typeof a?.amount === "number"
    );
  });
};

const fetchFromD1 = async (env: Env): Promise<SeasonalAward[] | null> => {
  if (!env.DB) return null;
  const { results } = await env.DB.prepare(
    "SELECT id, title, informalLabel, definition, amount, winnerOwnerId, winnerNameOverride FROM awards ORDER BY id"
  ).all<SeasonalAward>();
  return results && results.length ? results : null;
};

const saveToD1 = async (env: Env, awards: SeasonalAward[]) => {
  if (!env.DB) throw new Error("D1 binding missing");
  const stmt = env.DB.prepare(
    "INSERT INTO awards (id, title, informalLabel, definition, amount, winnerOwnerId, winnerNameOverride, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now')) ON CONFLICT(id) DO UPDATE SET title=excluded.title, informalLabel=excluded.informalLabel, definition=excluded.definition, amount=excluded.amount, winnerOwnerId=excluded.winnerOwnerId, winnerNameOverride=excluded.winnerNameOverride, updatedAt=datetime('now')"
  );
  await env.DB.batch(
    awards.map((a) =>
      stmt.bind(
        a.id,
        a.title,
        a.informalLabel,
        a.definition,
        a.amount,
        a.winnerOwnerId ?? null,
        a.winnerNameOverride ?? null
      )
    )
  );
};

const fetchFromKV = async (env: Env): Promise<SeasonalAward[] | null> => {
  if (!env.AWARDS_KV) return null;
  const stored = await env.AWARDS_KV.get<SeasonalAward[]>("awards", "json");
  return stored ?? null;
};

const saveToKV = async (env: Env, awards: SeasonalAward[]) => {
  if (!env.AWARDS_KV) throw new Error("KV binding missing");
  await env.AWARDS_KV.put("awards", JSON.stringify(awards));
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const access = await requireAccessForWrite(request, env);
  if (!access.ok) {
    return new Response(JSON.stringify({ message: access.message }), {
      status: access.status,
      headers: corsHeaders,
    });
  }

  try {
    if (request.method === "GET") {
      const d1Awards = await fetchFromD1(env);
      if (d1Awards) return Response.json({ awards: d1Awards }, { headers: corsHeaders });

      const kvAwards = await fetchFromKV(env);
      if (kvAwards) return Response.json({ awards: kvAwards }, { headers: corsHeaders });

      return Response.json({ awards: defaultAwards }, { headers: corsHeaders });
    }

    if (request.method === "PUT") {
      const body = await request.json();
      const awards = body?.awards;
      if (!validateAwards(awards)) {
        return new Response(JSON.stringify({ message: "Invalid payload" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (env.DB) {
        await saveToD1(env, awards);
      } else if (env.AWARDS_KV) {
        await saveToKV(env, awards);
      } else {
        return new Response(JSON.stringify({ message: "Storage not configured" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return Response.json({ awards }, { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Awards API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
