<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store.ts";
import LeagueDNACard from "./LeagueDNACard.vue";
import ManagerArchetypesCard from "./ManagerArchetypesCard.vue";

import {
  buildNarrativeBundle,
  type NarrativeBundle,
  normalizeHistoricalSeasons,
} from "@/lib/narratives";
import type { ManagerBlurbsPayload } from "@/api/api";

const store = useStore();

const seasons = computed(() =>
  normalizeHistoricalSeasons(store.leagueInfo[store.currentLeagueIndex])
);

const narratives = ref<NarrativeBundle>({
  leagueDNA: {
    sample: {
      seasonsAnalyzed: 0,
      distinctManagers: 0,
      averageTeamsPerSeason: 0,
    },
    parity: {
      uniqueChampions: 0,
      championDiversityIndex: 0,
      titlesByManager: {},
      championships: [],
    },
    activity: {
      totalTrades: 0,
      totalWaivers: 0,
      avgTradesPerSeason: 0,
      avgWaiversPerSeason: 0,
      avgTradesPerTeamSeason: 0,
      avgWaiversPerTeamSeason: 0,
    },
    scoring: {
      averageWeeklyScore: 0,
      weeklyScoreStdDev: 0,
      highestWeeklyScore: 0,
      lowestWeeklyScore: 0,
    },
    volatility: {
      averageWeeklyMargin: 0,
      closeGameRate: 0,
      blowoutRate: 0,
    },
  },
  managerArchetypes: [],
});

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
    seasonsAnalyzed: narratives.value.leagueDNA.sample.seasonsAnalyzed,
    totalManagers: narratives.value.leagueDNA.sample.distinctManagers,
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
    totalPointsFor: manager.totalPointsFor,
    totalPointsAgainst: manager.totalPointsAgainst,
    totalTrades: manager.totalTrades,
    tradeValueGained: Math.round(manager.tradeValueGained),
    totalWaivers: manager.totalWaivers,
    averageEfficiency: manager.averageEfficiency,
    playoffAppearances: manager.playoffAppearances,
    relative: {
      titlesRank: relativeRanks.value.titles[manager.userId],
      winRateRank: relativeRanks.value.winRate[manager.userId],
      pointsForRank: relativeRanks.value.pointsFor[manager.userId],
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
  <div class="space-y-4">
    <LeagueDNACard class="mt-4" :league-d-n-a="narratives.leagueDNA" />
    <ManagerArchetypesCard
      :archetypes="narratives.managerArchetypes"
      :payload="managerPayload"
    />
  </div>
</template>
