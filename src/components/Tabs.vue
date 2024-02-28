<script setup lang="ts">
import { useStore } from "../store/store";
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
      <a
        @click="changeTab('standings')"
        aria-current="page"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          ' text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'standings',
        }"
        >Standings</a
      >
    </li>
    <li class="cursor-pointer me-2">
      <a
        @click="changeTab('powerRankings')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'powerRankings',
        }"
        >Power Rankings</a
      >
    </li>
    <li class="cursor-pointer me-2">
      <a
        @click="changeTab('expectedWins')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'expectedWins',
        }"
        >Expected Wins</a
      >
    </li>
    <li class="cursor-pointer me-2">
      <a
        @click="changeTab('managerEfficiency')"
        class="inline-block p-2 rounded-t-lg sm:p-4"
        :class="{
          'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
            store.currentTab === 'managerEfficiency',
        }"
        >Roster Management</a
      >
    </li>
  </ul>
</template>
