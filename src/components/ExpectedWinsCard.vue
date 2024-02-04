<script setup lang="ts">
import { cloneDeep, maxBy, minBy } from "lodash";
import { useStore } from "../store/store";
import { computed, ref } from "vue";
const store = useStore();
const tableOrder = ref("winsDifference");

const tableData = computed(() => {
  const tableDataCopy = cloneDeep(store.tableData);
  if (tableOrder.value === "randomScheduleWins") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.randomScheduleWins - a.randomScheduleWins;
    });
  } else if (tableOrder.value === "winsDifference") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.wins - b.randomScheduleWins - (a.wins - a.randomScheduleWins);
    });
  }
});

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
</script>
<template>
  <div
    class="relative w-full max-w-lg overflow-x-auto shadow-md md:w-2/3 sm:rounded-lg"
  >
    <table
      class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-400"
    >
      <thead
        class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
      >
        <tr>
          <th scope="col" class="px-6 py-3 dark:text-gray-200">Team Name</th>

          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'randomScheduleWins'"
              class="flex items-center w-24 cursor-pointer dark:text-gray-200"
            >
              Expected Wins
              <a href="#"
                ><svg
                  class="w-3 h-3 ms-1.5 fill-slate-400"
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
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div
              @click="tableOrder = 'winsDifference'"
              class="flex items-center cursor-pointer w-28 dark:text-gray-200"
            >
              Wins above Expected
              <a href="#"
                ><svg
                  class="w-3 h-3 ms-1.5 fill-slate-400"
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
                  /></svg
              ></a>
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
            class="px-6 py-3 font-medium text-gray-900 truncate max-w-56 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <td
            class="px-6 py-2"
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
            class="px-6 py-2"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.name === mostWinsDifference,
              'text-red-600 dark:text-red-500 font-semibold':
                item.name === leastWinsDifference,
            }"
          >
            {{ (item.wins - item.randomScheduleWins).toFixed(2) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
