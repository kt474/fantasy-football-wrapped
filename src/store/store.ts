import { defineStore } from "pinia";
export type LeagueInfoType = {
  name: string;
  regularSeasonLength: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  users?: [];
  rosters?: [];
  weeklyPoints?: [];
};

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    showAddedAlert: false,
    showRemovedAlert: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
  }),
  getters: {
    leagueUsers: (state) => state.leagueInfo.map((league) => league.users),
    leagueRosters: (state) => state.leagueInfo.map((league) => league.rosters),
    weeklyPoints: (state) =>
      state.leagueInfo.map((league) => league.weeklyPoints),
  },
  actions: {
    updateDarkMode(payload: boolean) {
      this.darkMode = payload;
    },
    updateShowAddedAlert(payload: boolean) {
      this.showAddedAlert = payload;
    },
    updateRemovedAlert(payload: boolean) {
      this.showRemovedAlert = payload;
    },
    updateLeagueInfo(payload: any) {
      if (!this.leagueInfo.includes(payload)) {
        this.$patch((state) => {
          state.leagueInfo.push(payload);
        });
      }
    },
    updateShowInput(payload: boolean) {
      this.showInput = payload;
    },
  },
});
