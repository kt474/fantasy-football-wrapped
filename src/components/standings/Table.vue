<script setup lang="ts">
import { maxBy, minBy } from "lodash";
import { fakeRosters, fakeUsers, createTableData } from "../../api/helper";
import { computed, onMounted, ref, ComputedRef } from "vue";
import { useStore } from "../../store/store";
import {
  TableDataType,
  UserType,
  RosterType,
  PointsType,
} from "../../types/types";
import PowerRankingData from "../power_rankings/PowerRankingData.vue";
import ExpectedWinsCard from "../expected_wins/ExpectedWinsCard.vue";
import ExpectedWinsChart from "../expected_wins/ExpectedWinsChart.vue";
import ExpectedWinsChart2 from "../expected_wins/ExpectedWinsChart2.vue";
import BestManagerCard from "../standings/BestManagerCard.vue";
import WorstManagerCard from "../standings/WorstManagerCard.vue";
import TransactionsCard from "../standings/TransactionsCard.vue";
import TransactionsChart from "../roster_management/TransactionsChart.vue";
import Trades from "../roster_management/Trades.vue";
import Waivers from "../roster_management/Waivers.vue";
import StandingsChart from "../standings/StandingsChart.vue";
import ManagementCard from "../roster_management/ManagementCard.vue";
import RankingGraph from "../roster_management/RankingGraph.vue";
import Playoffs from "../playoffs/Playoffs.vue";
import LeagueHistory from "../league_history/LeagueHistory.vue";
import Projections from "../power_rankings/Projections.vue";
import PlayoffPercentages from "../playoffs/PlayoffPercentages.vue";
import WeeklyReport from "../weekly_report/WeeklyReport.vue";
import Draft from "../draft/Draft.vue";
import TeamRanking from "../power_rankings/TeamRanking.vue";
import CurrentTrends from "./CurrentTrends.vue";
import ScheduleStrength from "../expected_wins/ScheduleStrength.vue";
import PlayerNews from "../start_sit/PlayerNews.vue";
import ScheduleAnalysis from "../expected_wins/ScheduleAnalysis.vue";
import Wrapped from "../wrapped/Wrapped.vue";
import FakeWrapped from "../wrapped/FakeWrapped.vue";
import Intro from "../home/Intro.vue";
import Card from "../ui/card/Card.vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tableOrder = ref("wins");
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  points: PointsType[];
}>();
const store = useStore();

interface savedData {
  [key: string]: TableDataType[];
}

onMounted(() => {
  if (localStorage.currentTab) {
    store.currentTab = localStorage.currentTab;
  }
});

const originalData = computed(() => {
  if (localStorage.originalData && store.currentLeagueId) {
    const savedData: savedData = JSON.parse(localStorage.originalData);
    if (savedData[store.currentLeagueId]) {
      return savedData[store.currentLeagueId];
    }
  }
  if (props.users && props.points) {
    let combinedPoints = createTableData(
      props.users,
      props.rosters,
      props.points,
      medianScoring.value
    );
    if (store.currentLeagueId) {
      let savedData: Record<string, TableDataType[]> = {};
      if (localStorage.originalData) {
        savedData = JSON.parse(localStorage.originalData);
      }
      savedData[store.currentLeagueId] = combinedPoints;
      localStorage.originalData = JSON.stringify(savedData);
    }
    return combinedPoints;
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
    return originalData.value.sort((a, b) => {
      if (a.winsWithMedian !== b.winsWithMedian) {
        return b.winsWithMedian - a.winsWithMedian;
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

const mostTransactions = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].transactions
    : {};
});

const seasonType = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].seasonType
    : "";
});

const regularSeasonLength = computed(() => {
  if (store.leagueInfo[store.currentLeagueIndex].status == "in_season") {
    return store.leagueInfo[store.currentLeagueIndex].lastScoredWeek + 1;
  }
  return store.leagueInfo[store.currentLeagueIndex].regularSeasonLength + 1;
});

const totalRosters = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex].totalRosters;
});

const medianScoring = computed(() => {
  if (store.leagueInfo[store.currentLeagueIndex]) {
    return store.leagueInfo[store.currentLeagueIndex].medianScoring === 1;
  }
  return false;
});

const getTeamName = (tableDataItem: TableDataType) => {
  if (store.showUsernames) {
    return tableDataItem.username ? tableDataItem.username : `Ghost Roster`;
  }
  return tableDataItem.name ? tableDataItem.name : `Ghost Roster`;
};
</script>
<template>
  <div :class="['min-w-0', store.currentTab === 'Home' ? '' : 'mx-4']">
    <div
      v-if="store.currentTab === 'Standings'"
      class="flex flex-col h-full min-h-0 mt-4 xl:flex-row xl:justify-between"
    >
      <Card class="relative w-full min-w-0 mx-auto overflow-x-auto xl:w-3/4">
        <TooltipProvider>
          <table
            v-if="tableData.length > 0"
            class="w-full text-sm text-left rtl:text-right"
          >
            <thead class="text-xs uppercase bg-secondary">
              <tr>
                <th scope="col" class="px-4 py-3 sm:px-6">Team name</th>
                <th scope="col" class="px-2 sm:px-6">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <div
                        @click="tableOrder = 'wins'"
                        class="flex items-center uppercase cursor-pointer"
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Regular season wins and losses
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th scope="col" class="px-2 sm:px-6">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <div
                        @click="tableOrder = 'points'"
                        class="flex items-center uppercase cursor-pointer"
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Total regular season points
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th scope="col" class="px-2 sm:px-6">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <div
                        @click="tableOrder = 'pointsAgainst'"
                        class="flex items-center w-20 text-left uppercase cursor-pointer"
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="bg-muted-foreground">
                      Total regular season points against
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th scope="col" class="px-2 py-3 sm:px-6">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <div
                        @click="tableOrder = 'recordAgainstAll'"
                        class="flex items-center w-20 text-left uppercase cursor-pointer"
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="w-40 bg-muted-foreground">
                      Team record if each team played every other team each week
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th scope="col" class="px-2 py-3 sm:px-6">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <div
                        @click="tableOrder = 'medianRecord'"
                        class="flex items-center w-20 text-left uppercase cursor-pointer"
                      >
                        Median Record
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="w-40 bg-muted-foreground">
                      Team record where a win is awarded if a team's weekly
                      score is higher than the league median, and a loss is
                      added if the score is less than the median.
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
                  class="px-4 py-3 font-medium sm:px-6 whitespace-nowrap"
                >
                  <div class="flex items-center">
                    <img
                      alt="User avatar"
                      v-if="item.avatarImg"
                      class="w-8 h-8 rounded-full"
                      :src="item.avatarImg"
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
                    <p class="ml-2">{{ index + 1 }}.&nbsp;</p>
                    <p class="truncate max-w-36 sm:max-w-48">
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
                      item.winsWithMedian === mostMedianWins,
                    'text-destructive font-semibold':
                      item.lossesWithMedian === mostMedianLosses,
                  }"
                >
                  {{ item.winsWithMedian ? item.winsWithMedian : 0 }} -
                  {{ item.lossesWithMedian ? item.lossesWithMedian : 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </TooltipProvider>
      </Card>
      <div class="flex flex-col flex-1 w-full mt-4 xl:w-fit xl:ml-4 xl:mt-0">
        <CurrentTrends :tableData="tableData" />
        <Card class="flex-1 px-2 py-4 mt-4 md:w-auto min-w-56 min-h-56">
          <BestManagerCard
            :rosters="store.currentLeagueId ? props.rosters : fakeRosters"
            :users="store.currentLeagueId ? props.users : fakeUsers"
            class="mt-0.5"
          />
          <WorstManagerCard
            :rosters="store.currentLeagueId ? props.rosters : fakeRosters"
            :users="store.currentLeagueId ? props.users : fakeUsers"
            class="mt-4"
          />
          <TransactionsCard
            :users="store.currentLeagueId ? props.users : fakeUsers"
            :mostTransactions="
              store.currentLeagueId ? mostTransactions : { 1: 24 }
            "
            :rosters="store.currentLeagueId ? props.rosters : fakeRosters"
            class="mt-4"
          />
        </Card>
      </div>
    </div>
    <StandingsChart
      v-if="store.currentTab === 'Standings'"
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
      <div class="flex flex-wrap lg:flex-nowrap">
        <ExpectedWinsCard :tableData="tableData" class="mt-4" />
        <ExpectedWinsChart :tableData="tableData" class="mt-4 lg:ml-4" />
      </div>
      <div class="flex flex-wrap md:flex-nowrap">
        <ExpectedWinsChart2 :tableData="tableData" class="mt-4" />
        <ScheduleStrength :tableData="tableData" class="mt-4 md:ml-4" />
      </div>
      <ScheduleAnalysis :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Roster Management'">
      <div class="flex flex-wrap md:flex-nowrap">
        <ManagementCard :tableData="tableData" class="mt-4" />
        <RankingGraph :tableData="tableData" class="mt-4 md:ml-4" />
      </div>
      <TransactionsChart class="mt-4" />
      <Trades class="mt-4" />
      <Waivers class="mt-4" />
    </div>
    <div class="w-full" v-if="store.currentTab === 'Playoffs'">
      <PlayoffPercentages :propsTableData="sortedPropsTableData" class="mt-4" />
      <Playoffs class="mb-4" :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Weekly Report'">
      <WeeklyReport
        v-if="store.currentLeagueId"
        :tableData="tableData"
        :regular-season-length="regularSeasonLength ? regularSeasonLength : 15"
      />
      <WeeklyReport v-else :tableData="tableData" :regular-season-length="15" />
    </div>
    <div v-if="store.currentTab === 'Draft'">
      <Draft class="my-4" />
    </div>
    <div v-if="store.currentTab === 'Start/Sit'">
      <PlayerNews :tableData="tableData" class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'League History'">
      <LeagueHistory :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'Wrapped'">
      <Wrapped v-if="store.currentLeagueId" :tableData="originalData" />
      <FakeWrapped v-else />
    </div>

    <div v-if="store.currentTab === 'Home'">
      <Intro>
        <template #header>
          <PowerRankingData
            class="mt-4"
            :tableData="tableData"
            :regularSeasonLength="15"
            :totalRosters="10"
          />
          <TransactionsChart />
          <Waivers class="text-left" />
          <Projections />
          <ExpectedWinsChart :tableData="tableData" />
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
  background-color: #eff0f2;
}
.dark-custom-bg-color {
  background-color: #374151;
}
</style>
