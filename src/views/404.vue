<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>
<template>
  <div class="container w-11/12 h-full max-w-screen-xl mx-auto">
    <div class="max-w-screen-sm mx-auto text-center">
      <h1
        class="mt-12 mb-4 font-bold text-gray-900 text-7xl lg:text-9xl dark:text-white"
      >
        404
      </h1>
      <p
        class="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white"
      >
        Something's missing.
      </p>
      <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
        Sorry, we can't find that page.
      </p>
      <button
        aria-label="Button to go back one page"
        @click="router.push('/')"
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-3 sm:px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mt-2"
      >
        Return Home
      </button>
    </div>
  </div>
</template>
