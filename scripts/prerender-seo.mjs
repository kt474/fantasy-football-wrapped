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
      {
        title: "Power rankings and expected wins",
        body: "Compare record, all-play results, schedule strength, scoring, and roster projections to see which Sleeper teams are stronger than the standings suggest.",
      },
      {
        title: "Weekly league recaps",
        body: "Turn completed Sleeper matchups into weekly summaries, awards, lineup analysis, previews, and shareable league stories.",
      },
      {
        title: "Draft and roster analysis",
        body: "Review completed draft grades, roster projections, lineup decisions, trades, and waiver activity using the data attached to the league.",
      },
      {
        title: "League history",
        body: "Follow linked Sleeper seasons to compare final placements, head-to-head records, scoring milestones, and manager trends over time.",
      },
    ],
    faqs: [
      {
        question: "Where do I find my Sleeper fantasy football league ID?",
        answer:
          "Open the league in Sleeper on the web and copy the numeric league ID from the URL. You can also enter a Sleeper username and select a season.",
      },
      {
        question: "Can I analyze a Sleeper league before the season starts?",
        answer:
          "Yes. Preseason views use the league settings, rosters, projections, and completed draft data currently available. Results-based views appear after matchups are scored.",
      },
      {
        question: "Does ffwrapped support dynasty and redraft leagues?",
        answer:
          "ffwrapped supports Sleeper NFL leagues across common redraft, keeper, and dynasty setups, subject to the data available for that league.",
      },
    ],
  },
  {
    path: "espn-league-analyzer",
    title: "ESPN Fantasy Football League Analyzer | ffwrapped",
    description:
      "Analyze an ESPN fantasy football league with power rankings, expected wins, playoff forecasts, draft results, weekly recaps, and manager trends.",
    heading:
      "An ESPN fantasy football league analyzer built for the whole season",
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
    faqs: [
      {
        question: "Where do I find my ESPN fantasy football league ID?",
        answer:
          "Open the league in ESPN and use the number following leagueId= in the page URL, then select the matching season in ffwrapped.",
      },
      {
        question: "Can ffwrapped analyze a private ESPN league?",
        answer:
          "Yes. Private leagues require the SWID and espn_s2 values from the signed-in ESPN browser session in addition to the league ID and season.",
      },
      {
        question: "Can I grade my ESPN fantasy football draft?",
        answer:
          "Yes. After a completed ESPN draft is available to import, the Draft area shows the board and supported pick and team grades.",
      },
    ],
  },
  {
    path: "fantasy-football-draft-grades",
    title: "Fantasy Football Draft Grades for Sleeper & ESPN | ffwrapped",
    description:
      "Grade a completed fantasy football draft, then use league history for manager tendencies, positional plans, and Premium draft-room scouting.",
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
      {
        title: "Draft tendencies and Premium planning",
        body: "Review each manager’s historical position patterns for free, then use Premium for round-by-round positional plans, projected room pressure, strategy shifts, and league-relative scouting.",
      },
    ],
    faqs: [
      {
        question: "Which platforms can I use for draft grades?",
        answer:
          "ffwrapped loads completed draft data from connected Sleeper and ESPN fantasy football leagues when that draft data is available.",
      },
      {
        question: "What goes into a fantasy football draft grade?",
        answer:
          "Individual grades compare pick number with average draft position. Team grades combine ADP value and projected points, then compare the result with the rest of the draft room.",
      },
      {
        question: "When are draft grades available?",
        answer:
          "Draft grades are available after the draft is complete and the platform exposes its finished picks.",
      },
    ],
  },
  {
    path: "fantasy-football-draft-room-example",
    title: "Fantasy Football Draft Room Scouting Example | ffwrapped",
    description:
      "Preview a fantasy football positional draft plan with projected room pressure, manager tendencies, and league-history scouting.",
    heading:
      "See what your draft room usually does before you are on the clock",
    introduction:
      "A complete Premium Draft Room sample built from several seasons of manager draft tendencies and adjusted to one team and snake-draft slot.",
    sectionHeading: "What the Draft Room sample shows",
    ctaHref: "/account?intent=draft_room&upgrade_source=draft_room_example",
    ctaLabel: "Explore ffwrapped Premium",
    sections: [
      {
        title: "Round-by-round positional plan",
        body: "Estimate which positions may thin out before each pick and where historical room pressure is strongest.",
      },
      {
        title: "Draft-slot context",
        body: "Build the plan around a specific manager and snake-draft slot instead of following one generic strategy.",
      },
      {
        title: "Manager draft patterns",
        body: "Compare opening strategies, early position lean, quarterback timing, recent shifts, and league-relative tendencies.",
      },
      {
        title: "History-based estimates",
        body: "Use completed drafts from the connected league while treating every pattern as an estimate rather than a prediction.",
      },
    ],
  },
  {
    path: "fantasy-football-manager-profiles-rivalry-report-example",
    title: "Fantasy Football Manager Profiles & Rivalry Reports | ffwrapped",
    description:
      "Preview fantasy football manager profiles and rivalry reports built from career records, tendencies, head-to-head history, and league milestones.",
    heading: "Fantasy football manager profiles and rivalry reports",
    introduction:
      "See how several seasons of league history become a distinct profile for every manager, then a personalized rivalry story for any two league mates.",
    sectionHeading: "What manager profiles and rivalry reports show",
    ctaHref:
      "/account?intent=manager_profiles&upgrade_source=manager_profiles_rivalry_example",
    ctaLabel: "Explore ffwrapped Premium",
    sections: [
      {
        title: "Career manager profiles",
        body: "Combine career records, scoring, lineup efficiency, playoff appearances, titles, transactions, and draft habits into a league specific manager identity.",
      },
      {
        title: "Personalized profile commentary",
        body: "Turn the calculated record into a readable description of each manager’s strengths, tendencies, and long term style while keeping the supporting numbers visible.",
      },
      {
        title: "Head-to-head rivalry history",
        body: "Compare any two managers across every available season using matchup records, closest games, biggest blowouts, scoring, efficiency, and championships.",
      },
      {
        title: "Rivalry stories and bragging rights",
        body: "Connect the shared history into a personalized report that explains what makes the matchup distinct and which manager owns the stronger claim.",
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
        title: "League specific season forecast",
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
    heading:
      "Fantasy football league history built from every available season",
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
    path: "fantasy-football-player-values",
    title: "Fantasy Football Player Values for Your League | ffwrapped",
    description:
      "Rank fantasy football players with trade values adjusted for your league size, scoring, lineup requirements, and redraft or dynasty format.",
    heading: "Fantasy football player values built for your league",
    introduction:
      "Rank every rostered player using your league’s format, scoring, and lineup requirements instead of relying on one generic trade value chart.",
    ctaHref: "/?source=player_values_landing",
    ctaLabel: "Analyze your league",
    sections: [
      {
        title: "Adjusted to your league",
        body: "Scoring, league size, starting requirements, and positional scarcity shape every player value.",
      },
      {
        title: "Redraft and dynasty rankings",
        body: "Use rest-of-season production for redraft or blend long-term market value with projected production and team direction in dynasty.",
      },
      {
        title: "Values you can compare",
        body: "Rank every rostered player together, filter by position, and inspect the production and replacement level behind each value.",
      },
    ],
  },
  {
    path: "fantasy-football-trade-finder",
    title: "Fantasy Football Trade Finder for Your League | ffwrapped",
    description:
      "Scan your fantasy football league for balanced trade ideas projected to improve both starting lineups in redraft and dynasty formats.",
    heading: "Find fantasy football trades that help both teams",
    introduction:
      "Trade Finder scans the real rosters in your league for balanced deals projected to improve both teams’ starting lineups.",
    ctaHref: "/?source=trade_finder_landing",
    ctaLabel: "Analyze your league",
    sections: [
      {
        title: "Scan the whole league",
        body: "Compare your roster with every opponent to uncover deals you may not think to build manually.",
      },
      {
        title: "Look for mutual benefit",
        body: "Suggestions stay reasonably balanced and focus on trades that improve both projected starting lineups.",
      },
      {
        title: "Use league specific values",
        body: "Each search accounts for league settings, positional needs, player values, and redraft or dynasty format.",
      },
      {
        title: "Go beyond a trade calculator",
        body: "A calculator evaluates a deal you already have. Trade Finder searches your league for useful starting points that can be adjusted in Trade Lab.",
      },
    ],
  },
  {
    path: "fantasy-football-weekly-recap",
    title: "Fantasy Football Weekly Recap Generator | ffwrapped",
    description:
      "Create fantasy football weekly recaps with matchup stories, league awards, customizable shared reports, and Premium video recaps.",
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
        body: "Start with a free weekly summary or generate a detailed league-newspaper report with customizable commentary. Publish the full Premium report with your choice of scoreboards, awards, player leaders, team scoring, standings movers, and waiver impact, or turn it into a video recap. Premium includes three video generations per rolling seven days, and finished videos remain available for 15 days.",
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
    faqs: [
      {
        question: "Which fantasy football platforms are supported?",
        answer:
          "ffwrapped supports Sleeper and ESPN fantasy football leagues. Sleeper leagues can be added by league ID or username, while ESPN leagues can be imported through the ESPN flow in the app.",
      },
      {
        question: "When is a weekly recap available?",
        answer:
          "A recap can be generated after the selected fantasy week has completed scoring and the league platform has finalized its matchup data.",
      },
      {
        question: "Is the weekly recap generator free?",
        answer:
          "The Standard weekly report and the core ffwrapped league-analysis experience are free. Premium adds the longer newspaper-style report, deeper manager context, customizable commentary, selectable shared-report insights, and video options.",
      },
      {
        question: "How do Premium video recaps work?",
        answer:
          "Premium includes up to 3 new video generations per rolling 7 days. Finished videos remain available for 15 days, so download a copy during that window to keep it.",
      },
      {
        question: "What league data goes into a report?",
        answer:
          "Reports can use matchup results, starters and bench scoring, weekly scoring rank, records, standings movement, streaks, lineup efficiency, season averages, playoff context, and completed waiver activity when available.",
      },
      {
        question: "Do league mates need Premium to read a shared report?",
        answer:
          "No. A Premium user can publish a report link and choose which extra insights to include, such as the scoreboard, awards, player leaders, standings movers, and waiver impact. Recipients can read it without purchasing Premium.",
      },
      {
        question: "Does AI calculate the matchup statistics?",
        answer:
          "No. The application calculates and normalizes the underlying league facts first. AI turns that structured context into the written report.",
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
  {
    path: "fantasy-football-video-recap-example",
    title: "Fantasy Football Video Recap Example | ffwrapped",
    description:
      "Watch a 25-second fantasy football video recap example with league storylines, matchup scores, and team-by-team results.",
    heading: "Weekly Video Recap Example",
    introduction:
      "A 25-second sample built from league storylines, matchup scores, and team performances.",
    video: {
      src: "/video/ffwrapped-marketing-demo-week-11.mp4",
      poster: "/video/ffwrapped-video-recap-poster.png",
      label: "Play the ffwrapped Week 11 fantasy football video recap example",
      disclaimer:
        "Sample league and team names are fictional. Video created with ffwrapped Premium for product demonstration.",
      ctaHref: "/",
      ctaLabel: "Create your own recap",
    },
    ogImage: "https://ffwrapped.com/video/ffwrapped-video-recap-poster.png",
    ogVideo: "https://ffwrapped.com/video/ffwrapped-marketing-demo-week-11.mp4",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Fantasy football Week 11 video recap example",
      description:
        "A 25-second ffwrapped Premium fantasy football video recap example with league storylines, matchup scores, and team results.",
      thumbnailUrl:
        "https://ffwrapped.com/video/ffwrapped-video-recap-poster.png",
      uploadDate: "2026-07-19",
      duration: "PT25S",
      contentUrl:
        "https://ffwrapped.com/video/ffwrapped-marketing-demo-week-11.mp4",
      embedUrl: "https://ffwrapped.com/fantasy-football-video-recap-example",
      isFamilyFriendly: true,
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
    href: "/fantasy-football-draft-room-example",
    label: "Draft Room example",
  },
  {
    href: "/fantasy-football-manager-profiles-rivalry-report-example",
    label: "Manager profiles & rivalries",
  },
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
    href: "/fantasy-football-player-values",
    label: "Player values",
  },
  {
    href: "/fantasy-football-trade-finder",
    label: "Trade Finder",
  },
  {
    href: "/fantasy-football-weekly-recap",
    label: "Weekly recaps",
  },
  {
    href: "/fantasy-football-video-recap-example",
    label: "Video recap example",
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

const renderStaticPage = (page) => {
  if (page.video) {
    return `
      <main data-prerendered="true">
        <article class="container max-w-4xl px-5 py-4 mx-auto">
          <header>
            <h1>${escapeHtml(page.heading)}</h1>
            <p>${escapeHtml(page.introduction)}</p>
          </header>
          <video controls playsinline preload="metadata" poster="${escapeHtml(page.video.poster)}" aria-label="${escapeHtml(page.video.label)}">
            <source src="${escapeHtml(page.video.src)}" type="video/mp4" />
            Your browser does not support the video element.
          </video>
          <section>
            <h2>Make next week your league’s story</h2>
            <p>Connect a Sleeper or ESPN league, generate a Premium report, and turn it into a shareable video recap.</p>
            <p><a href="${escapeHtml(page.video.ctaHref)}">${escapeHtml(page.video.ctaLabel)}</a></p>
          </section>
          <p>${escapeHtml(page.video.disclaimer)}</p>
          ${renderToolNavigation(page)}
        </article>
      </main>
    `;
  }

  return `
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
        ${
          page.faqs?.length
            ? `<section aria-labelledby="prerendered-page-faqs">
          <h2 id="prerendered-page-faqs">Frequently asked questions</h2>
          <dl>
            ${page.faqs
              .map(
                ({ question, answer }) =>
                  `<div><dt>${escapeHtml(question)}</dt><dd>${escapeHtml(answer)}</dd></div>`
              )
              .join("")}
          </dl>
        </section>`
            : ""
        }
        ${renderToolNavigation(page)}
      </article>
    </main>
  `;
};

const template = await readFile(resolve("dist/index.html"), "utf8");

// The static article gives non-JavaScript crawlers and visitors meaningful
// content, but it is not the same DOM tree as the Vue application. Hide it
// before the browser's first paint when JavaScript is available so it does not
// flash immediately before Vue replaces it. If the app fails to start, reveal
// the fallback again instead of leaving the page blank.
const prerenderPaintGuard = `<style>html.prerender-pending [data-prerendered="true"]{display:none}</style><script>document.documentElement.classList.add("prerender-pending");window.setTimeout(function(){document.documentElement.classList.remove("prerender-pending")},5000)</script>`;

for (const page of pages) {
  const canonical = `https://ffwrapped.com/${page.path}`;
  const staticPage = renderStaticPage(page);
  const structuredData = page.structuredData
    ? `<script type="application/ld+json">${JSON.stringify(page.structuredData).replaceAll("<", "\\u003c")}</script>`
    : "";
  const videoMeta = page.ogVideo
    ? `<meta property="og:video" content="${escapeHtml(page.ogVideo)}" /><meta property="og:video:secure_url" content="${escapeHtml(page.ogVideo)}" /><meta property="og:video:type" content="video/mp4" /><meta property="og:video:width" content="720" /><meta property="og:video:height" content="1280" />`
    : "";
  const imageUrl = page.ogImage ?? "https://ffwrapped.com/homepage.webp";
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
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`
    )
    .replace(
      /<meta itemprop="image" content="[^"]*"\s*\/>/,
      `<meta itemprop="image" content="${escapeHtml(imageUrl)}" />`
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
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
    )
    .replace('<div id="app"></div>', `<div id="app">${staticPage}</div>`)
    .replace(
      "</head>",
      `${prerenderPaintGuard}${videoMeta}${structuredData}</head>`
    );

  const outputDirectory = resolve("dist", page.path);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "index.html"), html);
}
