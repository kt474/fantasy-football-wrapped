<script setup lang="ts">
import { Activity, ChevronDown } from "@lucide/vue";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";

const teams = [
  {
    avatar: 6,
    team: "Saquondo",
    record: "9-5",
    playoff: 96,
    bye: 54,
    wins: 10.8,
  },
  {
    avatar: 3,
    team: "The Princess McBride",
    record: "9-5",
    playoff: 88,
    bye: 31,
    wins: 10.2,
  },
  {
    avatar: 5,
    team: "Breece's Puffs",
    record: "8-6",
    playoff: 72,
    bye: 9,
    wins: 9.4,
  },
  {
    avatar: 8,
    team: "Ja’Marr the Merrier",
    record: "8-6",
    playoff: 61,
    bye: 5,
    wins: 9.1,
  },
  {
    avatar: 4,
    team: "Baby Back Gibbs",
    record: "8-6",
    playoff: 43,
    bye: 1,
    wins: 8.6,
  },
];
</script>

<template>
  <ProductPreviewFrame
    title="Playoff Odds"
    eyebrow="Fourth & Long · 5,000 season simulations"
    status="Week 11"
  >
    <template #toolbar>
      <span
        class="inline-flex items-center gap-1 text-[0.68rem] text-success"
      >
        <Activity :size="12" /> Updated
      </span>
    </template>

    <div class="p-4">
      <div class="flex flex-wrap gap-2 pb-3 border-b">
        <span class="px-2.5 py-1 text-[0.68rem] font-medium border rounded-md bg-primary text-primary-foreground"
          >Playoff chances</span
        >
        <span class="px-2.5 py-1 text-[0.68rem] border rounded-md"
          >Seed ranges</span
        >
        <span class="px-2.5 py-1 text-[0.68rem] border rounded-md"
          >Schedule scenarios</span
        >
        <span
          class="inline-flex items-center gap-1 px-2.5 py-1 ml-auto text-[0.68rem] border rounded-md"
          >All teams <ChevronDown :size="11"
        /></span>
      </div>

      <div class="mt-3 overflow-hidden border rounded-lg">
        <div
          class="grid grid-cols-[minmax(0,1fr)_3.4rem_3.2rem] gap-2 px-3 py-2 text-[0.6rem] font-medium tracking-wide uppercase border-b bg-muted/20 text-muted-foreground sm:grid-cols-[minmax(0,1fr)_3.5rem_3.2rem_3.2rem]"
        >
          <span>Team</span><span class="text-right">Playoff</span
          ><span class="hidden text-right sm:block">Bye</span
          ><span class="text-right">Proj W</span>
        </div>
        <div
          v-for="team in teams"
          :key="team.team"
          class="grid grid-cols-[minmax(0,1fr)_3.4rem_3.2rem] items-center gap-2 px-3 py-2.5 border-b last:border-b-0 sm:grid-cols-[minmax(0,1fr)_3.5rem_3.2rem_3.2rem]"
        >
          <div class="flex items-center min-w-0 gap-2">
            <img
              :src="`/avatars/avatar${team.avatar}.svg`"
              alt=""
              class="border rounded-full size-8 bg-muted"
            />
            <div class="min-w-0">
              <p class="text-xs font-medium truncate">{{ team.team }}</p>
              <p class="text-[0.64rem] text-muted-foreground">
                {{ team.record }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold tabular-nums">{{ team.playoff }}%</p>
            <div class="h-1 mt-1 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary"
                :style="{ width: `${team.playoff}%` }"
              ></div>
            </div>
          </div>
          <span class="hidden text-xs text-right tabular-nums sm:block"
            >{{ team.bye }}%</span
          >
          <span class="text-xs font-medium text-right tabular-nums">{{
            team.wins.toFixed(1)
          }}</span>
        </div>
      </div>

      <div class="grid gap-2 mt-3 sm:grid-cols-2">
        <div class="p-3 border rounded-lg bg-muted/15">
          <p class="text-[0.64rem] text-muted-foreground">Biggest riser</p>
          <p class="mt-1 text-xs font-semibold">Breece's Puffs</p>
          <p class="mt-1 text-[0.68rem] text-success">
            +18% after the Week 11 win
          </p>
        </div>
        <div class="p-3 border rounded-lg bg-muted/15">
          <p class="text-[0.64rem] text-muted-foreground">Cutoff scenario</p>
          <p class="mt-1 text-xs font-semibold">9 wins likely qualifies</p>
          <p class="mt-1 text-[0.68rem] text-muted-foreground">
            74% across remaining simulations
          </p>
        </div>
      </div>
    </div>
  </ProductPreviewFrame>
</template>
