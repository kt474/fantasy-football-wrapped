<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DynastyPerspective,
  TradeFinderPlayer,
  TradeFinderRoster,
  TradeValuationMode,
} from "@/lib/tradeFinder";

const props = defineProps<{
  rosters: TradeFinderRoster[];
  loading?: boolean;
  valuationMode?: TradeValuationMode;
}>();

const dynastyPerspective = defineModel<DynastyPerspective>(
  "dynastyPerspective",
  { required: true }
);
const selectedPosition = ref("ALL");
const currentPage = ref(1);
const PAGE_SIZE = 25;

const players = computed(() => {
  const byPlayerId = new Map<string, TradeFinderPlayer>();
  props.rosters.forEach((roster) => {
    roster.players.forEach((player) => {
      byPlayerId.set(player.playerId, player);
    });
  });
  return [...byPlayerId.values()].sort(
    (a, b) =>
      a.overallRank - b.overallRank ||
      b.tradeValue - a.tradeValue ||
      b.projectedPoints - a.projectedPoints
  );
});

const positions = computed(() =>
  [...new Set(players.value.map((player) => player.position))]
    .filter(Boolean)
    .sort()
);

const filteredPlayers = computed(() => {
  if (selectedPosition.value === "ALL") return players.value;
  return players.value.filter(
    (player) => player.position === selectedPosition.value
  );
});

const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredPlayers.value.length / PAGE_SIZE))
);

const paginatedPlayers = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredPlayers.value.slice(start, start + PAGE_SIZE);
});

const pageStart = computed(() =>
  filteredPlayers.value.length === 0
    ? 0
    : (currentPage.value - 1) * PAGE_SIZE + 1
);

const pageEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredPlayers.value.length)
);

watch(selectedPosition, () => {
  currentPage.value = 1;
});

watch(players, () => {
  currentPage.value = 1;
});

const valueTier = (value: number) => {
  if (value >= 80) return { label: "Elite", variant: "success" as const };
  if (value >= 60) return { label: "High", variant: "info" as const };
  if (value >= 35) return { label: "Starter", variant: "secondary" as const };
  if (value > 0) return { label: "Depth", variant: "outline" as const };
  return { label: "Replacement", variant: "outline" as const };
};

const formatNumber = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";
</script>

<template>
  <div class="mt-4 space-y-4">
    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="max-w-3xl">
        <p class="text-sm text-muted-foreground sm:text-base">
          {{
            valuationMode === "dynasty"
              ? "Long-term rankings that blend dynasty market ADP with league specific projected production, starting lineup requirements, and your selected team direction."
              : "League specific rankings for rostered players. Trade value is derived from value over the starter level replacement player at each position."
          }}
        </p>
      </div>

      <div
        class="grid w-full gap-2 sm:w-auto"
        :class="
          valuationMode === 'dynasty'
            ? 'grid-cols-2 sm:grid-cols-[9rem_9rem]'
            : 'grid-cols-1 sm:grid-cols-[9rem]'
        "
      >
        <div v-if="valuationMode === 'dynasty'">
          <label class="block mb-1 text-xs font-medium text-muted-foreground">
            Team direction
          </label>
          <Select v-model="dynastyPerspective">
            <SelectTrigger class="w-full" aria-label="Dynasty team direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="contender">Contender</SelectItem>
              <SelectItem value="rebuilder">Rebuilder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label class="block mb-1 text-xs font-medium text-muted-foreground">
            Position
          </label>
          <Select v-model="selectedPosition">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All positions</SelectItem>
              <SelectItem
                v-for="position in positions"
                :key="position"
                :value="position"
              >
                {{ position }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="overflow-hidden border rounded-lg border-border"
      aria-busy="true"
      aria-live="polite"
    >
      <span class="sr-only">Loading trade rankings...</span>
      <div
        v-for="index in PAGE_SIZE"
        :key="index"
        class="grid grid-cols-[3rem_minmax(10rem,1fr)_5rem_6rem] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
      >
        <Skeleton class="w-8 h-5 bg-muted dark:bg-muted/70" />
        <Skeleton class="w-40 h-8 bg-muted dark:bg-muted/70" />
        <Skeleton class="w-12 h-5 bg-muted dark:bg-muted/70" />
        <Skeleton class="w-16 h-6 bg-muted dark:bg-muted/70" />
      </div>
    </div>

    <div
      v-else-if="players.length === 0"
      class="px-5 py-10 text-center border border-dashed rounded-lg border-border"
    >
      <p class="font-medium">No player values available</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Rankings will populate when this league has roster and valuation data.
      </p>
    </div>

    <div
      v-else-if="filteredPlayers.length === 0"
      class="px-5 py-10 text-center border border-dashed rounded-lg border-border"
    >
      <p class="font-medium">No matching players</p>
      <p class="mt-1 text-sm text-muted-foreground">Try another position.</p>
    </div>

    <div v-else class="overflow-hidden border rounded-lg border-border">
      <div
        class="overflow-x-auto"
        role="region"
        aria-label="League trade value rankings"
        tabindex="0"
      >
        <table class="w-full min-w-[58rem] text-sm">
          <thead class="text-xs text-left bg-muted/50 text-muted-foreground">
            <tr>
              <th class="px-4 py-3 font-medium">OVR</th>
              <th class="px-4 py-3 font-medium">Player</th>
              <th class="px-4 py-3 font-medium">POS rank</th>
              <th
                v-if="valuationMode === 'dynasty'"
                class="px-4 py-3 font-medium text-right"
              >
                Dynasty ADP
              </th>
              <th class="px-4 py-3 font-medium text-right">Trade value</th>
              <th class="px-4 py-3 font-medium text-right">
                {{
                  valuationMode === "dynasty"
                    ? "Projected pts"
                    : valuationMode === "season-results"
                      ? "Season pts"
                      : "ROS pts"
                }}
              </th>
              <th class="px-4 py-3 font-medium text-right">Replacement</th>
              <th class="px-4 py-3 font-medium text-right">VORP</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="player in paginatedPlayers"
              :key="player.playerId"
              class="border-t border-border bg-background"
            >
              <td class="px-4 py-3 font-semibold">#{{ player.overallRank }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="player.position !== 'DEF'"
                    class="object-cover rounded-full size-9"
                    :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.playerId}.jpg`"
                    alt=""
                  />
                  <img
                    v-else
                    class="object-contain rounded-full size-9"
                    :src="`https://sleepercdn.com/images/team_logos/nfl/${player.playerId.toLowerCase()}.png`"
                    alt=""
                  />
                  <div>
                    <p class="font-medium">
                      {{ player.name || `${player.team} Defense` }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ player.position }} · {{ player.team }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 font-medium">
                {{ player.position }}{{ player.positionRank }}
              </td>
              <td
                v-if="valuationMode === 'dynasty'"
                class="px-4 py-3 text-right text-muted-foreground"
              >
                {{
                  player.dynastyAdp ? formatNumber(player.dynastyAdp, 1) : "—"
                }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <Badge :variant="valueTier(player.tradeValue).variant">
                    {{ valueTier(player.tradeValue).label }}
                  </Badge>
                  <span class="font-semibold min-w-10">
                    {{ formatNumber(player.tradeValue, 1) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                {{ formatNumber(player.projectedPoints) }}
              </td>
              <td class="px-4 py-3 text-right text-muted-foreground">
                {{ formatNumber(player.replacementPoints) }}
              </td>
              <td class="px-4 py-3 font-medium text-right">
                {{ formatNumber(player.vorp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="flex flex-col gap-3 px-4 py-3 text-xs border-t border-border sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-muted-foreground">
          Showing {{ pageStart }}–{{ pageEnd }} of
          {{ filteredPlayers.length }} rostered players.
        </p>
        <nav
          v-if="pageCount > 1"
          class="flex items-center gap-2"
          aria-label="Player rankings pagination"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="currentPage === 1"
            @click="currentPage -= 1"
          >
            Previous
          </Button>
          <span class="px-1 tabular-nums text-muted-foreground">
            Page {{ currentPage }} of {{ pageCount }}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="currentPage === pageCount"
            @click="currentPage += 1"
          >
            Next
          </Button>
        </nav>
      </div>
    </div>
  </div>
</template>
