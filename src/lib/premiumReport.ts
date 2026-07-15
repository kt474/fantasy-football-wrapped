import type { PremiumReport } from "@/types/types";

export function normalizePremiumReport(value: unknown): PremiumReport | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<PremiumReport>;

  if (
    !candidate.frontPage ||
    !Array.isArray(candidate.matchupReports) ||
    !candidate.teamOfTheWeek ||
    !candidate.weeklyLowlights ||
    !Array.isArray(candidate.weeklyLowlights.entries)
  ) {
    return null;
  }

  return candidate as PremiumReport;
}
