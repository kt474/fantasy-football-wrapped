<script setup lang="ts">
import { onMounted, ref } from "vue";
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
    if (leagueId && !store.leagueIds.includes(leagueId)) {
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
  <div class="container w-11/12 max-w-screen-xl mx-auto">
    <SkeletonLoading v-if="isInitialLoading" />
    <div v-else>
      <div v-if="store.currentLeagueId" class="container mx-auto">
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
        <Intro />
        <Input class="w-11/12 mx-auto mb-20 lg:w-2/3 xl:w-1/2" />
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
