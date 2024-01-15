<script setup lang="ts">
import LeagueCard from "./LeagueCard.vue";
import { useStore } from "../store/store";
import { computed } from "vue";

const store = useStore();

const leagues = computed(() => {
  return store.leagueInfo;
});
</script>
<template>
  <div class="container flex mr-4 overflow-scroll">
    <LeagueCard
      v-for="(leagueInfo, index) in leagues"
      :key="index"
      :leagueInfo="leagueInfo"
      :dropdownIndex="index"
    />
    <button
      @click="store.updateShowInput(true)"
      type="button"
      class="h-9 mt-12 mx-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >
      <svg
        class="w-4 h-4 text-white"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 18 18"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 1v16M1 9h16"
        />
      </svg>
      <span class="sr-only">Icon description</span>
    </button>
  </div>
</template>
