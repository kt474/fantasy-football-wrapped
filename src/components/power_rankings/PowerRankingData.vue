<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { mean, max, min, zip } from "lodash";
import { useStore } from "../../store/store";
import { getPowerRanking, winsOnWeek } from "../../api/helper";
import {
  RosterType,
  TableDataType,
  PowerRankingEntry,
} from "../../types/types";
import PowerRankingCard from "./PowerRankingCard.vue";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
  totalRosters: number;
}>();

const preseasonRank = computed(() => {
  type Position = "QB" | "WR" | "TE" | "RB";
  const positions: Position[] = ["QB", "WR", "TE", "RB"];
  type Top2Sums = Record<Position, number>;

  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague?.rosters) {
    const results = currentLeague.rosters.map((roster: RosterType) => {
      const projections = roster.projections ?? [];
      // const hasAllPositions = ["QB", "WR", "TE", "RB"].every((pos) =>
      //   projections.some((p) => p.position === pos && p.projection > 0)
      // );

      // if (!hasAllPositions) {
      //   return null; // Not ready yet
      // }
      const sumTop2: Top2Sums = positions.reduce<Top2Sums>(
        (acc, pos) => {
          const filtered = projections.filter((item) => item.position === pos);
          const sorted = filtered.sort((a, b) => b.projection - a.projection);
          // For QB/TE, take only the top 1; for RB/WR, take top 3
          const count = pos === "QB" || pos === "TE" ? 1 : 3;
          const sum = sorted
            .slice(0, count)
            .reduce((s, item) => s + item.projection, 0);
          acc[pos] = sum;
          return acc;
        },
        { QB: 0, WR: 0, TE: 0, RB: 0 }
      );
      // Sum all positions for this roster
      const totalSum = Object.values(sumTop2).reduce((a, b) => a + b, 0);
      return {
        rosterId: roster.rosterId,
        preseasonScore: totalSum / 10,
      };
    });
    if (results.every((r) => r !== null)) {
      return results;
    }
  } else if (store.leagueInfo.length === 0) {
    // Fake data for homepage
    return [
      { rosterId: 1, preseasonScore: 100 },
      { rosterId: 2, preseasonScore: 114 },
      { rosterId: 3, preseasonScore: 126.3 },
      { rosterId: 4, preseasonScore: 118.9 },
      { rosterId: 5, preseasonScore: 154 },
      { rosterId: 6, preseasonScore: 133 },
      { rosterId: 7, preseasonScore: 127.8 },
      { rosterId: 8, preseasonScore: 141.6 },
      { rosterId: 9, preseasonScore: 129.1 },
      { rosterId: 10, preseasonScore: 137 },
    ];
  }
  return [];
});

const powerRankings = computed(() => {
  if (
    !preseasonRank.value.length ||
    preseasonRank.value.length !== props.totalRosters
  ) {
    return [];
  }
  const result: PowerRankingEntry[] = [];
  const ratingsContainer: number[][] = [];
  props.tableData.forEach((value: TableDataType) => {
    const ratingArr: number[] = [];
    if (value.recordByWeek && value.points) {
      value.points.forEach((_: number, week: number) => {
        const weekLength =
          store.leagueInfo[store.currentLeagueIndex]?.medianScoring === 1
            ? value.recordByWeek.length / 2
            : value.recordByWeek.length;
        if (week < weekLength) {
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
    // preseason rank
    const preseasonScore = preseasonRank.value.find(
      (user) => user.rosterId === value.rosterId
    )?.preseasonScore;
    ratingArr.unshift(preseasonScore || 0);
    ratingsContainer.push(ratingArr);
    result.push({
      name: store.showUsernames ? value.username : value.name,
      type: "line",
      ratings: ratingArr,
    });
  });
  const orderedArrs = zip(...ratingsContainer) as number[][];
  orderedArrs.forEach((arr) => {
    arr.sort((a, b) => b - a);
  });
  result.forEach((user) => {
    const data: number[] = [];
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
      width: "98%",
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
  [
    () => store.darkMode,
    () => store.showUsernames,
    () => store.currentLeagueId,
  ],
  () => {
    updateChartColor();
  }
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
    categories: [
      "Preseason",
      ...Array(props.regularSeasonLength)
        .fill(0)
        .map((_, i) => i + 1),
    ],
    labels: {
      hideOverlappingLabels: false,
    },
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
            class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
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
