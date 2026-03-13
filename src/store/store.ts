import { defineStore } from "pinia";
import findIndex from "lodash/findIndex";
import {
  FantasyProviderId,
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
import {
  buildLeagueKey,
  DEFAULT_FANTASY_PROVIDER,
  normalizeLeagueInfo,
  normalizeUserLeagueListItem,
  resolveLeagueKey,
} from "@/lib/leagueIdentity";

const parseLeagueKey = (leagueKey: string) => {
  const separatorIndex = leagueKey.indexOf(":");
  if (separatorIndex === -1) {
    return {
      provider: DEFAULT_FANTASY_PROVIDER,
      leagueId: leagueKey,
    };
  }

  return {
    provider: leagueKey.slice(0, separatorIndex) as FantasyProviderId,
    leagueId: leagueKey.slice(separatorIndex + 1),
  };
};

export const useStore = defineStore("main", {
  state: () => ({
    darkMode: false,
    showInput: false,
    leagueInfo: [] as LeagueInfoType[],
    currentLeagueKey: "",
    leagueSubmitted: false,
    currentTab: "Home",
    showLeaguesList: false,
    leaguesList: [] as UserLeagueListItem[],
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
    leagueKeys: (state) =>
      state.leagueInfo.map((league: LeagueInfoType) => league.leagueKey),
    currentLeagueId: (state) =>
      state.leagueInfo.find(
        (league: LeagueInfoType) => league.leagueKey === state.currentLeagueKey
      )?.leagueId ?? parseLeagueKey(state.currentLeagueKey).leagueId,
    currentLeagueProvider: (state): FantasyProviderId =>
      state.leagueInfo.find(
        (league: LeagueInfoType) => league.leagueKey === state.currentLeagueKey
      )?.provider ?? parseLeagueKey(state.currentLeagueKey).provider,
    currentLeagueIndex: (state) => {
      return findIndex(state.leagueInfo, {
        leagueKey: state.currentLeagueKey,
      });
    },
  },
  actions: {
    findLeague(leagueIdOrKey: string) {
      const resolvedKey = resolveLeagueKey(this.leagueInfo, leagueIdOrKey);
      return this.leagueInfo.find((obj) => obj.leagueKey === resolvedKey);
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
      const normalizedPayload = normalizeLeagueInfo(payload);
      const alreadyExists = this.leagueInfo.some(
        (league) => league.leagueKey === normalizedPayload.leagueKey
      );
      if (!alreadyExists) {
        this.$patch((state) => {
          state.leagueInfo.push(normalizedPayload);
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
      const item = this.findLeague(leagueId);
      if (item) {
        item.playoffProjections = payload;
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
    updateCurrentLeagueKey(payload: string) {
      this.currentLeagueKey = resolveLeagueKey(this.leagueInfo, payload);
    },
    updateCurrentLeagueId(
      payload: string,
      provider: FantasyProviderId = DEFAULT_FANTASY_PROVIDER
    ) {
      this.currentLeagueKey = buildLeagueKey(provider, payload);
    },
    updateShowLeaguesList(payload: boolean) {
      this.showLeaguesList = payload;
    },
    setLeaguesList(payload: UserLeagueListItem[]) {
      this.leaguesList = payload.map((league) => normalizeUserLeagueListItem(league));
    },
  },
});
