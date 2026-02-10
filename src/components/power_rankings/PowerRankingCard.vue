<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store";
import { PowerRankingEntry } from "../../types/types";
import Card from "../ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";

const store = useStore();

const props = defineProps<{
  powerRankings: PowerRankingEntry[];
  regularSeasonLength: number;
}>();

const rankingValues = computed(() => {
  return [...props.powerRankings].sort((a, b) => {
    return b.ratings[currentWeek.value - 1] - a.ratings[currentWeek.value - 1];
  });
});

const weeks = computed(() => {
  if (props.powerRankings.length > 0) {
    const recordLength = props.powerRankings[0].data
      ? props.powerRankings[0].data.length + 1
      : 0;
    const weeksList = [...Array(props.regularSeasonLength + 1).keys()]
      .slice(1)
      .reverse();
    return recordLength < weeksList.length
      ? [...Array(recordLength).keys()].slice(1).reverse()
      : weeksList;
  }
  return [];
});
const currentWeek = ref(weeks.value[0]);

watch(
  () => [props.regularSeasonLength, props.powerRankings],
  () => (currentWeek.value = weeks.value[0])
);

watch(
  () => store.currentLeagueId,
  () => (currentWeek.value = weeks.value[0])
);

const listPadding = computed(() => {
  if (props.powerRankings.length <= 10) {
    return "py-3";
  } else if (props.powerRankings.length <= 12) {
    return "py-2";
  }
  return "py-1";
});
</script>
<template>
  <Card class="px-6 pt-4 min-h-96 custom-width">
    <div class="flex items-center justify-between sm:mt-1.5 mb-1.5">
      <h5 class="w-20 text-xl font-bold leading-none text-pretty">
        Ranking score
      </h5>
      <Select v-model="currentWeek">
        <SelectTrigger class="w-28">
          <SelectValue placeholder="Select Week" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="week in weeks" :key="week" :value="week">
            {{ week === 1 ? "Preseason" : `Week ${week - 1}` }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div v-if="powerRankings.length > 0" class="flow-root">
      <ul role="list" class="divide-y">
        <li v-for="(user, index) in rankingValues" :class="listPadding">
          <div class="flex items-center">
            <div class="flex-1 min-w-0 list-padding ms-1">
              <p class="w-48 text-sm font-medium truncate">
                {{ index + 1 }}.&nbsp;
                {{ user.name ? user.name : "Ghost Roster" }}
              </p>
            </div>
            <div class="inline-flex items-center text-sm font-normal">
              {{ user.ratings[currentWeek - 1] }}
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else>
      <p class="mt-2 mb-2 text-gray-600 dark:text-gray-200">Loading...</p>
    </div>
  </Card>
</template>
<style scoped>
.custom-width {
  min-width: 100%;
  @media (min-width: 768px) {
    min-width: 19rem;
  }
}
.custom-padding {
  padding-right: 2rem !important;
}
.list-padding {
  padding: 0.2rem 0 0.2rem 0;
}
</style>
