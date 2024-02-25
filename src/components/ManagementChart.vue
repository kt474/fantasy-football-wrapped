<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../store/store";
const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const jitter = () => Math.random() * 0.02 - 0.01;

const recordVsEfficiency = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (team.wins / (team.wins + team.losses) + jitter()).toFixed(2)
    );
    console.log(team.managerEfficiency);
    result.push([team.managerEfficiency, winPercentage]);
  });
  return result;
});

const allRecordVsEfficiency = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (
        team.winsAgainstAll / (team.winsAgainstAll + team.lossesAgainstAll) +
        jitter()
      ).toFixed(2)
    );
    result.push([team.managerEfficiency, winPercentage]);
  });
  return result;
});

const medianRecordVsEfficiency = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = parseFloat(
      (
        team.winsWithMedian / (team.winsWithMedian + team.lossesWithMedian) +
        jitter()
      ).toFixed(2)
    );
    result.push([team.managerEfficiency, winPercentage]);
  });
  return result;
});

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
  colors: ["#fb923c", "#4ade80", "#60a5fa"],
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 8,
  },
  legend: {},
  xaxis: {
    type: "numeric",
    decimalsInFloat: 2,
    title: {
      text: "Manager Efficiency",
      offsetY: 5,
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

const series = ref([
  {
    name: "Record",
    data: recordVsEfficiency.value,
  },
  {
    name: "Record vs. All",
    data: allRecordVsEfficiency.value,
  },
  {
    name: "Median Record",
    data: medianRecordVsEfficiency.value,
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
          Roster Efficiency vs. Win Percentages
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
