<script setup lang="ts">
import { useStore } from "../../store/store";
const store = useStore();
</script>

<template>
  <div class="flex w-full">
    <div
      role="status"
      class="w-full p-4 space-y-4 border border-gray-200 divide-y divide-gray-200 rounded shadow lg:mr-4 lg:w-3/4 animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
    >
      <div class="flex items-center justify-between">
        <p class="-mt-1 text-lg dark:text-white">
          Loading {{ store.loadingLeague }}...
        </p>
        <div class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"></div>
      </div>
      <div v-for="_ in 9" class="flex items-center justify-between pt-4">
        <div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
          ></div>
          <div class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
        </div>
        <div class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"></div>
      </div>
      <span class="sr-only">Loading...</span>
    </div>
    <div class="hidden w-1/4 lg:block">
      <div
        role="status"
        class="p-4 border border-gray-200 rounded shadow animate-pulse md:p-6 dark:border-gray-700"
      >
        <div
          class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2.5"
        ></div>
        <div
          class="w-48 h-2 mb-10 bg-gray-200 rounded-full dark:bg-gray-700"
        ></div>

        <div class="flex items-baseline mt-4">
          <div
            class="w-full bg-gray-200 rounded-t-lg h-28 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-28 ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-36 ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full h-40 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full h-32 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-36 ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
          ></div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>
      <div
        role="status"
        class="p-4 mt-4 border border-gray-200 rounded shadow animate-pulse md:p-6 dark:border-gray-700"
      >
        <div
          class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2.5"
        ></div>
        <div
          class="w-48 h-2 mb-10 bg-gray-200 rounded-full dark:bg-gray-700"
        ></div>

        <div class="flex items-baseline mt-4">
          <div
            class="w-full h-24 bg-gray-200 rounded-t-lg dark:bg-gray-700"
          ></div>
          <div
            class="w-full h-32 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full h-32 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full h-32 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-52 ms-6 dark:bg-gray-700"
          ></div>
          <div
            class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
          ></div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
</template>
