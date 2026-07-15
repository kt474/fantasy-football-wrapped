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
    path: "fantasy-football-weekly-recap",
    title: "Fantasy Football Weekly Recap Generator | ffwrapped",
    description:
      "Create a personalized fantasy football weekly recap with matchup summaries, league awards, top performers, standings trends, and next-week previews.",
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
        body: "Start with a free weekly summary or generate a detailed league-newspaper report with customizable commentary, sharing, and audio options.",
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
      "Read a complete fantasy football weekly recap example with championship analysis, matchup summaries, Team of the Week, and manager blunders.",
    heading: "Fantasy football weekly recap example: championship week",
    introduction:
      "A complete AI-written Premium report from an anonymized Sleeper league, including every Week 17 matchup, the championship story, Team of the Week, and manager blunders.",
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
      ...premiumReportExample.report.managersBlotter.entries.map((entry) => ({
        title: `${entry.teamName}: ${entry.headline}`,
        body: entry.analysis,
      })),
    ],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Fantasy football weekly recap example: championship week",
      description:
        "A complete AI-written fantasy football Premium report with championship analysis, four matchup recaps, Team of the Week, and manager blunders.",
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
              const title = typeof section === "string" ? section : section.title;
              const body = typeof section === "string" ? "" : section.body;
              return `<li><h3>${escapeHtml(title)}</h3>${body ? `<p>${escapeHtml(body)}</p>` : ""}</li>`;
            })
            .join("")}
        </ul>
      </section>
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
    .replace(/<meta property="og:type" content="[^"]*"\s*\/>/, `<meta property="og:type" content="${escapeHtml(page.ogType ?? "website")}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
    .replace('<div id="app"></div>', `<div id="app">${staticPage}</div>`)
    .replace("</head>", `${structuredData}</head>`);

  const outputDirectory = resolve("dist", page.path);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "index.html"), html);
}
