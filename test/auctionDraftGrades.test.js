import { describe, expect, test } from "vitest";
import { calculateExpectedAuctionValues } from "../src/lib/auctionDraftGrades.ts";

describe("auction draft grades", () => {
  test("matches the best ADPs with the highest bids in the room", () => {
    const values = calculateExpectedAuctionValues([
      {
        key: "early-bargain",
        adp: 2,
        projectedPoints: 280,
        bid: 30,
        draftOrder: 2,
      },
      {
        key: "market-price",
        adp: 10,
        projectedPoints: 240,
        bid: 30,
        draftOrder: 1,
      },
      {
        key: "overpay",
        adp: 40,
        projectedPoints: 180,
        bid: 50,
        draftOrder: 3,
      },
    ]);

    expect(values.get("early-bargain")).toEqual({
      expectedValue: 50,
      surplus: 20,
    });
    expect(values.get("market-price")).toEqual({
      expectedValue: 30,
      surplus: 0,
    });
    expect(values.get("overpay")).toEqual({
      expectedValue: 30,
      surplus: -20,
    });
  });

  test("uses projections and draft order to place missing ADPs", () => {
    const values = calculateExpectedAuctionValues([
      {
        key: "higher-projection",
        adp: null,
        projectedPoints: 150,
        bid: 4,
        draftOrder: 2,
      },
      {
        key: "lower-projection",
        adp: null,
        projectedPoints: 100,
        bid: 8,
        draftOrder: 1,
      },
    ]);

    expect(values.get("higher-projection")?.expectedValue).toBe(8);
    expect(values.get("lower-projection")?.expectedValue).toBe(4);
  });
});
