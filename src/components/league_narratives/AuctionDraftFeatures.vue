<script setup lang="ts">
import { computed, ref } from "vue";

import {
  AUCTION_PLAN_POSITIONS,
  getAuctionTendency,
  getAuctionTendencySummary,
} from "@/lib/auctionNarratives";
import type { ManagerArchetype } from "@/lib/narratives";
import ManagerAvatar from "@/components/shared/ManagerAvatar.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card/Card.vue";

const props = defineProps<{
  archetypes: ManagerArchetype[];
  embedded?: boolean;
}>();

const showAll = ref(false);
const rows = computed(() =>
  props.archetypes.flatMap((manager) => {
    const summary = getAuctionTendencySummary(manager.auctionHistory ?? []);
    return summary
      ? [
          {
            manager,
            summary,
            tendency: getAuctionTendency(manager.auctionHistory ?? []),
          },
        ]
      : [];
  })
);
const visibleRows = computed(() =>
  showAll.value ? rows.value : rows.value.slice(0, 3)
);
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
</script>

<template>
  <component
    :is="embedded ? 'div' : Card"
    v-if="rows.length"
    :class="embedded ? '' : 'p-4 md:p-6'"
  >
    <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <div
        v-for="row in visibleRows"
        :key="row.manager.userId"
        class="p-4 border rounded-lg"
      >
        <div class="flex items-center gap-3">
          <ManagerAvatar
            :src="row.manager.avatarImg"
            :alt="`${row.manager.displayName} avatar`"
          />
          <div>
            <p class="font-semibold">{{ row.manager.displayName }}</p>
            <p class="text-xs text-muted-foreground">
              {{ row.summary.trackedDrafts }} tracked
              {{ row.summary.trackedDrafts === 1 ? "auction" : "auctions" }}
            </p>
          </div>
        </div>

        <Badge variant="secondary" class="mt-3">
          {{ row.summary.strategyLabel }}
        </Badge>
        <p class="mt-3 text-sm font-medium leading-relaxed">
          {{ row.tendency }}
        </p>

        <div class="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div class="px-2.5 py-2 rounded-lg bg-secondary/60">
            <p class="text-[10px] tracking-wide uppercase text-muted-foreground">
              Avg top buy
            </p>
            <p class="mt-0.5 font-semibold">
              ${{ Math.round(row.summary.averageTopPurchase) }}
            </p>
          </div>
          <div class="px-2.5 py-2 rounded-lg bg-secondary/60">
            <p class="text-[10px] tracking-wide uppercase text-muted-foreground">
              Top 3 share
            </p>
            <p class="mt-0.5 font-semibold">
              {{ formatPercent(row.summary.averageTopThreeSpendShare) }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 pt-3 mt-3 border-t">
          <Badge
            v-for="position in AUCTION_PLAN_POSITIONS"
            :key="position"
            variant="outline"
          >
            {{ position }}
            {{ formatPercent(row.summary.positionSpendShares[position] ?? 0) }}
          </Badge>
        </div>
      </div>
    </div>

    <div v-if="rows.length > 3" class="flex justify-center mt-4">
      <Button variant="outline" @click="showAll = !showAll">
        {{
          showAll
            ? "Show Fewer Tendencies"
            : `Show All Tendencies (${rows.length})`
        }}
      </Button>
    </div>
  </component>
</template>
