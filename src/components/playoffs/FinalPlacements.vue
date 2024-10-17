<script setup lang="ts">
const props = defineProps<{
  rosters: any[];
}>();
</script>
<template>
  <div
    class="w-full lg:w-1/4 px-6 pt-2.5 mt-4 lg:mt-0 lg:ml-4 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex items-center justify-between sm:mt-1.5 mb-2">
      <h5
        class="w-20 text-2xl font-bold leading-none text-gray-900 dark:text-white text-pretty"
      >
        Final Placements
      </h5>
    </div>
    <div v-if="props.rosters.length > 0" class="flow-root">
      <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="(user, index) in props.rosters">
          <div v-if="user" class="flex items-center">
            <div class="flex-1 min-w-0 list-padding ms-1">
              <p
                class="text-lg text-gray-600 truncate dark:text-gray-300"
                :class="props.rosters.length <= 10 ? 'py-2.5' : 'py-1.5'"
              >
                <span class="font-medium text-black dark:text-white"
                  >{{ index + 1 }}.&nbsp;</span
                >
                {{ user.name }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="text-gray-900 dark:text-white">
      <p class="pt-1 mb-2 border-t dark:bg-gray-800 dark:border-gray-700">
        Season in progress
      </p>
    </div>
  </div>
</template>
