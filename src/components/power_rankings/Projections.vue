<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useStore } from "../../store/store";
import { RosterType } from "../../api/types";

const store = useStore();
const categories = computed(() => {
  return formattedData.value.map((user) => user.name);
});

const formattedData = computed(() => {
  const topPositions = ["RB", "WR"];
  const otherPositions = ["QB", "K", "DEF", "TE"];
  const nameMapping: any = new Map(
    store.leagueInfo[store.currentLeagueIndex].users.map((user: any) => [
      user.id,
      user.name,
    ])
  );
  const mappedData: any[] = [];
  store.leagueInfo[store.currentLeagueIndex].rosters.forEach(
    (roster: RosterType) => {
      console.log(roster);
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
  () => updateChartColor()
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
          Roster Strength
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
      Roster strength is based on Sleeper ROS projections.
    </p>
  </div>
</template>
