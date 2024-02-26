<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../store/store";
const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      type: "bar",
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
    xaxis: {
      categories: props.tableData.map((user: any) => user.name),
      title: {
        text: "League Manager",
        offsetY: -5,
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
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    type: "bar",
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  colors: ["#fb923c", "#4ade80"],
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "60%",
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    show: true,
    width: 2,
    colors: ["transparent"],
  },
  xaxis: {
    categories: props.tableData.map((user: any) => user.name),
    title: {
      text: "League Manager",
      offsetY: -5,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    title: {
      text: "Total Points",
      offsetX: -10,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  fill: {
    opacity: 1,
  },
  legend: {
    offsetX: 20,
  },
});

const seriesData = computed(() => {
  return [
    {
      name: "Points",
      data: props.tableData.map((row) => row.pointsFor),
    },
    {
      name: "Potential Points",
      data: props.tableData.map((row) => row.potentialPoints),
    },
  ];
});
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
          Regular Season Points
        </h5>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
    <p
      class="mt-2 text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-400"
    >
      Potential points are calculated by taking the highest scoring possible
      lineup for each week, including bench players.
    </p>
  </div>
</template>
