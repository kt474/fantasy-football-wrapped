<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
const props = defineProps<{
  tableData: TableDataType[];
}>();
const store = useStore();

const pointsArray = computed(() => {
  return props.tableData.map((team) => team.pointsFor);
});

const potentialPointsArray = computed(() => {
  return props.tableData.map((team) => team.potentialPoints);
});

const series = computed(() => {
  const result: any[] = [];
  const points = props.tableData.map((team) => team.pointsFor);
  points.sort((a, b) => b - a);
  const potentialPoints = props.tableData.map((team) => team.potentialPoints);
  potentialPoints.sort((a, b) => b - a);
  props.tableData.forEach((team) => {
    result.push({
      name: store.showUsernames ? team.username : team.name,
      data: [
        points.indexOf(team.pointsFor) + 1,
        potentialPoints.indexOf(team.potentialPoints) + 1,
      ],
    });
  });
  return result;
});
const chartTextColor = computed(() => {
  return store.darkMode ? "#ffffff" : "#111827";
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      id: "ranking-bump-chart",
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
    dataLabels: {
      formatter: (_: any, options: any) => {
        if (options.dataPointIndex === 0) {
          return pointsArray.value[options.seriesIndex];
        }
        return potentialPointsArray.value[options.seriesIndex];
      },
      enabled: true,
      background: {
        padding: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: store.darkMode ? "#e5e7eb" : "#111827",
      },
    },
  };
};

watch([() => store.darkMode, () => store.showUsernames], () =>
  updateChartColor()
);

const chartOptions = ref({
  chart: {
    foreColor: chartTextColor.value,
    id: "potential-points",
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
  xaxis: {
    // Hacky fix so the label isn't cut off
    categories: ["lllllllll   Actual Points", "Potential Points"],
    axisBorder: {
      show: false,
    },
    title: {
      text: "Points",
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
    reversed: true,
    labels: {
      show: false,
    },
  },
  tooltip: {
    enabled: false,
  },
  stroke: {
    curve: "smooth",
    width: 5,
  },
  dataLabels: {
    formatter: (_: any, options: any) => {
      if (options.dataPointIndex === 0) {
        return pointsArray.value[options.seriesIndex];
      }
      return potentialPointsArray.value[options.seriesIndex];
    },
    enabled: true,
    background: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: store.darkMode ? "#e5e7eb" : "#111827",
    },
  },
  legend: {
    offsetY: 8,
    offsetX: -40,
  },
  markers: {
    size: 0,
  },
});
</script>
<template>
  <card class="w-full p-4 md:p-6 min-w-80">
    <div class="flex justify-between">
      <div>
        <h1
          class="-mb-2 text-3xl font-bold leading-none "
        >
          Points vs Potential Points
        </h1>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      class="ml-6"
      :options="chartOptions"
      :series="series"
    ></apexchart>
    <p
      class="text-xs text-muted-foreground sm:-mb-4"
      :class="props.tableData.length <= 12 ? 'mt-8' : 'mt-16'"
    >
      Potential points are the maximum number of points a team could have scored
      if weekly lineups were optimized
    </p>
  </Card>
</template>
