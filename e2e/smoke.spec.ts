import { expect, test as base, type Page } from "@playwright/test";

const test = base.extend({
  page: async ({ page }, use) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await use(page);

    expect(pageErrors, "The page emitted uncaught browser errors").toEqual([]);
  },
});

const openDemoHome = async (page: Page) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Analysis your league will actually talk about",
    })
  ).toBeVisible();
};

const sidebarFeature = (page: Page, name: string) =>
  page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: new RegExp(`^${name}$`) });

test("loads the demo league without a live API", async ({ page }) => {
  await openDemoHome(page);

  await sidebarFeature(page, "Standings").click();

  await expect(page.getByLabel("League standings")).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Team name" })
  ).toBeVisible();
});

test("keeps the selected league feature after a reload", async ({ page }) => {
  await openDemoHome(page);

  await sidebarFeature(page, "Power Rankings").click();
  await expect(
    page.getByRole("heading", { name: "Power Rankings", exact: true })
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("currentTab")))
    .toBe("Power Rankings");

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Power Rankings", exact: true })
  ).toBeVisible();
});

test("restores a saved league from IndexedDB after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const league = {
      name: "Persisted E2E League",
      regularSeasonLength: 14,
      medianScoring: 0,
      totalRosters: 10,
      season: "2026",
      seasonType: "Redraft",
      leagueId: "e2e-persisted-league",
      leagueWinner: null,
      lastUpdated: Date.now(),
      previousLeagueId: null,
      lastScoredWeek: 0,
      winnersBracket: [],
      losersBracket: [],
      espnWinnersBracket: [],
      espnLosersBracket: [],
      users: [],
      rosters: [],
      weeklyPoints: [],
      transactions: {},
      trades: [],
      waivers: [],
      previousLeagues: [],
      status: "pre_draft",
      currentWeek: 0,
      scoringType: 1,
      rosterPositions: [],
      playoffTeams: 6,
      playoffType: 0,
      draftId: "",
      waiverType: 0,
      sport: "nfl",
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("ffwrapped", 2);
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      });
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("Unable to open IndexedDB")),
        { once: true }
      );
    });

    try {
      const transaction = database.transaction("leagues", "readwrite");
      transaction.objectStore("leagues").put({
        key: league.leagueId,
        position: 0,
        league,
      });
      await new Promise<void>((resolve, reject) => {
        transaction.addEventListener("complete", () => resolve(), {
          once: true,
        });
        transaction.addEventListener(
          "error",
          () =>
            reject(
              transaction.error ?? new Error("Unable to save league fixture")
            ),
          { once: true }
        );
      });
    } finally {
      database.close();
    }

    localStorage.setItem("currentLeagueId", league.leagueId);
    localStorage.setItem("currentTab", "Standings");
  });

  await page.reload();

  await expect(
    page.getByText("Persisted E2E League", { exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL(/leagueId=e2e-persisted-league/);
});

test("validates an empty add-league submission locally", async ({ page }) => {
  await openDemoHome(page);

  await sidebarFeature(page, "Standings").click();
  await page.getByRole("button", { name: "Add League" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Add League" })
  ).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Please enter a league ID")).toBeVisible();
});

test("persists the color theme across reloads", async ({ page }) => {
  await openDemoHome(page);

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();

  await expect(
    page.getByRole("button", { name: "Switch to light mode" })
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("opens the local account forms without authentication", async ({ page }) => {
  await page.goto("/account");

  await expect(
    page.getByRole("heading", { name: "Account", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Login to your account",
      exact: true,
    })
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign up", exact: true }).click();

  await expect(
    page.getByText("Create an account", { exact: true })
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

test("rejects malformed shared-report links before making a request", async ({
  page,
}) => {
  await page.goto("/report/not-a-valid-token");

  await expect(
    page.getByRole("heading", { name: "Report unavailable" })
  ).toBeVisible();
  await expect(page.getByText("This report link is invalid.")).toBeVisible();
});

test("serves standalone deep links from the production preview", async ({
  page,
}) => {
  await page.goto("/fantasy-football-power-rankings");

  await expect(
    page.getByRole("heading", {
      name: "Fantasy football power rankings with a score you can explain",
    })
  ).toBeVisible();
  await expect(page).toHaveTitle(
    "Fantasy Football Power Rankings for Your League | ffwrapped"
  );
});

test("recovers from an unknown route", async ({ page }) => {
  await page.goto("/definitely-not-a-real-page");

  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page
    .getByRole("button", { name: "Button to go back one page" })
    .click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", {
      name: "Analysis your league will actually talk about",
    })
  ).toBeVisible();
});

test("navigates demo features from the mobile sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Analysis your league will actually talk about",
    })
  ).toBeVisible();
  await page.locator('[data-sidebar="trigger"]').click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();

  await sidebarFeature(page, "Power Rankings").click();

  await expect(
    page.getByRole("heading", { name: "Power Rankings", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeHidden();
});
