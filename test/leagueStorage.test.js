import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { nextTick, reactive } from "vue";

const createStorageMock = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => (values.has(key) ? values.get(key) : null)),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
    key: vi.fn((index) => Array.from(values.keys())[index] ?? null),
    get length() {
      return values.size;
    },
  };
};

const getStorageCharacterCount = (storage) => {
  let characters = 0;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    characters += key.length + (storage.getItem(key)?.length ?? 0);
  }
  return characters;
};

const buildLeague = (leagueId, overrides = {}) => ({
  name: `League ${leagueId}`,
  regularSeasonLength: 14,
  medianScoring: 0,
  totalRosters: 10,
  season: "2026",
  seasonType: "Redraft",
  leagueId,
  leagueWinner: null,
  lastUpdated: 1,
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
  ...overrides,
});

beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorageMock(),
    configurable: true,
  });
  Object.defineProperty(globalThis, "indexedDB", {
    value: new IDBFactory(),
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("league IndexedDB storage", () => {
  test("migrates and verifies legacy leagueInfo before removing it", async () => {
    const leagues = [buildLeague("one"), buildLeague("two")];
    localStorage.setItem("leagueInfo", JSON.stringify(leagues));
    const { loadSavedLeagues } = await import("../src/lib/leagueStorage.ts");

    const migrated = await loadSavedLeagues();

    expect(migrated.map((league) => league.leagueId)).toEqual(["one", "two"]);
    expect(localStorage.getItem("leagueInfo")).toBeNull();
    await expect(loadSavedLeagues()).resolves.toEqual(migrated);
  });

  test("persists league records in order and removes deleted leagues", async () => {
    const {
      flushLeaguePersistence,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");

    await loadSavedLeagues();
    scheduleLeaguePersistence(
      [
        buildLeague("one", {
          rivalryReports: {
            "manager-a:manager-b": "A storied rivalry",
          },
        }),
        buildLeague("two"),
      ],
      0
    );
    await flushLeaguePersistence();
    const initiallySaved = await loadSavedLeagues();
    expect(initiallySaved.map((league) => league.leagueId)).toEqual([
      "one",
      "two",
    ]);
    expect(initiallySaved[0].rivalryReports).toEqual({
      "manager-a:manager-b": "A storied rivalry",
    });

    scheduleLeaguePersistence(
      [buildLeague("two", { name: "Updated league" })],
      0
    );
    await flushLeaguePersistence();

    const saved = await loadSavedLeagues();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      leagueId: "two",
      name: "Updated league",
    });
  });

  test("does not persist empty leagues after unrelated store mutations", async () => {
    const {
      flushLeaguePersistence,
      loadSavedLeagues,
      scheduleLeaguePersistence,
      watchLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");
    const leagues = [buildLeague("saved")];
    await loadSavedLeagues();
    scheduleLeaguePersistence(leagues, 0);
    await flushLeaguePersistence();

    const store = reactive({ leagueInfo: [], darkMode: false });
    const stopWatching = watchLeaguePersistence(store, 0);
    store.darkMode = true;
    await nextTick();
    await flushLeaguePersistence();

    await expect(loadSavedLeagues()).resolves.toEqual(leagues);
    stopWatching();
  });

  test("handles the complete lifecycle for ten large leagues", async () => {
    const { createPinia, setActivePinia } = await import("pinia");
    setActivePinia(createPinia());
    const { getLeagueKey, useStore } = await import("../src/store/store.ts");
    const {
      flushLeaguePersistence,
      getCachedValue,
      getNarrativeBundleCacheKey,
      loadSavedLeagues,
      NARRATIVE_BUNDLE_CACHE_TTL_MS,
      removeNarrativeBundle,
      scheduleLeaguePersistence,
      setCachedValue,
    } = await import("../src/lib/leagueStorage.ts");
    const largeReport = "x".repeat(1_200_000);
    const leagues = Array.from({ length: 10 }, (_, index) =>
      buildLeague(`league-${index + 1}`, {
        name: `Stress League ${index + 1}`,
        platform: index === 9 ? "espn" : "sleeper",
        season: index === 9 ? "2025" : "2026",
        weeklyReport: `${index}:${largeReport}`,
      })
    );
    const leagueKeys = leagues.map(getLeagueKey);

    await loadSavedLeagues();
    scheduleLeaguePersistence(leagues, 0);
    await flushLeaguePersistence();

    const firstReload = await loadSavedLeagues();
    expect(firstReload.map(getLeagueKey)).toEqual(leagueKeys);
    expect(JSON.stringify(firstReload).length).toBeGreaterThan(12_000_000);
    expect(localStorage.getItem("leagueInfo")).toBeNull();

    const store = useStore();
    store.leagueInfo = firstReload;
    leagueKeys.forEach((leagueKey) => {
      store.updateCurrentLeagueId(leagueKey);
      expect(getLeagueKey(store.currentLeague)).toBe(leagueKey);
    });

    const now = new Date("2026-07-16T12:00:00Z").getTime();
    for (const [index, leagueKey] of leagueKeys.entries()) {
      await setCachedValue(
        getNarrativeBundleCacheKey(leagueKey),
        { managerArchetypes: [{ userId: `manager-${index + 1}` }] },
        NARRATIVE_BUNDLE_CACHE_TTL_MS,
        now + index
      );
    }

    const refreshedLeagues = firstReload.map((league, index) =>
      index === 4
        ? { ...league, name: "Refreshed League 5", lastUpdated: 2 }
        : league
    );
    scheduleLeaguePersistence(refreshedLeagues, 0);
    await flushLeaguePersistence();
    expect((await loadSavedLeagues())[4]).toMatchObject({
      name: "Refreshed League 5",
      lastUpdated: 2,
    });

    const removedLeagueKey = leagueKeys[2];
    await removeNarrativeBundle(removedLeagueKey);
    const remainingLeagues = refreshedLeagues.filter(
      (league) => getLeagueKey(league) !== removedLeagueKey
    );
    scheduleLeaguePersistence(remainingLeagues, 0);
    await flushLeaguePersistence();

    const finalReload = await loadSavedLeagues();
    expect(finalReload.map(getLeagueKey)).toEqual(
      leagueKeys.filter((leagueKey) => leagueKey !== removedLeagueKey)
    );
    await expect(
      getCachedValue(getNarrativeBundleCacheKey(removedLeagueKey))
    ).resolves.toBeNull();
    await expect(
      getCachedValue(getNarrativeBundleCacheKey(leagueKeys[3]))
    ).resolves.toEqual({
      managerArchetypes: [{ userId: "manager-4" }],
    });

    expect(localStorage.getItem("leagueInfo")).toBeNull();
    expect(getStorageCharacterCount(localStorage)).toBe(0);
  });

  test("deeply unwraps Vue reactive league data before persisting", async () => {
    const {
      flushLeaguePersistence,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");
    const leagues = reactive([
      buildLeague("reactive", {
        premiumWeeklyReports: {
          1: reactive({
            frontPage: {
              headline: "Reactive report",
              subheadline: "Subheadline",
              lead: "Lead",
            },
            matchupReports: [],
            teamOfTheWeek: {
              teamName: "Team",
              pointsScored: 120,
              headline: "Headline",
              analysis: "Analysis",
            },
            weeklyLowlights: { headline: "Lowlights", entries: [] },
          }),
        },
      }),
    ]);

    await loadSavedLeagues();
    scheduleLeaguePersistence(leagues, 0);
    await flushLeaguePersistence();

    const saved = await loadSavedLeagues();
    expect(saved[0].premiumWeeklyReports[1].frontPage.headline).toBe(
      "Reactive report"
    );
    expect(localStorage.getItem("leagueInfo")).toBeNull();
  });

  test("keeps the legacy value when IndexedDB migration fails", async () => {
    const leagues = [buildLeague("fallback")];
    localStorage.setItem("leagueInfo", JSON.stringify(leagues));
    Object.defineProperty(globalThis, "indexedDB", {
      value: {
        open: () => {
          throw new Error("IndexedDB blocked");
        },
      },
      configurable: true,
    });
    const { loadSavedLeagues } = await import("../src/lib/leagueStorage.ts");

    await expect(loadSavedLeagues()).resolves.toEqual(leagues);
    expect(localStorage.getItem("leagueInfo")).toBe(JSON.stringify(leagues));
  });

  test("keeps a legacy fallback writable while IndexedDB loading is blocked", async () => {
    const leagues = [buildLeague("fallback")];
    const updatedLeagues = [
      buildLeague("fallback", { name: "Updated fallback" }),
      buildLeague("new-league"),
    ];
    localStorage.setItem("leagueInfo", JSON.stringify(leagues));
    Object.defineProperty(globalThis, "indexedDB", {
      value: {
        open: () => {
          throw new Error("IndexedDB blocked");
        },
      },
      configurable: true,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const {
      flushLeaguePersistence,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");

    await expect(loadSavedLeagues()).resolves.toEqual(leagues);
    expect(scheduleLeaguePersistence(updatedLeagues, 0)).toBe(true);
    await flushLeaguePersistence();

    expect(JSON.parse(localStorage.getItem("leagueInfo"))).toEqual(
      updatedLeagues
    );
    expect(localStorage.getItem("leagueInfoFallback")).toBe("1");

    Object.defineProperty(globalThis, "indexedDB", {
      value: new IDBFactory(),
      configurable: true,
    });
    await expect(loadSavedLeagues()).resolves.toEqual(updatedLeagues);
    expect(localStorage.getItem("leagueInfo")).toBeNull();
    expect(localStorage.getItem("leagueInfoFallback")).toBeNull();
  });

  test("falls back without hanging when another tab blocks the database upgrade", async () => {
    const versionOneRequest = indexedDB.open("ffwrapped", 1);
    const versionOneDatabase = await new Promise((resolve, reject) => {
      versionOneRequest.addEventListener(
        "success",
        () => resolve(versionOneRequest.result),
        { once: true }
      );
      versionOneRequest.addEventListener(
        "error",
        () => reject(versionOneRequest.error),
        { once: true }
      );
    });
    const leagues = [buildLeague("blocked-upgrade")];
    localStorage.setItem("leagueInfo", JSON.stringify(leagues));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { loadSavedLeagues } = await import("../src/lib/leagueStorage.ts");

    await expect(loadSavedLeagues()).resolves.toEqual(leagues);
    expect(localStorage.getItem("leagueInfo")).toBe(JSON.stringify(leagues));
    expect(consoleSpy).toHaveBeenCalled();

    versionOneDatabase.close();
  });

  test("falls back to localStorage when IndexedDB is unavailable", async () => {
    Object.defineProperty(globalThis, "indexedDB", {
      value: undefined,
      configurable: true,
    });
    const {
      flushLeaguePersistence,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");
    const leagues = [buildLeague("local")];

    await loadSavedLeagues();
    scheduleLeaguePersistence(leagues, 0);
    await flushLeaguePersistence();

    expect(JSON.parse(localStorage.getItem("leagueInfo"))).toEqual(leagues);
    await expect(loadSavedLeagues()).resolves.toEqual(leagues);
  });

  test("replays authoritative fallback updates and deletions after IndexedDB recovers", async () => {
    const {
      flushLeaguePersistence,
      hasSavedLeagues,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");
    const original = [buildLeague("existing", { name: "Original" })];
    const updated = [buildLeague("existing", { name: "Fallback update" })];

    await loadSavedLeagues();
    scheduleLeaguePersistence(original, 0);
    await flushLeaguePersistence();

    const healthyIndexedDb = indexedDB;
    const blockIndexedDb = () => {
      Object.defineProperty(globalThis, "indexedDB", {
        value: {
          open: () => {
            throw new Error("IndexedDB temporarily unavailable");
          },
        },
        configurable: true,
      });
    };
    const restoreIndexedDb = () => {
      Object.defineProperty(globalThis, "indexedDB", {
        value: healthyIndexedDb,
        configurable: true,
      });
    };
    vi.spyOn(console, "error").mockImplementation(() => {});

    blockIndexedDb();
    scheduleLeaguePersistence(updated, 0);
    await flushLeaguePersistence();
    expect(JSON.parse(localStorage.getItem("leagueInfo"))).toEqual(updated);

    restoreIndexedDb();
    await expect(loadSavedLeagues()).resolves.toEqual(updated);
    expect(localStorage.getItem("leagueInfo")).toBeNull();

    blockIndexedDb();
    scheduleLeaguePersistence([], 0);
    await flushLeaguePersistence();
    expect(JSON.parse(localStorage.getItem("leagueInfo"))).toEqual([]);
    await expect(hasSavedLeagues()).resolves.toBe(false);

    restoreIndexedDb();
    await expect(loadSavedLeagues()).resolves.toEqual([]);
    expect(localStorage.getItem("leagueInfo")).toBeNull();
    expect(localStorage.getItem("leagueInfoFallback")).toBeNull();
  });

  test("returns safe cache misses when IndexedDB is blocked", async () => {
    Object.defineProperty(globalThis, "indexedDB", {
      value: {
        open: () => {
          throw new Error("IndexedDB blocked");
        },
      },
      configurable: true,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getCachedValue, removeCachedValue, setCachedValue } = await import(
      "../src/lib/leagueStorage.ts"
    );

    await expect(setCachedValue("blocked", { value: 1 }, 1000)).resolves.toBe(
      false
    );
    await expect(getCachedValue("blocked")).resolves.toBeNull();
    await expect(removeCachedValue("blocked")).resolves.toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });

  test("detects returning users after migration", async () => {
    const {
      flushLeaguePersistence,
      hasSavedLeagues,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");

    await expect(hasSavedLeagues()).resolves.toBe(false);
    await loadSavedLeagues();
    scheduleLeaguePersistence([buildLeague("saved")], 0);
    await flushLeaguePersistence();
    await expect(hasSavedLeagues()).resolves.toBe(true);
  });

  test("reconciles stale legacy data without overwriting IndexedDB leagues", async () => {
    const {
      flushLeaguePersistence,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");
    const indexedLeague = buildLeague("one", { name: "IndexedDB league" });
    const secondIndexedLeague = buildLeague("two");

    await loadSavedLeagues();
    scheduleLeaguePersistence([indexedLeague, secondIndexedLeague], 0);
    await flushLeaguePersistence();
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify([
        buildLeague("one", { name: "Stale legacy league" }),
        buildLeague("legacy-only"),
      ])
    );

    const reconciled = await loadSavedLeagues();

    expect(reconciled.map((league) => league.leagueId)).toEqual([
      "one",
      "two",
      "legacy-only",
    ]);
    expect(reconciled[0].name).toBe("IndexedDB league");
    expect(localStorage.getItem("leagueInfo")).toBeNull();
  });

  test("blocks replacement writes when IndexedDB cannot be read", async () => {
    const {
      flushLeaguePersistence,
      leaguePersistenceStatus,
      LeagueStorageUnavailableError,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");
    const originalLeagues = [buildLeague("existing")];

    await loadSavedLeagues();
    scheduleLeaguePersistence(originalLeagues, 0);
    await flushLeaguePersistence();

    const healthyIndexedDb = indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      value: {
        open: () => {
          throw new Error("IndexedDB temporarily unavailable");
        },
      },
      configurable: true,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(loadSavedLeagues()).rejects.toBeInstanceOf(
      LeagueStorageUnavailableError
    );
    expect(leaguePersistenceStatus.value).toBe("blocked");
    expect(
      scheduleLeaguePersistence([buildLeague("partial-new-state")], 0)
    ).toBe(false);
    await expect(flushLeaguePersistence()).resolves.toBe(false);
    expect(localStorage.getItem("leagueInfo")).toBeNull();

    Object.defineProperty(globalThis, "indexedDB", {
      value: healthyIndexedDb,
      configurable: true,
    });
    await expect(loadSavedLeagues()).resolves.toEqual(originalLeagues);
    expect(leaguePersistenceStatus.value).toBe("indexeddb");
    expect(consoleSpy).toHaveBeenCalled();
  });

  test("blocks further changes when both IndexedDB and fallback saving fail", async () => {
    const {
      flushLeaguePersistence,
      hasPendingLeaguePersistence,
      leaguePersistenceStatus,
      loadSavedLeagues,
      scheduleLeaguePersistence,
    } = await import("../src/lib/leagueStorage.ts");

    await loadSavedLeagues();
    scheduleLeaguePersistence([buildLeague("existing")], 0);
    await flushLeaguePersistence();

    const healthyIndexedDb = indexedDB;
    const workingSetItem = localStorage.setItem.getMockImplementation();
    Object.defineProperty(globalThis, "indexedDB", {
      value: {
        open: () => {
          throw new Error("IndexedDB temporarily unavailable");
        },
      },
      configurable: true,
    });
    localStorage.setItem.mockImplementation(() => {
      throw new Error("Storage quota exceeded");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    scheduleLeaguePersistence([buildLeague("updated")], 0);
    await flushLeaguePersistence();

    expect(leaguePersistenceStatus.value).toBe("blocked");
    expect(hasPendingLeaguePersistence()).toBe(true);
    expect(scheduleLeaguePersistence([buildLeague("later")], 0)).toBe(false);

    Object.defineProperty(globalThis, "indexedDB", {
      value: healthyIndexedDb,
      configurable: true,
    });
    localStorage.setItem.mockImplementation(workingSetItem);

    await loadSavedLeagues();
    await expect(flushLeaguePersistence()).resolves.toBe(true);
    expect(hasPendingLeaguePersistence()).toBe(false);
    await expect(loadSavedLeagues()).resolves.toEqual([
      expect.objectContaining({ leagueId: "updated" }),
    ]);
  });

  test("migrates narrative bundles and removes recomputable legacy caches", async () => {
    localStorage.setItem(
      "narrative-bundle:league-one",
      JSON.stringify({ managerArchetypes: [{ userId: "one" }] })
    );
    localStorage.setItem("originalData", JSON.stringify({ one: [] }));
    localStorage.setItem("league-history:sleeper:one:2025", "[]");
    localStorage.setItem("currentTab", "Standings");
    const { getCachedValue, loadSavedLeagues } = await import(
      "../src/lib/leagueStorage.ts"
    );

    await loadSavedLeagues();

    await expect(
      getCachedValue("narrative-bundle:league-one")
    ).resolves.toEqual({ managerArchetypes: [{ userId: "one" }] });
    expect(localStorage.getItem("narrative-bundle:league-one")).toBeNull();
    expect(localStorage.getItem("originalData")).toBeNull();
    expect(
      localStorage.getItem("league-history:sleeper:one:2025")
    ).toBeNull();
    expect(localStorage.getItem("currentTab")).toBe("Standings");
  });

  test("expires stale cache records", async () => {
    const { getCachedValue, setCachedValue } = await import(
      "../src/lib/leagueStorage.ts"
    );
    const now = new Date("2026-07-16T12:00:00Z").getTime();

    await expect(
      setCachedValue("short-lived", { value: 1 }, 1000, now)
    ).resolves.toBe(true);
    await expect(getCachedValue("short-lived", undefined, now)).resolves.toEqual(
      { value: 1 }
    );

    await expect(
      getCachedValue("short-lived", undefined, now + 1000)
    ).resolves.toBeNull();
  });

  test("removes one narrative bundle without affecting similarly named leagues", async () => {
    const {
      getCachedValue,
      getNarrativeBundleCacheKey,
      removeNarrativeBundle,
      setCachedValue,
    } = await import("../src/lib/leagueStorage.ts");
    const firstKey = getNarrativeBundleCacheKey("league-1");
    const secondKey = getNarrativeBundleCacheKey("league-10");
    await setCachedValue(firstKey, { managerArchetypes: [] }, 1000);
    await setCachedValue(secondKey, { managerArchetypes: [] }, 1000);

    await expect(removeNarrativeBundle("league-1")).resolves.toBe(true);

    await expect(getCachedValue(firstKey)).resolves.toBeNull();
    await expect(getCachedValue(secondKey)).resolves.toEqual({
      managerArchetypes: [],
    });
  });

  test("evicts the oldest cache records when the cache reaches its bound", async () => {
    const { getCachedValue, setCachedValue } = await import(
      "../src/lib/leagueStorage.ts"
    );
    const now = new Date("2026-07-16T12:00:00Z").getTime();

    for (let index = 0; index < 21; index += 1) {
      await setCachedValue(`cache-${index}`, index, 60_000, now + index);
    }

    await expect(
      getCachedValue("cache-0", undefined, now + 21)
    ).resolves.toBeNull();
    await expect(
      getCachedValue("cache-20", undefined, now + 21)
    ).resolves.toBe(20);
  });
});
