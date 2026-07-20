<script setup lang="ts">
import { ref, computed, onMounted, shallowRef, watch } from "vue";
import { ChevronDown, ChevronUp } from "lucide-vue-next";
import { getLeagueKey, useStore } from "../../store/store";
import { getPlayerNews, getPlayersByIdsMap } from "../../api/api";
import {
  getSingleWeekProjection,
  getSingleWeekStats,
} from "../../api/sleeperApi";
import { TableDataType } from "../../types/types";
import { max, min } from "@/lib/collection";
import { Player, SingleWeekProjection } from "../../types/apiTypes";
import Card from "../ui/card/Card.vue";
import { Badge } from "../ui/badge";
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
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  canPlayerFillLineupSlot,
  getOrderedRosterPlayerEntries,
  getRecentStartSitWeekLabel,
  getStartingRosterSlots,
  getStartSitWeek,
  START_SIT_CONCURRENCY,
} from "./startSitLoader";
import PlayerNewsFeed from "./PlayerNewsFeed.vue";
import { mapWithConcurrency } from "@/lib/async";
import {
  loadDemoLeague,
  loadDemoStartSit,
  type DemoLeagueFixtures,
} from "@/data/demo/loaders";

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
  rosterSlot?: string;
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

type StartSitRecommendation = {
  id: string;
  start: StartSitPlayer;
  sit: StartSitPlayer;
  projectionGap: number;
  recentGap: number;
  scoreGap: number;
};

const data = ref<NewsPost[]>([]);
const currentRoster = ref<StartSitRoster | null>(null);
const loading = ref<boolean>(false);
const expanded = ref<Record<string, boolean>>({});
const store = useStore();
const playerDirectoryCache = new Map<string, Player>();
const playerDataCache = new Map<string, Promise<StartSitPlayer>>();
let loadRequestId = 0;
const demoUsers = shallowRef<DemoLeagueFixtures["fakeUsers"]>([]);
const demoRosters = shallowRef<StartSitRoster[]>([]);
const demoPosts = shallowRef<NewsPost[]>([]);
const props = defineProps<{
  tableData: TableDataType[];
}>();

const loadDemoData = async () => {
  const [league, startSit] = await Promise.all([
    loadDemoLeague(),
    loadDemoStartSit(),
  ]);
  demoUsers.value = league.fakeUsers;
  demoRosters.value = startSit.fakeStartSit as StartSitRoster[];
  demoPosts.value = startSit.fakePosts;
};

const toggle = (id: string) => {
  expanded.value[id] = !expanded.value[id];
};

const numberValues = (arr: Array<number | string | undefined>) =>
  arr
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item !== 999);

const getNumericAverage = (arr: Array<number | string | undefined>) => {
  const numbers = numberValues(arr);
  if (numbers.length === 0) return 0;

  const sum = numbers.reduce((total, value) => total + value, 0);
  return Math.round((sum * 100) / numbers.length) / 100;
};

const getNumericMin = (arr: Array<number | string | undefined>) => {
  const numbers = numberValues(arr);
  if (numbers.length === 0) return 0;

  return min(numbers) ?? 0;
};

const getProjectionValue = (player: StartSitPlayer) => {
  const projection = Number(player.projection?.stats);
  return Number.isFinite(projection) ? projection : 0;
};

const getPlayerLabel = (player: StartSitPlayer) =>
  player.name ? player.name : player.team || "Unknown Player";

const getPlayerMatchupLabel = (player: StartSitPlayer) => {
  if (!player.projection?.opponent) return "Bye";
  if (player.projection.away === true) return `@ ${player.projection.opponent}`;
  if (player.projection.away === false)
    return `vs ${player.projection.opponent}`;

  return player.projection.opponent;
};

const getRecentWeekLabel = (index: number) => {
  const currentLeague = store.currentLeague;
  return getRecentStartSitWeekLabel(currentLeague, Number(index));
};

const RECOMMENDATION_LIMIT = 5;
const CLOSE_RECOMMENDATION_GAP = -0.75;

const formatSignedNumber = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;

const getBadgePaletteClass = (tier: number) => {
  if (tier === 1)
    return "performance-excellent";
  if (tier === 2)
    return "performance-good";
  if (tier === 3)
    return "performance-average";
  if (tier === 4)
    return "performance-poor";
  return "performance-bad";
};

const getProjectionGapClass = (value: number) => {
  if (value >= 3) return getBadgePaletteClass(1);
  if (value >= 1.5) return getBadgePaletteClass(2);
  if (value >= 0) return getBadgePaletteClass(3);
  if (value >= CLOSE_RECOMMENDATION_GAP) return getBadgePaletteClass(4);
  return getBadgePaletteClass(5);
};

const getStartScore = (player: StartSitPlayer) => {
  const projection = getProjectionValue(player);
  const recentAverage = getNumericAverage(player.stats.points);
  const floor = getNumericMin(player.stats.points);
  const rankAverage = getNumericAverage(player.stats.ranks);
  const rankBonus = rankAverage > 0 ? Math.max(0, 48 - rankAverage) / 12 : 0;

  return projection * 0.55 + recentAverage * 0.3 + floor * 0.1 + rankBonus;
};

const canComparePlayers = (
  benchPlayer: StartSitPlayer,
  starter: StartSitPlayer
) => {
  if (!benchPlayer.position || !starter.position) return false;

  if (starter.rosterSlot) {
    return canPlayerFillLineupSlot(benchPlayer.position, starter.rosterSlot);
  }

  return benchPlayer.position === starter.position;
};

const activeStarterCount = computed(() => {
  if (
    currentRoster.value?.players.some((player) => Boolean(player.rosterSlot))
  ) {
    return currentRoster.value.players.filter(
      (player) => player.rosterSlot !== "BN"
    ).length;
  }

  return starterSize.value;
});

const startSitRecommendations = computed<StartSitRecommendation[]>(() => {
  if (!currentRoster.value) return [];

  const starters = currentRoster.value.players.slice(
    0,
    activeStarterCount.value
  );
  const bench = currentRoster.value.players.slice(activeStarterCount.value);
  const usedStarterIds = new Set<string>();
  const usedBenchIds = new Set<string>();

  const recommendations = bench
    .flatMap((benchPlayer) => {
      const benchProjection = getProjectionValue(benchPlayer);
      if (benchProjection <= 0) return [];

      return starters
        .filter((starter) => canComparePlayers(benchPlayer, starter))
        .map((starter) => {
          const projectionGap = benchProjection - getProjectionValue(starter);
          const recentGap =
            getNumericAverage(benchPlayer.stats.points) -
            getNumericAverage(starter.stats.points);
          const scoreGap = getStartScore(benchPlayer) - getStartScore(starter);

          return {
            id: `${benchPlayer.player_id}-${starter.player_id}`,
            start: benchPlayer,
            sit: starter,
            projectionGap,
            recentGap,
            scoreGap,
          } satisfies StartSitRecommendation;
        });
    })
    .sort((a, b) => b.scoreGap - a.scoreGap)
    .filter((recommendation) => {
      if (
        usedStarterIds.has(recommendation.sit.player_id) ||
        usedBenchIds.has(recommendation.start.player_id)
      ) {
        return false;
      }

      usedStarterIds.add(recommendation.sit.player_id);
      usedBenchIds.add(recommendation.start.player_id);
      return true;
    });

  const actionableRecommendations = recommendations.filter(
    (recommendation) =>
      recommendation.projectionGap >= CLOSE_RECOMMENDATION_GAP ||
      recommendation.scoreGap >= CLOSE_RECOMMENDATION_GAP
  );

  if (actionableRecommendations.length > 0) {
    return actionableRecommendations.slice(0, RECOMMENDATION_LIMIT);
  }

  return recommendations.slice(0, RECOMMENDATION_LIMIT);
});

const managers = computed(() => {
  if (store.leagueInfo.length > 0) {
    return props.tableData.map((user) => {
      return {
        name: store.showUsernames ? user.username : user.name,
        rosterId: user.rosterId,
      };
    });
  } else {
    return demoUsers.value.map((user) => ({
      name: user.name,
      rosterId: Number(user.id),
    }));
  }
});

const starterSize = computed(() => {
  const currentLeague = store.currentLeague;
  if (currentLeague) {
    return getStartingRosterSlots(currentLeague.rosterPositions).length;
  }
  return 9;
});

const rosterHeading = computed(() => {
  const currentLeague = store.currentLeague;
  if (currentLeague?.status === "complete") return "Roster";

  return `Week ${getStartSitWeek(currentLeague)} Roster`;
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
  rosterSlot: string,
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
    rosterSlot,
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
    rosterSlot,
    team: player?.team,
    projection,
    stats: {
      points: stats.points as (number | string)[],
      ranks: stats.ranks as (number | string)[],
      stats: stats.stats as Array<Record<string, number | string | undefined>>,
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
      if (demoRosters.value.length === 0) {
        await loadDemoData();
        currentManager.value = managers.value[0];
      }
      currentRoster.value =
        demoRosters.value.find(
          (roster) => roster.id === currentManager.value?.rosterId
        ) ?? null;
      data.value = demoPosts.value;
      return;
    }

    const currentLeague = store.currentLeague;
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

    const week = getStartSitWeek(currentLeague);
    const leagueKey = getLeagueKey(currentLeague);
    const playerEntries = getOrderedRosterPlayerEntries(
      selectedTeam.players,
      selectedTeam.starters,
      week,
      currentLeague.rosterPositions
    );
    const playerIds = playerEntries.map((entry) => entry.playerId);
    const playerLookupMap = await getPlayerDirectory(leagueKey, playerIds);
    const players = await mapWithConcurrency(
      playerEntries,
      START_SIT_CONCURRENCY,
      (entry) =>
        loadPlayer(
          entry.playerId,
          playerLookupMap.get(entry.playerId),
          entry.rosterSlot,
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

const getValueColor = (value: number | string) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0)
    return "bg-muted text-muted-foreground";
  if (numericValue <= 12) return getBadgePaletteClass(1);
  if (numericValue <= 24) return getBadgePaletteClass(2);
  if (numericValue <= 36) return getBadgePaletteClass(3);
  if (numericValue <= 48) return getBadgePaletteClass(4);
  return getBadgePaletteClass(5);
};

function getAverage(arr: Array<number | string | undefined>) {
  const numbers = numberValues(arr);

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
  const numbers = numberValues(arr);

  if (numbers.length === 0) {
    return 0;
  }

  return max(numbers);
}

function getMin(arr: Array<number | string | undefined>) {
  const numbers = numberValues(arr);

  if (numbers.length === 0) {
    return 0;
  }

  return min(numbers);
}

onMounted(async () => {
  if (store.leagueIds.length === 0) {
    await loadDemoData();
    currentManager.value = managers.value[0];
  }
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
  <Card class="p-4 mb-4 md:p-6">
    <Tabs default-value="roster">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p class="text-2xl font-semibold tracking-tight">Start/Sit</p>
        <TabsList>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>
      </div>
      <div class="my-4">
        <Label for="Manager name" class="block mb-1 text-sm">Manager</Label>
        <Select id="Manager name" v-model="currentManager">
          <SelectTrigger class="w-full sm:w-52">
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
      <Separator class="h-px mt-1 mb-4" />
      <div
        v-if="loading"
        class="grid min-h-64 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]"
        aria-busy="true"
        aria-live="polite"
      >
        <span class="sr-only">Loading start/sit data...</span>
        <aside class="xl:sticky xl:top-4 xl:col-start-2">
          <div class="mb-3">
            <Skeleton class="w-56 h-8 bg-muted dark:bg-muted/70" />
          </div>
          <div class="grid gap-3">
            <Card v-for="index in 3" :key="index" class="p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="w-full min-w-0 space-y-2">
                  <Skeleton class="w-3/4 h-5 bg-muted dark:bg-muted/70" />
                  <Skeleton class="w-1/2 h-4 bg-muted dark:bg-muted/70" />
                </div>
                <div class="space-y-2 shrink-0">
                  <Skeleton
                    class="h-6 ml-auto bg-muted dark:bg-muted/70 w-14"
                  />
                  <Skeleton class="w-20 h-3 bg-muted dark:bg-muted/70" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 mt-4">
                <Skeleton class="h-16 bg-muted dark:bg-muted/70" />
                <Skeleton class="h-16 bg-muted dark:bg-muted/70" />
              </div>
            </Card>
          </div>
        </aside>
        <div class="w-full min-w-0 xl:col-start-1 xl:row-start-1">
          <div class="mb-3">
            <Skeleton class="w-32 h-8 bg-muted dark:bg-muted/70" />
          </div>
          <div class="grid gap-3">
            <Card v-for="index in 6" :key="index" class="overflow-hidden">
              <div class="flex w-full gap-3 p-4">
                <Skeleton class="w-10 mt-3 bg-muted dark:bg-muted/70 h-7" />
                <Skeleton
                  class="rounded-full bg-muted dark:bg-muted/70 size-14"
                />
                <div class="flex justify-between w-full min-w-0 gap-3">
                  <div class="w-full min-w-0 space-y-2">
                    <Skeleton class="w-2/5 h-5 bg-muted dark:bg-muted/70" />
                    <Skeleton class="w-24 h-4 bg-muted dark:bg-muted/70" />
                  </div>
                  <div class="space-y-2 shrink-0">
                    <Skeleton class="w-16 h-4 bg-muted dark:bg-muted/70" />
                    <Skeleton
                      class="w-10 h-6 ml-auto bg-muted dark:bg-muted/70"
                    />
                  </div>
                </div>
              </div>
              <div class="px-4 py-3 border-t bg-muted/30">
                <div class="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  <Skeleton
                    class="hidden h-8 bg-muted dark:bg-muted/70 sm:block"
                  />
                  <Skeleton class="h-8 bg-muted dark:bg-muted/70" />
                  <Skeleton class="h-8 bg-muted dark:bg-muted/70" />
                  <Skeleton class="h-8 bg-muted dark:bg-muted/70" />
                  <Skeleton class="h-8 bg-muted dark:bg-muted/70" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <TabsContent v-else value="roster">
        <div
          v-if="currentRoster"
          class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]"
        >
          <aside class="xl:sticky xl:top-4 xl:col-start-2">
            <div class="mb-3">
              <h2 class="text-2xl font-semibold">Player comparisons</h2>
            </div>
            <div v-if="startSitRecommendations.length > 0" class="grid gap-3">
              <Card
                v-for="recommendation in startSitRecommendations"
                :key="recommendation.id"
                class="overflow-hidden shadow-sm"
              >
                <div
                  class="flex items-start justify-between gap-3 px-4 py-3 bg-muted/20"
                >
                  <div class="min-w-0">
                    <p class="mt-1 font-semibold truncate">
                      {{ getPlayerLabel(recommendation.start) }}
                    </p>
                    <p class="mt-1 text-sm truncate">
                      over {{ getPlayerLabel(recommendation.sit) }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p
                      class="inline-flex items-center justify-center px-2 py-1 text-sm font-semibold rounded-md min-w-14 tabular-nums"
                      :class="
                        getProjectionGapClass(recommendation.projectionGap)
                      "
                    >
                      {{ formatSignedNumber(recommendation.projectionGap) }}
                    </p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-px border-t bg-border/60">
                  <div class="min-w-0 px-4 py-3 bg-card">
                    <p class="text-xs font-semibold truncate">
                      {{ getPlayerLabel(recommendation.start) }}
                    </p>
                    <p class="mt-0.5 text-xs truncate text-muted-foreground">
                      {{ getPlayerMatchupLabel(recommendation.start) }}
                    </p>
                    <div class="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <p class="text-xs font-medium text-muted-foreground">
                          Proj
                        </p>
                        <p class="font-semibold tabular-nums">
                          {{
                            getProjectionValue(recommendation.start).toFixed(1)
                          }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs font-medium text-muted-foreground">
                          Avg
                        </p>
                        <p class="font-semibold tabular-nums">
                          {{ getAverage(recommendation.start.stats.points) }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="min-w-0 px-4 py-3 bg-card">
                    <p class="text-xs font-semibold truncate">
                      {{ getPlayerLabel(recommendation.sit) }}
                    </p>
                    <p class="mt-0.5 text-xs truncate text-muted-foreground">
                      {{ getPlayerMatchupLabel(recommendation.sit) }}
                    </p>
                    <div class="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <p class="text-xs font-medium text-muted-foreground">
                          Proj
                        </p>
                        <p class="font-semibold tabular-nums">
                          {{
                            getProjectionValue(recommendation.sit).toFixed(1)
                          }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs font-medium text-muted-foreground">
                          Avg
                        </p>
                        <p class="font-semibold tabular-nums">
                          {{ getAverage(recommendation.sit.stats.points) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <Card v-else class="p-4">
              <p class="font-medium">No comparable players found.</p>
            </Card>
          </aside>
          <div class="w-full min-w-0 xl:col-start-1 xl:row-start-1">
            <div class="mb-3">
              <h2 class="text-2xl font-semibold">
                {{ rosterHeading }}
              </h2>
            </div>
            <div
              v-for="(player, index) in currentRoster.players"
              :key="player.player_id"
              class="shadow-sm"
            >
              <div v-if="index === activeStarterCount" class="w-full mt-5 mb-3">
                <p
                  class="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Bench
                </p>
              </div>
              <Card class="mb-3 overflow-hidden md:flex-nowrap">
                <div class="flex w-full gap-3 p-4">
                  <Badge
                    variant="outline"
                    class="justify-center hidden w-10 mt-3 rounded-md h-7 sm:inline-flex"
                  >
                    {{ player.position }}
                  </Badge>
                  <img
                    v-if="player.position !== 'DEF'"
                    alt="Player image"
                    class="object-cover border rounded-full size-12 bg-muted sm:size-14"
                    :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                  />
                  <img
                    v-else
                    alt="Defense image"
                    class="h-12 border rounded-full bg-muted sm:h-14"
                    :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                  />
                  <div
                    class="flex justify-between w-full min-w-0 gap-3"
                  >
                    <div class="min-w-0">
                      <p class="font-semibold truncate">
                        {{ player.name ? player.name : player.team }}
                      </p>
                      <p class="mt-1 text-sm text-muted-foreground">
                        {{ getPlayerMatchupLabel(player) }}
                      </p>
                    </div>
                    <div
                      class="flex items-start gap-2 sm:gap-4 shrink-0"
                    >
                      <div v-if="player.projection?.stats" class="text-right">
                        <p class="text-xs font-medium text-muted-foreground">
                          Projected
                        </p>
                        <p class="text-xl font-semibold tabular-nums">
                          {{ player.projection?.stats }}
                        </p>
                      </div>
                      <Button
                        @click="toggle(player.player_id)"
                        :aria-label="`${
                          expanded[player.player_id] ? 'Hide' : 'Show'
                        } recent performance details for ${
                          player.name || player.team
                        }`"
                        :aria-expanded="Boolean(expanded[player.player_id])"
                        variant="outline"
                        size="icon"
                        class="mt-1 border size-8"
                      >
                        <ChevronUp
                          v-if="expanded[player.player_id]"
                          class="size-4"
                        />
                        <ChevronDown v-else class="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div class="px-4 py-3 border-t bg-muted/20">
                  <div class="grid grid-cols-4 gap-3 sm:grid-cols-5">
                    <p class="hidden text-xs font-semibold uppercase sm:block">
                      Recent
                    </p>
                    <div class="text-center">
                      <p class="text-xs font-medium text-muted-foreground">
                        Avg Pts
                      </p>
                      <p class="text-lg font-semibold tabular-nums">
                        {{ getAverage(player.stats.points) }}
                      </p>
                    </div>
                    <div class="text-center">
                      <p class="text-xs font-medium text-muted-foreground">
                        High
                      </p>
                      <p class="text-lg font-semibold tabular-nums">
                        {{ getMax(player.stats.points) }}
                      </p>
                    </div>
                    <div class="text-center">
                      <p class="text-xs font-medium text-muted-foreground">
                        Low
                      </p>
                      <p class="text-lg font-semibold tabular-nums">
                        {{ getMin(player.stats.points) }}
                      </p>
                    </div>
                    <div
                      v-if="
                        player.position !== 'K' && player.position !== 'DEF'
                      "
                      class="text-center"
                    >
                      <p class="text-xs font-medium text-muted-foreground">
                        Avg Rank
                      </p>
                      <p
                        v-if="getAverage(player.stats.ranks) !== 0"
                        class="mt-1 inline-flex min-w-10 items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums"
                        :class="[getValueColor(getAverage(player.stats.ranks))]"
                      >
                        {{ getAverage(player.stats.ranks) }}
                      </p>
                      <p
                        v-else
                        class="mt-0.5 text-sm font-semibold sm:text-base"
                      >
                        N/A
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  v-show="expanded[player.player_id]"
                  class="p-4 border-t bg-background"
                >
                  <div>
                    <div class="flex gap-2 pb-1 overflow-x-auto">
                      <div
                        v-for="(score, index) in player.stats?.points"
                        :key="`${player.player_id}-${index}`"
                        class="flex-1 p-3 text-center border rounded-md min-w-24 bg-muted/10"
                      >
                        <p class="text-xs text-muted-foreground text-nowrap">
                          {{ getRecentWeekLabel(index) }}
                        </p>
                        <p class="my-1 font-semibold tabular-nums">
                          {{ score }}
                        </p>
                        <p
                          v-if="
                            player.stats?.ranks[index] !== 999 &&
                            score !== 'DNP'
                          "
                          :class="[
                            player.stats?.ranks[index]
                              ? getValueColor(player.stats?.ranks[index])
                              : '',
                          ]"
                          class="mt-1.5 inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold text-nowrap"
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
                            <span class="text-muted-foreground"
                              >Rush Att:
                            </span>
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
                                        player.stats?.stats[index]?.["snaps"] ??
                                          0
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
                                        player.stats?.stats[index]?.["snaps"] ??
                                          0
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
                            <span class="text-muted-foreground"
                              >Pts Allow:
                            </span>
                            <span class="font-semibold"
                              >{{ player.stats?.stats[index]["pts_allow"] }}
                            </span>
                          </p>
                          <p>
                            <span class="text-muted-foreground"
                              >Yds Allow:
                            </span>
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
              </Card>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent v-if="!loading" value="news">
        <PlayerNewsFeed v-if="currentRoster" :posts="data" />
      </TabsContent>
    </Tabs>
  </Card>
</template>
