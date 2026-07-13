import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getDraftProjections,
  getPlayerPositionsById,
  getProjections,
  getWeeklyProjections,
} from "../src/api/sleeperApi.ts";

const mockFetchResponse = (status, data, overrides = {}) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
    ...overrides,
  });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getDraftProjections", () => {
  test("uses idp ADP key when idp is enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          stats: {
            adp_idp: 41,
            pts_ppr: 198,
          },
        })
      )
    );

    const result = await getDraftProjections("p1", "2025", 1, "Redraft", false, true);

    expect(result).toEqual({ adp: 41, projectedPoints: 198 });
  });

  test("uses dynasty superflex ADP key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          stats: {
            adp_dynasty_2qb: 12,
            pts_half_ppr: 174,
          },
        })
      )
    );

    const result = await getDraftProjections("p1", "2025", 0.5, "Dynasty", true, false);

    expect(result).toEqual({ adp: 12, projectedPoints: 174 });
  });

  test("uses dynasty scoring-specific ADP key when not superflex", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          stats: {
            adp_dynasty_std: 33,
            pts_std: 150,
          },
        })
      )
    );

    const result = await getDraftProjections("p1", "2025", 0, "Dynasty", false, false);

    expect(result).toEqual({ adp: 33, projectedPoints: 150 });
  });

  test("uses redraft superflex ADP key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          stats: {
            adp_2qb: 8,
            pts_ppr: 220,
          },
        })
      )
    );

    const result = await getDraftProjections("p1", "2025", 1, "Redraft", true, false);

    expect(result).toEqual({ adp: 8, projectedPoints: 220 });
  });

  test("returns null fields when request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await getDraftProjections("p1", "2025", 1, "Redraft");

    expect(result).toEqual({ adp: null, projectedPoints: null });
  });
});

describe("getProjections", () => {
  test("returns an empty projection when the Sleeper projection request hangs", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const resultPromise = getProjections("p1", "2025", 1, 1);
    await vi.advanceTimersByTimeAsync(8000);

    await expect(resultPromise).resolves.toEqual({
      projection: 0,
      position: "",
    });
  });

  test("loads player positions from one shared directory request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, {
        p1: { position: "QB" },
        p2: { fantasy_positions: ["WR"] },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPlayerPositionsById(["p1", "p2"])).resolves.toEqual({
      p1: "QB",
      p2: "WR",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("shares weekly projection requests for the same forecast input", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, {
        7: { stats: { pts_ppr: 10 } },
        8: { stats: { pts_ppr: 12.6 } },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const inputs = ["cache-player", "2026", 8, 1];
    const [first, second] = await Promise.all([
      getWeeklyProjections(...inputs),
      getWeeklyProjections(...inputs),
    ]);

    expect(first).toBe(13);
    expect(second).toBe(13);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
