import { defineStore } from "pinia";
import findIndex from "lodash/findIndex";
import {
  LeagueInfoType,
  PlayoffProjection,
  RosterType,
  LeagueDraftMetadata,
  WaiverMove,
  PlayerRankingsType,
  PlayerType,
  UserLeagueListItem,
  TradeNameRow,
} from "../types/types";
import { DraftGrades, DraftPick } from "../types/apiTypes";
import { getParsedStorageItem, isBoolean } from "@/lib/storage";

export const getLeagueKey = ({
  leagueId,
  platform,
  season,
}: Pick<LeagueInfoType, "leagueId"> &
  Partial<Pick<LeagueInfoType, "platform" | "season">>) => {
  return platform === "espn" ? `espn:${leagueId}:${season ?? ""}` : leagueId;
};

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
    currentLeagueId: "",
    leagueSubmitted: false,
    currentTab: "Home",
    showLeaguesList: false,
    leaguesList: [] as UserLeagueListItem[],
    username: "",
    loadingLeague: "",
    loadingUserLeagues: false,
    showUsernames: getParsedStorageItem("showUsernames", false, {
      isValid: isBoolean,
    }),
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
      state.leagueInfo.map((league: LeagueInfoType) => getLeagueKey(league)),
    currentLeagueIndex: (state) => {
      return findIndex(
        state.leagueInfo,
        (league) => getLeagueKey(league) === state.currentLeagueId
      );
    },
  },
  actions: {
    findLeague(leagueId: string) {
      const keyedLeague = this.leagueInfo.find(
        (league) => getLeagueKey(league) === leagueId
      );
      if (keyedLeague) {
        return keyedLeague;
      }

      const rawLeagueIdMatches = this.leagueInfo.filter(
        (league) => league.leagueId === leagueId
      );
      return rawLeagueIdMatches.length === 1
        ? rawLeagueIdMatches[0]
        : undefined;
    },
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
      const existingIndex = this.leagueInfo.findIndex(
        (league) => getLeagueKey(league) === getLeagueKey(payload)
      );
      if (existingIndex === -1) {
        this.$patch((state) => {
          state.leagueInfo.push(payload);
        });
        return;
      }

      this.$patch((state) => {
        state.leagueInfo[existingIndex] = payload;
      });
    },
    addProjectionData(
      leagueId: string,
      rosterId: string,
      projectionData: { projection: number; position: string }[]
    ) {
      const index = this.leagueInfo.findIndex(
        (league) => getLeagueKey(league) === leagueId
      );
      if (index === -1) {
        return;
      }
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
      const item = this.findLeague(leagueId);
      if (item) {
        item.playoffProjections = payload;
      }
    },
    addWeeklyPreview(leagueId: string, payload: string) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.weeklyPreview = payload;
      }
    },
    addWeeklyReport(leagueId: string, payload: string) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.weeklyReport = payload;
      }
    },
    addPremiumWeeklyReport(leagueId: string, payload: string) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.premiumWeeklyReport = payload;
      }
    },
    addManagerProfiles(leagueId: string, payload: Record<string, string>) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.managerProfiles = payload;
      }
    },
    addCurrentTrends(leagueId: string, payload: string[]) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.currentTrends = payload;
      }
    },
    addTradeNames(leagueId: string, payload: TradeNameRow[]) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.tradeNames = payload;
      }
    },
    addWaiverMoves(leagueId: string, payload: WaiverMove[]) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.waiverMoves = payload;
      }
    },
    addDraftPicks(leagueId: string, payload: DraftPick[]) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.draftPicks = payload;
      }
    },
    addDraftMetadata(leagueId: string, payload: LeagueDraftMetadata) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.draftMetadata = payload;
      }
    },
    addDraftGrades(leagueId: string, payload: DraftGrades[]) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.draftGrades = payload;
      }
    },
    addPlayerRankings(
      leagueId: string,
      payload: PlayerRankingsType | Record<string, unknown[]>
    ) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.playerRankings = payload as PlayerRankingsType;
      }
    },
    addRosterRankings(
      leagueId: string,
      payload: Record<string, PlayerType[] | unknown[]>
    ) {
      const item = this.findLeague(leagueId);
      if (item) {
        item.rosterRankings = payload as Record<string, PlayerType[]>;
      }
    },
    addYearEndReport(leagueId: string, payload: string) {
      const item = this.findLeague(leagueId);
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
    setLeaguesList(payload: UserLeagueListItem[]) {
      this.leaguesList = payload;
    },
  },
});
