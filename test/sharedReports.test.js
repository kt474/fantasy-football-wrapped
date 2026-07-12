import { afterEach, describe, expect, test, vi } from "vitest";
import { getSharedReport, sharePremiumReport } from "../src/api/api.ts";
import * as authFetchModule from "../src/lib/authFetch.ts";

const report = {
  frontPage: {
    headline: "Headline",
    subheadline: "Subheadline",
    lead: "Lead",
  },
  matchupReports: [],
  teamOfTheWeek: {
    teamName: "Team One",
    pointsScored: 140,
    headline: "Big week",
    analysis: "Strong lineup.",
  },
  managersBlotter: {
    headline: "Blunders",
    entries: [],
  },
};

const mockResponse = (status, data) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => data,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared report API", () => {
  test("publishes reports through an authenticated request", async () => {
    const responsePayload = {
      token: "a".repeat(32),
      url: `https://ffwrapped.com/report/${"a".repeat(32)}`,
    };
    const fetchSpy = vi
      .spyOn(authFetchModule, "authenticatedFetch")
      .mockResolvedValue(mockResponse(201, responsePayload));

    const result = await sharePremiumReport({
      leagueId: "123456789",
      platform: "sleeper",
      leagueName: "Test League",
      season: "2026",
      week: 1,
      report,
    });

    expect(result).toEqual(responsePayload);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/shareReport"),
      expect.objectContaining({ method: "POST" })
    );
    const request = fetchSpy.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({
      leagueId: "123456789",
      platform: "sleeper",
    });
  });

  test("returns a public shared report", async () => {
    const responsePayload = {
      leagueId: "123456789",
      platform: "sleeper",
      leagueName: "Test League",
      season: "2026",
      week: 1,
      report,
      createdAt: "2026-06-19T16:17:03.95975+00:00",
    };
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockResponse(200, responsePayload));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await getSharedReport("a".repeat(32));

    expect(result).toEqual(responsePayload);
    expect(String(fetchSpy.mock.calls[0][0])).toContain(
      `token=${"a".repeat(32)}`
    );
  });

  test("returns null when a shared report is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(404, {})));

    await expect(getSharedReport("b".repeat(32))).resolves.toBeNull();
  });
});
