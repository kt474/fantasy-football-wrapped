import { afterEach, describe, expect, test, vi } from "vitest";
import { getPlayerTradeDatabase } from "../src/api/api.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("trade database API", () => {
  test("requests a paginated player trade search", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        playerId: "6794",
        pagination: {
          total: 1,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
        trades: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getPlayerTradeDatabase("6794", 0, 20, {
      leagueType: "Dynasty",
      leagueSize: "12",
      week: 6,
    });

    const requestedUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.pathname).toBe("/api/trades");
    expect(requestedUrl.searchParams.get("playerId")).toBe("6794");
    expect(requestedUrl.searchParams.get("offset")).toBe("0");
    expect(requestedUrl.searchParams.get("limit")).toBe("20");
    expect(requestedUrl.searchParams.get("leagueType")).toBe("Dynasty");
    expect(requestedUrl.searchParams.get("leagueSize")).toBe("12");
    expect(requestedUrl.searchParams.get("week")).toBe("6");
  });
});
