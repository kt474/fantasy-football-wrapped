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
  hasPreseasonRankings: boolean;
}>();

const currentRatingIndex = ref("0");

const rankingValues = computed(() => {
  const ratingIndex = Number(currentRatingIndex.value);
  return [...props.powerRankings].sort((a, b) => {
    return b.ratings[ratingIndex] - a.ratings[ratingIndex];
  });
});

const weekOptions = computed(() => {
  if (!props.powerRankings.length) {
    return [];
  }

  const ratingCount =
    props.powerRankings[0].data?.length ?? props.powerRankings[0].ratings.length;
  const regularSeasonWeekCount = props.hasPreseasonRankings
    ? ratingCount - 1
    : ratingCount;
  const weekCount = Math.min(regularSeasonWeekCount, props.regularSeasonLength);
  const options = Array.from({ length: weekCount }, (_, index) => {
    const week = index + 1;
    return {
      value: String(props.hasPreseasonRankings ? index + 1 : index),
      label: `Week ${week}`,
    };
  }).reverse();

  if (props.hasPreseasonRankings) {
    options.push({ value: "0", label: "Preseason" });
  }

  return options;
});

const selectedRating = computed(() => Number(currentRatingIndex.value));

const syncSelectedWeek = () => {
  if (!weekOptions.value.length) {
    currentRatingIndex.value = "0";
    return;
  }

  const currentOption = weekOptions.value.find(
    (option) => option.value === currentRatingIndex.value
  );
  if (!currentOption) {
    currentRatingIndex.value = weekOptions.value[0].value;
  }
};

watch(
  weekOptions,
  () => {
    syncSelectedWeek();
  },
  { immediate: true }
);

watch(
  () => [props.regularSeasonLength, props.powerRankings],
  () => {
    currentRatingIndex.value = weekOptions.value[0]?.value ?? "0";
  }
);

watch(
  () => store.currentLeagueId,
  () => {
    currentRatingIndex.value = weekOptions.value[0]?.value ?? "0";
  }
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
      <h5 class="w-20 text-xl font-bold text-pretty">
        Ranking score
      </h5>
      <Select v-model="currentRatingIndex">
        <SelectTrigger class="w-28">
          <SelectValue placeholder="Select Week" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in weekOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
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
              {{ user.ratings[selectedRating] }}
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else>
      <p class="mt-2 mb-2">Loading...</p>
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
