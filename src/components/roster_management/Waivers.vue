<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { LeagueInfoType, WaiverMove } from "../../api/types.ts";
import { getPlayersByIdsMap, getTradeValue } from "../../api/api.ts";
import { useStore } from "../../store/store";
import { fakeRosters, fakeUsers, fakeWaiverMoves } from "../../api/helper";

const store = useStore();
type WaiverData = Record<string, WaiverMove[]>;

const waiverData = ref<WaiverData>({});

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const temp = currentLeague.waivers.map((waiver: any) => {
    if (waiver.adds) {
      return {
        roster_id: waiver.roster_ids[0],
        adds: Object.keys(waiver.adds)[0],
        week: waiver.leg,
      };
    }
  });

  // Step 1: Collect all unique player IDs from all trades
  const allUniquePlayerIds = new Set<string>();
  temp.forEach((trade: any) => {
    if (trade.adds) allUniquePlayerIds.add(trade.adds);
  });

  const uniquePlayerIdArray = Array.from(allUniquePlayerIds);

  // Step 2: Make ONE API call to fetch all unique players required across all trades
  let playerLookupMap = new Map<string, any>();
  if (uniquePlayerIdArray.length > 0) {
    playerLookupMap = await getPlayersByIdsMap(uniquePlayerIdArray);
  }

  // Step 3: Map `temp` data, using the pre-fetched `playerLookupMap`
  let mappedNames = await Promise.all(
    temp.map(async (trade: any) => {
      const addsPlayer = playerLookupMap.get(trade.adds);
      return {
        id: trade.roster_id,
        user: getRosterName(trade.roster_id),
        adds: addsPlayer.name ? addsPlayer.name : `${addsPlayer.team} Defense`,
        week: trade.week,
        value: await getTradeValue(
          trade.adds,
          currentLeague.season,
          trade.week,
          currentLeague.scoringType,
          addsPlayer.position
        ),
      };
    })
  );

  waiverData.value = mappedNames.reduce((acc: any, trade) => {
    const id = trade.id;
    if (!acc[id]) {
      acc[id] = [];
    }

    acc[id].push(trade);

    return acc;
  }, {});

  Object.keys(waiverData.value).forEach((id) => {
    waiverData.value[id].sort((a, b) => {
      return a.week - b.week;
    });
  });

  store.addWaiverMoves(currentLeague.leagueId, waiverData.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const managers = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    if (store.showUsernames) {
      return currentLeague.users.map((user) => user.username);
    }
    return currentLeague.users.map((user) => user.name);
  } else if (store.leagueInfo.length == 0) {
    return fakeUsers.map((user) => user.name);
  }
  return [];
});

const currentManager = ref(managers.value[0]);

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
    !store.leagueInfo[store.currentLeagueIndex].waiverMoves
  ) {
    await getData();
  } else if (store.leagueInfo.length == 0) {
    waiverData.value = fakeWaiverMoves;
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    waiverData.value = store.leagueInfo[store.currentLeagueIndex].waiverMoves;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].waiverMoves) {
      waiverData.value = {};
      await getData();
    }
    waiverData.value = store.leagueInfo[store.currentLeagueIndex].waiverMoves;
  }
);
watch(
  () => store.showUsernames,
  () => {
    currentManager.value = managers.value[0];
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
      Waivers & Free Agent Adds
    </h1>
    <p
      class="mt-1 mb-3 text-sm text-gray-600 max-w-80 sm:max-w-2xl sm:text-base dark:text-gray-300"
    >
      Values below each player are the average positional ranking for every week
      after the player was added. The week of the transaction is also listed
      next to each player.
    </p>
    <label
      for="Manager name"
      class="block mb-1 text-sm text-gray-600 dark:text-gray-300"
      >Manager</label
    >
    <select
      aria-label="current week"
      id="Manager name"
      class="block p-2 mb-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500"
      v-model="currentManager"
    >
      <option v-for="manager in managers" :key="manager" :value="manager">
        {{ manager }}
      </option>
    </select>
    <div v-if="Object.keys(waiverData).length > 0" class="flex flex-wrap">
      <div v-for="(moves, index) in Object.values(waiverData)">
        <div
          v-if="
            moves[index].user.username === currentManager ||
            moves[index].user.name === currentManager
          "
          class="block w-full p-4 my-2 mr-4 overflow-auto text-gray-900 bg-white border border-gray-200 rounded-lg shadow custom-width dark:shadow-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <div class="flex mb-4">
            <img
              alt="User avatar"
              v-if="moves[index].user.avatarImg"
              class="w-8 h-8 rounded-full"
              :src="moves[index].user.avatarImg"
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
            <p class="mt-0.5 ml-2 text-base font-semibold">
              {{
                store.showUsernames
                  ? moves[index].user.username
                  : moves[index].user.name
              }}
            </p>
          </div>
          <hr class="h-px mt-2 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            <div v-for="move in moves">
              <div v-if="move.adds">
                <p class="text-sm font-medium">
                  {{ move.adds }} ({{ move.week }})
                </p>
                <div class="flex mt-1">
                  <span
                    :class="[
                      move.value
                        ? getValueColor(move.value)
                        : 'bg-gray-300 dark:text-black',
                    ]"
                    class="text-xs me-2 px-2.5 py-1 rounded-full"
                    >{{ move.value ? move.value : "N/A" }}</span
                  >
                  <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {{ move.value ? getRatingLabel(move.value) : "" }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else-if="
        store.leagueInfo.length > 0 &&
        store.leagueInfo[store.currentLeagueIndex] &&
        store.leagueInfo[store.currentLeagueIndex].waivers.length === 0
      "
    >
      <p class="text-gray-600 dark:text-gray-200">
        No waiver moves have been made.
      </p>
    </div>
    <div v-else class="flex flex-wrap">
      <div
        role="status"
        class="max-w-md p-4 mt-4 mr-4 border border-gray-200 rounded shadow animate-pulse dark:border-gray-700"
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
            <p class="mb-1 text-gray-700 dark:text-gray-200">
              Loading waiver moves...
            </p>
            <div
              class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-2"
            ></div>
          </div>
        </div>
        <div
          class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-72 mb-4"
        ></div>
        <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
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
  @media (max-width: 475px) {
    width: 327px;
  }
}
</style>
