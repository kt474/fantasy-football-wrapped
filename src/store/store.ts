import { defineStore } from "pinia";

export const useStore = defineStore("main", {
  state: () => ({ darkMode: false, leagueId: "" }),
  actions: {
    updateDarkMode(payload: boolean) {
      this.darkMode = payload;
    },
    updateLeagueId(payload: string) {
      this.leagueId = payload;
    },
  },
});
