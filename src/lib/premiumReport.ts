import { getManagerDisplayName } from "@/lib/manager";
import type {
  PremiumReport,
  PremiumReportTeamIdentity,
  TableDataType,
} from "@/types/types";

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

const normalizeTeamName = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");

export function addPremiumReportTeamAvatars({
  report,
  tableData,
  weekIndex,
  showUsernames,
}: {
  report: PremiumReport;
  tableData: TableDataType[];
  weekIndex: number;
  showUsernames: boolean;
}): PremiumReport {
  const identities = tableData.map((team) => ({
    team,
    identity: {
      teamName: getManagerDisplayName(team, showUsernames),
      ...(team.avatarImg ? { avatarUrl: team.avatarImg } : {}),
    } satisfies PremiumReportTeamIdentity,
  }));
  const identitiesByName = new Map<string, PremiumReportTeamIdentity>();

  identities.forEach(({ team, identity }) => {
    [identity.teamName, team.name, team.username].forEach((name) => {
      if (name?.trim()) {
        identitiesByName.set(normalizeTeamName(name), identity);
      }
    });
  });

  const getIdentity = (teamName: string) =>
    identitiesByName.get(normalizeTeamName(teamName));
  const matchupIds = tableData.reduce<Array<number | null>>((result, team) => {
    const matchupId = team.matchups[weekIndex];
    if (matchupId != null && !result.includes(matchupId)) {
      result.push(matchupId);
    }
    return result;
  }, []);

  return {
    ...report,
    matchupReports: report.matchupReports.map((matchup) => {
      const matchupId =
        matchupIds[matchup.matchupNumber - 1] ?? matchup.matchupNumber;
      const teams = identities
        .filter(({ team }) => team.matchups[weekIndex] === matchupId)
        .sort(
          (a, b) =>
            (b.team.points[weekIndex] ?? 0) - (a.team.points[weekIndex] ?? 0)
        )
        .map(({ identity }) => identity);

      return {
        ...matchup,
        ...(teams.length > 0 ? { teams } : {}),
      };
    }),
    teamOfTheWeek: (() => {
      const identity = getIdentity(report.teamOfTheWeek.teamName);
      return {
        ...report.teamOfTheWeek,
        ...(identity?.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
      };
    })(),
    weeklyLowlights: {
      ...report.weeklyLowlights,
      entries: report.weeklyLowlights.entries.map((entry) => {
        const identity = getIdentity(entry.teamName);
        return {
          ...entry,
          ...(identity?.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
        };
      }),
    },
  };
}
