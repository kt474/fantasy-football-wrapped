<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { mean, max, min, zip } from "lodash";
import { useStore } from "../../store/store";
import { getPowerRanking, winsOnWeek } from "../../api/helper";
import { TableDataType } from "../../api/types";
import PowerRankingCard from "./PowerRankingCard.vue";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
  totalRosters: number;
}>();

const powerRankings = computed(() => {
  const result: any = [];
  const ratingsContainer: any = [];
  props.tableData.forEach((value: any) => {
    const ratingArr: number[] = [];
    if (value.recordByWeek && value.points) {
      value.points.forEach((_: number, week: number) => {
        if (week < value.recordByWeek.length) {
          const currentWins = winsOnWeek(value.recordByWeek, week);
          const currentLosses = week + 1 - currentWins;
          ratingArr.push(
            getPowerRanking(
              mean(value.points.slice(0, week + 1)),
              Number(max(value.points.slice(0, week + 1))),
              Number(min(value.points.slice(0, week + 1))),
              currentWins / (currentWins + currentLosses)
            )
          );
        }
      });
    }
    ratingsContainer.push(ratingArr);
    result.push({
      name: value.name,
      type: "line",
      ratings: ratingArr,
    });
  });
  const orderedArrs = zip(...ratingsContainer);
  orderedArrs.forEach((arr: any[]) => {
    arr.sort((a: number, b: number) => b - a);
  });
  result.forEach((user: any) => {
    const data: any[] = [];
    user.ratings.forEach((value: number, index: number) => {
      data.push(orderedArrs[index].indexOf(value) + 1);
    });
    user["data"] = data;
  });
  return result;
});

const chartTextColor = computed(() => {
  return store.darkMode ? "#ffffff" : "#111827";
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      width: "97%",
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      id: "power-ranking",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
      x: {
        show: true,
        formatter: (x: number) => `Week ${x}`,
      },
    },
    markers: {
      size: 6,
      strokeWidth: 2,
      strokeColors: store.darkMode ? "#e5e7eb" : "#374151",
      hover: {
        size: 7,
      },
    },
    yaxis: {
      reversed: true,
      min: 1,
      stepSize: 1,
      tickAmount: props.totalRosters - 1,
      title: {
        text: "Ranking",
        offsetX: -10,
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
  };
};

watch(
  () => store.darkMode,
  () => updateChartColor()
);

watch(
  () => store.currentLeagueId,
  () => updateChartColor()
);

const chartOptions = ref({
  chart: {
    width: "97%",
    foreColor: chartTextColor.value,
    id: "power-ranking",
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  colors: [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#14b8a6",
    "#22c55e",
    "#0ea5e9",
    "#6366f1",
    "#a855f7",
    "#ec4899",
    "#f43f5e",
  ],
  xaxis: {
    categories: [...Array(props.regularSeasonLength + 1).keys()].slice(1),
    title: {
      text: "Week",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    reversed: true,
    min: 1,
    stepSize: 1,
    tickAmount: props.totalRosters - 1,
    title: {
      text: "Ranking",
      offsetX: -10,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    x: {
      show: true,
      formatter: (x: number) => `Week ${x}`,
    },
  },
  stroke: {
    curve: "straight",
    width: 5,
  },
  markers: {
    size: 6,
    strokeWidth: 2,
    strokeColors: store.darkMode ? "#e5e7eb" : "#374151",
    hover: {
      size: 7,
    },
  },
  legend: {
    offsetX: 20,
  },
});
</script>
<template>
  <div class="flex flex-wrap md:flex-nowrap">
    <PowerRankingCard
      :power-rankings="powerRankings"
      :regular-season-length="props.regularSeasonLength"
      class="w-full mb-4 md:w-1/3 md:mr-4 md:mb-0"
    />
    <div
      class="w-full p-4 bg-white rounded-lg shadow md:w-2/3 dark:bg-gray-800 md:p-6 min-w-80"
    >
      <div class="flex justify-between">
        <div>
          <h1
            class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
          >
            Power Rankings
          </h1>
        </div>
      </div>
      <apexchart
        width="98%"
        height="475"
        type="line"
        :options="chartOptions"
        :series="powerRankings"
      ></apexchart>
      <p
        class="mt-4 text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-300"
      >
        Ranking formula:
        <span class="italic"
          >((average weekly score * 6) + ((highest score + lowest score) * 2) +
          (win percentage * 400)) / 10</span
        >
      </p>
    </div>
  </div>
</template>
