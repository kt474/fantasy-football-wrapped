import { afterEach, describe, expect, test, vi } from "vitest";
import {
  generatePreview,
  generateReport,
  generateSummary,
  generateTrends,
  getLeagueCount,
  getPlayerIdsByNameTeamMap,
  getPlayerNews,
  resolvePlayerIdLookupEndpoint,
} from "../src/api/api.ts";

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
  vi.useRealTimers();
});

describe("API fallback behavior", () => {
  test("uses the dedicated player ID lookup endpoint when configured", () => {
    expect(
      resolvePlayerIdLookupEndpoint(
        "https://lookup.example/api/player-id",
        "https://backend.example"
      )
    ).toBe("https://lookup.example/api/player-id");
  });

  test("derives the player ID lookup endpoint from the backend URL", () => {
    expect(
      resolvePlayerIdLookupEndpoint(undefined, "https://backend.example")
    ).toBe("https://backend.example/api/getPlayerId");
  });

  test("getLeagueCount falls back to zero on fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getLeagueCount();

    expect(result).toEqual({ league_id_count: 0 });
  });

  test("getPlayerNews returns an error result on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await getPlayerNews(["Patrick Mahomes"]);

    expect(result).toEqual({
      items: [],
      error: "Unable to load roster news right now.",
    });
  });

  test("getPlayerNews returns an error result on invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse(200, null, {
          json: async () => {
            throw new Error("invalid json");
          },
        })
      )
    );

    const result = await getPlayerNews([]);

    expect(result).toEqual({
      items: [],
      error: "Unable to load roster news right now.",
    });
  });

  test("getPlayerNews safely encodes roster names in the query", async () => {
    vi.stubEnv("VITE_PLAYER_NEWS", "https://news.example/feed");
    const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPlayerNews(["A.J. Brown", "Ja'Marr Chase"]);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://news.example/feed?keywords=A.J.+Brown%2CJa%27Marr+Chase"
    );
    expect(result).toEqual({ items: [], error: null });
  });

  test("getPlayerIdsByNameTeamMap preserves input order with nulls on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await getPlayerIdsByNameTeamMap([
      { name: "Patrick Mahomes", team: "KC" },
    ]);

    expect(result).toEqual([null]);
  });

  test("generateSummary returns fallback text on server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await generateSummary([], {});

    expect(result).toEqual({
      text: "Unable to generate report. Please try again later.",
    });
  });

  test("generateSummary aborts stalled requests and returns timeout guidance", async () => {
    vi.useFakeTimers();
    let requestSignal;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options) => {
        requestSignal = options.signal;
        return new Promise(() => {});
      })
    );

    const request = generateSummary([], {});
    const result = expect(request).resolves.toEqual({
      text: "Unable to generate report. Please try again later.",
    });

    await vi.advanceTimersByTimeAsync(60_000);
    await result;
    expect(requestSignal).toBeInstanceOf(AbortSignal);
    expect(requestSignal.aborted).toBe(true);
  });

  test("generateReport returns fallback text on server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await generateReport([], {});

    expect(result).toEqual({
      text: "Unable to generate report. Please try again later.",
    });
  });

  test("generatePreview returns fallback text on server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await generatePreview({});

    expect(result).toEqual({
      text: "Unable to generate preview. Please try again later.",
    });
  });

  test("generateTrends rejects on server errors so callers can show a fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    await expect(
      generateTrends([], 120, 5, "post_season")
    ).rejects.toThrow("Trends generation request failed with status 500");
  });

  test("generateTrends rejects malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockFetchResponse(200, {}))
    );

    await expect(generateTrends([], 120, 5)).rejects.toThrow(
      "Trends generation returned an invalid response"
    );
  });
});
