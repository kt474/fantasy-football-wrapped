import { describe, expect, test, vi } from "vitest";
import {
  getParsedStorageItem,
  isBoolean,
  isRecord,
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
});
