<script setup lang="ts">
import { onMounted, ref } from "vue";
import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import { useStore } from "../store/store";
import { getData, getLeague, inputLeague } from "../api/api";
import { LeagueInfoType } from "../types/types";
import { useRoute, useRouter } from "vue-router";
import Test from "./Test.vue";

const route = useRoute();
const router = useRouter();
const store = useStore();

const showLoading = ref(false);
const isInitialLoading = ref(true);

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
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (
      leagueId &&
      !store.leagueIds.includes(leagueId) &&
      leagueId !== "1057743221285101568"
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
        store.updateLoadingLeague("");
      } else {
        store.showInvalidLeagueAlert = true;
        setTimeout(() => {
          store.showInvalidLeagueAlert = false;
        }, 8000);
      }
    } else if (leagueId === "undefined") {
      localStorage.removeItem("currentLeagueId");
      localStorage.removeItem("leagueInfo");
      store.showLoadingAlert = true;
      setTimeout(() => {
        store.showLoadingAlert = false;
      }, 8000);
      // this league has somehow been cached in google sitelinks
    } else if (leagueId === "1057743221285101568") {
      const newQuery = { ...route.query };
      delete newQuery.leagueId;
      router.replace({ path: route.path, query: newQuery });
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
</script>

<template>
  <div class="mx-auto">
    <SkeletonLoading v-if="isInitialLoading" />
    <Test />
  </div>
</template>
