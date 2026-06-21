import { describe, expect, test, vi } from "vitest";
import { getOrderedRosterPlayerIds } from "../src/components/start_sit/startSitLoader.ts";
import { mapWithConcurrency } from "../src/lib/async.ts";

describe("Start/Sit loader", () => {
  test("orders the selected roster with starters first", () => {
    expect(
      getOrderedRosterPlayerIds(
        ["bench-1", "starter-2", "starter-1", "bench-2"],
        [["starter-1", "starter-2"]],
        1
      )
    ).toEqual(["starter-1", "starter-2", "bench-1", "bench-2"]);
  });

  test("uses the latest available starter week safely", () => {
    expect(getOrderedRosterPlayerIds(["p1", "p2"], undefined, 0)).toEqual([
      "p1",
      "p2",
    ]);
  });

  test("never exceeds the configured concurrency", async () => {
    let active = 0;
    let peak = 0;
    const releases = [];
    const mapper = vi.fn(async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => releases.push(resolve));
      active -= 1;
      return value * 2;
    });

    const resultPromise = mapWithConcurrency([1, 2, 3, 4, 5], 2, mapper);
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(2));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(3));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(4));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(5));
    releases.splice(0).forEach((release) => release());

    await expect(resultPromise).resolves.toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});
