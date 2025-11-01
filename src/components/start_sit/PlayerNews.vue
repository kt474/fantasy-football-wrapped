<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useStore } from "../../store/store";
import {
  getPlayerNews,
  getStats,
  getPlayersByIdsMap,
  getSingleWeekProjection,
  getSingleWeekStats,
} from "../../api/api";
import { TableDataType } from "../../api/types";
import { difference } from "lodash";
import { fakePosts, fakeStartSit, fakeUsers } from "../../api/helper";

const data: any = ref([]);
const playerNames: any = ref([]);
const loading: any = ref(false);
const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const managers = computed(() => {
  if (store.leagueInfo.length > 0) {
    return props.tableData.map((user) => {
      return {
        name: store.showUsernames ? user.username : user.name,
        rosterId: user.rosterId,
      };
    });
  } else {
    return fakeUsers.map((user) => ({
      name: user.name,
      rosterId: Number(user.id),
    }));
  }
});

const starterSize = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    return currentLeague.rosterPositions.filter((str) => str !== "BN").length;
  }
  return 9;
});

const currentManager = ref(managers.value[0]);

const currentRoster = computed(() => {
  if (playerNames.value) {
    return playerNames.value.find(
      (team: any) => team.id === currentManager.value.rosterId
    );
  }
  return [];
});

const getData = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague) {
    const currentRosterId = currentManager.value.rosterId;
    if (!currentLeague.rosterRankings) {
      await getRosterRankings();
    }
    const currentPlayers = currentLeague.rosterRankings[currentRosterId].map(
      (player: any) => `${player.firstName} ${player.lastName}`
    );
    const playerNews = await getPlayerNews(currentPlayers);
    data.value = playerNews.map((post: any) => post.post);
  } else if (store.leagueInfo.length === 0) {
    data.value = fakePosts;
  }
};

// this is only really used to get player names
const getRosterRankings = async () => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  const rosterPlayers = props.tableData.flatMap((user) =>
    user.players.map((player) => ({
      rosterId: user.rosterId,
      player,
    }))
  );

  const allPlayers = await Promise.all(
    rosterPlayers.map(({ player }) =>
      getStats(player, currentLeague.season, currentLeague.scoringType)
    )
  );

  const allPlayersWithRoster = allPlayers.map((stats, idx) => ({
    ...stats,
    rosterId: rosterPlayers[idx].rosterId,
  }));

  const filtered = allPlayersWithRoster.filter((item) => item !== null);

  function groupByRosterId(arr: any[]) {
    return arr.reduce((acc, item) => {
      if (!acc[item.rosterId]) acc[item.rosterId] = [];
      acc[item.rosterId].push(item);
      return acc;
    }, {});
  }

  store.addRosterRankings(currentLeague.leagueId, groupByRosterId(filtered));
};

const fetchPlayerNames = async () => {
  if (store.leagueIds.length > 0) {
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const allPlayerIds = props.tableData.map((user) => user.players).flat();
    let playerLookupMap = new Map<string, any>();
    if (allPlayerIds.length > 0) {
      playerLookupMap = await getPlayersByIdsMap(allPlayerIds);
    }

    // Map over tableData and resolve all player projections
    const result = await Promise.all(
      props.tableData.map(async (user: any) => {
        const week = currentLeague.currentWeek
          ? currentLeague.currentWeek
          : currentLeague.lastScoredWeek;
        const starterIds = [
          ...user.starters[week - 1],
          ...difference(user.players, user.starters[week - 1]),
        ];
        // For each starter, fetch player and projection
        if (starterIds) {
          const starterNames = await Promise.all(
            starterIds.map(async (id: string) => {
              const player = playerLookupMap.get(id);
              const projection = await getSingleWeekProjection(
                id,
                currentLeague.season,
                week,
                currentLeague.scoringType
              );
              const stats = await getSingleWeekStats(
                id,
                currentLeague.season,
                week - 1,
                currentLeague.scoringType
              );
              return {
                ...player,
                projection,
                stats,
              };
            })
          );
          return {
            id: user.rosterId,
            players: starterNames,
          };
        } else {
          return {
            id: user.rosterId,
            players: [],
          };
        }
      })
    );
    playerNames.value = result;
  } else {
    playerNames.value = fakeStartSit;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m`;
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString();
};

const getValueColor = (value: number) => {
  if (value <= 12) return `bg-emerald-400 dark:bg-emerald-600 text-gray-50`;
  if (value <= 24) return `bg-green-400 dark:bg-green-600 text-gray-50`;
  if (value <= 36) return "bg-yellow-300 dark-bg-yellow-600 text-black";
  if (value <= 48) return `bg-orange-400 dark:bg-orange-500 text-gray-50`;
  return `bg-red-400 dark:bg-red-600 text-gray-50`;
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([fetchPlayerNames(), getData()]);
  loading.value = false;
});

watch(
  () => [currentManager.value, store.currentLeagueId],
  async () => {
    loading.value = true;
    await Promise.all([fetchPlayerNames(), getData()]);
    loading.value = false;
  }
);
</script>
<template>
  <div
    class="py-4 pl-4 bg-white rounded-lg shadow dark:bg-gray-800 md:py-6 md:pl-6"
  >
    <p class="text-3xl font-bold leading-none text-gray-900 dark:text-gray-50">
      Start/Sit (Beta)
    </p>
    <div class="my-4">
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
        <option
          v-for="manager in managers"
          :key="manager.rosterId"
          :value="manager"
        >
          {{ manager.name }}
        </option>
      </select>
    </div>
    <hr class="h-px mt-1 mb-3 mr-4 bg-gray-200 border-0 dark:bg-gray-700" />
    <h2 class="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-50">
      Week
      {{
        store.leagueInfo[store.currentLeagueIndex]?.currentWeek
          ? store.leagueInfo[store.currentLeagueIndex]?.currentWeek
          : 17
      }}
      Roster
    </h2>
    <div v-if="!loading" class="flex flex-wrap justify-between xl:flex-nowrap">
      <div v-if="currentRoster" class="text-gray-900 dark:text-gray-200">
        <div v-for="(player, index) in currentRoster.players" class="">
          <div v-if="index === starterSize" class="w-full my-4">
            <p class="text-xl font-medium">BENCH</p>
          </div>
          <div
            class="flex flex-wrap pb-4 mb-3 mr-4 border-b md:flex-nowrap dark:border-gray-700"
          >
            <div class="flex mr-8 md:w-64">
              <p class="w-8 font-semibold mt-7">{{ player.position }}</p>
              <img
                v-if="player.position !== 'DEF'"
                alt="Player image"
                class="object-cover mx-2 mt-2.5 rounded-full w-14 h-14"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
              />
              <img
                v-else
                alt="Defense image"
                class="mx-2 rounded-full h-14 mt-2.5"
                :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
              />
              <div class="ml-8 md:ml-0">
                <p class="text-xl font-medium md:text-base md:mb-2">
                  {{ player.name ? player.name : player.team }}
                </p>
                <p class="font-medium">
                  Projected:
                  <span class="font-normal text-gray-700 dark:text-gray-300">{{
                    player.projection?.stats
                  }}</span>
                </p>
                <p class="font-medium">
                  <span class="font-normal text-gray-700 dark:text-gray-300"
                    >{{
                      player.projection?.away === true
                        ? "@ "
                        : player.projection?.away === false
                          ? "vs "
                          : "BYE"
                    }}{{ player.projection?.opponent }}</span
                  >
                </p>
              </div>
            </div>
            <div class="mt-4 md:mt-0">
              <div>
                <div class="flex">
                  <div
                    v-for="(score, index) in player.stats?.points"
                    class="p-2 mr-2 text-center border rounded-md lg:w-20 dark:border-gray-700"
                  >
                    <p class="text-xs text-gray-700 dark:text-gray-300">
                      Week
                      {{
                        store.leagueInfo[store.currentLeagueIndex]?.currentWeek
                          ? store.leagueInfo[store.currentLeagueIndex]
                              .currentWeek -
                            index -
                            1
                          : store.leagueInfo[store.currentLeagueIndex]
                                ?.lastScoredWeek
                            ? store.leagueInfo[store.currentLeagueIndex]
                                ?.lastScoredWeek -
                              index -
                              1
                            : 17 - index
                      }}
                    </p>
                    <p class="my-1">{{ score }}</p>
                    <p
                      v-if="
                        player.stats?.ranks[index] !== 999 && score !== 'DNP'
                      "
                      :class="[
                        player.stats?.ranks[index]
                          ? getValueColor(player.stats?.ranks[index])
                          : 'bg-gray-300 dark:text-black',
                      ]"
                      class="text-xs rounded-full p-0.5 mt-1.5"
                    >
                      Rank: {{ player.stats?.ranks[index] }}
                    </p>
                    <p v-else class="py-1.5"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mr-4 xl:mx-4 xl:flex-grow">
        <h2
          class="mb-4 text-2xl font-bold text-gray-900 xl:-mt-12 dark:text-gray-50"
        >
          Player News
        </h2>
        <div v-for="post in data">
          <div
            class="p-4 mb-3 bg-white custom-max-width border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
          >
            <!-- Author Header -->
            <div class="flex items-center gap-3 mb-3">
              <img
                :src="post.author.avatar"
                :alt="post.author.displayName"
                class="w-12 h-12 rounded-full"
              />
              <div class="flex-1 min-w-0">
                <div
                  class="font-semibold text-gray-900 truncate dark:text-gray-200"
                >
                  {{ post.author.displayName }}
                </div>
                <div class="text-sm text-gray-500 truncate dark:text-gray-400">
                  @{{ post.author.handle }}
                </div>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(post.record.createdAt) }}
              </div>
            </div>
            <!-- Post Text -->
            <div
              class="mb-3 leading-relaxed text-gray-900 whitespace-pre-wrap overflow-x-clip dark:text-gray-200"
            >
              {{ post.record.text }}
            </div>
            <!-- Embedded Link -->
            <a
              v-if="post.embed?.external"
              :href="post.embed.external.uri"
              target="_blank"
              class="block mb-3 overflow-hidden no-underline transition-colors border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-700"
            >
              <img
                v-if="post.embed.external.thumb"
                :src="post.embed.external.thumb"
                :alt="post.embed.external.title"
                class="w-32 h-auto"
              />
              <div class="p-3">
                <div
                  class="mb-1 font-semibold text-gray-900 dark:text-gray-200"
                >
                  {{ post.embed.external.title }}
                </div>
                <div
                  class="text-sm text-gray-600 line-clamp-2 dark:text-gray-400"
                >
                  {{ post.embed.external.description }}
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-gray-900 mb-96 dark:text-gray-200">Loading...</div>
  </div>
</template>
<style scoped>
.custom-max-width {
  max-width: 475px;
}
</style>
