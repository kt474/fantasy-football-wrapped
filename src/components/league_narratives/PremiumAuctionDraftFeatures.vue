<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  analyzeDraftRoom,
  type AuctionDraftRoomResponse,
} from "@/api/draftRoomApi";
import {
  AUCTION_PLAN_POSITIONS,
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
  props.archetypes
    .filter((manager) => manager.auctionHistory?.length)
    .map((manager) => ({ manager }))
);
const selectedManagerId = ref("");
const plannedBudget = ref<string | number>(props.auctionBudget ?? 200);
const analysis = ref<AuctionDraftRoomResponse | null>(null);
const analysisLoading = ref(false);
const analysisError = ref("");
let analysisRequestId = 0;
let analysisTimer: ReturnType<typeof setTimeout> | null = null;

const budgetPlan = computed(() => analysis.value?.budgetPlan ?? null);
const roomBenchmarks = computed(() => analysis.value?.roomBenchmarks ?? []);
const positionCompetition = computed(() => {
  const managerRows = props.archetypes.flatMap((manager) => {
    const summary = getAuctionTendencySummary(manager.auctionHistory ?? []);
    return summary ? [{ manager, summary }] : [];
  });

  return AUCTION_PLAN_POSITIONS.map((position) => {
    const benchmark = roomBenchmarks.value.find(
      (item) => item.position === position
    );
    if (!benchmark) return null;

    return {
      position,
      roomAverage: benchmark.averageShare,
      managers: managerRows
        .map(({ manager, summary }) => ({
          userId: manager.userId,
          name: manager.displayName,
          share: summary.positionSpendShares[position] ?? 0,
          difference:
            (summary.positionSpendShares[position] ?? 0) -
            benchmark.averageShare,
        }))
        .filter((manager) => manager.share > 0)
        .sort((left, right) => right.share - left.share)
        .slice(0, 3),
    };
  }).filter(
    (
      group
    ): group is {
      position: (typeof AUCTION_PLAN_POSITIONS)[number];
      roomAverage: number;
      managers: Array<{
        userId: string;
        name: string;
        share: number;
        difference: number;
      }>;
    } => Boolean(group?.managers.length)
  );
});
const priceBandGroups = computed(() => {
  const priceBands = analysis.value?.priceBands ?? [];
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

const loadDraftRoomAnalysis = async () => {
  if (!rows.value.length || !selectedManagerId.value) {
    analysis.value = null;
    return;
  }

  const requestId = ++analysisRequestId;
  analysisLoading.value = true;
  analysisError.value = "";
  try {
    const response = await analyzeDraftRoom({
      mode: "auction",
      managers: props.archetypes,
      selectedManagerId: selectedManagerId.value,
      budget: Number(plannedBudget.value),
    });
    if (requestId !== analysisRequestId) return;
    if (response.mode !== "auction") {
      throw new Error("The draft-room response was invalid.");
    }
    analysis.value = response;
  } catch (error) {
    if (requestId !== analysisRequestId) return;
    analysisError.value =
      error instanceof Error
        ? error.message
        : "Unable to analyze the draft room right now.";
  } finally {
    if (requestId === analysisRequestId) analysisLoading.value = false;
  }
};

const queueDraftRoomAnalysis = () => {
  if (analysisTimer) clearTimeout(analysisTimer);
  analysisRequestId += 1;
  analysisLoading.value = true;
  analysisError.value = "";
  analysisTimer = setTimeout(() => {
    analysisTimer = null;
    void loadDraftRoomAnalysis();
  }, analysis.value ? 250 : 0);
};

watch(
  [rows, selectedManagerId, () => plannedBudget.value],
  queueDraftRoomAnalysis,
  { immediate: true }
);

watch(
  () => props.auctionBudget,
  (auctionBudget) => {
    if (auctionBudget && auctionBudget > 0) plannedBudget.value = auctionBudget;
  }
);

onBeforeUnmount(() => {
  if (analysisTimer) clearTimeout(analysisTimer);
  analysisRequestId += 1;
});

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatPointDifference = (value: number) => {
  const points = Math.round(value * 100);
  if (points === 0) return "At room average";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} pts vs room`;
};
const competitionBarWidth = (share: number) =>
  `${Math.min(100, Math.round(share * 200))}%`;
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
      <div
        v-if="analysisError"
        class="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-card bg-muted/30"
        role="alert"
      >
        <p class="text-sm text-muted-foreground">{{ analysisError }}</p>
        <button
          type="button"
          class="text-sm font-medium text-primary underline-offset-4 hover:underline"
          @click="loadDraftRoomAnalysis"
        >
          Try again
        </button>
      </div>
      <p
        v-else-if="analysisLoading"
        class="p-4 text-sm border rounded-card text-muted-foreground"
        aria-live="polite"
      >
        {{
          analysis
            ? "Updating your auction draft-room analysis…"
            : "Building your auction draft-room analysis…"
        }}
      </p>

      <Card
        v-if="analysis"
        class="p-4 shadow-none sm:p-5"
        :class="{ 'opacity-60': analysisLoading }"
        :aria-busy="analysisLoading"
      >
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
          </div>
        </div>
      </Card>

      <Card
        v-if="positionCompetition.length"
        class="p-4 shadow-none sm:p-5"
        :class="{ 'opacity-60': analysisLoading }"
        :aria-busy="analysisLoading"
      >
        <h3 class="heading-card">Position Competition</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Managers who historically commit the largest share of their auction
          budget to each position.
        </p>

        <div class="grid gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="group in positionCompetition"
            :key="group.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-sm font-medium">{{ group.position }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatPercent(group.roomAverage) }} room avg
              </p>
            </div>

            <div class="mt-3 space-y-3">
              <div
                v-for="manager in group.managers"
                :key="manager.userId"
              >
                <div class="flex items-center justify-between gap-2 text-xs">
                  <span class="font-medium truncate">{{ manager.name }}</span>
                  <span class="tabular-nums text-muted-foreground">
                    {{ formatPercent(manager.share) }}
                  </span>
                </div>
                <div
                  class="h-1.5 mt-1.5 overflow-hidden rounded-full bg-secondary"
                  aria-hidden="true"
                >
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{ width: competitionBarWidth(manager.share) }"
                  />
                </div>
                <p class="mt-1 text-[10px] text-muted-foreground">
                  {{ formatPointDifference(manager.difference) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        v-if="priceBandGroups.length"
        class="p-4 shadow-none sm:p-5"
        :class="{ 'opacity-60': analysisLoading }"
        :aria-busy="analysisLoading"
      >
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

      <Card
        v-if="analysis"
        class="p-4 shadow-none sm:p-5"
        :class="{ 'opacity-60': analysisLoading }"
        :aria-busy="analysisLoading"
      >
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
                v-if="
                  formatRoomDifference(allocation.position, allocation.amount)
                "
                class="pt-2 mt-2 text-xs border-t text-muted-foreground"
              >
                {{
                  formatRoomDifference(allocation.position, allocation.amount)
                }}
              </p>
            </div>
          </div>
        </template>

        <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
          Based on completed non-keeper purchases. Unspent dollars and league
          specific rules can change the final allocation.
        </p>
      </Card>
    </div>
  </component>
</template>
