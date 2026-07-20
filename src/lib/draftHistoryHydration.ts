import type { DraftPick } from "@/types/apiTypes";
import type { LeagueInfoType } from "@/types/types";

type DraftMetadataLoader = (
  draftId: string
) => Promise<Record<string, unknown>>;

type DraftPicksLoader = (
  draftId: string,
  season: string,
  scoringType: number,
  seasonType: string,
  draftType?: string
) => Promise<DraftPick[]>;

export const createHistoricalDraftHydrator = ({
  loadMetadata,
  loadPicks,
}: {
  loadMetadata: DraftMetadataLoader;
  loadPicks: DraftPicksLoader;
}) => {
  const attemptedDrafts = new Set<string>();
  const inFlightDrafts = new Map<string, Promise<void>>();

  return async (league: LeagueInfoType) => {
    if (
      league.platform === "espn" ||
      !league.draftId ||
      league.draftPicks?.length
    ) {
      return;
    }

    const draftKey = `${league.leagueId}:${league.season}:${league.draftId}`;
    const inFlight = inFlightDrafts.get(draftKey);
    if (inFlight) return inFlight;
    if (attemptedDrafts.has(draftKey)) return;

    const hydration = (async () => {
      attemptedDrafts.add(draftKey);

      try {
        let draftType = league.draftMetadata?.draftType;
        if (!draftType) {
          const metadata = await loadMetadata(league.draftId);
          draftType =
            typeof metadata.type === "string" ? metadata.type : undefined;
        }

        const draftPicks = await loadPicks(
          league.draftId,
          league.season,
          league.scoringType,
          league.seasonType,
          draftType
        );

        // Set picks before metadata so reactive consumers immediately satisfy
        // the existing-data guard if either assignment schedules a refresh.
        league.draftPicks = draftPicks;
        league.draftMetadata = {
          order: league.draftMetadata?.order ?? [],
          roundReversal: league.draftMetadata?.roundReversal ?? 0,
          draftType: draftType ?? "snake",
        };
      } catch (error) {
        attemptedDrafts.delete(draftKey);
        throw error;
      }
    })();

    inFlightDrafts.set(draftKey, hydration);
    try {
      await hydration;
    } finally {
      inFlightDrafts.delete(draftKey);
    }
  };
};
