<script setup lang="ts">
import { LockKeyhole } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

import {
  getDraftRoomCheatSheetSummary,
  type ManagerArchetype,
} from "@/lib/narratives";
import Card from "@/components/ui/card/Card.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FreeDraftFeatures from "./FreeDraftFeatures.vue";
import LockedPremiumDraftPreview from "./LockedPremiumDraftPreview.vue";
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
const draftRoomManagers = computed(
  () => props.draftRoomArchetypes ?? props.archetypes
);
const hasDraftRoomData = computed(() =>
  draftRoomManagers.value.some((manager) =>
    getDraftRoomCheatSheetSummary(manager.draftHistory ?? [])
  )
);

const activeView = ref(props.isPremium ? "draft-room" : "tendencies");

const activeTitle = computed(() =>
  activeView.value === "draft-room" ? "Draft Room" : "Draft Tendencies"
);

const activeDescription = computed(() => {
  if (activeView.value === "tendencies") {
    return "Each manager’s draft day habits, favorite early-round positions, and historical draft rankings.";
  }
  if (!hasDraftRoomData.value) {
    return "Draft Room scouting becomes available after completed draft history is imported for a current league manager.";
  }
  if (props.isPremium) {
    return "Plan your draft and scout every league mate from one specific workspace.";
  }
  return "Preview with sample data to show how draft history can be used to plan your next draft and scout your league mates. Available with a Premium subscription.";
});

watch(
  () => props.isPremium,
  (isPremium, wasPremium) => {
    if (isPremium && !wasPremium) activeView.value = "draft-room";
  }
);
</script>

<template>
  <Card class="p-4 md:p-6">
    <div v-if="!hasDraftHistory">
      <h2 class="heading-section">Draft Room</h2>
      <div class="max-w-2xl p-4 mt-4 border rounded-card bg-muted/30">
        <p class="font-semibold">Draft history needed</p>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          Once this league has at least one completed imported draft, ffwrapped
          can identify positional runs and manager tendencies. Check back after
          the draft is complete.
        </p>
      </div>
    </div>

    <Tabs v-else v-model="activeView">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <h2 class="heading-section">{{ activeTitle }}</h2>
          <p
            class="max-w-2xl mt-4 text-sm leading-relaxed sm:text-base text-muted-foreground"
          >
            {{ activeDescription }}
          </p>
        </div>
        <TabsList class="self-start">
          <TabsTrigger value="tendencies">Draft Tendencies</TabsTrigger>
          <TabsTrigger value="draft-room" class="gap-1.5">
            Draft Room
            <LockKeyhole
              v-if="!isPremium && hasDraftRoomData"
              class="inline-block mb-1 mr-1 size-3"
              aria-hidden="true"
            />
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tendencies" class="mt-4">
        <FreeDraftFeatures
          v-if="activeView === 'tendencies'"
          :archetypes="archetypes"
          embedded
        />
      </TabsContent>

      <TabsContent value="draft-room" class="mt-4">
        <div
          v-if="activeView === 'draft-room' && !hasDraftRoomData"
          class="max-w-2xl p-4 border rounded-card bg-muted/30"
        >
          <p class="font-semibold">Current manager history needed</p>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
            This league has older draft history, but none of its current
            managers have enough imported data for Draft Room scouting yet.
            Check back after a current manager completes an imported draft.
          </p>
        </div>
        <PremiumDraftFeatures
          v-else-if="activeView === 'draft-room' && isPremium"
          :archetypes="archetypes"
          :draft-room-archetypes="draftRoomArchetypes"
          :league-size="leagueSize"
          embedded
        />
        <LockedPremiumDraftPreview
          v-else-if="activeView === 'draft-room' && hasDraftRoomData"
          embedded
        />
      </TabsContent>
    </Tabs>
  </Card>
</template>
