<script setup lang="ts">
import { ref, computed } from "vue";
import { mean, max, min } from "lodash";
import { useStore } from "../store/store";
import { getPowerRanking, winsOnWeek } from "../api/helper";
const store = useStore();

const powerRanking = computed(() => {
  const result: any = [];
  store.tableData.forEach((value: any) => {
    const ratingArr: number[] = [];
    value.points.forEach((_: number, week: number) => {
      const currentWins = winsOnWeek(value.recordByWeek, week);
      const currentLosess = week + 1 - currentWins;
      ratingArr.push(
        getPowerRanking(
          mean(value.points.slice(0, week + 1)),
          Number(max(value.points.slice(0, week + 1))),
          Number(min(value.points.slice(0, week + 1))),
          currentWins / (currentWins + currentLosess)
        )
      );
    });
    result.push({
      name: value.name,
      type: "line",
      data: ratingArr,
    });
  });
  return result;
});

const xAxis = computed(() => {
  return [
    ...Array(
      store.leagueInfo[store.currentLeagueIndex].regularSeasonLength + 1
    ).keys(),
  ].slice(1);
});
const chartOptions = ref({
  chart: {
    id: "power-ranking",
    toolbar: {
      show: false,
    },
  },
  xaxis: {
    categories: xAxis,
  },
  stroke: {
    curve: "straight",
  },
});
</script>
<template>
  <div class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6">
    <div class="flex justify-between">
      <div>
        <h5
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
        >
          Power Rankings
        </h5>
        <p class="text-base font-normal text-gray-500 dark:text-gray-400">
          Regular Season
        </p>
      </div>
    </div>
    <apexchart
      width="100%"
      type="line"
      :options="chartOptions"
      :series="powerRanking"
    ></apexchart>
  </div>
</template>
