import { expect, test as base, type Page } from "@playwright/test";
import {
  ESPN_LEAGUE_ID,
  ESPN_LEAGUE_NAME,
  ESPN_SEASON,
  installLeagueApiMocks,
  SLEEPER_LEAGUE_ID,
  SLEEPER_LEAGUE_NAME,
} from "./fixtures/league-api";

const test = base.extend({
  page: async ({ page }, use) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await use(page);

    expect(pageErrors, "The page emitted uncaught browser errors").toEqual([]);
  },
});

const visibleLeagueIdInput = (page: Page) =>
  page.locator('input[name="leagueId"]:visible');

const visibleSubmitButton = (page: Page) =>
  page.locator("button:visible").filter({ hasText: /^Submit$/ });

const currentLeagueButton = (page: Page, leagueName: string) =>
  page.getByRole("button").filter({ hasText: leagueName }).first();

const openHome = async (page: Page) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /fantasy football/i }).first()
  ).toBeVisible();
};

const importSleeperLeague = async (page: Page) => {
  await visibleLeagueIdInput(page).fill(SLEEPER_LEAGUE_ID);
  await visibleSubmitButton(page).click();

  await expect(currentLeagueButton(page, SLEEPER_LEAGUE_NAME)).toBeVisible();
  await expect(page.getByLabel("League standings")).toBeVisible();
  await expect(page.getByText("Sleeper Team One", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(
    new RegExp(`\\?leagueId=${SLEEPER_LEAGUE_ID}$`)
  );
};

const openAddLeagueDialog = async (page: Page, currentLeagueName: string) => {
  await currentLeagueButton(page, currentLeagueName).click();
  await page.getByRole("menuitem", { name: /Add League/i }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Add League" })
  ).toBeVisible();
};

const importEspnLeague = async (page: Page) => {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: /ESPN/i }).click();
  await dialog.locator('input[name="leagueId"]').fill(ESPN_LEAGUE_ID);
  await dialog.getByRole("button", { name: "Submit" }).click();

  await expect(currentLeagueButton(page, ESPN_LEAGUE_NAME)).toBeVisible();
  await expect(page.getByLabel("League standings")).toBeVisible();
  await expect(
    page
      .getByLabel("League standings")
      .getByText("ESPN Team One", { exact: true })
  ).toBeVisible();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        espn: url.searchParams.has("espn"),
        leagueId: url.searchParams.get("leagueId"),
        season: url.searchParams.get("season"),
      };
    })
    .toEqual({
      espn: true,
      leagueId: ESPN_LEAGUE_ID,
      season: ESPN_SEASON,
    });
};

const getSavedLeagueKeys = (page: Page) =>
  page.evaluate(async () => {
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
      const transaction = database.transaction("leagues", "readonly");
      const request = transaction.objectStore("leagues").getAll();
      return await new Promise<string[]>((resolve, reject) => {
        request.addEventListener(
          "success",
          () =>
            resolve(
              request.result.map((record) => String(record.key)).sort()
            ),
          { once: true }
        );
        request.addEventListener(
          "error",
          () =>
            reject(request.error ?? new Error("Unable to read saved leagues")),
          { once: true }
        );
      });
    } finally {
      database.close();
    }
  });

test("imports the supplied Sleeper league and restores it after a reload", async ({
  page,
}) => {
  const controls = await installLeagueApiMocks(page);
  await openHome(page);
  await importSleeperLeague(page);

  await expect
    .poll(() => getSavedLeagueKeys(page))
    .toContain(SLEEPER_LEAGUE_ID);

  const requestsBeforeReload = controls.sleeperLeagueRequests;
  await page.reload();

  await expect(currentLeagueButton(page, SLEEPER_LEAGUE_NAME)).toBeVisible();
  await expect(page.getByText("Sleeper Team One", { exact: true })).toBeVisible();
  expect(controls.sleeperLeagueRequests).toBe(requestsBeforeReload);
});

test("adds the supplied ESPN league, switches leagues, and removes one", async ({
  page,
}) => {
  await installLeagueApiMocks(page);
  await openHome(page);
  await importSleeperLeague(page);

  await openAddLeagueDialog(page, SLEEPER_LEAGUE_NAME);
  await importEspnLeague(page);

  await expect
    .poll(() => getSavedLeagueKeys(page))
    .toEqual([
      SLEEPER_LEAGUE_ID,
      `espn:${ESPN_LEAGUE_ID}:${ESPN_SEASON}`,
    ]);

  await currentLeagueButton(page, ESPN_LEAGUE_NAME).click();
  await page
    .getByRole("menuitem")
    .filter({ hasText: SLEEPER_LEAGUE_NAME })
    .click();
  await expect(currentLeagueButton(page, SLEEPER_LEAGUE_NAME)).toBeVisible();

  await page.getByRole("button", { name: "Remove League" }).click();

  await expect(page.getByText("League removed!", { exact: true })).toBeVisible();
  await expect(currentLeagueButton(page, ESPN_LEAGUE_NAME)).toBeVisible();
  await expect
    .poll(() => getSavedLeagueKeys(page))
    .toEqual([`espn:${ESPN_LEAGUE_ID}:${ESPN_SEASON}`]);

  await page.reload();

  await expect(currentLeagueButton(page, ESPN_LEAGUE_NAME)).toBeVisible();
  await expect(page.getByText(SLEEPER_LEAGUE_NAME, { exact: true })).toHaveCount(
    0
  );
});

test("refreshes atomically and preserves saved data when refresh fails", async ({
  page,
}) => {
  const controls = await installLeagueApiMocks(page);
  await openHome(page);
  await importSleeperLeague(page);

  const refreshedName = "Refreshed Sleeper League";
  controls.sleeperLeagueName = refreshedName;
  await page.getByRole("button", { name: "Refresh League" }).click();

  await expect(
    page.getByText("League data refreshed!", { exact: true })
  ).toBeVisible();
  await expect(currentLeagueButton(page, refreshedName)).toBeVisible();

  controls.failSleeperRequests = true;
  await page.getByRole("button", { name: "Refresh League" }).click();

  await expect(
    page.getByText("Unable to load league right now. Please try again.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(currentLeagueButton(page, refreshedName)).toBeVisible();

  await page.reload();

  await expect(currentLeagueButton(page, refreshedName)).toBeVisible();
  await expect(page.getByLabel("League standings")).toBeVisible();
});
