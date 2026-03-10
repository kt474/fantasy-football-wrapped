<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store.ts";
import LeagueDNACard from "./LeagueDNACard.vue";
import ManagerArchetypesCard from "./ManagerArchetypesCard.vue";
import GreatestRivalriesCard from "./GreatestRivalriesCard.vue";
import {
  buildNarrativeBundle,
  normalizeHistoricalSeasons,
} from "@/lib/narratives";

const store = useStore();

const seasons = computed(() =>
  normalizeHistoricalSeasons(store.leagueInfo[store.currentLeagueIndex])
);

const narratives = computed(() => buildNarrativeBundle(seasons.value));
</script>
<template>
  <div class="space-y-4">
    <LeagueDNACard :league-d-n-a="narratives.leagueDNA" />
    <div class="grid gap-4 xl:grid-cols-2">
      <ManagerArchetypesCard :archetypes="narratives.managerArchetypes" />
      <GreatestRivalriesCard :rivalries="narratives.rivalries" />
    </div>
  </div>
</template>
