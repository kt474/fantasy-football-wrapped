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
    showCopyReport: false,
    showLoadingAlert: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
    currentLeagueId: "",
    leagueSubmitted: false,
    currentTab: "standings",
    showLeaguesList: false,
    leaguesList: [] as any[],
    username: "",
    loadingLeague: "",
    loadingUserLeagues: false,
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
    updateLoadingUserLeagues(payload: boolean) {
      this.loadingUserLeagues = payload;
    },
    updateLoadingLeague(payload: string) {
      this.loadingLeague = payload;
    },
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
    addPlayoffOdds(leagueId: string, payload: Record<string, any>[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.playoffProjections = payload;
      }
    },
    addWeeklyReport(leagueId: string, payload: string) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.weeklyReport = payload;
      }
    },
    addTradeNames(leagueId: string, payload: any[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.tradeNames = payload;
      }
    },
    addDraftPicks(leagueId: string, payload: any[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.draftPicks = payload;
      }
    },
    addDraftMetadata(leagueId: string, payload: any) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.draftMetadata = payload;
      }
    },
    addPlayerRankings(leagueId: string, payload: any) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.playerRankings = payload;
      }
    },
    addYearEndReport(leagueId: string, payload: string) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.yearEndReport = payload;
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
