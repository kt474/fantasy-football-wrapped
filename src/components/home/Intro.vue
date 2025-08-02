<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getLeagueCount } from "../../api/api";
import Input from "../util/Input.vue";

const leagueCount = ref(3770); // current unique league count value 7/30/25 (cache)

onMounted(async () => {
  const data = await getLeagueCount();
  const newCount = data?.league_id_count;
  if (newCount !== leagueCount.value) {
    animateCount(leagueCount.value, newCount, 500); // 1.2s animation
  }
});

const animateCount = (from: number, to: number, duration = 1000) => {
  const start = performance.now();
  function update(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    leagueCount.value = Math.floor(from + (to - from) * progress);
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      leagueCount.value = to;
    }
  }
  requestAnimationFrame(update);
};
</script>
<template>
  <div class="pt-16 mb-12 text-center">
    <h1
      class="px-4 font-bold tracking-tight text-center text-gray-900 custom-font-size sm:leading-none lg:px-24 xl:px-56 sm:text-5xl lg:text-6xl dark:text-gray-50"
    >
      All your
      <span
        class="text-transparent bg-clip-text bg-gradient-to-r to-indigo-600 from-sky-500 dark:to-indigo-500 dark:from-sky-400 whitespace-nowrap"
        >fantasy football</span
      >
      league insights in<span class="whitespace-nowrap"> one place</span>
    </h1>
    <h2
      class="max-w-4xl mx-auto mt-5 mb-0 text-lg font-normal text-center text-gray-600 text-balance lg:text-xl sm:px-16 dark:text-gray-300"
    >
      Detailed analysis and elegant charts for winning fantasy football
      managers.
    </h2>
    <p
      class="max-w-3xl mx-auto mt-1 text-lg font-normal text-center text-gray-600 lg:text-xl sm:px-16 dark:text-gray-300"
    >
      Trusted by
      <span
        class="items-center hidden px-2.5 py-0.5 text-sm font-medium text-balance text-blue-800 bg-gray-100 border border-blue-400 rounded-full dark:bg-gray-800 dark:text-blue-400 sm:inline-block relative -top-0.5"
      >
        {{ leagueCount.toLocaleString() }}+ leagues
      </span>
      and counting.
    </p>
    <div class="mt-4 -mb-2">
      <p
        class="max-w-3xl mx-auto mt-6 text-lg font-normal text-center text-gray-600 lg:text-xl sm:px-16 dark:text-gray-300"
      >
        Start by entering your league ID
        <span class="hidden sm:inline">or username</span> below.
      </p>
      <a
        aria-label="Sleeper website link"
        href="https://sleeper.com/"
        target="_blank"
        class="inline-block mb-2 text-lg font-semibold text-center text-blue-600 dark:text-blue-500 lg:text-xl sm:px-16 xl:px-48 whitespace-nowrap"
      >
        https://sleeper.com/leagues/<span class="text-red-600 dark:text-red-500"
          >{League ID}</span
        >
      </a>
    </div>
    <Input class="w-5/12 mx-auto mb-16" />
  </div>
</template>
<style scoped>
@media (max-width: 640px) {
  .custom-font-size {
    font-size: 2.7rem;
    line-height: 2.8rem;
  }
}
</style>
