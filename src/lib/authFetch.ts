import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export const authenticatedFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const headers = new Headers(init?.headers ?? undefined);

  if (isSupabaseConfigured() && !headers.has("Authorization")) {
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
