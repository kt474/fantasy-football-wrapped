export interface SeasonalAward {
  id: string;
  title: string;
  informalLabel: string;
  definition: string;
  amount: number;
  winnerOwnerId: string | null;
  winnerNameOverride?: string | null;
}

export type Env = {
  KBKH_CONTENT: KVNamespace;
};

export const AWARDS_KEY = "awards:current";

export const defaultAwards: SeasonalAward[] = [
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

export const validateAwards = (awards: unknown): awards is SeasonalAward[] => {
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

export const fetchFromKV = async (env: Env): Promise<SeasonalAward[] | null> => {
  const stored = await env.KBKH_CONTENT.get<SeasonalAward[]>(AWARDS_KEY, "json");
  return stored ?? null;
};

export const saveToKV = async (env: Env, awards: SeasonalAward[]) => {
  await env.KBKH_CONTENT.put(AWARDS_KEY, JSON.stringify(awards));
};

export const loadAwards = async (env: Env): Promise<SeasonalAward[]> => {
  const kvAwards = await fetchFromKV(env);
  if (kvAwards) return kvAwards;

  return defaultAwards;
};

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const awards = await loadAwards(env);
    return Response.json({ awards });
  } catch (error) {
    console.error("Awards API error", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
};
