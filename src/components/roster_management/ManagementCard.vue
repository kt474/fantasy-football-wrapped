<script setup lang="ts">
import { maxBy, cloneDeep, minBy } from "lodash";
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";
const store = useStore();
const tableOrder = ref("points");
const hover = ref("");
const props = defineProps<{
  tableData: TableDataType[];
}>();

const tableData = computed(() => {
  const tableDataCopy = cloneDeep(props.tableData);
  if (tableOrder.value === "points") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "potentialPoints") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.potentialPoints - a.potentialPoints;
    });
  } else if (tableOrder.value === "efficiency") {
    return tableDataCopy.sort((a: any, b: any) => {
      return b.managerEfficiency - a.managerEfficiency;
    });
  }
});

const mostPoints = computed(() => {
  return maxBy(tableData.value, "pointsFor")?.pointsFor;
});
const minPoints = computed(() => {
  return minBy(tableData.value, "pointsFor")?.pointsFor;
});
const mostPontentialPoints = computed(() => {
  return maxBy(tableData.value, "potentialPoints")?.potentialPoints;
});
const minPontentialPoints = computed(() => {
  return minBy(tableData.value, "potentialPoints")?.potentialPoints;
});
const highestEfficiency = computed(() => {
  return maxBy(tableData.value, "managerEfficiency")?.managerEfficiency;
});
const lowestEfficiency = computed(() => {
  return minBy(tableData.value, "managerEfficiency")?.managerEfficiency;
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
    class="relative w-full max-w-xl overflow-x-auto rounded-lg shadow-md dark:bg-gray-700"
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

          <th scope="col" class="px-1 py-3">
            <div
              @click="tableOrder = 'points'"
              @mouseover="hover = 'points'"
              @mouseleave="hover = ''"
              class="flex items-center w-16 mr-2 cursor-pointer sm:mr-0 sm:w-20 dark:text-gray-200"
            >
              Total Points
              <div>
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400 sm:-ml-5"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50': tableOrder == 'points',
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
              :class="hover === 'points' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-20 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm w-52 tooltip dark:bg-gray-600"
            >
              Total regular season points
            </div>
          </th>
          <th scope="col" class="px-1 py-3 max-w-24">
            <div
              @click="tableOrder = 'potentialPoints'"
              @mouseover="hover = 'potentialPoints'"
              @mouseleave="hover = ''"
              class="flex items-center cursor-pointer xl:w-24 dark:text-gray-200"
            >
              Potential Points
              <div>
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400 xl:ml-0 -ml-5"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'potentialPoints',
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
              :class="hover === 'potentialPoints' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block w-40 px-3 py-2 mt-2 -ml-12 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
            >
              Maximum points possible if the best lineup was set each week
            </div>
          </th>
          <th scope="col" class="py-3 pl-2 pr-3 lg:pr-0">
            <div
              @click="tableOrder = 'efficiency'"
              @mouseover="hover = 'efficiency'"
              @mouseleave="hover = ''"
              class="flex items-center w-24 cursor-pointer dark:text-gray-200"
            >
              Efficiency
              <div>
                <svg
                  class="w-3 h-3 ms-1.5 fill-slate-400"
                  :class="{
                    'fill-slate-600 dark:fill-slate-50':
                      tableOrder == 'efficiency',
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
              :class="hover === 'efficiency' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block w-40 px-3 py-2 mt-2 -ml-12 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
            >
              Points / Potential Points
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
            class="px-4 font-medium text-gray-900 truncate sm:px-6 max-w-56 whitespace-nowrap dark:text-white"
          >
            {{ item.name ? item.name : "Ghost Roster" }}
          </th>
          <td
            class="py-2 pl-1 pr-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.pointsFor === mostPoints,
              'text-red-600 dark:text-red-500 font-semibold':
                item.pointsFor === minPoints,
            }"
          >
            {{ item.pointsFor }}
          </td>
          <td
            class="py-2 pl-1 pr-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.potentialPoints === mostPontentialPoints,
              'text-red-600 dark:text-red-500 font-semibold':
                item.potentialPoints === minPontentialPoints,
            }"
          >
            {{ item.potentialPoints }}
          </td>
          <td
            class="py-2 pl-2.5 pr-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                item.managerEfficiency === highestEfficiency,
              'text-red-600 dark:text-red-500 font-semibold':
                item.managerEfficiency === lowestEfficiency,
            }"
          >
            {{ (item.managerEfficiency * 100).toFixed(1) }}%
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
