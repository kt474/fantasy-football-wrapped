<script setup lang="ts">
import { computed } from "vue";
import { LeagueInfoType } from "../../api/types";
import { useStore } from "../../store/store";

const props = defineProps<{
  league?: LeagueInfoType;
}>();

const store = useStore();

const league = computed(() => {
  if (props.league) return props.league;
  if (store.currentLeagueId) {
    return store.leagueInfo[store.currentLeagueIndex];
  }
  return null;
});

const scoringLabel = computed(() => {
  if (!league.value) return "—";
  const scoring = league.value.scoringType;
  if (scoring === 0) return "Standard";
  if (scoring === 0.5) return "Half-PPR";
  if (scoring === 1) return "PPR";
  return `${scoring} scoring`;
});

const playoffType = computed(() => {
  if (!league.value) return "—";
  if (league.value.playoffType === 0) return "Standard Bracket";
  if (league.value.playoffType === 1) return "Losers Bracket";
  return "Custom";
});

const waiverType = computed(() => {
  if (!league.value) return "—";
  if (league.value.waiverType === 0) return "Rolling / Reverse Standings";
  if (league.value.waiverType === 1) return "FAAB";
  return "Unknown";
});

const rosterCounts = computed(() => {
  if (!league.value?.rosterPositions) return [];
  const counts: Record<string, number> = {};
  league.value.rosterPositions.forEach((pos: string) => {
    counts[pos] = (counts[pos] || 0) + 1;
  });
  return Object.entries(counts).map(([pos, count]) => ({ pos, count }));
});
</script>

<template>
  <div class="mt-4">
    <div v-if="!league" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      Add a league to view its overview.
    </div>
    <div v-else class="space-y-4">
      <div
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr"
      >
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            League
          </p>
          <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ league.name }}
          </p>
          <p class="text-sm text-gray-500">
            {{ league.seasonType }} • {{ league.season }}
          </p>
        </div>
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Teams & Season
          </p>
          <p class="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {{ league.totalRosters }}
          </p>
          <p class="text-sm text-gray-500">
            Regular season {{ league.regularSeasonLength }} weeks
          </p>
        </div>
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Scoring
          </p>
          <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ scoringLabel }}
          </p>
          <p class="text-sm text-gray-500">
            Median scoring: {{ league.medianScoring ? "On" : "Off" }}
          </p>
        </div>
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Playoffs & Waivers
          </p>
          <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ league.playoffTeams }} teams • {{ playoffType }}
          </p>
          <p class="text-sm text-gray-500">Waivers: {{ waiverType }}</p>
        </div>
      </div>

      <div
        class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        >
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Roster & lineup settings
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              Slot counts and lineup requirements
            </p>
          </div>
          <span
            class="px-3 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-200"
          >
            {{ league.rosterPositions?.length || 0 }} slots
          </span>
        </div>
        <div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
          <div
            v-for="slot in rosterCounts"
            :key="slot.pos"
            class="flex items-center justify-between px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <span class="font-semibold text-gray-800 dark:text-gray-100">
              {{ slot.pos }}
            </span>
            <span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200">
              ×{{ slot.count }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        >
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Status
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              League state and last scored week
            </p>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Current status
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-50">
              {{ league.status || "—" }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Last scored week
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-50">
              {{ league.lastScoredWeek ?? "—" }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Current week
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-50">
              {{ league.currentWeek ?? "—" }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
