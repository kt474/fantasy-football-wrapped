<script setup lang="ts">
import { maxBy, minBy } from "lodash";
import { fakeRosters, fakeUsers, createTableData } from "../../api/helper";
import { computed, onMounted, ref } from "vue";
import { useStore } from "../../store/store";
import { TableDataType, UserType, RosterType } from "../../api/types";
import PowerRankingData from "../power_rankings/PowerRankingData.vue";
import ExpectedWinsCard from "../expected_wins/ExpectedWinsCard.vue";
import ExpectedWinsChart from "../expected_wins/ExpectedWinsChart.vue";
import ExpectedWinsChart2 from "../expected_wins/ExpectedWinsChart2.vue";
import WinnerCard from "../standings/WinnerCard.vue";
import BestManagerCard from "../standings/BestManagerCard.vue";
import WorstManagerCard from "../standings/WorstManagerCard.vue";
import TransactionsCard from "../standings/TransactionsCard.vue";
import TransactionsChart from "../roster_management/TransactionsChart.vue";
import Trades from "../roster_management/Trades.vue";
import StandingsChart from "../standings/StandingsChart.vue";
import ManagementCard from "../roster_management/ManagementCard.vue";
import RankingGraph from "../roster_management/RankingGraph.vue";
import Playoffs from "../playoffs/Playoffs.vue";
import LeagueHistory from "../league_history/LeagueHistory.vue";
import Tabs from "../util/Tabs.vue";
import Projections from "../power_rankings/Projections.vue";
import PlayoffPercentages from "../playoffs/PlayoffPercentages.vue";
import WeeklyReport from "../weekly_report/WeeklyReport.vue";
import Draft from "../draft/Draft.vue";
import TeamRanking from "../power_rankings/TeamRanking.vue";

const tableOrder = ref("wins");
const hover = ref("");
const props = defineProps<{
  users: UserType[];
  rosters: RosterType[];
  points: Array<object>;
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
      let savedData: any = {};
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

const sortedPropsTableData = computed(() => {
  return originalData.value.sort((a: any, b: any) => {
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    return b.pointsFor - a.pointsFor;
  });
});

// sorted version of originalData
const tableData: any = computed(() => {
  if (tableOrder.value === "wins") {
    return originalData.value.sort((a: any, b: any) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "points") {
    return originalData.value.sort((a: any, b: any) => {
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "pointsAgainst") {
    return originalData.value.sort((a: any, b: any) => {
      return b.pointsAgainst - a.pointsAgainst;
    });
  } else if (tableOrder.value === "rating") {
    return originalData.value.sort((a: any, b: any) => {
      return b.rating - a.rating;
    });
  } else if (tableOrder.value === "recordAgainstAll") {
    return originalData.value.sort((a: any, b: any) => {
      if (a.winsAgainstAll !== b.winsAgainstAll) {
        return b.winsAgainstAll - a.winsAgainstAll;
      }
      return b.pointsFor - a.pointsFor;
    });
  } else if (tableOrder.value === "medianRecord") {
    return originalData.value.sort((a: any, b: any) => {
      if (a.winsWithMedian !== b.winsWithMedian) {
        return b.winsWithMedian - a.winsWithMedian;
      }
      return b.pointsFor - a.pointsFor;
    });
  }
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

const leagueWinner = computed(() => {
  if (store.leagueInfo[store.currentLeagueIndex]) {
    if (store.leagueInfo[store.currentLeagueIndex].status !== "complete") {
      const projectedWinner = tableData.value.reduce((max: any, obj: any) =>
        obj.winsAgainstAll > max.winsAgainstAll ? obj : max
      );
      return projectedWinner.rosterId;
    }
    return store.leagueInfo[store.currentLeagueIndex].leagueWinner
      ? Number(store.leagueInfo[store.currentLeagueIndex].leagueWinner)
      : store.leagueInfo[store.currentLeagueIndex].legacyWinner;
  }
  return "";
});
const mostTransactions = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].transactions
    : [];
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

const cardHeight = computed(() => {
  if (props.rosters.length <= 10) {
    return "h-36";
  } else if (props.rosters.length <= 12) {
    return "h-44";
  }
  return "h-52";
});
</script>
<template>
  <div>
    <Tabs />
    <div
      v-if="store.currentTab === 'standings'"
      class="flex flex-wrap justify-between h-full min-h-0 mt-4"
    >
      <div
        class="relative w-full overflow-x-auto rounded-lg shadow-md xl:w-3/4 dark:bg-gray-900"
      >
        <table
          v-if="tableData.length > 0"
          class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-300"
        >
          <thead
            :class="
              store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
            "
            class="text-xs text-gray-700 uppercase dark:text-gray-300"
          >
            <tr>
              <th scope="col" class="px-4 py-3 sm:px-6 dark:text-gray-200">
                Team name
              </th>
              <th scope="col" class="px-2 py-3 sm:px-6">
                <div
                  @click="tableOrder = 'wins'"
                  @mouseover="hover = 'wins'"
                  @mouseleave="hover = ''"
                  class="flex items-center cursor-pointer dark:text-gray-200"
                >
                  Record
                  <div>
                    <svg
                      class="w-3 h-3 ms-1.5 fill-slate-400"
                      :class="{
                        'fill-slate-600 dark:fill-slate-50':
                          tableOrder == 'wins',
                      }"
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
                <div
                  :class="hover === 'wins' ? 'visible' : 'invisible'"
                  class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-20 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
                >
                  Regular season wins and losses
                </div>
              </th>
              <th scope="col" class="px-2 py-3 sm:px-6">
                <div
                  @click="tableOrder = 'points'"
                  @mouseover="hover = 'points'"
                  @mouseleave="hover = ''"
                  class="flex items-center cursor-pointer dark:text-gray-200"
                >
                  Points
                  <div>
                    <svg
                      class="w-3 h-3 ms-1.5 fill-slate-400"
                      :class="{
                        'fill-slate-600 dark:fill-slate-50':
                          tableOrder == 'points',
                      }"
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
                <div
                  :class="hover === 'points' ? 'visible' : 'invisible'"
                  class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-16 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
                >
                  Total regular season points
                </div>
              </th>
              <th scope="col" class="px-2 py-3 sm:px-6">
                <div
                  @click="tableOrder = 'pointsAgainst'"
                  @mouseover="hover = 'pointsAgainst'"
                  @mouseleave="hover = ''"
                  class="flex items-center w-20 cursor-pointer dark:text-gray-200"
                >
                  Points Against
                  <div>
                    <svg
                      class="w-3 h-3 ms-1.5 fill-slate-400"
                      :class="{
                        'fill-slate-600 dark:fill-slate-50':
                          tableOrder == 'pointsAgainst',
                      }"
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
                <div
                  :class="hover === 'pointsAgainst' ? 'visible' : 'invisible'"
                  class="absolute z-10 inline-block px-3 py-2 mt-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm sm:-ml-24 tooltip dark:bg-gray-600"
                >
                  Total regular season points against
                </div>
              </th>
              <th scope="col" class="px-2 py-3 sm:px-6">
                <div
                  @click="tableOrder = 'recordAgainstAll'"
                  @mouseover="hover = 'recordAgainstAll'"
                  @mouseleave="hover = ''"
                  class="flex items-center w-20 cursor-pointer dark:text-gray-200"
                >
                  Record vs. All
                  <div>
                    <svg
                      class="w-3 h-3 ms-1.5 fill-slate-400"
                      :class="{
                        'fill-slate-600 dark:fill-slate-50':
                          tableOrder == 'recordAgainstAll',
                      }"
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
                <div
                  :class="
                    hover === 'recordAgainstAll' ? 'visible' : 'invisible'
                  "
                  class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-10 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm sm:-ml-20 max-w-60 tooltip dark:bg-gray-600 min-w-36"
                >
                  Team record if each team played every other team each week.
                </div>
              </th>
              <th scope="col" class="px-2 py-3 sm:px-6">
                <div
                  @click="tableOrder = 'medianRecord'"
                  @mouseover="hover = 'medianRecord'"
                  @mouseleave="hover = ''"
                  class="flex items-center w-20 cursor-pointer dark:text-gray-200"
                >
                  Median Record
                  <div>
                    <svg
                      class="w-3 h-3 ms-1.5 fill-slate-400"
                      :class="{
                        'fill-slate-600 dark:fill-slate-50':
                          tableOrder == 'medianRecord',
                      }"
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
                <div
                  :class="hover === 'medianRecord' ? 'visible' : 'invisible'"
                  class="absolute z-10 inline-block px-3 py-2 mt-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm -ml-14 sm:-ml-20 max-w-60 tooltip dark:bg-gray-600 min-w-36"
                >
                  Team record where a win is awarded if a team's weekly score is
                  higher than the league median, and a loss is added if the
                  score is less than the median.
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in tableData"
              :key="index"
              class="border-b odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 dark:border-gray-700"
            >
              <th
                scope="row"
                class="px-4 py-3 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
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
                    class="w-8 h-8 text-gray-800 dark:text-white"
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
                    {{ item.name ? item.name : `Ghost Roster` }}
                  </p>
                </div>
              </th>
              <td
                class="px-2 py-3 sm:px-6"
                :class="{
                  'text-blue-600 dark:text-blue-500 font-semibold':
                    item.wins === mostWins,
                  'text-red-600 dark:text-red-500 font-semibold':
                    item.losses === mostLosses,
                }"
              >
                {{ item.wins }} - {{ item.losses }}
                {{ item.ties != 0 ? `- ${item.ties}` : "" }}
              </td>
              <td
                class="px-2 py-3 sm:px-6"
                :class="{
                  'text-blue-600 dark:text-blue-500 font-semibold':
                    item.pointsFor === mostPoints,
                  'text-red-600 dark:text-red-500 font-semibold':
                    item.pointsFor === leastPoints,
                }"
              >
                {{ item.pointsFor }}
              </td>
              <td
                class="px-2 py-3 sm:px-6"
                :class="{
                  'text-blue-600 dark:text-blue-500 font-semibold':
                    item.pointsAgainst === mostPointsAgainst,
                  'text-red-600 dark:text-red-500 font-semibold':
                    item.pointsAgainst === leastPointsAgainst,
                }"
              >
                {{ item.pointsAgainst }}
              </td>
              <td
                class="px-2 py-3 sm:px-6"
                :class="{
                  'text-blue-600 dark:text-blue-500 font-semibold':
                    item.winsAgainstAll === mostWinsAgainstAll,
                  'text-red-600 dark:text-red-500 font-semibold':
                    item.lossesAgainstAll === mostLossesAgainstAll,
                }"
              >
                {{ item.winsAgainstAll }} -
                {{ item.lossesAgainstAll }}
              </td>
              <td
                class="px-2 py-3 sm:px-6"
                :class="{
                  'text-blue-600 font-semibold dark:text-blue-500':
                    item.winsWithMedian === mostMedianWins,
                  'text-red-600 dark:text-red-500 font-semibold':
                    item.lossesWithMedian === mostMedianLosses,
                }"
              >
                {{ item.winsWithMedian ? item.winsWithMedian : 0 }} -
                {{ item.lossesWithMedian ? item.lossesWithMedian : 0 }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        :class="{ 'custom-height': props.users.length <= 10 }"
        class="flex flex-wrap justify-between w-full xl:w-fit xl:block xl:flex-grow xl:ml-4 xl:mt-0"
      >
        <WinnerCard
          v-if="store.currentLeagueId"
          :rosters="props.rosters"
          :users="props.users"
          :leagueWinner="leagueWinner"
          :cardHeight="cardHeight"
          class="mt-4 xl:mt-0"
        />
        <WinnerCard
          v-else
          :rosters="fakeRosters"
          :users="fakeUsers"
          :leagueWinner="6"
          :cardHeight="cardHeight"
          class="mt-4 xl:mt-0"
        />
        <BestManagerCard
          v-if="store.currentLeagueId"
          :rosters="props.rosters"
          :users="props.users"
          :cardHeight="cardHeight"
          class="mt-4"
        />
        <BestManagerCard
          v-else
          :rosters="fakeRosters"
          :users="fakeUsers"
          :cardHeight="cardHeight"
          class="mt-4"
        />
        <WorstManagerCard
          v-if="store.currentLeagueId"
          :rosters="props.rosters"
          :users="props.users"
          :cardHeight="cardHeight"
          class="mt-4"
        />
        <WorstManagerCard
          v-else
          :rosters="fakeRosters"
          :users="fakeUsers"
          :cardHeight="cardHeight"
          class="mt-4"
        />
        <TransactionsCard
          v-if="store.currentLeagueId"
          :users="props.users"
          :mostTransactions="mostTransactions"
          :cardHeight="cardHeight"
          :rosters="props.rosters"
          class="mt-4"
        />
        <TransactionsCard
          v-else
          :users="fakeUsers"
          :mostTransactions="{ 1: 24 }"
          :cardHeight="cardHeight"
          :rosters="props.rosters"
          class="mt-4"
        />
      </div>
      <StandingsChart :tableData="tableData" class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'powerRankings'">
      <PowerRankingData
        v-if="store.currentLeagueId"
        :tableData="tableData"
        :regularSeasonLength="regularSeasonLength"
        :totalRosters="totalRosters"
        class="mt-4"
      />
      <PowerRankingData
        v-else
        :tableData="tableData"
        :regularSeasonLength="15"
        :totalRosters="10"
        class="mt-4"
      />
      <Projections class="mt-4" />
      <TeamRanking :tableData="tableData" class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'expectedWins'">
      <div class="flex flex-wrap md:flex-nowrap">
        <ExpectedWinsCard :tableData="tableData" class="mt-4" />
        <ExpectedWinsChart :tableData="tableData" class="mt-4 md:ml-4" />
      </div>
      <ExpectedWinsChart2 :tableData="tableData" class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'managerEfficiency'">
      <div class="flex flex-wrap md:flex-nowrap">
        <ManagementCard :tableData="tableData" class="mt-4" />
        <RankingGraph :tableData="tableData" class="mt-4 md:ml-4" />
      </div>
      <TransactionsChart class="mt-4" />
      <Trades class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'playoffs'">
      <PlayoffPercentages :propsTableData="sortedPropsTableData" class="mt-4" />
      <Playoffs :tableData="tableData" />
    </div>
    <div v-if="store.currentTab === 'weeklyReport'">
      <WeeklyReport
        v-if="store.currentLeagueId"
        :tableData="tableData"
        :regular-season-length="regularSeasonLength"
      />
      <WeeklyReport v-else :tableData="tableData" :regular-season-length="15" />
    </div>
    <div v-if="store.currentTab === 'draft'">
      <Draft class="mt-4" />
    </div>
    <div v-if="store.currentTab === 'leagueHistory'">
      <LeagueHistory :tableData="tableData" />
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
