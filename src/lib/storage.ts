type ParsedStorageOptions<T> = {
  storage?: Storage;
  removeOnError?: boolean;
  isValid?: (value: unknown) => value is T;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

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
