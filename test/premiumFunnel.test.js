import { beforeEach, describe, expect, test } from "vitest";
import {
  clearPremiumCheckoutAttribution,
  PREMIUM_CHECKOUT_ATTRIBUTION_KEY,
  PREMIUM_CHECKOUT_ATTRIBUTION_TTL_MS,
  readPremiumCheckoutAttribution,
  savePremiumCheckoutAttribution,
} from "../src/lib/premiumFunnel.ts";

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

const attribution = {
  funnelId: "funnel-123",
  funnelSource: "draft_room_example",
  feature: "draft_room",
  plan: "annual",
  billingInterval: "annual",
  priceUsd: 39.99,
  bestValue: true,
};

describe("premium funnel attribution", () => {
  let storage;

  beforeEach(() => {
    storage = createStorage();
  });

  test("preserves checkout attribution through a redirect", () => {
    savePremiumCheckoutAttribution(attribution, storage, 1_000);

    expect(readPremiumCheckoutAttribution(storage, 2_000)).toEqual(
      attribution
    );
  });

  test("clears checkout attribution explicitly", () => {
    savePremiumCheckoutAttribution(attribution, storage, 1_000);
    clearPremiumCheckoutAttribution(storage);

    expect(storage.getItem(PREMIUM_CHECKOUT_ATTRIBUTION_KEY)).toBeNull();
  });

  test("discards expired or malformed attribution", () => {
    savePremiumCheckoutAttribution(attribution, storage, 1_000);
    expect(
      readPremiumCheckoutAttribution(
        storage,
        1_000 + PREMIUM_CHECKOUT_ATTRIBUTION_TTL_MS + 1
      )
    ).toBeNull();

    storage.setItem(PREMIUM_CHECKOUT_ATTRIBUTION_KEY, "not-json");
    expect(readPremiumCheckoutAttribution(storage)).toBeNull();
  });
});
