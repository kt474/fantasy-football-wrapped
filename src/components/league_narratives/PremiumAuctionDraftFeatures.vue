<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  AUCTION_PLAN_POSITIONS,
  getAuctionBudgetPlan,
  getAuctionPositionPriceBands,
  getAuctionRoomBenchmarks,
  getAuctionTendencySummary,
} from "@/lib/auctionNarratives";
import type { ManagerArchetype } from "@/lib/narratives";
import { Badge } from "@/components/ui/badge";
import Card from "@/components/ui/card/Card.vue";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const props = defineProps<{
  archetypes: ManagerArchetype[];
  auctionBudget?: number;
  embedded?: boolean;
}>();

const rows = computed(() =>
  props.archetypes.flatMap((manager) => {
    const summary = getAuctionTendencySummary(manager.auctionHistory ?? []);
    return summary ? [{ manager, summary }] : [];
  })
);
const selectedManagerId = ref("");
const plannedBudget = ref<string | number>(props.auctionBudget ?? 200);
const selectedManager = computed(
  () =>
    rows.value.find((row) => row.manager.userId === selectedManagerId.value)
      ?.manager ?? rows.value[0]?.manager
);
const budgetPlan = computed(() =>
  selectedManager.value
    ? getAuctionBudgetPlan(selectedManager.value, Number(plannedBudget.value))
    : null
);
const roomBenchmarks = computed(() =>
  getAuctionRoomBenchmarks(props.archetypes, Number(plannedBudget.value))
);
const priceBandGroups = computed(() => {
  const priceBands = getAuctionPositionPriceBands(props.archetypes);
  return AUCTION_PLAN_POSITIONS.map((position) => ({
    position,
    bands: priceBands.filter((band) => band.position === position),
  })).filter(({ bands }) => bands.length);
});

watch(
  rows,
  (currentRows) => {
    if (
      currentRows.length &&
      !currentRows.some((row) => row.manager.userId === selectedManagerId.value)
    ) {
      selectedManagerId.value = currentRows[0].manager.userId;
    }
  },
  { immediate: true }
);

watch(
  () => props.auctionBudget,
  (auctionBudget) => {
    if (auctionBudget && auctionBudget > 0) plannedBudget.value = auctionBudget;
  }
);

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const benchmarkFor = (position: string) =>
  roomBenchmarks.value.find((benchmark) => benchmark.position === position);
const formatRoomDifference = (position: string, amount: number) => {
  const benchmark = benchmarkFor(position);
  if (!benchmark) return null;
  const difference = amount - benchmark.averageAmount;
  if (difference === 0) return "Matches room average";
  return `${difference > 0 ? "+" : "−"}$${Math.abs(difference)} vs room`;
};
</script>

<template>
  <component
    :is="embedded ? 'div' : Card"
    v-if="rows.length"
    :class="embedded ? '' : 'p-4 md:p-6'"
  >
    <div class="space-y-4">
      <Card class="p-4 shadow-none sm:p-5">
        <h3 class="heading-card">Room Budget Benchmarks</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          What this league historically spends at each position, scaled to your
          selected budget.
        </p>

        <div class="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="benchmark in roomBenchmarks"
            :key="benchmark.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <p class="text-sm font-medium">{{ benchmark.position }}</p>
            <p class="mt-1 text-xl font-semibold">
              ${{ benchmark.averageAmount }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ formatPercent(benchmark.averageShare) }} room average
            </p>
            <p class="pt-2 mt-2 text-xs border-t text-muted-foreground">
              Likely spenders: {{ benchmark.likelySpenders.join(", ") }}
            </p>
          </div>
        </div>
      </Card>

      <Card v-if="priceBandGroups.length" class="p-4 shadow-none sm:p-5">
        <h3 class="heading-card">Historical Price Bands</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Median and middle 50% of this room’s non-keeper winning bids.
        </p>

        <div class="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="group in priceBandGroups"
            :key="group.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <p class="text-sm font-medium">{{ group.position }}</p>
            <div
              v-for="band in group.bands"
              :key="band.tier"
              class="pt-2 mt-2 border-t first:mt-1 first:border-t-0"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs text-muted-foreground">
                  {{ group.position }}{{ band.tier }}
                </span>
                <span class="font-semibold">${{ band.medianAmount }}</span>
              </div>
              <p class="text-xs text-muted-foreground">
                ${{ band.lowAmount }}–${{ band.highAmount }} typical ·
                {{ band.sampleSize }} bids
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card class="p-4 shadow-none sm:p-5">
        <h3 class="heading-card">Auction Budget Plan</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Scale a manager’s historical position spending to your planned budget.
        </p>

        <div class="grid gap-2 mt-5 sm:grid-cols-2 lg:w-[30rem]">
          <div>
            <label for="auction-plan-manager" class="text-sm font-medium">
              Build from
            </label>
            <Select v-model="selectedManagerId">
              <SelectTrigger id="auction-plan-manager" class="w-full mt-1">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="row in rows"
                  :key="row.manager.userId"
                  :value="row.manager.userId"
                >
                  {{ row.manager.displayName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label for="auction-plan-budget" class="text-sm font-medium">
              Starting budget
            </label>
            <Input
              id="auction-plan-budget"
              v-model="plannedBudget"
              type="number"
              min="1"
              max="10000"
              class="mt-1"
            />
          </div>
        </div>

        <template v-if="budgetPlan">
          <Badge variant="outline" class="mt-4">
            Suggested top bid: ${{ budgetPlan.suggestedTopBid }}
          </Badge>
          <div class="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-5">
            <div
              v-for="allocation in budgetPlan.allocations"
              :key="allocation.position"
              class="p-3 border rounded-card bg-surface-subtle"
            >
              <p class="text-sm text-muted-foreground">
                {{ allocation.position }}
              </p>
              <p class="mt-1 text-xl font-semibold">${{ allocation.amount }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatPercent(allocation.share) }}
              </p>
              <p
                v-if="formatRoomDifference(allocation.position, allocation.amount)"
                class="pt-2 mt-2 text-xs border-t text-muted-foreground"
              >
                {{ formatRoomDifference(allocation.position, allocation.amount) }}
              </p>
            </div>
          </div>
        </template>

        <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
          Based on completed non-keeper purchases. Unspent dollars and
          league-specific rules can change the final allocation.
        </p>
      </Card>
    </div>
  </component>
</template>
