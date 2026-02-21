<script setup lang="ts">
import { ref, onMounted, watch, computed, ComputedRef } from "vue";
import { LeagueInfoType, WaiverMove } from "../../types/types.ts";
import { getPlayersByIdsMap } from "../../api/api.ts";
import { getTradeValue } from "@/api/sleeperApi.ts";
import { useStore } from "../../store/store";
import { fakeRosters, fakeUsers, fakeWaiverMoves } from "../../api/helper";
import Card from "../ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";
import Separator from "../ui/separator/Separator.vue";
import Label from "../ui/label/Label.vue";

type WaiverData = Record<string | number, WaiverMove[]>;

const store = useStore();
const rawData = ref<WaiverMove[]>([]);

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const temp = currentLeague.waivers
    .filter((waiver: any) => waiver.adds)
    .map((waiver: any) => ({
      roster_id: waiver.roster_ids[0],
      adds: Object.keys(waiver.adds)[0],
      week: waiver.leg,
      bid: waiver.settings?.waiver_bid,
      status: waiver.status,
    }));

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
          trade.week + 1,
          currentLeague.scoringType,
          addsPlayer.position
        ),
        position: addsPlayer.position,
        player_id: addsPlayer.player_id,
        bid: trade.bid ? trade.bid : null,
        status: trade.status,
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
        move.user?.username === currentManager.value ||
        move.user?.name === currentManager.value
    );
});

const totalSpent = computed(() => {
  return currentManagerMoves.value
    .filter((m) => m.status === "complete")
    .reduce((sum, m) => sum + (m.bid || 0), 0);
});

const waiverData: ComputedRef<WaiverData> = computed(() => {
  const sortedData = rawData.value.reduce((acc: any, move) => {
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
  if (
    rawData.value.filter(
      (player) =>
        !["K", "DEF"].includes(player.position) &&
        player.value != null &&
        player.status === "complete"
    ).length > 5
  ) {
    return rawData.value
      .filter(
        (player) =>
          !["K", "DEF"].includes(player.position) &&
          player.value != null &&
          player.status === "complete"
      )
      .sort((a: any, b: any) => a.value - b.value)
      .slice(0, 10);
  }
  return rawData.value
    .filter((player) => player.value != null)
    .sort((a: any, b: any) => a.value - b.value)
    .slice(0, 10);
});

const managers = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const currentRosterIds = currentLeague.rosters.map((roster) => roster.id);
    const result = currentLeague.users
      .filter((user) => currentRosterIds.includes(user.id))
      .map((user) => (store.showUsernames ? user.username : user.name));
    result.unshift("All Managers");
    return result;
  } else if (store.leagueInfo.length == 0) {
    return fakeUsers.map((user) => user.name);
  }
  return [];
});

const currentManager = ref(managers.value[1]);

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

const getAllManagersSpend = (groupedMoves: WaiverMove[]) => {
  return groupedMoves
    .filter((m) => m.status === "complete")
    .reduce((sum, m) => sum + (m.bid || 0), 0);
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
    rawData.value =
      store.leagueInfo[store.currentLeagueIndex].waiverMoves ?? [];
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].waiverMoves) {
      rawData.value = [];
      await getData();
    }
    rawData.value =
      store.leagueInfo[store.currentLeagueIndex].waiverMoves ?? [];
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
  <div
    class="flex flex-wrap mb-0 xl:flex-nowrap"
    :class="{ 'mt-4 xl:mb-4': store.currentTab === 'Roster Management' }"
  >
    <Card
      v-if="store.currentTab === 'Roster Management'"
      class="w-full py-4 pl-4 overflow-auto xl:w-2/3 md:py-6 md:pl-6"
    >
      <h1 class="pb-2 text-3xl font-bold leading-none">
        Waivers & Free Agent Adds
      </h1>
      <p
        class="mt-1 mb-3 text-sm text-muted-foreground max-w-80 sm:max-w-2xl sm:text-base"
      >
        Values below each player are the average positional ranking for every
        week after the player was added. If applicable, the winning bid (FAAB)
        is also listed next to each player.
      </p>
      <Label class="block mb-1 text-sm">Manager</Label>
      <Select v-model="currentManager">
        <SelectTrigger class="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="manager in managers"
            :key="manager"
            :value="manager"
          >
            {{ manager }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div v-if="currentManagerMoves.length > 0" class="flex">
        <div class="block w-full my-2 overflow-auto custom-width">
          <Separator class="my-2" />
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            <template
              v-for="move in currentManagerMoves"
              :key="move.adds + move.week + move.user.username"
            >
              <div v-if="move.adds && move.status === 'complete'">
                <p class="text-sm font-medium">
                  {{ move.adds }} <span v-if="move.bid">(${{ move.bid }})</span>
                </p>
                <div class="flex mt-1">
                  <span
                    :class="[move.value ? getValueColor(move.value) : '']"
                    class="text-xs me-2 px-2.5 py-1 rounded-full"
                    >{{ move.value ? move.value : "N/A" }}</span
                  >
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ move.value ? getRatingLabel(move.value) : "" }}
                  </p>
                </div>
              </div>
            </template>
          </div>
          <Card
            v-if="store.leagueInfo[store.currentLeagueIndex]?.waiverType === 2"
            class="flex p-3 mt-4 mr-4 text-sm bg-secondary"
          >
            <div class="mr-4">
              <p class="min-w-32">Budget spent:</p>
              <p class="mt-1 text-2xl font-semibold">${{ totalSpent }}</p>
            </div>
            <div class="">
              <p class="min-w-20">Failed bids:</p>
              <div class="flex flex-wrap gap-x-2 gap-y-0">
                <template v-for="move in currentManagerMoves">
                  <div
                    v-if="move.status === 'failed' && move.bid"
                    class="sm:py-1.5 pr-1.5 mt-1.5"
                  >
                    <p class="font-medium">{{ move.adds }} (${{ move.bid }})</p>
                  </div>
                </template>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div v-else-if="currentManager === 'All Managers'">
        <div v-for="(moves, id) in waiverData">
          <Separator class="mt-3 mb-2" />
          <p class="my-2 text-lg font-semibold">
            {{
              store.showUsernames
                ? getRosterName(Number(id)).username
                : getRosterName(Number(id)).name
            }}
          </p>
          <div
            class="grid grid-cols-2 gap-2 mb-8 sm:grid-cols-3 md:grid-cols-4"
          >
            <template v-for="move in moves" class="">
              <div v-if="move.adds && move.status === 'complete'">
                <p class="text-sm font-medium">
                  {{ move.adds }} <span v-if="move.bid">(${{ move.bid }})</span>
                </p>
                <div class="flex mt-1">
                  <span
                    :class="[move.value ? getValueColor(move.value) : '']"
                    class="text-xs me-2 px-2.5 py-1 rounded-full"
                    >{{ move.value ? move.value : "N/A" }}</span
                  >
                  <p class="mt-1 text-xs">
                    {{ move.value ? getRatingLabel(move.value) : "" }}
                  </p>
                </div>
              </div>
            </template>
          </div>
          <Card
            v-if="store.leagueInfo[store.currentLeagueIndex]?.waiverType === 2"
            class="flex p-3 mt-4 mr-4 text-sm border-2 bg-secondary"
          >
            <div class="mr-4">
              <p class="min-w-32">Budget spent:</p>
              <p class="mt-1 text-2xl font-semibold">
                ${{ getAllManagersSpend(moves) }}
              </p>
            </div>
            <div>
              <p class="min-w-20">Failed bids:</p>
              <div class="flex flex-wrap gap-x-2 gap-y-0">
                <template v-for="move in moves">
                  <div
                    v-if="move.status === 'failed' && move.bid"
                    class="py-1.5 pr-1.5 mt-1.5"
                  >
                    <p class="font-medium">{{ move.adds }} (${{ move.bid }})</p>
                  </div>
                </template>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div
        v-else-if="
          store.leagueInfo.length > 0 &&
          store.leagueInfo[store.currentLeagueIndex] &&
          currentManagerMoves.length == 0
        "
      >
        <p class="mt-4 text-muted-foreground">
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
    </Card>
    <Card
      class="w-full py-4 pl-4 mb-4 overflow-auto xl:mb-0 md:py-6 md:pl-6"
      :class="{
        'xl:w-1/3 xl:ml-4 xl:mt-0 mt-4':
          store.currentTab === 'Roster Management',
      }"
    >
      <p class="mb-4 text-3xl font-bold leading-none">Best Adds</p>
      <div
        v-if="orderedData.length > 0"
        v-for="(move, index) in orderedData"
        class="pr-6 mb-4"
      >
        <div class="flex justify-between">
          <div class="flex mb-1">
            <p class="mt-2 mr-2 text-base font-semibold">{{ index + 1 }}.</p>
            <div class="mt-1 mr-2">
              <img
                alt="User avatar"
                v-if="move.position !== 'DEF'"
                class="object-cover rounded-full w-14"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${move.player_id}.jpg`"
              />
              <img
                alt="User avatar"
                v-else-if="move.position === 'DEF'"
                class="h-10 rounded-full w-14"
                :src="`https://sleepercdn.com/images/team_logos/nfl/${move.player_id.toLowerCase()}.png`"
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
            <div class="">
              <p class="text-base font-medium">
                {{ move.position }} {{ move.adds }}
              </p>
              <div
                class="flex flex-col text-sm text-muted-foreground sm:flex-row"
              >
                <p class="truncate max-w-36">
                  {{
                    store.showUsernames ? move.user?.username : move.user?.name
                  }}
                </p>
                <p class="sm:ml-1">
                  <span class="hidden sm:inline">&#183;</span> Week
                  {{ move.week }}
                </p>
              </div>
            </div>
          </div>
          <div class="">
            <span
              :class="[move.value ? getValueColor(move.value) : '']"
              class="text-xs px-2.5 py-1 mb-1 rounded-full float-end"
              >{{ move.value ? move.value : "N/A" }}</span
            >
            <p class="mt-1 text-xs text-muted-foreground">
              {{ move.value ? getRatingLabel(move.value) : "" }}
            </p>
          </div>
        </div>
        <Separator class="mt-3" />
      </div>
      <div
        v-else-if="
          store.leagueInfo.length > 0 &&
          store.leagueInfo[store.currentLeagueIndex] &&
          store.leagueInfo[store.currentLeagueIndex].waivers.length === 0
        "
      >
        <p class="text-muted-foreground">No waiver moves have been made.</p>
      </div>
      <div
        v-else-if="
          store.leagueInfo.length > 0 &&
          store.leagueInfo[store.currentLeagueIndex] &&
          !store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
        "
      >
        <p>Please come back after week 1!</p>
      </div>
      <div
        v-else
        role="status"
        class="ml-2 space-y-4 border-gray-200 divide-y divide-gray-200 max-w-80 animate-pulse dark:divide-gray-700"
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
    </Card>
  </div>
</template>
<style scoped>
.custom-width {
  @media (max-width: 475px) {
    width: 327px;
  }
}
</style>
