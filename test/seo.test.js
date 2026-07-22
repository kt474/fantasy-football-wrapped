import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("SEO landing pages", () => {
  test("registers focused public routes with unique metadata", () => {
    const router = read("src/main.ts");

    expect(router).toContain('path: "/sleeper-league-analyzer"');
    expect(router).toContain('path: "/espn-league-analyzer"');
    expect(router).toContain('path: "/fantasy-football-draft-grades"');
    expect(router).toContain(
      'path: "/fantasy-football-manager-profiles-rivalry-report-example"'
    );
    expect(router).toContain(
      'path: "/fantasy-football-playoff-odds-calculator"'
    );
    expect(router).toContain('path: "/fantasy-football-power-rankings"');
    expect(router).toContain('path: "/fantasy-football-league-history"');
    expect(router).toContain('path: "/fantasy-football-weekly-recap"');
    expect(router).toContain('path: "/fantasy-football-weekly-recap-example"');
    expect(router).toContain('path: "/fantasy-football-video-recap-example"');
    expect(router).toContain("component: WeeklyRecapLanding");
    expect(router).toContain("component: PremiumReportExample");
    expect(router).toContain("component: VideoRecapExample");
    expect(router).toContain("component: ManagerProfilesRivalryExample");
    expect(router).toContain(
      "Sleeper Fantasy Football League Analyzer | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Weekly Recap Generator | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Weekly Recap Example | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Video Recap Example | ffwrapped"
    );
    expect(router).toContain(
      "ESPN Fantasy Football League Analyzer | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Draft Grades for Sleeper & ESPN | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Playoff Odds Calculator | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Power Rankings for Your League | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football League History & All-Time Records | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Manager Profiles & Rivalry Reports | ffwrapped"
    );
  });

  test("publishes distinct ESPN, draft grade, and playoff odds pages", () => {
    const espnPage = read("src/views/EspnLeagueAnalyzer.vue");
    const draftPage = read("src/views/DraftGradesLanding.vue");
    const oddsPage = read("src/views/PlayoffOddsLanding.vue");
    expect(espnPage).toContain("Public and private leagues");
    expect(espnPage).toContain("SWID + espn_s2");
    expect(draftPage).toContain("Pick-by-pick grades");
    expect(draftPage).toContain("Grading methodology");
    expect(draftPage).toContain("Grade what happened, then prepare for what comes next");
    expect(draftPage).toContain("Round-by-round positional draft plan");
    expect(draftPage).toContain("Sleeper fantasy football draft grades");
    expect(draftPage).toContain("ESPN fantasy football draft grades");
    expect(draftPage).toContain("draft_grades_landing");
    expect(espnPage).toContain("espn_analyzer_landing");
    expect(oddsPage).toContain("5,000 seasons");
    expect(oddsPage).toContain("Schedule scenarios");
  });

  test("answers preseason platform questions and preserves landing attribution", () => {
    const sleeperPage = read("src/views/SeoLanding.vue");
    const intro = read("src/components/home/Intro.vue");
    const leagueInput = read("src/composables/useLeagueInput.ts");
    const prerender = read("scripts/prerender-seo.mjs");

    expect(sleeperPage).toContain("Sleeper league analyzer questions");
    expect(sleeperPage).toContain("before the season starts");
    expect(sleeperPage).toContain("sleeper_analyzer_landing");
    expect(intro).toContain("route.query.platform");
    expect(leagueInput).toContain("route.query.source");
    expect(prerender).toContain('id="prerendered-page-faqs"');
  });

  test("publishes distinct power ranking and league history pages", () => {
    const rankingsPage = read("src/views/PowerRankingsLanding.vue");
    const historyPage = read("src/views/LeagueHistoryLanding.vue");

    expect(rankingsPage).toContain("Published formula");
    expect(rankingsPage).toContain("Weekly ranking history");
    expect(rankingsPage).toContain("Position strength heatmap");
    expect(historyPage).toContain("All-time standings");
    expect(historyPage).toContain("Season finish history");
    expect(historyPage).toContain("Head-to-head matchups");
    expect(historyPage).toContain(
      "/fantasy-football-manager-profiles-rivalry-report-example"
    );
  });

  test("publishes a substantive anonymized Premium report example", () => {
    const examplePage = read("src/views/PremiumReportExample.vue");
    const example = JSON.parse(read("src/data/premiumReportExample.json"));

    expect(examplePage).toContain("PremiumReportContent");
    expect(examplePage).toContain("Anonymized published example");
    expect(examplePage).toContain("In this report");
    expect(examplePage).toContain(
      "Real enough to evaluate, private enough to publish"
    );
    expect(examplePage).toContain("Analyze your league");
    expect(example.leagueId).toBeUndefined();
    expect(example.leagueName).toBe("Sample ffwrapped league");
    expect(example.report.matchupReports).toHaveLength(4);
    expect(example.report.weeklyLowlights.entries).toHaveLength(2);
    expect(example.report.frontPage.headline).toContain("Grabs the Crown");
  });

  test("keeps tokenized shared reports private while indexing the stable example", () => {
    const router = read("src/main.ts");

    expect(router).toContain('path: "/report/:token"');
    expect(router).toContain('robots: "noindex, nofollow"');
    expect(router).toContain('ogType: "article"');
  });

  test("uses a dedicated, substantive weekly recap landing page", () => {
    const landingPage = read("src/views/WeeklyRecapLanding.vue");

    expect(landingPage).toContain(
      "Fantasy football weekly recaps your league will actually read"
    );
    expect(landingPage).toContain("PremiumReportContent");
    expect(landingPage).toContain("Each section has a different job");
    expect(landingPage).toContain("Calculation first. Commentary second.");
    expect(landingPage).toContain("Frequently asked questions");
    expect(landingPage).toContain("3 new video generations per rolling 7 days");
    expect(landingPage).toContain("remain available for 15 days");
    expect(landingPage).toContain("13,000+ leagues added");
    expect(landingPage).toContain("VideoRecapPreview");
    expect(landingPage).toContain("Watch the full example");
  });

  test("publishes a durable Premium video recap example", () => {
    const examplePage = read("src/views/VideoRecapExample.vue");
    const player = read("src/components/weekly_report/VideoRecapPreview.vue");
    const prerender = read("scripts/prerender-seo.mjs");

    expect(examplePage).toContain("VideoRecapPreview");
    expect(examplePage).toContain("Weekly Video Recap Example");
    expect(examplePage).toContain("Create your own recap");
    expect(examplePage).toContain('to="/"');
    expect(examplePage).toContain("Video Recap CTA Clicked");
    expect(examplePage).not.toContain(
      "A finished recap, not a slideshow export"
    );
    expect(examplePage).not.toContain("previewDetails");
    expect(player).toContain("/video/ffwrapped-marketing-demo-week-11.mp4");
    expect(player).toContain("controls");
    expect(player).toContain("playsinline");
    expect(player).toContain('preload="metadata"');
    expect(prerender).toContain('heading: "Weekly Video Recap Example"');
    expect(prerender).toContain("if (page.video)");
    expect(prerender).toContain("<video controls playsinline");
    expect(prerender).toContain('ctaLabel: "Create your own recap"');
    expect(prerender).toContain("page.video.ctaHref");
    expect(prerender).not.toContain(
      'sectionHeading: "What the video includes"'
    );
  });

  test("publishes a substantive manager profile and rivalry report example", () => {
    const examplePage = read(
      "src/views/ManagerProfilesRivalryExample.vue"
    );
    const accountPage = read("src/views/Account.vue");

    expect(examplePage).toContain("Manager profile sample");
    expect(examplePage).toContain("Rivalry report sample");
    expect(examplePage).toContain("Saquondo");
    expect(examplePage).toContain("league’s model of sustained menace");
    expect(examplePage).toContain("The Regular-Season Reckoning");
    expect(examplePage).toContain("impulsive");
    expect(examplePage).toContain("chaos goblin");
    expect(examplePage).toContain("manager_profiles_rivalry_example");
    expect(accountPage).toContain(
      "Preview manager profiles and rivalry reports"
    );
  });

  test("uses one restrained public shell across the focused SEO pages", () => {
    const router = read("src/main.ts");
    const pages = [
      read("src/views/SeoLanding.vue"),
      read("src/views/EspnLeagueAnalyzer.vue"),
      read("src/views/DraftGradesLanding.vue"),
      read("src/views/PlayoffOddsLanding.vue"),
      read("src/views/PowerRankingsLanding.vue"),
      read("src/views/LeagueHistoryLanding.vue"),
      read("src/views/WeeklyRecapLanding.vue"),
      read("src/views/PremiumReportExample.vue"),
      read("src/views/VideoRecapExample.vue"),
      read("src/views/ManagerProfilesRivalryExample.vue"),
    ];

    for (const page of pages) {
      expect(page).toContain("PublicPageShell");
    }

    expect(router).toMatch(
      /path: "\/sleeper-league-analyzer"[\s\S]*?standalone: true/
    );
    expect(router).toMatch(
      /path: "\/fantasy-football-weekly-recap"[\s\S]*?standalone: true/
    );
    expect(router).toMatch(
      /path: "\/fantasy-football-weekly-recap-example"[\s\S]*?standalone: true/
    );
    expect(router).toMatch(
      /path: "\/fantasy-football-video-recap-example"[\s\S]*?standalone: true/
    );
    expect(router).toMatch(
      /path: "\/fantasy-football-manager-profiles-rivalry-report-example"[\s\S]*?standalone: true/
    );
  });

  test("publishes only clean canonical landing URLs in the sitemap", () => {
    const sitemap = read("public/sitemap.xml");

    expect(sitemap).toContain("https://ffwrapped.com/sleeper-league-analyzer");
    expect(sitemap).toContain("https://ffwrapped.com/espn-league-analyzer");
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-draft-grades"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-playoff-odds-calculator"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-power-rankings"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-league-history"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-weekly-recap"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-weekly-recap-example"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-video-recap-example"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-manager-profiles-rivalry-report-example"
    );
    expect(sitemap).not.toContain("leagueId=");
  });

  test("production builds create initial HTML for both landing pages", () => {
    const packageJson = JSON.parse(read("package.json"));
    const prerender = read("scripts/prerender-seo.mjs");

    expect(packageJson.scripts.build).toContain("prerender-seo.mjs");
    expect(prerender).toContain('<main data-prerendered="true">');
    expect(prerender).toContain('<div id="app">${staticPage}</div>');
    expect(prerender).not.toContain("<noscript><main>");
    expect(prerender).toContain("renderStaticPage(page)");
    expect(prerender).toContain('resolve("dist", page.path)');
    expect(prerender).toContain(
      'path: "fantasy-football-weekly-recap-example"'
    );
    expect(prerender).toContain('path: "fantasy-football-video-recap-example"');
    expect(prerender).toContain(
      'path: "fantasy-football-manager-profiles-rivalry-report-example"'
    );
    expect(prerender).toContain('path: "espn-league-analyzer"');
    expect(prerender).toContain('path: "fantasy-football-draft-grades"');
    expect(prerender).toContain(
      'path: "fantasy-football-playoff-odds-calculator"'
    );
    expect(prerender).toContain('path: "fantasy-football-power-rankings"');
    expect(prerender).toContain('path: "fantasy-football-league-history"');
    expect(prerender).toContain('"@type": "Article"');
  });

  test("prerendered pages expose crawlable links to the public tools", () => {
    const prerender = read("scripts/prerender-seo.mjs");

    expect(prerender).toContain('<nav aria-label="Fantasy football tools">');
    expect(prerender).toContain(
      '{ href: "/sleeper-league-analyzer", label: "Sleeper analyzer" }'
    );
    expect(prerender).toContain(
      '{ href: "/espn-league-analyzer", label: "ESPN analyzer" }'
    );
    expect(prerender).toContain(
      'href: "/fantasy-football-playoff-odds-calculator"'
    );
    expect(prerender).toContain('href: "/fantasy-football-power-rankings"');
    expect(prerender).toContain('href: "/fantasy-football-league-history"');
    expect(prerender).toContain('href: "/fantasy-football-weekly-recap"');
    expect(prerender).toContain('<a href="${escapeHtml(href)}">');
  });

  test("prerenders the existing indexable public pages", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    const vercel = read("vercel.json");

    expect(prerender).toContain('path: ""');
    expect(prerender).toContain('path: "about"');
    expect(prerender).toContain('path: "changelog"');
    expect(vercel).toContain('"destination": "/about/index.html"');
    expect(vercel).toContain('"destination": "/changelog/index.html"');
    expect(vercel).toContain(
      '"destination": "/fantasy-football-weekly-recap-example/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/fantasy-football-video-recap-example/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/fantasy-football-manager-profiles-rivalry-report-example/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/espn-league-analyzer/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/fantasy-football-draft-grades/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/fantasy-football-playoff-odds-calculator/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/fantasy-football-power-rankings/index.html"'
    );
    expect(vercel).toContain(
      '"destination": "/fantasy-football-league-history/index.html"'
    );
  });
});
