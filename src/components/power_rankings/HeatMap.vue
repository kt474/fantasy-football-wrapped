<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  formattedData: any[];
}>();

watch(
  () => store.darkMode,
  () => updateChartColor()
);

watch(
  () => store.currentLeagueId,
  () => updateChartColor()
);

const totalRosters = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].totalRosters
    : 10; // 10 is league size for fake league
});

const rankingMap = computed(() => {
  if (props.formattedData.length === 0) return [];
  const groupByPosition = props.formattedData.reduce((acc, player) => {
    player.data.forEach((item: any) => {
      const position = item.position;
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push({
        name: player.name,
        projection: item.projection,
      });
    });
    return acc;
  }, {});

  Object.keys(groupByPosition).forEach((position) => {
    groupByPosition[position].sort(
      (a: any, b: any) => b.projection - a.projection
    );
  });
  return groupByPosition;
});

const seriesData = computed(() => {
  const result: any[] = [];
  if (props.formattedData.length > 0) {
    props.formattedData.forEach((roster: any) => {
      const data: any[] = [];
      roster.data.forEach((player: any) => {
        if (player.projection > 0) {
          data.push({
            x: player.position,
            y:
              rankingMap.value[player.position].findIndex(
                (user: any) => user.name === roster.name
              ) + 1,
          });
          // if a roster doesn't have any players in a position
        } else {
          data.push({
            x: player.position,
            y: 0,
          });
        }
      });
      result.push({ data: data, name: roster.name });
    });
  }
  return result.reverse(); // heat map chart inputs backwards
});

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
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
      marker: {
        show: false,
      },
    },
    stroke: {
      colors: ["#fff"],
      width: 1,
    },
    yaxis: {
      labels: {
        formatter: function (str: string) {
          const n = 15;
          return str.length > n ? str.slice(0, n - 1) + "..." : str;
        },
      },
    },
    plotOptions: {
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      heatmap: {
        shadeIntensity: 0.25,
        radius: 0,
        colorScale: {
          // ["#0ea5e9", "#22c55e", "#eab308", "#ef4444"]
          ranges: [
            {
              from: 0,
              to: 0.1,
              color: "#000",
            },
            {
              from: 1,
              to: Math.floor(totalRosters.value / 4),
              color: "#0ea5e9",
            },
            {
              from: Math.floor(totalRosters.value / 4) + 1,
              to: Math.floor(totalRosters.value / 2),
              color: "#22c55e",
            },
            {
              from: Math.floor(totalRosters.value / 2) + 1,
              to: Math.floor(totalRosters.value * (3 / 4)),
              color: "#eab308",
            },
            {
              from: Math.floor(totalRosters.value * (3 / 4)) + 1,
              to: totalRosters.value,
              color: "#ef4444",
            },
          ],
        },
      },
    },
  };
};

const chartOptions = ref({
  chart: {
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
    marker: {
      show: false,
    },
  },
  stroke: {
    colors: ["#fff"],
    width: 1,
  },
  plotOptions: {
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    heatmap: {
      shadeIntensity: 0.25,
      radius: 0,
      colorScale: {
        // ["#0ea5e9", "#22c55e", "#eab308", "#ef4444"]
        ranges: [
          {
            from: 0,
            to: 0.1,
            color: "#000",
          },
          {
            from: 1,
            to: Math.floor(totalRosters.value / 4),
            color: "#0ea5e9",
          },
          {
            from: Math.floor(totalRosters.value / 4) + 1,
            to: Math.floor(totalRosters.value / 2),
            color: "#22c55e",
          },
          {
            from: Math.floor(totalRosters.value / 2) + 1,
            to: Math.floor(totalRosters.value * (3 / 4)),
            color: "#eab308",
          },
          {
            from: Math.floor(totalRosters.value * (3 / 4)) + 1,
            to: totalRosters.value,
            color: "#ef4444",
          },
        ],
      },
    },
  },
  legend: {
    show: false,
  },
  yaxis: {
    labels: {
      formatter: function (str: string) {
        const n = 15;
        return str.length > n ? str.slice(0, n - 1) + "..." : str;
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
          class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
        >
          Position Group Rankings
        </h1>
      </div>
    </div>
    <apexchart
      type="heatmap"
      height="350"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
    <p
      class="mt-6 text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-300"
    >
      Relative position rankings based on data from the Sleeper API. Lower
      values indicate more highly projected player(s) in the position group.
    </p>
  </div>
</template>
