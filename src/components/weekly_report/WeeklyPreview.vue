<script setup lang="ts">
import PreviewSummary from "./PreviewSummary.vue";
import { computed, onMounted, ref, watch } from "vue";
import { TableDataType } from "../../types/types.ts";
import { useStore } from "../../store/store";
import { getPlayersByIdsMap, getSingleWeekProjection } from "../../api/api.ts";
import { fakeWeeklyPreview, getWinProbability } from "../../api/helper.ts";
import { Player } from "../../types/apiTypes.ts";
import Card from "../ui/card/Card.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
  currentWeek: number;
  isPlayoffs: boolean;
}>();
const playerNames: any = ref([]);
const loading = ref(false);

const previewWeek = computed(() => {
  return props.currentWeek > 0 ? props.currentWeek - 1 : 0;
});

const matchups = computed<TableDataType[][]>(() => {
  const groups = props.tableData.reduce(
    (acc: Record<string, TableDataType[]>, obj) => {
      const key = obj.matchups?.[previewWeek.value];
      if (key) {
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(obj);
      }
      return acc;
    },
    {}
  );

  return Object.values(groups);
});
const cases = computed(() => {
  return simulateStandings(matchups.value, previewWeek.value);
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
    let playerLookupMap = new Map<string, Player>();
    if (allPlayerIds.length > 0) {
      playerLookupMap = await getPlayersByIdsMap(allPlayerIds);
    }

    // Map over tableData and resolve all player projections
    const result = await Promise.all(
      props.tableData.map(async (user) => {
        const starterIds = user.starters[previewWeek.value];
        // For each starter, fetch player and projection
        if (starterIds) {
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
                projection: projection?.stats,
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
        } else {
          return {
            id: user.rosterId,
            players: [],
            total: 0,
          };
        }
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
        ? getWinProbability((playerObj1.total - playerObj2.total) / 40)
        : getWinProbability((playerObj2.total - playerObj1.total) / 40);
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

const rankTeams = (teams: any[]) => {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return a.losses - b.losses;
  });
};

const assignRanks = (sortedTeams: any[]) => {
  return sortedTeams.map((team, i) => ({
    ...team,
    rank: i + 1,
  }));
};

// derive record up to a given week based on recordByWeek string
const getRecordThroughWeek = (team: any, week: number) => {
  const recStr = team.recordByWeek || "";
  let wins = 0,
    losses = 0,
    ties = 0;

  for (let i = 0; i < week && i < recStr.length; i++) {
    if (recStr[i] === "W") wins++;
    else if (recStr[i] === "L") losses++;
    else if (recStr[i] === "T") ties++;
  }

  return { wins, losses, ties };
};

const simulateStandings = (matchups: any[], week: number) => {
  // Build base team objects with records THROUGH this week
  let allTeams = matchups.flat().map((team) => {
    const rec = getRecordThroughWeek(team, week);
    return {
      ...team,
      wins: rec.wins,
      losses: rec.losses,
      ties: rec.ties,
    };
  });

  // ---- BASE CASE ----
  let baseSorted = assignRanks(rankTeams(allTeams));
  let results: any = {};
  for (let team of baseSorted) {
    results[team.id] = {
      team: team.name,
      baseCase: { wins: team.wins, losses: team.losses, rank: team.rank },
      bestCase: { wins: team.wins, losses: team.losses, rank: team.rank },
      worstCase: { wins: team.wins, losses: team.losses, rank: team.rank },
    };
  }

  // ---- PER MATCHUP SCENARIOS ----
  matchups.forEach(([teamA, teamB]) => {
    // Note: make new arrays from base state each time
    let teamsAWin = allTeams.map((t) => ({ ...t }));
    let a = teamsAWin.find((t) => t.id === teamA.id);
    let b = teamsAWin.find((t) => t.id === teamB.id);
    a.wins++;
    b.losses++;
    let rankedAWin = assignRanks(rankTeams(teamsAWin));

    let teamsBWin = allTeams.map((t) => ({ ...t }));
    let a2 = teamsBWin.find((t) => t.id === teamA.id);
    let b2 = teamsBWin.find((t) => t.id === teamB.id);
    b2.wins++;
    a2.losses++;
    let rankedBWin = assignRanks(rankTeams(teamsBWin));

    // Update best/worst results
    [...rankedAWin, ...rankedBWin].forEach((scenarioTeam) => {
      const res = results[scenarioTeam.id];

      // Best = smaller rank number
      if (scenarioTeam.rank < res.bestCase.rank) {
        res.bestCase = {
          wins: scenarioTeam.wins,
          losses: scenarioTeam.losses,
          rank: scenarioTeam.rank,
        };
      }

      // Worst = larger rank number
      if (scenarioTeam.rank > res.worstCase.rank) {
        res.worstCase = {
          wins: scenarioTeam.wins,
          losses: scenarioTeam.losses,
          rank: scenarioTeam.rank,
        };
      }
    });
  });

  return results;
};

const getOrdinalSuffix = (number: number) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = number % 100;

  return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

const generateString = (recordObj: any) => {
  const bestCase = getOrdinalSuffix(recordObj.bestCase.rank);
  const worstCase = getOrdinalSuffix(recordObj.worstCase.rank);
  return `Placement Range: ${bestCase} - ${worstCase}`;
};

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
    <Card
      v-if="matchups.length > 0"
      v-for="matchup in matchups"
      class="sm:px-2 px-1 py-2.5 mt-2 w-full xl:w-[calc(50%-.5rem)] overflow-auto"
    >
      <!-- Flex container for the two teams -->
      <div class="flex justify-between">
        <div class="flex justify-between w-full sm:p-2">
          <!-- First team (index 0) -->
          <div class="w-60 sm:w-64">
            <div class="flex items-center mb-4">
              <img
                v-if="matchup[0].avatarImg"
                alt="User avatar"
                class="w-8 h-8 -mt-2 rounded-full"
                :src="matchup[0].avatarImg"
              />
              <svg
                v-else
                class="w-8 h-8"
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
                  <p class="w-24 px-2 -mt-1 font-semibold truncate sm:w-36">
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
                  <p class="ml-2 text-xs text-muted-foreground">
                    ({{ getRecord(matchup[0].recordByWeek, previewWeek) }})
                  </p>
                </div>
                <div class="hidden sm:block">
                  <p
                    class="ml-2 -mt-1 text-2xl font-semibold"
                    :class="
                      getTotal(matchup[0]?.rosterId) >
                      getTotal(matchup[1]?.rosterId)
                        ? 'text-primary'
                        : 'text-destructive'
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
                    ? 'text-primary'
                    : 'text-destructive'
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
                <Card
                  v-if="player.name || player.team"
                  class="flex justify-between py-2 pl-4 pr-4 mr-1 rounded-md sm:pl-1"
                >
                  <div class="flex items-center gap-1">
                    <img
                      v-if="player.position !== 'DEF'"
                      class="hidden object-cover rounded-full w-14 sm:block"
                      :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                      alt="Player avatar"
                    />
                    <img
                      v-else
                      class="hidden w-10 h-10 mx-2 rounded-full sm:block"
                      :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                      alt="Team avatar"
                    />
                    <div>
                      <p
                        class="w-16 text-sm font-medium truncate sm:text-base sm:w-28"
                      >
                        {{
                          player.name
                            ? formatName(player.name)
                            : `${player.team}`
                        }}
                      </p>
                      <p class="text-xs">
                        {{ `${player.position} - ${player.team}` }}
                      </p>
                    </div>
                  </div>
                  <p class="mt-1.5 ml-2 font-medium sm:text-base text-sm">
                    {{ player.projection }}
                  </p>
                </Card>
                <Card v-else class="px-4 py-4 mr-1 text-sm">
                  <p class="font-medium">Empty</p>
                </Card>
              </div>
            </div>
          </div>
          <div class="flex w-px h-full bg-muted"></div>
          <!-- Second team (index 1) -->
          <div class="w-60 sm:w-64">
            <div class="flex items-center justify-end mb-4">
              <div class="flex">
                <div class="hidden sm:block">
                  <p
                    class="mr-2 -mt-1 text-2xl font-semibold"
                    :class="
                      getTotal(matchup[1]?.rosterId) >
                      getTotal(matchup[0]?.rosterId)
                        ? 'text-primary'
                        : 'text-destructive'
                    "
                  >
                    {{ getTotal(matchup[1].rosterId) }}
                  </p>
                  <p class="text-xs text-center">PROJ</p>
                </div>
                <div>
                  <p
                    class="w-24 px-2 -mt-1 font-semibold text-right truncate sm:w-36"
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
                  <p class="mr-2 text-xs float-end text-muted-foreground">
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
                class="w-8 h-8"
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
                    ? 'text-primary'
                    : 'text-destructive'
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
                <Card
                  class="flex justify-between py-2 pl-4 pr-4 text-sm rounded-md sm:pr-1 sm:text-base"
                  v-if="player.name || player.team"
                >
                  <p class="mr-2 mt-1.5 font-medium sm:text-base text-sm">
                    {{ player.projection }}
                  </p>

                  <div class="flex items-center gap-1">
                    <div>
                      <p class="w-16 font-medium truncate sm:w-28">
                        {{
                          player.name
                            ? formatName(player.name)
                            : `${player.team}`
                        }}
                      </p>
                      <p class="text-xs">
                        {{ `${player.position} - ${player.team}` }}
                      </p>
                    </div>
                    <img
                      v-if="player.position !== 'DEF'"
                      class="hidden object-cover rounded-full w-14 sm:block"
                      :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                      alt="Player avatar"
                    />
                    <img
                      v-else
                      class="hidden w-10 h-10 mx-2 rounded-full sm:block"
                      :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                      alt="Team avatar"
                    />
                  </div>
                </Card>
                <div v-else class="px-4 py-4 text-sm rounded">
                  <p class="font-medium">Empty</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Card class="px-4 py-8 mx-0 rounded-md sm:mx-2">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium sm:text-base">{{
            getProjectedWinner(matchup[0], matchup[1])
          }}</span>
          <span class="text-sm font-medium text-primary sm:text-base"
            >{{
              getWinPercentage(matchup[0].rosterId, matchup[1].rosterId)
            }}%</span
          >
        </div>
        <div class="w-full rounded-full h-2.5 bg-secondary">
          <div
            class="bg-primary h-2.5 rounded-full"
            :style="{
              width:
                getWinPercentage(matchup[0].rosterId, matchup[1].rosterId) +
                '%',
            }"
          ></div>
        </div>
      </Card>
      <div
        v-if="!isPlayoffs"
        class="flex justify-between p-4 mx-0 mt-3 rounded sm:mx-2"
      >
        <div class="mr-2">
          <p class="w-32 font-semibold truncate sm:w-auto">
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
          {{ generateString(cases[matchup[0].id]) }}
        </div>
        <div>
          <p class="w-32 font-semibold truncate sm:w-auto">
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
          {{ generateString(cases[matchup[1].id]) }}
        </div>
      </div>
      <PreviewSummary
        v-if="
          currentWeek ===
          store.leagueInfo[store.currentLeagueIndex]?.currentWeek
        "
        :matchup1="matchup[0]"
        :matchup2="matchup[1]"
        :playerNames="playerNames"
      />
      <p class="my-4 mb-8 ml-4 font-semibold sm:mb-0">Recent Performances</p>
      <apexchart
        class="mt-4"
        type="line"
        height="350"
        :options="chartOptions"
        :series="getSeriesData(matchup[0], matchup[1])"
      ></apexchart>
    </Card>
    <div v-else>
      <p class="sm:w-1/2 mb-96">
        The Sleeper API returns playoff matchup data on Wednesdays (4 AM EST).
        Please try again at a later time if no matchups are loaded.
      </p>
    </div>
  </div>
  <div v-else>
    <p class="mb-96">Loading...</p>
  </div>
</template>
<style scoped></style>
