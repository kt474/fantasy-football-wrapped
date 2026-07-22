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

const analyticsProperties = () => ({
  feature: "draft_room",
  source: "draft_room_locked_preview",
  preview_type: "sample_data",
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
    <DraftRoomSample />

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
