<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
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
      animations: {
        enabled: false,
      },
    },
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
    },
    xaxis: {
      categories: props.tableData.map((user: any) =>
        user.name ? user.name : ""
      ),
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
      labels: {
        formatter: function (str: string) {
          const n = 17;
          return str.length > n ? str.slice(0, n - 1) + "..." : str;
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
    animations: {
      enabled: false,
    },
  },
  colors: ["#f97316", "#22c55e", "#0ea5e9"],
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
    categories: props.tableData.map((user: any) =>
      user.name ? user.name : ""
    ),
    labels: {
      formatter: function (str: string) {
        const n = 17;
        return str.length > n ? str.slice(0, n - 1) + "..." : str;
      },
    },
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
        <h1
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
        >
          Win Percentages
        </h1>
      </div>
    </div>
    <!-- chart overflows on safari sometimes  -->
    <apexchart
      type="bar"
      width="99.9%"
      height="475"
      :options="chartOptions"
      :series="seriesData"
      class="overflow-hidden"
    ></apexchart>
  </div>
</template>
