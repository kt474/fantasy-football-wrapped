<script setup lang="ts">
import Card from "../ui/card/Card.vue";
import type { LeagueDNA } from "@/lib/narratives";

defineProps<{
  leagueDNA: LeagueDNA;
}>();
</script>

<template>
  <Card class="p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-lg font-semibold">League DNA</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Raw aggregate output for narrative generation.
        </p>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ leagueDNA.sample.seasonsAnalyzed }} seasons
      </p>
    </div>

    <div class="grid gap-4 mt-4 lg:grid-cols-2">
      <div class="rounded-lg border p-4">
        <p class="font-semibold">Sample</p>
        <pre class="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{{
          JSON.stringify(leagueDNA.sample, null, 2)
        }}</pre>
      </div>
      <div class="rounded-lg border p-4">
        <p class="font-semibold">Parity</p>
        <pre class="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{{
          JSON.stringify(leagueDNA.parity, null, 2)
        }}</pre>
      </div>
      <div class="rounded-lg border p-4">
        <p class="font-semibold">Activity</p>
        <pre class="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{{
          JSON.stringify(leagueDNA.activity, null, 2)
        }}</pre>
      </div>
      <div class="rounded-lg border p-4">
        <p class="font-semibold">Scoring + Volatility</p>
        <pre class="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{{
          JSON.stringify(
            {
              scoring: leagueDNA.scoring,
              volatility: leagueDNA.volatility,
            },
            null,
            2
          )
        }}</pre>
      </div>
    </div>
  </Card>
</template>
