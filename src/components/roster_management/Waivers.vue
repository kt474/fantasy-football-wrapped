<script setup lang="ts">
import { ref, onMounted, watch, computed, ComputedRef } from "vue";
import { LeagueInfoType, WaiverMove } from "../../api/types.ts";
import { getPlayersByIdsMap, getTradeValue } from "../../api/api.ts";
import { useStore } from "../../store/store";
import { fakeRosters, fakeUsers, fakeWaiverMoves } from "../../api/helper";

type WaiverData = Record<string | number, WaiverMove[]>;

const store = useStore();
const rawData = ref<WaiverMove[]>([]);

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
  rawData.value = await Promise.all(
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
        position: addsPlayer.position,
      };
    })
  );

  store.addWaiverMoves(currentLeague.leagueId, rawData.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const currentManagerMoves = computed(() => {
  return Object.values(waiverData.value)
    .flat()
    .filter(
      (move) =>
        move.user.username === currentManager.value ||
        move.user.name === currentManager.value
    );
});

const waiverData: ComputedRef<WaiverData> = computed(() => {
  const sortedData = rawData.value.reduce((acc: any, move: any) => {
    const id = move.id;
    if (!acc[id]) {
      acc[id] = [];
    }

    acc[id].push(move);

    return acc;
  }, {});

  Object.keys(sortedData).forEach((id) => {
    sortedData[id].sort((a: any, b: any) => {
      return a.week - b.week;
    });
  });
  return sortedData;
});

const orderedData = computed(() => {
  return rawData.value
    .filter(
      (player: any) =>
        !["K", "DEF"].includes(player.position) && player.value != null
    )
    .sort((a: any, b: any) => a.value - b.value)
    .slice(0, 10);
});

const managers = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const currentRosterIds = currentLeague.rosters.map((roster) => roster.id);
    return currentLeague.users
      .filter((user) => currentRosterIds.includes(user.id))
      .map((user) => (store.showUsernames ? user.username : user.name));
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
    rawData.value = fakeWaiverMoves;
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    rawData.value = store.leagueInfo[store.currentLeagueIndex].waiverMoves;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].waiverMoves) {
      rawData.value = [];
      await getData();
    }
    rawData.value = store.leagueInfo[store.currentLeagueIndex].waiverMoves;
    currentManager.value = managers.value[0];
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
  <div class="flex flex-wrap mt-4 xl:flex-nowrap">
    <div
      class="w-full py-4 pl-4 overflow-auto bg-white rounded-lg shadow xl:w-2/3 dark:bg-gray-800 md:py-6 md:pl-6"
    >
      <h1
        class="pb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
      >
        Waivers & Free Agent Adds
      </h1>
      <p
        class="mt-1 mb-3 text-sm text-gray-600 max-w-80 sm:max-w-2xl sm:text-base dark:text-gray-300"
      >
        Values below each player are the average positional ranking for every
        week after the player was added. The week of the transaction is also
        listed next to each player.
      </p>
      <label
        for="Manager name"
        class="block mb-1 text-sm text-gray-600 dark:text-gray-300"
        >Manager</label
      >
      <select
        aria-label="current week"
        id="Manager name"
        class="block p-2 text-sm text-gray-600 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500"
        v-model="currentManager"
      >
        <option v-for="manager in managers" :key="manager" :value="manager">
          {{ manager }}
        </option>
      </select>
      <div v-if="currentManagerMoves.length > 0" class="flex">
        <div
          class="block w-full my-2 overflow-auto text-gray-900 bg-white custom-width dark:bg-gray-800 dark:text-gray-200"
        >
          <hr
            class="w-11/12 h-px mt-2 mb-3 bg-gray-200 border-0 dark:bg-gray-700"
          />
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            <div
              v-for="move in currentManagerMoves"
              :key="move.adds + move.week"
            >
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
      <div
        v-else-if="
          store.leagueInfo.length > 0 &&
          store.leagueInfo[store.currentLeagueIndex] &&
          store.leagueInfo[store.currentLeagueIndex].waivers.length === 0
        "
      >
        <p class="mt-4 text-gray-600 dark:text-gray-200">
          No waiver moves have been made.
        </p>
      </div>
      <div v-else-if="store.leagueInfo.length !== 0" class="flex flex-wrap">
        <div role="status" class="max-w-md mt-4 animate-pulse">
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
          <div
            class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"
          ></div>
          <div
            class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"
          ></div>
          <div
            class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"
          ></div>
          <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>

          <span class="sr-only">Loading...</span>
        </div>
      </div>
    </div>
    <div
      class="w-full py-4 pl-4 mt-4 overflow-auto bg-white rounded-lg shadow xl:ml-4 xl:mt-0 xl:w-1/3 dark:bg-gray-800 md:py-6 md:pl-6"
    >
      <p
        class="mb-4 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
      >
        Best Adds
      </p>
      <div
        v-if="orderedData.length > 0"
        v-for="(move, index) in orderedData"
        class="w-11/12 mb-4 dark:text-gray-200"
      >
        <div class="flex justify-between">
          <div class="flex mb-1">
            <p class="mt-2 mr-2 text-base font-semibold">{{ index + 1 }}.</p>
            <div class="mt-1 mr-2">
              <img
                alt="User avatar"
                v-if="move.user.avatarImg"
                class="w-8 h-8 rounded-full"
                :src="move.user.avatarImg"
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
            </div>
            <div class="">
              <p class="text-base font-medium">
                {{ move.position }} {{ move.adds }}
              </p>
              <div class="flex text-sm text-gray-600 dark:text-gray-400">
                <p class="truncate max-w-36">
                  {{
                    store.showUsernames ? move.user.username : move.user.name
                  }}
                </p>
                <p class="">&#183; Week {{ move.week }}</p>
              </div>
            </div>
          </div>
          <div class="">
            <span
              :class="[
                move.value
                  ? getValueColor(move.value)
                  : 'bg-gray-300 dark:text-black',
              ]"
              class="text-xs px-2.5 py-1 mb-1 rounded-full float-end"
              >{{ move.value ? move.value : "N/A" }}</span
            >
            <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {{ move.value ? getRatingLabel(move.value) : "" }}
            </p>
          </div>
        </div>
        <hr class="h-px mt-2 mb-2 bg-gray-200 border-0 dark:bg-gray-700" />
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
      <div
        v-else
        role="status"
        class="max-w-md p-4 space-y-4 border-gray-200 divide-y divide-gray-200 animate-pulse dark:divide-gray-700 md:p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
            ></div>
            <div
              class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"
            ></div>
          </div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
        </div>
        <div class="flex items-center justify-between pt-4">
          <div>
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
            ></div>
            <div
              class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"
            ></div>
          </div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
        </div>
        <div class="flex items-center justify-between pt-4">
          <div>
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
            ></div>
            <div
              class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"
            ></div>
          </div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
        </div>
        <div class="flex items-center justify-between pt-4">
          <div>
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
            ></div>
            <div
              class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"
            ></div>
          </div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
        </div>
        <div class="flex items-center justify-between pt-4">
          <div>
            <div
              class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24 mb-2.5"
            ></div>
            <div
              class="w-32 h-2 bg-gray-200 rounded-full dark:bg-gray-700"
            ></div>
          </div>
          <div
            class="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-12"
          ></div>
        </div>
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
