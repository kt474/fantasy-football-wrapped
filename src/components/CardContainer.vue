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
  <div class="container flex mr-4">
    <div class="flex max-w-screen-xl overflow-auto no-scrollbar">
      <LeagueCard
        v-for="(leagueInfo, index) in leagues"
        :key="index"
        :leagueInfo="leagueInfo"
        :dropdownIndex="index"
      />
    </div>
    <button
      aria-label="Add additional league"
      @click="store.updateShowInput(!store.showInput)"
      type="button"
      class="hidden h-9 mt-12 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm p-2.5 text-center sm:inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
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
<style>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
