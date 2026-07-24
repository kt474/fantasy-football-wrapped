import { getPlayersByIdsMap } from "@/api/api";
import {
  getDraftProjections,
  getStats,
  getTradedPicks,
  type SleeperTradedPick,
} from "@/api/sleeperApi";
import {
  getPlayerValues,
  type PlayerValuesResponse,
  type TradeValueRequestPayload,
} from "@/api/tradeValuesApi";
import {
  type DynastyPerspective,
  type TradeFinderPlayer,
  type TradeFinderRoster,
  type TradeValuationMode,
} from "@/lib/tradeFinder";
import { mapWithConcurrency } from "@/lib/async";
import type { Player } from "@/types/apiTypes";
import type { LeagueInfoType, TableDataType } from "@/types/types";

export type LeagueTradeValueRoster = TradeFinderRoster;

export type LeaguePlayerValuesResult = PlayerValuesResponse & {
  rosters: LeagueTradeValueRoster[];
  request: TradeValueRequestPayload;
};

export type DynastyDraftPickAsset = {
  id: string;
  season: number;
  round: number;
  originalRosterId: number;
  ownerRosterId: number;
  label: string;
};

export const isDynastyLeague = (league?: LeagueInfoType | null) =>
  league?.seasonType?.toLowerCase() === "dynasty";

export const getTradeValuationMode = (
  league?: LeagueInfoType | null
): TradeValuationMode =>
  isDynastyLeague(league)
    ? "dynasty"
    : league?.status === "complete"
      ? "season results"
      : "ros projection";

export const buildDynastyDraftPickAssets = ({
  league,
  rosters,
  tradedPicks,
}: {
  league: LeagueInfoType;
  rosters: Array<{ id: number; managerName: string }>;
  tradedPicks: SleeperTradedPick[];
}): DynastyDraftPickAsset[] => {
  const leagueSeason = Number(league.season) || new Date().getFullYear();
  const firstPickSeason = ["pre_draft", "drafting"].includes(league.status)
    ? leagueSeason
    : leagueSeason + 1;
  const seasons = Array.from(
    new Set([
      firstPickSeason,
      firstPickSeason + 1,
      firstPickSeason + 2,
      ...tradedPicks
        .map((pick) => Number(pick.season))
        .filter((season) => season >= firstPickSeason),
    ])
  ).sort((a, b) => a - b);
  const rookieDraftPickCount = league.draftPicks?.length ?? 0;
  const recentDraftRounds =
    rookieDraftPickCount > 0 &&
    rookieDraftPickCount <= Math.max(1, league.totalRosters) * 8
      ? Math.max(
          ...(league.draftPicks ?? []).map((pick) => Number(pick.round) || 0)
        )
      : 0;
  const tradedPickRounds = Math.max(
    0,
    ...tradedPicks.map((pick) => pick.round)
  );
  const roundCount = Math.min(
    6,
    recentDraftRounds > 0
      ? Math.max(recentDraftRounds, tradedPickRounds)
      : Math.max(4, tradedPickRounds)
  );
  const rosterNameById = new Map(
    rosters.map((roster) => [roster.id, roster.managerName])
  );
  const currentOwnerByPick = new Map(
    tradedPicks.map((pick) => [
      `${pick.season}:${pick.round}:${pick.rosterId}`,
      pick.ownerId,
    ])
  );

  return seasons.flatMap((season) =>
    rosters.flatMap((originalRoster) =>
      Array.from({ length: roundCount }, (_, index) => {
        const round = index + 1;
        const id = `${season}:${round}:${originalRoster.id}`;
        const ownerRosterId = currentOwnerByPick.get(id) ?? originalRoster.id;
        const originalManager =
          rosterNameById.get(originalRoster.id) ??
          `Roster ${originalRoster.id}`;

        return {
          id,
          season,
          round,
          originalRosterId: originalRoster.id,
          ownerRosterId,
          label: `${season} Round ${round}${
            ownerRosterId !== originalRoster.id
              ? ` (from ${originalManager})`
              : ""
          }`,
        };
      })
    )
  );
};

export const loadDynastyDraftPickAssets = async ({
  league,
  rosters,
}: {
  league: LeagueInfoType;
  rosters: Array<{ id: number; managerName: string }>;
}): Promise<DynastyDraftPickAsset[]> => {
  if (!isDynastyLeague(league) || league.platform === "espn") return [];

  const tradedPicks = await getTradedPicks(league.leagueId);
  return buildDynastyDraftPickAssets({ league, rosters, tradedPicks });
};

const getWeekLineup = (team: TableDataType, weekIndex: number) => {
  const starters =
    Array.isArray(team.starters?.[weekIndex]) && team.starters[weekIndex]
      ? team.starters[weekIndex]
      : [];
  const benchByWeek = Array.isArray(team.benchPlayers?.[weekIndex])
    ? team.benchPlayers[weekIndex]
    : [];
  const bench =
    benchByWeek.length > 0
      ? benchByWeek
      : (team.players || []).filter((id) => !starters.includes(id));

  return { starters, bench };
};

export const getTradeValueWeek = (league: LeagueInfoType) => {
  const nextWeek = Math.min((league.lastScoredWeek || 0) + 1, 18);
  return Math.max(1, nextWeek);
};

export const buildTradeValueRequest = ({
  league,
  tableData,
  selectedWeek,
  showUsernames,
  dynastyPerspective = "balanced",
}: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): TradeValueRequestPayload => {
  const weekIndex = selectedWeek - 1;
  const rosters = tableData.map((team) => {
    const { starters, bench } = getWeekLineup(team, weekIndex);
    const managerName = showUsernames
      ? team.username || team.name
      : team.name || team.username;
    return {
      id: team.rosterId,
      managerName: managerName || `Roster ${team.rosterId}`,
      playerIds: [...new Set([...starters, ...bench])],
    };
  });

  return {
    league: {
      leagueId: league.leagueId,
      season: league.season,
      status: league.status,
      scoringType: league.scoringType,
      scoringSettings: league.scoringSettings ?? {},
      rosterPositions: league.rosterPositions,
      totalRosters: league.totalRosters || tableData.length,
      seasonType: league.seasonType ?? "",
      platform: league.platform ?? "",
    },
    rosters,
    selectedWeek,
    remainingWeeks:
      league.status === "complete" ? 18 : Math.max(1, 18 - selectedWeek + 1),
    dynastyPerspective,
    finderForRosterId: null,
  };
};

const groupRankingsByRoster = (
  request: TradeValueRequestPayload,
  rankings: TradeFinderPlayer[]
): LeagueTradeValueRoster[] => {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.playerId, ranking])
  );
  return request.rosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: roster.playerIds
      .map((playerId) => rankingById.get(playerId))
      .filter((player): player is TradeFinderPlayer => player !== undefined)
      .map((player) => ({ ...player }))
      .sort((a, b) => a.overallRank - b.overallRank),
  }));
};

export const loadLeaguePlayerValues = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): Promise<LeaguePlayerValuesResult> => {
  const request = buildTradeValueRequest(options);
  const response = await getPlayerValues(request);
  return {
    ...response,
    request,
    rosters: groupRankingsByRoster(request, response.rankings),
  };
};

export type TradeBuilderPlayer = Player & {
  playerId: string;
  positionRank: number;
  overallRank: number;
  dynastyAdp: number | null;
};

export type TradeBuilderRoster = {
  id: number;
  managerName: string;
  players: TradeBuilderPlayer[];
};

type TradeBuilderBasicRanking = {
  positionRank: number;
  overallRank: number;
  dynastyAdp: number | null;
};

const TRADE_BUILDER_RANKING_CONCURRENCY = 8;

export const mergeTradeBuilderRankings = (
  rosters: TradeBuilderRoster[],
  rankings: TradeFinderPlayer[]
): TradeBuilderRoster[] => {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.playerId, ranking])
  );
  return rosters.map((roster) => ({
    ...roster,
    players: roster.players.map((player) => {
      const ranking = rankingById.get(player.playerId);
      return {
        ...player,
        positionRank: ranking?.positionRank ?? player.positionRank,
        overallRank: ranking?.overallRank ?? player.overallRank,
      };
    }),
  }));
};

export const applyTradeBuilderRankingResponse = (
  rosters: TradeBuilderRoster[],
  response: Pick<PlayerValuesResponse, "access" | "rankings">
): TradeBuilderRoster[] =>
  response.access === "premium"
    ? mergeTradeBuilderRankings(rosters, response.rankings)
    : rosters;

export const loadTradeBuilderRosters = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
}): Promise<TradeBuilderRoster[]> => {
  const request = buildTradeValueRequest({
    ...options,
    dynastyPerspective: "balanced",
  });
  const playerIds = [...new Set(request.rosters.flatMap((r) => r.playerIds))];
  const playerMap = await getPlayersByIdsMap(playerIds);
  const dynasty = isDynastyLeague(options.league);
  const normalizedRosterPositions = options.league.rosterPositions.map(
    (position) => position.toUpperCase()
  );
  const superflex =
    normalizedRosterPositions.filter((position) => position === "QB").length >
      1 ||
    normalizedRosterPositions.some((position) =>
      ["SUPER_FLEX", "OP"].includes(position)
    );
  const idpPositions = new Set(["DB", "DL", "LB", "CB", "DE", "DT", "NT", "S"]);
  const basicRankingEntries = await mapWithConcurrency(
    playerIds,
    TRADE_BUILDER_RANKING_CONCURRENCY,
    async (playerId): Promise<readonly [string, TradeBuilderBasicRanking]> => {
      if (dynasty) {
        const player = playerMap.get(playerId);
        const projection = await getDraftProjections(
          playerId,
          options.league.season,
          options.league.scoringType,
          "Dynasty",
          superflex,
          idpPositions.has(player?.position?.toUpperCase() ?? "")
        );
        return [
          playerId,
          {
            positionRank: 0,
            overallRank: 0,
            dynastyAdp: projection.adp,
          },
        ] as const;
      }

      const stats = await getStats(
        playerId,
        options.league.season,
        options.league.scoringType
      );
      return [
        playerId,
        {
          positionRank: Number(stats?.rank || 0),
          overallRank: Number(stats?.overallRank || 0),
          dynastyAdp: null,
        },
      ] as const;
    }
  );
  const basicRankingById = new Map(basicRankingEntries);
  return request.rosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: roster.playerIds
      .map((playerId) => {
        const player = playerMap.get(playerId);
        if (!player) return null;
        const basicRanking = basicRankingById.get(playerId);
        return {
          ...player,
          playerId,
          positionRank: basicRanking?.positionRank ?? 0,
          overallRank: basicRanking?.overallRank ?? 0,
          dynastyAdp: basicRanking?.dynastyAdp ?? null,
        };
      })
      .filter((player): player is TradeBuilderPlayer => player !== null),
  }));
};
