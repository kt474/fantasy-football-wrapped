<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../store/store";
const store = useStore();

const props = defineProps<{
  tableData: Array<object>;
}>();

const seriesData = computed(() => {
  const winPercentage: number[] = [];
  const winPercentageAll: number[] = [];
  const winPercentageMedian: number[] = [];
  props.tableData.forEach((user: any) => {
    winPercentage.push(
      parseFloat((user.wins / (user.losses + user.wins)).toFixed(2))
    );
    winPercentageAll.push(
      parseFloat(
        (
          user.winsAgainstAll /
          (user.lossesAgainstAll + user.winsAgainstAll)
        ).toFixed(2)
      )
    );
    winPercentageMedian.push(
      parseFloat(
        (
          user.winsWithMedian /
          (user.lossesWithMedian + user.winsWithMedian)
        ).toFixed(2)
      )
    );
  });
  return [
    {
      name: "Win Percentage",
      data: winPercentage,
    },
    {
      name: "Record vs. All Win Percentage",
      data: winPercentageAll,
    },
    {
      name: "Median Record Win Percentage",
      data: winPercentageMedian,
    },
  ];
});

const xAxis = computed(() => {
  return props.tableData.map((user: any) => user.name);
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      type: "bar",
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      animations: {
        enabled: false,
      },
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
    type: "bar",
    animations: {
      enabled: false,
    },
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
    categories: xAxis.value,
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
    min: 0,
    max: 1,
    tickAmount: 4,
    title: {
      text: "Win Percentage",
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
          Win Percentages
        </h5>
        <p class="text-base font-normal text-gray-500 dark:text-gray-400">
          Regular Season
        </p>
      </div>
    </div>
    <apexchart
      type="bar"
      width="100%"
      height="475"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
  </div>
</template>
