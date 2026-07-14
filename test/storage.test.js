import { describe, expect, test, vi } from "vitest";
import {
  getNarrativeBundleStorageKey,
  getParsedStorageItem,
  isBoolean,
  isRecord,
  migrateLegacyArrayCacheEntry,
  removeAllNarrativeBundles,
  removeNarrativeBundle,
} from "../src/lib/storage.ts";

const createStorageMock = (entries = {}) => {
  const storage = new Map(Object.entries(entries));
  return {
    getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
    setItem: vi.fn((key, value) => storage.set(key, String(value))),
    removeItem: vi.fn((key) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    key: vi.fn((index) => Array.from(storage.keys())[index] ?? null),
    get length() {
      return storage.size;
    },
  };
};

describe("storage helpers", () => {
  test("removes the narrative bundle for only the targeted league", () => {
    const leagueKey = "espn:league-1:2025";
    const narrativeKey = getNarrativeBundleStorageKey(leagueKey);
    const storage = createStorageMock({
      [narrativeKey]: '{"managerArchetypes":[]}',
      "narrative-bundle:league-2": '{"managerArchetypes":[]}',
    });

    removeNarrativeBundle(leagueKey, storage);

    expect(storage.getItem(narrativeKey)).toBeNull();
    expect(storage.getItem("narrative-bundle:league-2")).not.toBeNull();
  });

  test("removes every narrative bundle without touching other storage", () => {
    const storage = createStorageMock({
      "narrative-bundle:league-1": '{"managerArchetypes":[]}',
      "narrative-bundle:espn:league-2:2025": '{"managerArchetypes":[]}',
      currentTab: "Standings",
    });

    removeAllNarrativeBundles(storage);

    expect(storage.getItem("narrative-bundle:league-1")).toBeNull();
    expect(storage.getItem("narrative-bundle:espn:league-2:2025")).toBeNull();
    expect(storage.getItem("currentTab")).toBe("Standings");
  });

  test("returns parsed storage values", () => {
    const storage = createStorageMock({ flag: "true" });

    expect(
      getParsedStorageItem("flag", false, { storage, isValid: isBoolean })
    ).toBe(true);
  });

  test("removes malformed values and returns fallback", () => {
    const storage = createStorageMock({ cache: "{bad-json" });

    expect(
      getParsedStorageItem("cache", {}, { storage, isValid: isRecord })
    ).toEqual({});
    expect(storage.removeItem).toHaveBeenCalledWith("cache");
  });

  test("removes valid JSON with the wrong shape", () => {
    const storage = createStorageMock({ cache: "[]" });

    expect(
      getParsedStorageItem("cache", {}, { storage, isValid: isRecord })
    ).toEqual({});
    expect(storage.removeItem).toHaveBeenCalledWith("cache");
  });

  test("migrates legacy array cache entries with their league timestamp", () => {
    const legacyData = [{ name: "Team One", wins: 8 }];
    const cache = { "league-1": legacyData };

    expect(
      migrateLegacyArrayCacheEntry(cache, "league-1", 1_752_518_400_000)
    ).toBe(true);
    expect(cache["league-1"]).toEqual({
      lastUpdated: 1_752_518_400_000,
      data: legacyData,
    });
  });

  test("leaves timestamped cache entries unchanged", () => {
    const timestampedEntry = {
      lastUpdated: 1_752_518_400_000,
      data: [{ name: "Team One", wins: 8 }],
    };
    const cache = { "league-1": timestampedEntry };

    expect(
      migrateLegacyArrayCacheEntry(cache, "league-1", 1_752_604_800_000)
    ).toBe(false);
    expect(cache["league-1"]).toBe(timestampedEntry);
  });
});
