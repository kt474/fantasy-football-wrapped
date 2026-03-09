import { afterEach, describe, expect, test, vi } from "vitest";
import { getDraftProjections } from "../src/api/sleeperApi.ts";

const mockFetchResponse = (status, data, overrides = {}) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
    ...overrides,
  });

afterEach(() => {
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
