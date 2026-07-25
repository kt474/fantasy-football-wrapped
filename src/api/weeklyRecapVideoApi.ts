import { authenticatedFetch } from "@/lib/authFetch";
import { getBackendApiUrl } from "@/lib/backendApi";
import { assertOk, parseJson } from "@/lib/http";
import type {
  WeeklyRecapVideoJob,
  WeeklyRecapVideoProps,
} from "@/types/types";

export const startWeeklyRecapVideo = async (
  inputProps: WeeklyRecapVideoProps
): Promise<WeeklyRecapVideoJob> => {
  const response = await authenticatedFetch(
    getBackendApiUrl("/api/reportVideo"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputProps }),
    }
  );
  assertOk(response, "Weekly recap video request");
  return parseJson<WeeklyRecapVideoJob>(
    response,
    "Weekly recap video request"
  );
};

export const getWeeklyRecapVideo = async (
  jobId: string
): Promise<WeeklyRecapVideoJob> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/reportVideo"), origin);
  endpoint.searchParams.set("jobId", jobId);

  const response = await authenticatedFetch(endpoint);
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
  inputHash: string
): Promise<WeeklyRecapVideoJob | null> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/reportVideo"), origin);
  endpoint.searchParams.set("leagueId", leagueId);
  endpoint.searchParams.set("season", season);
  endpoint.searchParams.set("week", String(week));
  endpoint.searchParams.set("inputHash", inputHash);

  const response = await authenticatedFetch(endpoint);
  if (response.status === 404) {
    return null;
  }

  assertOk(response, "Latest weekly recap video");
  return parseJson<WeeklyRecapVideoJob>(
    response,
    "Latest weekly recap video"
  );
};
