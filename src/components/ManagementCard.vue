<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{
  tableData: any[];
}>();

const sortedTableData = computed(() => {
  return props.tableData.sort((a, b) => {
    return b.managerEfficiency - a.managerEfficiency;
  });
});
</script>
<template>
  <div
    class="px-6 py-2 bg-white border border-gray-200 rounded-lg shadow w-80 dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex items-center justify-between sm:mt-1.5 mb-1">
      <h5
        class="w-20 text-xl font-bold leading-6 text-gray-900 dark:text-white text-pretty"
      >
        Roster Efficiency
      </h5>
    </div>
    <div class="flow-root">
      <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="(user, index) in sortedTableData">
          <div class="flex items-center">
            <div class="flex-1 min-w-0 py-2.5 ms-2">
              <p
                class="w-48 text-sm font-medium text-gray-900 truncate dark:text-white"
              >
                {{ index + 1 }}.&nbsp; {{ user.name }}
              </p>
            </div>
            <div
              class="inline-flex items-center text-sm font-normal text-gray-600 dark:text-gray-400"
            >
              {{ (user.managerEfficiency * 100).toFixed(1) }}%
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
