export interface WeeklyBonus {
  week: number;
  label: string;
  note?: string;
  amount: number;
  winnerOwnerId: string | null;
  winnerNameOverride?: string | null;
  score: number | null;
}

export type Env = {
  KBKH_CONTENT: KVNamespace;
};

export const WEEKLY_BONUSES_KEY = "weekly-bonuses:current";

export const defaultWeeklyBonuses: WeeklyBonus[] = [
  {
    week: 15,
    label: "Highest score, non-playoff matchups",
    note: "Starter only",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
  {
    week: 16,
    label: "Highest-scoring player, non-QB",
    note: "Starter only",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
  {
    week: 17,
    label: "Highest-scoring player, all positions",
    note: "Starter only",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
];

export const validateWeeklyBonuses = (
  weeklyBonuses: unknown
): weeklyBonuses is WeeklyBonus[] => {
  if (!Array.isArray(weeklyBonuses)) return false;
  return weeklyBonuses.every((b) => {
    return (
      typeof b?.week === "number" &&
      typeof b?.label === "string" &&
      typeof b?.amount === "number"
    );
  });
};

export const fetchFromKV = async (env: Env): Promise<WeeklyBonus[] | null> => {
  const stored = await env.KBKH_CONTENT.get<WeeklyBonus[]>(WEEKLY_BONUSES_KEY, "json");
  return stored ?? null;
};

export const saveToKV = async (env: Env, weeklyBonuses: WeeklyBonus[]) => {
  await env.KBKH_CONTENT.put(WEEKLY_BONUSES_KEY, JSON.stringify(weeklyBonuses));
};

export const loadWeeklyBonuses = async (env: Env): Promise<WeeklyBonus[]> => {
  const kvData = await fetchFromKV(env);
  if (kvData) return kvData;

  return defaultWeeklyBonuses;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const weeklyBonuses = await loadWeeklyBonuses(env);
    return Response.json({ weeklyBonuses });
  } catch (error) {
    console.error("Weekly bonuses API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
};
