import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  SHARED_REPORT_TOKEN_PATTERN,
  buildReportPreviewMetadata,
  fetchSharedReportPreview,
  injectReportPreviewMetadata,
  type ReportPreviewMetadata,
} from "./_lib/reportPreview.js";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getSiteOrigin = () => {
  const configuredOrigin = String(process.env.REPORT_PREVIEW_SITE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (configuredOrigin) return configuredOrigin;

  if (process.env.VERCEL_ENV === "production") {
    return "https://ffwrapped.com";
  }

  const deploymentHost = String(process.env.VERCEL_URL ?? "").trim();
  return deploymentHost
    ? `https://${deploymentHost}`
    : "https://ffwrapped.com";
};

const loadIndexHtml = async (siteOrigin: string) => {
  try {
    return await readFile(resolve(process.cwd(), "dist/index.html"), "utf8");
  } catch {
    const response = await fetch(`${siteOrigin}/`, {
      headers: { Accept: "text/html" },
      redirect: "error",
    });
    if (!response.ok) {
      throw new Error(`Unable to load the app shell (${response.status})`);
    }
    return await response.text();
  }
};

const getFallbackMetadata = (
  siteOrigin: string,
  token: string
): ReportPreviewMetadata => ({
  documentTitle: "Shared Weekly Report | ffwrapped",
  title: "Shared Fantasy Football Weekly Report",
  description:
    "Read a personalized fantasy football weekly report created with ffwrapped.",
  pageUrl: `${siteOrigin}/report/${encodeURIComponent(token)}`,
  imageUrl: `${siteOrigin}/homepage.webp`,
  imageAlt: "ffwrapped fantasy football league analysis",
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.end("Method not allowed");
    return;
  }

  const token = String(getQueryValue(req.query?.token) ?? "").trim();
  const siteOrigin = getSiteOrigin();

  try {
    const indexHtmlPromise = loadIndexHtml(siteOrigin);
    const reportPromise = SHARED_REPORT_TOKEN_PATTERN.test(token)
      ? fetchSharedReportPreview(token).catch(() => null)
      : Promise.resolve(null);
    const [indexHtml, report] = await Promise.all([
      indexHtmlPromise,
      reportPromise,
    ]);

    const metadata = report
      ? buildReportPreviewMetadata({ report, siteOrigin, token })
      : getFallbackMetadata(siteOrigin, token);
    const html = injectReportPreviewMetadata(indexHtml, metadata);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader(
      "Cache-Control",
      report
        ? "public, max-age=0, s-maxage=300, stale-while-revalidate=3600"
        : "private, no-store, max-age=0"
    );
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.end(req.method === "HEAD" ? undefined : "Unable to load shared report");
  }
}
