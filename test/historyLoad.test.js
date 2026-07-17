import { describe, expect, test, vi } from "vitest";

import {
  loadHistoryCandidates,
  loadLinkedHistory,
} from "../src/lib/historyLoad.ts";
import { RequestAbortedError } from "../src/lib/request.ts";

const candidate = (season) => ({
  key: `espn:league-1:${season}`,
  leagueId: "league-1",
  season,
  platform: "espn",
});

describe("league history loading", () => {
  test("keeps successful seasons and continues after a partial ESPN failure", async () => {
    const committed = [];
    const fetchCandidate = vi.fn(async ({ season }) => {
      if (season === "2024") throw new Error("temporary failure");
      return { season, complete: true };
    });

    const result = await loadHistoryCandidates({
      candidates: [candidate("2025"), candidate("2024"), candidate("2023")],
      fetchCandidate,
      isValid: (league) => league.complete,
      onLoaded: (league) => committed.push(league.season),
      getErrorMessage: () => "Unable to load ESPN league right now.",
    });

    expect(committed).toEqual(["2025", "2023"]);
    expect(result.loaded).toBe(2);
    expect(result.failures).toEqual([
      expect.objectContaining({
        season: "2024",
        message: "Unable to load ESPN league right now.",
      }),
    ]);
  });

  test("retry input can be limited to only the failed seasons", async () => {
    const initialFetch = vi.fn(async ({ season }) => {
      if (season === "2024") throw new Error("temporary failure");
      return { season, complete: true };
    });
    const initial = await loadHistoryCandidates({
      candidates: [candidate("2025"), candidate("2024"), candidate("2023")],
      fetchCandidate: initialFetch,
      isValid: (league) => league.complete,
      onLoaded: vi.fn(),
      getErrorMessage: () => "Try again.",
    });
    const retryFetch = vi.fn(async ({ season }) => ({ season, complete: true }));

    const retry = await loadHistoryCandidates({
      candidates: initial.failures.map(({ message: _message, ...failure }) =>
        failure
      ),
      fetchCandidate: retryFetch,
      isValid: (league) => league.complete,
      onLoaded: vi.fn(),
      getErrorMessage: () => "Try again.",
    });

    expect(retryFetch).toHaveBeenCalledTimes(1);
    expect(retryFetch).toHaveBeenCalledWith(
      expect.objectContaining({ season: "2024" }),
      undefined
    );
    expect(retry).toEqual({ loaded: 1, failures: [] });
  });

  test("preserves an ESPN authentication message for the failed season", async () => {
    const result = await loadHistoryCandidates({
      candidates: [candidate("2025")],
      fetchCandidate: async () => {
        throw new Error("private");
      },
      isValid: () => true,
      onLoaded: vi.fn(),
      getErrorMessage: () =>
        "This ESPN league appears to be private. Please enter your ESPN credentials.",
    });

    expect(result.failures[0]).toMatchObject({
      season: "2025",
      message:
        "This ESPN league appears to be private. Please enter your ESPN credentials.",
    });
  });

  test("can load independent ESPN seasons with bounded concurrency", async () => {
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const releases = [];
    const fetchCandidate = vi.fn(async ({ season }) => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await new Promise((resolve) => releases.push(resolve));
      activeRequests -= 1;
      return { season, complete: true };
    });
    const load = loadHistoryCandidates({
      candidates: [candidate("2025"), candidate("2024"), candidate("2023")],
      fetchCandidate,
      isValid: (league) => league.complete,
      onLoaded: vi.fn(),
      getErrorMessage: () => "Try again.",
      concurrency: 2,
    });

    await vi.waitFor(() => expect(fetchCandidate).toHaveBeenCalledTimes(2));
    releases.shift()();
    await vi.waitFor(() => expect(fetchCandidate).toHaveBeenCalledTimes(3));
    releases.splice(0).forEach((release) => release());

    await expect(load).resolves.toEqual({ loaded: 3, failures: [] });
    expect(maxActiveRequests).toBe(2);
  });

  test("does not commit a season whose request became stale", async () => {
    let resolveRequest;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const controller = new AbortController();
    const onLoaded = vi.fn();
    const load = loadHistoryCandidates({
      candidates: [candidate("2025")],
      fetchCandidate: () => pending,
      isValid: () => true,
      onLoaded,
      getErrorMessage: () => "Try again.",
      signal: controller.signal,
    });

    controller.abort(new RequestAbortedError());
    resolveRequest({ season: "2025", complete: true });

    await expect(load).rejects.toBeInstanceOf(RequestAbortedError);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  test("keeps completed linked seasons when a deeper Sleeper season fails", async () => {
    const committed = [];
    const fetchLeague = vi.fn(async (leagueId) => {
      if (leagueId === "league-2023") throw new Error("network failure");
      if (leagueId === "league-2025") {
        return {
          leagueId,
          season: "2025",
          previousLeagueId: "league-2024",
          complete: true,
        };
      }
      return {
        leagueId,
        season: "2024",
        previousLeagueId: "league-2023",
        complete: true,
      };
    });

    const result = await loadLinkedHistory({
      initialCandidate: {
        key: "sleeper:league-2025:2025",
        leagueId: "league-2025",
        season: "2025",
        platform: "sleeper",
      },
      fetchLeague,
      isValid: (league) => league.complete,
      onLoaded: (league) => committed.push(league.season),
      getErrorMessage: () => "Unable to load league right now.",
    });

    expect(committed).toEqual(["2025", "2024"]);
    expect(result.loaded).toBe(2);
    expect(result.failures[0]).toMatchObject({
      leagueId: "league-2023",
      season: "2023",
    });
  });

  test("continues past an incomplete linked season", async () => {
    const committed = [];
    const fetchLeague = vi.fn(async (leagueId) => {
      if (leagueId === "league-2025") {
        return {
          leagueId,
          season: "2025",
          previousLeagueId: "league-2024",
          complete: false,
        };
      }
      return {
        leagueId,
        season: "2024",
        previousLeagueId: null,
        complete: true,
      };
    });

    const result = await loadLinkedHistory({
      initialCandidate: {
        key: "sleeper:league-2025:2025",
        leagueId: "league-2025",
        season: "2025",
        platform: "sleeper",
      },
      fetchLeague,
      isValid: (league) => league.complete,
      onLoaded: (league) => committed.push(league.season),
      getErrorMessage: () => "Unable to load league right now.",
    });

    expect(fetchLeague).toHaveBeenCalledTimes(2);
    expect(committed).toEqual(["2024"]);
    expect(result).toEqual({ loaded: 1, failures: [] });
  });
});
