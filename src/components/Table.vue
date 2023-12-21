<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{
  users: Array<object>;
  rosters: Array<object>;
}>();

const tableData = computed(() => {
  return props.users.map((t1: any) => ({
    ...t1,
    ...props.rosters.find((t2: any) => t2.id === t1.id),
  }));
});
</script>
<template>
  <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
    <table
      class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
    >
      <thead
        class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
      >
        <tr>
          <th scope="col" class="px-6 py-3">Team name</th>
          <th scope="col" class="px-6 py-3">Record</th>
          <th scope="col" class="px-6 py-3">Points</th>
          <th scope="col" class="px-6 py-3">Points Against</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in tableData"
          :key="index"
          class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
        >
          <th
            scope="row"
            class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {{ item.name }}
          </th>
          <td class="px-6 py-4">{{ item.wins }} - {{ item.losses }}</td>
          <td class="px-6 py-4">{{ item.pointsFor }}</td>
          <td class="px-6 py-4">{{ item.pointsAgainst }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
