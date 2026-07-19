import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const premiumReportExample = JSON.parse(
  await readFile(resolve("src/data/premiumReportExample.json"), "utf8")
);

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
    path: "espn-league-analyzer",
    title: "ESPN Fantasy Football League Analyzer | ffwrapped",
    description:
      "Analyze an ESPN fantasy football league with power rankings, expected wins, playoff forecasts, draft results, weekly recaps, and manager trends.",
    heading: "An ESPN fantasy football league analyzer built for the whole season",
    introduction:
      "Import a public or private ESPN league, then explore power rankings, expected wins, playoff forecasts, draft results, weekly recaps, and manager trends in one place.",
    sections: [
      {
        title: "Public and private ESPN league import",
        body: "Connect a public league with its league ID and season, or follow the guided credential steps for a private ESPN league.",
      },
      {
        title: "Power rankings and expected wins",
        body: "Compare ESPN standings with scoring, schedule strength, roster projections, and schedule-adjusted performance.",
      },
      {
        title: "Playoff forecasts and weekly reports",
        body: "Estimate the remaining playoff paths and turn completed ESPN matchups into a report for the league chat.",
      },
      {
        title: "Draft and season review",
        body: "Revisit draft results, manager decisions, scoring trends, and the season story around every team.",
      },
    ],
  },
  {
    path: "fantasy-football-draft-grades",
    title: "Fantasy Football Draft Grades for Sleeper & ESPN | ffwrapped",
    description:
      "Grade a completed fantasy football draft pick by pick using draft position, ADP, projections, and league-relative team scores.",
    heading: "Fantasy football draft grades with the picks behind the score",
    introduction:
      "Grade a completed fantasy football draft using pick position, ADP, projections, and the performance of the entire draft room.",
    sections: [
      {
        title: "Pick-by-pick draft grades",
        body: "Compare each selection with average draft position, projected points, and the value available at that point in the draft.",
      },
      {
        title: "League-relative team grades",
        body: "Combine ADP value and projected points from the first 13 selections, then grade the result against the other managers in the same draft room.",
      },
      {
        title: "Complete draft recap",
        body: "Review draft order, round reversals, auction results when available, and how draft cost compares with current positional performance.",
      },
      {
        title: "Transparent grading methodology",
        body: "See how pick cost, ADP, projections, league format, and the distribution of team scores contribute to the final grade.",
      },
    ],
  },
  {
    path: "fantasy-football-playoff-odds-calculator",
    title: "Fantasy Football Playoff Odds Calculator | ffwrapped",
    description:
      "Simulate your fantasy football season 5,000 times to estimate playoff odds, projected wins, seed ranges, and schedule scenarios.",
    heading: "Fantasy football playoff odds calculated from your real league",
    introduction:
      "Simulate the remaining schedule 5,000 times to estimate playoff probability, projected wins, likely seed, and the range of finishes still open to every team.",
    sections: [
      {
        title: "League-specific season forecast",
        body: "Use current records, completed scoring, the playoff cutoff, roster projections, and the imported remaining schedule when available.",
      },
      {
        title: "Five thousand simulated seasons",
        body: "Replay the rest of the regular season with weekly scoring variation and the league's head-to-head and median-scoring rules.",
      },
      {
        title: "Playoff and seed probability",
        body: "Compare playoff odds, top-seed odds, average seed, expected wins, and a likely range of final records.",
      },
      {
        title: "Schedule scenarios",
        body: "Replay or rearrange schedules to measure how opponent timing changes records and projected seeds.",
      },
    ],
  },
  {
    path: "fantasy-football-power-rankings",
    title: "Fantasy Football Power Rankings for Your League | ffwrapped",
    description:
      "Create fantasy football power rankings using weekly scoring, consistency, win percentage, ranking history, and positional roster strength.",
    heading: "Fantasy football power rankings with a score you can explain",
    introduction:
      "Rank every team using scoring, consistency, and results, then follow the order week by week and inspect the roster strengths behind each move.",
    sections: [
      {
        title: "A transparent ranking formula",
        body: "Combine average weekly scoring, the team's highest and lowest weeks, and win percentage in a published formula that gives scoring performance the largest weight.",
      },
      {
        title: "Weekly ranking history",
        body: "Follow each team's score from preseason through the latest completed week and revisit the order at any earlier point in the season.",
      },
      {
        title: "Position strength heatmap",
        body: "Compare projected strength at quarterback, running back, wide receiver, tight end, kicker, and defense across the entire league.",
      },
      {
        title: "Roster-level evidence",
        body: "Inspect the player rankings and position groups underneath the league order instead of relying on an unexplained overall score.",
      },
    ],
  },
  {
    path: "fantasy-football-league-history",
    title: "Fantasy Football League History & All-Time Records | ffwrapped",
    description:
      "Build a fantasy football league history with all-time standings, championships, season finishes, scoring records, and head-to-head rivalries.",
    heading: "Fantasy football league history built from every available season",
    introduction:
      "Turn years of standings and matchups into all-time records, championship history, scoring milestones, and head-to-head receipts across the connected archive.",
    sections: [
      {
        title: "All-time league standings",
        body: "Compare career records, points per game, wins above expected, manager efficiency, seasons played, and championships in one table.",
      },
      {
        title: "Season finish history",
        body: "See every available final placement, mark league champions, and open the original season behind each result.",
      },
      {
        title: "Head-to-head rivalries",
        body: "Compile manager matchup records across seasons, including the closest games and biggest blowouts in the archive.",
      },
      {
        title: "All-time scoring records",
        body: "Preserve the highest and lowest weekly scores alongside the manager, opponent, season, and week that produced them.",
      },
    ],
  },
  {
    path: "fantasy-football-weekly-recap",
    title: "Fantasy Football Weekly Recap Generator | ffwrapped",
    description:
      "Create personalized fantasy football weekly reports with matchup stories, league awards, manager context, and shareable Premium video recaps.",
    heading: "Create a fantasy football weekly recap your league will read",
    introduction:
      "Turn the week’s matchups into a polished league recap with summaries, awards, top and bottom performers, standings context, and a preview of what comes next.",
    sections: [
      {
        title: "Every matchup, in context",
        body: "Go beyond the final score with standout starters, close calls, blowouts, weekly scoring rank, and the results that changed the standings.",
      },
      {
        title: "Manager decisions and lineup efficiency",
        body: "Identify legal bench swaps, points left unused, lineup efficiency, and decisions that were large enough to change a matchup result.",
      },
      {
        title: "Standings and season consequences",
        body: "Connect each result to records, rank movement, streaks, playoff position, season averages, and the broader story around every manager.",
      },
      {
        title: "Standard and Premium reports",
        body: "Start with a free weekly summary or generate a detailed league-newspaper report with customizable commentary, sharing, and video options.",
      },
      {
        title: "Built for Sleeper and ESPN leagues",
        body: "Import a real fantasy football league without assembling matchup, roster, standings, or transaction data in a spreadsheet.",
      },
      {
        title: "Calculated before it is written",
        body: "ffwrapped normalizes league data and calculates the underlying matchup and lineup facts before AI turns the structured context into a report.",
      },
    ],
  },
  {
    path: "fantasy-football-weekly-recap-example",
    title: "Fantasy Football Weekly Recap Example | ffwrapped",
    description:
      "Read a complete fantasy football weekly recap example with championship analysis, matchup summaries, Team of the Week, and weekly lowlights.",
    heading: "Fantasy football weekly recap example: championship week",
    introduction:
      "A complete AI-written Premium report from an anonymized Sleeper league, including every Week 17 matchup, the championship story, Team of the Week, and weekly lowlights.",
    sectionHeading: "Full sample Premium report",
    ctaHref: "/fantasy-football-weekly-recap",
    ctaLabel: "Learn how fantasy football weekly recaps work",
    ogType: "article",
    sections: [
      {
        title: premiumReportExample.report.frontPage.headline,
        body: `${premiumReportExample.report.frontPage.subheadline} ${premiumReportExample.report.frontPage.lead}`,
      },
      ...premiumReportExample.report.matchupReports.map((matchup) => ({
        title: matchup.headline,
        body: matchup.recap,
      })),
      {
        title: `Team of the Week: ${premiumReportExample.report.teamOfTheWeek.teamName}`,
        body: `${premiumReportExample.report.teamOfTheWeek.headline}. ${premiumReportExample.report.teamOfTheWeek.analysis}`,
      },
      ...premiumReportExample.report.weeklyLowlights.entries.map((entry) => ({
        title: `${entry.teamName}: ${entry.headline}`,
        body: entry.analysis,
      })),
    ],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Fantasy football weekly recap example: championship week",
      description:
        "A complete AI-written fantasy football Premium report with championship analysis, four matchup recaps, Team of the Week, and weekly lowlights.",
      datePublished: "2026-07-05",
      dateModified: "2026-07-14",
      mainEntityOfPage:
        "https://ffwrapped.com/fantasy-football-weekly-recap-example",
      author: {
        "@type": "Organization",
        name: "ffwrapped",
        url: "https://ffwrapped.com/",
      },
      publisher: {
        "@type": "Organization",
        name: "ffwrapped",
        url: "https://ffwrapped.com/",
      },
      isAccessibleForFree: true,
      articleSection: "Fantasy Football Weekly Recaps",
    },
  },
];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const toolLinks = [
  { href: "/sleeper-league-analyzer", label: "Sleeper analyzer" },
  { href: "/espn-league-analyzer", label: "ESPN analyzer" },
  { href: "/fantasy-football-draft-grades", label: "Draft grades" },
  {
    href: "/fantasy-football-playoff-odds-calculator",
    label: "Playoff odds",
  },
  {
    href: "/fantasy-football-power-rankings",
    label: "Power rankings",
  },
  {
    href: "/fantasy-football-league-history",
    label: "League history",
  },
  {
    href: "/fantasy-football-weekly-recap",
    label: "Weekly recaps",
  },
];

const renderToolNavigation = (page) => `
  <nav aria-label="Fantasy football tools">
    <h2>More fantasy football tools</h2>
    <ul>
      ${toolLinks
        .filter(({ href }) => href !== `/${page.path}`)
        .map(
          ({ href, label }) =>
            `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`
        )
        .join("")}
    </ul>
  </nav>
`;

const renderStaticPage = (page) => `
  <main data-prerendered="true">
    <article class="container max-w-5xl px-5 py-16 mx-auto">
      <header>
        <h1>${escapeHtml(page.heading)}</h1>
        <p>${escapeHtml(page.introduction)}</p>
        <p><a href="${escapeHtml(page.ctaHref ?? "/")}">${escapeHtml(page.ctaLabel ?? "Analyze your fantasy football league")}</a></p>
      </header>
      <section aria-labelledby="prerendered-page-features">
        <h2 id="prerendered-page-features">${escapeHtml(page.sectionHeading ?? "Explore your league")}</h2>
        <ul>
          ${page.sections
            .map((section) => {
              const title =
                typeof section === "string" ? section : section.title;
              const body = typeof section === "string" ? "" : section.body;
              return `<li><h3>${escapeHtml(title)}</h3>${body ? `<p>${escapeHtml(body)}</p>` : ""}</li>`;
            })
            .join("")}
        </ul>
      </section>
      ${renderToolNavigation(page)}
    </article>
  </main>
`;

const template = await readFile(resolve("dist/index.html"), "utf8");

for (const page of pages) {
  const canonical = `https://ffwrapped.com/${page.path}`;
  const staticPage = renderStaticPage(page);
  const structuredData = page.structuredData
    ? `<script type="application/ld+json">${JSON.stringify(page.structuredData).replaceAll("<", "\\u003c")}</script>`
    : "";
  const html = template
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(page.title)}</title>`
    )
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
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${canonical}" />`
    )
    .replace(
      /<meta property="og:type" content="[^"]*"\s*\/>/,
      `<meta property="og:type" content="${escapeHtml(page.ogType ?? "website")}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeHtml(page.title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapeHtml(page.description)}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`
    )
    .replace('<div id="app"></div>', `<div id="app">${staticPage}</div>`)
    .replace("</head>", `${structuredData}</head>`);

  const outputDirectory = resolve("dist", page.path);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "index.html"), html);
}
