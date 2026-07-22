<script setup lang="ts">
import { onMounted } from "vue";

import { Button } from "@/components/ui/button";
import DraftRoomSample from "@/components/league_narratives/DraftRoomSample.vue";
import {
  getLeagueAnalyticsProperties,
  trackPremiumFunnelEvent,
} from "@/lib/analytics";
import { useStore } from "@/store/store";

const store = useStore();
const auctionSampleAllocations = [
  { position: "RB", amount: "$76" },
  { position: "WR", amount: "$72" },
  { position: "QB", amount: "$24" },
  { position: "TE", amount: "$18" },
];
const props = withDefaults(
  defineProps<{
    isAuction?: boolean;
  }>(),
  { isAuction: false }
);

const analyticsProperties = () => ({
  feature: "draft_room",
  source: "draft_room_locked_preview",
  preview_type: props.isAuction ? "auction_sample_data" : "sample_data",
  ...getLeagueAnalyticsProperties(store.currentLeague),
});

onMounted(() => {
  trackPremiumFunnelEvent("paywall_viewed", analyticsProperties());
});

const trackUnlockClick = () => {
  trackPremiumFunnelEvent("premium_cta_clicked", {
    ...analyticsProperties(),
    cta: "unlock_draft_room_scouting",
  });
  store.currentTab = "";
};
</script>

<template>
  <div>
    <div v-if="isAuction" class="p-4 border rounded-card sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="heading-card">Auction Budget Plan</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Sample allocation based on historical manager spending.
          </p>
        </div>
        <span class="px-2 py-1 text-xs font-medium border rounded-md">
          Sample data
        </span>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-4 sm:grid-cols-4">
        <div
          v-for="item in auctionSampleAllocations"
          :key="item.position"
          class="p-3 rounded-card bg-surface-subtle"
        >
          <p class="text-xs text-muted-foreground">{{ item.position }}</p>
          <p class="mt-1 font-semibold">{{ item.amount }}</p>
        </div>
      </div>
    </div>
    <DraftRoomSample v-else />

    <div
      class="flex flex-col gap-3 pt-4 mt-4 border-t sm:flex-row sm:items-center sm:justify-between"
    >
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
          Unlock Draft Room Scouting
        </router-link>
      </Button>
    </div>
  </div>
</template>
