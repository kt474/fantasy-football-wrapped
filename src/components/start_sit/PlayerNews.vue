<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { getLeagueKey, useStore } from "../../store/store";
import { getPlayerNews, getPlayersByIdsMap } from "../../api/api";
import {
  getSingleWeekProjection,
  getSingleWeekStats,
} from "../../api/sleeperApi";
import { TableDataType } from "../../types/types";
import { fakePosts, fakeStartSit, fakeUsers } from "../../api/fakeLeague";
import max from "lodash/max";
import min from "lodash/min";
import { Player, SingleWeekProjection } from "../../types/apiTypes";
import Card from "../ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";
import Separator from "../ui/separator/Separator.vue";
import Button from "../ui/button/Button.vue";
import Label from "../ui/label/Label.vue";
import {
  getOrderedRosterPlayerIds,
  START_SIT_CONCURRENCY,
} from "./startSitLoader";
import { mapWithConcurrency } from "@/lib/async";

type NewsPost = {
  author: {
    avatar: string;
    displayName: string;
    handle: string;
  };
  record: {
    createdAt: string;
    text: string;
  };
  embed?: {
    external?: {
      uri: string;
      thumb?: string;
      title: string;
      description: string;
    };
  };
};

type StartSitPlayer = {
  name?: string;
  player_id: string;
  position?: string;
  team?: string;
  projection: SingleWeekProjection;
  stats: {
    points: (number | string)[];
    ranks: (number | string)[];
    stats: Array<Record<string, number | string | undefined>>;
  };
};

type StartSitRoster = {
  id: number;
  players: StartSitPlayer[];
};

const data = ref<NewsPost[]>([]);
const currentRoster = ref<StartSitRoster | null>(null);
const loading = ref<boolean>(false);
const expanded = ref<Record<string, boolean>>({});
const store = useStore();
const playerDirectoryCache = new Map<string, Player>();
const playerDataCache = new Map<string, Promise<StartSitPlayer>>();
let loadRequestId = 0;
const props = defineProps<{
  tableData: TableDataType[];
}>();

const toggle = (id: string) => {
  expanded.value[id] = !expanded.value[id];
};

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

const getPlayerDirectory = async (leagueKey: string, playerIds: string[]) => {
  const missingPlayerIds = playerIds.filter(
    (playerId) => !playerDirectoryCache.has(`${leagueKey}:${playerId}`)
  );

  if (missingPlayerIds.length > 0) {
    const players = await getPlayersByIdsMap(missingPlayerIds);
    players.forEach((player, playerId) => {
      playerDirectoryCache.set(`${leagueKey}:${playerId}`, player);
    });
  }

  return new Map(
    playerIds.flatMap((playerId) => {
      const player = playerDirectoryCache.get(`${leagueKey}:${playerId}`);
      return player ? [[playerId, player] as const] : [];
    })
  );
};

const loadPlayer = (
  playerId: string,
  player: Player | undefined,
  leagueKey: string,
  season: string,
  week: number,
  scoringType: number
) => {
  const cacheKey = [
    leagueKey,
    season,
    week,
    scoringType,
    playerId,
  ].join(":");
  const cachedPlayer = playerDataCache.get(cacheKey);
  if (cachedPlayer) {
    return cachedPlayer;
  }

  const playerPromise = Promise.all([
    getSingleWeekProjection(playerId, season, week, scoringType),
    getSingleWeekStats(playerId, season, Math.max(0, week - 1), scoringType),
  ]).then(([projection, stats]) => ({
    name: player?.name,
    player_id: player?.player_id ?? playerId,
    position: player?.position,
    team: player?.team,
    projection,
    stats: {
      points: stats.points as (number | string)[],
      ranks: stats.ranks as (number | string)[],
      stats: stats.stats as Array<
        Record<string, number | string | undefined>
      >,
    },
  }));

  playerDataCache.set(cacheKey, playerPromise);
  return playerPromise;
};

const loadSelectedRoster = async () => {
  const requestId = ++loadRequestId;
  loading.value = true;

  try {
    if (store.leagueIds.length === 0) {
      currentRoster.value =
        (fakeStartSit as StartSitRoster[]).find(
          (roster) => roster.id === currentManager.value?.rosterId
        ) ?? null;
      data.value = fakePosts;
      return;
    }

    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    const selectedManager = currentManager.value;
    if (!currentLeague || !selectedManager) {
      currentRoster.value = null;
      data.value = [];
      return;
    }

    const selectedTeam = props.tableData.find(
      (team) => team.rosterId === selectedManager.rosterId
    );
    if (!selectedTeam) {
      currentRoster.value = null;
      data.value = [];
      return;
    }

    const week =
      currentLeague.currentWeek || currentLeague.lastScoredWeek || 1;
    const leagueKey = getLeagueKey(currentLeague);
    const playerIds = getOrderedRosterPlayerIds(
      selectedTeam.players,
      selectedTeam.starters,
      week
    );
    const playerLookupMap = await getPlayerDirectory(leagueKey, playerIds);
    const players = await mapWithConcurrency(
      playerIds,
      START_SIT_CONCURRENCY,
      (playerId) =>
        loadPlayer(
          playerId,
          playerLookupMap.get(playerId),
          leagueKey,
          currentLeague.season,
          week,
          currentLeague.scoringType
        )
    );
    const playerNews = await getPlayerNews(
      players.flatMap((player) => (player.name ? [player.name] : []))
    );

    if (requestId !== loadRequestId) {
      return;
    }

    currentRoster.value = {
      id: selectedManager.rosterId,
      players,
    };
    data.value = playerNews
      .map((post) => post.post as NewsPost)
      .filter(Boolean);
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
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

const getValueColor = (value: number | string) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";
  if (numericValue <= 12)
    return `bg-emerald-400 dark:bg-emerald-600 text-gray-50`;
  if (numericValue <= 24) return `bg-green-400 dark:bg-green-600 text-gray-50`;
  if (numericValue <= 36) return "bg-yellow-300 dark-bg-yellow-600 text-black";
  if (numericValue <= 48)
    return `bg-orange-400 dark:bg-orange-500 text-gray-50`;
  return `bg-red-400 dark:bg-red-600 text-gray-50`;
};

function getAverage(arr: Array<number | string | undefined>) {
  const numbers = arr
    .filter((item) => item && item !== "DNP" && item !== 999)
    .map((item) => Number(item));

  if (numbers.length === 0) {
    return 0;
  }

  const sum = numbers.reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0
  );
  return Math.round((sum * 100) / numbers.length) / 100;
}

function getMax(arr: Array<number | string | undefined>) {
  const numbers = arr
    .filter((item) => item && item !== "DNP")
    .map((item) => Number(item));

  if (numbers.length === 0) {
    return 0;
  }

  return max(numbers);
}

function getMin(arr: Array<number | string | undefined>) {
  const numbers = arr
    .filter((item) => item && item !== "DNP")
    .map((item) => Number(item));

  if (numbers.length === 0) {
    return 0;
  }

  return min(numbers);
}

onMounted(async () => {
  await loadSelectedRoster();
});

watch(
  () => [currentManager.value?.rosterId, store.currentLeagueId],
  async ([, leagueId], [, previousLeagueId]) => {
    if (leagueId !== previousLeagueId) {
      const nextManager = managers.value[0];
      const managerChanged =
        nextManager?.rosterId !== currentManager.value?.rosterId;
      currentManager.value = nextManager;
      if (managerChanged) {
        return;
      }
    }
    await loadSelectedRoster();
  }
);
</script>
<template>
  <Card class="py-4 pl-4 mb-4 md:py-6 md:pl-6">
    <p class="text-3xl font-bold leading-none">Start/Sit</p>
    <div class="my-4">
      <Label for="Manager name" class="block mb-1 text-sm">Manager</Label>
      <Select id="Manager name" v-model="currentManager">
        <SelectTrigger class="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="manager in managers"
            :key="manager.rosterId"
            :value="manager"
          >
            {{ manager.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <Separator class="h-px mt-1 mb-3 mr-4" />
    <h2 class="mb-4 text-2xl font-bold">
      Week
      {{
        store.leagueInfo[store.currentLeagueIndex]?.currentWeek
          ? store.leagueInfo[store.currentLeagueIndex]?.currentWeek
          : 1
      }}
      Roster
    </h2>
    <div v-if="!loading" class="flex flex-wrap justify-between xl:flex-nowrap">
      <div v-if="currentRoster" class="w-full max-w-3xl">
        <div v-for="(player, index) in currentRoster.players" class="">
          <div v-if="index === starterSize" class="w-full my-4">
            <p class="text-xl font-medium">BENCH</p>
          </div>
          <div class="pb-4 mb-3 mr-4 border-b md:flex-nowrap">
            <div class="flex w-full">
              <p class="w-8 mt-4 font-semibold">{{ player.position }}</p>
              <img
                v-if="player.position !== 'DEF'"
                alt="Player image"
                class="object-cover mx-2 rounded-full w-14 h-14"
                :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
              />
              <img
                v-else
                alt="Defense image"
                class="mx-2 rounded-full h-14"
                :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
              />
              <div class="flex justify-between w-full">
                <div class="ml-4 mr-2 md:ml-0">
                  <p class="text-lg font-medium md:text-base">
                    {{ player.name ? player.name : player.team }}
                  </p>
                  <p class="font-medium">
                    <span class="font-normal text-muted-foreground"
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
                <div class="flex">
                  <div
                    v-if="player.projection?.stats"
                    class="mr-2 mt-0.5 sm:mr-4"
                  >
                    <p class="font-normal text-muted-foreground">Projected</p>
                    <p class="text-lg font-semibold text-right sm:text-xl">
                      {{ player.projection?.stats }}
                    </p>
                  </div>
                  <Button
                    @click="toggle(player.player_id)"
                    aria-label="Button to show all trades"
                    variant="secondary"
                    size="sm"
                    class="flex mt-2"
                  >
                    <svg
                      v-if="expanded[player.player_id]"
                      class="w-5 h-5"
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
                      class="w-5 h-5"
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
                  </Button>
                </div>
              </div>
            </div>
            <div class="px-4 py-2 mt-2 rounded bg-secondary">
              <div class="flex justify-between">
                <p class="mr-2 text-sm text-balance sm:text-base">
                  Recent <br />
                  Performances
                </p>
                <div class="text-center">
                  <p class="text-xs sm:text-sm">Avg Pts</p>
                  <p class="text-sm font-semibold sm:text-base">
                    {{ getAverage(player.stats.points) }}
                  </p>
                </div>
                <div class="text-center">
                  <p class="text-xs sm:text-sm">High</p>
                  <p class="text-sm font-semibold sm:text-base">
                    {{ getMax(player.stats.points) }}
                  </p>
                </div>
                <div class="text-center">
                  <p class="text-xs sm:text-sm">Low</p>
                  <p class="text-sm font-semibold sm:text-base">
                    {{ getMin(player.stats.points) }}
                  </p>
                </div>
                <div
                  v-if="player.position !== 'K' && player.position !== 'DEF'"
                  class="text-center"
                >
                  <p class="text-xs sm:text-sm">Avg Rank</p>
                  <p
                    v-if="getAverage(player.stats.ranks) !== 0"
                    class="mt-0.5 text-sm font-semibold rounded-full sm:text-base"
                    :class="[getValueColor(getAverage(player.stats.ranks))]"
                  >
                    {{ getAverage(player.stats.ranks) }}
                  </p>
                  <p
                    v-else
                    class="mt-0.5 text-sm font-semibold rounded-full sm:text-base"
                  >
                    N/A
                  </p>
                </div>
              </div>
            </div>
            <div v-show="expanded[player.player_id]" class="mt-4">
              <div>
                <div
                  class="flex space-x-1 overflow-x-auto sm:justify-end sm:space-x-2"
                >
                  <div
                    v-for="(score, index) in player.stats?.points"
                    class="flex-1 p-2 text-center border rounded-md dark:border-gray-700"
                  >
                    <p class="text-xs text-muted-foreground text-nowrap">
                      Week
                      {{
                        store.leagueInfo[store.currentLeagueIndex]?.currentWeek
                          ? store.leagueInfo[store.currentLeagueIndex]
                              .currentWeek -
                            Number(index) -
                            1
                          : store.leagueInfo[store.currentLeagueIndex]
                                ?.lastScoredWeek
                            ? store.leagueInfo[store.currentLeagueIndex]
                                ?.lastScoredWeek -
                              Number(index) -
                              1
                            : 17 - Number(index)
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
                          : '',
                      ]"
                      class="text-xs rounded-full p-0.5 mt-1.5 text-nowrap"
                    >
                      <span class="hidden sm:inline">Rank:</span>
                      {{ player.stats?.ranks[index] }}
                    </p>

                    <div
                      class="mt-2 text-xs"
                      v-if="player.position === 'QB' && score !== 'DNP'"
                    >
                      <p class="">
                        <span class="text-muted-foreground">Pass Yd: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["pass_yd"]
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Pass Td: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["pass_td"] ?? 0
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rush Yd: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rush_yd"]
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rush Td: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rush_td"]
                            ? player.stats?.stats[index]["rush_td"]
                            : 0
                        }}</span>
                      </p>
                    </div>
                    <div
                      class="mt-2 text-xs"
                      v-if="player.position === 'RB' && score !== 'DNP'"
                    >
                      <p>
                        <span class="text-muted-foreground">Rush Att: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rush_att"]
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rush Yd: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rush_yd"]
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rush Td: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rush_td"]
                            ? player.stats?.stats[index]["rush_td"]
                            : 0
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rec: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rec"]
                            ? player.stats?.stats[index]["rec"]
                            : 0
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rec Yd: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rec_yd"]
                            ? player.stats?.stats[index]["rec_yd"]
                            : 0
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground"> Snaps: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]?.["team_snaps"]
                              ? (
                                  (Number(
                                    player.stats?.stats[index]?.["snaps"] ?? 0
                                  ) /
                                    Number(
                                      player.stats?.stats[index]?.[
                                        "team_snaps"
                                      ] ?? 1
                                    )) *
                                  100
                                ).toFixed(0)
                              : 0
                          }}%</span
                        >
                      </p>
                    </div>
                    <div
                      class="mt-2 text-xs"
                      v-if="
                        (player.position === 'WR' ||
                          player.position === 'TE') &&
                        score !== 'DNP'
                      "
                    >
                      <p>
                        <span class="text-muted-foreground">Rec: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rec"]
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rec Yd: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rec_yd"]
                        }}</span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Rec Td: </span>
                        <span class="font-semibold">{{
                          player.stats?.stats[index]["rec_td"]
                            ? player.stats?.stats[index]["rec_td"]
                            : 0
                        }}</span>
                      </p>

                      <p>
                        <span class="text-muted-foreground">Snaps: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]?.["team_snaps"]
                              ? (
                                  (Number(
                                    player.stats?.stats[index]?.["snaps"] ?? 0
                                  ) /
                                    Number(
                                      player.stats?.stats[index]?.[
                                        "team_snaps"
                                      ] ?? 1
                                    )) *
                                  100
                                ).toFixed(0)
                              : 0
                          }}%</span
                        >
                      </p>
                    </div>
                    <div
                      class="mt-2 text-xs"
                      v-if="player.position === 'K' && score !== 'DNP'"
                    >
                      <p>
                        <span class="text-muted-foreground">FG: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]["fgm"]
                              ? player.stats?.stats[index]["fgm"]
                              : 0
                          }}
                          /
                          {{
                            player.stats?.stats[index]["fga"]
                              ? player.stats?.stats[index]["fga"]
                              : 0
                          }}</span
                        >
                      </p>
                      <p>
                        <span class="text-muted-foreground">XP: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]["xpm"]
                              ? player.stats?.stats[index]["xpm"]
                              : 0
                          }}
                          /
                          {{
                            player.stats?.stats[index]["xpa"]
                              ? player.stats?.stats[index]["xpa"]
                              : 0
                          }}</span
                        >
                      </p>
                    </div>
                    <div
                      class="mt-2 text-xs"
                      v-if="player.position === 'DEF' && score !== 'DNP'"
                    >
                      <p>
                        <span class="text-muted-foreground">Pts Allow: </span>
                        <span class="font-semibold"
                          >{{ player.stats?.stats[index]["pts_allow"] }}
                        </span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Yds Allow: </span>
                        <span class="font-semibold"
                          >{{ player.stats?.stats[index]["yds_allow"] }}
                        </span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Sack: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]["sack"]
                              ? player.stats?.stats[index]["sack"]
                              : 0
                          }}
                        </span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">Int: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]["int"]
                              ? player.stats?.stats[index]["int"]
                              : 0
                          }}
                        </span>
                      </p>
                      <p>
                        <span class="text-muted-foreground">FF: </span>
                        <span class="font-semibold"
                          >{{
                            player.stats?.stats[index]["ff"]
                              ? player.stats?.stats[index]["ff"]
                              : 0
                          }}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="currentRoster" class="mr-4 xl:mx-4 xl:flex-grow">
        <h2 class="mb-4 text-2xl font-bold xl:-mt-12">Player News</h2>
        <div v-for="post in data">
          <Card class="p-4 mb-3 custom-max-width">
            <!-- Author Header -->
            <div class="flex items-center gap-3 mb-3">
              <img
                :src="post.author.avatar"
                :alt="post.author.displayName"
                class="w-12 h-12 rounded-full"
              />
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">
                  {{ post.author.displayName }}
                </div>
                <div class="text-sm truncate text-muted-foreground">
                  @{{ post.author.handle }}
                </div>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ formatDate(post.record.createdAt) }}
              </div>
            </div>
            <!-- Post Text -->
            <div
              class="mb-3 leading-relaxed whitespace-pre-wrap overflow-x-clip"
            >
              {{ post.record.text }}
            </div>
            <!-- Embedded Link -->
            <a
              v-if="post.embed?.external"
              :href="post.embed.external.uri"
              target="_blank"
              rel="noopener noreferrer"
              class="block mb-3 overflow-hidden no-underline border rounded-lg"
            >
              <img
                v-if="post.embed.external.thumb"
                :src="post.embed.external.thumb"
                :alt="post.embed.external.title"
                class="w-32 h-auto"
              />
              <div class="p-3">
                <div class="mb-1 font-semibold">
                  {{ post.embed.external.title }}
                </div>
                <div class="text-sm text-muted-foreground line-clamp-2">
                  {{ post.embed.external.description }}
                </div>
              </div>
            </a>
          </Card>
        </div>
      </div>
    </div>
    <div v-else class="h-screen">Loading...</div>
  </Card>
</template>
<style scoped>
.custom-max-width {
  max-width: 475px;
  @media (max-width: 768px) {
    max-width: 335px;
  }
}
.custom-card-width {
  @media (min-width: 640px) {
    width: 6.1rem;
  }
}
</style>
