import { authenticatedFetch } from "@/lib/authFetch";
import { getBackendApiUrl } from "@/lib/backendApi";
import { assertOk, parseJson } from "@/lib/http";
import { normalizePremiumReport } from "@/lib/premiumReport";
import {
  runWithRequestTimeout,
  type RequestOptions,
} from "@/lib/request";
import type { PremiumReport } from "@/types/types";

export type SharedReportResponse = {
  leagueId?: string | null;
  platform?: "sleeper" | "espn" | null;
  leagueName: string;
  season: string;
  week: number;
  report: PremiumReport;
  createdAt: string;
};

export type ShareReportPayload = {
  leagueId: string;
  platform: "sleeper" | "espn";
  leagueName: string;
  season: string;
  week: number;
  report: PremiumReport;
};

export const sharePremiumReport = async (
  payload: ShareReportPayload,
  options: RequestOptions = {}
): Promise<{ token: string; url: string }> => {
  const response = await runWithRequestTimeout(
    (signal) =>
      authenticatedFetch(getBackendApiUrl("/api/shareReport"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      }),
    options
  );

  assertOk(response, "Share report request");
  return await parseJson<{ token: string; url: string }>(
    response,
    "Share report"
  );
};

export const getSharedReport = async (
  token: string,
  options: RequestOptions = {}
): Promise<SharedReportResponse | null> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/getSharedReport"), origin);
  endpoint.searchParams.set("token", token);

  const response = await runWithRequestTimeout(
    (signal) => fetch(endpoint, { signal }),
    options
  );
  if (response.status === 404) {
    return null;
  }

  assertOk(response, "Shared report request");
  const sharedReport = await parseJson<
    Omit<SharedReportResponse, "report"> & { report: unknown }
  >(response, "Shared report");
  const report = normalizePremiumReport(sharedReport.report);

  return report ? { ...sharedReport, report } : null;
};
