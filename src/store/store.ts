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
    showLeaguesList: false,
    leaguesList: [] as any[],
    username: "",
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
    addProjectionData(
      index: number,
      rosterId: string,
      projectionData: { projection: number; position: string }[]
    ) {
      const updatedLeagueInfo = [...this.leagueInfo];
      updatedLeagueInfo[index] = {
        ...updatedLeagueInfo[index],
        rosters: updatedLeagueInfo[index].rosters.map((roster) => {
          if (roster && roster.id === rosterId) {
            return {
              ...roster,
              projections: projectionData,
            };
          }
          return roster;
        }),
      };
      this.leagueInfo = updatedLeagueInfo;
    },
    addPlayoffData(
      index: number,
      rosterId: string,
      playoffData: Record<string, any>[]
    ) {
      const updatedLeagueInfo = [...this.leagueInfo];
      updatedLeagueInfo[index] = {
        ...updatedLeagueInfo[index],
        rosters: updatedLeagueInfo[index].rosters.map((roster) => {
          if (roster && roster.id === rosterId) {
            return {
              ...roster,
              projections: playoffData,
            };
          }
          return roster;
        }),
      };
      this.leagueInfo = updatedLeagueInfo;
    },
    addPlayoffOdds(leagueId: string, payload: Record<string, any>[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.playoffProjections = payload;
      }
    },
    updateShowInput(payload: boolean) {
      this.showInput = payload;
    },
    updateCurrentLeagueId(payload: string) {
      this.currentLeagueId = payload;
    },
    updateShowLeaguesList(payload: boolean) {
      this.showLeaguesList = payload;
    },
    setLeaguesList(payload: any[]) {
      this.leaguesList = payload;
    },
  },
});
