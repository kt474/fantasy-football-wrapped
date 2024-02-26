<script setup lang="ts">
import { mean } from "lodash";
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
    const winPercentage = team.wins / (team.wins + team.losses);
    result.push([team.pointsFor, winPercentage]);
  });
  return result;
});
const recordVsPotentialPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage = team.wins / (team.wins + team.losses);
    result.push([team.potentialPoints, winPercentage]);
  });
  return result;
});
const allRecordVsPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage =
      team.winsAgainstAll / (team.winsAgainstAll + team.lossesAgainstAll);
    result.push([team.pointsFor, winPercentage]);
  });
  return result;
});
const allRecordVsPotentialPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage =
      team.winsAgainstAll / (team.winsAgainstAll + team.lossesAgainstAll);
    result.push([team.potentialPoints, winPercentage]);
  });
  return result;
});
const medianRecordVsPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage =
      team.winsWithMedian / (team.winsWithMedian + team.lossesWithMedian);
    result.push([team.pointsFor, winPercentage]);
  });
  return result;
});
const medianRecordVsPotentialPoints = computed(() => {
  const result: any[] = [];
  props.tableData.forEach((team) => {
    const winPercentage =
      team.winsWithMedian / (team.winsWithMedian + team.lossesWithMedian);
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

const getRValue = (pointsArray: any[]) => {
  const xValues = pointsArray.map((point) => point[0]);
  const xValuesMean = mean(xValues);
  const yValues = pointsArray.map((point) => point[1]);
  const yValuesMean = mean(yValues);
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;
  pointsArray.forEach((point) => {
    const xDiff = point[0] - xValuesMean;
    const yDiff = point[1] - yValuesMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff ** 2;
    yDenominator += yDiff ** 2;
  });
  return (numerator / Math.sqrt(xDenominator * yDenominator)).toFixed(2);
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
    data: recordVsPoints.value.map((point) => {
      return [point[0], (point[1] + jitter()).toFixed(2)];
    }),
  },
  {
    name: "Pts vs. Win % Against All",
    data: allRecordVsPoints.value.map((point) => {
      return [point[0], (point[1] + jitter()).toFixed(2)];
    }),
  },
  {
    name: "Pts vs. Win % Median Record",
    data: medianRecordVsPoints.value.map((point) => {
      return [point[0], (point[1] + jitter()).toFixed(2)];
    }),
  },
  {
    name: "Potential Pts vs. Actual Win %",
    data: recordVsPotentialPoints.value.map((point) => {
      return [point[0], (point[1] + jitter()).toFixed(2)];
    }),
  },
  {
    name: "Potential Pts vs. Win % Against All",
    data: allRecordVsPotentialPoints.value.map((point) => {
      return [point[0], (point[1] + jitter()).toFixed(2)];
    }),
  },
  {
    name: "Potential Pts vs. Win % Median Record",
    data: medianRecordVsPotentialPoints.value.map((point) => {
      return [point[0], (point[1] + jitter()).toFixed(2)];
    }),
  },
]);
</script>
<template>
  <div class="flex flex-wrap md:flex-nowrap">
    <div
      class="max-w-md px-6 pt-4 bg-white border border-gray-200 rounded-lg shadow min-w-80 dark:bg-gray-800 dark:border-gray-700"
    >
      <h5
        class="w-56 mb-2 text-xl font-bold leading-none text-gray-900 dark:text-white"
      >
        Correlation Coefficients (r value)
      </h5>
      <ul class="divide-y divide-gray-200 dark:divide-gray-700">
        <li class="flex justify-between py-2">
          <p class="font-semibold dark:text-white">Pts vs. Win %</p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getRValue(recordVsPoints) }}
          </p>
        </li>
        <li class="flex justify-between py-2">
          <p class="font-semibold dark:text-white">Pts vs. All Win %</p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getRValue(allRecordVsPoints) }}
          </p>
        </li>
        <li class="flex justify-between py-2">
          <p class="font-semibold dark:text-white">Pts vs. Median Win %</p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getRValue(medianRecordVsPoints) }}
          </p>
        </li>
        <li class="flex justify-between py-2">
          <p class="font-semibold dark:text-white">PPts vs. Win %</p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getRValue(recordVsPotentialPoints) }}
          </p>
        </li>
        <li class="flex justify-between py-2">
          <p class="font-semibold dark:text-white">PPts vs. All Win %</p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getRValue(allRecordVsPotentialPoints) }}
          </p>
        </li>
        <li class="flex justify-between py-2">
          <p class="font-semibold dark:text-white">PPts vs. Median Win %</p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ getRValue(medianRecordVsPotentialPoints) }}
          </p>
        </li>
      </ul>
    </div>
    <div
      class="w-full p-4 mt-4 bg-white rounded-lg shadow md:ml-4 dark:bg-gray-800 md:p-6 min-w-80 md:mt-0"
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
  </div>
</template>
<style>
.apexcharts-legend {
  margin: auto !important;
}
</style>
