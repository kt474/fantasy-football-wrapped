import { afterEach, describe, expect, test, vi } from "vitest";
import {
  generatePreview,
  generateReport,
  generateSummary,
  generateTrends,
  getLeagueCount,
  getPlayerIdsByNameTeamMap,
  getPlayerNews,
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
});

describe("API fallback behavior", () => {
  test("getLeagueCount falls back to zero on fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getLeagueCount();

    expect(result).toEqual({ league_id_count: 0 });
  });

  test("getPlayerNews returns empty list on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await getPlayerNews(["Patrick Mahomes"]);

    expect(result).toEqual([]);
  });

  test("getPlayerNews returns empty list on invalid JSON", async () => {
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

    expect(result).toEqual([]);
  });

  test("getPlayerIdsByNameTeamMap returns empty list on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await getPlayerIdsByNameTeamMap([
      { name: "Patrick Mahomes", team: "KC" },
    ]);

    expect(result).toEqual([]);
  });

  test("generateSummary returns fallback text on server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await generateSummary([], {});

    expect(result).toEqual({
      text: "Unable to generate report. Please try again later.",
    });
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

  test("generateTrends returns empty object on server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse(500, {})));

    const result = await generateTrends([], 120, 5, "post_season");

    expect(result).toEqual({});
  });
});
