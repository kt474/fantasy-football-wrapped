import { describe, expect, test } from "vitest";
import {
  getPremiumUpgradeDescription,
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

  test("uses tailored Player Values and Trade Finder copy", () => {
    expect(getPremiumUpgradeDescription("player_values")).toContain(
      "complete league adjusted player rankings"
    );
    expect(getPremiumUpgradeDescription("trade_finder")).toContain(
      "trade ideas"
    );
  });
});
