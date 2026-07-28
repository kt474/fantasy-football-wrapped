<script setup lang="ts">
import { Crown, Trophy } from "@lucide/vue";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";

const managers = [
  {
    rank: 1,
    avatar: 6,
    name: "Saquondo",
    seasons: 4,
    record: "38–18",
    titles: 1,
    points: "6,584",
  },
  {
    rank: 2,
    avatar: 3,
    name: "The Princess McBride",
    seasons: 4,
    record: "35–21",
    titles: 1,
    points: "6,491",
  },
  {
    rank: 3,
    avatar: 8,
    name: "Ja’Marr the Merrier",
    seasons: 4,
    record: "33–23",
    titles: 2,
    points: "6,377",
  },
  {
    rank: 4,
    avatar: 5,
    name: "Breece's Puffs",
    seasons: 3,
    record: "24–18",
    titles: 0,
    points: "4,812",
  },
];
</script>

<template>
  <ProductPreviewFrame
    title="League History"
    eyebrow="Fourth & Long · 2023–2026"
    status="4 seasons"
  >
    <div class="p-4">
      <div class="flex flex-wrap gap-2 pb-3 border-b">
        <span
          class="px-2.5 py-1 text-[0.68rem] font-medium border rounded-md bg-primary text-primary-foreground"
          >All-time standings</span
        >
        <span class="px-2.5 py-1 text-[0.68rem] border rounded-md"
          >Season finishes</span
        >
        <span class="px-2.5 py-1 text-[0.68rem] border rounded-md"
          >Head-to-head</span
        >
        <span class="px-2.5 py-1 text-[0.68rem] border rounded-md"
          >Records</span
        >
      </div>

      <div class="mt-3 overflow-hidden border rounded-lg">
        <div
          class="grid grid-cols-[2rem_minmax(0,1fr)_3.6rem_2.7rem] gap-2 px-3 py-2 text-[0.6rem] font-medium tracking-wide uppercase border-b bg-muted/20 text-muted-foreground sm:grid-cols-[2rem_minmax(0,1fr)_3.2rem_3.6rem_2.7rem_3.8rem]"
        >
          <span>Rank</span><span>Manager</span
          ><span class="hidden text-right sm:block">Seasons</span
          ><span class="text-right">Record</span
          ><span class="text-right">Titles</span
          ><span class="hidden text-right sm:block">Points</span>
        </div>
        <div
          v-for="manager in managers"
          :key="manager.name"
          class="grid grid-cols-[2rem_minmax(0,1fr)_3.6rem_2.7rem] items-center gap-2 px-3 py-2.5 border-b last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_3.2rem_3.6rem_2.7rem_3.8rem]"
        >
          <span class="text-sm font-bold">{{ manager.rank }}</span>
          <div class="flex items-center min-w-0 gap-2">
            <img
              :src="`/avatars/avatar${manager.avatar}.svg`"
              alt=""
              class="border rounded-full size-8 bg-muted"
            />
            <p class="text-xs font-medium truncate">{{ manager.name }}</p>
          </div>
          <span class="hidden text-xs text-right sm:block">{{
            manager.seasons
          }}</span>
          <span class="text-xs font-medium text-right tabular-nums">{{
            manager.record
          }}</span>
          <span
            class="inline-flex items-center justify-end gap-1 text-xs font-semibold"
            :class="manager.titles ? 'text-amber-500' : 'text-muted-foreground'"
          >
            <Trophy :size="11" /> {{ manager.titles }}
          </span>
          <span
            class="hidden text-xs text-right tabular-nums text-muted-foreground sm:block"
            >{{ manager.points }}</span
          >
        </div>
      </div>

      <div class="grid gap-2 mt-3 sm:grid-cols-2">
        <article class="p-3 border rounded-lg bg-muted/15">
          <div class="flex items-center justify-between">
            <p class="text-[0.64rem] text-muted-foreground">All-time record</p>
            <Crown :size="14" class="text-amber-500" />
          </div>
          <p class="mt-1 text-xs font-semibold">Highest weekly score</p>
          <div class="flex items-end justify-between mt-2">
            <span class="text-lg font-bold tabular-nums">191.72</span>
            <span class="text-[0.65rem] text-muted-foreground"
              >Saquondo · 2025 W9</span
            >
          </div>
        </article>
        <article class="p-3 border rounded-lg bg-muted/15">
          <p class="text-[0.64rem] text-muted-foreground">Closest matchup</p>
          <p class="mt-1 text-xs font-semibold">A rivalry decided by 0.08</p>
          <div class="flex items-end justify-between mt-2">
            <span class="text-lg font-bold tabular-nums">121.44–121.36</span>
            <span class="text-[0.65rem] text-muted-foreground">2024 W6</span>
          </div>
        </article>
      </div>
    </div>
  </ProductPreviewFrame>
</template>
