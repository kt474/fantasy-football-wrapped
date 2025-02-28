<script setup lang="ts">
import { cloneDeep, maxBy, minBy } from "lodash";
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";
import { zScoreToPValue } from "../../api/helper";
const store = useStore();
const tableOrder = ref("winsDifference");
const hover = ref("");
const props = defineProps<{
  tableData: TableDataType[];
}>();
const tableData = computed(() => {
  const tableDataCopy = cloneDeep(props.tableData);
  if (tableOrder.value === "randomScheduleWins") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.randomScheduleWins - a.randomScheduleWins;
    });
  } else if (tableOrder.value === "winsDifference") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.wins - b.randomScheduleWins - (a.wins - a.randomScheduleWins);
    });
  } else if (tableOrder.value === "probability") {
    return tableDataCopy.sort((a: any, b: any) => {
      return (
        getProbability(b.wins, b.randomScheduleWins, b.expectedWinsSTD) -
        getProbability(a.wins, a.randomScheduleWins, a.expectedWinsSTD)
      );
    });
  }
});

const getProbability = (actualWins: number, meanWins: number, std: number) => {
  const zScore = std !== 0 ? (actualWins - meanWins) / std : 0;
  return zScoreToPValue(zScore);
};

const mostRandomScheduleWins = computed(() => {
  return maxBy(tableData.value, "randomScheduleWins")?.randomScheduleWins;
});

const leastRandomScheduleWins = computed(() => {
  return minBy(tableData.value, "randomScheduleWins")?.randomScheduleWins;
});

const mostWinsDifference = computed(() => {
  return maxBy(tableData.value, (team) => team.wins - team.randomScheduleWins)
    ?.name;
});
const leastWinsDifference = computed(() => {
  return minBy(tableData.value, (team) => team.wins - team.randomScheduleWins)
    ?.name;
});

const listPadding = computed(() => {
  if (props.tableData.length <= 10) {
    return "py-4";
  } else if (props.tableData.length <= 12) {
    return "py-3";
  }
  return "py-2.5";
});
</script>
<template>
  <div
    class="relative w-full overflow-x-auto rounded-lg shadow-md md:max-w-xl dark:bg-gray-700"
  >
    <table
      class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-300"
    >
      <thead
        :class="
          store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
        "
        class="text-xs text-gray-700 uppercase dark:text-gray-300"
      >
        <tr>
          <th scope="col" class="px-4 py-3 sm:px-6 dark:text-gray-200">
            Team Name
          </th>

          <th scope="col" class="px-2 py-3">
            <div
              @click="tableOrder = 'randomScheduleWins'"
              @mouseover="hover = 'randomScheduleWins'"
              @mouseleave="hover = ''"
              class="flex items-center w-24 cursor-pointer dark:text-gray-200"
            >
              Expected Wins
              <div>
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400 -ml-5"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'randomScheduleWins',
                  }"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  />
                </svg>
              </div>
            </div>
            <div
              :class="hover === 'randomScheduleWins' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-20 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm w-60 tooltip dark:bg-gray-600"
            >
              Average number of wins after simulating 10,000 randomized weekly
              matchups
            </div>
          </th>
          <th scope="col" class="px-1 py-3">
            <div
              @click="tableOrder = 'winsDifference'"
              @mouseover="hover = 'winsDifference'"
              @mouseleave="hover = ''"
              class="flex items-center cursor-pointer w-28 dark:text-gray-200"
            >
              Wins above Expected
              <div>
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400 -ml-6"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'winsDifference',
                  }"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  />
                </svg>
              </div>
            </div>
            <div
              :class="hover === 'winsDifference' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-12 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm w-44 tooltip dark:bg-gray-600"
            >
              Difference between expected wins and actual wins
            </div>
          </th>
          <th scope="col" class="px-2 py-3">
            <div
              @click="tableOrder = 'probability'"
              @mouseover="hover = 'probability'"
              @mouseleave="hover = ''"
              class="flex items-center cursor-pointer w-28 dark:text-gray-200"
            >
              Probability
              <div>
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'probability',
                  }"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  />
                </svg>
              </div>
            </div>
            <div
              :class="hover === 'probability' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-16 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm w-44 tooltip dark:bg-gray-600"
            >
              If wins above expected is positive, this is the probability of
              having equal to or greater than the number of actual wins. If
              negative, the probability of having equal to or less than the
              number of actual wins.
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in tableData"
          :key="index"
          class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
        >
          <th
            scope="row"
            :class="listPadding"
            class="px-4 font-medium text-gray-900 truncate sm:px-6 max-w-36 sm:max-w-56 whitespace-nowrap dark:text-white"
          >
            {{ item.name ? item.name : "Ghost Roster" }}
          </th>
          <td
            class="px-2 py-2"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.randomScheduleWins === mostRandomScheduleWins,
              'text-red-600 dark:text-red-500 font-semibold':
                item.randomScheduleWins === leastRandomScheduleWins,
            }"
          >
            {{ item.randomScheduleWins.toFixed(2) }}
          </td>
          <td
            class="px-2 py-2"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.name === mostWinsDifference,
              'text-red-600 dark:text-red-500 font-semibold':
                item.name === leastWinsDifference,
            }"
          >
            {{ (item.wins - item.randomScheduleWins).toFixed(2) }}
          </td>
          <td class="py-2 pl-2">
            {{
              (
                100 *
                getProbability(
                  item.wins,
                  item.randomScheduleWins,
                  item.expectedWinsSTD
                )
              ).toFixed(2)
            }}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.light-custom-bg-color {
  background-color: #eff0f2;
}
.dark-custom-bg-color {
  background-color: #374151;
}
</style>
