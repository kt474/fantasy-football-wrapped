import { readFile } from "node:fs/promises";

import { ImageResponse } from "@vercel/og";

import {
  SHARED_REPORT_TOKEN_PATTERN,
  fetchSharedReportPreview,
  truncatePreviewText,
  type SharedReportPreview,
} from "./_lib/reportPreview.js";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string | Uint8Array) => void;
};

type OgChild = OgElement | string | number | null | undefined;
type OgElement = {
  type: string;
  props: Record<string, unknown> & { children?: OgChild | OgChild[] };
};

const element = (
  type: string,
  props: Record<string, unknown> | null,
  ...children: OgChild[]
): OgElement => ({
  type,
  props: {
    ...(props ?? {}),
    children: children.length <= 1 ? children[0] : children,
  },
});

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const toArrayBuffer = (buffer: Buffer) =>
  buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

const brandAssetsPromise = Promise.all([
  readFile(new URL("../server/og-assets/logo.png", import.meta.url)).then(
    toArrayBuffer
  ),
  readFile(new URL("../server/og-assets/JosefinSans.ttf", import.meta.url)).then(
    toArrayBuffer
  ),
  readFile(new URL("../server/og-assets/Inter-Regular.ttf", import.meta.url)).then(
    toArrayBuffer
  ),
  readFile(
    new URL("../server/og-assets/Inter-SemiBold.ttf", import.meta.url)
  ).then(toArrayBuffer),
]);

const buildSocialCard = (
  report: SharedReportPreview | null,
  logo: ArrayBuffer
) => {
  const leagueName = report
    ? truncatePreviewText(report.leagueName, 58)
    : "Fantasy Football Weekly";
  const weekLabel = report ? `Week ${report.week}` : "League report";
  const headline = report
    ? truncatePreviewText(report.report.frontPage.headline, 100)
    : "The story of your fantasy football week";
  const subheadline = report
    ? truncatePreviewText(report.report.frontPage.subheadline, 160)
    : "Matchups, manager decisions, standings consequences, and the moments your league will remember.";
  const headlineSize = headline.length > 82 ? 43 : headline.length > 58 ? 48 : 54;

  return element(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "28px",
        color: "#0f172a",
        background: "#f1f5f9",
        fontFamily: "Inter",
      },
    },
    element(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "34px 40px 32px",
          overflow: "hidden",
          background: "#ffffff",
          border: "1px solid #dbe3ef",
          borderRadius: "24px",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.07)",
        },
      },
      element(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          },
        },
        element(
          "div",
          { style: { display: "flex", alignItems: "center" } },
          element("img", {
            src: logo,
            alt: "",
            style: {
              width: "44px",
              height: "44px",
              objectFit: "contain",
            },
          }),
          element(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "baseline",
                marginLeft: "12px",
                fontFamily: "Josefin Sans",
                fontSize: "28px",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              },
            },
            element("span", { style: { color: "#2563eb" } }, "ff"),
            "wrapped"
          )
        ),
        element(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              color: "#475569",
              fontSize: "16px",
              fontWeight: 500,
            },
          },
          element(
            "div",
            {
              style: {
                display: "flex",
                maxWidth: "420px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              },
            },
            leagueName
          ),
          element(
            "div",
            {
              style: {
                display: "flex",
                marginLeft: "14px",
                padding: "7px 13px 6px",
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "999px",
                fontSize: "15px",
                fontWeight: 600,
              },
            },
            weekLabel
          )
        )
      ),
      element("div", {
        style: {
          width: "100%",
          height: "1px",
          marginTop: "20px",
          background: "#e2e8f0",
        },
      }),
      element(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            padding: "18px 0 42px",
          },
        },
        element(
          "div",
          {
            style: {
              display: "flex",
              color: "#2563eb",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            },
          },
          report ? "Weekly league report" : "Personalized league analysis"
        ),
        element(
          "div",
          {
            style: {
              display: "flex",
              maxWidth: "1030px",
              marginTop: "11px",
              color: "#0f172a",
              fontSize: `${headlineSize}px`,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
            },
          },
          headline
        ),
        element(
          "div",
          {
            style: {
              display: "flex",
              maxWidth: "1010px",
              marginTop: "14px",
              color: "#64748b",
              fontSize: "21px",
              fontWeight: 400,
              lineHeight: 1.35,
            },
          },
          subheadline
        )
      )
    )
  );
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.end("Method not allowed");
    return;
  }

  const token = String(getQueryValue(req.query?.token) ?? "").trim();
  const report = SHARED_REPORT_TOKEN_PATTERN.test(token)
    ? await fetchSharedReportPreview(token).catch(() => null)
    : null;
  const [logo, josefinSans, interRegular, interSemiBold] =
    await brandAssetsPromise;
  const imageResponse = new ImageResponse(
    buildSocialCard(report, logo) as unknown as ConstructorParameters<
      typeof ImageResponse
    >[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: interRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: interSemiBold,
          weight: 600,
          style: "normal",
        },
        {
          name: "Josefin Sans",
          data: josefinSans,
          weight: 600,
          style: "normal",
        },
      ],
    }
  );
  const image = Buffer.from(await imageResponse.arrayBuffer());

  res.statusCode = 200;
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", String(image.byteLength));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Cache-Control",
    report
      ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      : "public, max-age=300, s-maxage=300"
  );
  res.end(req.method === "HEAD" ? undefined : image);
}
