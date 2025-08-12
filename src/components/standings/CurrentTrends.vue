<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { generateTrends } from "../../api/api";
import { TableDataType, LeagueInfoType } from "../../api/types";
import { useStore } from "../../store/store";
import { fakeHighlights } from "../../api/helper";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const currentTrends: any = ref("");

const getCurrentStreak = (str: string) => {
  const match = str.match(/([WL])\1*$/);
  if (!match) return "";
  return match[1] + match[0].length;
};

const getFiveMostRecent = (str: string, n = 5) => {
  const recent = str.slice(-n);

  const wins = (recent.match(/W/g) || []).length;
  const losses = (recent.match(/L/g) || []).length;
  return `${wins}-${losses}`;
};

const formatData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const userData = props.tableData.map((user) => {
    return {
      name: user.name,
      record: `${user.wins}-${user.losses}`,
      totalPoints: user.pointsFor,
      currentStreak: user.recordByWeek
        ? getCurrentStreak(user.recordByWeek)
        : "",
      lastFiveResults: user.recordByWeek
        ? getFiveMostRecent(user.recordByWeek)
        : "",
      lastFiveScores: user.points ? user.points.slice(-5) : [],
      currentRanking: user.regularSeasonRank,
    };
  });
  const response = await generateTrends(userData);
  if (Array.isArray(response)) {
    currentTrends.value = response.map((trend: string) =>
      trend.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    );
    store.addCurrentTrends(currentLeague.leagueId, currentTrends.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].currentTrends &&
    store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
  ) {
    formatData();
  } else if (store.leagueInfo.length == 0) {
    currentTrends.value = fakeHighlights;
  } else if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
  ) {
    const savedText: any = store.leagueInfo[store.currentLeagueIndex]
      .currentTrends
      ? store.leagueInfo[store.currentLeagueIndex].currentTrends
      : "";
    currentTrends.value = savedText;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (
      !store.leagueInfo[store.currentLeagueIndex].currentTrends &&
      store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
    ) {
      currentTrends.value = "";
      await formatData();
    }
    currentTrends.value =
      store.leagueInfo[store.currentLeagueIndex].currentTrends;
  }
);

const cardHeight = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    if (currentLeague.rosters.length <= 10) {
      return "295px";
    } else if (currentLeague.rosters.length <= 12) {
      return "495px";
    }
    return "525px";
  }
});
</script>
<template>
  <div
    :style="{ minHeight: cardHeight }"
    class="block w-auto px-6 py-4 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 custom-min-height"
  >
    <h1 class="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">
      League Highlights
    </h1>
    <div v-if="currentTrends">
      <ul
        class="ml-3 mr-0 space-y-2 text-gray-800 list-disc dark:text-gray-200"
      >
        <li v-html="trend" v-for="trend in currentTrends"></li>
      </ul>
    </div>
    <div
      v-else-if="
        store.leagueInfo[store.currentLeagueIndex] &&
        !store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
      "
    >
      <p class="text-gray-600 dark:text-gray-200">
        Please come back after week 1!
      </p>
    </div>
    <div v-else class="w-64">
      <div role="status" class="space-y-2.5 animate-pulse max-w-lg mb-6 px-2">
        <p class="mt-4 text-gray-900 dark:text-gray-300">
          Generating Highlights...
        </p>
        <div class="flex items-center w-full">
          <div
            class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[400px]">
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[440px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
        </div>
        <br />
        <div class="flex items-center w-full max-w-[360px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[400px]">
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>

        <div class="flex items-center w-full max-w-[440px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[360px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <br />
        <div class="flex items-center w-full max-w-[400px]">
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[480px]">
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[440px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-32"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-24"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full"
          ></div>
        </div>
        <div class="flex items-center w-full max-w-[360px]">
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-200 rounded-full dark:bg-gray-700 w-80"
          ></div>
          <div
            class="h-2.5 ms-2 bg-gray-300 rounded-full dark:bg-gray-600 w-full"
          ></div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
@media (min-width: 1280px) {
  .custom-min-height {
    min-height: 495px;
  }
}
</style>
