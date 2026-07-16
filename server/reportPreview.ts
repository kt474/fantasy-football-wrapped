export const SHARED_REPORT_TOKEN_PATTERN =
  /^(?:[a-f0-9]{32}|[A-Za-z0-9_-]{16})$/;

const REPORT_FETCH_TIMEOUT_MS = 5_000;
const MAX_REPORT_RESPONSE_BYTES = 128 * 1024;

type PremiumReportPreview = {
  frontPage: {
    headline: string;
    subheadline: string;
    lead: string;
  };
  teamOfTheWeek: {
    teamName: string;
    pointsScored: number;
    headline: string;
  };
};

export type SharedReportPreview = {
  leagueName: string;
  season: string;
  week: number;
  report: PremiumReportPreview;
};

export type ReportPreviewMetadata = {
  documentTitle: string;
  title: string;
  description: string;
  pageUrl: string;
  imageUrl: string;
  imageAlt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

export const truncatePreviewText = (value: string, maxLength: number) => {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) return normalized;

  const shortened = normalized.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = shortened.lastIndexOf(" ");
  const boundary = lastSpace >= maxLength * 0.65 ? lastSpace : shortened.length;
  return `${shortened.slice(0, boundary).trimEnd()}…`;
};

export const normalizeSharedReportPreview = (
  value: unknown
): SharedReportPreview | null => {
  if (!isRecord(value) || !isRecord(value.report)) return null;

  const frontPage = value.report.frontPage;
  const teamOfTheWeek = value.report.teamOfTheWeek;
  if (!isRecord(frontPage) || !isRecord(teamOfTheWeek)) return null;

  const leagueName = getString(value.leagueName);
  const season = getString(value.season);
  const week = Number(value.week);
  const headline = getString(frontPage.headline);
  const subheadline = getString(frontPage.subheadline);
  const lead = getString(frontPage.lead);
  const teamName = getString(teamOfTheWeek.teamName);
  const teamHeadline = getString(teamOfTheWeek.headline);
  const pointsScored = Number(teamOfTheWeek.pointsScored);

  if (
    !leagueName ||
    !season ||
    !Number.isInteger(week) ||
    week < 1 ||
    week > 25 ||
    !headline ||
    !subheadline ||
    !lead ||
    !teamName ||
    !teamHeadline ||
    !Number.isFinite(pointsScored)
  ) {
    return null;
  }

  return {
    leagueName,
    season,
    week,
    report: {
      frontPage: { headline, subheadline, lead },
      teamOfTheWeek: { teamName, pointsScored, headline: teamHeadline },
    },
  };
};

const getBackendBaseUrl = () =>
  String(process.env.BACKEND_URL ?? process.env.VITE_BACKEND_URL ?? "")
    .trim()
    .replace(/\/$/, "");

export const fetchSharedReportPreview = async (
  token: string,
  options: {
    backendBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<SharedReportPreview | null> => {
  if (!SHARED_REPORT_TOKEN_PATTERN.test(token)) return null;

  const backendBaseUrl = (options.backendBaseUrl ?? getBackendBaseUrl()).replace(
    /\/$/,
    ""
  );
  if (!backendBaseUrl) {
    throw new Error("Shared report backend URL is not configured");
  }

  const endpoint = new URL(`${backendBaseUrl}/api/getSharedReport`);
  if (!/^https?:$/.test(endpoint.protocol)) {
    throw new Error("Shared report backend URL must use HTTP or HTTPS");
  }
  endpoint.searchParams.set("token", token);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REPORT_FETCH_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Shared report request failed with ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REPORT_RESPONSE_BYTES) {
      throw new Error("Shared report response was too large");
    }

    const responseText = await response.text();
    if (Buffer.byteLength(responseText, "utf8") > MAX_REPORT_RESPONSE_BYTES) {
      throw new Error("Shared report response was too large");
    }

    return normalizeSharedReportPreview(JSON.parse(responseText));
  } finally {
    clearTimeout(timeoutId);
  }
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const buildReportPreviewMetadata = ({
  report,
  siteOrigin,
  token,
}: {
  report: SharedReportPreview;
  siteOrigin: string;
  token: string;
}): ReportPreviewMetadata => {
  const origin = siteOrigin.replace(/\/$/, "");
  const encodedToken = encodeURIComponent(token);
  const leagueName = truncatePreviewText(report.leagueName, 70);
  const headline = truncatePreviewText(report.report.frontPage.headline, 100);
  const description = truncatePreviewText(
    report.report.frontPage.subheadline || report.report.frontPage.lead,
    180
  );

  return {
    documentTitle: `${leagueName} Week ${report.week} Report | ffwrapped`,
    title: headline,
    description,
    pageUrl: `${origin}/report/${encodedToken}`,
    imageUrl: `${origin}/api/report-image?token=${encodedToken}`,
    imageAlt: `${leagueName} Week ${report.week} fantasy football report`,
  };
};

const replaceTag = (html: string, pattern: RegExp, replacement: string) =>
  pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace("</head>", `  ${replacement}\n  </head>`);

export const injectReportPreviewMetadata = (
  indexHtml: string,
  metadata: ReportPreviewMetadata
) => {
  const documentTitle = escapeHtml(metadata.documentTitle);
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const pageUrl = escapeHtml(metadata.pageUrl);
  const imageUrl = escapeHtml(metadata.imageUrl);
  const imageAlt = escapeHtml(metadata.imageAlt);

  let html = indexHtml
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
    .replace(/<title>[^<]*<\/title>/, `<title>${documentTitle}</title>`);

  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`
  );
  html = replaceTag(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${pageUrl}" />`
  );
  html = replaceTag(
    html,
    /<meta itemprop="name" content="[^"]*"\s*\/>/,
    `<meta itemprop="name" content="${title}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+itemprop="description"\s+content="[^"]*"\s*\/>/,
    `<meta itemprop="description" content="${description}" />`
  );
  html = replaceTag(
    html,
    /<meta itemprop="image" content="[^"]*"\s*\/>/,
    `<meta itemprop="image" content="${imageUrl}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${pageUrl}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:type" content="[^"]*"\s*\/>/,
    '<meta property="og:type" content="article" />'
  );
  html = replaceTag(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${title}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${description}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${imageUrl}" />`
  );
  html = replaceTag(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  html = replaceTag(
    html,
    /<meta name="twitter:image" content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${imageUrl}" />`
  );

  const additionalTags = [
    '<meta name="robots" content="noindex, nofollow" />',
    '<meta property="og:site_name" content="ffwrapped" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${imageAlt}" />`,
    `<meta name="twitter:image:alt" content="${imageAlt}" />`,
  ].join("\n    ");

  return html.replace("</head>", `    ${additionalTags}\n  </head>`);
};

