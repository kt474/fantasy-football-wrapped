import { assertOk, parseJson } from "@/lib/http";
import { normalizePremiumReport } from "@/lib/premiumReport";
import type { PremiumReport } from "@/types/types";
import { fetchAiReport } from "./aiRequest";

export const generateTrends = async (
  data: Record<string, unknown>[],
  wordLimit: number,
  bulletCount: number,
  leagueState: string = "in_season"
): Promise<{ bulletPoints: string[] }> => {
  const response = await fetchAiReport(import.meta.env.VITE_TRENDS_RECAP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data,
      wordLimit,
      bulletCount,
      leagueState,
    }),
  });
  assertOk(response, "Trends generation request");

  const result = await parseJson<unknown>(response, "Trends generation");
  if (
    typeof result !== "object" ||
    result === null ||
    !("bulletPoints" in result) ||
    !Array.isArray(result.bulletPoints) ||
    !result.bulletPoints.every((bulletPoint) => typeof bulletPoint === "string")
  ) {
    throw new Error("Trends generation returned an invalid response");
  }

  return { bulletPoints: result.bulletPoints };
};

export const generateSummary = async (
  prompt: Record<string, unknown>[],
  metadata: Record<string, unknown>
): Promise<Record<string, string>> => {
  try {
    const response = await fetchAiReport(import.meta.env.VITE_LEAGUE_RECAP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          leagueMetadata: metadata,
          teamData: prompt,
        },
      }),
    });
    assertOk(response, "League summary request");
    return await parseJson<Record<string, string>>(response, "League summary");
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
    };
  }
};

export const generateReport = async (
  prompt: Record<string, unknown>[],
  metadata: Record<string, unknown>,
  leagueId: string,
  currentWeek: number,
  season: string
): Promise<Record<string, string>> => {
  try {
    const response = await fetchAiReport(import.meta.env.VITE_WEEKLY_REPORT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          leagueMetadata: metadata,
          matchups: prompt,
        },
        leagueId: leagueId,
        currentWeek: currentWeek,
        season: season,
      }),
    });
    assertOk(response, "Weekly report request");
    return await parseJson<Record<string, string>>(response, "Weekly report");
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate report. Please try again later.",
    };
  }
};

export const generatePremiumReport = async (
  prompt: Record<string, unknown>[],
  metadata: Record<string, unknown>,
  style: string
): Promise<{ report?: PremiumReport; text?: string }> => {
  try {
    const response = await fetchAiReport(
      import.meta.env.VITE_PREMIUM_WEEKLY_REPORT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            leagueMetadata: metadata,
            matchups: prompt,
          },
          commentaryStyle: style,
        }),
      },
      true
    );
    if (response.status === 401) {
      throw new Error("Please sign in to use premium reports.");
    }
    assertOk(response, "Premium report request");
    const payload = await parseJson<{ report?: unknown; text?: string }>(
      response,
      "Premium report"
    );
    if (payload.report == null && payload.text) {
      return { text: payload.text };
    }
    const report = normalizePremiumReport(payload.report);
    if (!report) {
      throw new Error("Premium report response was invalid.");
    }
    return { report };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to generate report.";
    if (message.includes("Please sign in")) {
      return {
        text: "Please sign in to use premium reports.",
      };
    }
    return {
      text: "Unable to generate premium report right now. Please try again later.",
    };
  }
};

export const generatePreview = async (
  prompt: Record<string, unknown>
): Promise<Record<string, string>> => {
  try {
    const response = await fetchAiReport(import.meta.env.VITE_WEEKLY_PREVIEW, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: prompt,
      }),
    });
    assertOk(response, "Weekly preview request");
    return await parseJson<Record<string, string>>(response, "Weekly preview");
  } catch (error) {
    console.error("Error:", error);
    return {
      text: "Unable to generate preview. Please try again later.",
    };
  }
};
