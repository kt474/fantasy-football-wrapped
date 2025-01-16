<script setup lang="ts">
import { onMounted, ref } from "vue";
import CardContainer from "../components/util/CardContainer.vue";
import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import UserLeagueList from "../components/home/UserLeagueList.vue";
import { fakePoints, fakeRosters, fakeUsers } from "../api/helper";
import Input from "../components/util/Input.vue";
import Intro from "../components/home/Intro.vue";
import Table from "../components/standings/Table.vue";
import { useStore } from "../store/store";
import { getData, getLeague, inputLeague } from "../api/api";
import { LeagueInfoType } from "../api/types";

const store = useStore();

const showLoading = ref(false);

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
              if (localStorage.originalData) {
                const currentData = JSON.parse(localStorage.originalData);
                delete currentData[league.leagueId];
                localStorage.originalData = JSON.stringify(currentData);
              }
              showLoading.value = true;
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
              store.updateLoadingLeague("");
              showLoading.value = false;
            } else {
              store.updateLeagueInfo(league);
            }
          }
        })
      );

      store.updateCurrentLeagueId(localStorage.currentLeagueId);
    }
    const queryParams = new URLSearchParams(window.location.search);
    const leagueId = queryParams.get("leagueId");
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (
      leagueId &&
      leagueId !== "undefined" &&
      !store.leagueIds.includes(leagueId)
    ) {
      const checkInput: any = await getLeague(leagueId);
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
      }
    } else if (leagueId === "undefined") {
      localStorage.clear(); // this might be an anti pattern
    }
  } catch {
    store.showLoadingAlert = true;
    setTimeout(() => {
      store.showLoadingAlert = false;
    }, 8000);
  }
});
</script>

<template>
  <div class="container w-11/12 max-w-screen-xl mx-auto">
    <div v-if="store.currentLeagueId" class="container mx-auto">
      <label
        v-if="store.showInput"
        class="block mt-3 -mb-3 text-sm font-medium text-gray-900 dark:text-white"
        >Add League</label
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
        <CardContainer />
        <Table
          class="mt-4"
          :users="store.leagueUsers[store.currentLeagueIndex]"
          :rosters="store.leagueRosters[store.currentLeagueIndex]"
          :points="store.weeklyPoints[store.currentLeagueIndex]"
        />
      </div>
      <div
        v-else
        role="status"
        class="flex flex-wrap justify-center h-full mt-4 mb-32"
      >
        <svg
          aria-hidden="true"
          class="w-8 h-8 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
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
        <SkeletonLoading />
      </div>
    </div>
    <div v-else-if="store.showLeaguesList" class="container mx-auto">
      <UserLeagueList />
    </div>
    <!-- show loading screen on auto 24 hr refresh -->
    <div
      v-else-if="showLoading"
      role="status"
      class="flex flex-wrap justify-center h-full mt-4 mb-32"
    >
      <svg
        aria-hidden="true"
        class="w-8 h-8 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
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
      <SkeletonLoading />
    </div>
    <div v-else class="container mx-auto custom-background">
      <Intro />
      <Input class="w-11/12 mx-auto mb-20 lg:w-2/3 xl:w-1/2" />
      <Table
        class="mt-4"
        :users="fakeUsers"
        :rosters="fakeRosters"
        :points="fakePoints"
      />
    </div>
  </div>
</template>
<style scoped>
.custom-input-width {
  width: 18.5rem;
  @media (min-width: 640px) {
    width: 25.8rem;
  }
}
.custom-background {
  background: rgb(36, 19, 0);
  background: linear-gradient(
    90deg,
    rgba(36, 19, 0, 0) 0%,
    rgba(161, 108, 233, 0.115) 54%,
    rgba(0, 187, 255, 0) 100%
  );
}
</style>
