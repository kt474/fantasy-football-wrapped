import { getData } from "@/api/api";
import {
  getEspnErrorMessage,
  getEspnLeagueInfo,
  getSavedEspnAuth,
} from "@/api/espnApi";
import {
  loadHistoryCandidates,
  loadLinkedHistory,
  type HistoryCandidate,
  type HistoryLoadFailure,
} from "@/lib/historyLoad";
import { hasLeagueSeasonData } from "@/lib/leagueHistory";
import {
  getPreviousLeagueEntries,
  getPreviousSeasonReference,
  isLeagueInfoEntry,
  reconcileEspnPreviousLeagueEntries,
  type PreviousLeagueEntry,
} from "@/lib/previousSeason";
import { getLeagueLoadErrorMessage } from "@/lib/request";
import type { LeagueInfoType } from "@/types/types";

export const getLeagueHistoryKey = ({
  leagueId,
  season,
  platform,
}: Partial<Pick<LeagueInfoType, "leagueId" | "season" | "platform">>) =>
  `${platform ?? "unknown"}:${leagueId ?? ""}:${season ?? ""}`;

export const getLoadedHistoryCount = (league: LeagueInfoType) =>
  getPreviousLeagueEntries(league).filter(
    (entry) => isLeagueInfoEntry(entry) && hasLeagueSeasonData(entry)
  ).length;

const replacePreviousLeagueEntries = (
  league: LeagueInfoType,
  leagues: PreviousLeagueEntry[]
) => {
  const entries = getPreviousLeagueEntries(league);
  entries.splice(0, entries.length, ...leagues);
};

const dedupePreviousLeagues = (league: LeagueInfoType) => {
  const seenEntries = new Set<string>();
  const uniqueEntries = getPreviousLeagueEntries(league).filter((entry) => {
    if (isLeagueInfoEntry(entry)) {
      if (!hasLeagueSeasonData(entry)) return false;

      const leagueKey = getLeagueHistoryKey(entry);
      if (
        leagueKey === getLeagueHistoryKey(league) ||
        seenEntries.has(leagueKey)
      ) {
        return false;
      }

      seenEntries.add(leagueKey);
      return true;
    }

    const season = getPreviousSeasonReference(entry);
    if (!season || season === league.season || seenEntries.has(season)) {
      return false;
    }

    seenEntries.add(season);
    return true;
  });

  if (uniqueEntries.length !== getPreviousLeagueEntries(league).length) {
    replacePreviousLeagueEntries(league, uniqueEntries);
  }
};

const getFirstUnloadedSleeperCandidate = (
  league: LeagueInfoType
): HistoryCandidate | null => {
  const loadedLeagues =
    getPreviousLeagueEntries(league).filter(isLeagueInfoEntry);
  const seen = new Set<string>();
  let leagueId = league.previousLeagueId;
  let season = Number.isInteger(Number(league.season))
    ? String(Number(league.season) - 1)
    : "";

  while (leagueId && leagueId !== "0" && !seen.has(leagueId)) {
    seen.add(leagueId);
    const loadedLeague = loadedLeagues.find(
      (previousLeague) => previousLeague.leagueId === leagueId
    );
    if (!loadedLeague) {
      return {
        key: `sleeper:${leagueId}:${season}`,
        leagueId,
        season,
        platform: "sleeper",
      };
    }
    leagueId = loadedLeague.previousLeagueId;
    season = Number.isInteger(Number(loadedLeague.season))
      ? String(Number(loadedLeague.season) - 1)
      : "";
  }

  return null;
};

const getEspnCandidates = (
  league: LeagueInfoType,
  failures?: HistoryLoadFailure[]
): HistoryCandidate[] => {
  if (failures) {
    return failures.map(({ message: _message, ...failure }) => failure);
  }

  const loadedSeasons = new Set(
    getPreviousLeagueEntries(league)
      .filter(isLeagueInfoEntry)
      .map((entry) => entry.season)
  );

  return [
    ...new Set(
      getPreviousLeagueEntries(league)
        .map(getPreviousSeasonReference)
        .filter((season): season is string => Boolean(season))
        .filter(
          (season) => Number(season) >= 2019 && !loadedSeasons.has(season)
        )
    ),
  ]
    .sort((left, right) => Number(right) - Number(left))
    .map((season) => ({
      key: `espn:${league.leagueId}:${season}`,
      leagueId: league.leagueId,
      season,
      platform: "espn" as const,
    }));
};

export type LeagueHistoryLoadResult = {
  failures: HistoryLoadFailure[];
  total: number | null;
};

export const loadPreviousLeagueHistory = async (
  league: LeagueInfoType,
  {
    signal,
    retryFailures,
    onLoadingSeason,
  }: {
    signal: AbortSignal;
    retryFailures?: HistoryLoadFailure[];
    onLoadingSeason?: (season: string) => void;
  }
): Promise<LeagueHistoryLoadResult> => {
  dedupePreviousLeagues(league);

  if (league.platform === "espn") {
    const candidates = getEspnCandidates(league, retryFailures);
    const resolvedLeagues =
      getPreviousLeagueEntries(league).filter(isLeagueInfoEntry);
    const result = await loadHistoryCandidates({
      candidates,
      signal,
      fetchCandidate: (candidate, requestSignal) =>
        getEspnLeagueInfo(
          candidate.season,
          league.leagueId,
          getSavedEspnAuth(league.season, league.leagueId),
          { signal: requestSignal }
        ),
      isValid: hasLeagueSeasonData,
      onStart: ({ season }) => onLoadingSeason?.(season),
      onLoaded: (loadedLeague) => resolvedLeagues.push(loadedLeague),
      getErrorMessage: getEspnErrorMessage,
      concurrency: 2,
    });

    replacePreviousLeagueEntries(
      league,
      reconcileEspnPreviousLeagueEntries(
        getPreviousLeagueEntries(league),
        resolvedLeagues,
        candidates,
        result.failures
      )
    );
    dedupePreviousLeagues(league);
    return {
      failures: result.failures,
      total: getLoadedHistoryCount(league) + result.failures.length,
    };
  }

  const candidate =
    retryFailures?.[0] ?? getFirstUnloadedSleeperCandidate(league);
  if (!candidate) {
    return { failures: [], total: getLoadedHistoryCount(league) };
  }

  const result = await loadLinkedHistory({
    initialCandidate: candidate,
    signal,
    fetchLeague: (leagueId, requestSignal) =>
      getData(leagueId, { signal: requestSignal }),
    isValid: hasLeagueSeasonData,
    onStart: ({ season }) => onLoadingSeason?.(season),
    onLoaded: (loadedLeague) => {
      getPreviousLeagueEntries(league).push(loadedLeague);
      dedupePreviousLeagues(league);
    },
    getErrorMessage: (error) => getLeagueLoadErrorMessage(error, "sleeper"),
  });

  return {
    failures: result.failures,
    total:
      result.failures.length === 0 ? getLoadedHistoryCount(league) : null,
  };
};
