<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../../store/store";
import { fakeUsers, fakeTransactions } from "../../api/helper";
import { RosterType } from "../../types/types";

const store = useStore();

const transactionData = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    let trades: any[] = [];
    currentLeague.trades.forEach((trade: any) => {
      trade.roster_ids.forEach((id: number) => {
        trades.push({
          adds: trade.adds,
          draft_picks: trade.draft_picks,
          waiver_budget: trade.waiver_budget,
          status: trade.status,
          type: trade.type,
          creator: currentLeague.rosters.find(
            (roster: RosterType) => roster.rosterId === id
          )?.id,
          roster_ids: [id],
        });
      });
    });

    const allMoves = [...(currentLeague.waivers || []), ...trades];

    const groupedMoves = allMoves
      .filter(
        (item) =>
          (item.status === "complete" && item.adds) ||
          (item.type === "trade" &&
            item.status === "complete" &&
            (item.adds || item.draft_picks || item.waiver_budget))
      )
      .reduce((acc, item) => {
        const creatorId = item.roster_ids[0];
        let type = item.type;

        if (!acc[creatorId]) {
          acc[creatorId] = {};
        }

        acc[creatorId][type] = (acc[creatorId][type] || 0) + 1;

        return acc;
      }, {});

    const creatorTotals = Object.entries(groupedMoves).map(
      ([creatorId, types]) => {
        const total = Object.values(types as Record<string, number>).reduce(
          (sum, count) => sum + count,
          0
        );
        return { creatorId, total };
      }
    );

    creatorTotals.sort((a, b) => a.total - b.total);

    const sortedCategories = creatorTotals.map((entry) => entry.creatorId);

    const categories = sortedCategories;

    const transactionTypes = ["waiver", "free_agent", "trade"];

    const series = transactionTypes.map((type) => {
      return {
        name: formatTypeName(type),
        data: categories.map((creatorId) => {
          return groupedMoves[creatorId]?.[type] || 0;
        }),
      };
    });

    function formatTypeName(type: string): string {
      switch (type) {
        case "waiver":
          return "Waiver Claims";
        case "free_agent":
          return "Free Agents";
        case "trade":
          return "Trades";
        default:
          return type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
      }
    }

    return { series, categories };
  } else {
    return {
      series: fakeTransactions,
      categories: fakeUsers.map((user) => user.username),
    };
  }
});

watch(
  [
    () => store.darkMode,
    () => store.currentLeagueId,
    () => store.showUsernames,
  ],
  () => updateChartColor()
);
const getNameFromId = (rosterId: string) => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const rosterObj = currentLeague.rosters.find(
      (roster) => roster.rosterId == rosterId
    );
    if (rosterObj) {
      const userObj = currentLeague.users.find(
        (user) => user.id == rosterObj.id
      );
      if (!userObj) return "Ghost Roster";
      return store.showUsernames ? userObj?.username : userObj?.name;
    }
  } else return rosterId;
};
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
      categories: transactionData.value.categories.map((id) =>
        getNameFromId(id)
      ),
      tickAmount: transactionData.value.categories.length - 1,
      hideOverlappingLabels: false,
      labels: {
        formatter: function (str: string) {
          const n = 17;
          return str.length > n ? str.slice(0, n - 1) + "..." : str;
        },
      },
      title: {
        text: "League Manager",
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
      title: {
        text: "Number of Transactions",
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
      columnWidth: "75%",
    },
  },
  colors: ["#0ea5e9", "#22c55e", "#eab308"],
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
    categories: transactionData.value.categories.map((id) => getNameFromId(id)),
    tickAmount: transactionData.value.categories.length - 1,
    hideOverlappingLabels: false,
    labels: {
      formatter: function (str: string) {
        const n = 17;
        return str.length > n ? str.slice(0, n - 1) + "..." : str;
      },
    },
    title: {
      text: "League Manager",
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
    title: {
      text: "Number of Transactions",
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
          League Transactions
        </h1>
      </div>
    </div>
    <apexchart
      width="100%"
      height="475"
      type="bar"
      :options="chartOptions"
      :series="transactionData.series"
    ></apexchart>
    <p
      class="mt-6 text-xs text-gray-500 sm:-mb-4 footer-font dark:text-gray-300"
    >
      Transactions are roster changing moves which include: wavier claims, free
      agent additions, and trades.
    </p>
  </div>
</template>
