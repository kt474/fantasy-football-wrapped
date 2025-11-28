import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const resetFetch = () => {
  // @ts-ignore
  delete global.fetch;
};

describe("API env guards", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    resetFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetFetch();
  });

  it("skips player lookup when VITE_PLAYERS_URL is missing", async () => {
    vi.stubEnv("VITE_PLAYERS_URL", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getPlayersByIdsMap } = await import("../src/api/api.ts");
    const result = await getPlayersByIdsMap(["123"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it("skips player news when VITE_PLAYER_NEWS is missing", async () => {
    vi.stubEnv("VITE_PLAYER_NEWS", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getPlayerNews } = await import("../src/api/api.ts");
    const result = await getPlayerNews(["test"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("skips league count when VITE_LEAGUE_COUNT is missing", async () => {
    vi.stubEnv("VITE_LEAGUE_COUNT", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { getLeagueCount } = await import("../src/api/api.ts");
    const result = await getLeagueCount();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
