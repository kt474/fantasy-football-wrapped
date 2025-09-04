<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { TableDataType } from "../../api/types.ts";
import { useStore } from "../../store/store";
import { getPlayersByIdsMap, getSingleWeekProjection } from "../../api/api.ts";
import { fakeWeeklyPreview } from "../../api/helper.ts";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
  currentWeek: number;
}>();
const playerNames: any = ref([]);
const loading = ref(false);

const previewWeek = computed(() => {
  return props.currentWeek > 0 ? props.currentWeek - 1 : 0;
});

const matchups = computed<TableDataType[][]>(() => {
  const groups = props.tableData.reduce((acc: any, obj) => {
    const key = obj.matchups[previewWeek.value];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
  return Object.values(groups);
});

const getRecord = (recordString: string, index: number) => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].medianScoring === 1
  ) {
    index = index * 2;
  }
  if (recordString) {
    const numWins = recordString.slice(0, index).split("W").length - 1;
    const numLosses = recordString.slice(0, index).split("L").length - 1;
    return `${numWins} - ${numLosses}`;
  }
  return "0-0";
};

const fetchPlayerNames = async () => {
  if (store.leagueIds.length > 0) {
    loading.value = true;
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const allPlayerIds = props.tableData
      .map((user) => [user.starters[previewWeek.value]])
      .flat();
    let playerLookupMap = new Map<string, any>();
    if (allPlayerIds.length > 0) {
      playerLookupMap = await getPlayersByIdsMap(allPlayerIds);
    }

    // Map over tableData and resolve all player projections
    const result = await Promise.all(
      props.tableData.map(async (user: any) => {
        const starterIds = user.starters[previewWeek.value];
        // For each starter, fetch player and projection
        const starterNames = await Promise.all(
          starterIds.map(async (id: string) => {
            const player = playerLookupMap.get(id);
            const projection = await getSingleWeekProjection(
              id,
              currentLeague.season,
              previewWeek.value + 1,
              currentLeague.scoringType
            );
            return {
              ...player,
              projection,
            };
          })
        );
        return {
          id: user.rosterId,
          players: starterNames,
          total: starterNames.reduce((sum, obj) => {
            const value = Number(obj.projection);
            return sum + (isFinite(value) ? value : 0);
          }, 0),
        };
      })
    );

    playerNames.value = result;
    loading.value = false;
  } else {
    playerNames.value = fakeWeeklyPreview;
  }
};

const getStarters = (id: number) => {
  const playerObj: any = playerNames.value.find((user: any) => user.id === id);
  if (playerObj) {
    return playerObj.players;
  }
};

const getTotal = (id: number) => {
  const playerObj: any = playerNames.value.find((user: any) => user.id === id);
  if (playerObj) {
    return Math.round(playerObj.total * 100) / 100;
  }
  return 0;
};

const getProjectedWinner = (user1: any, user2: any) => {
  const playerObj1: any = playerNames.value.find(
    (user: any) => user.id === user1.rosterId
  );
  const playerObj2: any = playerNames.value.find(
    (user: any) => user.id === user2.rosterId
  );
  if (playerObj1 && playerObj2) {
    if (store.showUsernames) {
      return playerObj1?.total > playerObj2.total
        ? `${user1.username} (+${
            Math.round((playerObj1.total - playerObj2.total) * 100) / 100
          })`
        : `${user2.username} (+${
            Math.round((playerObj2.total - playerObj1.total) * 100) / 100
          })`;
    }
    return playerObj1?.total > playerObj2.total
      ? `${user1.name} (+${
          Math.round((playerObj1.total - playerObj2.total) * 100) / 100
        })`
      : `${user2.name} (+${
          Math.round((playerObj2.total - playerObj1.total) * 100) / 100
        })`;
  }
  return "";
};

const getWinPercentage = (id1: number, id2: number) => {
  const playerObj1: any = playerNames.value.find(
    (user: any) => user.id === id1
  );
  const playerObj2: any = playerNames.value.find(
    (user: any) => user.id === id2
  );
  let result = 0;
  if (playerObj1 && playerObj2) {
    result =
      playerObj1.total > playerObj2.total
        ? playerObj1.total / (playerObj1.total + playerObj2.total)
        : playerObj2.total / (playerObj1.total + playerObj2.total);
  }

  return Math.round(result * 100);
};

const formatName = (fullName: string) => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName; // If only one name, return as is
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return `${firstName[0]}. ${lastName}`;
};

const getSeriesData = (user1: TableDataType, user2: TableDataType) => {
  return [
    {
      name: store.showUsernames ? user1.username : user1.name,
      data: user1.points.slice(0, previewWeek.value),
    },
    {
      name: store.showUsernames ? user2.username : user2.name,
      data: user2.points.slice(0, previewWeek.value),
    },
  ];
};

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      height: 350,
      foreColor: store.darkMode ? "#ffffff" : "#111827",
      type: "line",
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      animations: {
        enabled: false,
      },
    },
    colors: ["#f97316", "#22c55e"],
    tooltip: {
      theme: store.darkMode ? "dark" : "light",
    },
    dataLabels: {
      enabled: true,
    },
    stroke: {
      curve: "smooth",
    },
    grid: {
      borderColor: "#e7e7e7",
      row: {
        colors: store.darkMode
          ? ["#374151", "transparent"]
          : ["#f3f3f3", "transparent"],
        opacity: 0.5,
      },
    },
    markers: {
      size: 1,
    },
    xaxis: {
      title: {
        text: "Week",
        offsetX: -18,
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
        text: "Points",
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      floating: true,
      offsetY: -25,
      offsetX: -5,
    },
  };
};

const chartOptions = ref({
  chart: {
    height: 350,
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    type: "line",
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
  },
  colors: ["#f97316", "#22c55e"],
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
  },
  dataLabels: {
    enabled: true,
  },
  stroke: {
    curve: "smooth",
  },
  grid: {
    borderColor: "#e7e7e7",
    row: {
      colors: store.darkMode
        ? ["#374151", "transparent"]
        : ["#f3f3f3", "transparent"],
      opacity: 0.5,
    },
  },
  markers: {
    size: 1,
  },
  xaxis: {
    title: {
      text: "Week",
      offsetX: -18,
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
      text: "Points",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
    floating: true,
    offsetY: -25,
    offsetX: -5,
  },
});

onMounted(async () => {
  fetchPlayerNames();
});

watch([() => props.currentWeek, () => store.currentLeagueId], () =>
  fetchPlayerNames()
);

watch([() => store.darkMode, () => store.currentLeagueId], () =>
  updateChartColor()
);
</script>
<template>
  <div
    v-if="!loading"
    class="flex flex-wrap mb-4 overflow-auto gap-x-4 gap-y-2"
  >
    <div
      v-for="matchup in matchups"
      class="sm:px-2 px-1 py-2.5 mt-2 text-gray-700 bg-white border border-gray-200 rounded-lg shadow dark:shadow-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 w-full xl:w-[calc(50%-.5rem)] overflow-auto"
    >
      <!-- Flex container for the two teams -->
      <div class="flex justify-between">
        <div class="flex justify-between w-full sm:p-2">
          <!-- First team (index 0) -->
          <div class="w-60">
            <div class="flex items-center mb-4">
              <img
                v-if="matchup[0].avatarImg"
                alt="User avatar"
                class="w-8 h-8 -mt-2 rounded-full"
                :src="matchup[0].avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-800 dark:text-gray-50"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <div class="flex">
                <div>
                  <p
                    class="w-24 px-2 -mt-1 font-semibold text-gray-800 truncate sm:w-36 dark:text-gray-50"
                  >
                    {{
                      store.showUsernames
                        ? matchup[0].username
                          ? matchup[0].username
                          : "Ghost Roster"
                        : matchup[0].name
                        ? matchup[0].name
                        : "Ghost Roster"
                    }}
                  </p>
                  <p class="ml-2 text-xs">
                    ({{ getRecord(matchup[0].recordByWeek, previewWeek) }})
                  </p>
                </div>
                <div class="hidden sm:block">
                  <p
                    class="ml-2 -mt-1 text-2xl font-semibold"
                    :class="
                      getTotal(matchup[0]?.rosterId) >
                      getTotal(matchup[1]?.rosterId)
                        ? 'text-blue-600 dark:text-blue-500'
                        : 'text-red-600 dark:text-red-500'
                    "
                  >
                    {{ getTotal(matchup[0].rosterId) }}
                  </p>
                  <p class="text-xs text-center">PROJ</p>
                </div>
              </div>
            </div>
            <div class="block mb-2 text-center sm:hidden">
              <p
                class="mt-1 ml-2 text-2xl font-semibold"
                :class="
                  getTotal(matchup[0]?.rosterId) >
                  getTotal(matchup[1]?.rosterId)
                    ? 'text-blue-600 dark:text-blue-500'
                    : 'text-red-600 dark:text-red-500'
                "
              >
                {{ getTotal(matchup[0].rosterId) }}
              </p>
              <p class="text-xs text-center">PROJ</p>
            </div>
            <div>
              <div
                class="pb-1 mb-2"
                v-for="player in getStarters(matchup[0].rosterId)"
              >
                <div
                  v-if="player.name || player.team"
                  class="flex justify-between px-4 py-2 mr-1 rounded bg-gray-50 dark:bg-gray-700"
                >
                  <div>
                    <p
                      class="w-16 text-sm font-medium text-gray-800 truncate sm:text-base sm:w-28 dark:text-gray-50"
                    >
                      {{
                        player.name
                          ? formatName(player.name)
                          : `${player.team} Defense`
                      }}
                    </p>
                    <p class="text-xs">
                      {{ `${player.position} - ${player.team}` }}
                    </p>
                  </div>
                  <p
                    class="mt-1.5 ml-2 font-medium text-gray-800 dark:text-gray-50 sm:text-base text-sm"
                  >
                    {{ player.projection }}
                  </p>
                </div>
                <div
                  v-else
                  class="px-4 py-4 mr-1 text-sm rounded bg-gray-50 dark:bg-gray-700"
                >
                  <p class="font-medium text-gray-800 dark:text-gray-50">
                    Empty
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex w-px h-full bg-gray-300 dark:bg-gray-600"></div>
          <!-- Second team (index 1) -->
          <div class="w-60">
            <div class="flex items-center justify-end mb-4">
              <div class="flex">
                <div class="hidden sm:block">
                  <p
                    class="mr-2 -mt-1 text-2xl font-semibold"
                    :class="
                      getTotal(matchup[1]?.rosterId) >
                      getTotal(matchup[0]?.rosterId)
                        ? 'text-blue-600 dark:text-blue-500'
                        : 'text-red-600 dark:text-red-500'
                    "
                  >
                    {{ getTotal(matchup[1].rosterId) }}
                  </p>
                  <p class="text-xs text-center">PROJ</p>
                </div>
                <div>
                  <p
                    class="w-24 px-2 -mt-1 font-semibold text-right text-gray-800 truncate sm:w-36 dark:text-gray-50"
                  >
                    {{
                      store.showUsernames
                        ? matchup[1].username
                          ? matchup[1].username
                          : "Ghost Roster"
                        : matchup[1].name
                        ? matchup[1].name
                        : "Ghost Roster"
                    }}
                  </p>
                  <p class="mr-2 text-xs float-end">
                    ({{ getRecord(matchup[1].recordByWeek, previewWeek) }})
                  </p>
                </div>
              </div>
              <img
                v-if="matchup[1].avatarImg"
                alt="User avatar"
                class="w-8 h-8 -mt-2 rounded-full"
                :src="matchup[1].avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8 text-gray-800 dark:text-gray-50"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
            </div>
            <div class="block mb-2 text-center sm:hidden">
              <p
                class="mt-1 mr-2 text-2xl font-semibold"
                :class="
                  getTotal(matchup[1]?.rosterId) >
                  getTotal(matchup[0]?.rosterId)
                    ? 'text-blue-600 dark:text-blue-500'
                    : 'text-red-600 dark:text-red-500'
                "
              >
                {{ getTotal(matchup[1].rosterId) }}
              </p>
              <p class="text-xs text-center">PROJ</p>
            </div>
            <div class="ml-1 text-right sm:ml-0">
              <div
                class="justify-end pb-1 mb-2"
                v-for="player in getStarters(matchup[1].rosterId)"
              >
                <div
                  class="flex justify-between px-4 py-2 text-sm rounded bg-gray-50 dark:bg-gray-700 sm:text-base"
                  v-if="player.name || player.team"
                >
                  <p
                    class="mr-2 mt-1.5 font-medium text-gray-800 dark:text-gray-50 sm:text-base text-sm"
                  >
                    {{ player.projection }}
                  </p>
                  <div>
                    <p
                      class="w-16 font-medium text-gray-800 truncate sm:w-28 dark:text-gray-50"
                    >
                      {{
                        player.name
                          ? formatName(player.name)
                          : `${player.team} Defense`
                      }}
                    </p>
                    <p class="text-xs">
                      {{ `${player.position} - ${player.team}` }}
                    </p>
                  </div>
                </div>
                <div
                  v-else
                  class="px-4 py-4 text-sm rounded bg-gray-50 dark:bg-gray-700"
                >
                  <p class="font-medium text-gray-800 dark:text-gray-50">
                    Empty
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="px-4 py-8 mx-0 rounded sm:mx-2 bg-gray-50 dark:bg-gray-700">
        <div class="flex justify-between mb-1">
          <span
            class="text-sm font-medium text-gray-800 sm:text-base dark:text-gray-50"
            >{{ getProjectedWinner(matchup[0], matchup[1]) }}</span
          >
          <span
            class="text-sm font-medium text-blue-700 sm:text-base dark:text-gray-50"
            >{{
              getWinPercentage(matchup[0].rosterId, matchup[1].rosterId)
            }}%</span
          >
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-500">
          <div
            class="bg-blue-600 h-2.5 rounded-full"
            :style="{
              width:
                getWinPercentage(matchup[0].rosterId, matchup[1].rosterId) +
                '%',
            }"
          ></div>
        </div>
      </div>
      <p
        class="my-4 mb-8 ml-4 font-semibold text-gray-800 sm:mb-0 dark:text-gray-200"
      >
        Recent Performances
      </p>
      <apexchart
        class="mt-4"
        type="line"
        height="350"
        :options="chartOptions"
        :series="getSeriesData(matchup[0], matchup[1])"
      ></apexchart>
    </div>
  </div>
  <div v-else>
    <p class="text-gray-900 mb-96 dark:text-gray-200">Loading...</p>
  </div>
</template>
<style scoped></style>
