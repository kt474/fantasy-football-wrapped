import { describe, expect, test } from "vitest";
import {
  getPremiumUpgradeDescription,
  getPremiumUpgradeTitle,
  isPremiumUpgradeIntent,
  normalizePremiumUpgradeIntent,
} from "../src/lib/premiumUpgradeIntent.ts";

describe("Premium upgrade intents", () => {
  test.each(["player_values", "trade_finder"])(
    "recognizes and preserves %s for funnel attribution",
    (intent) => {
      expect(isPremiumUpgradeIntent(intent)).toBe(true);
      expect(normalizePremiumUpgradeIntent(intent)).toBe(intent);
    }
  );

  test("falls back safely for unknown intents", () => {
    expect(isPremiumUpgradeIntent("unknown")).toBe(false);
    expect(normalizePremiumUpgradeIntent("unknown")).toBe("premium");
  });
});
