<script setup lang="ts">
import ProductPreviewFrame from "./ProductPreviewFrame.vue";

const metrics = [
  { label: "Win rate", value: "64.3%", rank: "#1" },
  { label: "Playoffs", value: "4", rank: "100%" },
  { label: "Titles", value: "1" },
  { label: "Avg efficiency", value: "91.6%", rank: "#1" },
  { label: "Record", value: "27–15" },
  { label: "Points / season", value: "1,646.0", rank: "#1" },
];
</script>

<template>
  <ProductPreviewFrame
    title="Manager Profiles"
    eyebrow="Fourth & Long · 4 seasons"
    status="Premium sample"
  >
    <div class="p-4 sm:p-5">
      <div class="flex items-center gap-3">
        <img
          src="/avatars/avatar6.svg"
          alt=""
          class="border rounded-full size-11 bg-muted"
        />
        <div>
          <p class="font-semibold">Saquondo</p>
          <p class="text-xs text-muted-foreground">4 seasons analyzed</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5 mt-4">
        <span
          class="px-2 py-1 text-[0.65rem] font-medium rounded-md bg-secondary"
        >
          Draft Room Menace
        </span>
        <span
          class="px-2 py-1 text-[0.65rem] font-medium rounded-md bg-secondary"
        >
          Roster Never Sleeps
        </span>
      </div>

      <p class="mt-4 text-xs leading-5 text-foreground/90">
        Saquondo has been the league’s model of sustained menace, pairing its
        best long-term scoring profile with a championship. The draft results
        built the foundation, while elite lineup efficiency keeps the roster
        ahead once the season starts.
      </p>

      <dl class="grid grid-cols-2 gap-2 mt-4 sm:grid-cols-3">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="px-3 py-2.5 rounded-lg bg-secondary"
        >
          <dt
            class="text-[0.58rem] font-medium tracking-wide uppercase text-muted-foreground"
          >
            {{ metric.label }}
          </dt>
          <dd class="mt-1 text-xs font-semibold">
            {{ metric.value }}
            <span
              v-if="metric.rank"
              class="ml-1 text-[0.6rem] font-normal text-muted-foreground"
            >
              {{ metric.rank }}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  </ProductPreviewFrame>
</template>
