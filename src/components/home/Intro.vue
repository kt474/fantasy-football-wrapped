<script setup lang="ts"></script>
<template>
  <div class="pt-20 text-center">
    <h1
      class="px-1 font-bold tracking-tight text-center text-gray-900 custom-font-size sm:leading-none lg:px-24 xl:px-56 md:text-5xl lg:text-6xl dark:text-white"
    >
      All your
      <span
        class="text-transparent bg-clip-text bg-gradient-to-r to-indigo-600 from-sky-500 dark:to-indigo-500 dark:from-sky-400"
        >fantasy football</span
      >
      league insights in one place
    </h1>
    <h2
      class="max-w-4xl mx-auto mt-5 mb-0 text-lg font-normal text-center text-gray-600 text-balance lg:text-xl sm:px-16 dark:text-gray-300"
    >
      Detailed analysis and elegant charts for winning fantasy football
      managers.
    </h2>
    <p
      class="max-w-3xl mx-auto text-lg font-normal text-center text-gray-600 lg:text-xl sm:px-16 dark:text-gray-300"
    >
      Start by entering your league ID
      <span class="hidden sm:inline">or username</span> below.
    </p>
    <a
      aria-label="Sleeper website link"
      href="https://sleeper.com/"
      target="_blank"
      class="inline-block mb-2 text-lg font-semibold text-center text-blue-600 dark:text-blue-500 lg:text-xl sm:px-16 xl:px-48"
    >
      https://sleeper.com/leagues/<span class="text-red-600 dark:text-red-500"
        >{League ID}</span
      >
    </a>
  </div>
</template>
<style scoped>
@media (max-width: 768px) {
  .custom-font-size {
    font-size: 2.4rem;
    line-height: 2.5rem;
  }
}
</style>
