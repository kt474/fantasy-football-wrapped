import { beforeEach, describe, expect, test } from "vitest";
import {
  consumePendingCheckout,
  PENDING_CHECKOUT_KEY,
  PENDING_CHECKOUT_TTL_MS,
  savePendingCheckout,
} from "../src/lib/pendingCheckout.ts";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
};

describe("pending checkout", () => {
  let storage;

  beforeEach(() => {
    storage = createStorage();
  });

  test("stores and consumes the selected plan exactly once", () => {
    savePendingCheckout("season_pass", storage, 1_000);

    expect(consumePendingCheckout(storage, 2_000)).toBe("season_pass");
    expect(consumePendingCheckout(storage, 2_000)).toBeNull();
  });

  test("discards expired checkout intent", () => {
    savePendingCheckout("monthly", storage, 1_000);

    expect(
      consumePendingCheckout(storage, 1_000 + PENDING_CHECKOUT_TTL_MS + 1)
    ).toBeNull();
    expect(storage.getItem(PENDING_CHECKOUT_KEY)).toBeNull();
  });

  test("discards malformed and unsupported checkout intent", () => {
    storage.setItem(PENDING_CHECKOUT_KEY, "not-json");
    expect(consumePendingCheckout(storage)).toBeNull();

    storage.setItem(
      PENDING_CHECKOUT_KEY,
      JSON.stringify({ plan: "annual", createdAt: Date.now() })
    );
    expect(consumePendingCheckout(storage)).toBeNull();
  });
});
