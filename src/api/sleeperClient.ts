// Shared Sleeper client with simple in-memory caches and TTLs.
// Caches reduce duplicate downloads of the player directory, draft picks, and weekly matchups.

export type SleeperPlayerMap = Record<
  string,
  {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    search_full_name?: string;
    position?: string;
    team?: string;
  }
>;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<any>>();
const inFlight = new Map<string, Promise<any>>();

const TTL_MS = {
  players: 1000 * 60 * 60 * 12, // 12 hours
  draft: 1000 * 60 * 60 * 24, // 24 hours
  matchups: 1000 * 60 * 10, // 10 minutes
};

const PLAYER_CACHE_VERSION = "v1";
const DRAFT_CACHE_VERSION = "v1";

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readPersisted = <T>(key: string, expectedVersion: string) => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== expectedVersion) return null;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.value as T;
  } catch {
    return null;
  }
};

const writePersisted = <T>(
  key: string,
  version: string,
  ttlMs: number,
  value: T
) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version,
        expiresAt: Date.now() + ttlMs,
        value,
      })
    );
  } catch {
    // ignore storage errors (quota, unavailable, etc.)
  }
};

const fetchWithCache = async <T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.value as T;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key)! as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { expiresAt: now + ttlMs, value });
      inFlight.delete(key);
      return value;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });
  inFlight.set(key, promise as Promise<any>);
  return promise;
};

export const getPlayersDirectory = async (): Promise<SleeperPlayerMap> => {
  const cacheKey = "playersDirectory";
  const now = Date.now();
  const existing = cache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing.value as SleeperPlayerMap;
  }

  const persistedKey = `sleeper:players:${PLAYER_CACHE_VERSION}`;
  const persisted = readPersisted<SleeperPlayerMap>(
    persistedKey,
    PLAYER_CACHE_VERSION
  );
  if (persisted) {
    cache.set(cacheKey, { expiresAt: now + TTL_MS.players, value: persisted });
    return persisted;
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey)! as Promise<SleeperPlayerMap>;
  }

  const promise = (async () => {
    const response = await fetch("https://api.sleeper.com/players/nfl");
    if (!response.ok) {
      throw new Error(`Failed to fetch players directory (${response.status})`);
    }
    const data = (await response.json()) as SleeperPlayerMap;
    cache.set(cacheKey, { expiresAt: Date.now() + TTL_MS.players, value: data });
    writePersisted(persistedKey, PLAYER_CACHE_VERSION, TTL_MS.players, data);
    return data;
  })().finally(() => {
    inFlight.delete(cacheKey);
  });

  inFlight.set(cacheKey, promise as Promise<any>);
  return promise;
};

export const getDraftPicksRaw = async (draftId?: string) => {
  if (!draftId) return [];
  const key = `draft:picks:${draftId}`;
  const persistedKey = `sleeper:draft:${draftId}:${DRAFT_CACHE_VERSION}`;
  const now = Date.now();

  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as any[];
  }

  const persisted = readPersisted<any[]>(persistedKey, DRAFT_CACHE_VERSION);
  if (persisted) {
    cache.set(key, { expiresAt: now + TTL_MS.draft, value: persisted });
    return persisted;
  }

  if (inFlight.has(key)) return inFlight.get(key)! as Promise<any[]>;

  const promise = (async () => {
    const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch draft picks (${response.status})`);
    }
    const picks = (await response.json()) as any[];
    cache.set(key, { expiresAt: Date.now() + TTL_MS.draft, value: picks });
    writePersisted(persistedKey, DRAFT_CACHE_VERSION, TTL_MS.draft, picks);
    return picks;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise as Promise<any>);
  return promise;
};

export type DraftPickMeta = {
  round: number | null;
  rosterId: number | null;
};

export const getDraftPicksMap = async (draftId?: string) => {
  if (!draftId) return new Map<string, DraftPickMeta>();
  const picks = await getDraftPicksRaw(draftId);
  const map = new Map<string, DraftPickMeta>();
  picks.forEach((pick: any) => {
    map.set(pick["player_id"], {
      round: pick["round"] ?? null,
      rosterId: pick["roster_id"] ?? null,
    });
  });
  return map;
};

export const getMatchupsForWeek = async (leagueId: string, week: number) => {
  const key = `matchups:${leagueId}:${week}`;
  return fetchWithCache<any[]>(key, TTL_MS.matchups, async () => {
    const response = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch matchups for week ${week} (${response.status})`);
    }
    return (await response.json()) as any[];
  });
};

export const clearSleeperCache = (prefix?: string) => {
  if (!prefix) {
    cache.clear();
    return;
  }
  Array.from(cache.keys())
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => cache.delete(key));
};

export const clearSleeperPersistentCache = (prefix?: string) => {
  if (!canUseStorage()) return;
  const keys = Object.keys(window.localStorage);
  keys
    .filter((key) => (prefix ? key.startsWith(prefix) : key.startsWith("sleeper:")))
    .forEach((key) => window.localStorage.removeItem(key));
};
