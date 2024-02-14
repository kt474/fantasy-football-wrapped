<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "../store/store";
const store = useStore();

const props = defineProps<{
  powerRankings: any[];
}>();

const rankingValues = computed(() => {
  return props.powerRankings.sort((a, b) => {
    return b.ratings[currentWeek.value - 1] - a.ratings[currentWeek.value - 1];
  });
});
const currentWeek = ref(
  store.leagueInfo[store.currentLeagueIndex].regularSeasonLength
);
const weeks = computed(() => {
  return [
    ...Array(
      store.leagueInfo[store.currentLeagueIndex].regularSeasonLength
    ).keys(),
  ]
    .slice(1)
    .reverse();
});
</script>
<template>
  <div
    class="px-6 pt-4 bg-white border border-gray-200 rounded-lg shadow custom-width dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex items-center justify-between sm:mt-1.5 mb-3">
      <h5
        class="w-20 text-xl font-bold leading-none text-gray-900 dark:text-white text-pretty"
      >
        Ranking score
      </h5>
      <select
        id="rankings"
        class="block p-2 text-sm text-gray-900 border border-gray-300 rounded-lg w-15 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 custom-padding"
        v-model="currentWeek"
      >
        <option selected value="14">Week 14</option>
        <option v-for="week in weeks" :key="week" :value="week">
          Week {{ week }}
        </option>
      </select>
    </div>
    <div class="flow-root">
      <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="(user, index) in rankingValues" class="py-2">
          <div class="flex items-center">
            <div class="flex-1 min-w-0 ms-2">
              <p
                class="text-sm font-medium text-gray-900 truncate dark:text-white"
              >
                {{ index + 1 }}.&nbsp; {{ user.name }}
              </p>
            </div>
            <div
              class="inline-flex items-center text-sm font-medium text-gray-700 dark:text-white"
            >
              {{ user.ratings[currentWeek - 1] }}
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
<style scoped>
.custom-width {
  @media (min-width: 768px) {
    min-width: 19rem;
  }
  min-width: 100%;
}
.custom-padding {
  padding-right: 2rem !important;
}
</style>
