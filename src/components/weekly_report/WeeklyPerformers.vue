<script setup lang="ts">
import Card from "../ui/card/Card.vue";
import {
  getPlayerLabel,
  type PerformerEntry,
} from "./weeklyReportTransforms";

withDefaults(
  defineProps<{
    title: string;
    performers: PerformerEntry[];
    loading?: boolean;
    scoreClass?: string;
  }>(),
  {
    loading: false,
    scoreClass: "mt-3 font-semibold",
  }
);
</script>

<template>
  <div>
    <p class="my-1 text-xl font-bold">{{ title }}</p>
    <div v-if="!loading" class="flex flex-wrap">
      <Card
        v-for="performer in performers"
        :key="`${performer.user}-${performer.player.player_id}-${performer.points}`"
        class="px-4 py-3.5 my-2 mr-4 custom-player-card bg-secondary"
      >
        <div v-if="performer.player" class="flex justify-between">
          <div class="flex">
            <img
              v-if="performer.player.position !== 'DEF'"
              alt="Player image"
              class="w-14 sm:h-auto object-cover mr-2.5"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${performer.player.player_id}.jpg`"
            />
            <img
              v-else
              alt="Defense image"
              class="object-cover w-14 mr-2.5 sm:h-auto"
              :src="`https://sleepercdn.com/images/team_logos/nfl/${performer.player.player_id.toLowerCase()}.png`"
            />
            <div>
              <p class="font-semibold truncate w-36">
                {{ getPlayerLabel(performer.player) }}
              </p>
              <p class="truncate w-36 text-muted-foreground">
                {{ performer.user }}
              </p>
            </div>
          </div>
          <p :class="scoreClass">
            {{ performer.points }}
          </p>
        </div>
      </Card>
    </div>
    <Card v-else class="px-4 py-3.5 my-2 mr-4 h-20 custom-player-card" />
  </div>
</template>

<style scoped>
.custom-player-card {
  width: 291.5px;
  @media (width <= 640px) {
    min-width: 306px;
  }
}
</style>
