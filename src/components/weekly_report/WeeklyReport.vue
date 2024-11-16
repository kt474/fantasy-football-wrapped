<script setup lang="ts">
import { TableDataType } from "../../api/types.ts";
import { computed, ref, watch } from "vue";
const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
}>();

const weeks = computed(() => {
  return [...Array(props.regularSeasonLength).keys()].slice(1).reverse();
});

const numOfMatchups = computed(() => {
  return props.tableData.length / 2;
});

const getRecord = (recordString: string, index: number) => {
  const numWins = recordString.slice(0, index).split("W").length - 1;
  const numLosses = recordString.slice(0, index).split("L").length - 1;
  return `${numWins} - ${numLosses}`;
};

const currentWeek = ref(weeks.value[0]);

watch(
  () => props.regularSeasonLength,
  () => (currentWeek.value = weeks.value[0])
);
</script>
<template>
  <div
    class="h-full px-6 pt-4 mt-4 bg-white border border-gray-200 rounded-lg shadow custom-width dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex items-center justify-between mb-3">
      <h5 class="text-3xl font-bold text-gray-900 dark:text-white">
        Weekly Summary
      </h5>
      <select
        aria-label="current week"
        id="rankings"
        class="block p-2 text-sm text-gray-900 border border-gray-300 rounded-lg w-15 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 custom-padding"
        v-model="currentWeek"
      >
        <option v-for="week in weeks" :key="week" :value="week">
          Week {{ week }}
        </option>
      </select>
    </div>
    <p class="text-xl font-bold text-gray-900 dark:text-white">Matchups</p>
    <div class="flex flex-wrap w-full mb-2 overflow-auto">
      <div
        v-for="index in numOfMatchups"
        class="block px-4 py-2.5 my-2 mr-4 text-gray-600 bg-white border border-gray-200 rounded-lg shadow w-80 dark:shadow-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
      >
        <div v-for="user in props.tableData">
          <div v-if="user.matchups[currentWeek - 1] == index">
            <div class="flex justify-between my-2">
              <div class="flex">
                <img
                  v-if="user.avatarImg"
                  alt="User avatar"
                  class="w-8 h-8 rounded-full"
                  :src="user.avatarImg"
                />
                <svg
                  v-else
                  class="w-8 h-8 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <div>
                  <p class="px-2 -mt-1 truncate max-w-28 xl:max-w-44">
                    {{ user.name }}
                  </p>
                  <p class="ml-2 text-xs">
                    ({{ getRecord(user.recordByWeek, currentWeek) }})
                  </p>
                </div>
              </div>
              <p
                class="mt-0.5"
                :class="{
                  'text-blue-600 dark:text-blue-500 font-semibold':
                    user.recordByWeek[currentWeek - 1] == 'W',
                }"
              >
                {{ user.points[currentWeek - 1] }}
              </p>
            </div>
            <hr
              v-if="
                props.tableData
                  .filter((u) => u.matchups[currentWeek - 1] === index)
                  .indexOf(user) === 0
              "
              class="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- <p class="text-xl font-bold text-gray-900 dark:text-white">Awards</p> -->
  </div>
</template>
