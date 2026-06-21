import { describe, expect, test, vi } from "vitest";
import { loadUserLeagues } from "../src/components/home/userLeagueLoader.ts";

describe("user league loader", () => {
  test("preserves selection order regardless of completion order", async () => {
    const resolvers = new Map();
    const loader = vi.fn(
      (leagueId) =>
        new Promise((resolve) => {
          resolvers.set(leagueId, resolve);
        })
    );

    const resultPromise = loadUserLeagues(["league-1", "league-2"], loader);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));

    resolvers.get("league-2")({ name: "Second" });
    resolvers.get("league-1")({ name: "First" });

    await expect(resultPromise).resolves.toEqual({
      loaded: [
        { leagueId: "league-1", league: { name: "First" } },
        { leagueId: "league-2", league: { name: "Second" } },
      ],
      failed: [],
    });
  });

  test("returns successful leagues when another selection fails", async () => {
    const failure = new Error("League unavailable");
    const loader = vi.fn(async (leagueId) => {
      if (leagueId === "league-2") {
        throw failure;
      }
      return { name: leagueId };
    });

    await expect(
      loadUserLeagues(["league-1", "league-2", "league-3"], loader)
    ).resolves.toEqual({
      loaded: [
        { leagueId: "league-1", league: { name: "league-1" } },
        { leagueId: "league-3", league: { name: "league-3" } },
      ],
      failed: [{ leagueId: "league-2", error: failure }],
    });
  });

  test("limits selected league loads to two at a time", async () => {
    let active = 0;
    let peak = 0;
    const releases = [];
    const loader = vi.fn(async (leagueId) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => releases.push(resolve));
      active -= 1;
      return { name: leagueId };
    });

    const resultPromise = loadUserLeagues(
      ["league-1", "league-2", "league-3", "league-4"],
      loader
    );
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    releases.shift()();
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(3));
    releases.shift()();
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(4));
    releases.splice(0).forEach((release) => release());

    const result = await resultPromise;
    expect(result.loaded).toHaveLength(4);
    expect(result.failed).toEqual([]);
    expect(peak).toBe(2);
  });
});
