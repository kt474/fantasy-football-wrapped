import { describe, expect, test, vi } from "vitest";

import {
  preserveRefreshedLeagueHistory,
  refreshLeagueAtomically,
} from "../src/lib/leagueRefresh.ts";

const buildLeague = (overrides = {}) => ({
  leagueId: "league-1",
  name: "Original league",
  season: "2026",
  platform: "sleeper",
  ...overrides,
});

describe("atomic league refresh", () => {
  test("does not commit until the fetch finishes", async () => {
    const originalLeague = buildLeague();
    const refreshedLeague = buildLeague({
      name: "Refreshed league",
      lastUpdated: 2,
    });
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const commit = vi.fn();

    const refreshPromise = refreshLeagueAtomically(originalLeague, commit, {
      getSleeperLeague: vi.fn(() => fetchPromise),
    });

    expect(commit).not.toHaveBeenCalled();
    resolveFetch(refreshedLeague);
    await expect(refreshPromise).resolves.toBe(refreshedLeague);
    expect(commit).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith(refreshedLeague);
  });

  test("leaves state untouched when the request fails", async () => {
    const originalLeague = buildLeague();
    const leagues = [originalLeague];
    const commit = vi.fn((replacement) => {
      leagues[0] = replacement;
    });

    await expect(
      refreshLeagueAtomically(originalLeague, commit, {
        getSleeperLeague: vi.fn().mockRejectedValue(new Error("offline")),
      })
    ).rejects.toThrow("offline");

    expect(leagues).toEqual([originalLeague]);
    expect(commit).not.toHaveBeenCalled();
  });

  test("ignores a late response after the refresh is canceled", async () => {
    const originalLeague = buildLeague();
    const refreshedLeague = buildLeague({ name: "Late response" });
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const controller = new AbortController();
    const commit = vi.fn();
    const refreshPromise = refreshLeagueAtomically(
      originalLeague,
      commit,
      {
        getSleeperLeague: vi.fn(() => fetchPromise),
      },
      controller.signal
    );

    controller.abort();
    resolveFetch(refreshedLeague);

    await expect(refreshPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(commit).not.toHaveBeenCalled();
  });

  test("uses ESPN authentication", async () => {
    const originalLeague = buildLeague({
      leagueId: "espn-league",
      platform: "espn",
      season: "2025",
    });
    const refreshedLeague = { ...originalLeague, lastUpdated: 2 };
    const auth = { espnS2: "token", swid: "{user}" };
    const getEspnAuth = vi.fn(() => auth);
    const getEspnLeague = vi.fn().mockResolvedValue(refreshedLeague);
    const commit = vi.fn();
    const controller = new AbortController();

    await expect(
      refreshLeagueAtomically(
        originalLeague,
        commit,
        {
          getEspnAuth,
          getEspnLeague,
        },
        controller.signal
      )
    ).resolves.toBe(refreshedLeague);

    expect(getEspnAuth).toHaveBeenCalledWith("2025", "espn-league");
    expect(getEspnLeague).toHaveBeenCalledWith(
      "2025",
      "espn-league",
      auth,
      { signal: controller.signal }
    );
    expect(commit).toHaveBeenCalledWith(refreshedLeague);
  });

  test("preserves expanded Sleeper history when refreshed data omits it", async () => {
    const previousLeague = buildLeague({
      leagueId: "league-0",
      season: "2025",
      previousLeagues: [],
    });
    const originalLeague = buildLeague({
      previousLeagues: [previousLeague],
    });
    const fetchedLeague = buildLeague({
      name: "Refreshed league",
      previousLeagues: [],
    });
    const commit = vi.fn();

    const refreshedLeague = await refreshLeagueAtomically(
      originalLeague,
      commit,
      { getSleeperLeague: vi.fn().mockResolvedValue(fetchedLeague) }
    );

    expect(refreshedLeague).not.toBe(fetchedLeague);
    expect(refreshedLeague.previousLeagues).toEqual([previousLeague]);
    expect(commit).toHaveBeenCalledWith(refreshedLeague);
  });

  test("replaces ESPN season references with saved expanded seasons", () => {
    const loaded2025 = buildLeague({
      leagueId: "espn-league",
      platform: "espn",
      season: "2025",
      previousLeagues: [],
    });
    const originalLeague = buildLeague({
      leagueId: "espn-league",
      platform: "espn",
      season: "2026",
      previousLeagues: [loaded2025, "2024"],
    });
    const fetchedLeague = buildLeague({
      leagueId: "espn-league",
      platform: "espn",
      season: "2026",
      previousLeagues: ["2025", "2024", "2023"],
    });

    const refreshedLeague = preserveRefreshedLeagueHistory(
      originalLeague,
      fetchedLeague
    );

    expect(refreshedLeague.previousLeagues).toEqual([
      loaded2025,
      "2024",
      "2023",
    ]);
  });
});
