import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const leagueInputSource = readFileSync(
  fileURLToPath(new URL("../src/composables/useLeagueInput.ts", import.meta.url)),
  "utf8"
);
const homeSource = readFileSync(
  fileURLToPath(new URL("../src/views/Home.vue", import.meta.url)),
  "utf8"
);
const cardContainerSource = readFileSync(
  fileURLToPath(
    new URL("../src/components/util/CardContainer.vue", import.meta.url)
  ),
  "utf8"
);
const leagueHistorySource = readFileSync(
  fileURLToPath(
    new URL("../src/composables/useLeagueHistory.ts", import.meta.url)
  ),
  "utf8"
);

describe("league input lifecycle", () => {
  test("keeps the home form mounted until a Sleeper league finishes loading", () => {
    const sleeperBranchStart = leagueInputSource.indexOf(
      'if (currentPlatform === "sleeper")'
    );
    const espnBranchStart = leagueInputSource.indexOf(
      'if (currentPlatform === "espn")'
    );
    const sleeperBranch = leagueInputSource.slice(
      sleeperBranchStart,
      espnBranchStart
    );

    const loadCompleted = sleeperBranch.indexOf(
      "const newLeagueInfo = await getData"
    );
    const switchToStandings = sleeperBranch.indexOf(
      'store.currentTab = "Standings"'
    );

    expect(sleeperBranchStart).toBeGreaterThanOrEqual(0);
    expect(espnBranchStart).toBeGreaterThan(sleeperBranchStart);
    expect(loadCompleted).toBeGreaterThanOrEqual(0);
    expect(switchToStandings).toBeGreaterThan(loadCompleted);
  });

  test("keeps the league input mounted while the loading skeleton is visible", () => {
    expect(homeSource).toContain('<div v-show="!store.loadingLeague">');
    expect(homeSource).not.toContain(
      'v-else-if="store.currentLeagueId"'
    );
  });

  test("keeps the header add dialog mounted across loading and route changes", () => {
    expect(cardContainerSource).toContain('v-show="showLeagueSwitcher"');
    expect(cardContainerSource).toContain(
      'v-show="!showLeagueSwitcher && showAddLeagueButton"'
    );
    expect(cardContainerSource).not.toContain(
      'v-else-if="showAddLeagueButton"'
    );
  });

  test("uses one guarded route snapshot across asynchronous home startup", () => {
    const routeSnapshot = homeSource.indexOf("const routeSnapshot =");
    const storageLoad = homeSource.indexOf(
      "const savedLeagues = await loadSavedLeagues()"
    );
    const storageGuard = homeSource.indexOf(
      "if (!isInitializationActive()) return;",
      storageLoad
    );
    const storageHydration = homeSource.indexOf(
      "leaguesToHydrate.forEach",
      storageLoad
    );
    const routeGuard = homeSource.indexOf(
      "if (!isActive()) return;",
      storageLoad
    );

    expect(routeSnapshot).toBeGreaterThanOrEqual(0);
    expect(routeSnapshot).toBeLessThan(storageLoad);
    expect(storageGuard).toBeGreaterThan(storageLoad);
    expect(storageGuard).toBeLessThan(storageHydration);
    expect(routeGuard).toBeGreaterThan(storageHydration);
    expect(homeSource).toContain(
      "route.fullPath === routeSnapshot.fullPath"
    );
    expect(homeSource).toContain("homeInitializationRequests.cancel()");
  });

  test("blocks league-changing UI while saved data is unreadable", () => {
    expect(homeSource).toContain(
      'leaguePersistenceStatus.value === "blocked"'
    );
    expect(homeSource).toContain("Saved leagues are unavailable");
    expect(homeSource).toContain('@click="initializeHome"');
  });

  test("does not mark an unexpectedly failed history load complete", () => {
    expect(leagueHistorySource).toContain("const loadSucceeded = ref(false)");
    expect(leagueHistorySource).toContain("loadSucceeded.value = false");
    expect(leagueHistorySource).toContain("loadSucceeded.value = true");
    expect(leagueHistorySource).toContain("loadSucceeded.value &&");
  });
});
