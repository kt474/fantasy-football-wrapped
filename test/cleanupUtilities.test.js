import { describe, expect, test } from "vitest";

import { getPlayerLookupKey } from "../src/lib/playerLookup.ts";
import {
  capitalize,
  countBy,
  flatten,
  groupBy,
  maxBy,
  mean,
  minBy,
  round,
  zip,
} from "../src/lib/collection.ts";
import { getChartTooltipTheme } from "../src/lib/chartTheme.ts";
import {
  getTransactionRatingClass,
  getTransactionRatingLabel,
} from "../src/lib/transactionRating.ts";

describe("cleanup utilities", () => {
  test("provides the collection operations used by league calculations", () => {
    const rows = [
      { team: "A", score: 12 },
      { team: "B", score: 8 },
      { team: "A", score: 10 },
    ];

    expect(mean(rows.map((row) => row.score))).toBe(10);
    expect(mean([])).toBeNaN();
    expect(maxBy(rows, "score")?.team).toBe("A");
    expect(minBy(rows, "score")?.team).toBe("B");
    expect(groupBy(rows, "team").A).toHaveLength(2);
    expect(countBy(rows, (row) => row.score >= 10)).toEqual({
      true: 2,
      false: 1,
    });
    expect(flatten([[1, 2], [3]])).toEqual([1, 2, 3]);
    expect(zip([1, 2], [3])).toEqual([
      [1, 3],
      [2, undefined],
    ]);
    expect(round(2 / 3, 3)).toBe(0.667);
    expect(capitalize("REGULAR")).toBe("Regular");
  });

  test("normalizes player lookup keys once", () => {
    expect(getPlayerLookupKey({ name: "  CeeDee Lamb ", team: "dal" })).toBe(
      "ceedee lamb::DAL"
    );
  });

  test("shares transaction ratings and chart tooltip themes", () => {
    expect(getTransactionRatingClass(15)).toBe("performance-excellent");
    expect(getTransactionRatingClass(null)).toBe(
      "bg-muted text-muted-foreground"
    );
    expect(getTransactionRatingLabel(45)).toBe("Below Avg");
    expect(getTransactionRatingLabel(undefined)).toBe("");
    expect(getChartTooltipTheme(true)).toBe("dark");
    expect(getChartTooltipTheme(false)).toBe("light");
  });
});
