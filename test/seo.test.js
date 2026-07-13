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
      "Sleeper Fantasy Football League Analyzer | ffwrapped"
    );
    expect(router).toContain(
      "Fantasy Football Weekly Recap Generator | ffwrapped"
    );
  });

  test("publishes only clean canonical landing URLs in the sitemap", () => {
    const sitemap = read("public/sitemap.xml");

    expect(sitemap).toContain("https://ffwrapped.com/sleeper-league-analyzer");
    expect(sitemap).toContain(
      "https://ffwrapped.com/fantasy-football-weekly-recap"
    );
    expect(sitemap).not.toContain("leagueId=");
  });

  test("production builds create initial HTML for both landing pages", () => {
    const packageJson = JSON.parse(read("package.json"));
    const prerender = read("scripts/prerender-seo.mjs");

    expect(packageJson.scripts.build).toContain("prerender-seo.mjs");
    expect(prerender).toContain("<noscript><main>");
    expect(prerender).toContain('<div id="app">${fallback}</div>');
    expect(prerender).toContain('resolve("dist", page.path)');
  });

  test("prerenders the existing indexable public pages", () => {
    const prerender = read("scripts/prerender-seo.mjs");
    const vercel = read("vercel.json");

    expect(prerender).toContain('path: ""');
    expect(prerender).toContain('path: "about"');
    expect(prerender).toContain('path: "changelog"');
    expect(vercel).toContain('"destination": "/about/index.html"');
    expect(vercel).toContain('"destination": "/changelog/index.html"');
  });
});
