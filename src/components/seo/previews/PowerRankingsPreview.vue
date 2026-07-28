<script setup lang="ts">
import { ChevronDown, TrendingUp } from "@lucide/vue";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";

const rankings = [
  { rank: 1, avatar: 6, team: "Saquondo", record: "9-5", score: 82.4, move: 2 },
  {
    rank: 2,
    avatar: 8,
    team: "Ja’Marr the Merrier",
    record: "8-6",
    score: 79.1,
    move: -1,
  },
  {
    rank: 3,
    avatar: 5,
    team: "Breece's Puffs",
    record: "8-6",
    score: 76.8,
    move: 1,
  },
  {
    rank: 4,
    avatar: 4,
    team: "Baby Back Gibbs",
    record: "8-6",
    score: 73.5,
    move: 0,
  },
  {
    rank: 5,
    avatar: 3,
    team: "The Princess McBride",
    record: "9-5",
    score: 71.9,
    move: -2,
  },
];

const paths = [
  "M8 88 L66 72 L124 80 L182 48 L240 56 L298 24",
  "M8 40 L66 56 L124 32 L182 64 L240 40 L298 48",
  "M8 72 L66 88 L124 64 L182 80 L240 64 L298 56",
];
</script>

<template>
  <ProductPreviewFrame
    title="Power Rankings"
    eyebrow="Fourth & Long · Weekly ranking history"
  >
    <template #toolbar>
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.68rem] border rounded-md bg-background"
      >
        Week 8 <ChevronDown :size="12" />
      </span>
    </template>

    <div class="grid lg:grid-cols-[0.9fr_1.1fr]">
      <section class="border-b lg:border-b-0 lg:border-r">
        <div
          class="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] gap-2 px-3 py-2 text-[0.62rem] font-medium tracking-wide uppercase border-b bg-muted/15 text-muted-foreground"
        >
          <span>Rank</span><span>Team</span><span class="text-right">Score</span>
        </div>
        <div
          v-for="team in rankings"
          :key="team.team"
          class="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-2 px-3 py-2.5 border-b last:border-b-0"
        >
          <span class="text-sm font-bold tabular-nums">{{ team.rank }}</span>
          <div class="flex items-center min-w-0 gap-2">
            <img
              :src="`/avatars/avatar${team.avatar}.svg`"
              alt=""
              class="border rounded-full size-8 bg-muted"
            />
            <div class="min-w-0">
              <p class="text-xs font-medium truncate">{{ team.team }}</p>
              <p class="text-[0.65rem] text-muted-foreground">
                {{ team.record }}
                <span
                  v-if="team.move"
                  class="ml-1"
                  :class="team.move > 0 ? 'text-success' : 'text-destructive'"
                >
                  {{ team.move > 0 ? `↑${team.move}` : `↓${Math.abs(team.move)}` }}
                </span>
              </p>
            </div>
          </div>
          <span class="text-xs font-semibold text-right tabular-nums">
            {{ team.score.toFixed(1) }}
          </span>
        </div>
      </section>

      <section class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold">Ranking movement</p>
            <p class="mt-1 text-[0.66rem] text-muted-foreground">
              Preseason through Week 8
            </p>
          </div>
          <span
            class="inline-flex items-center gap-1 text-[0.65rem] text-success"
          >
            <TrendingUp :size="12" /> Saquondo +3
          </span>
        </div>
        <div
          class="relative mt-4 overflow-hidden border rounded-lg h-40 bg-[linear-gradient(to_bottom,hsl(var(--border)/.55)_1px,transparent_1px)] bg-[length:100%_25%]"
        >
          <svg
            viewBox="0 0 306 112"
            preserveAspectRatio="none"
            class="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-2.5rem)]"
            aria-label="Sample weekly power-ranking movement chart"
          >
            <path
              v-for="(path, index) in paths"
              :key="path"
              :d="path"
              fill="none"
              :stroke="
                index === 0
                  ? 'hsl(var(--primary))'
                  : index === 1
                    ? 'hsl(var(--chart-rank-4))'
                    : 'hsl(var(--chart-rank-7))'
              "
              :stroke-width="index === 0 ? 4 : 2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :opacity="index === 0 ? 1 : 0.65"
            />
          </svg>
          <div
            class="absolute inset-x-3 bottom-1 flex justify-between text-[0.58rem] text-muted-foreground"
          >
            <span>Pre</span><span>W2</span><span>W4</span><span>W6</span
            ><span>W8</span>
          </div>
        </div>
        <p class="mt-3 text-[0.62rem] leading-4 text-muted-foreground">
          Formula combines weekly scoring, scoring range, and win percentage.
        </p>
      </section>
    </div>
  </ProductPreviewFrame>
</template>
