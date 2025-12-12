const normalize = (url?: string | null) => (url ? url.replace(/\/$/, "") : null);

const DEFAULT_PROD_FALLBACK = "https://kicker-barely-know-her.pages.dev";

/**
 * Returns the list of API base URLs to try (in order): explicit env override,
 * same-origin, then a production fallback to the Pages domain to bypass
 * Cloudflare Access on the custom domain.
 */
export const getApiBases = (): string[] => {
  const bases: (string | null | "")[] = [];

  const envBase = normalize(import.meta.env.VITE_AWARDS_API_URL);
  if (envBase) bases.push(envBase);

  // same-origin
  bases.push("");

  const fallbackEnv = normalize(import.meta.env.VITE_AWARDS_API_FALLBACK_URL);
  const fallback = fallbackEnv || (import.meta.env.PROD ? DEFAULT_PROD_FALLBACK : null);
  if (fallback) bases.push(fallback);

  // Remove duplicates while preserving order.
  return [...new Set(bases)].filter((base) => base !== null) as string[];
};

export const describeBase = (base: string) => (base === "" ? "[same-origin]" : base);
