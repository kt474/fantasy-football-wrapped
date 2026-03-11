<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store.ts";
import ManagerArchetypesCard from "./ManagerArchetypesCard.vue";
import LeagueHistory from "../league_history/LeagueHistory.vue";
import { TableDataType } from "@/types/types.ts";
import {
  buildNarrativeBundle,
  type NarrativeBundle,
  normalizeHistoricalSeasons,
} from "@/lib/narratives";
import type { ManagerBlurbsPayload } from "@/api/api";

const store = useStore();

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
const areNarrativesReady = computed(
  () => narratives.value.managerArchetypes.length > 0
);

watch(
  seasons,
  async (nextSeasons) => {
    narratives.value = await buildNarrativeBundle(nextSeasons);
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
  };
});

const managerPayload = computed<ManagerBlurbsPayload>(() => ({
  league: {
    leagueId: store.leagueInfo[store.currentLeagueIndex]?.leagueId ?? "",
    leagueName: store.leagueInfo[store.currentLeagueIndex]?.name ?? "",
    seasonsAnalyzed: seasons.value.length,
    totalManagers: narratives.value.managerArchetypes.length,
  },
  managers: narratives.value.managerArchetypes.map((manager) => ({
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
    },
  })),
}));
</script>
<template>
  <div class="my-4 space-y-4">
    <LeagueHistory
      v-show="false"
      :table-data="tableData"
      @ready="isLeagueHistoryReady = true"
    />
    <ManagerArchetypesCard
      v-if="isLeagueHistoryReady && areNarrativesReady"
      :archetypes="narratives.managerArchetypes"
      :payload="managerPayload"
    />
    <ManagerArchetypesCard
      v-else-if="store.leagueInfo.length === 0"
      :archetypes="[]"
      :payload="managerPayload"
    />
    <div v-else>Loading all seasons...</div>
  </div>
</template>
