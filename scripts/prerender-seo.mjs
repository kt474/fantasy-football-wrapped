import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const pages = [
  {
    path: "",
    title: "Fantasy Football Wrapped",
    description:
      "Analyze your fantasy football league with interactive charts, power rankings, roster insights, custom weekly reports, and more.",
    heading: "All your fantasy football league insights in one place",
    introduction:
      "Analyze your Sleeper or ESPN league with power rankings, roster insights, custom weekly reports, playoff odds, draft grades, and league history.",
    sections: [
      "Power rankings and roster insights",
      "Weekly reports and matchup previews",
      "Playoff odds and expected wins",
      "Draft grades, trades, and league history",
    ],
  },
  {
    path: "about",
    title: "About | ffwrapped",
    description:
      "Learn about ffwrapped, a tool for analyzing fantasy football leagues.",
    heading: "About ffwrapped",
    introduction:
      "Kevin built ffwrapped to make fantasy football leagues more fun to follow, with stats, charts, recaps, and awards that bring each season’s story to life.",
    sections: [
      "Free and ad-free core experience",
      "Sleeper and ESPN league support",
      "Open source project",
      "Fantasy football statistics and analysis",
    ],
  },
  {
    path: "changelog",
    title: "Changelog | ffwrapped",
    description: "See the latest ffwrapped updates, features, and bug fixes.",
    heading: "ffwrapped changelog",
    introduction:
      "Follow the latest ffwrapped features, product updates, and fixes for fantasy football league analysis, reports, manager profiles, trades, and more.",
    sections: [
      "Weekly report improvements",
      "League history and manager profiles",
      "Trade database and Trade Lab",
      "ESPN fantasy football support",
    ],
  },
  {
    path: "sleeper-league-analyzer",
    title: "Sleeper Fantasy Football League Analyzer | ffwrapped",
    description:
      "Analyze any Sleeper fantasy football league with power rankings, playoff odds, weekly recaps, draft grades, roster insights, and league history.",
    heading: "A complete Sleeper fantasy football league analyzer",
    introduction:
      "Turn your Sleeper league data into power rankings, expected wins, playoff odds, draft grades, matchup recaps, manager profiles, and shareable season stories.",
    sections: [
      "Power rankings and expected wins",
      "Weekly league recaps",
      "Draft and roster analysis",
      "League history",
    ],
  },
  {
    path: "fantasy-football-weekly-recap",
    title: "Fantasy Football Weekly Recap Generator | ffwrapped",
    description:
      "Create a personalized fantasy football weekly recap with matchup summaries, league awards, top performers, standings trends, and next-week previews.",
    heading: "Create a fantasy football weekly recap your league will read",
    introduction:
      "Turn the week’s matchups into a polished league recap with summaries, awards, top and bottom performers, standings context, and a preview of what comes next.",
    sections: [
      "Matchup-by-matchup summaries",
      "Weekly awards and performers",
      "Standings and season context",
      "Shareable presentation",
    ],
  },
];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const template = await readFile(resolve("dist/index.html"), "utf8");

for (const page of pages) {
  const canonical = `https://ffwrapped.com/${page.path}`;
  const fallback = `<noscript><main><article><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.introduction)}</p><h2>Explore your league</h2><ul>${page.sections.map((section) => `<li>${escapeHtml(section)}</li>`).join("")}</ul><p><a href="/">Analyze your fantasy football league</a></p></article></main></noscript>`;
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtml(page.description)}" />`
    )
    .replace(
      /<meta\s+itemprop="name"\s+content="[^"]*"\s*\/>/,
      `<meta itemprop="name" content="${escapeHtml(page.title)}" />`
    )
    .replace(
      /<meta\s+itemprop="description"\s+content="[^"]*"\s*\/>/,
      `<meta itemprop="description" content="${escapeHtml(page.description)}" />`
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${canonical}" />`
    )
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
    .replace('<div id="app"></div>', `<div id="app">${fallback}</div>`);

  const outputDirectory = resolve("dist", page.path);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "index.html"), html);
}
