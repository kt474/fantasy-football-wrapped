<script setup lang="ts">
import { findIndex } from "lodash";
import { onMounted, watch, computed } from "vue";
import Table from "./components/Table.vue";
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import Input from "./components/Input.vue";
import Intro from "./components/Intro.vue";
import Alert from "./components/Alert.vue";
import CardContainer from "./components/CardContainer.vue";
import WinnerCard from "./components/WinnerCard.vue";
import BestManagerCard from "./components/BestManagerCard.vue";
import WorstManagerCard from "./components/WorstManagerCard.vue";
import TransactionsCard from "./components/TransactionsCard.vue";
import PowerRankingCard from "./components/PowerRankingCard.vue";
import Chart from "./components/Chart.vue";
import { fakePoints, fakeRosters, fakeUsers } from "./api/helper";
import { useStore, LeagueInfoType } from "./store/store";
import { inject } from "@vercel/analytics";
import { getData } from "./api/api";

const store = useStore();

onMounted(async () => {
  inject();
  setHtmlBackground();
  if (localStorage.leagueInfo) {
    const savedLeagues = JSON.parse(localStorage.leagueInfo);
    savedLeagues.forEach(async (league: LeagueInfoType) => {
      if (!store.leagueIds.includes(league.leagueId)) {
        const currentTime = new Date().getTime();
        const diff = currentTime - league.lastUpdated;
        if (diff > 86400000) {
          // 1 day
          store.updateLeagueInfo(await getData(league.leagueId));
        } else {
          store.updateLeagueInfo(league);
        }
      }
    });
    store.updateCurrentLeagueId(localStorage.currentLeagueId);
  }
});

watch(
  () => store.darkMode,
  () => setHtmlBackground()
);

watch(
  () => store.currentLeagueId,
  () => {
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentLeagueId");
      localStorage.removeItem("leagueInfo");
    } else {
      localStorage.currentLeagueId = store.currentLeagueId;
    }
  }
);

watch(
  () => store.leagueInfo.length,
  () => {
    if (
      store.leagueInfo.length > 0 &&
      !store.showRemovedAlert &&
      store.leagueSubmitted
    ) {
      store.updateShowAddedAlert(true);
      setTimeout(() => {
        store.updateShowAddedAlert(false);
      }, 3000);
      store.leagueSubmitted = false;
    }
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  }
);

const getCurrentLeagueIndex = computed(() => {
  return findIndex(store.leagueInfo, {
    leagueId: store.currentLeagueId,
  });
});

const setHtmlBackground = () => {
  const html = document.querySelector("html");
  if (html) {
    if (store.darkMode) {
      html.style.backgroundColor = "#020617";
    } else {
      html.style.backgroundColor = "#f8fafc";
    }
  }
};
</script>

<template>
  <div :class="{ dark: store.darkMode }" class="h-screen">
    <div class="h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <Header />
      <div class="w-full border-b border-slate-200 dark:border-slate-600"></div>
      <div class="container w-11/12 max-w-screen-xl mx-auto">
        <div v-if="store.currentLeagueId" class="container mx-auto">
          <Input v-if="store.showInput" />
          <div
            v-if="
              store.leagueUsers[getCurrentLeagueIndex] &&
              store.leagueRosters[getCurrentLeagueIndex] &&
              store.weeklyPoints[getCurrentLeagueIndex]
            "
          >
            <CardContainer />
            <div class="flex flex-wrap justify-between mt-4">
              <Table
                class="xl:w-3/4"
                :users="store.leagueUsers[getCurrentLeagueIndex]"
                :rosters="store.leagueRosters[getCurrentLeagueIndex]"
                :points="store.weeklyPoints[getCurrentLeagueIndex]"
              />
              <div
                class="flex flex-wrap justify-between w-full xl:w-fit xl:block xl:flex-grow xl:ml-4 xl:mt-0"
              >
                <WinnerCard
                  v-if="store.leagueInfo[getCurrentLeagueIndex].leagueWinner"
                  class="mt-4 xl:mt-0"
                />
                <BestManagerCard
                  v-if="store.leagueInfo[getCurrentLeagueIndex].leagueWinner"
                  class="mt-4"
                />
                <WorstManagerCard
                  v-if="store.leagueInfo[getCurrentLeagueIndex].leagueWinner"
                  class="mt-4"
                />
                <TransactionsCard
                  v-if="store.leagueInfo[getCurrentLeagueIndex].leagueWinner"
                  class="mt-4"
                />
              </div>
            </div>
            <div class="flex flex-wrap md:flex-nowrap">
              <Chart class="mt-4" />
              <PowerRankingCard class="mt-4 xl:ml-4" />
            </div>
          </div>
          <div v-else role="status" class="flex justify-center m-6">
            <svg
              aria-hidden="true"
              class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
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
            <span class="sr-only">Loading...</span>
          </div>
        </div>
        <div v-else class="container mx-auto">
          <Intro />
          <Input />
          <Table
            class="mt-4"
            :users="fakeUsers"
            :rosters="fakeRosters"
            :points="fakePoints"
          />
        </div>
        <Footer />
      </div>
    </div>
    <Alert v-if="store.showAddedAlert" alert-msg="League successfully added!" />
    <Alert v-if="store.showRefreshAlert" alert-msg="League data refreshed!" />
    <Alert v-if="store.showRemovedAlert" alert-msg="League removed!" />
  </div>
</template>

<style scoped></style>
