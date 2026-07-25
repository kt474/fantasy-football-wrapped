import { afterEach, describe, expect, test, vi } from "vitest";
import {
  authenticatedBackendFetch,
  getBackendApiUrl,
  getBackendBaseUrl,
} from "../src/lib/backendApi.ts";
import { RequestTimeoutError } from "../src/lib/request.ts";
import * as supabaseModule from "../src/lib/supabase.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("backend API client", () => {
  test("builds backend URLs without a duplicate slash", () => {
    vi.stubEnv("VITE_BACKEND_URL", "https://backend.example.com/");

    expect(getBackendBaseUrl()).toBe("https://backend.example.com");
    expect(getBackendApiUrl("/api/test")).toBe(
      "https://backend.example.com/api/test"
    );
  });

  test("authenticates backend requests and applies the request timeout", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_BACKEND_URL", "");
    vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(false);

    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    const request = authenticatedBackendFetch("/api/test", { timeoutMs: 25 });
    const rejection = expect(request).rejects.toBeInstanceOf(
      RequestTimeoutError
    );

    await vi.advanceTimersByTimeAsync(25);
    await rejection;

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/test");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(true);
  });
});
