<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { LeagueInfoType } from "../../api/types.ts";
import { getPlayerNames } from "../../api/api.ts";
import { fakeRosters, fakeTrades, fakeUsers } from "../../api/helper";
import { useStore } from "../../store/store";

const store = useStore();
const tradeData: any = ref([]);

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
    };
  });

  // Use Promise.all to resolve all async operations
  tradeData.value = await Promise.all(
    temp.map(async (trade: any) => {
      return {
        team1: {
          user: getRosterName(trade.roster_ids[1]),
          players: trade.adds[trade.roster_ids[1]]
            ? await getPlayerNames(trade.adds[trade.roster_ids[1]])
            : [],
          draftPicks: trade.draft_picks.map((pick: any) => {
            if (pick.owner_id == trade.roster_ids[1]) {
              return pick;
            }
          }),
          waiverBudget: trade.waiver_budget.map((budget: any) => {
            if (budget.receiver == trade.roster_ids[1]) {
              return budget;
            }
          }),
        },
        team2: {
          user: getRosterName(trade.roster_ids[0]),
          players: trade.adds[trade.roster_ids[0]]
            ? await getPlayerNames(trade.adds[trade.roster_ids[0]])
            : [],
          draftPicks: trade.draft_picks.map((pick: any) => {
            if (pick.owner_id == trade.roster_ids[0]) {
              return pick;
            }
          }),
          waiverBudget: trade.waiver_budget.map((budget: any) => {
            if (budget.receiver == trade.roster_ids[0]) {
              return budget;
            }
          }),
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

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    !store.leagueInfo[store.currentLeagueIndex].tradeNames
  ) {
    await getData();
  } else if (store.leagueInfo.length == 0) {
    tradeData.value = fakeTrades;
  } else {
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
    class="w-full p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6 min-w-80"
  >
    <h1
      class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-white"
    >
      League Trades
    </h1>
    <div v-if="tradeData.length > 0" class="flex flex-wrap w-full">
      <div
        v-for="trade in tradeData"
        class="block h-48 p-4 my-2 mr-4 overflow-y-hidden text-gray-900 bg-white border border-gray-200 rounded-lg shadow w-80 dark:shadow-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 sm:w-96"
      >
        <div class="flex justify-between">
          <div class="flex w-40">
            <img
              alt="User avatar"
              v-if="trade.team1.user.avatarImg"
              class="w-8 h-8 rounded-full"
              :src="trade.team1.user.avatarImg"
            />
            <svg
              v-else
              class="w-8 h-8 text-gray-900 dark:text-gray-300"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
              />
            </svg>
            <h2 class="mt-0.5 ml-2 text-base font-semibold">
              {{ trade.team1.user.name }}
            </h2>
          </div>
          <div class="flex w-40">
            <img
              alt="User avatar"
              v-if="trade.team2.user.avatarImg !== null"
              class="w-8 h-8 rounded-full"
              :src="trade.team2.user.avatarImg"
            />
            <svg
              v-else
              class="w-8 h-8 text-gray-900 dark:text-gray-300"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
              />
            </svg>
            <h2 class="mt-0.5 ml-2 text-base font-semibold">
              {{ trade.team2.user.name }}
            </h2>
          </div>
        </div>
        <hr class="h-px mt-3 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
        <div class="flex justify-evenly">
          <div
            class="ml-2 w-44"
            :class="
              trade.team2.players.length +
                trade.team2.draftPicks.length +
                trade.team2.waiverBudget.length >
              4
                ? 'text-sm'
                : 'text-base'
            "
          >
            <p v-for="player in trade.team2.players" class="truncate max-w-36">
              {{ player }}
            </p>
            <p v-for="pick in trade.team2.draftPicks">
              {{ pick ? pick.season : "" }}
              {{ pick ? `${getOrdinalSuffix(pick.round)} round` : "" }}
            </p>
            <p v-for="budget in trade.team2.waiverBudget">
              {{ budget ? `$${budget.amount} FAAB` : "" }}
            </p>
          </div>
          <svg
            class="w-6 h-6 text-gray-900 dark:text-gray-300"
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
          <div
            class="ml-6 w-44"
            :class="
              trade.team1.players.length +
                trade.team1.draftPicks.length +
                trade.team1.waiverBudget.length >
              4
                ? 'text-sm'
                : 'text-base'
            "
          >
            <p v-for="player in trade.team1.players" class="truncate max-w-36">
              {{ player }}
            </p>
            <p v-for="pick in trade.team1.draftPicks">
              {{ pick ? pick.season : "" }}
              {{ pick ? `${getOrdinalSuffix(pick.round)} round` : "" }}
            </p>
            <p v-for="budget in trade.team1.waiverBudget">
              {{ budget ? `$${budget.amount} FAAB` : "" }}
            </p>
          </div>
        </div>
      </div>
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
            <div
              class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"
            ></div>
            <p v-if="x === 1" class="text-gray-700 dark:text-gray-300">
              Loading Trades...
            </p>
            <div
              v-else
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
