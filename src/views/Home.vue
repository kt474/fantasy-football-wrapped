<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import CardContainer from "../components/util/CardContainer.vue";
import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import UserLeagueList from "../components/home/UserLeagueList.vue";
import { fakePoints, fakeRosters, fakeUsers } from "../api/helper";
import Input from "../components/util/Input.vue";
import Intro from "../components/home/Intro.vue";
import Table from "../components/standings/Table.vue";
import Tabs from "../components/util/Tabs.vue";
import { useStore } from "../store/store";
import { getData, getLeague, inputLeague } from "../api/api";
import { LeagueInfoType } from "../types/types";
import { useRoute } from "vue-router";

const route = useRoute();
const store = useStore();
const enforcedLeagueId =
  import.meta.env.VITE_DEFAULT_LEAGUE_ID || "1257507151190958081";
const singleLeagueMode = Boolean(enforcedLeagueId);

const showLoading = ref(false);
const isInitialLoading = ref(true);
const selectedSeasonLeagueId = ref<string>("");

const loadLeagueById = async (leagueId: string) => {
  const checkInput: any = await getLeague(leagueId);
  if (!checkInput["name"]) {
    store.showInvalidLeagueAlert = true;
    setTimeout(() => {
      store.showInvalidLeagueAlert = false;
    }, 8000);
    return false;
  }
  try {
    store.updateCurrentLeagueId(leagueId);
    store.updateLoadingLeague(checkInput["name"]);
    const league = await getData(leagueId);
    store.updateLeagueInfo(league);
    await inputLeague(
      leagueId,
      league.name,
      league.totalRosters,
      league.seasonType,
      league.season
    );
    return true;
  } finally {
    store.updateLoadingLeague("");
  }
};

onMounted(async () => {
  try {
    if (localStorage.leagueInfo) {
      const savedLeagues = JSON.parse(localStorage.leagueInfo);
      await Promise.all(
        savedLeagues.map(async (league: LeagueInfoType) => {
          if (!store.leagueIds.includes(league.leagueId)) {
            const currentTime = new Date().getTime();
            const diff = currentTime - league.lastUpdated;
            if (diff > 86400000) {
              // 1 day
              showLoading.value = true;
              if (localStorage.originalData) {
                const currentData = JSON.parse(localStorage.originalData);
                delete currentData[league.leagueId];
                localStorage.originalData = JSON.stringify(currentData);
              }
              store.updateLoadingLeague(league.name);
              const refreshedData = await getData(league.leagueId);
              store.updateLeagueInfo(refreshedData);
              await inputLeague(
                league.leagueId,
                league.name,
                league.totalRosters,
                league.seasonType,
                league.season
              );
              showLoading.value = false;
            } else {
              store.updateLeagueInfo(league);
            }
          }
        })
      );
      store.updateCurrentLeagueId(localStorage.currentLeagueId);
      store.updateLoadingLeague("");
    }
    if (singleLeagueMode) {
      if (!store.leagueIds.includes(enforcedLeagueId)) {
        await loadLeagueById(enforcedLeagueId);
      } else {
        store.updateCurrentLeagueId(enforcedLeagueId);
      }
    } else {
      const leagueId = Array.isArray(route.query.leagueId)
        ? route.query.leagueId[0]
        : route.query.leagueId;
      // sometimes on refresh the leagueId in the URL becomes undefined
      if (leagueId === "undefined") {
        localStorage.removeItem("currentLeagueId");
        localStorage.removeItem("leagueInfo");
        store.showLoadingAlert = true;
        setTimeout(() => {
          store.showLoadingAlert = false;
        }, 8000);
      } else if (leagueId && !store.leagueIds.includes(leagueId)) {
        await loadLeagueById(leagueId);
      }
    }
  } catch {
    store.showLoadingAlert = true;
    setTimeout(() => {
      store.showLoadingAlert = false;
    }, 8000);
  } finally {
    isInitialLoading.value = false;
  }
});

watch(
  () => store.currentLeagueId,
  (newId) => {
    if (newId && newId !== "undefined") {
      selectedSeasonLeagueId.value = newId;
    }
  },
  { immediate: true }
);

const seasonOptions = computed(() => {
  return store.leagueInfo
    .map((league) => ({
      label: league.season ? `Season ${league.season}` : league.name,
      value: league.leagueId,
    }))
    .sort((a, b) => (b.label || "").localeCompare(a.label || ""));
});

const handleSeasonChange = async (leagueId: string) => {
  if (!leagueId || leagueId === store.currentLeagueId) return;
  const existing = store.leagueInfo.find((l) => l.leagueId === leagueId);
  if (existing) {
    store.updateCurrentLeagueId(leagueId);
  } else {
    await loadLeagueById(leagueId);
  }
};
</script>

<template>
  <div class="container w-11/12 max-w-screen-xl mx-auto">
    <SkeletonLoading v-if="isInitialLoading" />
    <div v-else>
      <div v-if="store.currentLeagueId" class="container mx-auto">
        <Input v-if="store.showInput" class="custom-input-width" />
        <div v-if="store.showLeaguesList" class="container mx-auto">
          <UserLeagueList />
        </div>
        <div
          v-if="seasonOptions.length > 0"
          class="flex flex-wrap items-center justify-between gap-2 mt-4"
        >
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Season view
          </p>
          <select
            v-model="selectedSeasonLeagueId"
            @change="handleSeasonChange(selectedSeasonLeagueId)"
            class="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-50"
          >
            <option
              v-for="opt in seasonOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div
          v-if="
            store.leagueUsers[store.currentLeagueIndex] &&
            !store.loadingUserLeagues
          "
        >
          <CardContainer />
          <Tabs class="mt-4" />
          <Table
            :users="store.leagueUsers[store.currentLeagueIndex]"
            :rosters="store.leagueRosters[store.currentLeagueIndex]"
            :points="store.weeklyPoints[store.currentLeagueIndex]"
          />
        </div>
        <SkeletonLoading v-else />
      </div>
      <div v-else-if="store.showLeaguesList" class="container mx-auto">
        <UserLeagueList />
      </div>
      <!-- show loading screen on auto 24 hr refresh -->
      <SkeletonLoading v-else-if="showLoading" />
      <div v-else class="container mx-auto custom-background">
        <Intro v-if="!singleLeagueMode" />
        <Input v-if="!singleLeagueMode" class="w-11/12 mx-auto mb-20 lg:w-2/3 xl:w-1/2" />
        <Tabs class="mt-4" />
        <Table :users="fakeUsers" :rosters="fakeRosters" :points="fakePoints" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.custom-input-width {
  width: 18.9rem;
  @media (min-width: 640px) {
    width: 29.1rem;
  }
}
.custom-background {
  background: linear-gradient(
    90deg,
    rgba(36, 19, 0, 0) 0%,
    rgba(90, 140, 255, 0.1) 54%,
    rgba(0, 187, 255, 0) 100%
  );
}
</style>
