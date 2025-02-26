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
    class="flex flex-wrap text-sm font-medium text-center text-gray-600 border-b border-gray-200 dark:border-gray-700 dark:text-gray-300"
  >
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('standings')"
        aria-current="page"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          ' text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'standings',
        }"
      >
        Standings
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('powerRankings')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'powerRankings',
        }"
      >
        <span class="block sm:hidden">Rankings</span>
        <span class="hidden sm:block">Power Rankings</span>
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('expectedWins')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'expectedWins',
        }"
      >
        <span class="block sm:hidden">Exp. Wins</span>
        <span class="hidden sm:block">Expected Wins</span>
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('managerEfficiency')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'managerEfficiency',
        }"
      >
        Roster
        <span class="hidden sm:inline">Management</span>
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('playoffs')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'playoffs',
        }"
      >
        Playoffs
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('weeklyReport')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'weeklyReport',
        }"
      >
        Weekly Report
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('draft')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'draft',
        }"
      >
        Draft
      </button>
    </li>
    <li class="cursor-pointer me-2">
      <button
        @click="changeTab('leagueHistory')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'leagueHistory',
        }"
      >
        <span class="hidden sm:inline">League</span> History
      </button>
    </li>
  </ul>
</template>
