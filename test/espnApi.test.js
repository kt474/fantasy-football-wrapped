import { describe, expect, test } from "vitest";
import { getLeagueStatus } from "../src/api/espnApi.ts";

describe("ESPN API transforms", () => {
  test("normalizes completed ESPN seasons to the app completed status", () => {
    expect(getLeagueStatus(15, 14, 14)).toBe("complete");
  });

  test("keeps active ESPN seasons in season", () => {
    expect(getLeagueStatus(8, 7, 14)).toBe("in_season");
  });

  test("detects ESPN pre-draft leagues", () => {
    expect(getLeagueStatus(0, 0, 14)).toBe("pre_draft");
  });
});
