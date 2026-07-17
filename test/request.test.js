import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createLatestRequestGuard,
  ESPN_LEAGUE_LOAD_TIMEOUT_MS,
  fetchWithRetry,
  LEAGUE_LOAD_TIMEOUT_MS,
  RequestAbortedError,
  RequestTimeoutError,
  runWithRequestTimeout,
} from "../src/lib/request.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("request reliability", () => {
  test("allows aggregate ESPN imports more time than Sleeper imports", () => {
    expect(ESPN_LEAGUE_LOAD_TIMEOUT_MS).toBeGreaterThan(
      LEAGUE_LOAD_TIMEOUT_MS
    );
  });

  test("retries one transient server failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithRetry("https://example.com", {
      retryDelayMs: 0,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries one transient network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithRetry("https://example.com", { retryDelayMs: 0 })
    ).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries one rate-limited response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithRetry("https://example.com", { retryDelayMs: 0 })
    ).resolves.toMatchObject({ status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry authentication or not-found responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithRetry("https://example.com/private", { retryDelayMs: 0 })
    ).resolves.toMatchObject({ status: 401 });
    await expect(
      fetchWithRetry("https://example.com/missing", { retryDelayMs: 0 })
    ).resolves.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("bypasses browser caching for Sleeper API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("ok", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithRetry("https://api.sleeper.app/v1/league/league-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  test("times out a request that never settles", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const request = fetchWithRetry("https://example.com", {
      retries: 0,
      attemptTimeoutMs: 100,
    });
    const rejection = expect(request).rejects.toBeInstanceOf(
      RequestTimeoutError
    );
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
  });

  test("external cancellation wins over timeout", async () => {
    const controller = new AbortController();
    const operation = runWithRequestTimeout(
      () => new Promise(() => {}),
      { signal: controller.signal, timeoutMs: 10_000 }
    );

    controller.abort(new RequestAbortedError());

    await expect(operation).rejects.toBeInstanceOf(RequestAbortedError);
  });

  test("only the newest coordinated request remains active", () => {
    const requests = createLatestRequestGuard();
    const first = requests.start();
    const second = requests.start();

    expect(first.signal.aborted).toBe(true);
    expect(requests.isActive(first)).toBe(false);
    expect(requests.isActive(second)).toBe(true);
    expect(requests.finish(first)).toBe(false);
    expect(requests.finish(second)).toBe(true);
  });
});
