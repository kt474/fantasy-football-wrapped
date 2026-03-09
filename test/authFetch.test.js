import { afterEach, describe, expect, test, vi } from "vitest";
import { authenticatedFetch } from "../src/lib/authFetch.ts";
import * as supabaseModule from "../src/lib/supabase.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("authenticatedFetch", () => {
  test("attaches bearer token for trusted origins when configured", async () => {
    vi.stubEnv("VITE_BACKEND_URL", "https://backend.example.com");

    const getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: "token-123" } },
    });
    vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue({
      auth: { getSession },
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("https://backend.example.com/api/test", {
      headers: { "X-Test": "1" },
    });

    expect(getSession).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();

    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("X-Test")).toBe("1");
  });

  test("does not attach auth header for untrusted origin", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: "token-123" } },
    });
    vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue({
      auth: { getSession },
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("https://untrusted.example.com/data");

    expect(getSession).not.toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  test("preserves an existing Authorization header", async () => {
    const getSession = vi.fn();
    vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue({
      auth: { getSession },
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("/api/test", {
      headers: { Authorization: "Bearer existing" },
    });

    expect(getSession).not.toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer existing");
  });
});
