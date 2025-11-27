<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
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

const userLabelList = computed(() =>
  props.tableData.map((user) => {
    const label = store.showUsernames ? user.username ?? "" : user.name ?? "";
    const n = 17;
    return label.length > n ? label.slice(0, n - 1) + "..." : label;
  })
);

const chartOptions = ref({});

const buildChartOptions = () => ({
  chart: {
    type: "bar",
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: false },
  },
  colors: ["#f97316", "#22c55e", "#0ea5e9"],
  tooltip: { theme: store.darkMode ? "dark" : "light" },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "60%",
    },
  },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ["transparent"] },
  xaxis: {
    categories: userLabelList.value,
    tickAmount: userLabelList.value.length - 1,
    hideOverlappingLabels: false,
    labels: {
      // label formatting already handled above
      formatter: (str: string) => str,
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
  fill: { opacity: 1 },
  legend: { offsetX: 20 },
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
  <div
    class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6 min-w-80"
  >
    <div class="flex justify-between">
      <div>
        <h1
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
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
