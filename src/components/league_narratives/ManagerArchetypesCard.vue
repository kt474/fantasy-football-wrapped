<script setup lang="ts">
import { computed, ref } from "vue";
import Card from "../ui/card/Card.vue";
import Button from "../ui/button/Button.vue";
import {
  generateManagerArchetype,
  type ManagerBlurbsPayload,
} from "@/api/api";
import type { ManagerArchetype } from "@/lib/narratives";
import { toast } from "vue-sonner";

const props = defineProps<{
  archetypes: ManagerArchetype[];
  payload: ManagerBlurbsPayload;
}>();

const isLoading = ref(false);
const blurbsByUserId = ref<Record<string, string>>({});

const hasBlurbs = computed(
  () => Object.keys(blurbsByUserId.value).length === props.archetypes.length
);

const getManagerArchetypes = async () => {
  try {
    isLoading.value = true;
    const result = await generateManagerArchetype(props.payload);
    blurbsByUserId.value = result.blurbs.reduce(
      (accumulator, entry) => {
        accumulator[entry.userId] = entry.blurb;
        return accumulator;
      },
      {} as Record<string, string>
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
</script>

<template>
  <Card class="p-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-lg font-semibold">Manager Archetypes</p>
        <p class="text-sm text-muted-foreground">
          Career profile plus optional AI-generated manager blurbs.
        </p>
      </div>
      <Button @click="getManagerArchetypes" :disabled="isLoading">
        {{
          isLoading
            ? "Generating..."
            : hasBlurbs
              ? "Regenerate blurbs"
              : "Generate blurbs"
        }}
      </Button>
    </div>
    <div class="grid gap-4 mt-4 sm:grid-cols-3">
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

        <p
          v-if="blurbsByUserId[archetype.userId]"
          class="mt-4 text-sm leading-relaxed text-muted-foreground"
        >
          {{ blurbsByUserId[archetype.userId] }}
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
          <div class="px-3 py-2 rounded-md bg-secondary sm:col-span-2">
            <p class="text-xs uppercase">Titles</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.titles }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
