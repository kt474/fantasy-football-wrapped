import { defineStore } from "pinia";

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    leagueId: "",
    showAddedAlert: false,
    showRemovedAlert: false,
  }),
  actions: {
    updateDarkMode(payload: boolean) {
      this.darkMode = payload;
    },
    updateLeagueId(payload: string) {
      this.leagueId = payload;
    },
    updateShowAddedAlert(payload: boolean) {
      this.showAddedAlert = payload;
    },
    updateRemovedAlert(payload: boolean) {
      this.showRemovedAlert = payload;
    },
  },
});
