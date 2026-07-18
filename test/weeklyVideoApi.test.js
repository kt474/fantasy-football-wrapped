import { afterEach, describe, expect, test, vi } from "vitest";

const { authenticatedFetch } = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("../src/lib/authFetch.ts", () => ({ authenticatedFetch }));

import {
  getLatestWeeklyRecapVideo,
  getWeeklyRecapVideo,
  startWeeklyRecapVideo,
} from "../src/api/api.ts";

const job = {
  jobId: "job-123",
  status: "starting",
  progress: 0,
  createdAt: "2026-07-18T12:00:00.000Z",
  expiresAt: null,
  videoUrl: null,
};

const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(body),
});

afterEach(() => {
  authenticatedFetch.mockReset();
});

describe("weekly recap video job API", () => {
  test("starts a job and consumes its jobId response", async () => {
    authenticatedFetch.mockResolvedValue(response(201, job));
    const inputProps = { league: { id: "league-1" } };

    await expect(startWeeklyRecapVideo(inputProps)).resolves.toEqual(job);
    expect(authenticatedFetch.mock.calls[0][0]).toMatch(/\/api\/reportVideo$/);
    expect(authenticatedFetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ inputProps }),
      })
    );
  });

  test("polls a job with jobId and never sends renderId", async () => {
    authenticatedFetch.mockResolvedValue(response(200, job));

    await getWeeklyRecapVideo("job-123");

    const endpoint = authenticatedFetch.mock.calls[0][0];
    expect(endpoint).toBeInstanceOf(URL);
    expect(endpoint.searchParams.get("jobId")).toBe("job-123");
    expect(endpoint.searchParams.has("renderId")).toBe(false);
  });

  test("retrieves the latest owned report job", async () => {
    authenticatedFetch.mockResolvedValue(response(200, job));

    await expect(
      getLatestWeeklyRecapVideo("league-1", "2025", 7)
    ).resolves.toEqual(job);

    const endpoint = authenticatedFetch.mock.calls[0][0];
    expect(Object.fromEntries(endpoint.searchParams)).toEqual({
      leagueId: "league-1",
      season: "2025",
      week: "7",
    });
  });

  test("treats a missing latest job as null", async () => {
    authenticatedFetch.mockResolvedValue(response(404, {}));

    await expect(
      getLatestWeeklyRecapVideo("league-1", "2025", 7)
    ).resolves.toBeNull();
  });
});
