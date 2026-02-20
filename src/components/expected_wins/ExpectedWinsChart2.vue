<script setup lang="ts">
import { max, min, cloneDeep } from "lodash";
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
}>();

const tableDataCopy = computed(() => {
  const result = cloneDeep(props.tableData);
  return result.sort(
    (a, b) => b.wins - b.randomScheduleWins - (a.wins - a.randomScheduleWins)
  );
});

const seriesData = computed(() => {
  const result = tableDataCopy.value.map((user) => {
    return parseFloat((user.wins - user.randomScheduleWins).toFixed(2));
  });
  return [{ name: "Win Difference", data: result }];
});

const categories = computed(() => {
  return tableDataCopy.value.map((user) =>
    store.showUsernames
      ? user.username
        ? user.username
        : ""
      : user.name
        ? user.name
        : ""
  );
});

const maxWinDifference = computed(() => {
  const winDifference = props.tableData.map((user) => {
    return Math.ceil(user.wins - user.randomScheduleWins);
  });
  return max(winDifference);
});

const minWinDifference = computed(() => {
  const winDifference = props.tableData.map((user) => {
    return Math.floor(user.wins - user.randomScheduleWins);
  });
  return min(winDifference);
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
      animations: {
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
    xaxis: {
      categories: categories.value,
      tickAmount: categories.value.length - 1,
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
        offsetX: -20,
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      min: minWinDifference.value,
      max: maxWinDifference.value,
      tickAmount: 4,
      title: {
        text: "Win Difference",
        offsetX: -10,
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
  };
};

watch(
  [
    () => store.darkMode,
    () => store.showUsernames,
    () => store.currentLeagueId,
  ],
  () => {
    updateChartColor();
  }
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
    animations: {
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
    categories: categories.value,
    tickAmount: categories.value.length - 1,
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
      offsetX: -20,
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    min: minWinDifference.value,
    max: maxWinDifference.value,
    tickAmount: 4,
    title: {
      text: "Win Difference",
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
</script>
<template>
  <Card class="w-full p-4 md:p-6 min-w-80">
    <div class="flex justify-between">
      <div>
        <h1 class="pb-2 text-3xl font-bold leading-none">
          Expected Win Difference
        </h1>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      type="bar"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
    <p
      class="text-xs text-muted-foreground sm:-mb-4 footer-font"
      :class="props.tableData.length <= 12 ? 'mt-2' : 'mt-6'"
    >
      Difference between number of actual wins and number of expected wins based
      off of simulating random matchups. Higher values indicate more luck.
    </p>
  </Card>
</template>
