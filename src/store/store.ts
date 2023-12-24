import { defineStore } from "pinia";

export const useStore = defineStore("main", {
  state: () => ({ darkMode: false }),
  actions: {
    updateDarkMode(payload: boolean) {
      this.darkMode = payload;
    },
  },
});
