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
  buildStartSitInsights,
  getOrderedRosterPlayerEntries,
  getRecentStartSitWeekLabel,
  getStartingRosterSlots,
  getStartSitWeek,
  type StartSitInsight,
  START_SIT_CONCURRENCY,
} from "./startSitLoader";
import {
  getTradeValueWeek,
  loadLeaguePlayerValues,
} from "@/lib/leagueTradeValues";
import type { TradeFinderPlayer } from "@/lib/tradeFinder";
import PlayerNewsFeed from "./PlayerNewsFeed.vue";
import { mapWithConcurrency } from "@/lib/async";
import { buildRosterNews, type NewsPost } from "./playerNews";
import {
  loadDemoLeague,
  loadDemoStartSit,
  type DemoLeagueFixtures,
} from "@/data/demo/loaders";
import {
  getLeagueAnalyticsProperties,
  trackPremiumJourneyStep,
} from "@/lib/analytics";

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

type StartSitPlayerValue = Pick<
  TradeFinderPlayer,
  "playerId" | "tradeValue" | "positionRank"
>;

type StartSitRecommendation = StartSitInsight & {
  start: StartSitPlayer;
  sit: StartSitPlayer;
};

const data = ref<NewsPost[]>([]);
const currentRoster = ref<StartSitRoster | null>(null);
const loading = ref<boolean>(false);
const newsLoading = ref<boolean>(false);
const newsError = ref<string | null>(null);
const expanded = ref<Record<string, boolean>>({});
const store = useStore();
const playerDirectoryCache = new Map<string, Player>();
const playerDataCache = new Map<string, Promise<StartSitPlayer>>();
let loadRequestId = 0;
const demoUsers = shallowRef<DemoLeagueFixtures["fakeUsers"]>([]);
const demoRosters = shallowRef<StartSitRoster[]>([]);
const demoPosts = shallowRef<NewsPost[]>([]);
const demoValues = shallowRef<StartSitPlayerValue[]>([]);
const playerValues = shallowRef<Map<string, StartSitPlayerValue>>(new Map());
const valuesLoading = ref(false);
const valueAccess = ref<"preview" | "premium" | null>(null);
let valueLoadRequestId = 0;
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
  demoValues.value = startSit.fakeStartSitValues as StartSitPlayerValue[];
};

const toggle = (id: string) => {
  expanded.value[id] = !expanded.value[id];
};

const numberValues = (arr: Array<number | string | undefined>) =>
  arr
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item !== 999);

const getAverage = (arr: Array<number | string | undefined>) => {
  const numbers = numberValues(arr);
  if (numbers.length === 0) return 0;

  const sum = numbers.reduce((total, value) => total + value, 0);
  return Math.round((sum * 100) / numbers.length) / 100;
};

const getMax = (arr: Array<number | string | undefined>) => {
  const numbers = numberValues(arr);
  return numbers.length > 0 ? max(numbers) : 0;
};

const getMin = (arr: Array<number | string | undefined>) => {
  const numbers = numberValues(arr);
  return numbers.length > 0 ? (min(numbers) ?? 0) : 0;
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

const formatSignedNumber = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;

const getBadgePaletteClass = (tier: number) => {
  if (tier === 1) return "performance-excellent";
  if (tier === 2) return "performance-good";
  if (tier === 3) return "performance-average";
  if (tier === 4) return "performance-poor";
  return "performance-bad";
};

const getConfidenceClass = (
  confidence: StartSitRecommendation["confidence"]
) => {
  if (confidence === "Strong start") return getBadgePaletteClass(1);
  if (confidence === "Start") return getBadgePaletteClass(2);
  return getBadgePaletteClass(3);
};

const getPlayerValue = (player: StartSitPlayer) =>
  playerValues.value.get(player.player_id);

const getPositionRankLabel = (player: StartSitPlayer) => {
  const rank = getPlayerValue(player)?.positionRank;
  return player.position && typeof rank === "number" && rank > 0
    ? `${player.position}${rank}`
    : "N/A";
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

  const playersById = new Map(
    currentRoster.value.players.map((player) => [player.player_id, player])
  );
  const insights = buildStartSitInsights(
    currentRoster.value.players.map((player) => ({
      id: player.player_id,
      position: player.position,
      rosterSlot: player.rosterSlot,
      projection: getProjectionValue(player),
      recentAverage: getAverage(player.stats.points),
      recentFloor: getMin(player.stats.points),
      averageRank: getAverage(player.stats.ranks),
      tradeValue: getPlayerValue(player)?.tradeValue,
    })),
    activeStarterCount.value
  );

  return insights.flatMap((insight) => {
    const start = playersById.get(insight.startId);
    const sit = playersById.get(insight.sitId);
    return start && sit ? [{ ...insight, start, sit }] : [];
  });
});

const hasCurrentRosterValues = computed(
  () =>
    currentRoster.value?.players.some((player) =>
      playerValues.value.has(player.player_id)
    ) ?? false
);

const lineupSummaryMetrics = computed(() => {
  const starterProjection =
    currentRoster.value?.players
      .slice(0, activeStarterCount.value)
      .reduce((total, player) => total + getProjectionValue(player), 0) ?? 0;
  const bestEdge = Math.max(
    0,
    ...startSitRecommendations.value.map(({ projectionGap }) => projectionGap)
  );

  return [
    { label: "Starter projection", value: starterProjection.toFixed(1) },
    { label: "Calls", value: String(startSitRecommendations.value.length) },
    {
      label: "Best edge",
      value: bestEdge > 0 ? `+${bestEdge.toFixed(1)}` : "—",
    },
  ];
});

const getRecommendationReason = (recommendation: StartSitRecommendation) => {
  if (recommendation.valueGap === null) {
    return "Weekly projection and recent form create the edge.";
  }
  if (recommendation.projectionGap >= 0.75 && recommendation.valueGap >= 6) {
    return "The weekly projection and league adjusted player value agree.";
  }
  if (recommendation.projectionGap >= 0.75 && recommendation.valueGap <= -6) {
    return `${getPlayerLabel(recommendation.sit)} still holds the stronger league adjusted value, so treat this as a matchup play.`;
  }
  if (recommendation.valueGap >= 6) {
    return "The weekly call is close; Premium's league adjusted player value breaks the tie.";
  }
  return "Projection, recent form, and league adjusted value point to a narrow edge.";
};

const trackValuesUpgradeClick = () => {
  trackPremiumJourneyStep("premium_cta_clicked", {
    feature: "start_sit",
    cta: "add_player_value_context",
    source: "start_sit_lineup_check",
    ...getLeagueAnalyticsProperties(store.currentLeague),
  });
};

const rosterNews = computed(() =>
  buildRosterNews(
    data.value,
    (currentRoster.value?.players ?? []).map((player, index) => ({
      ...player,
      rosterSlot:
        player.rosterSlot ??
        (index < activeStarterCount.value ? "STARTER" : "BN"),
    }))
  )
);

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

const loadStartSitValues = async () => {
  const requestId = ++valueLoadRequestId;
  valuesLoading.value = true;
  playerValues.value = new Map();
  valueAccess.value = null;

  try {
    if (store.leagueIds.length === 0) {
      if (demoValues.value.length === 0) {
        await loadDemoData();
      }
      if (requestId === valueLoadRequestId) {
        playerValues.value = new Map(
          demoValues.value.map((player) => [player.playerId, player])
        );
        valueAccess.value = "premium";
      }
      return;
    }

    const league = store.currentLeague;
    if (!league) {
      playerValues.value = new Map();
      valueAccess.value = null;
      return;
    }

    const result = await loadLeaguePlayerValues({
      league,
      tableData: props.tableData,
      selectedWeek: getTradeValueWeek(league),
      showUsernames: store.showUsernames,
      dynastyPerspective: "balanced",
    });
    if (requestId === valueLoadRequestId) {
      valueAccess.value = result.access;
      playerValues.value =
        result.access === "premium"
          ? new Map(
              result.rankings.map(({ playerId, tradeValue, positionRank }) => [
                playerId,
                { playerId, tradeValue, positionRank },
              ])
            )
          : new Map();
    }
  } catch (error) {
    console.warn("Unable to add player values to Start/Sit:", error);
    if (requestId === valueLoadRequestId) {
      playerValues.value = new Map();
      valueAccess.value = null;
    }
  } finally {
    if (requestId === valueLoadRequestId) {
      valuesLoading.value = false;
    }
  }
};

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

const loadRosterNews = async (requestId: number, playerNames: string[]) => {
  data.value = [];
  newsError.value = null;
  newsLoading.value = true;
  const result = await getPlayerNews(playerNames);
  if (requestId !== loadRequestId) return;

  data.value = result.items
    .map((item) => item.post as NewsPost | undefined)
    .filter((post): post is NewsPost => Boolean(post));
  newsError.value = result.error;
  newsLoading.value = false;
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
      newsError.value = null;
      newsLoading.value = false;
      return;
    }

    const currentLeague = store.currentLeague;
    const selectedManager = currentManager.value;
    if (!currentLeague || !selectedManager) {
      currentRoster.value = null;
      data.value = [];
      newsLoading.value = false;
      return;
    }

    const selectedTeam = props.tableData.find(
      (team) => team.rosterId === selectedManager.rosterId
    );
    if (!selectedTeam) {
      currentRoster.value = null;
      data.value = [];
      newsLoading.value = false;
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
    const playerNames = playerEntries.flatMap((entry) => {
      const name = playerLookupMap.get(entry.playerId)?.name;
      return name ? [name] : [];
    });
    void loadRosterNews(requestId, playerNames);

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

    if (requestId !== loadRequestId) {
      return;
    }

    currentRoster.value = {
      id: selectedManager.rosterId,
      players,
    };
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

onMounted(async () => {
  if (store.leagueIds.length === 0) {
    await loadDemoData();
    currentManager.value = managers.value[0];
  }
  await Promise.all([loadSelectedRoster(), loadStartSitValues()]);
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

watch(
  () => [
    store.currentLeagueId,
    store.currentLeague?.lastUpdated,
    store.showUsernames,
  ],
  loadStartSitValues,
  { flush: "post" }
);
</script>
<template>
  <Card class="p-4 mb-4 md:p-6">
    <Tabs default-value="roster">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p class="text-2xl font-semibold tracking-tight">Start/Sit</p>
        <TabsList>
          <TabsTrigger value="roster">Lineup</TabsTrigger>
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
        <div v-if="currentRoster">
          <div
            class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)]"
          >
            <aside class="xl:sticky xl:top-4 xl:col-start-2">
              <div class="mb-3">
                <h2 class="text-2xl font-semibold">Player Comparisons</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  Only eligible, actionable swaps appear here.
                </p>
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
                      <p
                        class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md"
                        :class="getConfidenceClass(recommendation.confidence)"
                      >
                        {{ recommendation.confidence }}
                      </p>
                      <p class="mt-2 font-semibold truncate">
                        {{ getPlayerLabel(recommendation.start) }}
                      </p>
                      <p class="mt-0.5 text-sm truncate text-muted-foreground">
                        Start over {{ getPlayerLabel(recommendation.sit) }}
                      </p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-lg font-semibold tabular-nums">
                        {{ formatSignedNumber(recommendation.projectionGap) }}
                      </p>
                      <p class="text-xs text-muted-foreground">projected pts</p>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-px border-t bg-border/60">
                    <div
                      v-for="player in [
                        recommendation.start,
                        recommendation.sit,
                      ]"
                      :key="player.player_id"
                      class="min-w-0 px-4 py-3 bg-card"
                    >
                      <p class="text-xs font-semibold truncate">
                        {{ getPlayerLabel(player) }}
                      </p>
                      <p class="mt-0.5 text-xs truncate text-muted-foreground">
                        {{ getPlayerMatchupLabel(player) }}
                      </p>
                      <div
                        class="grid gap-3 mt-2"
                        :class="
                          getPlayerValue(player) ? 'grid-cols-3' : 'grid-cols-2'
                        "
                      >
                        <div>
                          <p class="text-xs font-medium text-muted-foreground">
                            Proj
                          </p>
                          <p class="font-semibold tabular-nums">
                            {{ getProjectionValue(player).toFixed(1) }}
                          </p>
                        </div>
                        <div>
                          <p class="text-xs font-medium text-muted-foreground">
                            Avg
                          </p>
                          <p class="font-semibold tabular-nums">
                            {{ getAverage(player.stats.points) }}
                          </p>
                        </div>
                        <div v-if="getPlayerValue(player)">
                          <p class="text-xs font-medium text-muted-foreground">
                            Value
                          </p>
                          <p class="font-semibold tabular-nums">
                            {{ getPlayerValue(player)?.tradeValue }}
                          </p>
                          <p class="text-[10px] text-muted-foreground">
                            {{ getPositionRankLabel(player) }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p
                    class="px-4 py-3 text-xs leading-5 border-t text-muted-foreground bg-muted/15"
                  >
                    {{ getRecommendationReason(recommendation) }}
                  </p>
                </Card>
              </div>
              <Card v-else class="p-4">
                <p class="font-medium">Your lineup looks right.</p>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">
                  No eligible bench player has enough of an edge to recommend a
                  change.
                </p>
              </Card>
              <section class="p-4 mt-4 border rounded-lg bg-muted/15">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-sm font-semibold">Lineup check summary</p>
                  <Badge
                    v-if="valuesLoading"
                    variant="outline"
                    class="w-fit shrink-0"
                  >
                    Adding values…
                  </Badge>
                  <Badge
                    v-else-if="hasCurrentRosterValues"
                    variant="outline"
                    class="w-fit shrink-0"
                  >
                    Premium context applied
                  </Badge>
                </div>
                <div
                  class="grid grid-cols-3 gap-px mt-3 overflow-hidden border rounded-md bg-border"
                >
                  <div
                    v-for="metric in lineupSummaryMetrics"
                    :key="metric.label"
                    class="p-3 bg-card"
                  >
                    <p class="text-[11px] font-medium text-muted-foreground">
                      {{ metric.label }}
                    </p>
                    <p class="mt-1 text-lg font-semibold tabular-nums">
                      {{ metric.value }}
                    </p>
                  </div>
                </div>
                <p class="mt-3 text-xs leading-5 text-muted-foreground">
                  <template v-if="hasCurrentRosterValues">
                    Weekly calls combine projections, recent form, and Premium's
                    league adjusted player values.
                  </template>
                  <template v-else>
                    Weekly calls use projections and recent form. Premium adds
                    league adjusted player value to settle close decisions.
                  </template>
                </p>
                <router-link
                  v-if="valueAccess === 'preview' && !valuesLoading"
                  :to="{
                    path: '/account',
                    query: {
                      ...$route.query,
                      intent: 'player_values',
                      upgrade_source: 'start_sit_lineup_check',
                    },
                  }"
                  class="inline-flex items-center mt-3 text-xs font-semibold text-primary hover:underline"
                  @click="trackValuesUpgradeClick"
                >
                  Add Premium context
                </router-link>
              </section>
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
                <div
                  v-if="index === activeStarterCount"
                  class="w-full mt-5 mb-3"
                >
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
                    <div class="flex justify-between w-full min-w-0 gap-3">
                      <div class="min-w-0">
                        <p class="font-semibold truncate">
                          {{ player.name ? player.name : player.team }}
                        </p>
                        <p class="mt-1 text-sm text-muted-foreground">
                          {{ getPlayerMatchupLabel(player) }}
                        </p>
                        <div
                          v-if="getPlayerValue(player)"
                          class="flex flex-wrap gap-1.5 mt-2"
                        >
                          <Badge
                            variant="outline"
                            class="h-5 px-1.5 text-[10px]"
                          >
                            Value {{ getPlayerValue(player)?.tradeValue }}
                          </Badge>
                          <Badge
                            variant="outline"
                            class="h-5 px-1.5 text-[10px]"
                          >
                            {{ getPositionRankLabel(player) }}
                          </Badge>
                        </div>
                      </div>
                      <div class="flex items-start gap-2 sm:gap-4 shrink-0">
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
                      <p
                        class="hidden text-xs font-semibold uppercase sm:block"
                      >
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
                          :class="[
                            getValueColor(getAverage(player.stats.ranks)),
                          ]"
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
                              <span class="text-muted-foreground"
                                >Pass Yd:
                              </span>
                              <span class="font-semibold">{{
                                player.stats?.stats[index]["pass_yd"]
                              }}</span>
                            </p>
                            <p>
                              <span class="text-muted-foreground"
                                >Pass Td:
                              </span>
                              <span class="font-semibold">{{
                                player.stats?.stats[index]["pass_td"] ?? 0
                              }}</span>
                            </p>
                            <p>
                              <span class="text-muted-foreground"
                                >Rush Yd:
                              </span>
                              <span class="font-semibold">{{
                                player.stats?.stats[index]["rush_yd"]
                              }}</span>
                            </p>
                            <p>
                              <span class="text-muted-foreground"
                                >Rush Td:
                              </span>
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
                              <span class="text-muted-foreground"
                                >Rush Yd:
                              </span>
                              <span class="font-semibold">{{
                                player.stats?.stats[index]["rush_yd"]
                              }}</span>
                            </p>
                            <p>
                              <span class="text-muted-foreground"
                                >Rush Td:
                              </span>
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
                              <span class="text-muted-foreground"
                                >Rec Yd:
                              </span>
                              <span class="font-semibold">{{
                                player.stats?.stats[index]["rec_yd"]
                                  ? player.stats?.stats[index]["rec_yd"]
                                  : 0
                              }}</span>
                            </p>
                            <p>
                              <span class="text-muted-foreground">
                                Snaps:
                              </span>
                              <span class="font-semibold"
                                >{{
                                  player.stats?.stats[index]?.["team_snaps"]
                                    ? (
                                        (Number(
                                          player.stats?.stats[index]?.[
                                            "snaps"
                                          ] ?? 0
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
                              <span class="text-muted-foreground"
                                >Rec Yd:
                              </span>
                              <span class="font-semibold">{{
                                player.stats?.stats[index]["rec_yd"]
                              }}</span>
                            </p>
                            <p>
                              <span class="text-muted-foreground"
                                >Rec Td:
                              </span>
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
                                          player.stats?.stats[index]?.[
                                            "snaps"
                                          ] ?? 0
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
        </div>
      </TabsContent>
      <TabsContent v-if="!loading" value="news">
        <PlayerNewsFeed
          v-if="currentRoster"
          :news="rosterNews"
          :posts="data"
          :loading="newsLoading"
          :error="newsError"
        />
      </TabsContent>
    </Tabs>
  </Card>
</template>
