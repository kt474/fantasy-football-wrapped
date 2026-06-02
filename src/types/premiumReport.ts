export interface PremiumLeagueReportSection {
  title: string;
  kicker: string;
  body: string;
}

export interface PremiumLeagueReport {
  eyebrow?: string;
  headline: string;
  intro: string;
  sections: PremiumLeagueReportSection[];
  shareCaption: string;
}

export interface PremiumReportResponse {
  text?: string;
  report?: PremiumLeagueReport;
}

const isReportSection = (value: unknown): value is PremiumLeagueReportSection => {
  if (!value || typeof value !== "object") return false;
  const section = value as Record<string, unknown>;
  return (
    typeof section.title === "string" &&
    typeof section.kicker === "string" &&
    typeof section.body === "string"
  );
};

export const isPremiumLeagueReport = (
  value: unknown
): value is PremiumLeagueReport => {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    (report.eyebrow === undefined || typeof report.eyebrow === "string") &&
    typeof report.headline === "string" &&
    typeof report.intro === "string" &&
    Array.isArray(report.sections) &&
    report.sections.every(isReportSection) &&
    typeof report.shareCaption === "string"
  );
};

export const parsePremiumLeagueReport = (
  rawReport: string
): PremiumLeagueReport | null => {
  if (!rawReport.trim()) return null;

  try {
    const parsed = JSON.parse(rawReport) as unknown;
    if (isPremiumLeagueReport(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      "report" in parsed &&
      isPremiumLeagueReport((parsed as { report?: unknown }).report)
    ) {
      return (parsed as { report: PremiumLeagueReport }).report;
    }
  } catch {
    return null;
  }

  return null;
};

export const formatPremiumLeagueReport = (
  report: PremiumLeagueReport
): string => {
  const sections = report.sections
    .map(
      (section) =>
        `${section.title}\n${section.kicker}\n${section.body}`.trim()
    )
    .join("\n\n");

  return [
    report.eyebrow,
    report.headline,
    report.intro,
    sections,
    `Share caption: ${report.shareCaption}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};
