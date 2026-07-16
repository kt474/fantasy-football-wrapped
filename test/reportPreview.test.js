import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";

import reportImageHandler from "../api/report-image.ts";
import reportPageHandler from "../api/report-page.ts";
import {
  buildReportPreviewMetadata,
  fetchSharedReportPreview,
  injectReportPreviewMetadata,
  normalizeSharedReportPreview,
  truncatePreviewText,
} from "../api/_lib/reportPreview.ts";

const token = "a".repeat(32);
const sharedReport = {
  leagueName: 'The <Best> "League" & Friends',
  season: "2026",
  week: 8,
  report: {
    frontPage: {
      headline: "Week 8 Turned the Playoff Line Into a Trapdoor",
      subheadline:
        "Breece's Puffs escaped onto the cutoff while Lamario Kart benched the winning points.",
      lead: "The week changed the playoff race.",
    },
    teamOfTheWeek: {
      teamName: "Bijan Mustard",
      pointsScored: 156.42,
      headline: "The Whole Lineup Chose Violence",
    },
  },
};

const createFetchResponse = (status, body, contentType = "application/json") =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": contentType },
  });

const createApiResponse = () => {
  const headers = new Map();
  let body;
  const response = {
    statusCode: 0,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    end(value) {
      body = value;
    },
  };

  return {
    response,
    getBody: () => body,
    getHeader: (name) => headers.get(name.toLowerCase()),
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.BACKEND_URL;
  delete process.env.REPORT_PREVIEW_SITE_URL;
});

describe("shared report social previews", () => {
  test("normalizes only the report data needed for previews", () => {
    expect(normalizeSharedReportPreview(sharedReport)).toEqual(sharedReport);
    expect(
      normalizeSharedReportPreview({
        ...sharedReport,
        report: { ...sharedReport.report, frontPage: null },
      })
    ).toBeNull();
  });

  test("fetches a shared report without accepting arbitrary tokens", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createFetchResponse(200, sharedReport));

    await expect(
      fetchSharedReportPreview(token, {
        backendBaseUrl: "https://backend.example.com",
        fetchImpl,
      })
    ).resolves.toEqual(sharedReport);
    expect(String(fetchImpl.mock.calls[0][0])).toContain(`/api/getSharedReport`);
    expect(String(fetchImpl.mock.calls[0][0])).toContain(`token=${token}`);

    await expect(
      fetchSharedReportPreview("../../private", {
        backendBaseUrl: "https://backend.example.com",
        fetchImpl,
      })
    ).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("builds escaped report-specific Open Graph and Twitter metadata", () => {
    const metadata = buildReportPreviewMetadata({
      report: sharedReport,
      siteOrigin: "https://ffwrapped.com/",
      token,
    });
    const template = readFileSync("index.html", "utf8");
    const html = injectReportPreviewMetadata(template, metadata);

    expect(html).toContain(
      '<meta property="og:title" content="Week 8 Turned the Playoff Line Into a Trapdoor" />'
    );
    expect(html).toContain(
      `<meta property="og:image" content="https://ffwrapped.com/api/report-image?token=${token}" />`
    );
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain("The &lt;Best&gt; &quot;League&quot; &amp; Friends");
    expect(html).not.toContain('<script type="application/ld+json">');
  });

  test("truncates preview copy at a readable word boundary", () => {
    const result = truncatePreviewText(
      "This is a deliberately long headline that should be shortened cleanly",
      42
    );
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(42);
  });

  test("renders a valid PNG social card", async () => {
    process.env.BACKEND_URL = "https://backend.example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createFetchResponse(200, sharedReport))
    );
    const api = createApiResponse();

    await reportImageHandler(
      { method: "GET", query: { token } },
      api.response
    );

    const body = api.getBody();
    expect(api.response.statusCode).toBe(200);
    expect(api.getHeader("content-type")).toBe("image/png");
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(body.byteLength).toBeGreaterThan(10_000);
  });

  test("serves personalized crawler HTML while keeping the Vue app shell", async () => {
    process.env.BACKEND_URL = "https://backend.example.com";
    process.env.REPORT_PREVIEW_SITE_URL = "https://ffwrapped.com";
    vi.stubGlobal(
      "fetch",
      vi.fn((request) => {
        const url = String(request);
        return Promise.resolve(
          url.includes("getSharedReport")
            ? createFetchResponse(200, sharedReport)
            : createFetchResponse(200, readFileSync("index.html", "utf8"), "text/html")
        );
      })
    );
    const api = createApiResponse();

    await reportPageHandler(
      { method: "GET", query: { token } },
      api.response
    );

    const html = String(api.getBody());
    expect(api.response.statusCode).toBe(200);
    expect(api.getHeader("x-robots-tag")).toBe("noindex, nofollow");
    expect(html).toContain(
      '<meta property="og:title" content="Week 8 Turned the Playoff Line Into a Trapdoor" />'
    );
    expect(html).toContain('<div id="app">');
    expect(html).toContain('<script type="module"');
  });
});
