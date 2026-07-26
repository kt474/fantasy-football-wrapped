import type { Player } from "@/types/apiTypes";
import { getBackendApiUrl, getBackendBaseUrl } from "@/lib/backendApi";
import { assertOk, parseJson } from "@/lib/http";
import {
  getPlayerLookupKey,
  type PlayerNameTeamLookup,
} from "@/lib/playerLookup";
import {
  fetchWithRetry,
  isRequestCancellation,
  runWithRequestTimeout,
  type RequestOptions,
} from "@/lib/request";

export type PlayerNewsResult = {
  items: Record<string, unknown>[];
  error: string | null;
};

export const getPlayerNews = async (
  playerNames: string[],
  options: RequestOptions = {}
): Promise<PlayerNewsResult> => {
  const configuredUrl = import.meta.env.VITE_PLAYER_NEWS;
  if (!configuredUrl) {
    return {
      items: [],
      error: "Player news is not configured.",
    };
  }

  try {
    const origin =
      typeof window === "undefined"
        ? "http://localhost"
        : window.location.origin;
    const endpoint = new URL(configuredUrl, origin);
    if (playerNames.length > 0) {
      endpoint.searchParams.set("keywords", playerNames.join(","));
    }

    const response = await runWithRequestTimeout(
      (signal) => fetch(endpoint, { signal }),
      options
    );
    assertOk(response, "Player news request");
    const items = await parseJson<Record<string, unknown>[]>(
      response,
      "Player news"
    );
    return {
      items: Array.isArray(items) ? items : [],
      error: null,
    };
  } catch (error) {
    if (isRequestCancellation(error)) throw error;
    console.error("Error fetching player news:", error);
    return {
      items: [],
      error: "Unable to load roster news right now.",
    };
  }
};

export const getPlayersByIdsMap = async (
  playerIds: string[] | string[][],
  options: RequestOptions = {}
): Promise<Map<string, Player>> => {
  const flattenedPlayerIds = playerIds.flatMap((playerId) =>
    Array.isArray(playerId) ? playerId : [playerId]
  );
  if (flattenedPlayerIds.length === 0) {
    return new Map();
  }
  try {
    const endpoint = (
      import.meta.env.VITE_PLAYERS_URL || getBackendApiUrl("/api/getPlayer")
    ).split("?")[0];
    const params = new URLSearchParams({
      player_ids: flattenedPlayerIds.join(","),
    });
    const url = `${endpoint}?${params.toString()}`;
    const response = await runWithRequestTimeout(
      (signal) => fetch(url, { signal }),
      options
    );
    assertOk(response, "Players by IDs request");
    const result = await parseJson<Record<string, unknown>>(
      response,
      "Players by IDs"
    );
    const playersMap = new Map<string, Player>();
    const players = result["players"];
    if (players && Array.isArray(players)) {
      players.forEach((playerObj: Player) => {
        if (playerObj && playerObj.player_id) {
          playersMap.set(playerObj.player_id, playerObj);
        }
      });
    }
    return playersMap;
  } catch (error) {
    if (isRequestCancellation(error)) throw error;
    console.error("Error fetching players by IDs:", error);
    return new Map();
  }
};

export const searchPlayers = async (
  query: string,
  limit = 8,
  signal?: AbortSignal
): Promise<Player[]> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const endpoint = (
    import.meta.env.VITE_PLAYERS_URL || getBackendApiUrl("/api/getPlayer")
  ).split("?")[0];
  const requestUrl =
    `${endpoint}?query=${encodeURIComponent(normalizedQuery)}` +
    `&limit=${encodeURIComponent(String(limit))}`;
  const response = await runWithRequestTimeout(
    (requestSignal) => fetch(requestUrl, { signal: requestSignal }),
    { signal }
  );
  assertOk(response, "Player search request");
  const result = await parseJson<{ players?: Player[] }>(
    response,
    "Player search"
  );
  return Array.isArray(result.players)
    ? result.players.filter((player) => Boolean(player?.player_id))
    : [];
};

interface PlayerIdLookupResponse {
  name: string;
  team?: string;
  player_id: string | null;
}

interface PlayerIdLookupListResponse {
  players: PlayerIdLookupResponse[];
}

export const resolvePlayerIdLookupEndpoint = (
  lookupEndpoint?: string,
  backendBaseUrl?: string
) => {
  if (lookupEndpoint?.trim()) {
    return lookupEndpoint;
  }

  if (backendBaseUrl?.trim()) {
    return new URL("/api/getPlayerId", backendBaseUrl).toString();
  }

  return "";
};

export const getPlayerIdLookupMap = async (
  players: PlayerNameTeamLookup[],
  signal?: AbortSignal
): Promise<Map<string, string>> => {
  if (players.length === 0) {
    return new Map();
  }

  const uniquePlayers = Array.from(
    new Map(
      players.map((player) => [getPlayerLookupKey(player), player])
    ).values()
  );

  try {
    const endpoint = resolvePlayerIdLookupEndpoint(
      import.meta.env.VITE_PLAYER_ID_LOOKUP,
      getBackendBaseUrl()
    );
    if (!endpoint) {
      throw new Error("Player ID lookup endpoint is not configured");
    }
    const url = new URL(endpoint);

    uniquePlayers.forEach(({ name, team }) => {
      url.searchParams.append("name", name);
      url.searchParams.append("team", team);
    });

    const response = await fetchWithRetry(url.toString(), { signal });
    assertOk(response, "Player ID lookup request");

    const result = await parseJson<
      PlayerIdLookupResponse | PlayerIdLookupListResponse
    >(response, "Player ID lookup");
    const matches = "players" in result ? result.players : [result];
    const playerLookupMap = new Map<string, string>();

    uniquePlayers.forEach((player, index) => {
      const playerId = matches[index]?.player_id;

      if (playerId) {
        playerLookupMap.set(getPlayerLookupKey(player), playerId);
      }
    });

    return playerLookupMap;
  } catch (error) {
    if (isRequestCancellation(error)) throw error;
    console.error("Error fetching player IDs by name/team:", error);
    return new Map();
  }
};

export const getPlayerIdsByNameTeamMap = async (
  players: PlayerNameTeamLookup[],
  signal?: AbortSignal
): Promise<(string | null)[]> => {
  if (players.length === 0) {
    return [];
  }

  const playerLookupMap = await getPlayerIdLookupMap(players, signal);

  return players.map(
    (player) => playerLookupMap.get(getPlayerLookupKey(player)) ?? null
  );
};
