import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const resetFetch = () => {
  // @ts-ignore
  delete global.fetch;
};

const stubFetch = (payload: any) => {
  const fetchSpy = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(payload),
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
};

describe("player stats cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    resetFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetFetch();
  });

  it("reuses season stats from cache", async () => {
    const fetchSpy = stubFetch({
      stats: {
        pos_rank_ppr: 3,
        pts_ppr: 100,
        rank_ppr: 10,
        gp: 10,
      },
      player: {
        first_name: "A",
        last_name: "Alpha",
        position: "QB",
      },
      team: "DAL",
      player_id: "p1",
    });
    const { getStats } = await import("../src/api/api.ts");

    const first = await getStats("p1", "2024", 1);
    const second = await getStats("p1", "2024", 1);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first?.points).toBe(100);
  });

  it("deduplicates repeated ids in getStatsBatch and preserves order", async () => {
    const fetchSpy = stubFetch({
      stats: {
        pos_rank_ppr: 1,
        pts_ppr: 50,
        rank_ppr: 5,
        gp: 5,
      },
      player: {
        first_name: "B",
        last_name: "Beta",
        position: "RB",
      },
      team: "BUF",
      player_id: "pX",
    });
    const { getStatsBatch } = await import("../src/api/api.ts");

    const result = await getStatsBatch(["p1", "p2", "p1"], "2024", 1);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.length).toBe(3);
    expect(result[0]?.id).toBeDefined();
    expect(result[2]).toEqual(result[0]);
  });
});
