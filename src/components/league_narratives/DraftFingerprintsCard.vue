<script setup lang="ts">
import { computed } from "vue";

import type { ManagerArchetype } from "@/lib/narratives";
import FreeDraftFeatures from "./FreeDraftFeatures.vue";
import PremiumDraftFeatures from "./PremiumDraftFeatures.vue";

const props = withDefaults(
  defineProps<{
    archetypes: ManagerArchetype[];
    draftRoomArchetypes?: ManagerArchetype[];
    leagueSize?: number;
    isPremium?: boolean;
  }>(),
  { isPremium: false }
);

const hasDraftHistory = computed(() =>
  props.archetypes.some((manager) => manager.draftHistory?.length)
);
</script>

<template>
  <div v-if="hasDraftHistory" class="space-y-4">
    <FreeDraftFeatures :archetypes="archetypes" />
    <PremiumDraftFeatures
      v-if="isPremium"
      :archetypes="archetypes"
      :draft-room-archetypes="draftRoomArchetypes"
      :league-size="leagueSize"
    />
  </div>
</template>
