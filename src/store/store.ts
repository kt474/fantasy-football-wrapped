import { defineStore } from "pinia";
import { findIndex } from "lodash";
export type LeagueInfoType = {
  name: string;
  regularSeasonLength: number;
  totalRosters: number;
  season: string;
  seasonType: string;
  leagueId: string;
  leagueWinner: string;
  lastUpdated: string;
  users: [];
  rosters: [];
  weeklyPoints: [];
  transactions: [];
};

export type RosterType = {
  id: string;
  pointsFor: number;
  pointsAgainst: number;
  potentialPoints: number;
  managerEfficiency: number;
  wins: number;
  losses: number;
  rosterId: number;
};

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    showAddedAlert: false,
    showRemovedAlert: false,
    showRefreshAlert: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
    currentLeagueId: "",
    leagueSubmitted: false,
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
    updateCurrentLeagueId(payload: string) {
      this.currentLeagueId = payload;
    },
  },
});
