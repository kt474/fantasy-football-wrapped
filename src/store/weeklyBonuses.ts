import { defineStore } from "pinia";
import type { WeeklyBonus } from "../types/types";
import { fetchWeeklyBonuses, saveWeeklyBonuses } from "../api/weeklyBonusesClient";

const STORAGE_KEY = "weeklyBonusesCache";

const defaultWeeklyBonuses: WeeklyBonus[] = [
  {
    week: 15,
    label: "Highest score, non-playoff matchups",
    note: "Starters only",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
  {
    week: 16,
    label: "Highest-scoring player, non-QB",
    note: "Starters only",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
  {
    week: 17,
    label: "Highest-scoring player, all positions",
    note: "Starters only",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
    score: null,
  },
];

const readFromStorage = (): WeeklyBonus[] => {
  if (typeof localStorage === "undefined") return defaultWeeklyBonuses;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWeeklyBonuses;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((bonus: WeeklyBonus) => ({
        ...bonus,
        amount: Number(bonus.amount) || 15,
        score:
          bonus.score === null || bonus.score === undefined
            ? null
            : Number(bonus.score),
      }));
    }
    return defaultWeeklyBonuses;
  } catch (error) {
    console.warn("Unable to read weekly bonuses from storage; falling back to defaults.", error);
    return defaultWeeklyBonuses;
  }
};

const persistToStorage = (bonuses: WeeklyBonus[]) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bonuses));
  } catch (error) {
    console.warn("Unable to persist weekly bonuses to storage.", error);
  }
};

export const useWeeklyBonusStore = defineStore("weeklyBonuses", {
  state: () => ({
    bonuses: readFromStorage(),
    loading: false,
    initialized: false,
    error: null as string | null,
    adminEnabled: import.meta.env.VITE_ENABLE_ADMIN_AWARDS !== "false",
  }),
  actions: {
    async hydrateFromApi() {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      const remote = await fetchWeeklyBonuses();
      if (remote && Array.isArray(remote) && remote.length) {
        this.bonuses = remote;
        persistToStorage(remote);
      } else {
        this.bonuses = readFromStorage();
        this.error = "Using local weekly bonuses (remote unavailable).";
      }
      this.loading = false;
      this.initialized = true;
    },
    setBonuses(bonuses: WeeklyBonus[]) {
      this.bonuses = bonuses;
      persistToStorage(bonuses);
    },
    async saveAll(bonuses: WeeklyBonus[]) {
      this.loading = true;
      this.error = null;
      const ok = await saveWeeklyBonuses(bonuses);
      if (!ok) {
        this.error = "Failed to save weekly bonuses to server; changes kept locally.";
      }
      this.setBonuses(bonuses);
      this.loading = false;
      return ok;
    },
    updateBonus(week: number, updates: Partial<WeeklyBonus>) {
      const next = this.bonuses.map((bonus) =>
        bonus.week === week ? { ...bonus, ...updates } : bonus
      );
      this.setBonuses(next);
    },
    resetBonuses() {
      this.setBonuses(defaultWeeklyBonuses);
    },
  },
});

export const defaultWeeklyBonusOverrides = defaultWeeklyBonuses;
