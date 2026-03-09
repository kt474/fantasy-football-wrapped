import { afterEach, describe, expect, test, vi } from "vitest";
import { getTradeValue } from "../src/api/sleeperApi.ts";

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

describe("getTradeValue", () => {
  test("uses season stats branch for DEF/K positions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, {
        stats: {
          pos_rank_std: 12,
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const value = await getTradeValue("p1", "2025", 6, 0, "DEF");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("grouping=week");
    expect(value).toBe(12);
  });

  test("uses weekly branch and averages only valid ranks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, {
        1: { stats: { pos_rank_ppr: 5 } },
        2: { stats: { pos_rank_ppr: 0 } },
        3: { stats: { pos_rank_ppr: 999 } },
        4: { stats: { pos_rank_ppr: 9 } },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const value = await getTradeValue("p1", "2025", 1, 1, "RB");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("grouping=week");
    expect(value).toBe(7);
  });

  test("returns null when no valid weekly ranks remain", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse(200, {
        1: { stats: { pos_rank_half_ppr: 0 } },
        2: { stats: { pos_rank_half_ppr: 999 } },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const value = await getTradeValue("p1", "2025", 1, 0.5, "WR");

    expect(value).toBeNull();
  });
});
