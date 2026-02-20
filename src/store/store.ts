import { defineStore } from "pinia";
import findIndex from "lodash/findIndex";
import {
  LeagueInfoType,
  PlayoffProjection,
  RosterType,
  LeagueDraftMetadata,
  WaiverMove,
} from "../types/types";
import { DraftGrades, DraftPick } from "../types/apiTypes";

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
    currentLeagueId: "",
    leagueSubmitted: false,
    currentTab: "Home",
    showLeaguesList: false,
    leaguesList: [] as Record<string, any>[],
    username: "",
    loadingLeague: "",
    loadingUserLeagues: false,
    showUsernames: (() => {
      const value = localStorage.getItem("showUsernames");
      return value !== null ? (JSON.parse(value) as boolean) : false;
    })(),
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
    updateShowUsernames(payload: boolean) {
      this.showUsernames = payload;
    },
    updateLoadingUserLeagues(payload: boolean) {
      this.loadingUserLeagues = payload;
    },
    updateLoadingLeague(payload: string) {
      this.loadingLeague = payload;
    },
    updateDarkMode(payload: boolean) {
      this.darkMode = payload;
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
    addPlayoffOdds(leagueId: string, payload: PlayoffProjection[]) {
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
    addCurrentTrends(leagueId: string, payload: string[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.currentTrends = payload;
      }
    },
    addTradeNames(leagueId: string, payload: any[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.tradeNames = payload;
      }
    },
    addWaiverMoves(leagueId: string, payload: WaiverMove[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.waiverMoves = payload;
      }
    },
    addDraftPicks(leagueId: string, payload: DraftPick[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.draftPicks = payload;
      }
    },
    addDraftMetadata(leagueId: string, payload: LeagueDraftMetadata) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.draftMetadata = payload;
      }
    },
    addDraftGrades(leagueId: string, payload: DraftGrades[]) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.draftGrades = payload;
      }
    },
    addPlayerRankings(leagueId: string, payload: any) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.playerRankings = payload;
      }
    },
    addRosterRankings(leagueId: string, payload: any) {
      const item = this.leagueInfo.find((obj) => obj.leagueId === leagueId);
      if (item) {
        item.rosterRankings = payload;
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
