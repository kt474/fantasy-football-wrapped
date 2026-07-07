<script setup lang="ts">
import { computed } from "vue";
import type { TableDataType } from "@/types/types";
import Card from "../ui/card/Card.vue";
import Separator from "../ui/separator/Separator.vue";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import {
  getManagerName,
  getMatchupWinner,
  getRecordForWeek,
} from "./weeklyReportTransforms";

const props = defineProps<{
  sortedTableData: TableDataType[];
  matchupNumbers: (number | null)[];
  currentWeek: number;
  showUsernames: boolean;
  medianScoring: boolean;
}>();

const weekIndex = computed(() => props.currentWeek - 1);

const usersForMatchup = (matchupNumber: number | null) => {
  return props.sortedTableData.filter(
    (user) => user.matchups[weekIndex.value] === matchupNumber
  );
};

const isMatchupWinner = (
  user: TableDataType,
  matchupNumber: number | null
) => {
  return (
    user.points[weekIndex.value] ===
    getMatchupWinner(props.sortedTableData, matchupNumber, weekIndex.value)
  );
};
</script>

<template>
  <p class="text-xl font-bold">Matchups</p>
  <div class="flex flex-wrap w-full mb-2 overflow-x-hidden">
    <Card
      v-for="matchupNumber in matchupNumbers"
      :key="matchupNumber ?? 'unmatched'"
      class="block px-4 py-2.5 my-2 mr-4 w-80 custom-min-width"
    >
      <div
        v-for="(user, userIndex) in usersForMatchup(matchupNumber)"
        :key="user.rosterId"
      >
        <div class="flex justify-between my-2">
          <div class="flex">
            <img
              v-if="user.avatarImg"
              alt="User avatar"
              class="w-8 h-8 rounded-full"
              :src="user.avatarImg"
              @error="handleImageError"
            />
            <svg
              v-else
              class="w-8 h-8"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
              />
            </svg>
            <div>
              <p class="px-2 -mt-1 truncate max-w-28 xl:max-w-44">
                {{ getManagerName(user, showUsernames) }}
              </p>
              <p class="ml-2 text-xs text-muted-foreground">
                ({{
                  getRecordForWeek(
                    user.recordByWeek,
                    currentWeek,
                    medianScoring
                  )
                }})
              </p>
            </div>
          </div>
          <p
            class="mt-0.5"
            :class="{
              'text-primary font-semibold': isMatchupWinner(
                user,
                matchupNumber
              ),
            }"
          >
            {{ user.points[weekIndex] }}
          </p>
        </div>
        <Separator v-if="userIndex === 0" class="h-px my-2" />
      </div>
    </Card>
  </div>
</template>

<style scoped>
.custom-min-width {
  @media (width >= 390px) {
    min-width: 306px;
  }
}
</style>
