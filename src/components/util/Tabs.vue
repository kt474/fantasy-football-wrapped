<script setup lang="ts">
import { useStore } from "../../store/store";
const store = useStore();

const weeklyReportEnabled = Boolean(import.meta.env.VITE_WEEKLY_REPORT);
const startSitEnabled = Boolean(import.meta.env.VITE_PLAYER_NEWS);

const changeTab = (tab: string) => {
  if (tab === "weeklyReport" && !weeklyReportEnabled) return;
  if (tab === "startSit" && !startSitEnabled) return;
  store.currentTab = tab;
  localStorage.currentTab = tab;
};
</script>
<template>
<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
  <ul
    class="flex overflow-x-auto text-sm font-medium text-center text-gray-600 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200 sticky top-0 z-30 bg-gray-50/95 backdrop-blur dark:bg-gray-950/95 scroll-smooth scrollbar-hide"
  >
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('leagueOverview')"
        aria-current="page"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'leagueOverview'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Overview
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('standings')"
        aria-current="page"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'standings'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Standings
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('powerRankings')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'powerRankings'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        <span class="block xl:hidden">Rankings</span>
        <span class="hidden xl:block">Power Rankings</span>
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('expectedWins')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'expectedWins'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        <span class="block sm:hidden">Exp. Wins</span>
        <span class="hidden sm:block">Expected Wins</span>
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('transactions')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'transactions'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Transactions
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('playoffs')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'playoffs'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Playoffs
      </button>
    </li>
    <li v-if="weeklyReportEnabled" class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('weeklyReport')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'weeklyReport'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        <span class="hidden sm:inline">Weekly</span>
        Report
      </button>
    </li>
    <li v-if="startSitEnabled" class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('startSit')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'startSit'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Start/Sit
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('draft')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'draft'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Draft
      </button>
    </li>
    <li class="cursor-pointer me-2 flex-shrink-0">
      <button
        @click="changeTab('leagueHistory')"
        class="inline-block p-2 rounded-t-lg sm:p-4 whitespace-nowrap"
        :class="[
          store.currentTab === 'leagueHistory'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        <span class="hidden sm:inline">League</span> History
      </button>
    </li>
  </ul>
</template>
