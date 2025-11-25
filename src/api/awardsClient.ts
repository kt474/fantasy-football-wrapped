import type { SeasonalAward } from "./types";

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_AWARDS_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return ""; // same-origin
};

export const fetchAwards = async (): Promise<SeasonalAward[] | null> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/awards`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`Failed to fetch awards: ${response.status}`);
    const data = await response.json();
    if (data && Array.isArray(data.awards)) {
      return data.awards as SeasonalAward[];
    }
    return null;
  } catch (error) {
    console.warn("Awards fetch failed", error);
    return null;
  }
};

export const saveAwards = async (awards: SeasonalAward[]): Promise<boolean> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/awards`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ awards }),
    });
    return response.ok;
  } catch (error) {
    console.warn("Awards save failed", error);
    return false;
  }
};
