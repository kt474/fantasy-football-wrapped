import { defineStore } from "pinia";
import { fetchAwards, saveAwards } from "../api/awardsClient";
import { SeasonalAward, SeasonalAwardId } from "../api/types";

const STORAGE_KEY = "ffwrappedSeasonalAwards";

const defaultAwards: SeasonalAward[] = [
  {
    id: "award-i",
    title: "Award I",
    informalLabel: "Acting Coach",
    definition: "Season-long award slot I. Add custom criteria in admin.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-ii",
    title: "Award II",
    informalLabel: "In the House",
    definition: "Season-long award slot II. Add custom criteria in admin.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-iii",
    title: "Award III",
    informalLabel: "Nahbers",
    definition: "Season-long award slot III. Add custom criteria in admin.",
    amount: 25,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-iv",
    title: "Award IV",
    informalLabel: "Sticklemonsters",
    definition: "Season-long award slot IV. Add custom criteria in admin.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
  {
    id: "award-v",
    title: "Award V",
    informalLabel: "Wonderful Team",
    definition: "Season-long award slot V. Add custom criteria in admin.",
    amount: 15,
    winnerOwnerId: null,
    winnerNameOverride: null,
  },
];

const readFromStorage = (): SeasonalAward[] => {
  if (typeof localStorage === "undefined") return defaultAwards;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAwards;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((award) => ({
        ...award,
        amount: Number(award.amount) || defaultAwards.find((a) => a.id === award.id)?.amount || 0,
      })) as SeasonalAward[];
    }
    return defaultAwards;
  } catch (error) {
    console.warn("Unable to read awards from storage; falling back to defaults.", error);
    return defaultAwards;
  }
};

const persistToStorage = (awards: SeasonalAward[]) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(awards));
  } catch (error) {
    console.warn("Unable to persist awards to storage.", error);
  }
};

export const useAwardsStore = defineStore("awards", {
  state: () => ({
    awards: readFromStorage(),
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
      const remote = await fetchAwards();
      if (remote && Array.isArray(remote) && remote.length) {
        this.awards = remote;
        persistToStorage(remote);
      } else {
        // fall back to local cache if remote is unavailable
        this.awards = readFromStorage();
        this.error = "Using local awards cache (remote unavailable).";
      }
      this.loading = false;
      this.initialized = true;
    },
    setAwards(awards: SeasonalAward[]) {
      this.awards = awards;
      persistToStorage(awards);
    },
    async saveAll(awards: SeasonalAward[]) {
      this.loading = true;
      this.error = null;
      const ok = await saveAwards(awards);
      if (!ok) {
        this.error = "Failed to save awards to server; changes kept locally.";
      }
      this.setAwards(awards);
      this.loading = false;
      return ok;
    },
    updateAward(id: SeasonalAwardId, updates: Partial<SeasonalAward>) {
      const nextAwards = this.awards.map((award) =>
        award.id === id ? { ...award, ...updates } : award
      );
      this.setAwards(nextAwards);
    },
    resetAwards() {
      this.setAwards(defaultAwards);
    },
    hydrateFromStorage() {
      this.setAwards(readFromStorage());
    },
    setError(message: string | null) {
      this.error = message;
    },
  },
});

export const defaultSeasonalAwards = defaultAwards;
