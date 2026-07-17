<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import { getChartTheme } from "@/lib/chartTheme";
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

interface RankingSeriesItem {
  name: string;
  data: number[];
}

interface ApexDataLabelContext {
  dataPointIndex: number;
  seriesIndex: number;
}

const series = computed(() => {
  const result: RankingSeriesItem[] = [];
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
const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      foreColor: getChartTheme().foreground,
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
      formatter: (_: unknown, options: ApexDataLabelContext) => {
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
        borderColor: "hsl(var(--border))",
      },
    },
  };
};

watch([() => store.darkMode, () => store.showUsernames], () =>
  updateChartColor()
);

const chartOptions = ref({
  chart: {
    foreColor: getChartTheme().foreground,
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
    "hsl(var(--chart-rank-1))",
    "hsl(var(--chart-rank-2))",
    "hsl(var(--chart-rank-3))",
    "hsl(var(--chart-rank-4))",
    "hsl(var(--chart-rank-5))",
    "hsl(var(--chart-rank-6))",
    "hsl(var(--chart-rank-7))",
    "hsl(var(--chart-rank-8))",
    "hsl(var(--chart-rank-9))",
    "hsl(var(--chart-rank-10))",
    "hsl(var(--chart-rank-11))",
    "hsl(var(--chart-rank-12))",
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
    formatter: (_: unknown, options: ApexDataLabelContext) => {
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
      borderColor: "hsl(var(--border))",
    },
  },
  legend: {
    offsetY: 5,
    offsetX: -25,
  },
  markers: {
    size: 0,
  },
});
</script>
<template>
  <Card class="w-full p-4 md:p-6">
    <div class="flex justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Points vs Potential Points
        </h1>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      class="sm:ml-6"
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
