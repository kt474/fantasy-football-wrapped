<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { LeagueInfoType } from "../../api/types.ts";
import { getPlayersByIdsMap, getTradeValue } from "../../api/api.ts";
import {
  fakeRosters,
  fakeTrades,
  fakeUsers,
  roundToOneDecimal,
} from "../../api/helper";
import { useStore } from "../../store/store";

const store = useStore();
const tradeData: any = ref([]);
const showAllTrades = ref(false);

interface Trade {
  roster_ids: number[];
  adds: Record<number, any[]>;
  draft_picks: any[];
  waiver_budget: any[];
  week: number;
}

const toggleTrades = () => {
  showAllTrades.value = !showAllTrades.value;
};

const slicedTradeData = computed(() => {
  if (showAllTrades.value) {
    return tradeData.value;
  }
  return tradeData.value.slice(0, 6);
});

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const temp = currentLeague.trades.map((trade: any) => {
    let grouped = [];
    if (trade.adds) {
      grouped = Object.entries(trade.adds).reduce(
        (acc: any, [key, value]: any) => {
          if (!acc[value]) {
            acc[value] = [];
          }
          acc[value].push(key);
          return acc;
        },
        {}
      );
    }
    return {
      roster_ids: trade.roster_ids,
      adds: grouped,
      draft_picks: trade.draft_picks ? trade.draft_picks : [],
      waiver_budget: trade.waiver_budget ? trade.waiver_budget : [],
      week: trade.leg,
    };
  });

  // 1. Collect all unique player IDs
  const allUniquePlayerIds = new Set<string>();
  temp.forEach((trade: Trade) => {
    trade.roster_ids.forEach((rosterId) => {
      const adds = trade.adds[rosterId];
      if (adds) {
        adds.forEach((playerId) => allUniquePlayerIds.add(playerId));
      }
    });
  });

  const uniquePlayerIdArray = Array.from(allUniquePlayerIds);

  // 2. Fetch all player names at once
  let playerLookupMap = new Map<string, any>();
  if (uniquePlayerIdArray.length > 0) {
    playerLookupMap = await getPlayersByIdsMap(uniquePlayerIdArray);
  }
  // Use Promise.all to resolve all async operations
  tradeData.value = await Promise.all(
    temp.map(async (trade: Trade) => {
      // Fetch both teams' player names in parallel
      const team1Players = trade.adds[trade.roster_ids[1]]
        ? trade.adds[trade.roster_ids[1]].map((id: string) => {
            let playerObj = playerLookupMap.get(id);
            return playerObj.name
              ? playerObj.name
              : `${playerObj.team} Defense`;
          })
        : [];

      const team2Players = trade.adds[trade.roster_ids[0]]
        ? trade.adds[trade.roster_ids[0]].map((id: string) => {
            let playerObj = playerLookupMap.get(id);
            return playerObj.name
              ? playerObj.name
              : `${playerObj.team} Defense`;
          })
        : [];

      return {
        team1: {
          user: getRosterName(trade.roster_ids[1]),
          players: team1Players,
          draftPicks: trade.draft_picks.filter(
            (pick) => pick.owner_id === trade.roster_ids[1]
          ),
          waiverBudget: trade.waiver_budget.filter(
            (budget) => budget.receiver === trade.roster_ids[1]
          ),
          week: trade.week,
          value: trade.adds[trade.roster_ids[1]]
            ? await Promise.all(
                trade.adds[trade.roster_ids[1]].map((player) =>
                  getTradeValue(
                    player,
                    currentLeague.season,
                    trade.week,
                    currentLeague.scoringType
                  )
                )
              )
            : [],
        },
        team2: {
          user: getRosterName(trade.roster_ids[0]),
          players: team2Players,
          draftPicks: trade.draft_picks.filter(
            (pick) => pick.owner_id === trade.roster_ids[0]
          ),
          waiverBudget: trade.waiver_budget.filter(
            (budget) => budget.receiver === trade.roster_ids[0]
          ),
          week: trade.week,
          value: trade.adds[trade.roster_ids[0]]
            ? await Promise.all(
                trade.adds[trade.roster_ids[0]].map((player) =>
                  getTradeValue(
                    player,
                    currentLeague.season,
                    trade.week,
                    currentLeague.scoringType
                  )
                )
              )
            : [],
        },
      };
    })
  );
  store.addTradeNames(currentLeague.leagueId, tradeData.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const getRosterName = (rosterId: number) => {
  const rosters = store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].rosters
    : fakeRosters;
  const users = store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].users
    : fakeUsers;
  const userId = rosters.find((roster) => roster.rosterId === rosterId);
  if (userId) {
    const userObject = users.find((user) => user.id === userId.id);
    return userObject;
  }
};

const getOrdinalSuffix = (number: number) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = number % 100;

  return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

const getValueColor = (value: number) => {
  if (value <= 15) return `bg-emerald-400 dark:bg-emerald-600 text-gray-50`;
  if (value <= 25) return `bg-green-400 dark:bg-green-600 text-gray-50`;
  if (value <= 35) return "bg-yellow-300 dark-bg-yellow-600 text-black";
  if (value <= 45) return `bg-orange-400 dark:bg-orange-500 text-gray-50`;
  return `bg-red-400 dark:bg-red-600 text-gray-50`;
};

const getRatingLabel = (value: number) => {
  if (value <= 15) return "Excellent";
  if (value <= 25) return "Good";
  if (value <= 35) return "Average";
  if (value <= 45) return "Below Avg";
  return "Poor";
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].tradeNames
  ) {
    await getData();
  } else if (store.leagueInfo.length == 0) {
    tradeData.value = fakeTrades;
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    tradeData.value = store.leagueInfo[store.currentLeagueIndex].tradeNames;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].tradeNames) {
      tradeData.value = [];
      await getData();
    }
    tradeData.value = store.leagueInfo[store.currentLeagueIndex].tradeNames;
  }
);
</script>
<template>
  <div
    class="w-full py-4 pl-4 overflow-auto bg-white rounded-lg shadow dark:bg-gray-800 md:py-6 md:pl-6"
  >
    <h1
      class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
    >
      League Trades
    </h1>
    <p
      class="mt-1 mb-3 text-sm text-gray-600 max-w-80 sm:max-w-2xl sm:text-base dark:text-gray-300"
    >
      Values below each player are the average positional ranking for every week
      after the trade date (only weeks played are counted). Lower numbers
      indicate better performance.
    </p>
    <div v-if="tradeData.length > 0">
      <div class="flex flex-wrap w-full">
        <div
          v-for="trade in slicedTradeData"
          class="block p-4 my-2 mr-4 overflow-y-hidden text-gray-900 bg-white border border-gray-200 rounded-lg shadow dark:shadow-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 custom-width"
        >
          <!-- Team name and avatar -->
          <div v-if="trade.team1" class="flex justify-between h-8">
            <div v-if="trade.team1.user" class="flex w-40">
              <img
                alt="User avatar"
                v-if="trade.team1.user.avatarImg"
                class="w-8 h-8 rounded-full"
                :src="trade.team1.user.avatarImg"
              />
              <svg
                v-else
                class="flex-shrink-0 w-8 h-8 text-gray-900 dark:text-gray-200"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <h2
                class="mt-0.5 ml-2 text-sm sm:text-base font-semibold truncate max-w-32 sm:max-w-44"
              >
                {{
                  store.showUsernames
                    ? trade.team1.user.username
                    : trade.team1.user.name
                }}
              </h2>
            </div>
            <svg
              class="w-6 h-6 mx-2 mt-0.5 text-gray-700 sm:mx-4 dark:text-gray-200 min-w-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16h13M4 16l4-4m-4 4 4 4M20 8H7m13 0-4 4m4-4-4-4"
              />
            </svg>
            <div v-if="trade.team2.user" class="flex w-40">
              <img
                alt="User avatar"
                v-if="trade.team2.user.avatarImg"
                class="w-8 h-8 rounded-full"
                :src="trade.team2.user.avatarImg"
              />
              <svg
                v-else
                class="flex-shrink-0 w-8 h-8 text-gray-900 dark:text-gray-200"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <h2
                class="mt-0.5 ml-2 text-sm sm:text-base font-semibold truncate max-w-32 sm:max-w-44"
              >
                {{
                  store.showUsernames
                    ? trade.team2.user.username
                    : trade.team2.user.name
                }}
              </h2>
            </div>
          </div>
          <hr class="h-px mt-3 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
          <div v-if="trade.team2" class="flex justify-between">
            <div
              class="w-44"
              :class="
                trade.team1.players.length +
                  trade.team1.draftPicks.length +
                  trade.team1.waiverBudget.length >
                4
                  ? 'text-sm'
                  : 'text-base'
              "
            >
              <div v-for="index in trade.team1.players.length" class="mt-1.5">
                <p class="text-sm font-medium">
                  {{ trade.team1.players[index - 1] }}
                </p>
                <div class="flex mt-1">
                  <span
                    v-if="trade.team1.value[index - 1]"
                    :class="[getValueColor(trade.team1.value[index - 1])]"
                    class="text-xs me-2 px-2.5 py-1 rounded-full"
                    >{{ roundToOneDecimal(trade.team1.value[index - 1]) }}</span
                  >
                  <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {{
                      trade.team1.value[index - 1]
                        ? getRatingLabel(trade.team1.value[index - 1])
                        : ""
                    }}
                  </p>
                </div>
              </div>
              <p
                v-for="pick in trade.team1.draftPicks"
                class="mt-1.5 text-sm font-medium"
              >
                {{ pick ? pick.season : "" }}
                {{ pick ? `${getOrdinalSuffix(pick.round)} round` : "" }}
              </p>
              <p
                v-for="budget in trade.team1.waiverBudget"
                class="mt-1.5 text-sm font-medium"
              >
                {{ budget ? `$${budget.amount} FAAB` : "" }}
              </p>
            </div>
            <div
              class="ml-12 w-44"
              :class="
                trade.team2.players.length +
                  trade.team2.draftPicks.length +
                  trade.team2.waiverBudget.length >
                4
                  ? 'text-sm'
                  : 'text-base'
              "
            >
              <div v-for="index in trade.team2.players.length" class="mt-1.5">
                <p class="text-sm font-medium">
                  {{ trade.team2.players[index - 1] }}
                </p>
                <div class="flex mt-1">
                  <span
                    v-if="trade.team2.value[index - 1]"
                    :class="[getValueColor(trade.team2.value[index - 1])]"
                    class="text-xs me-2 px-2.5 py-1 rounded-full"
                    >{{ roundToOneDecimal(trade.team2.value[index - 1]) }}</span
                  >
                  <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {{
                      trade.team2.value[index - 1]
                        ? getRatingLabel(trade.team2.value[index - 1])
                        : ""
                    }}
                  </p>
                </div>
              </div>
              <p
                v-for="pick in trade.team2.draftPicks"
                class="mt-1.5 text-sm font-medium"
              >
                {{ pick ? pick.season : "" }}
                {{ pick ? `${getOrdinalSuffix(pick.round)} round` : "" }}
              </p>
              <p
                v-for="budget in trade.team2.waiverBudget"
                class="mt-1.5 text-sm font-medium"
              >
                {{ budget ? `$${budget.amount} FAAB` : "" }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="tradeData.length > 6" class="flex justify-center mt-2">
        <button
          v-if="tradeData.length > 6"
          @click="toggleTrades()"
          aria-label="Button to show all trades"
          class="flex text-gray-900 mt-2 bg-gray-100 border border-gray-300 focus:outline-none hover:bg-gray-200 focus:ring-2 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-700 dark:text-white dark:border-gray-800 dark:hover:bg-gray-600 dark:hover:border-gray-600 dark:focus:ring-gray-600"
        >
          <svg
            v-if="showAllTrades"
            class="w-5 h-5 mr-2 -ml-2 text-gray-900 dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m5 15 7-7 7 7"
            />
          </svg>
          <svg
            v-else
            class="w-5 h-5 mr-2 -ml-2 text-gray-900 dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m19 9-7 7-7-7"
            />
          </svg>

          {{
            showAllTrades
              ? "Show Fewer Trades"
              : `Show All Trades (${tradeData.length})`
          }}
        </button>
      </div>
    </div>
    <div
      v-else-if="
        store.leagueInfo.length > 0 &&
        store.leagueInfo[store.currentLeagueIndex] &&
        store.leagueInfo[store.currentLeagueIndex].trades.length === 0
      "
    >
      <p class="text-gray-600 dark:text-gray-200">No trades have been made.</p>
    </div>
    <div v-else class="flex flex-wrap">
      <div
        v-for="x in 3"
        role="status"
        class="max-w-sm p-4 mt-4 mr-4 border border-gray-200 rounded shadow animate-pulse dark:border-gray-700"
      >
        <div class="flex items-center mb-4">
          <svg
            class="w-10 h-10 text-gray-200 me-3 dark:text-gray-700"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
            />
          </svg>
          <div>
            <p v-if="x === 1" class="mb-1 text-gray-700 dark:text-gray-200">
              Loading trades...
            </p>
            <div
              v-else
              class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"
            ></div>
            <div
              class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"
            ></div>
          </div>
        </div>
        <div
          class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"
        ></div>
        <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
        <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
        <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>

        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.custom-width {
  width: 400px;
  min-width: 327px;
}
</style>
