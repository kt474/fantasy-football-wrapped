import { defineStore } from "pinia";
type LeagueInfo = {
  name: string;
  regularSeasonLength: number;
  rosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
};

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    leagueId: [] as string[],
    showAddedAlert: false,
    showRemovedAlert: false,
    showInput: false,
    leagueInfo: [] as LeagueInfo[],
    leagueRosters: [] as any[],
    leagueUsers: [] as any[],
    weeklyPoints: [] as any[],
  }),
  actions: {
    updateDarkMode(payload: boolean) {
      this.darkMode = payload;
    },
    updateLeagueId(payload: string) {
      if (!this.leagueId.includes(payload)) {
        this.$patch((state) => {
          state.leagueId.push(payload);
        });
      }
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
    updateLeagueRosters(payload: any) {
      this.$patch((state) => {
        state.leagueRosters.push(payload);
      });
    },
    updateLeagueUsers(payload: any) {
      this.$patch((state) => {
        state.leagueUsers.push(payload);
      });
    },
    updateWeeklyPoints(payload: any) {
      this.$patch((state) => {
        state.weeklyPoints.push(payload);
      });
    },
  },
});
