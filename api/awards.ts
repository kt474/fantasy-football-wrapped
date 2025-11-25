import { promises as fs } from "fs";
import path from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const dataDir = path.join(process.cwd(), "api", "_data");
const dataFile = path.join(dataDir, "awards.json");

const defaultAwards = [
  {
    id: "award-i",
    title: "Award I",
    informalLabel: "Acting Coach",
    definition: "Season-long award slot I. Add custom criteria in admin.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-ii",
    title: "Award II",
    informalLabel: "In the House",
    definition: "Season-long award slot II. Add custom criteria in admin.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-iii",
    title: "Award III",
    informalLabel: "Nahbers",
    definition: "Season-long award slot III. Add custom criteria in admin.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-iv",
    title: "Award IV",
    informalLabel: "Sticklemonsters",
    definition: "Season-long award slot IV. Add custom criteria in admin.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-v",
    title: "Award V",
    informalLabel: "Wonderful Team",
    definition: "Season-long award slot V. Add custom criteria in admin.",
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
