<script setup lang="ts">
import { computed } from "vue";

import {
  getWeeklyPointRecords,
  type HistoricalManagerRow,
} from "@/lib/leagueHistory";
import { useStore } from "@/store/store";

import Card from "../ui/card/Card.vue";

const props = defineProps<{
  tableData: Pick<
    HistoricalManagerRow,
    "name" | "username" | "pointSeason"
  >[];
  mode: "highest" | "lowest";
}>();

const store = useStore();
const records = computed(() =>
  getWeeklyPointRecords(props.tableData, props.mode)
);
const title = computed(
  () =>
    `All Time Weekly ${props.mode === "highest" ? "High" : "Low"} Score`
);
</script>

<template>
  <Card class="relative w-full overflow-x-auto md:max-w-2xl lg:max-w-3xl">
    <p class="w-full pt-2 text-lg font-semibold text-center bg-muted/50">
      {{ title }}
    </p>
    <table class="w-full text-sm text-left rtl:text-right">
      <thead class="text-xs uppercase bg-muted/50">
        <tr>
          <th scope="col" class="px-4 py-6 sm:px-6">Team Name</th>
          <th scope="col" class="px-2 py-3">
            <div class="flex items-center max-w-24">Points</div>
          </th>
          <th scope="col" class="px-1 py-3">
            <div>Season</div>
          </th>
          <th scope="col" class="px-1 py-3">
            <div>Week</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in records" :key="index" class="border-b">
          <th
            scope="row"
            class="px-4 font-medium truncate sm:px-6 max-w-36 sm:max-w-56 whitespace-nowrap"
          >
            {{ store.showUsernames ? item.username : item.name }}
          </th>
          <td class="px-2 py-3.5">
            {{ item.point }}
          </td>
          <td class="px-2 py-3.5">
            {{ item.season }}
          </td>
          <td class="px-4 py-3.5">
            {{ item.week }}
          </td>
        </tr>
      </tbody>
    </table>
  </Card>
</template>
