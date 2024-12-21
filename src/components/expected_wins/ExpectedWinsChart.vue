<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
}>();

const seriesData = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((user: any) => {
    result.push({
      x: user.name ? user.name : "",
      y: user.wins,
      goals: [
        {
          name: "Expected",
          value: user.randomScheduleWins,
          strokeHeight: 5,
          strokeColor: "#a855f7",
        },
      ],
    });
  });
  return [{ name: "Actual Wins", data: result }];
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
    },
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
      y: {
        show: true,
        formatter: (x: number) => {
          if (Number.isInteger(x)) {
            return `${x}`;
          }
          return `${x.toFixed(2)}`;
        },
      },
      marker: {
        show: false,
      },
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
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  plotOptions: {
    bar: {
      columnWidth: "75%",
    },
  },
  colors: ["#22c55e"],
  dataLabels: {
    enabled: false,
  },
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    y: {
      show: true,
      formatter: (x: number) => {
        if (Number.isInteger(x)) {
          return `${x}`;
        }
        return `${x.toFixed(2)}`;
      },
    },
    marker: {
      show: false,
    },
  },
  xaxis: {
    labels: {
      formatter: function (str: string) {
        const n = 17;
        return str.length > n ? str.slice(0, n - 1) + "..." : str;
      },
    },
    title: {
      text: "League Manager",
      offsetY: -10,
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
      text: "Wins",
      offsetX: -10,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  legend: {
    show: true,
    showForSingleSeries: true,
    offsetX: 21,
    customLegendItems: ["Actual", "Expected"],
    markers: {
      fillColors: ["#22c55e", "#a855f7"],
    },
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
          Actual vs Expected Wins
        </h1>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
    <p
      class="text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-300"
      :class="props.tableData.length <= 12 ? 'mt-4' : 'mt-6'"
    >
      Expected number of wins is calculated by simulating 10000 randomized
      weekly matchups
    </p>
  </div>
</template>
