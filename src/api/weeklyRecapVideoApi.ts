import { authenticatedFetch } from "@/lib/authFetch";
import { getBackendApiUrl } from "@/lib/backendApi";
import { assertOk, parseJson } from "@/lib/http";
import {
  runWithRequestTimeout,
  type RequestOptions,
} from "@/lib/request";
import type {
  WeeklyRecapVideoJob,
  WeeklyRecapVideoProps,
} from "@/types/types";

export const startWeeklyRecapVideo = async (
  inputProps: WeeklyRecapVideoProps,
  options: RequestOptions = {}
): Promise<WeeklyRecapVideoJob> => {
  const response = await runWithRequestTimeout(
    (signal) =>
      authenticatedFetch(getBackendApiUrl("/api/reportVideo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputProps }),
        signal,
      }),
    options
  );
  assertOk(response, "Weekly recap video request");
  return parseJson<WeeklyRecapVideoJob>(
    response,
    "Weekly recap video request"
  );
};

export const getWeeklyRecapVideo = async (
  jobId: string,
  options: RequestOptions = {}
): Promise<WeeklyRecapVideoJob> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/reportVideo"), origin);
  endpoint.searchParams.set("jobId", jobId);

  const response = await runWithRequestTimeout(
    (signal) => authenticatedFetch(endpoint, { signal }),
    options
  );
  assertOk(response, "Weekly recap video status");
  return parseJson<WeeklyRecapVideoJob>(
    response,
    "Weekly recap video status"
  );
};

export const getLatestWeeklyRecapVideo = async (
  leagueId: string,
  season: string,
  week: number,
  inputHash: string,
  options: RequestOptions = {}
): Promise<WeeklyRecapVideoJob | null> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/reportVideo"), origin);
  endpoint.searchParams.set("leagueId", leagueId);
  endpoint.searchParams.set("season", season);
  endpoint.searchParams.set("week", String(week));
  endpoint.searchParams.set("inputHash", inputHash);

  const response = await runWithRequestTimeout(
    (signal) => authenticatedFetch(endpoint, { signal }),
    options
  );
  if (response.status === 404) {
    return null;
  }

  assertOk(response, "Latest weekly recap video");
  return parseJson<WeeklyRecapVideoJob>(
    response,
    "Latest weekly recap video"
  );
};
