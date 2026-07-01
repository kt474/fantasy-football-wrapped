<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { useStore } from "../../store/store.ts";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription.ts";
import ManagerArchetypesCard from "./ManagerArchetypesCard.vue";
import { LeagueInfoType, TableDataType } from "@/types/types.ts";
import {
  buildNarrativeBundle,
  type NarrativeBundle,
  normalizeHistoricalSeasons,
} from "@/lib/narratives";
import type { ManagerBlurbsPayload } from "@/api/api";
import { getDraftMetadata, getDraftPicks } from "@/api/sleeperApi";
import { fakeManagerProfiles } from "@/api/fakeLeague.ts";
import ManagerComparison from "../league_history/ManagerComparison.vue";

const store = useStore();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const LeagueHistory = defineAsyncComponent(
  () => import("../league_history/LeagueHistory.vue")
);

const props = defineProps<{
  tableData: TableDataType[];
}>();
const seasons = computed(() =>
  normalizeHistoricalSeasons(store.leagueInfo[store.currentLeagueIndex])
);

const narratives = ref<NarrativeBundle>({
  managerArchetypes: [],
});
const isLeagueHistoryReady = ref(false);

type PointSeasonEntry = {
  season: string;
  points: number[];
};

type HistoricalManagerRow = {
  id: string;
  name: string;
  username: string;
  avatarImg?: string;
  matchups: (number | null)[];
  pointsArr: number[];
  leagueWinner: (number | null)[];
  rosterId: number;
  pointSeason: PointSeasonEntry[];
  wins: number;
  losses: number;
  points: number;
  randomScheduleWins: number;
  managerEfficiency: number;
  seasons: string[];
};

const historicalManagerRows = ref<HistoricalManagerRow[]>([]);
const leagueHistoryLoadingYear = ref("");
const areNarrativesReady = computed(
  () => narratives.value.managerArchetypes.length > 0
);
const hasCompletedSeasonData = computed(() => seasons.value.length > 0);
const showNoCompletedSeasonData = computed(
  () =>
    store.leagueInfo.length > 0 &&
    isLeagueHistoryReady.value &&
    !hasCompletedSeasonData.value
);

const hydrateLeagueDraftPicks = async (league: LeagueInfoType) => {
  if (
    league.platform === "espn" ||
    !league.draftId ||
    league.draftPicks?.length
  ) {
    return;
  }

  const draftMetadata = await getDraftMetadata(league.draftId);
  const draftType =
    typeof draftMetadata.type === "string" ? draftMetadata.type : undefined;

  league.draftPicks = await getDraftPicks(
    league.draftId,
    league.season,
    league.scoringType,
    league.seasonType,
    draftType
  );
};

const ensureHistoricalDraftData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (!currentLeague) {
    return;
  }

  const leagues = [currentLeague, ...(currentLeague.previousLeagues ?? [])];
  await Promise.all(leagues.map((league) => hydrateLeagueDraftPicks(league)));
  localStorage.setItem("leagueInfo", JSON.stringify(store.leagueInfo));
};

const rebuildNarratives = async () => {
  narratives.value = await buildNarrativeBundle(
    normalizeHistoricalSeasons(store.leagueInfo[store.currentLeagueIndex])
  );
};

const prepareManagerPayload = async () => {
  if (store.leagueInfo.length > 0) {
    await ensureHistoricalDraftData();
    await rebuildNarratives();
  }

  return managerPayload.value;
};

watch(
  [seasons, isLeagueHistoryReady],
  async ([, historyReady]) => {
    if (store.leagueInfo.length > 0 && !historyReady) {
      return;
    }

    await rebuildNarratives();
  },
  { immediate: true }
);

const getDescendingRankMap = (
  values: { userId: string; value: number }[]
): Record<string, number> => {
  const sorted = [...values].sort((left, right) => right.value - left.value);
  const rankMap: Record<string, number> = {};

  sorted.forEach((entry, index) => {
    const previous = sorted[index - 1];
    if (previous && previous.value === entry.value) {
      rankMap[entry.userId] = rankMap[previous.userId];
      return;
    }
    rankMap[entry.userId] = index + 1;
  });

  return rankMap;
};

const relativeRanks = computed(() => {
  const managers = narratives.value.managerArchetypes;

  return {
    titles: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.titles,
      }))
    ),
    winRate: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.winRate,
      }))
    ),
    pointsFor: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.totalPointsFor,
      }))
    ),
    pointsAgainst: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.totalPointsAgainst,
      }))
    ),
    trades: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.totalTrades,
      }))
    ),
    waivers: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.totalWaivers,
      }))
    ),
    efficiency: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.averageEfficiency,
      }))
    ),
    pointsPerSeason: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.averagePointsPerSeason,
      }))
    ),
    tradeValueGained: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.tradeValueGained,
      }))
    ),
    draftPickRank: getDescendingRankMap(
      managers.map((manager) => ({
        userId: manager.userId,
        value: manager.averageDraftPickRank ?? -10,
      }))
    ),
  };
});

const managerPayload = computed<ManagerBlurbsPayload>(() => {
  const hasPremiumAccess =
    authStore.isAuthenticated && subscriptionStore.isPremium;
  const managers = hasPremiumAccess
    ? narratives.value.managerArchetypes
    : narratives.value.managerArchetypes.slice(0, 1);

  return {
    league: {
      leagueId: store.leagueInfo[store.currentLeagueIndex]?.leagueId ?? "",
      leagueName: store.leagueInfo[store.currentLeagueIndex]?.name ?? "",
      seasonsAnalyzed: seasons.value.length,
      totalManagers: narratives.value.managerArchetypes.length,
    },
    managers: managers.map((manager) => ({
      userId: manager.userId,
      name: manager.displayName,
      seasons: manager.seasons,
      titles: manager.titles,
      record:
        manager.totalTies === 0
          ? `${manager.totalWins}-${manager.totalLosses}`
          : `${manager.totalWins}-${manager.totalLosses}-${manager.totalTies}`,
      winRate: manager.winRate,
      totalPointsScored: manager.totalPointsFor,
      totalPointsAgainst: manager.totalPointsAgainst,
      totalTrades: manager.totalTrades,
      tradeValueGained: Math.round(manager.tradeValueGained),
      totalWaivers: manager.totalWaivers,
      averageEfficiency: manager.averageEfficiency,
      averageDraftPickRank:
        manager.averageDraftPickRank === null
          ? null
          : Number(manager.averageDraftPickRank.toFixed(2)),
      playoffAppearances: manager.playoffAppearances,
      relative: {
        titlesRank: relativeRanks.value.titles[manager.userId],
        winRateRank: relativeRanks.value.winRate[manager.userId],
        pointsScoredRank: relativeRanks.value.pointsFor[manager.userId],
        pointsAgainstRank: relativeRanks.value.pointsAgainst[manager.userId],
        tradesRank: relativeRanks.value.trades[manager.userId],
        waiversRank: relativeRanks.value.waivers[manager.userId],
        efficiencyRank: relativeRanks.value.efficiency[manager.userId],
        tradeValueGainedRank:
          relativeRanks.value.tradeValueGained[manager.userId],
        draftAbilityRank: relativeRanks.value.draftPickRank[manager.userId],
      },
    })),
  };
});
</script>
<template>
  <div class="my-4 space-y-4">
    <LeagueHistory
      v-show="false"
      :table-data="props.tableData"
      @ready="isLeagueHistoryReady = true"
      @history-data="historicalManagerRows = $event"
      @loading-year="leagueHistoryLoadingYear = $event"
    />
    <ManagerArchetypesCard
      v-if="isLeagueHistoryReady && areNarrativesReady"
      :archetypes="narratives.managerArchetypes"
      :payload="managerPayload"
      :prepare-payload="prepareManagerPayload"
    />
    <ManagerArchetypesCard
      v-else-if="store.leagueInfo.length === 0"
      :archetypes="fakeManagerProfiles"
      :payload="managerPayload"
    />
    <div
      v-else-if="showNoCompletedSeasonData"
      class="p-4 border rounded-lg md:p-6"
    >
      <p class="text-3xl font-bold">Manager Profiles</p>
      <p class="mt-2 text-muted-foreground">Please come back after week 1!</p>
    </div>
    <div v-else class="h-screen">
      <svg
        aria-hidden="true"
        class="w-8 h-8 mx-auto mt-4 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <p v-if="leagueHistoryLoadingYear" class="flex justify-center text-lg">
        Loading
        <span class="font-bold">&nbsp;{{ leagueHistoryLoadingYear }}&nbsp;</span
        >season...
      </p>
    </div>
    <ManagerComparison
      v-if="isLeagueHistoryReady && historicalManagerRows.length > 1"
      :table-data="historicalManagerRows"
      :manager-archetypes="narratives.managerArchetypes"
    />
  </div>
</template>
