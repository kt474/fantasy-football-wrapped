<script setup lang="ts">
import { computed } from "vue";
import type { TableDataType } from "@/types/types";
import { getSeriesData } from "./weeklyReportTransforms";

const props = defineProps<{
  sortedTableData: TableDataType[];
  currentWeek: number;
  darkMode: boolean;
  showUsernames: boolean;
}>();

const weekIndex = computed(() => props.currentWeek - 1);

const seriesData = computed(() => {
  return getSeriesData(props.sortedTableData, weekIndex.value);
});

const managerNames = computed(() => {
  return props.sortedTableData.map((user) =>
    props.showUsernames
      ? user.username
        ? user.username
        : ""
      : user.name
        ? user.name
        : ""
  );
});

const chartOptions = computed(() => ({
  chart: {
    foreColor: "hsl(var(--foreground))",
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
  plotOptions: {
    bar: {
      columnWidth: "75%",
    },
  },
  colors: ["hsl(var(--chart-2))"],
  dataLabels: {
    enabled: false,
  },
  tooltip: {
    theme: props.darkMode ? "dark" : "light",
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
    categories: managerNames.value,
    tickAmount: props.sortedTableData.length - 1,
    hideOverlappingLabels: false,
    labels: {
      formatter: function (str: string) {
        const n = 17;
        return str.length > n ? str.slice(0, n - 1) + "..." : str;
      },
    },
    title: {
      text: "League Manager",
      offsetY: 3,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    labels: {
      formatter: function (x: number) {
        return x;
      },
    },
    title: {
      text: "Points Scored",
      offsetX: -10,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
}));
</script>

<template>
  <p class="text-xl font-semibold tracking-tight">Points</p>
  <apexchart
    width="100%"
    height="475"
    type="bar"
    :options="chartOptions"
    :series="seriesData"
  ></apexchart>
</template>
