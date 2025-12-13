import { promises as fs } from "fs";
import path from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const dataDir = path.join(process.cwd(), "api", "_data");
const dataFile = path.join(dataDir, "awards.json");

const defaultAwards = [
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

const ensureDataFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(defaultAwards, null, 2), "utf-8");
  }
};

const readAwards = async () => {
  await ensureDataFile();
  const content = await fs.readFile(dataFile, "utf-8");
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : defaultAwards;
};

const writeAwards = async (awards: any[]) => {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(awards, null, 2), "utf-8");
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const awards = await readAwards();
      return res.status(200).json({ awards });
    }

    if (req.method === "PUT") {
      const awards = req.body?.awards;
      if (!Array.isArray(awards)) {
        return res.status(400).json({ message: "Invalid payload" });
      }
      await writeAwards(awards);
      return res.status(200).json({ awards });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    console.error("Awards API error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
