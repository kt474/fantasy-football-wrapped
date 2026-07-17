<script setup lang="ts">
import { maxBy, minBy } from "@/lib/collection";
import { createTableData } from "../../api/helper";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  ComputedRef,
  defineAsyncComponent,
} from "vue";
import { useElementVisibility } from "@vueuse/core";
import { useStore } from "../../store/store";
import {
  TableDataType,
  UserType,
  RosterType,
  PointsType,
} from "../../types/types";
import ScrollableTableCard from "../layout/ScrollableTableCard.vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import { getManagerDisplayName } from "@/lib/manager";
import {
  isLeagueFeature,
  isLeagueFeatureAvailable,
  normalizeLeagueFeature,
  type LeagueFeature,
} from "@/lib/features";
import Narratives from "../league_narratives/Narratives.vue";
import PreviousSeasonPrompt from "./PreviousSeasonPrompt.vue";

const PowerRankingData = defineAsyncComponent(
  () => import("../power_rankings/PowerRankingData.vue")
);
const ExpectedWinsCard = defineAsyncComponent(
  () => import("../expected_wins/ExpectedWinsCard.vue")
);
const ExpectedWinsChart = defineAsyncComponent(
  () => import("../expected_wins/ExpectedWinsChart.vue")
);
const ExpectedWinsChart2 = defineAsyncComponent(
  () => import("../expected_wins/ExpectedWinsChart2.vue")
);
const TransactionsChart = defineAsyncComponent(
  () => import("../roster_management/TransactionsChart.vue")
);
const Trades = defineAsyncComponent(
  () => import("../roster_management/Trades.vue")
);
const Waivers = defineAsyncComponent(
  () => import("../roster_management/Waivers.vue")
);
const StandingsChart = defineAsyncComponent(
  () => import("../standings/StandingsChart.vue")
);
const ManagementCard = defineAsyncComponent(
  () => import("../roster_management/ManagementCard.vue")
);
const RankingGraph = defineAsyncComponent(
  () => import("../roster_management/RankingGraph.vue")
);
const Playoffs = defineAsyncComponent(() => import("../playoffs/Playoffs.vue"));
const LeagueHistory = defineAsyncComponent(
  () => import("../league_history/LeagueHistory.vue")
);
const Projections = defineAsyncComponent(
  () => import("../power_rankings/Projections.vue")
);
const PlayoffPercentages = defineAsyncComponent(
  () => import("../playoffs/PlayoffPercentages.vue")
);
const WeeklyReport = defineAsyncComponent(
  () => import("../weekly_report/WeeklyReport.vue")
);
const Draft = defineAsyncComponent(() => import("../draft/Draft.vue"));
const TeamRanking = defineAsyncComponent(
  () => import("../power_rankings/TeamRanking.vue")
);
const CurrentTrends = defineAsyncComponent(() => import("./CurrentTrends.vue"));
const ScheduleStrength = defineAsyncComponent(
  () => import("../expected_wins/ScheduleStrength.vue")
);
const StartSitDashboard = defineAsyncComponent(
  () => import("../start_sit/StartSitDashboard.vue")
);
const ScheduleAnalysis = defineAsyncComponent(
  () => import("../expected_wins/ScheduleAnalysis.vue")
);
const Wrapped = defineAsyncComponent(() => import("../wrapped/Wrapped.vue"));
const FakeWrapped = defineAsyncComponent(
  () => import("../wrapped/FakeWrapped.vue")
);
const Intro = defineAsyncComponent(() => import("../home/Intro.vue"));

const ScheduleSimulator = defineAsyncComponent(
  () => import("../schedule_simulator/ScheduleSimulator.vue")
);

const TradeLab = defineAsyncComponent(
  () => import("../trade_lab/TradeLab.vue")
);

const tableOrder = ref("wins");
const showLeagueNews = ref(false);
const leagueNewsTrigger = ref<HTMLElement | null>(null);
const leagueNewsIsVisible = useElementVisibility(leagueNewsTrigger);
let leagueNewsIdleCallback: number | undefined;
let leagueNewsFallbackTimer: ReturnType<typeof window.setTimeout> | undefined;

const cancelPendingLeagueNews = () => {
  if (leagueNewsIdleCallback !== undefined) {
    window.cancelIdleCallback(leagueNewsIdleCallback);
    leagueNewsIdleCallback = undefined;
  }
  if (leagueNewsFallbackTimer !== undefined) {
    window.clearTimeout(leagueNewsFallbackTimer);
    leagueNewsFallbackTimer = undefined;
  }
};
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  points: PointsType[];
}>();
const store = useStore();
const showStandingsTab = computed(() => {
  return (
    store.currentTab === "Standings" || !isLeagueFeature(store.currentTab)
  );
});

const isActiveFeature = (feature: LeagueFeature) =>
  store.currentTab === feature &&
  isLeagueFeatureAvailable(feature, seasonType.value);

onMounted(() => {
  const savedCurrentTab = localStorage.getItem("currentTab");
  if (savedCurrentTab) {
    const currentTab = normalizeLeagueFeature(savedCurrentTab);
    store.currentTab = currentTab;
    if (currentTab !== savedCurrentTab) {
      localStorage.setItem("currentTab", currentTab);
    }
  }

});

watch(
  leagueNewsIsVisible,
  (isVisible) => {
    if (!isVisible) {
      cancelPendingLeagueNews();
      return;
    }
    if (showLeagueNews.value) return;

    const showNews = () => {
      leagueNewsIdleCallback = undefined;
      leagueNewsFallbackTimer = undefined;
      if (!leagueNewsIsVisible.value) return;
      showLeagueNews.value = true;
    };

    const requestIdleCallback = (
      window as unknown as {
        requestIdleCallback?: (callback: IdleRequestCallback) => number;
      }
    ).requestIdleCallback;

    if (requestIdleCallback) {
      // Do not use a timeout here: forcing this work during a swipe can stall
      // mobile Safari's main thread for a noticeable amount of time.
      leagueNewsIdleCallback = requestIdleCallback(showNews);
    } else {
      leagueNewsFallbackTimer = window.setTimeout(showNews, 250);
    }
  },
  { immediate: true }
);

onBeforeUnmount(cancelPendingLeagueNews);

const originalData = computed(() => {
  if (props.users && props.points) {
    return createTableData(
      props.users,
      props.rosters,
      props.points,
      medianScoring.value
    );
  }
  return [];
});

const sortedPropsTableData = computed<TableDataType[]>(() => {
  return [...originalData.value].sort((a: TableDataType, b: TableDataType) => {
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    return b.pointsFor - a.pointsFor;
  });
});

// sorted version of originalData
const tableData: ComputedRef<TableDataType[]> = computed(() => {
  const data = [...originalData.value];
  if (tableOrder.value === "wins") {
    return data.sort((a, b) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "points") {
    return data.sort((a, b) => {
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "pointsAgainst") {
    return data.sort((a, b) => {
      return b.pointsAgainst - a.pointsAgainst;
    });
  } else if (tableOrder.value === "rating") {
    return data.sort((a, b) => {
      return b.rating - a.rating;
    });
  } else if (tableOrder.value === "recordAgainstAll") {
    return data.sort((a, b) => {
      if (a.winsAgainstAll !== b.winsAgainstAll) {
        return b.winsAgainstAll - a.winsAgainstAll;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "medianRecord") {
    return data.sort((a, b) => {
      const aWins = medianScoring.value
        ? (a.headToHeadWins ?? 0)
        : a.winsWithMedian;
      const bWins = medianScoring.value
        ? (b.headToHeadWins ?? 0)
        : b.winsWithMedian;
      if (aWins !== bWins) {
        return bWins - aWins;
      }
      if (
        medianScoring.value &&
        (a.headToHeadTies ?? 0) !== (b.headToHeadTies ?? 0)
      ) {
        return (b.headToHeadTies ?? 0) - (a.headToHeadTies ?? 0);
      }
      return b.pointsFor - a.pointsFor;
    });
  }
  return data;
});

const mostWins = computed(() => {
  return maxBy(originalData.value, "wins")?.wins;
});
const mostLosses = computed(() => {
  return maxBy(originalData.value, "losses")?.losses;
});
const mostPoints = computed(() => {
  return maxBy(originalData.value, "pointsFor")?.pointsFor;
});
const leastPoints = computed(() => {
  return minBy(originalData.value, "pointsFor")?.pointsFor;
});
const mostPointsAgainst = computed(() => {
  return maxBy(originalData.value, "pointsAgainst")?.pointsAgainst;
});
const leastPointsAgainst = computed(() => {
  return minBy(originalData.value, "pointsAgainst")?.pointsAgainst;
});
const mostWinsAgainstAll = computed(() => {
  return maxBy(originalData.value, "winsAgainstAll")?.winsAgainstAll;
});
const mostLossesAgainstAll = computed(() => {
  return maxBy(originalData.value, "lossesAgainstAll")?.lossesAgainstAll;
});
const mostMedianWins = computed(() => {
  return maxBy(originalData.value, "winsWithMedian")?.winsWithMedian;
});
const mostMedianLosses = computed(() => {
  return maxBy(originalData.value, "lossesWithMedian")?.lossesWithMedian;
});
const mostHeadToHeadWins = computed(() => {
  return maxBy(originalData.value, "headToHeadWins")?.headToHeadWins;
});
const mostHeadToHeadLosses = computed(() => {
  return maxBy(originalData.value, "headToHeadLosses")?.headToHeadLosses;
});

const seasonType = computed(() => {
  return store.currentLeague
    ? store.currentLeague.seasonType
    : "";
});

const regularSeasonLength = computed(() => {
  if (store.currentLeague.status == "in_season") {
    return store.currentLeague.lastScoredWeek + 1;
  }
  return store.currentLeague.regularSeasonLength + 1;
});

const totalRosters = computed(() => {
  return store.currentLeague.totalRosters;
});

const medianScoring = computed(() => {
  if (store.currentLeague) {
    return store.currentLeague.medianScoring === 1;
  }
  return false;
});

const getTeamName = (tableDataItem: TableDataType) => {
  return getManagerDisplayName(tableDataItem, store.showUsernames);
};
</script>
<template>
  <div :class="['min-w-0', store.currentTab === 'Home' ? '' : 'mx-4']">
    <PreviousSeasonPrompt v-if="showStandingsTab && store.currentLeagueId" />
    <div
      v-if="showStandingsTab"
      class="grid h-full min-h-0 grid-cols-1 gap-4 mt-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]"
    >
      <ScrollableTableCard label="League standings" class="w-full">
        <TooltipProvider>
          <table
            v-if="tableData.length > 0"
            class="min-w-[760px] table-fixed text-sm text-left w-full rtl:text-right xl:min-w-0"
          >
            <colgroup>
              <col class="w-[30%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[14%]" />
              <col class="w-[16%]" />
              <col class="w-[16%]" />
            </colgroup>
            <thead class="text-xs uppercase bg-muted/50">
              <tr>
                <th
                  scope="col"
                  class="px-4 py-3 sm:px-6"
                >
                  Team name
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="tableOrder === 'wins' ? 'descending' : 'none'"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'wins'"
                        class="flex min-h-11 items-center text-left uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Record
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'wins'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Regular season wins and losses
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="tableOrder === 'points' ? 'descending' : 'none'"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'points'"
                        class="flex min-h-11 items-center text-left uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Points
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'points'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Total regular season points
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="
                    tableOrder === 'pointsAgainst' ? 'descending' : 'none'
                  "
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'pointsAgainst'"
                        class="flex min-h-11 w-20 items-center text-left uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Points Against
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'pointsAgainst'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Total regular season points against
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="
                    tableOrder === 'recordAgainstAll' ? 'descending' : 'none'
                  "
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'recordAgainstAll'"
                        class="flex min-h-11 w-20 items-center text-left uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        Record vs. All
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'recordAgainstAll'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="w-40 bg-muted-foreground">
                      Team record if each team played every other team each week
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th
                  scope="col"
                  class="px-2 py-0 sm:px-6 sm:py-3"
                  :aria-sort="
                    tableOrder === 'medianRecord' ? 'descending' : 'none'
                  "
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        @click="tableOrder = 'medianRecord'"
                        class="flex min-h-11 w-20 items-center text-left uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                      >
                        {{ medianScoring ? "H2H Record" : "Median Record" }}
                        <div>
                          <svg
                            class="w-3 h-3 ms-1.5"
                            :class="
                              tableOrder === 'medianRecord'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            "
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                            />
                          </svg>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="w-40 bg-muted-foreground">
                      <template v-if="medianScoring">
                        Head-to-head record from each team's scheduled weekly
                        matchup, excluding results against the league median.
                      </template>
                      <template v-else>
                        Team record where a win is awarded if a team's weekly
                        score is higher than the league median, and a loss is
                        added if the score is less than the median.
                      </template>
                    </TooltipContent>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in tableData"
                :key="index"
                class="border-b"
              >
                <th
                  scope="row"
                  class="px-4 py-3 font-medium sm:px-6"
                >
                  <div class="flex items-center min-w-0">
                    <img
                      alt="User avatar"
                      v-if="item.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="item.avatarImg"
                      @error="handleImageError"
                    />
                    <svg
                      v-else
                      class="w-8 h-8 shrink-0"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="-0.5 -0.5 21 21"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <p class="ml-2">{{ index + 1 }}.&nbsp;</p>
                    <p class="min-w-0 truncate">
                      {{ getTeamName(item) }}
                    </p>
                  </div>
                </th>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold': item.wins === mostWins,
                    'text-destructive font-semibold':
                      item.losses === mostLosses,
                  }"
                >
                  {{ item.wins }} - {{ item.losses }}
                  {{ item.ties != 0 ? `- ${item.ties}` : "" }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold': item.pointsFor === mostPoints,
                    'text-destructive font-semibold':
                      item.pointsFor === leastPoints,
                  }"
                >
                  {{ item.pointsFor }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold':
                      item.pointsAgainst === mostPointsAgainst,
                    'text-destructive font-semibold':
                      item.pointsAgainst === leastPointsAgainst,
                  }"
                >
                  {{ item.pointsAgainst }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold':
                      item.winsAgainstAll === mostWinsAgainstAll,
                    'text-destructive font-semibold':
                      item.lossesAgainstAll === mostLossesAgainstAll,
                  }"
                >
                  {{ item.winsAgainstAll }} -
                  {{ item.lossesAgainstAll }}
                </td>
                <td
                  class="px-2 py-3 sm:px-6"
                  :class="{
                    'text-primary font-semibold':
                      medianScoring
                        ? item.headToHeadWins === mostHeadToHeadWins
                        : item.winsWithMedian === mostMedianWins,
                    'text-destructive font-semibold':
                      medianScoring
                        ? item.headToHeadLosses === mostHeadToHeadLosses
                        : item.lossesWithMedian === mostMedianLosses,
                  }"
                >
                  <template v-if="medianScoring">
                    {{ item.headToHeadWins ?? 0 }} -
                    {{ item.headToHeadLosses ?? 0 }}
                    {{ item.headToHeadTies ? `- ${item.headToHeadTies}` : "" }}
                  </template>
                  <template v-else>
                    {{ item.winsWithMedian ? item.winsWithMedian : 0 }} -
                    {{ item.lossesWithMedian ? item.lossesWithMedian : 0 }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </TooltipProvider>
      </ScrollableTableCard>
      <div ref="leagueNewsTrigger" class="min-h-px min-w-0">
        <CurrentTrends
          v-if="showLeagueNews && seasonType !== 'Guillotine'"
          :tableData="tableData"
          class="h-full"
        />
      </div>
    </div>
    <StandingsChart
      v-if="showStandingsTab"
      :tableData="tableData"
      class="my-4"
    />
    <div v-if="store.currentTab === 'Power Rankings'">
      <PowerRankingData
        v-if="store.currentLeagueId"
        :tableData="tableData"
        :regularSeasonLength="regularSeasonLength ? regularSeasonLength : 15"
        :totalRosters="totalRosters"
        class="mt-4"
      />
      <PowerRankingData
        v-else-if="store.leagueInfo.length == 0"
        :tableData="tableData"
        :regularSeasonLength="15"
        :totalRosters="10"
        class="mt-4"
      />
      <Projections class="mt-4" />
      <TeamRanking
        v-if="seasonType !== 'Guillotine'"
        :tableData="tableData"
        class="my-4"
      />
    </div>
    <div v-if="store.currentTab === 'Expected Wins'">
      <div class="grid items-stretch grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        <ExpectedWinsCard
          :tableData="tableData"
          class="w-full h-full min-w-0"
        />
        <ExpectedWinsChart
          :tableData="tableData"
          class="w-full h-full min-w-0"
        />
      </div>
      <div class="grid items-stretch grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        <ExpectedWinsChart2
          :tableData="tableData"
          class="w-full h-full min-w-0"
        />
        <ScheduleStrength
          :tableData="tableData"
          class="w-full h-full min-w-0"
        />
      </div>
      <ScheduleAnalysis :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Roster Management'">
      <div class="grid items-stretch grid-cols-1 gap-4 mt-4 xl:grid-cols-2">
        <ManagementCard
          :tableData="tableData"
          class="w-full h-full min-w-0 overflow-auto"
        />
        <RankingGraph :tableData="tableData" class="w-full h-full min-w-0" />
      </div>
      <TransactionsChart class="mt-4" />
      <Trades class="mt-4" />
      <Waivers class="mt-4" />
    </div>
    <div class="w-full" v-if="store.currentTab === 'Playoffs'">
      <PlayoffPercentages :propsTableData="sortedPropsTableData" class="mt-4" />
      <Playoffs class="mb-4" :tableData="tableData" />
    </div>
    <div
      v-if="isActiveFeature('Weekly Report')"
    >
      <WeeklyReport
        v-if="store.currentLeagueId"
        :tableData="tableData"
        :regular-season-length="regularSeasonLength ? regularSeasonLength : 15"
      />
      <WeeklyReport v-else :tableData="tableData" :regular-season-length="15" />
    </div>
    <div
      v-if="isActiveFeature('Season Forecast')"
    >
      <ScheduleSimulator class="my-4" :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Trade Lab'">
      <TradeLab class="my-4" :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Draft'">
      <Draft class="my-4" />
    </div>
    <div v-if="store.currentTab === 'Start/Sit'">
      <StartSitDashboard :tableData="tableData" class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'League History'">
      <LeagueHistory :tableData="tableData" />
    </div>
    <div
      v-if="isActiveFeature('Manager Profiles')"
    >
      <Narratives :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Wrapped'">
      <Wrapped
        v-if="
          store.currentLeagueId &&
          store.currentLeague?.season === '2025' &&
          seasonType !== 'Guillotine'
        "
        :tableData="originalData"
      />
      <div
        class="p-4"
        v-else-if="
          store.currentLeague?.season === '2026'
        "
      >
        <p>Come back after the season is complete!</p>
      </div>
      <FakeWrapped v-else />
    </div>
    <div v-if="store.currentTab === 'Home'">
      <Intro>
        <template #header>
          <TransactionsChart />
          <Waivers class="text-left" />
          <Projections />
          <ExpectedWinsChart :tableData="tableData" />
          <PowerRankingData
            class="mb-4"
            :tableData="tableData"
            :regularSeasonLength="15"
            :totalRosters="10"
          />
        </template>
      </Intro>
    </div>
  </div>
</template>
<style scoped>
@media (min-width: 1280px) {
  .custom-height {
    height: 39.1rem;
  }
}
.light-custom-bg-color {
  background-color: hsl(var(--muted));
}
.dark-custom-bg-color {
  background-color: hsl(var(--muted-foreground));
}
</style>
