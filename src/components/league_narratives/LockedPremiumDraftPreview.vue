<script setup lang="ts">
import { computed, ref } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DraftRoomSample from "@/components/league_narratives/DraftRoomSample.vue";
import type { ManagerArchetype } from "@/lib/narratives";
import {
  getLeagueAnalyticsProperties,
  trackPremiumJourneyStep,
} from "@/lib/analytics";
import { useStore } from "@/store/store";
import { usePaywallViewTracking } from "@/composables/usePaywallViewTracking";

const store = useStore();
const paywallElement = ref<HTMLElement | null>(null);
const auctionRoomBenchmarks = [
  { position: "RB", amount: 78, share: 39 },
  { position: "WR", amount: 70, share: 35 },
  { position: "QB", amount: 27, share: 14 },
  { position: "TE", amount: 19, share: 10 },
];
const auctionPositionCompetition = [
  {
    position: "RB",
    roomAverage: 39,
    managers: [
      { managerIndex: 0, share: 46, difference: 7 },
      { managerIndex: 1, share: 42, difference: 3 },
      { managerIndex: 2, share: 37, difference: -2 },
    ],
  },
  {
    position: "WR",
    roomAverage: 35,
    managers: [
      { managerIndex: 1, share: 45, difference: 10 },
      { managerIndex: 2, share: 40, difference: 5 },
      { managerIndex: 3, share: 33, difference: -2 },
    ],
  },
  {
    position: "QB",
    roomAverage: 14,
    managers: [
      { managerIndex: 2, share: 29, difference: 15 },
      { managerIndex: 3, share: 21, difference: 7 },
      { managerIndex: 0, share: 16, difference: 2 },
    ],
  },
  {
    position: "TE",
    roomAverage: 10,
    managers: [
      { managerIndex: 3, share: 18, difference: 8 },
      { managerIndex: 0, share: 14, difference: 4 },
      { managerIndex: 1, share: 11, difference: 1 },
    ],
  },
];
const auctionPriceBands = [
  { position: "RB", tier: 1, median: 48, low: 39, high: 57, sampleSize: 18 },
  { position: "WR", tier: 1, median: 44, low: 35, high: 51, sampleSize: 20 },
  { position: "QB", tier: 1, median: 24, low: 17, high: 32, sampleSize: 14 },
  { position: "TE", tier: 1, median: 16, low: 10, high: 23, sampleSize: 13 },
];
const auctionBudgetAllocations = [
  { position: "RB", amount: 76, share: 38, difference: "−$2 vs room" },
  { position: "WR", amount: 72, share: 36, difference: "+$2 vs room" },
  { position: "QB", amount: 24, share: 12, difference: "−$3 vs room" },
  { position: "TE", amount: 18, share: 9, difference: "−$1 vs room" },
  { position: "Other / endgame", amount: 10, share: 5, difference: null },
];
const props = withDefaults(
  defineProps<{
    archetypes: ManagerArchetype[];
    isAuction?: boolean;
  }>(),
  { isAuction: false }
);

const previewManagerName = "Manager A";
const previewManagerAt = (index: number) =>
  ["Manager A", "Manager B", "Manager C", "Manager D"][index % 4];
const formatCompetitionDifference = (difference: number) =>
  difference === 0
    ? "At room average"
    : `${difference > 0 ? "+" : "−"}${Math.abs(difference)} pts vs room`;

const historySummary = computed(() => {
  const counts = props.archetypes.map((manager) =>
    props.isAuction
      ? (manager.auctionHistory?.length ?? 0)
      : manager.draftHistory.length
  );
  return {
    managers: counts.filter(Boolean).length,
    drafts: counts.reduce((total, count) => total + count, 0),
  };
});

const previewCopy = computed(() =>
  props.isAuction
    ? {
        historyLabel:
          historySummary.value.drafts === 1
            ? "manager-auction history"
            : "manager-auction histories",
        description: `See how ${historySummary.value.managers} ${
          historySummary.value.managers === 1
            ? "manager spends"
            : "managers spend"
        } and build a budget around the way your league actually bids.`,
      }
    : {
        historyLabel:
          historySummary.value.drafts === 1 ? "past draft" : "past drafts",
        description: `Scout patterns across ${historySummary.value.managers} ${
          historySummary.value.managers === 1 ? "manager" : "managers"
        } and plan around the way your league actually drafts.`,
      }
);

const unlockLabel = computed(() =>
  props.isAuction
    ? "Unlock Auction Draft Room"
    : "Unlock Draft Room Scouting"
);

const analyticsProperties = () => ({
  feature: "draft_room",
  source: "draft_room_locked_preview",
  preview_type: "personalized_history",
  manager_count: historySummary.value.managers,
  tracked_drafts: historySummary.value.drafts,
  ...getLeagueAnalyticsProperties(store.currentLeague),
});

usePaywallViewTracking(paywallElement, () => {
  trackPremiumJourneyStep("paywall_viewed", analyticsProperties());
});

const trackUnlockClick = () => {
  trackPremiumJourneyStep("premium_cta_clicked", {
    ...analyticsProperties(),
    cta: "unlock_draft_room_scouting",
  });
  store.currentTab = "";
};
</script>

<template>
  <div>
    <div v-if="isAuction" class="space-y-4">
      <section class="p-4 border rounded-card sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="heading-card">Room Budget Benchmarks</h3>
            <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
              What this league historically spends at each position, scaled to
              a $200 budget.
            </p>
          </div>
          <Badge variant="outline" class="shrink-0">Sample preview</Badge>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
          <div
            v-for="benchmark in auctionRoomBenchmarks"
            :key="benchmark.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-sm font-medium">{{ benchmark.position }}</p>
              <p class="text-xs text-muted-foreground">
                {{ benchmark.share }}%
              </p>
            </div>
            <p class="mt-1 text-xl font-semibold">${{ benchmark.amount }}</p>
            <div
              class="h-1.5 mt-3 overflow-hidden rounded-full bg-secondary"
              aria-hidden="true"
            >
              <div
                class="h-full rounded-full bg-primary"
                :style="{ width: `${benchmark.share * 2}%` }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="p-4 border rounded-card sm:p-5">
        <h3 class="heading-card">Position Competition</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Managers who historically commit the largest share of their auction
          budget to each position.
        </p>

        <div class="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
          <div
            v-for="group in auctionPositionCompetition"
            :key="group.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-sm font-medium">{{ group.position }}</p>
              <p class="text-xs text-muted-foreground">
                {{ group.roomAverage }}% room avg
              </p>
            </div>

            <div class="mt-3 space-y-3">
              <div
                v-for="manager in group.managers"
                :key="manager.managerIndex"
              >
                <div class="flex items-center justify-between gap-2 text-xs">
                  <span class="font-medium truncate">
                    {{ previewManagerAt(manager.managerIndex) }}
                  </span>
                  <span class="tabular-nums text-muted-foreground">
                    {{ manager.share }}%
                  </span>
                </div>
                <div
                  class="h-1.5 mt-1.5 overflow-hidden rounded-full bg-secondary"
                  aria-hidden="true"
                >
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{
                      width: `${Math.min(100, manager.share * 2)}%`,
                    }"
                  />
                </div>
                <p class="mt-1 text-[10px] text-muted-foreground">
                  {{ formatCompetitionDifference(manager.difference) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="p-4 border rounded-card sm:p-5">
        <h3 class="heading-card">Historical Price Bands</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Median and middle 50% of this room’s non-keeper winning bids.
        </p>

        <div class="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
          <div
            v-for="band in auctionPriceBands"
            :key="band.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <p class="text-sm font-medium">{{ band.position }}</p>
            <div class="pt-2 mt-2 border-t">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs text-muted-foreground">
                  {{ band.position }}{{ band.tier }}
                </span>
                <span class="font-semibold">${{ band.median }}</span>
              </div>
              <p class="text-xs text-muted-foreground">
                ${{ band.low }}–${{ band.high }} typical ·
                {{ band.sampleSize }} bids
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="p-4 border rounded-card sm:p-5">
        <h3 class="heading-card">Auction Budget Plan</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Scale a manager’s historical position spending to your planned
          budget.
        </p>

        <div class="grid gap-2 mt-5 sm:grid-cols-2 lg:w-[30rem]">
          <div>
            <p class="text-sm font-medium">Build from</p>
            <div
              class="flex items-center h-9 px-3 mt-1 text-sm border rounded-md bg-background"
            >
              <span class="truncate">{{ previewManagerName }}</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-medium">Starting budget</p>
            <div
              class="flex items-center h-9 px-3 mt-1 text-sm border rounded-md bg-background"
            >
              $200
            </div>
          </div>
        </div>

        <Badge variant="outline" class="mt-4">Suggested top bid: $56</Badge>

        <div class="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-5">
          <div
            v-for="allocation in auctionBudgetAllocations"
            :key="allocation.position"
            class="p-3 border rounded-card bg-surface-subtle"
          >
            <p class="text-sm text-muted-foreground">
              {{ allocation.position }}
            </p>
            <p class="mt-1 text-xl font-semibold">${{ allocation.amount }}</p>
            <p class="text-xs text-muted-foreground">
              {{ allocation.share }}%
            </p>
            <p
              v-if="allocation.difference"
              class="pt-2 mt-2 text-xs border-t text-muted-foreground"
            >
              {{ allocation.difference }}
            </p>
          </div>
        </div>

        <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
          Based on completed non-keeper purchases. Unspent dollars and
          league-specific rules can change the final allocation.
        </p>
      </section>
    </div>
    <DraftRoomSample v-else />

    <div
      ref="paywallElement"
      class="flex flex-col gap-4 p-4 mt-4 border rounded-card bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div v-if="historySummary.managers" class="max-w-2xl">
        <p class="font-semibold">
          See what the {{ historySummary.drafts.toLocaleString() }}
          {{ previewCopy.historyLabel }}
          {{ historySummary.drafts === 1 ? "reveals" : "reveal" }}
        </p>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          {{ previewCopy.description }}
        </p>
      </div>
      <Button as-child class="shrink-0" size="lg">
        <router-link
          :to="{
            path: '/account',
            query: {
              ...$route.query,
              intent: 'draft_room',
              upgrade_source: 'draft_room_locked_preview',
            },
          }"
          @click="trackUnlockClick"
        >
          {{ unlockLabel }}
        </router-link>
      </Button>
    </div>
  </div>
</template>
