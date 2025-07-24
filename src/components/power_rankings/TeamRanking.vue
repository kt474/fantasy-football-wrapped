<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { groupBy } from "lodash";
import { TableDataType, LeagueInfoType } from "../../api/types";
import { getStats } from "../../api/api";
import { useStore } from "../../store/store";
import { fakePlayerRankings } from "../../api/playerRanks";
import { fakeUsers } from "../../api/helper";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const data = ref<Record<string, any>>({});
const loading = ref(false);
const tab = ref("QB");

const changeTab = (newTab: string) => {
  tab.value = newTab;
};

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const rosters = props.tableData.map((user) => user.players).flat();
  const allPlayers = await Promise.all(
    rosters.map((player: string) => {
      return getStats(player, currentLeague.season, currentLeague.scoringType);
    })
  );
  const filtered = allPlayers.filter((item) => item !== null);
  const groupedPositions = groupBy(filtered, "position");
  const sorted = Object.fromEntries(
    Object.entries(groupedPositions).map(([position, items]) => [
      position,
      items.sort((a: any, b: any) => a.rank - b.rank).slice(0, 5), // Only keep top 5
    ])
  );
  data.value = sorted;
  store.addPlayerRankings(currentLeague.leagueId, data.value);
  localStorage.setItem(
    "leagueInfo",
    JSON.stringify(store.leagueInfo as LeagueInfoType[])
  );
};

const getTeamName = (playerId: string) => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const roster = currentLeague.rosters.find((roster) =>
      roster.players.includes(playerId)
    );
    const user = currentLeague.users.find((user) => user?.id === roster?.id);
    if (user) {
      if (store.showUsernames) {
        return user.username ? user.username : "";
      }
      return user.name ? user.name : "";
    }
    return "";
  } else {
    return fakeUsers[Math.floor(Math.random() * fakeUsers.length)].name;
  }
};

onMounted(async () => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    !store.leagueInfo[store.currentLeagueIndex].playerRankings
  ) {
    loading.value = true;
    data.value = {};
    await getData();
    loading.value = false;
  } else if (store.leagueInfo[store.currentLeagueIndex]) {
    data.value = store.leagueInfo[store.currentLeagueIndex].playerRankings;
  } else if (store.leagueInfo.length === 0) {
    data.value = fakePlayerRankings;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (!store.leagueInfo[store.currentLeagueIndex].playerRankings) {
      data.value = [];
      loading.value = true;
      await getData();
      loading.value = false;
    }
    data.value = store.leagueInfo[store.currentLeagueIndex].playerRankings;
  }
);
</script>
<template>
  <div
    class="w-full py-4 pl-4 bg-white rounded-lg shadow dark:bg-gray-800 md:py-6 md:pl-6 min-w-80"
  >
    <h1
      class="pb-2 mb-4 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
    >
      Top Performers
    </h1>
    <div v-if="Object.keys(data).length === 0">
      <p class="text-gray-600 dark:text-gray-200">
        Please come back after week 1!
      </p>
    </div>
    <div
      v-else-if="!loading"
      class="flex flex-wrap mt-2 text-gray-800 dark:text-gray-200"
    >
      <ul
        class="flex flex-wrap text-sm font-medium text-center text-gray-600 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200"
      >
        <li class="cursor-pointer me-2">
          <button
            @click="changeTab('QB')"
            aria-current="page"
            class="inline-block p-2 rounded-t-lg sm:p-4"
            :class="{
              ' text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
                tab === 'QB',
            }"
          >
            QB
          </button>
        </li>
        <li class="cursor-pointer me-2">
          <button
            @click="changeTab('RB')"
            class="inline-block p-2 rounded-t-lg sm:p-4"
            :class="{
              'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
                tab === 'RB',
            }"
          >
            RB
          </button>
        </li>
        <li class="cursor-pointer me-2">
          <button
            @click="changeTab('WR')"
            class="inline-block p-2 rounded-t-lg sm:p-4"
            :class="{
              'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
                tab === 'WR',
            }"
          >
            WR
          </button>
        </li>
        <li class="cursor-pointer me-2">
          <button
            @click="changeTab('TE')"
            class="inline-block p-2 rounded-t-lg sm:p-4"
            :class="{
              'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
                tab === 'TE',
            }"
          >
            TE
          </button>
        </li>
        <li class="cursor-pointer me-2">
          <button
            @click="changeTab('K')"
            class="inline-block p-2 rounded-t-lg sm:p-4"
            :class="{
              'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
                tab === 'K',
            }"
          >
            K
          </button>
        </li>
        <li class="cursor-pointer me-2">
          <button
            @click="changeTab('DEF')"
            class="inline-block p-2 rounded-t-lg sm:p-4"
            :class="{
              'text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-500 shadow border-x border-t dark:border-gray-700':
                tab === 'DEF',
            }"
          >
            DEF
          </button>
        </li>
      </ul>
      <div
        v-for="(players, position) in data"
        class="w-full mr-4 overflow-x-hidden"
      >
        <div
          v-if="position === tab"
          v-for="(player, index) in players"
          class="my-4 bg-white border border-gray-200 rounded-lg shadow dark:border-gray-700 h-36 dark:bg-gray-800"
        >
          <div class="flex p-1 mt-1">
            <img
              v-if="player.position !== 'DEF'"
              alt="Player image"
              class="object-cover w-16 h-16 mx-2 sm:h-auto"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`"
            />
            <img
              v-else
              alt="Defense image"
              class="object-cover w-16 h-16 mx-2 sm:h-auto"
              :src="`https://sleepercdn.com/images/team_logos/nfl/${player.id.toLowerCase()}.png`"
            />
            <div class="w-full mt-0.5 ml-3">
              <div class="flex justify-between px-2 mt-1 mb-4">
                <p
                  class="text-base font-semibold truncate sm:text-lg max-w-24 sm:max-w-52"
                >
                  {{ index + 1 }}.
                  {{
                    player.position !== "DEF" && player.firstName
                      ? `${player.firstName[0]}.`
                      : ""
                  }}
                  {{ player.lastName }}
                </p>
                <div class="px-3 py-1 bg-gray-100 rounded-lg dark:bg-gray-900">
                  <p class="text-sm truncate sm:text-base max-w-16 sm:max-w-52">
                    {{ getTeamName(player.id) }}
                  </p>
                </div>
              </div>
              <div class="flex">
                <div
                  class="w-full px-3 py-1 m-1 bg-gray-100 rounded-lg dark:bg-gray-900"
                >
                  <p class="text-gray-600 dark:text-gray-500">Points:</p>
                  <p class="text-base font-semibold sm:text-lg">
                    {{ player.points ? player.points.toFixed(1) : 0 }}
                  </p>
                </div>
                <div
                  class="w-full px-3 py-1 m-1 bg-gray-100 rounded-lg dark:bg-gray-900"
                >
                  <p class="text-gray-600 dark:text-gray-500">PPG:</p>
                  <p class="text-base font-semibold sm:text-lg">
                    {{ player.ppg ? player.ppg.toFixed(1) : 0 }}
                  </p>
                </div>
                <div
                  class="hidden w-full px-3 py-1 m-1 bg-gray-100 rounded-lg dark:bg-gray-900 sm:inline-block"
                >
                  <p class="text-gray-600 dark:text-gray-500">Overall Rank:</p>
                  <p class="text-base font-semibold sm:text-lg">
                    {{ player.overallRank }}
                  </p>
                </div>
                <div
                  class="hidden w-full px-3 py-1 m-1 bg-gray-100 rounded-lg dark:bg-gray-900 sm:inline-block"
                >
                  <p class="text-gray-600 dark:text-gray-500">Games Played:</p>
                  <p class="text-base font-semibold sm:text-lg">
                    {{ player.gp }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Loading div -->
    <div v-else role="status" class="max-w-sm animate-pulse">
      <p class="mb-2 text-gray-900 dark:text-gray-200">
        Loading player data...
      </p>
      <div
        class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px] mb-2.5"
      ></div>
      <div class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[330px] mb-2.5"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[300px] mb-2.5"
      ></div>
      <div
        class="h-2 bg-gray-200 rounded-full dark:bg-gray-700 max-w-[360px]"
      ></div>
      <span class="sr-only">Loading...</span>
    </div>
  </div>
</template>
