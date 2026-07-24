import { describe, expect, test } from "vitest";
import { getPostPurchaseActivation } from "../src/lib/postPurchaseActivation.ts";

describe("post-purchase activation", () => {
  test("returns the Draft Room action for a Draft Room checkout", () => {
    expect(getPostPurchaseActivation("draft_room")).toEqual({
      title: "Your Draft Room is unlocked",
      description:
        "Use your league's draft history to plan each round and scout every manager before you're on the clock.",
      actionLabel: "Open your Draft Room",
      destinationTab: "Manager Profiles",
    });
  });

  test.each([
    ["manager_profiles", "Open Manager Profiles", "Manager Profiles"],
    ["rivalry_report", "Open Rivalry Reports", "Manager Profiles"],
    ["premium_report", "Open Weekly Report", "Weekly Report"],
    ["player_values", "Open Player Values", "Player Values"],
    ["trade_finder", "Open Trade Finder", "Trade Lab"],
  ])("maps %s to its relevant feature", (feature, actionLabel, tab) => {
    const activation = getPostPurchaseActivation(feature);

    expect(activation.actionLabel).toBe(actionLabel);
    expect(activation.destinationTab).toBe(tab);
  });

  test("opens the Finder mode after a Trade Finder purchase", () => {
    expect(getPostPurchaseActivation("trade_finder")).toMatchObject({
      destinationTab: "Trade Lab",
      destinationMode: "finder",
    });
  });

  test("falls back to a safe Premium landing action", () => {
    expect(getPostPurchaseActivation("premium")).toMatchObject({
      actionLabel: "Explore Premium features",
      destinationTab: "Home",
    });
  });
});
