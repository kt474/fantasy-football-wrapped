import { requireAccessForWrite } from "../lib/access";

export interface WeeklyBonus {
  week: number;
  label: string;
  note?: string;
  amount: number;
  winnerOwnerId: string | null;
  winnerNameOverride?: string | null;
  score: number | null;
}

type Env = {
  DB?: D1Database;
  AWARDS_KV?: KVNamespace;
};

const defaultWeeklyBonuses: WeeklyBonus[] = [
  {
    week: 15,
    label: "Highest score, non-playoff matchups",
    note: "Playoff teams, active or disqualified, are ineligible for Week 15.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
  {
    week: 16,
    label: "Highest-scoring player, non-QB",
    note: "Starter only; enter the top non-QB player score.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
  {
    week: 17,
    label: "Highest-scoring player, all positions",
    note: "Starter only; enter the top player score across all positions.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const validateWeeklyBonuses = (weeklyBonuses: unknown): weeklyBonuses is WeeklyBonus[] => {
  if (!Array.isArray(weeklyBonuses)) return false;
  return weeklyBonuses.every((b) => {
    return (
      typeof b?.week === "number" &&
      typeof b?.label === "string" &&
      typeof b?.amount === "number"
    );
  });
};

const fetchFromD1 = async (env: Env): Promise<WeeklyBonus[] | null> => {
  if (!env.DB) return null;
  const { results } = await env.DB.prepare(
    "SELECT week, label, note, amount, winnerOwnerId, winnerNameOverride, score FROM weekly_bonuses ORDER BY week"
  ).all<WeeklyBonus>();
  return results && results.length ? results : null;
};

const saveToD1 = async (env: Env, weeklyBonuses: WeeklyBonus[]) => {
  if (!env.DB) throw new Error("D1 binding missing");
  const stmt = env.DB.prepare(
    "INSERT INTO weekly_bonuses (week, label, note, amount, winnerOwnerId, winnerNameOverride, score, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now')) ON CONFLICT(week) DO UPDATE SET label=excluded.label, note=excluded.note, amount=excluded.amount, winnerOwnerId=excluded.winnerOwnerId, winnerNameOverride=excluded.winnerNameOverride, score=excluded.score, updatedAt=datetime('now')"
  );
  await env.DB.batch(
    weeklyBonuses.map((b) =>
      stmt.bind(
        b.week,
        b.label,
        b.note || null,
        b.amount,
        b.winnerOwnerId ?? null,
        b.winnerNameOverride ?? null,
        b.score ?? null
      )
    )
  );
};

const fetchFromKV = async (env: Env): Promise<WeeklyBonus[] | null> => {
  if (!env.AWARDS_KV) return null;
  const stored = await env.AWARDS_KV.get<WeeklyBonus[]>("weekly_bonuses", "json");
  return stored ?? null;
};

const saveToKV = async (env: Env, weeklyBonuses: WeeklyBonus[]) => {
  if (!env.AWARDS_KV) throw new Error("KV binding missing");
  await env.AWARDS_KV.put("weekly_bonuses", JSON.stringify(weeklyBonuses));
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
      const d1Data = await fetchFromD1(env);
      if (d1Data) return Response.json({ weeklyBonuses: d1Data }, { headers: corsHeaders });

      const kvData = await fetchFromKV(env);
      if (kvData) return Response.json({ weeklyBonuses: kvData }, { headers: corsHeaders });

      return Response.json({ weeklyBonuses: defaultWeeklyBonuses }, { headers: corsHeaders });
    }

    if (request.method === "PUT") {
      const body = await request.json();
      const weeklyBonuses = body?.weeklyBonuses;
      if (!validateWeeklyBonuses(weeklyBonuses)) {
        return new Response(JSON.stringify({ message: "Invalid payload" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (env.DB) {
        await saveToD1(env, weeklyBonuses);
      } else if (env.AWARDS_KV) {
        await saveToKV(env, weeklyBonuses);
      } else {
        return new Response(JSON.stringify({ message: "Storage not configured" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return Response.json({ weeklyBonuses }, { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Weekly bonuses API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
