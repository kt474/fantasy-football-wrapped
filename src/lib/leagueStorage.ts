import { readonly, ref, toRaw, watch } from "vue";

import { trackEvent } from "@/lib/analytics";
import { getLeagueKey } from "@/store/store";
import type { LeagueInfoType } from "@/types/types";

export const LEAGUE_DATABASE_NAME = "ffwrapped";
const LEAGUE_DATABASE_VERSION = 2;
const LEAGUE_STORE_NAME = "leagues";
const CACHE_STORE_NAME = "cache";
const LEGACY_LEAGUE_STORAGE_KEY = "leagueInfo";
const LEAGUE_FALLBACK_MARKER_KEY = "leagueInfoFallback";
const NARRATIVE_BUNDLE_CACHE_PREFIX = "narrative-bundle:";
const NARRATIVE_BUNDLE_CACHE_VERSION = "v2:";
export const NARRATIVE_BUNDLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_RECORD_VERSION = 1;
const MAX_CACHE_RECORDS = 20;
const DATABASE_OPEN_TIMEOUT_MS = 3_000;

type StoredLeague = {
  key: string;
  position: number;
  league: LeagueInfoType;
};

type StoredCacheValue = {
  key: string;
  version: number;
  value: unknown;
  updatedAt: number;
  expiresAt: number;
};

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

const unwrapForStorage = <T>(
  value: T,
  seen = new WeakMap<object, unknown>()
): T => {
  if (value === null || typeof value !== "object") return value;

  const rawValue = toRaw(value) as object;
  const existingValue = seen.get(rawValue);
  if (existingValue) return existingValue as T;

  if (rawValue instanceof Date) {
    return new Date(rawValue.getTime()) as T;
  }

  if (Array.isArray(rawValue)) {
    const result: unknown[] = [];
    seen.set(rawValue, result);
    rawValue.forEach((entry) => result.push(unwrapForStorage(entry, seen)));
    return result as T;
  }

  const result: Record<string, unknown> = {};
  seen.set(rawValue, result);
  Object.entries(rawValue).forEach(([key, entry]) => {
    result[key] = unwrapForStorage(entry, seen);
  });
  return result as T;
};

const getBrowserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

const getIndexedDb = (): IDBFactory | null => {
  try {
    return typeof indexedDB === "undefined" ? null : indexedDB;
  } catch {
    return null;
  }
};

type LegacyLeagueSnapshot = {
  exists: boolean;
  leagues: LeagueInfoType[];
};

const readLegacyLeagueSnapshot = (
  storage: StorageLike | null = getBrowserStorage()
): LegacyLeagueSnapshot => {
  if (!storage) return { exists: false, leagues: [] };

  try {
    const rawValue = storage.getItem(LEGACY_LEAGUE_STORAGE_KEY);
    if (!rawValue) return { exists: false, leagues: [] };
    const parsedValue = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsedValue)
      ? { exists: true, leagues: parsedValue as LeagueInfoType[] }
      : { exists: false, leagues: [] };
  } catch {
    return { exists: false, leagues: [] };
  }
};

const isAuthoritativeFallbackSnapshot = (
  snapshot: LegacyLeagueSnapshot,
  storage: StorageLike | null
) =>
  snapshot.exists && storage?.getItem(LEAGUE_FALLBACK_MARKER_KEY) === "1";

const removeLegacyLeagueSnapshot = (storage = getBrowserStorage()) => {
  storage?.removeItem(LEGACY_LEAGUE_STORAGE_KEY);
  storage?.removeItem(LEAGUE_FALLBACK_MARKER_KEY);
};

const writeFallbackLeagueSnapshot = (
  leagues: LeagueInfoType[],
  storage: StorageLike | null = getBrowserStorage()
) => {
  if (!storage) return false;

  try {
    storage.setItem(LEGACY_LEAGUE_STORAGE_KEY, JSON.stringify(leagues));
    storage.setItem(LEAGUE_FALLBACK_MARKER_KEY, "1");
    return true;
  } catch (error) {
    console.error("Unable to save leagues in browser storage:", error);
    return false;
  }
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed")),
      { once: true }
    );
  });

const transactionComplete = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      { once: true }
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      { once: true }
    );
  });

const openLeagueDatabase = async (factory = getIndexedDb()) => {
  if (!factory) {
    throw new Error("IndexedDB is unavailable");
  }

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(
      LEAGUE_DATABASE_NAME,
      LEAGUE_DATABASE_VERSION
    );
    let settled = false;
    const timeoutId = setTimeout(() => {
      settled = true;
      reject(new Error("IndexedDB open timed out"));
    }, DATABASE_OPEN_TIMEOUT_MS);
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(error);
    };

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEAGUE_STORE_NAME)) {
        database.createObjectStore(LEAGUE_STORE_NAME, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
        database.createObjectStore(CACHE_STORE_NAME, { keyPath: "key" });
      }
    });
    request.addEventListener(
      "blocked",
      () => rejectOnce(new Error("IndexedDB upgrade was blocked")),
      { once: true }
    );
    request.addEventListener(
      "error",
      () =>
        rejectOnce(request.error ?? new Error("IndexedDB open request failed")),
      { once: true }
    );
    request.addEventListener(
      "success",
      () => {
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        resolve(request.result);
      },
      { once: true }
    );
  });
};

const readIndexedDbCacheRecord = async (
  key: string
): Promise<StoredCacheValue | undefined> => {
  const database = await openLeagueDatabase();

  try {
    const transaction = database.transaction(CACHE_STORE_NAME, "readonly");
    const record = await requestResult(
      transaction.objectStore(CACHE_STORE_NAME).get(key) as IDBRequest<
        StoredCacheValue | undefined
      >
    );
    await transactionComplete(transaction);
    return record;
  } finally {
    database.close();
  }
};

const readAllIndexedDbCacheRecords = async (): Promise<StoredCacheValue[]> => {
  const database = await openLeagueDatabase();

  try {
    const transaction = database.transaction(CACHE_STORE_NAME, "readonly");
    const records = await requestResult(
      transaction.objectStore(CACHE_STORE_NAME).getAll() as IDBRequest<
        StoredCacheValue[]
      >
    );
    await transactionComplete(transaction);
    return records;
  } finally {
    database.close();
  }
};

const writeIndexedDbCacheValue = async (
  key: string,
  value: unknown,
  ttlMs: number,
  now = Date.now()
) => {
  const database = await openLeagueDatabase();

  try {
    const transaction = database.transaction(CACHE_STORE_NAME, "readwrite");
    const record: StoredCacheValue = {
      key,
      version: CACHE_RECORD_VERSION,
      value: unwrapForStorage(value),
      updatedAt: now,
      expiresAt: now + ttlMs,
    };
    transaction.objectStore(CACHE_STORE_NAME).put(record);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
};

const deleteIndexedDbCacheKeys = async (keys: string[]) => {
  if (keys.length === 0) return;

  const database = await openLeagueDatabase();
  try {
    const transaction = database.transaction(CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(CACHE_STORE_NAME);
    keys.forEach((key) => store.delete(key));
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
};

const evictOldCacheRecords = async (now = Date.now()) => {
  const records = await readAllIndexedDbCacheRecords();
  const expiredKeys = records
    .filter(
      (record) =>
        record.version !== CACHE_RECORD_VERSION || record.expiresAt <= now
    )
    .map((record) => record.key);
  const validRecords = records
    .filter(
      (record) =>
        record.version === CACHE_RECORD_VERSION && record.expiresAt > now
    )
    .sort((left, right) => right.updatedAt - left.updatedAt);
  const overflowKeys = validRecords
    .slice(MAX_CACHE_RECORDS)
    .map((record) => record.key);

  await deleteIndexedDbCacheKeys([...expiredKeys, ...overflowKeys]);
};

export const getNarrativeBundleCacheKey = (leagueKey: string) =>
  `${NARRATIVE_BUNDLE_CACHE_PREFIX}${NARRATIVE_BUNDLE_CACHE_VERSION}${leagueKey}`;

export const getCachedValue = async <T>(
  key: string,
  isValid?: (value: unknown) => value is T,
  now = Date.now()
): Promise<T | null> => {
  if (!getIndexedDb()) return null;

  try {
    const record = await readIndexedDbCacheRecord(key);
    if (!record) return null;

    if (
      record.version !== CACHE_RECORD_VERSION ||
      record.expiresAt <= now ||
      (isValid && !isValid(record.value))
    ) {
      await deleteIndexedDbCacheKeys([key]);
      return null;
    }

    return record.value as T;
  } catch (error) {
    console.error(`Unable to read IndexedDB cache entry ${key}:`, error);
    return null;
  }
};

export const setCachedValue = async (
  key: string,
  value: unknown,
  ttlMs: number,
  now = Date.now()
) => {
  if (!getIndexedDb()) return false;

  try {
    await writeIndexedDbCacheValue(key, value, ttlMs, now);
  } catch (error) {
    console.error(`Unable to save IndexedDB cache entry ${key}:`, error);
    return false;
  }

  try {
    await evictOldCacheRecords(now);
  } catch (error) {
    console.error("Unable to evict old IndexedDB cache entries:", error);
  }
  return true;
};

const removeCachedValuesByPrefix = async (prefix: string) => {
  if (!getIndexedDb()) return false;

  try {
    const records = await readAllIndexedDbCacheRecords();
    await deleteIndexedDbCacheKeys(
      records
        .filter((record) => record.key.startsWith(prefix))
        .map((record) => record.key)
    );
    return true;
  } catch (error) {
    console.error(`Unable to remove IndexedDB cache entries ${prefix}:`, error);
    return false;
  }
};

export const removeCachedValue = async (key: string) => {
  if (!getIndexedDb()) return false;

  try {
    await deleteIndexedDbCacheKeys([key]);
    return true;
  } catch (error) {
    console.error(`Unable to remove IndexedDB cache entry ${key}:`, error);
    return false;
  }
};

export const removeNarrativeBundle = (leagueKey: string) =>
  removeCachedValue(getNarrativeBundleCacheKey(leagueKey));

export const removeAllNarrativeBundles = () =>
  removeCachedValuesByPrefix(NARRATIVE_BUNDLE_CACHE_PREFIX);

const removeLegacyRecomputableCaches = (storage: StorageLike | null) => {
  if (!storage) return;

  storage.removeItem("originalData");
  const historyKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith("league-history:")) historyKeys.push(key);
  }
  historyKeys.forEach((key) => storage.removeItem(key));
};

/** Moves legacy narrative bundles to IndexedDB and drops recomputable caches. */
const migrateLegacyCaches = async (
  storage: StorageLike | null = getBrowserStorage()
) => {
  removeLegacyRecomputableCaches(storage);
  if (!storage || !getIndexedDb()) return;

  const narrativeKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(NARRATIVE_BUNDLE_CACHE_PREFIX)) {
      narrativeKeys.push(key);
    }
  }

  for (const key of narrativeKeys) {
    const rawValue = storage.getItem(key);
    if (!rawValue) {
      storage.removeItem(key);
      continue;
    }

    let value: unknown;
    try {
      value = JSON.parse(rawValue) as unknown;
    } catch {
      storage.removeItem(key);
      continue;
    }

    try {
      await writeIndexedDbCacheValue(
        key,
        value,
        NARRATIVE_BUNDLE_CACHE_TTL_MS
      );
      const migratedRecord = await readIndexedDbCacheRecord(key);
      if (!migratedRecord) {
        throw new Error("IndexedDB cache migration could not be verified");
      }
      storage.removeItem(key);
    } catch (error) {
      console.error(`Unable to migrate legacy cache entry ${key}:`, error);
    }
  }

  try {
    await evictOldCacheRecords();
  } catch (error) {
    console.error("Unable to evict old IndexedDB cache entries:", error);
  }
};

const readIndexedDbLeagues = async (): Promise<LeagueInfoType[]> => {
  const database = await openLeagueDatabase();

  try {
    const transaction = database.transaction(LEAGUE_STORE_NAME, "readonly");
    const records = await requestResult(
      transaction.objectStore(LEAGUE_STORE_NAME).getAll() as IDBRequest<
        StoredLeague[]
      >
    );
    await transactionComplete(transaction);

    return records
      .sort((left, right) => left.position - right.position)
      .map((record) => record.league);
  } finally {
    database.close();
  }
};

export const hasSavedLeagues = async () => {
  const storage = getBrowserStorage();
  const legacySnapshot = readLegacyLeagueSnapshot(storage);
  if (isAuthoritativeFallbackSnapshot(legacySnapshot, storage)) {
    return legacySnapshot.leagues.length > 0;
  }
  if (legacySnapshot.leagues.length > 0) return true;
  if (!getIndexedDb()) return false;

  try {
    const database = await openLeagueDatabase();
    try {
      const transaction = database.transaction(LEAGUE_STORE_NAME, "readonly");
      const count = await requestResult(
        transaction.objectStore(LEAGUE_STORE_NAME).count()
      );
      await transactionComplete(transaction);
      return count > 0;
    } finally {
      database.close();
    }
  } catch {
    return false;
  }
};

const replaceIndexedDbLeagues = async (leagues: LeagueInfoType[]) => {
  const database = await openLeagueDatabase();

  try {
    const transaction = database.transaction(LEAGUE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LEAGUE_STORE_NAME);
    store.clear();
    leagues.forEach((league, position) => {
      const record: StoredLeague = {
        key: getLeagueKey(league),
        position,
        league,
      };
      store.put(record);
    });
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
};

const hasSameLeagueKeys = (
  left: LeagueInfoType[],
  right: LeagueInfoType[]
) =>
  left.length === right.length &&
  left.every(
    (league, index) => getLeagueKey(league) === getLeagueKey(right[index])
  );

const mergeSavedLeagues = (
  indexedDbLeagues: LeagueInfoType[],
  legacyLeagues: LeagueInfoType[]
) => {
  const mergedLeagues = [...indexedDbLeagues];
  const seenLeagueKeys = new Set(indexedDbLeagues.map(getLeagueKey));

  legacyLeagues.forEach((league) => {
    const leagueKey = getLeagueKey(league);
    if (seenLeagueKeys.has(leagueKey)) return;
    seenLeagueKeys.add(leagueKey);
    mergedLeagues.push(league);
  });

  return mergedLeagues;
};

export type LeaguePersistenceState =
  | "uninitialized"
  | "indexeddb"
  | "fallback"
  | "blocked";

const leaguePersistenceState = ref<LeaguePersistenceState>("uninitialized");
export const leaguePersistenceStatus = readonly(leaguePersistenceState);
const isLeaguePersistenceBlocked = () =>
  leaguePersistenceState.value === "blocked";

export class LeagueStorageUnavailableError extends Error {
  constructor(public readonly cause: unknown) {
    super("Saved leagues are temporarily unavailable");
    this.name = "LeagueStorageUnavailableError";
  }
}

/**
 * Loads saved leagues and migrates the legacy localStorage array atomically.
 * The legacy value is removed only after the IndexedDB write is verified.
 */
export const loadSavedLeagues = async (): Promise<LeagueInfoType[]> => {
  const storage = getBrowserStorage();
  const legacySnapshot = readLegacyLeagueSnapshot(storage);
  const legacyLeagues = legacySnapshot.leagues;
  const hasAuthoritativeFallback = isAuthoritativeFallbackSnapshot(
    legacySnapshot,
    storage
  );

  await migrateLegacyCaches(storage);

  if (!getIndexedDb()) {
    leaguePersistenceState.value = "fallback";
    return legacyLeagues;
  }

  try {
    const indexedDbLeagues = await readIndexedDbLeagues();

    if (hasAuthoritativeFallback) {
      await replaceIndexedDbLeagues(legacyLeagues);
      const recoveredLeagues = await readIndexedDbLeagues();
      if (!hasSameLeagueKeys(legacyLeagues, recoveredLeagues)) {
        throw new Error("IndexedDB fallback recovery could not be verified");
      }
      removeLegacyLeagueSnapshot(storage);
      leaguePersistenceState.value = "indexeddb";
      return recoveredLeagues;
    }

    if (legacyLeagues.length > 0) {
      const mergedLeagues = mergeSavedLeagues(
        indexedDbLeagues,
        legacyLeagues
      );
      if (!hasSameLeagueKeys(indexedDbLeagues, mergedLeagues)) {
        await replaceIndexedDbLeagues(mergedLeagues);
      }

      const migratedLeagues = await readIndexedDbLeagues();
      if (!hasSameLeagueKeys(mergedLeagues, migratedLeagues)) {
        throw new Error("IndexedDB league migration could not be verified");
      }
      removeLegacyLeagueSnapshot(storage);
      leaguePersistenceState.value = "indexeddb";
      return migratedLeagues;
    }

    leaguePersistenceState.value = "indexeddb";
    return indexedDbLeagues;
  } catch (error) {
    console.error("Unable to load leagues from IndexedDB:", error);
    trackEvent("Reliability Failure", {
      area: "league_storage",
      operation: "load",
      fallback_available: legacySnapshot.exists,
    });
    if (legacySnapshot.exists) {
      leaguePersistenceState.value = "fallback";
      return legacyLeagues;
    }
    leaguePersistenceState.value = "blocked";
    throw new LeagueStorageUnavailableError(error);
  }
};

let persistenceTimer: ReturnType<typeof setTimeout> | null = null;
let latestLeagues: LeagueInfoType[] = [];
let persistenceVersion = 0;
let persistedVersion = 0;
let persistencePromise: Promise<void> | null = null;

export const hasPendingLeaguePersistence = () =>
  persistedVersion < persistenceVersion;

const persistLatestLeagues = async () => {
  if (
    leaguePersistenceState.value === "uninitialized" ||
    leaguePersistenceState.value === "blocked"
  ) {
    return;
  }
  if (persistencePromise) return persistencePromise;

  persistencePromise = (async () => {
    while (persistedVersion < persistenceVersion) {
      const versionToPersist = persistenceVersion;
      const leaguesToPersist = unwrapForStorage(latestLeagues);
      let persistenceSucceeded = true;

      if (leaguePersistenceState.value === "fallback") {
        const fallbackSucceeded =
          writeFallbackLeagueSnapshot(leaguesToPersist);
        if (!fallbackSucceeded) {
          leaguePersistenceState.value = "blocked";
          persistenceSucceeded = false;
          trackEvent("Reliability Failure", {
            area: "league_storage",
            operation: "save",
            fallback_available: false,
          });
        }
      } else {
        try {
          await replaceIndexedDbLeagues(leaguesToPersist);
          removeLegacyLeagueSnapshot();
        } catch (error) {
          console.error("Unable to save leagues in IndexedDB:", error);
          const fallbackSucceeded =
            writeFallbackLeagueSnapshot(leaguesToPersist);
          leaguePersistenceState.value = fallbackSucceeded
            ? "fallback"
            : "blocked";
          persistenceSucceeded = fallbackSucceeded;
          trackEvent("Reliability Failure", {
            area: "league_storage",
            operation: "save",
            fallback_available: fallbackSucceeded,
          });
        }
      }

      if (!persistenceSucceeded) return;
      persistedVersion = versionToPersist;
    }
  })().finally(() => {
    persistencePromise = null;
  });

  return persistencePromise;
};

/** Coalesces rapid Pinia mutations into one IndexedDB transaction. */
export const scheduleLeaguePersistence = (
  leagues: LeagueInfoType[],
  delayMs = 50
) => {
  if (
    leaguePersistenceState.value === "uninitialized" ||
    leaguePersistenceState.value === "blocked"
  ) {
    return false;
  }

  latestLeagues = leagues;
  persistenceVersion += 1;

  if (persistenceTimer) {
    clearTimeout(persistenceTimer);
  }
  persistenceTimer = setTimeout(() => {
    persistenceTimer = null;
    void persistLatestLeagues();
  }, delayMs);
  return true;
};

/** Watches only league data so unrelated Pinia mutations cannot clear storage. */
export const watchLeaguePersistence = (
  store: { leagueInfo: LeagueInfoType[] },
  delayMs = 50
) =>
  watch(
    () => store.leagueInfo,
    (leagues) => scheduleLeaguePersistence(leagues, delayMs),
    { deep: true }
  );

/** Used by tests and lifecycle boundaries that need all queued writes finished. */
export const flushLeaguePersistence = async () => {
  if (
    leaguePersistenceState.value === "uninitialized" ||
    leaguePersistenceState.value === "blocked"
  ) {
    return false;
  }
  if (persistenceTimer) {
    clearTimeout(persistenceTimer);
    persistenceTimer = null;
  }
  await persistLatestLeagues();
  return !isLeaguePersistenceBlocked();
};
