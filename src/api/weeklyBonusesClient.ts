import { describeBase, getApiBases } from "./apiBase";
import type { WeeklyBonus } from "../types/types";

const fetchWithFallback = async (path: string, init: RequestInit) => {
  const bases = getApiBases();
  let lastError: unknown = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, init);
      if (response.ok) return response;
      lastError = new Error(`Base ${describeBase(base)} responded ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(
    `Weekly bonuses API failed for ${path}. Tried: ${bases.map(describeBase).join(", ")}`,
    lastError
  );
  return null;
};

export const fetchWeeklyBonuses = async (): Promise<WeeklyBonus[] | null> => {
  try {
    const response = await fetchWithFallback("/api/weekly-bonuses", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response) throw new Error("Unable to reach weekly bonuses API");
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
    const response = await fetchWithFallback("/api/admin/weekly-bonuses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyBonuses }),
    });
    return Boolean(response && response.ok);
  } catch (error) {
    console.warn("Weekly bonuses save failed", error);
    return false;
  }
};
