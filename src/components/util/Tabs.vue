<script setup lang="ts">
import { useStore } from "../../store/store";
const store = useStore();

const changeTab = (tab: string) => {
  store.currentTab = tab;
  localStorage.currentTab = tab;
};
</script>
<template>
  <ul
    class="flex flex-wrap text-sm font-medium text-center text-gray-600 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200"
  >
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('wrapped')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="[
          store.currentTab === 'wrapped'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Wrapped 🎉
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('standings')"
        aria-current="page"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="[
          store.currentTab === 'standings'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Standings
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('powerRankings')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
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
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('expectedWins')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
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
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('managerEfficiency')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="[
          store.currentTab === 'managerEfficiency'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Roster
        <span class="hidden xl:inline">Management</span>
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('playoffs')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="[
          store.currentTab === 'playoffs'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Playoffs
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('weeklyReport')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
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
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('startSit')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="[
          store.currentTab === 'startSit'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Start/Sit
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('draft')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="[
          store.currentTab === 'draft'
            ? 'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700'
            : ' hover:bg-gray-100 dark:hover:bg-gray-800 ',
        ]"
      >
        Draft
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('leagueHistory')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
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
