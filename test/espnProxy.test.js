import { afterEach, describe, expect, test, vi } from "vitest";
import handler, { isAllowedEspnUrl } from "../api/espn.ts";

const validUrl =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/123456?view=mSettings";

const createResponse = () => {
  const headers = new Map();
  return {
    statusCode: 0,
    body: "",
    headers,
    setHeader: vi.fn((name, value) => headers.set(name, value)),
    end: vi.fn(function (body = "") {
      this.body = body;
    }),
  };
};

const createFetchResponse = (body, status = 200, headers = {}) =>
  new Response(body, { status, headers });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ESPN proxy hardening", () => {
  test("allows only supported fantasy league URLs", () => {
    expect(isAllowedEspnUrl(new URL(validUrl))).toBe(true);
    expect(
      isAllowedEspnUrl(
        new URL("https://lm-api-reads.fantasy.espn.com/admin?view=mSettings")
      )
    ).toBe(false);
    expect(
      isAllowedEspnUrl(
        new URL(
          "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/123?view=unsupported"
        )
      )
    ).toBe(false);
    expect(
      isAllowedEspnUrl(
        new URL(
          "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2025/segments/0/leagues/123?view=mSettings&redirect=https://example.com"
        )
      )
    ).toBe(false);
  });

  test("sets no-store headers and proxies valid JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createFetchResponse('{"league":"ok"}'));
    vi.stubGlobal("fetch", fetchMock);
    const res = createResponse();

    await handler(
      {
        method: "POST",
        body: { url: validUrl, swid: "{abc}", espnS2: "token" },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"league":"ok"}');
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(fetchMock).toHaveBeenCalledWith(
      validUrl,
      expect.objectContaining({
        redirect: "error",
        headers: expect.objectContaining({
          Accept: "application/json",
          Cookie: "SWID={abc}; espn_s2=token",
        }),
      })
    );
  });

  test("rejects credentials containing control characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = createResponse();

    await handler(
      {
        method: "POST",
        body: { url: validUrl, swid: "{abc}\r\nInjected: yes", espnS2: "token" },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns 504 when the ESPN request times out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      })
    );
    const res = createResponse();

    const request = handler(
      {
        method: "POST",
        body: { url: validUrl, swid: "{abc}", espnS2: "token" },
      },
      res
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await request;

    expect(res.statusCode).toBe(504);
    expect(JSON.parse(res.body).error).toContain("timed out");
  });

  test("rejects oversized ESPN responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createFetchResponse("", 200, {
          "content-length": String(10 * 1024 * 1024 + 1),
        })
      )
    );
    const res = createResponse();

    await handler(
      {
        method: "POST",
        body: { url: validUrl, swid: "{abc}", espnS2: "token" },
      },
      res
    );

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toContain("too large");
  });
});
