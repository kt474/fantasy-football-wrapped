import type { Env, WeeklyBonus } from "../weekly-bonuses";
import { saveToKV, validateWeeklyBonuses } from "../weekly-bonuses";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "PUT" && request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await request.json();
    const weeklyBonuses = body?.weeklyBonuses as WeeklyBonus[] | undefined;
    if (!validateWeeklyBonuses(weeklyBonuses)) {
      return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400 });
    }

    await saveToKV(env, weeklyBonuses);

    return Response.json({ weeklyBonuses });
  } catch (error) {
    console.error("Admin weekly bonuses API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
};
