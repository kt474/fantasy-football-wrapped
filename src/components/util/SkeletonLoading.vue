<script setup lang="ts">
import { useStore } from "../../store/store";
const store = useStore();
</script>

<template>
  <div role="status" class="flex flex-wrap justify-center h-full mt-4 mb-32">
    <svg
      aria-hidden="true"
      class="w-8 h-8 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
      viewBox="0 0 100 101"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
        fill="currentColor"
      />
      <path
        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
        fill="currentFill"
      />
    </svg>
    <span class="sr-only">Loading...</span>

    <div class="flex w-full">
      <div
        role="status"
        class="w-full p-4 space-y-4 border border-gray-200 divide-y divide-gray-200 rounded shadow lg:mr-4 lg:w-3/4 animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
      >
        <div class="flex items-center justify-between">
          <p class="-mt-1 text-lg dark:text-gray-50">
            Loading {{ store.loadingLeague }}...
          </p>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
        </div>
        <div v-for="_ in 9" class="flex items-center justify-between pt-4">
          <div>
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
            ></div>
            <div
              class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"
            ></div>
          </div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
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
  </div>
</template>
