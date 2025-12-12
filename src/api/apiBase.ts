const normalize = (url?: string | null) => (url ? url.replace(/\/$/, "") : null);

/**
 * Returns the list of API base URLs to try (in order): explicit env override,
 * then same-origin.
 */
export const getApiBases = (): string[] => {
  const bases: (string | null | "")[] = [];

  const envBase = normalize(import.meta.env.VITE_AWARDS_API_URL);
  if (envBase) bases.push(envBase);

  // same-origin
  bases.push("");

  // Remove duplicates while preserving order.
  return [...new Set(bases)].filter((base) => base !== null) as string[];
};

export const describeBase = (base: string) => (base === "" ? "[same-origin]" : base);
