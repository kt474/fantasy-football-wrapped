import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("SEO landing pages", () => {
  test("registers focused public routes with unique metadata", () => {
    const router = read("src/main.ts");

    expect(router).toContain('path: "/sleeper-league-analyzer"');
    expect(router).toContain('path: "/fantasy-football-weekly-recap"');
    expect(router).toContain(
      'path: "/fantasy-football-weekly-recap-example"'
    );
    expect(router).toContain("component: WeeklyRecapLanding");
    expect(router).toContain("component: PremiumReportExample");
    expect(router).toContain(
      "Sleeper Fantasy Football League Analyzer | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Weekly Recap Generator | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Weekly Recap Example | ffwrapped"
    );
  });

  test("publishes a substantive anonymized Premium report example", () => {
    const examplePage = read("src/views/PremiumReportExample.vue");
    const example = JSON.parse(read("src/data/premiumReportExample.json"));

    expect(examplePage).toContain("PremiumReportContent");
    expect(examplePage).toContain("Anonymized published example");
    expect(examplePage).toContain("What this example demonstrates");
    expect(examplePage).toContain("Analyze your league");
    expect(example.leagueId).toBeUndefined();
    expect(example.leagueName).toBe("Sample ffwrapped league");
    expect(example.report.matchupReports).toHaveLength(4);
    expect(example.report.managersBlotter.entries).toHaveLength(2);
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
    expect(landingPage).toContain("From final score to finished report");
    expect(landingPage).toContain("The statistics are calculated before");
    expect(landingPage).toContain("Frequently asked questions");
    expect(landingPage).toContain("13,000+ leagues added");
  });

  test("uses one restrained public shell across the focused SEO pages", () => {
    const router = read("src/main.ts");
    const pages = [
      read("src/views/SeoLanding.vue"),
      read("src/views/WeeklyRecapLanding.vue"),
      read("src/views/PremiumReportExample.vue"),
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
  });

  test("publishes only clean canonical landing URLs in the sitemap", () => {
    const sitemap = read("public/sitemap.xml");

    expect(sitemap).toContain("https://ffwrapped.com/sleeper-league-analyzer");
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-weekly-recap"
    );
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-weekly-recap-example"
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
    expect(prerender).toContain('"@type": "Article"');
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
  });
});
