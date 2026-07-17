import {
  isRequestCancellation,
  throwIfRequestAborted,
} from "@/lib/request";
import { mapWithConcurrency } from "@/lib/async";

export type HistoryPlatform = "sleeper" | "espn";

export type HistoryCandidate = {
  key: string;
  leagueId: string;
  season: string;
  platform: HistoryPlatform;
};

export type HistoryLoadFailure = HistoryCandidate & {
  message: string;
};

export type HistoryLoadStatus = {
  leagueKey: string;
  loading: boolean;
  settled: boolean;
  complete: boolean;
  loaded: number;
  total: number | null;
  loadingSeason: string;
  failures: HistoryLoadFailure[];
};

type LoadCandidatesOptions<T> = {
  candidates: HistoryCandidate[];
  fetchCandidate: (
    candidate: HistoryCandidate,
    signal?: AbortSignal
  ) => Promise<T>;
  isValid: (value: T) => boolean;
  onLoaded: (value: T, candidate: HistoryCandidate) => void;
  getErrorMessage: (error: unknown) => string;
  onStart?: (candidate: HistoryCandidate) => void;
  signal?: AbortSignal;
  concurrency?: number;
};

export const loadHistoryCandidates = async <T>({
  candidates,
  fetchCandidate,
  isValid,
  onLoaded,
  getErrorMessage,
  onStart,
  signal,
  concurrency = 1,
}: LoadCandidatesOptions<T>) => {
  const outcomes = await mapWithConcurrency(
    candidates,
    concurrency,
    async (candidate) => {
      throwIfRequestAborted(signal);
      onStart?.(candidate);

      try {
        const value = await fetchCandidate(candidate, signal);
        throwIfRequestAborted(signal);
        if (!isValid(value)) {
          throw new Error(
            `No completed data was returned for ${candidate.season}.`
          );
        }
        onLoaded(value, candidate);
        return { loaded: true as const, failure: null };
      } catch (error) {
        if (isRequestCancellation(error) || signal?.aborted) throw error;
        return {
          loaded: false as const,
          failure: {
            ...candidate,
            message: getErrorMessage(error),
          } satisfies HistoryLoadFailure,
        };
      }
    }
  );

  return {
    loaded: outcomes.filter((outcome) => outcome.loaded).length,
    failures: outcomes.flatMap((outcome) =>
      outcome.failure ? [outcome.failure] : []
    ),
  };
};

type LinkedLeague = {
  leagueId: string;
  season: string;
  previousLeagueId: string | null;
};

type LoadLinkedHistoryOptions<T extends LinkedLeague> = {
  initialCandidate: HistoryCandidate;
  fetchLeague: (leagueId: string, signal?: AbortSignal) => Promise<T>;
  isValid: (value: T) => boolean;
  onLoaded: (value: T, candidate: HistoryCandidate) => void;
  getErrorMessage: (error: unknown) => string;
  onStart?: (candidate: HistoryCandidate) => void;
  signal?: AbortSignal;
};

export const loadLinkedHistory = async <T extends LinkedLeague>({
  initialCandidate,
  fetchLeague,
  isValid,
  onLoaded,
  getErrorMessage,
  onStart,
  signal,
}: LoadLinkedHistoryOptions<T>) => {
  const successes: HistoryCandidate[] = [];
  const seenLeagueIds = new Set<string>();
  let candidate = initialCandidate;

  while (candidate.leagueId && candidate.leagueId !== "0") {
    throwIfRequestAborted(signal);
    if (seenLeagueIds.has(candidate.leagueId)) break;
    seenLeagueIds.add(candidate.leagueId);
    onStart?.(candidate);

    try {
      const league = await fetchLeague(candidate.leagueId, signal);
      throwIfRequestAborted(signal);
      const resolvedCandidate = {
        ...candidate,
        key: `${candidate.platform}:${league.leagueId}:${league.season}`,
        leagueId: league.leagueId,
        season: league.season,
      };

      if (isValid(league)) {
        onLoaded(league, resolvedCandidate);
        successes.push(resolvedCandidate);
      }

      if (!league.previousLeagueId) break;

      const nextSeason = Number.isInteger(Number(league.season))
        ? String(Number(league.season) - 1)
        : "";
      candidate = {
        key: `${candidate.platform}:${league.previousLeagueId}:${nextSeason}`,
        leagueId: league.previousLeagueId,
        season: nextSeason,
        platform: candidate.platform,
      };
    } catch (error) {
      if (isRequestCancellation(error) || signal?.aborted) throw error;
      return {
        loaded: successes.length,
        failures: [
          {
            ...candidate,
            message: getErrorMessage(error),
          },
        ],
      };
    }
  }

  return { loaded: successes.length, failures: [] };
};
