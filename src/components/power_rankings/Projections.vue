<script setup lang="ts">
import { intersection } from "lodash";
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../../store/store";
import { RosterType, LeagueInfoType } from "../../api/types";
import { fakeProjectionData } from "../../api/helper";
import { getProjections } from "../../api/api";
import HeatMap from "./HeatMap.vue";

const store = useStore();
const loading = ref(false);
const categories = computed(() => {
  return formattedData.value.map((user) => (user.name ? user.name : ""));
});

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].rosters[0].projections
  ) {
    loading.value = true;
    await getData();
    updateChartColor();
    loading.value = false;
  }
});

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const lastScoredWeek =
    currentLeague.status === "complete" ? 0 : currentLeague.lastScoredWeek;
  await Promise.all(
    currentLeague.rosters.map(async (roster: any) => {
      const singleRoster: any[] = [];
      if (!roster.players) return [];
      const projectionPromises = roster.players.map((player: any) => {
        return getProjections(
          player,
          currentLeague.season,
          lastScoredWeek,
          currentLeague.scoringType
        );
      });

      const projections = await Promise.all(projectionPromises);
      singleRoster.push(...projections);
      store.addProjectionData(
        store.currentLeagueIndex,
        roster.id,
        singleRoster
      );
    })
  );
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const formattedData = computed(() => {
  if (
    store.leagueInfo.length == 0 ||
    !store.leagueInfo[store.currentLeagueIndex]
  ) {
    return fakeProjectionData;
  }
  const topPositions = ["RB", "WR"];
  const otherPositions = intersection(
    ["QB", "TE", "K", "DEF"],
    store.leagueInfo[store.currentLeagueIndex].rosterPositions
  );

  const nameMapping: any = new Map(
    store.leagueInfo[store.currentLeagueIndex].users.map((user: any) => [
      user.id,
      user.name,
    ])
  );
  const mappedData: any[] = [];
  store.leagueInfo[store.currentLeagueIndex].rosters.forEach(
    (roster: RosterType) => {
      mappedData.push({
        name: nameMapping.get(roster.id),
        data: roster.projections,
      });
    }
  );

  const result = mappedData.map((roster: { name: string; data: any[] }) => {
    const filteredData = roster.data ? roster.data : [];

    const groupedAndSortedTopPositions = topPositions.reduce(
      (acc: any, position: any) => {
        const sortedByProjection = filteredData
          .filter((item: any) => item.position === position)
          .sort((a: any, b: any) => b.projection - a.projection);

        acc[position] = sortedByProjection.slice(0, 3);

        return acc;
      },
      {}
    );

    const highestOtherPositions = otherPositions.reduce(
      (acc: any, position) => {
        const highest: number = filteredData
          .filter((item: any) => item.position === position)
          .sort((a: any, b: any) => b.projection - a.projection)[0];

        if (highest) {
          acc.push(highest);
        } else {
          acc.push({ position: position, projection: 0 });
        }

        return acc;
      },
      []
    );

    // Total top 3 RBs and WRs
    let rbTotal = 0;
    let wrTotal = 0;
    groupedAndSortedTopPositions["RB"].forEach(
      (player: { projection: number; position: number }) => {
        rbTotal += player.projection;
      }
    );

    groupedAndSortedTopPositions["WR"].forEach(
      (player: { projection: number; position: number }) => {
        wrTotal += player.projection;
      }
    );

    const topProjections = [
      { position: "RB", projection: Math.round(rbTotal) },
      { position: "WR", projection: Math.round(wrTotal) },
    ];

    const combined = [...topProjections, ...highestOtherPositions];

    return {
      name: roster.name,
      data: [...combined],
      total: combined.reduce((acc, obj) => acc + obj.projection, 0),
    };
  });
  return result.sort((a, b) => b.total - a.total);
});

const seriesData = computed(() => {
  let rb: number[] = [];
  let wr: number[] = [];
  let qb: number[] = [];
  let te: number[] = [];
  let def: number[] = [];
  let k: number[] = [];

  formattedData.value.forEach((roster: any) => {
    roster.data.forEach((player: any) => {
      if (player.position === "RB") {
        rb.push(player.projection);
      } else if (player.position === "WR") {
        wr.push(player.projection);
      } else if (player.position === "QB") {
        qb.push(player.projection);
      } else if (player.position === "TE") {
        te.push(player.projection);
      } else if (player.position === "DEF") {
        def.push(player.projection);
      } else if (player.position === "K") {
        k.push(player.projection);
      }
    });
  });

  return [
    {
      name: "RB",
      data: rb,
    },
    {
      name: "WR",
      data: wr,
    },
    {
      name: "QB",
      data: qb,
    },
    {
      name: "TE",
      data: te,
    },
    {
      name: "K",
      data: k,
    },
    {
      name: "DEF",
      data: def,
    },
  ];
});

watch(
  () => store.darkMode,
  () => updateChartColor()
);

watch(
  () => store.currentLeagueId,
  async () => {
    if (
      store.leagueInfo.length > 0 &&
      !store.leagueInfo[store.currentLeagueIndex].rosters[0].projections
    ) {
      loading.value = true;
      await getData();
      updateChartColor();
      loading.value = false;
    } else {
      updateChartColor();
    }
  }
);

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      type: "bar",
      stacked: true,
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
    stroke: {
      colors: ["#fff"],
      width: 1,
    },
    fill: {
      opacity: 1,
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: {
          total: {
            enabled: true,
            offsetX: 3,
            style: {
              fontSize: "13px",
              fontWeight: 900,
              color: store.darkMode ? "#ffffff" : "#111827",
            },
          },
        },
      },
    },
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
      marker: {
        show: false,
      },
    },
    xaxis: {
      categories: categories.value,
    },
    yaxis: {
      labels: {
        formatter: function (str: string) {
          const n = 15;
          return str.length > n ? str.slice(0, n - 1) + "..." : str;
        },
      },
    },
  };
};

const chartOptions = ref({
  chart: {
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    type: "bar",
    stacked: true,
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
  colors: ["#0ea5e9", "#22c55e", "#eab308", "#ef4444", "#6366f1", "#ec4899"],
  stroke: {
    colors: ["#fff"],
    width: 1,
  },
  fill: {
    opacity: 1,
  },
  plotOptions: {
    bar: {
      horizontal: true,
      dataLabels: {
        total: {
          enabled: true,
          offsetX: 3,
          style: {
            fontSize: "13px",
            fontWeight: 900,
            color: store.darkMode ? "#ffffff" : "#111827",
          },
        },
      },
    },
  },
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    marker: {
      show: false,
    },
  },
  xaxis: {
    categories: categories.value,
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
  <div>
    <div v-if="!loading">
      <div
        class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6 min-w-80"
      >
        <div class="flex justify-between">
          <div>
            <h1
              class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
            >
              Roster Projections
            </h1>
          </div>
        </div>
        <apexchart
          type="bar"
          height="350"
          :options="chartOptions"
          :series="seriesData"
        ></apexchart>
        <p
          class="mt-6 text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-300"
        >
          Rest of season projected points data from the Sleeper API. If the
          season is complete, entire season projections are shown.
        </p>
      </div>
      <HeatMap :formattedData="formattedData" class="mt-4" />
    </div>
    <div
      v-else
      role="status"
      class="p-4 border border-gray-200 rounded shadow animate-pulse md:p-6 dark:border-gray-700 custom-height"
    >
      <p
        class="flex justify-center -mb-6 text-xl font-semibold text-gray-900 dark:text-white"
      >
        Loading projection data...
      </p>
      <div
        class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2.5"
      ></div>
      <div
        class="w-48 h-2 mb-10 bg-gray-200 rounded-full dark:bg-gray-700"
      ></div>
      <div class="flex items-baseline mt-4">
        <div
          class="w-full h-40 bg-gray-200 rounded-t-lg dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-60 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-40 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-32 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-36 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-72 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-64 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full h-64 bg-gray-200 rounded-t-lg ms-6 dark:bg-gray-700"
        ></div>
        <div
          class="w-full bg-gray-200 rounded-t-lg h-44 ms-6 dark:bg-gray-700"
        ></div>
      </div>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>
<style scoped>
.custom-height {
  height: 400px;
}
</style>
