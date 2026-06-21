import { mapWithConcurrency } from "@/lib/async";

export type LoadedLeague<T> = {
  leagueId: string;
  league: T;
};

export type FailedLeague = {
  leagueId: string;
  error: unknown;
};

export const loadUserLeagues = async <T>(
  leagueIds: string[],
  loader: (leagueId: string) => Promise<T>,
  concurrency = 2
) => {
  const settledResults = await mapWithConcurrency(
    leagueIds,
    concurrency,
    async (leagueId) => {
      try {
        return {
          status: "fulfilled" as const,
          value: {
            leagueId,
            league: await loader(leagueId),
          },
        };
      } catch (reason) {
        return {
          status: "rejected" as const,
          reason,
        };
      }
    }
  );

  const loaded: LoadedLeague<T>[] = [];
  const failed: FailedLeague[] = [];

  settledResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      loaded.push(result.value);
      return;
    }

    failed.push({
      leagueId: leagueIds[index],
      error: result.reason,
    });
  });

  return { loaded, failed };
};
