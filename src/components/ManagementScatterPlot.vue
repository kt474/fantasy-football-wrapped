<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../store/store";
const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();
const jitter = () => Math.random() * 0.02 - 0.01;
const recordVsPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (team.wins / (team.wins + team.losses) + jitter()).toFixed(2)
    );
    result.push([team.pointsFor, winPercentage]);
  });
  return result;
});
const recordVsPotentialPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (team.wins / (team.wins + team.losses) + jitter()).toFixed(2)
    );
    result.push([team.potentialPoints, winPercentage]);
  });
  return result;
});
const allRecordVsPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (
        team.winsAgainstAll / (team.winsAgainstAll + team.lossesAgainstAll) +
        jitter()
      ).toFixed(2)
    );
    result.push([team.pointsFor, winPercentage]);
  });
  return result;
});
const allRecordVsPotentialPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (
        team.winsAgainstAll / (team.winsAgainstAll + team.lossesAgainstAll) +
        jitter()
      ).toFixed(2)
    );
    result.push([team.potentialPoints, winPercentage]);
  });
  return result;
});
const medianRecordVsPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (
        team.winsWithMedian / (team.winsWithMedian + team.lossesWithMedian) +
        jitter()
      ).toFixed(2)
    );
    result.push([team.pointsFor, winPercentage]);
  });
  return result;
});
const medianRecordVsPotentialPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (
        team.winsWithMedian / (team.winsWithMedian + team.lossesWithMedian) +
        jitter()
      ).toFixed(2)
    );
    result.push([team.potentialPoints, winPercentage]);
  });
  return result;
});

const getUser = (index: number) => {
  return props.tableData[index];
};

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      type: "scatter",
      foreColor: store.darkMode ? "#ffffff" : "#111827",
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
        formatter: (x: number, y: any) => {
          const user = getUser(y.dataPointIndex);
          return `${user.name}: ${x}`;
        },
      },
    },
    markers: {
      size: 10,
      strokeWidth: 2,
      strokeColors: store.darkMode ? "#f3f4f6" : "#111827",
    },
  };
};
watch(
  () => store.darkMode,
  () => updateChartColor()
);
const chartOptions = ref({
  chart: {
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    type: "scatter",
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  colors: ["#fdba74", "#f97316", "#c2410c", "#86efac", "#22c55e", "#15803d"],
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    x: {
      formatter: (x: number, y: any) => {
        const user = getUser(y.dataPointIndex);
        return `${user.name}: ${x}`;
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  fill: {
    pattern: {
      style: "squares",
    },
  },
  markers: {
    size: 10,
    strokeWidth: 2,
    strokeColors: store.darkMode ? "#f3f4f6" : "#111827",
  },
  legend: {
    width: 700,
    horizontalAlign: "center",
    fontSize: "12px",
    fontFamily:
      "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
  },
  xaxis: {
    tickAmount: 6,
    title: {
      text: "Total Points",
      offsetY: 0,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    min: 0,
    max: 1,
    tickAmount: 4,
    title: {
      text: "Win Percentages",
      offsetX: -10,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
});
const series = computed(() => [
  {
    name: "Pts vs. Actual Win %",
    data: recordVsPoints.value,
  },
  {
    name: "Pts vs. Win % Against All",
    data: allRecordVsPoints.value,
  },
  {
    name: "Pts vs. Win % Median Record",
    data: medianRecordVsPoints.value,
  },
  {
    name: "Potential Pts vs. Actual Win %",
    data: recordVsPotentialPoints.value,
  },
  {
    name: "Potential Pts vs. Win % Against All",
    data: allRecordVsPotentialPoints.value,
  },
  {
    name: "Potential Pts vs. Win % Median Record",
    data: medianRecordVsPotentialPoints.value,
  },
]);
</script>
<template>
  <div
    class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6 min-w-80"
  >
    <div class="flex justify-between">
      <div>
        <h5
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
        >
          Points vs. Win Percentages
        </h5>
        <p class="text-base font-normal text-gray-500 dark:text-gray-400">
          Regular Season
        </p>
      </div>
    </div>
    <apexchart
      type="scatter"
      height="475"
      :options="chartOptions"
      :series="series"
    ></apexchart>
  </div>
</template>
<style>
.apexcharts-legend {
  margin: auto !important;
}
</style>
