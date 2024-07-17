import { defineStore } from "pinia";
import { findIndex } from "lodash";
import { LeagueInfoType, RosterType } from "../api/types";

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    showAddedAlert: false,
    showRemovedAlert: false,
    showRefreshAlert: false,
    showCopiedAlert: false,
    showLeagueExistsAlert: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
    currentLeagueId: "",
    leagueSubmitted: false,
    currentTab: "standings",
  }),
  getters: {
    transactions: (state) =>
      state.leagueInfo.map((league: LeagueInfoType) => league.transactions),
    leagueUsers: (state) =>
      state.leagueInfo.map((league: LeagueInfoType) => league.users),
    leagueRosters: (state) =>
      state.leagueInfo.map(
        (league: LeagueInfoType) => league.rosters as RosterType[]
      ),
    weeklyPoints: (state) =>
      state.leagueInfo.map((league: LeagueInfoType) => league.weeklyPoints),
    leagueIds: (state) =>
      state.leagueInfo.map((league: LeagueInfoType) => league.leagueId),
    currentLeagueIndex: (state) => {
      return findIndex(state.leagueInfo, {
        leagueId: state.currentLeagueId,
      });
    },
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
    updateExistsAlert(payload: boolean) {
      this.showLeagueExistsAlert = payload;
    },
    updateLeagueInfo(payload: LeagueInfoType) {
      if (!this.leagueInfo.includes(payload)) {
        this.$patch((state) => {
          state.leagueInfo.push(payload);
        });
      }
    },
    updateShowInput(payload: boolean) {
      this.showInput = payload;
    },
    updateCurrentLeagueId(payload: string) {
      this.currentLeagueId = payload;
    },
  },
});
