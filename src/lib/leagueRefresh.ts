import { getData } from "@/api/api";
import {
  getEspnLeagueInfo,
  getSavedEspnAuth,
} from "@/api/espnApi";
import {
  getPreviousSeasonReference,
  isLeagueInfoEntry,
  type PreviousLeagueEntry,
} from "@/lib/previousSeason";
import type { LeagueInfoType } from "@/types/types";

import { throwIfRequestAborted } from "./request";

type LeagueRefreshDependencies = {
  getSleeperLeague: typeof getData;
  getEspnLeague: typeof getEspnLeagueInfo;
  getEspnAuth: typeof getSavedEspnAuth;
};

const defaultDependencies: LeagueRefreshDependencies = {
  getSleeperLeague: getData,
  getEspnLeague: getEspnLeagueInfo,
  getEspnAuth: getSavedEspnAuth,
};

const getHistoryEntries = (league: LeagueInfoType): PreviousLeagueEntry[] =>
  Array.isArray(league.previousLeagues)
    ? (league.previousLeagues as unknown as PreviousLeagueEntry[])
    : [];

const getHistorySeason = (entry: PreviousLeagueEntry) =>
  isLeagueInfoEntry(entry)
    ? String(entry.season ?? "").trim()
    : getPreviousSeasonReference(entry);

/** Keeps expanded historical seasons while accepting new season references. */
export const preserveRefreshedLeagueHistory = (
  existingLeague: LeagueInfoType,
  refreshedLeague: LeagueInfoType
): LeagueInfoType => {
  const existingEntries = getHistoryEntries(existingLeague);
  if (existingEntries.length === 0) return refreshedLeague;

  const refreshedEntries = getHistoryEntries(refreshedLeague);
  const existingLoadedBySeason = new Map(
    existingEntries
      .filter(isLeagueInfoEntry)
      .map((entry) => [String(entry.season), entry] as const)
  );
  const mergedEntries: PreviousLeagueEntry[] = [];
  const seenSeasons = new Set<string>();

  const append = (entry: PreviousLeagueEntry) => {
    const season = getHistorySeason(entry);
    if (season && seenSeasons.has(season)) return;
    if (season) seenSeasons.add(season);
    mergedEntries.push(entry);
  };

  refreshedEntries.forEach((entry) => {
    const season = getHistorySeason(entry);
    const loadedEntry = season ? existingLoadedBySeason.get(season) : undefined;
    append(!isLeagueInfoEntry(entry) && loadedEntry ? loadedEntry : entry);
  });
  existingEntries.forEach(append);

  const historyIsUnchanged =
    mergedEntries.length === refreshedEntries.length &&
    mergedEntries.every((entry, index) => entry === refreshedEntries[index]);
  if (historyIsUnchanged) return refreshedLeague;

  return {
    ...refreshedLeague,
    previousLeagues: mergedEntries as LeagueInfoType[],
  };
};

/** Fetches and prepares a replacement before exposing any state mutation. */
export const refreshLeagueAtomically = async (
  league: LeagueInfoType,
  commit: (refreshedLeague: LeagueInfoType) => void,
  overrides: Partial<LeagueRefreshDependencies> = {},
  signal?: AbortSignal
) => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const fetchedLeague =
    league.platform === "espn"
      ? await dependencies.getEspnLeague(
          league.season,
          league.leagueId,
          dependencies.getEspnAuth(league.season, league.leagueId),
          { signal }
        )
      : await dependencies.getSleeperLeague(league.leagueId, { signal });

  throwIfRequestAborted(signal);
  const refreshedLeague = preserveRefreshedLeagueHistory(league, fetchedLeague);
  commit(refreshedLeague);
  return refreshedLeague;
};
