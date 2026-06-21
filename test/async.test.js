import { describe, expect, test, vi } from "vitest";
import { mapWithConcurrency } from "../src/lib/async.ts";

describe("mapWithConcurrency", () => {
  test("preserves result order while limiting active work", async () => {
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

    const resultPromise = mapWithConcurrency([1, 2, 3, 4], 2, mapper);
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(2));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(3));
    releases.shift()();
    await vi.waitFor(() => expect(mapper).toHaveBeenCalledTimes(4));
    releases.splice(0).forEach((release) => release());

    await expect(resultPromise).resolves.toEqual([2, 4, 6, 8]);
    expect(peak).toBe(2);
  });
});
