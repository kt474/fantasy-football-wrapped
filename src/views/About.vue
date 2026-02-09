<script setup lang="ts">
import { watch } from "vue";
import { useStore } from "@/store/store";

const store = useStore();

watch(
  () => store.showUsernames,
  (newValue) => {
    localStorage.setItem("showUsernames", JSON.stringify(newValue));
  }
);
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-300">
        About
      </h1>

      <div
        class="max-w-4xl text-base leading-relaxed text-gray-700 dark:text-gray-300"
      >
        <div class="space-y-4">
          <p class="text-base leading-relaxed text-gray-700 dark:text-gray-100">
            Welcome to ffwrapped, a platform designed to provide insightful data
            and charts for your
            <a
              aria-label="Link to sleeper website"
              class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              href="https://sleeper.com"
              target="_blank"
              >Sleeper</a
            >
            fantasy football leagues.
          </p>
          <p class="text-base leading-relaxed text-gray-700 dark:text-gray-100">
            Everything on this site is free to use and the source code can be
            found on
            <a
              aria-label="Link to github repository"
              class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              href="https://github.com/kt474/fantasy-football-wrapped"
              target="_blank"
              >Github</a
            >. To report a bug or request new features, please join our
            <a
              aria-label="Link to github issues page"
              class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              href="https://discord.gg/sSVwNhyv7U"
              target="_blank"
              >discord,</a
            >
            send an
            <a
              href="mailto:kevin@ffwrapped.com?subject=ffwrapped request"
              class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >email,</a
            >
            or reach out on
            <a
              aria-label="Link to twitter"
              class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              href="https://twitter.com/kevkevkt"
              target="_blank"
              >twitter</a
            >.
          </p>
          <p class="text-base leading-relaxed text-gray-700 dark:text-gray-100">
            Using this site will always be completely free (and ad free) but if
            you would like to support this project, any donations would be
            greatly appreciated.
          </p>
          <div class="flex flex-wrap justify-evenly sm:flex-nowrap">
            <a href="https://www.buymeacoffee.com/kt474" target="_blank"
              ><img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                alt="Buy Me A Coffee"
                style="height: 55px !important; width: 217px !important"
                class="mx-auto my-4"
            /></a>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <h3 class="text-3xl font-semibold text-gray-900 dark:text-gray-50">
            Settings
          </h3>
        </div>
        <div class="mt-4 space-y-4">
          <label for="checkbox" class="inline-flex items-center cursor-pointer">
            <input
              id="checkbox"
              type="checkbox"
              :disabled="store.leagueInfo.length == 0"
              value=""
              class="sr-only peer"
              v-model="store.showUsernames"
            />
            <div
              class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"
            ></div>
            <span
              class="ml-3 text-base leading-relaxed text-gray-700 dark:text-gray-100"
              >Show usernames instead of team names</span
            >
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
