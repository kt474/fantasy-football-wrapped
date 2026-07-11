<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType, UserType } from "../../types/types";
import Card from "../ui/card/Card.vue";
const props = defineProps<{
  tableData: TableDataType[];
  finalPlacements: UserType[];
}>();
const store = useStore();

const chartTextColor = computed(() => {
  return "hsl(var(--foreground))";
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      foreColor: "hsl(var(--foreground))",
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
  let result: Array<{ name: string; data: Array<{ x: string; y: number }> }> = [];
  props.tableData.forEach((user) => {
    result.push({
      name: store.showUsernames ? user.username : user.name,
      data: [
        {
          x: "Reg. Season",
          y: user.regularSeasonRank,
        },
      ],
    });
  });
  props.finalPlacements.forEach((user) => {
    result.forEach((res) => {
      if (user) {
        if (store.showUsernames) {
          if (res.name === user.username) {
            res.data.push({
              x: "Final Pos.",
              y: user.placement ?? 0,
            });
          }
        } else {
          if (res.name === user.name) {
            res.data.push({
              x: "Final Pos.",
              y: user.placement ?? 0,
            });
          }
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
  tooltip: {
    enabled: false,
  },
  dataLabels: {
    enabled: true,
    formatter(val: number | string) {
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
  <Card class="block w-full p-4 mt-4 lg:mt-0 lg:w-1/4 min-w-60 md:p-6">
    <h5 class="mb-4 text-2xl font-semibold tracking-tight text-pretty">
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
    <div v-else>
      <p class="pt-1 mt-2 border-t">Season in progress</p>
    </div>
  </Card>
</template>
