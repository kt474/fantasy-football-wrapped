<script setup lang="ts">
import { cloneDeep } from "lodash";
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { TableDataType } from "../../api/types";
const store = useStore();

const props = defineProps<{
  tableData: TableDataType[];
}>();

const tableDataCopy = computed(() => {
  const result = cloneDeep(props.tableData);
  return result.sort((a, b) => b.pointsAgainst - a.pointsAgainst);
});

const seriesData = computed(() => {
  const averagePoints =
    tableDataCopy.value.reduce((sum, team) => sum + team.pointsFor, 0) /
    tableDataCopy.value.length /
    tableDataCopy.value[0]?.recordByWeek.length;
  const result = tableDataCopy.value.map((user: any) => {
    return parseFloat(
      (user.pointsAgainst / user.recordByWeek?.length - averagePoints).toFixed(
        2
      )
    );
  });
  return [{ name: "Avg. Point Difference", data: result }];
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
      labels: {
        formatter: function (str: string) {
          const n = 17;
          return str.length > n ? str.slice(0, n - 1) + "..." : str;
        },
      },
      title: {
        text: "League Manager",
        offsetX: -20,
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
      tickAmount: 4,
      title: {
        text: "Point Difference",
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
  colors: ["#0ea5e9"],
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
    tickAmount: 4,
    title: {
      text: "Point Difference",
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
  <div
    class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6 min-w-80"
  >
    <div class="flex justify-between">
      <div>
        <h1
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
        >
          Strength of Schedule
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
      class="text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-300"
      :class="props.tableData.length <= 12 ? 'mt-2' : 'mt-6'"
    >
      Average difference between a team’s opponents’ points per game and the
      league‑wide average points per game. Positive values indicate a more
      difficult schedule.
    </p>
  </div>
</template>
