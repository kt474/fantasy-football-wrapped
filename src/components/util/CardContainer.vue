<script setup lang="ts">
import LeagueCard from "./LeagueCard.vue";
import LeagueSwitcher from "../layout/LeagueSwitcher.vue";
import { useStore } from "../../store/store";
import { computed } from "vue";

const store = useStore();

const leagues = computed(() => {
  return store.leagueInfo;
});

const showInput = () => {
  if (store.showLeaguesList) {
    store.updateShowLeaguesList(false);
  } else {
    store.updateShowInput(!store.showInput);
  }
};
</script>
<template>
  <div class="container flex mr-4">
    <div class="flex max-w-screen-xl overflow-auto no-scrollbar">
      <LeagueSwitcher :leagues="leagues" />

      <!-- <LeagueCard
        v-for="(leagueInfo, index) in leagues"
        :key="index"
        :leagueInfo="leagueInfo"
        :dropdownIndex="index"
      /> -->
    </div>
    <!-- <button
      v-if="!store.showInput && !store.showLeaguesList"
      aria-label="Add additional league"
      @click="showInput()"
      type="button"
      class="h-9 mt-10 text-gray-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      :class="leagues.length > 1 ? 'ml-4 sm:ml-0' : ''"
    >
      <svg
        class="w-4 h-4 text-gray-50"
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
      <span class="sr-only">Show input</span>
    </button>
    <button
      v-else-if="store.showInput || store.showLeaguesList"
      aria-label="Add additional league"
      @click="showInput()"
      type="button"
      class="h-9 mt-10 text-gray-50 bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
      :class="leagues.length > 1 ? 'ml-4 sm:ml-0' : ''"
    >
      <svg
        class="w-4 h-4 text-gray-50"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 12h14"
        />
      </svg>
      <span class="sr-only">Close input</span>
    </button> -->
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
