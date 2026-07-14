type ParsedStorageOptions<T> = {
  storage?: Storage;
  removeOnError?: boolean;
  isValid?: (value: unknown) => value is T;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

type TimestampedCacheEntry<T> =
  | T[]
  | {
      lastUpdated?: number;
      data?: T[];
    };

/** Converts an old array-only cache entry to the timestamped cache format. */
export const migrateLegacyArrayCacheEntry = <T>(
  cache: Record<string, TimestampedCacheEntry<T>>,
  key: string,
  lastUpdated?: number
) => {
  const legacyData = cache[key];
  if (!Array.isArray(legacyData)) return false;

  cache[key] = {
    lastUpdated,
    data: legacyData,
  };
  return true;
};

const NARRATIVE_BUNDLE_STORAGE_PREFIX = "narrative-bundle:";

export const getNarrativeBundleStorageKey = (leagueKey: string) =>
  `${NARRATIVE_BUNDLE_STORAGE_PREFIX}${leagueKey}`;

export const removeNarrativeBundle = (
  leagueKey: string,
  storage: Storage = localStorage
) => {
  storage.removeItem(getNarrativeBundleStorageKey(leagueKey));
};

export const removeAllNarrativeBundles = (storage: Storage = localStorage) => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const storageKey = storage.key(index);
    if (storageKey?.startsWith(NARRATIVE_BUNDLE_STORAGE_PREFIX)) {
      storage.removeItem(storageKey);
    }
  }
};

export const getParsedStorageItem = <T>(
  key: string,
  fallback: T,
  {
    storage = localStorage,
    removeOnError = true,
    isValid,
  }: ParsedStorageOptions<T> = {}
): T => {
  const rawValue = storage.getItem(key);
  if (rawValue === null) {
    return fallback;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    if (isValid && !isValid(parsedValue)) {
      if (removeOnError) {
        storage.removeItem(key);
      }
      return fallback;
    }
    return parsedValue as T;
  } catch {
    if (removeOnError) {
      storage.removeItem(key);
    }
    return fallback;
  }
};
