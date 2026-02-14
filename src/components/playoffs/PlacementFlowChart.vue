<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
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
      name: store.showUsernames ? user.username : user.name,
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
        if (store.showUsernames) {
          if (res.name === user.username) {
            res.data.push({
              x: "Final Pos.",
              y: user.placement,
            });
          }
        } else {
          if (res.name === user.name) {
            res.data.push({
              x: "Final Pos.",
              y: user.placement,
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
  <Card class="block w-full p-4 mt-4 lg:mt-0 lg:w-1/4 min-w-60">
    <h5 class="ml-0.5 text-2xl font-bold leading-none text-pretty">
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
    <div v-else class="text-muted-foreground">
      <p class="pt-1 mt-2 border-t">Season in progress</p>
    </div>
  </Card>
</template>
