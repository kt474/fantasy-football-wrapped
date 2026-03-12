<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Card from "../ui/card/Card.vue";
import { generateManagerArchetype, type ManagerBlurbsPayload } from "@/api/api";
import type { ManagerArchetype } from "@/lib/narratives";
import { toast } from "vue-sonner";
import { useStore } from "@/store/store";
import { LeagueInfoType } from "@/types/types";
import Separator from "../ui/separator/Separator.vue";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription.ts";
import { Button } from "@/components/ui/button";

const store = useStore();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const props = defineProps<{
  archetypes: ManagerArchetype[];
  payload: ManagerBlurbsPayload;
  preparePayload?: () => Promise<ManagerBlurbsPayload>;
}>();

const isLoading = ref(false);
const blurbsByUserId = ref<Record<string, string>>({});

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
      store.leagueInfo[store.currentLeagueIndex].leagueId,
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
    authStore.isAuthenticated &&
    subscriptionStore.isPremium &&
    props.payload.managers.length > 0 &&
    !isLoading.value
);

const generateButtonLabel = computed(() => {
  if (isLoading.value) return "Generating...";
  return "Generate profiles";
});

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
    <div class="flex flex-wrap justify-between gap-4 sm:flex-nowrap">
      <div>
        <p class="text-3xl font-bold leading-none">Manager Profiles</p>
        <p class="mt-4 sm:w-2/3 text-muted-foreground">
          Each manager’s long-term record and historic trends.
          <span v-if="!subscriptionStore.isPremium">
            A
            <router-link
              :to="{ path: '/account', query: $route.query }"
              class="font-medium cursor-pointer hover:underline"
              @click="store.currentTab = ''"
            >
              Premium subscription</router-link
            >
            unlocks custom profile descriptions that highlight their tendencies,
            strengths, and league identity.
          </span>
        </p>
        <p class="text-muted-foreground"></p>
      </div>
      <Button :disabled="!canGenerateArchetypes" @click="getManagerArchetypes">
        {{ generateButtonLabel }}
      </Button>
    </div>
    <div class="grid gap-4 mt-4 sm:grid-cols-2 md:grid-cols-3">
      <div
        v-for="archetype in archetypes"
        :key="archetype.userId"
        class="p-4 border rounded-lg"
      >
        <div class="flex items-center gap-3">
          <img
            v-if="archetype.avatarImg"
            :src="archetype.avatarImg"
            :alt="`${archetype.displayName} avatar`"
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
          class="mt-2 text-sm leading-relaxed text-muted-foreground"
        >
          {{ blurbsByUserId[archetype.userId] }}
        </p>
        <p
          class="my-4 text-sm leading-relaxed text-muted-foreground"
          v-else-if="isLoading"
        >
          Loading manager description...
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
  </Card>
</template>
