<script setup lang="ts">
import { capitalize } from "lodash";
const props = defineProps<{
  leagueInfo: any;
}>();
</script>
<template>
  <div
    class="block max-w-xs m-4 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
  >
    <h5
      class="mb-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
    >
      {{ props.leagueInfo.name }}
    </h5>
    <p class="font-normal text-gray-700 dark:text-gray-400">
      {{
        props.leagueInfo.season +
        ": " +
        capitalize(props.leagueInfo.seasonType) +
        " " +
        props.leagueInfo.rosters +
        " man"
      }}
    </p>
  </div>
</template>
