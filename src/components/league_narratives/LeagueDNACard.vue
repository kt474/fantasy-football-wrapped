<script setup lang="ts">
import { computed } from "vue";
import Card from "../ui/card/Card.vue";
import type { LeagueDNA } from "@/lib/narratives";

const props = defineProps<{
  leagueDNA: LeagueDNA;
}>();

const formatNumber = (value: number, digits = 1) => {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toFixed(digits);
};

const champions = computed(() => props.leagueDNA.parity.championships);
</script>

<template>
  <Card class="p-4 md:p-6">
    <div>
      <p class="text-3xl font-bold">League Narratives</p>
    </div>

    <div class="grid gap-3 mt-4 text-sm sm:grid-cols-4 text-muted-foreground">
      <div class="p-3 rounded-lg bg-secondary">
        <p class="text-xs uppercase">seasons</p>
        <p class="mt-1 font-medium text-foreground">
          {{ leagueDNA.sample.seasonsAnalyzed }}
        </p>
      </div>
      <div class="p-3 rounded-lg bg-secondary">
        <p class="text-xs uppercase">Total Waiver Moves</p>
        <p class="mt-1 font-medium text-foreground">
          {{ formatNumber(leagueDNA.activity.totalWaivers, 0) }}
        </p>
      </div>
      <div class="p-3 rounded-lg bg-secondary">
        <p class="text-xs uppercase">Total Trades</p>
        <p class="mt-1 font-medium text-foreground">
          {{ formatNumber(leagueDNA.activity.totalTrades, 0) }}
        </p>
      </div>
      <div class="p-3 rounded-lg bg-secondary">
        <p class="text-xs uppercase">Average Weekly Score</p>
        <p class="mt-1 font-medium text-foreground">
          {{ formatNumber(leagueDNA.scoring.averageWeeklyScore) }}
        </p>
      </div>
    </div>

    <Card class="p-4 mt-4">
      <div class="">
        <p class="font-semibold">Champions</p>
      </div>

      <div
        v-if="champions.length"
        class="grid gap-2 mt-3 text-sm sm:grid-cols-2"
      >
        <div
          v-for="championship in champions"
          :key="`${championship.winner}-${championship.season}`"
          class="flex items-center justify-between px-3 py-2 rounded-md bg-secondary"
        >
          <span class="pr-3 truncate">{{ championship.winner }}</span>
          <span class="font-medium text-foreground">
            {{ championship.season }}
          </span>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-muted-foreground">
        No champion data available.
      </p>
    </Card>
  </Card>
</template>
