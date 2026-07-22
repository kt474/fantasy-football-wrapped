import { describe, expect, test } from "vitest";
import { getRecordForWeek } from "../src/lib/record.ts";

describe("week-specific records", () => {
  test("limits a standard record to completed weeks", () => {
    expect(getRecordForWeek("WWLL", 2, false)).toBe("2 - 0");
  });

  test("counts both weekly results in median-scoring leagues", () => {
    expect(getRecordForWeek("WLWL", 1, true)).toBe("1 - 1");
  });

  test("preserves ties", () => {
    expect(getRecordForWeek("WWLTL", 5, false)).toBe("2 - 2 - 1");
  });

  test("returns an empty record when no results are available", () => {
    expect(getRecordForWeek("", 4, false)).toBe("0-0");
    expect(getRecordForWeek(undefined, 4, false)).toBe("0-0");
  });
});
