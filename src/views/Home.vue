<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from "vue";

import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import UserLeagueList from "../components/home/UserLeagueList.vue";
import { fakePoints, fakeRosters, fakeUsers } from "../api/fakeLeague";
import Input from "@/components/ui/input/Input.vue";
import { useStore } from "../store/store";
import { getData, inputLeague } from "../api/api";
import { getLeague } from "../api/sleeperApi";
import { LeagueInfoType } from "../types/types";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";

const Table = defineAsyncComponent(
  () => import("../components/standings/Table.vue")
);

const route = useRoute();
const router = useRouter();
const store = useStore();

const showLoading = ref(false);
const isInitialLoading = ref(true);
const cachedGoogleSitelinks = ["1218604624068497408", "1057743221285101568"];

const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const clicked = ref(systemDarkMode);

onMounted(async () => {
  try {
    checkSystemTheme();
    const savedLeagueInfo = localStorage.getItem("leagueInfo");
    if (savedLeagueInfo) {
      const savedLeagues = JSON.parse(savedLeagueInfo);
      await Promise.all(
        savedLeagues.map(async (league: LeagueInfoType) => {
          if (!store.leagueIds.includes(league.leagueId)) {
            const currentTime = new Date().getTime();
            const diff = currentTime - league.lastUpdated;
            if (diff > 86400000) {
              // 1 day
              showLoading.value = true;
              const originalData = localStorage.getItem("originalData");
              if (originalData) {
                const currentData = JSON.parse(originalData);
                delete currentData[league.leagueId];
                localStorage.setItem(
                  "originalData",
                  JSON.stringify(currentData)
                );
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
      store.updateCurrentLeagueId(
        localStorage.getItem("currentLeagueId") ?? ""
      );
      store.updateLoadingLeague("");
    }
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (
      leagueId &&
      !store.leagueIds.includes(leagueId) &&
      !cachedGoogleSitelinks.includes(leagueId)
    ) {
      const checkInput = await getLeague(leagueId);
      if (checkInput["name"]) {
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
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        store.updateLoadingLeague("");
      } else {
        toast.error("Invalid League ID");
      }
    } else if (leagueId === "undefined") {
      localStorage.removeItem("currentLeagueId");
      localStorage.removeItem("leagueInfo");
      toast.error("Error fetching data. Please try refreshing the page.");
      // these leagues are somehow being cached in google sitelinks
    } else if (leagueId && cachedGoogleSitelinks.includes(leagueId)) {
      const newQuery = { ...route.query };
      delete newQuery.leagueId;
      router.replace({ path: route.path, query: newQuery });
    }
  } catch {
    toast.error("Error fetching data. Please try refreshing the page.");
  } finally {
    isInitialLoading.value = false;
  }
});

const checkSystemTheme = () => {
  const savedDarkMode = localStorage.getItem("darkMode");
  if (systemDarkMode && savedDarkMode === null) {
    clicked.value = true;
    store.updateDarkMode(true);
  } else if (savedDarkMode !== null) {
    clicked.value = JSON.parse(savedDarkMode);
    store.updateDarkMode(clicked.value);
  }
};
</script>

<template>
  <div>
    <SkeletonLoading v-if="isInitialLoading" />
    <div v-else>
      <div
        v-if="store.currentLeagueId"
        :class="store.currentTab === 'Home' ? '' : 'container mx-auto'"
      >
        <Input v-if="store.showInput" class="custom-input-width" />
        <div v-if="store.showLeaguesList" class="container mx-auto">
          <UserLeagueList />
        </div>
        <div
          v-if="
            store.leagueUsers[store.currentLeagueIndex] &&
            !store.loadingUserLeagues
          "
        >
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

      <SkeletonLoading v-else-if="showLoading" />
      <div
        v-else
        :class="store.currentTab === 'Home' ? '' : 'container mx-auto'"
      >
        <Table :users="fakeUsers" :rosters="fakeRosters" :points="fakePoints" />
      </div>
    </div>
  </div>
</template>
