import { describe, expect, test } from "vitest";
import { getLeagueFeatureDestinationTab } from "../src/lib/leagueFeatureDestination";

describe("league feature destinations", () => {
  test("maps Player Values and Trade Finder landing destinations", () => {
    expect(getLeagueFeatureDestinationTab("player_values")).toBe(
      "Player Values"
    );
    expect(getLeagueFeatureDestinationTab("trade_finder")).toBe("Trade Lab");
  });

  test("accepts Vue Router array query values and rejects unknown values", () => {
    expect(getLeagueFeatureDestinationTab(["trade_finder"])).toBe(
      "Trade Lab"
    );
    expect(getLeagueFeatureDestinationTab("standings")).toBeNull();
    expect(getLeagueFeatureDestinationTab(undefined)).toBeNull();
  });
});
