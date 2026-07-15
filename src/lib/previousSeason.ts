import type { LeagueInfoType } from "@/types/types";

export type PreviousLeagueEntry =
  | LeagueInfoType
  | string
  | number
  | { season?: unknown };

export type PreviousSeasonOption = {
  season: string;
  leagueId: string;
  platform: "sleeper" | "espn";
  loadedLeague?: LeagueInfoType;
};

const getPlatform = (league: Pick<LeagueInfoType, "platform">) =>
  league.platform === "espn" ? "espn" : "sleeper";

export const isLeagueInfoEntry = (entry: unknown): entry is LeagueInfoType =>
  typeof entry === "object" &&
  entry !== null &&
  "leagueId" in entry &&
  "season" in entry;

export const getPreviousLeagueEntries = (
  league: LeagueInfoType
): PreviousLeagueEntry[] =>
  league.previousLeagues as unknown as PreviousLeagueEntry[];

export const getPreviousSeasonReference = (entry: unknown): string | null => {
  if (typeof entry === "string" || typeof entry === "number") {
    const season = String(entry).trim();
    return season ? season : null;
  }

  if (
    typeof entry === "object" &&
    entry !== null &&
    "season" in entry &&
    !("leagueId" in entry)
  ) {
    const season = String(entry.season ?? "").trim();
    return season ? season : null;
  }

  return null;
};

export const isSeasonWithoutStandings = (
  league: LeagueInfoType | undefined
) => Boolean(league && Number(league.lastScoredWeek ?? 0) <= 0);

const getImmediatelyPreviousSeason = (season: string) => {
  const numericSeason = Number(season);
  if (!Number.isInteger(numericSeason) || numericSeason <= 2019) return null;
  return String(numericSeason - 1);
};

const findLoadedPreviousSeason = (
  currentLeague: LeagueInfoType,
  previousSeason: string,
  previousLeagueId: string,
  loadedLeagues: LeagueInfoType[]
) => {
  const platform = getPlatform(currentLeague);
  return loadedLeagues.find(
    (league) =>
      getPlatform(league) === platform &&
      league.leagueId === previousLeagueId &&
      league.season === previousSeason
  );
};

export const getPreviousSeasonOption = (
  currentLeague: LeagueInfoType | undefined,
  loadedLeagues: LeagueInfoType[] = []
): PreviousSeasonOption | null => {
  if (!currentLeague) return null;

  const season = getImmediatelyPreviousSeason(currentLeague.season);
  if (!season) return null;

  const platform = getPlatform(currentLeague);
  const entries = getPreviousLeagueEntries(currentLeague);
  const embeddedLeague = entries.find(
    (entry): entry is LeagueInfoType =>
      isLeagueInfoEntry(entry) && entry.season === season
  );

  if (platform === "espn") {
    const loadedLeague = findLoadedPreviousSeason(
      currentLeague,
      season,
      currentLeague.leagueId,
      loadedLeagues
    );
    const hasSeasonReference = entries.some((entry) =>
      isLeagueInfoEntry(entry)
        ? entry.season === season
        : getPreviousSeasonReference(entry) === season
    );

    if (!loadedLeague && !embeddedLeague && !hasSeasonReference) return null;

    return {
      season,
      leagueId: currentLeague.leagueId,
      platform,
      loadedLeague: loadedLeague ?? embeddedLeague,
    };
  }

  const previousLeagueId =
    embeddedLeague?.leagueId ??
    String(currentLeague.previousLeagueId ?? "").trim();
  if (!previousLeagueId) return null;

  return {
    season,
    leagueId: previousLeagueId,
    platform,
    loadedLeague:
      findLoadedPreviousSeason(
        currentLeague,
        season,
        previousLeagueId,
        loadedLeagues
      ) ?? embeddedLeague,
  };
};
