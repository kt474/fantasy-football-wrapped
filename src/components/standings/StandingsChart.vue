<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import { Card } from "../ui/card";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
}>();

const winPct = (wins: number, losses: number): number => {
  const total = wins + losses;
  return total === 0 ? 0 : parseFloat((wins / total).toFixed(2));
};

const seriesData = computed(() => [
  {
    name: "Win Percentage",
    data: props.tableData.map((u) => winPct(u.wins, u.losses)),
  },
  {
    name: "Record vs. All Win Percentage",
    data: props.tableData.map((u) =>
      winPct(u.winsAgainstAll, u.lossesAgainstAll)
    ),
  },
  {
    name: "Median Record Win Percentage",
    data: props.tableData.map((u) =>
      winPct(u.winsWithMedian, u.lossesWithMedian)
    ),
  },
]);

const managerNames = computed(() =>
  props.tableData.map((user) => {
    return store.showUsernames ? (user.username ?? "") : (user.name ?? "");
  })
);

const axisLabelList = computed(() =>
  managerNames.value.map((name) => {
    const maxLength = 14;
    return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
  })
);

const shouldRotateAxisLabels = computed(
  () =>
    managerNames.value.length > 6 ||
    managerNames.value.some((name) => name.length > 12)
);

const chartOptions = ref({});

const buildChartOptions = () => ({
  chart: {
    type: "bar",
    foreColor: "hsl(var(--foreground))",
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: false },
  },
  colors: ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"],
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    x: {
      formatter: (
        _label: string,
        { dataPointIndex }: { dataPointIndex: number }
      ) => managerNames.value[dataPointIndex] ?? _label,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "60%",
    },
  },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ["transparent"] },
  xaxis: {
    categories: axisLabelList.value,
    tickAmount: axisLabelList.value.length - 1,
    hideOverlappingLabels: false,
    labels: {
      rotate: shouldRotateAxisLabels.value ? -45 : 0,
      rotateAlways: shouldRotateAxisLabels.value,
      minHeight: shouldRotateAxisLabels.value ? 88 : undefined,
      maxHeight: shouldRotateAxisLabels.value ? 88 : undefined,
      formatter: (str: string) => str,
    },
    title: {
      text: "League Manager",
      offsetY: shouldRotateAxisLabels.value ? 14 : -5,
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
  fill: { opacity: 1 },
  legend: {
    position: "bottom",
    offsetX: 20,
    offsetY: shouldRotateAxisLabels.value ? 22 : 0,
  },
});

watch(
  [
    () => store.darkMode,
    () => store.showUsernames,
    () => store.currentLeagueId,
    () => props.tableData,
  ],
  () => {
    chartOptions.value = buildChartOptions();
  },
  { immediate: true }
);
</script>
<template>
  <Card class="w-full min-w-0 p-4 md:p-6">
    <div class="flex justify-between">
      <div>
        <h1 class="pb-2 text-2xl font-semibold tracking-tight">
          Win Percentages
        </h1>
      </div>
    </div>
    <!-- chart overflows on safari sometimes  -->
    <apexchart
      type="bar"
      width="99.9%"
      :height="shouldRotateAxisLabels ? 540 : 475"
      :options="chartOptions"
      :series="seriesData"
      class="overflow-hidden"
    ></apexchart>
  </Card>
</template>
