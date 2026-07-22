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
    const hasDraftPicks = Boolean(league.draftPicks?.length);
    const needsAuctionBudget =
      league.draftMetadata?.draftType === "auction" &&
      league.draftMetadata.auctionBudget == null;
    if (
      league.platform === "espn" ||
      !league.draftId ||
      (hasDraftPicks && !needsAuctionBudget)
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
        let auctionBudget = league.draftMetadata?.auctionBudget;
        if (!draftType || needsAuctionBudget) {
          const metadata = await loadMetadata(league.draftId);
          if (typeof metadata.type === "string") draftType = metadata.type;
          const settings =
            typeof metadata.settings === "object" && metadata.settings !== null
              ? (metadata.settings as Record<string, unknown>)
              : undefined;
          const loadedBudget = Number(settings?.budget);
          if (Number.isFinite(loadedBudget) && loadedBudget > 0) {
            auctionBudget = loadedBudget;
          }
        }

        const draftPicks = hasDraftPicks
          ? (league.draftPicks ?? [])
          : await loadPicks(
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
          auctionBudget,
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
