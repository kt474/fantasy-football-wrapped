<script setup lang="ts">
import { Search, SlidersHorizontal } from "@lucide/vue";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";
import PlayerHeadshot from "./PlayerHeadshot.vue";
import { demoTradeValueRosters } from "@/data/demo/trade-values";

const players = demoTradeValueRosters
  .flatMap((roster) =>
    roster.players.map((player) => ({
      ...player,
      managerName: roster.managerName,
    }))
  )
  .sort((a, b) => a.overallRank - b.overallRank)
  .slice(0, 5);

const getTier = (value: number) =>
  value >= 80 ? "Elite" : value >= 60 ? "High" : "Starter";
</script>

<template>
  <ProductPreviewFrame
    title="Player Values"
    eyebrow="Fourth & Long · 2026 season values"
  >
    <template #toolbar>
      <span
        class="hidden text-[0.68rem] text-muted-foreground sm:inline-flex sm:items-center sm:gap-1"
      >
        <SlidersHorizontal :size="12" /> Redraft
      </span>
    </template>

    <div class="p-4">
      <p class="text-xs leading-5 text-muted-foreground">
        League-specific rankings based on value over the starter-level
        replacement player at each position.
      </p>

      <div class="grid gap-2 p-3 mt-3 border rounded-lg sm:grid-cols-3">
        <div
          class="flex items-center gap-2 px-3 py-2 border rounded-md bg-background"
        >
          <Search :size="14" class="text-muted-foreground" />
          <span class="text-xs text-muted-foreground">Search players</span>
        </div>
        <div class="px-3 py-2 border rounded-md bg-background">
          <span class="block text-[0.62rem] text-muted-foreground">Manager</span>
          <span class="text-xs font-medium">All managers</span>
        </div>
        <div class="px-3 py-2 border rounded-md bg-background">
          <span class="block text-[0.62rem] text-muted-foreground">Position</span>
          <span class="text-xs font-medium">All positions</span>
        </div>
      </div>

      <div class="mt-3 overflow-hidden border rounded-lg">
        <div
          class="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-3 px-3 py-2 text-[0.62rem] font-medium uppercase tracking-wide border-b bg-muted/20 text-muted-foreground sm:grid-cols-[2rem_minmax(0,1fr)_6rem_4.5rem]"
        >
          <span>Rank</span>
          <span>Player</span>
          <span class="hidden sm:block">Manager</span>
          <span class="text-right">Value</span>
        </div>
        <div
          v-for="player in players"
          :key="player.playerId"
          class="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-3 px-3 py-2.5 border-b last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_6rem_4.5rem]"
        >
          <span class="text-sm font-semibold tabular-nums"
            >#{{ player.overallRank }}</span
          >
          <div class="flex items-center min-w-0 gap-2">
            <PlayerHeadshot
              :player-id="player.playerId"
              :name="player.name"
              :position="player.position"
              :team="player.team"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ player.name }}</p>
              <p class="text-[0.68rem] text-muted-foreground">
                {{ player.position }}{{ player.positionRank }} ·
                {{ player.team }} · {{ player.projectedPoints.toFixed(0) }} proj
              </p>
            </div>
          </div>
          <span
            class="hidden text-[0.68rem] truncate text-muted-foreground sm:block"
          >
            {{ player.managerName }}
          </span>
          <div class="text-right">
            <p class="text-sm font-semibold tabular-nums">
              {{ player.tradeValue.toFixed(1) }}
            </p>
            <p class="text-[0.65rem] text-primary">
              {{ getTier(player.tradeValue) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </ProductPreviewFrame>
</template>
