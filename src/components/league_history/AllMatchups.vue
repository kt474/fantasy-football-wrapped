<script setup lang="ts">
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();
</script>
<template>
  <div
    :class="store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'"
    class="hidden w-full overflow-x-auto bg-gray-100 rounded-lg shadow-md dark:bg-gray-700"
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
          <th scope="col" class="px-2 py-3 sm:px-6 w-60 dark:text-gray-200">
            Team Name
          </th>
          <th v-for="item in props.tableData" scope="col" class="px-2 py-3">
            <div class="flex items-center cursor-pointer dark:text-gray-200">
              {{ item.name }}
            </div>
          </th>
          <th
            scope="col"
            class="py-3 pl-3 pr-3 sm:pr-0 md:pl-10 lg:pl-20 xl:pl-52"
          >
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in props.tableData"
          :key="index"
          class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
        >
          <th
            scope="row"
            class="px-2 font-medium text-gray-900 truncate sm:px-6 max-w-52 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <!-- <td v-for="i in playoffTeams" class="px-2 py-3"></td> -->
          <td
            class="py-3 pl-3 pr-0 border-l sm:pr-3 md:pl-10 lg:pl-20 xl:pl-52 dark:bg-gray-800 dark:border-gray-700"
          ></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
