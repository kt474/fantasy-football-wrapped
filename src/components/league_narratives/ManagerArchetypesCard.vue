<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Card from "../ui/card/Card.vue";
import { generateManagerArchetype, type ManagerBlurbsPayload } from "@/api/api";
import type { ManagerArchetype } from "@/lib/narratives";
import { toast } from "vue-sonner";
import { getLeagueKey, useStore } from "@/store/store";
import { LeagueInfoType } from "@/types/types";
import Separator from "../ui/separator/Separator.vue";
import { useSubscriptionStore } from "@/store/subscription.ts";
import { Button } from "@/components/ui/button";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import { fakeProfileText } from "@/api/fakeLeague";

const store = useStore();
const subscriptionStore = useSubscriptionStore();

const props = defineProps<{
  archetypes: ManagerArchetype[];
  payload: ManagerBlurbsPayload;
  preparePayload?: () => Promise<ManagerBlurbsPayload>;
}>();

const isLoading = ref(false);
const blurbsByUserId = ref<Record<string, string>>({});
const showAllProfiles = ref(false);

const getManagerArchetypes = async () => {
  if (!props.payload.managers.length) {
    return;
  }

  try {
    isLoading.value = true;
    const payload = props.preparePayload
      ? await props.preparePayload()
      : props.payload;
    const result = await generateManagerArchetype(payload);
    blurbsByUserId.value = result.blurbs.reduce(
      (accumulator, entry) => {
        accumulator[entry.userId] = entry.blurb;
        return accumulator;
      },
      {} as Record<string, string>
    );
    store.addManagerProfiles(
      getLeagueKey(store.leagueInfo[store.currentLeagueIndex]),
      blurbsByUserId.value
    );
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate manager blurbs.";
    toast.error(message);
  } finally {
    isLoading.value = false;
  }
};

const storedManagerProfiles = computed(
  () => store.leagueInfo[store.currentLeagueIndex]?.managerProfiles ?? {}
);

const canGenerateArchetypes = computed(
  () =>
    (props.payload.managers.length > 0 &&
      !isLoading.value &&
      Object.keys(blurbsByUserId.value).length == 0) ||
    subscriptionStore.isPremium
);

const generateButtonLabel = computed(() => {
  if (isLoading.value) return "Generating...";
  return "Generate profiles";
});

const visibleArchetypes = computed(() =>
  showAllProfiles.value ? props.archetypes : props.archetypes.slice(0, 6)
);

const hasHiddenProfiles = computed(() => props.archetypes.length > 6);

const toggleProfiles = () => {
  showAllProfiles.value = !showAllProfiles.value;
};

watch(
  storedManagerProfiles,
  (profiles) => {
    if (Object.keys(profiles).length > 0) {
      blurbsByUserId.value = profiles;
      return;
    }
    blurbsByUserId.value = {};
  },
  { immediate: true }
);
</script>

<template>
  <Card class="p-4 md:p-6">
    <div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-3xl font-bold leading-none">Manager Profiles</p>
        <Button :disabled="!canGenerateArchetypes" @click="getManagerArchetypes">
          {{ generateButtonLabel }}
        </Button>
      </div>
      <p class="mt-4 sm:max-w-2xl text-muted-foreground">
        Long-term records, trends, and custom profiles that capture each
        manager’s tendencies, strengths, and overall identity.
      </p>
    </div>
    <div class="grid gap-4 mt-4 sm:grid-cols-2 md:grid-cols-3">
      <div
        v-for="archetype in visibleArchetypes"
        :key="archetype.userId"
        class="p-4 border rounded-lg"
      >
        <div class="flex items-center gap-3">
          <img
            v-if="archetype.avatarImg"
            :src="archetype.avatarImg"
            :alt="`${archetype.displayName} avatar`"
            @error="handleImageError"
            class="w-10 h-10 rounded-full"
          />
          <div>
            <p class="font-semibold">{{ archetype.displayName }}</p>
            <p class="text-sm text-muted-foreground">
              {{ archetype.seasons }} seasons
            </p>
          </div>
        </div>
        <Separator class="mt-2" />
        <p
          v-if="blurbsByUserId[archetype.userId]"
          class="mt-2 text-sm leading-relaxed"
        >
          {{ blurbsByUserId[archetype.userId] }}
        </p>
        <p
          class="mt-2 text-xs leading-relaxed text-muted-foreground"
          v-if="
            !subscriptionStore.isPremium && blurbsByUserId[archetype.userId]
          "
        >
          A
          <router-link
            :to="{ path: '/account', query: $route.query }"
            class="font-medium cursor-pointer hover:underline"
            @click="store.currentTab = ''"
          >
            Premium subscription</router-link
          >
          unlocks all manager descriptions.
        </p>
        <p
          class="my-4 text-sm leading-relaxed text-muted-foreground"
          v-else-if="isLoading"
        >
          Loading manager description...
        </p>
        <p
          v-else-if="store.leagueInfo.length === 0"
          class="mt-2 text-sm leading-relaxed"
        >
          {{ fakeProfileText }}
        </p>
        <div
          class="grid gap-3 mt-4 text-sm sm:grid-cols-2 text-muted-foreground"
        >
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Record</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalWins }}-{{ archetype.totalLosses
              }}<span v-if="archetype.totalTies"
                >-{{ archetype.totalTies }}</span
              >
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Win Rate</p>
            <p class="mt-1 font-medium text-foreground">
              {{ (archetype.winRate * 100).toFixed(1) }}%
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Points For</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalPointsFor.toFixed(1) }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Points Against</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalPointsAgainst.toFixed(1) }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Avg Points / Season</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.averagePointsPerSeason.toFixed(1) }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Avg Efficiency</p>
            <p class="mt-1 font-medium text-foreground">
              {{ (archetype.averageEfficiency * 100).toFixed(1) }}%
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Trades</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalTrades }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Waivers</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalWaivers }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Titles</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.titles }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Playoff Appearances</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.playoffAppearances }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="hasHiddenProfiles" class="flex justify-center mt-4">
      <Button
        @click="toggleProfiles"
        aria-label="Button to show all manager profiles"
        class="flex"
      >
        <svg
          v-if="showAllProfiles"
          class="w-5 h-5 mr-1.5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m5 15 7-7 7 7"
          />
        </svg>
        <svg
          v-else
          class="w-5 h-5 mr-1.5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m19 9-7 7-7-7"
          />
        </svg>
        {{
          showAllProfiles
            ? "Show Fewer Profiles"
            : `Show All Profiles (${props.archetypes.length})`
        }}
      </Button>
    </div>
  </Card>
</template>
