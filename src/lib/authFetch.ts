import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

const toUrl = (input: RequestInfo | URL) => {
  const baseOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const rawUrl = input instanceof Request ? input.url : input.toString();

  try {
    return new URL(rawUrl, baseOrigin);
  } catch {
    return null;
  }
};

const getTrustedOrigins = () => {
  const trustedOrigins = new Set<string>();

  if (typeof window !== "undefined") {
    trustedOrigins.add(window.location.origin);
  }

  const envUrls = [
    import.meta.env.VITE_BACKEND_URL,
    import.meta.env.VITE_PREMIUM_WEEKLY_REPORT,
    import.meta.env.VITE_MANAGER_PROFILES,
  ].filter(Boolean) as string[];

  envUrls.forEach((url) => {
    try {
      trustedOrigins.add(new URL(url).origin);
    } catch {
      // Ignore malformed env values; requests to those URLs won't get auth headers.
    }
  });

  return trustedOrigins;
};

const shouldAttachAuthHeader = (input: RequestInfo | URL) => {
  const requestUrl = toUrl(input);
  if (!requestUrl) return false;
  if (!["http:", "https:"].includes(requestUrl.protocol)) return false;

  return getTrustedOrigins().has(requestUrl.origin);
};

export const authenticatedFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const headers = new Headers(init?.headers ?? undefined);

  if (
    isSupabaseConfigured() &&
    !headers.has("Authorization") &&
    shouldAttachAuthHeader(input)
  ) {
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    } catch (error) {
      console.error("Unable to fetch Supabase session:", error);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
};
