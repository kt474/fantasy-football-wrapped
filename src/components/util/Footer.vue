<script setup lang="ts">
import { getLeagueCount } from "../../api/api";
import { ref, onMounted } from "vue";
const leagueCount = ref(3796); // initial load current unique league count value 8/3/25

onMounted(async () => {
  const data = await getLeagueCount();
  const newCount = data?.league_id_count;
  if (newCount) {
    leagueCount.value = newCount;
  }
});
</script>

<template>
  <div
    class="w-full py-3 mt-24 text-sm text-gray-700 bg-gray-100 dark:bg-gray-900 dark:text-gray-300"
  >
    <div class="container flex justify-between w-11/12 mx-auto">
      <div class="flex justify-between max-w-screen-xl mt-1">
        <div>
          <p class="mb-2 text-base font-semibold text-black dark:text-gray-50">
            Support & Resources
          </p>
          <p class="mb-1">
            <router-link
              :to="{ path: '/changelog', query: $route.query }"
              class="text-blue-700 dark:text-blue-500 hover:underline"
              >Changelog</router-link
            >
          </p>
          <p class="mb-1">
            <a
              aria-label="buymeacoffee donation page"
              class="text-blue-700 dark:text-blue-500 hover:underline"
              href="https://buymeacoffee.com/kt474"
              title="buymeacofee donation page"
              target="_blank"
              >Donate</a
            >
          </p>
          <p class="mb-1">
            <a
              aria-label="ffwrapped blog page"
              class="text-blue-700 dark:text-blue-500 hover:underline"
              href="https://blog.ffwrapped.com/"
              title="ffwrapped blog page"
              target="_blank"
              >Blog</a
            >
          </p>
          <p class="mb-1">
            <a
              aria-label="discord community invite"
              class="text-blue-700 dark:text-blue-500 hover:underline"
              href="https://discord.gg/sSVwNhyv7U"
              title="discord community invite"
              target="_blank"
              >Discord Community</a
            >
          </p>
          <p class="mb-1">
            <a
              aria-label="Freepik - Flaticon icon credit"
              class="text-blue-700 dark:text-blue-500 hover:underline"
              href="https://www.flaticon.com/free-icons/american-football"
              title="american football icons"
              target="_blank"
              >Icon Package</a
            >
          </p>
          <p class="mb-1">
            <router-link
              :to="{ path: '/privacy', query: $route.query }"
              class="text-blue-700 dark:text-blue-500 hover:underline"
              >Privacy Policy</router-link
            >
          </p>
        </div>
      </div>
      <div class="mt-2 text-center text-black w-36 sm:w-44 dark:text-gray-50">
        <p class="mb-2 text-3xl font-semibold sm:text-4xl">
          {{ leagueCount.toLocaleString() }}+
        </p>
        <p class="mb-2 text-base">Fantasy Leagues Powered</p>
        <div
          class="w-full mt-2 mb-2.5 border-b border-gray-200 dark:border-gray-600"
        ></div>
        <p class="text-gray-700 dark:text-gray-300">
          Join thousands of managers using ffwrapped
        </p>
      </div>
    </div>
    <div
      class="w-full mt-2 mb-2.5 border-b border-gray-200 dark:border-gray-600"
    ></div>
    <div class="container w-11/12 mx-auto">
      <p class="mt-1 text-gray-700 dark:text-gray-300">
        &copy; 2024-2025. Kevin Tian
      </p>
    </div>
  </div>
</template>
