import { getBackendApiUrl } from "@/lib/backendApi";
import { assertOk, parseJson } from "@/lib/http";

export type TradeDatabaseAsset = {
  type: "player" | "draft_pick" | "faab";
  fromSide: string | null;
  toSide: string | null;
  playerId: string | null;
  pickSeason: number | null;
  pickRound: number | null;
  faabAmount: number | null;
};

export type TradeDatabaseResult = {
  tradeId: number;
  season: string | null;
  week: number;
  league: {
    size: number | null;
    type: string | null;
  };
  sides: Array<{
    side: string;
    received: TradeDatabaseAsset[];
  }>;
};

export type TradeDatabaseResponse = {
  playerId: string;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  trades: TradeDatabaseResult[];
};

export type TradeDatabaseFilters = {
  leagueType?: string;
  leagueSize?: string;
  week?: number;
};

export const getPlayerTradeDatabase = async (
  playerId: string,
  offset = 0,
  limit = 20,
  filters: TradeDatabaseFilters = {}
): Promise<TradeDatabaseResponse> => {
  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const endpoint = new URL(getBackendApiUrl("/api/trades"), origin);
  endpoint.searchParams.set("playerId", playerId);
  endpoint.searchParams.set("offset", String(offset));
  endpoint.searchParams.set("limit", String(limit));
  if (filters.leagueType) {
    endpoint.searchParams.set("leagueType", filters.leagueType);
  }
  if (filters.leagueSize) {
    endpoint.searchParams.set("leagueSize", filters.leagueSize);
  }
  if (filters.week) {
    endpoint.searchParams.set("week", String(filters.week));
  }

  const response = await fetch(endpoint);
  assertOk(response, "Trade database request");
  return await parseJson<TradeDatabaseResponse>(
    response,
    "Trade database request"
  );
};
