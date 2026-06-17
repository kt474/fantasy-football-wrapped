<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useStore } from "../../store/store";
import { Card } from "../ui/card";

const store = useStore();

type ProjectionCell = { position: string; projection: number };
type FormattedRoster = {
  name: string;
  username?: string;
  data: ProjectionCell[];
};
type PositionRanking = { name: string; projection: number };

const props = defineProps<{
  formattedData: FormattedRoster[];
}>();

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

const totalRosters = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].totalRosters
    : 10; // 10 is league size for fake league
});

const rankingMap = computed(() => {
  if (props.formattedData.length === 0) return {};
  const groupByPosition = props.formattedData.reduce<
    Record<string, PositionRanking[]>
  >((acc, player) => {
    player.data.forEach((item) => {
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
      (a, b) => b.projection - a.projection
    );
  });
  return groupByPosition;
});

const seriesData = computed(() => {
  const result: Array<{ data: Array<{ x: string; y: number }>; name: string }> =
    [];
  if (props.formattedData.length > 0) {
    props.formattedData.forEach((roster) => {
      const data: Array<{ x: string; y: number }> = [];
      roster.data.forEach((player) => {
        if (player.projection > 0) {
          const positionRankings = rankingMap.value[player.position] ?? [];
          data.push({
            x: player.position,
            y: positionRankings.findIndex((user) => user.name === roster.name) + 1,
          });
          // if a roster doesn't have any players in a position
        } else {
          data.push({
            x: player.position,
            y: 0,
          });
        }
      });
      result.push({
        data: data,
        name: store.showUsernames ? roster.username ?? roster.name : roster.name,
      });
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
  <Card class="w-full p-4 md:p-6 min-w-80">
    <div class="flex justify-between">
      <div>
        <h1 class="pb-2 text-3xl font-bold leading-none">
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
    <p class="mt-6 text-xs sm:-mb-4 footer-font text-muted-foreground">
      Relative position rankings based on data from the Sleeper API. Lower
      values indicate more highly projected player(s) in the position group.
    </p>
  </Card>
</template>
