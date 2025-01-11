<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";
const props = defineProps<{
  tableData: TableDataType[];
  finalPlacements: [];
}>();
const store = useStore();

const chartTextColor = computed(() => {
  return store.darkMode ? "#ffffff" : "#111827";
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      type: "line",
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
  };
};

const seriesData = computed(() => {
  let result: any[] = [];
  props.tableData.forEach((user) => {
    result.push({
      name: user.name,
      data: [
        {
          x: "Reg. Season",
          y: user.regularSeasonRank,
        },
      ],
    });
  });
  props.finalPlacements.forEach((user: any) => {
    result.forEach((res) => {
      if (user) {
        if (res.name === user.name) {
          res.data.push({
            x: "Final Pos.",
            y: user.placement,
          });
        }
      }
    });
  });
  return result;
});

const chartOptions = ref({
  chart: {
    type: "line",
    foreColor: chartTextColor.value,
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
  grid: {
    show: false,
  },
  plotOptions: {
    line: {
      isSlopeChart: true,
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
  tooltip: {
    enabled: false,
  },
  dataLabels: {
    enabled: true,
    formatter(val: any) {
      return `${val}`;
    },
  },
  yaxis: {
    reversed: true,
    labels: {
      show: false,
    },
    min: 1,
  },
  xaxis: {
    axisBorder: {
      show: false,
    },
    labels: {
      offsetX: 3.8,
    },
  },
  stroke: {
    width: 5,
    curve: "smooth",
  },
  legend: {
    offsetY: 8,
    offsetX: -30,
  },
});

watch(
  () => store.darkMode,
  () => updateChartColor()
);
</script>
<template>
  <div
    class="block w-full p-4 mt-4 text-black bg-white border border-gray-200 rounded-lg shadow lg:mt-0 lg:w-1/4 min-w-60 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
  >
    <h5
      class="text-2xl font-bold leading-none text-gray-900 dark:text-white text-pretty"
    >
      Regular Season vs Final Placement
    </h5>
    <apexchart
      v-if="props.finalPlacements.length > 0"
      type="line"
      height="575"
      width="100%"
      :options="chartOptions"
      :series="seriesData"
      class="flex justify-center ml-3 xl:ml-4"
    ></apexchart>
    <div v-else class="text-gray-900 dark:text-white">
      <p class="pt-1 mt-2 border-t dark:bg-gray-800 dark:border-gray-700">
        Season in progress
      </p>
    </div>
  </div>
</template>
