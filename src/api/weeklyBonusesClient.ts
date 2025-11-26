import type { WeeklyBonus } from "./types";

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_AWARDS_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return ""; // same-origin
};

export const fetchWeeklyBonuses = async (): Promise<WeeklyBonus[] | null> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/weekly-bonuses`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`Failed to fetch weekly bonuses: ${response.status}`);
    const data = await response.json();
    if (data && Array.isArray(data.weeklyBonuses)) {
      return data.weeklyBonuses as WeeklyBonus[];
    }
    return null;
  } catch (error) {
    console.warn("Weekly bonuses fetch failed", error);
    return null;
  }
};

export const saveWeeklyBonuses = async (weeklyBonuses: WeeklyBonus[]): Promise<boolean> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/weekly-bonuses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyBonuses }),
    });
    return response.ok;
  } catch (error) {
    console.warn("Weekly bonuses save failed", error);
    return false;
  }
};
