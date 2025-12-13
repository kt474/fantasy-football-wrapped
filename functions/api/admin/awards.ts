import type { Env, SeasonalAward } from "../awards";
import { saveToKV, validateAwards } from "../awards";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "PUT" && request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await request.json();
    const awards = body?.awards as SeasonalAward[] | undefined;
    if (!validateAwards(awards)) {
      return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400 });
    }

    await saveToKV(env, awards);

    return Response.json({ awards });
  } catch (error) {
    console.error("Admin awards API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
};
