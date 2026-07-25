<script setup lang="ts">
import { computed, ref } from "vue";

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
const auctionSampleAllocations = [
  { position: "RB", amount: "$76" },
  { position: "WR", amount: "$72" },
  { position: "QB", amount: "$24" },
  { position: "TE", amount: "$18" },
];
const props = withDefaults(
  defineProps<{
    archetypes: ManagerArchetype[];
    isAuction?: boolean;
  }>(),
  { isAuction: false }
);

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
      ref="paywallElement"
      class="flex flex-col gap-4 p-4 mt-4 border rounded-card bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div v-if="historySummary.managers">
        <p class="text-xs font-medium uppercase text-muted-foreground">
          Your league data is ready
        </p>
        <p class="mt-1 font-semibold">
          {{ historySummary.managers }} managers ·
          {{ historySummary.drafts }} tracked drafts
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
          Unlock Draft Room Scouting
        </router-link>
      </Button>
    </div>
  </div>
</template>
