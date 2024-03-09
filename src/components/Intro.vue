<script setup lang="ts"></script>
<template>
  <div class="pt-20">
    <h1
      class="px-1 mb-4 font-bold tracking-tight text-center text-gray-900 custom-font-size sm:leading-none lg:px-40 xl:px-56 md:text-5xl lg:text-6xl dark:text-white"
    >
      Your complete
      <span
        class="text-transparent bg-clip-text bg-gradient-to-r to-indigo-600 from-sky-500 dark:to-indigo-500 dark:from-sky-400"
        >fantasy football</span
      >
      league summary
    </h1>
    <p
      class="max-w-4xl mx-auto mt-6 mb-0 text-lg font-normal text-center text-gray-500 text-balance lg:text-xl sm:px-16 dark:text-gray-400"
    >
      Detailed analysis and informative charts for winning fantasy football
      managers.
    </p>
    <p
      class="max-w-3xl mx-auto text-lg font-normal text-center text-gray-500 lg:text-xl sm:px-16 dark:text-gray-400"
    >
      Start by entering your league ID below.
    </p>
    <p
      class="mb-6 text-lg font-semibold text-center text-blue-600 dark:text-blue-500 lg:text-xl sm:px-16 xl:px-48"
    >
      https://sleeper.com/leagues/<span class="text-red-600 dark:text-red-500"
        >{League ID Here}</span
      >
    </p>
  </div>
</template>
<style scoped>
@media (max-width: 768px) {
  .custom-font-size {
    font-size: 2.65rem;
    line-height: 2.75rem;
  }
}
</style>
