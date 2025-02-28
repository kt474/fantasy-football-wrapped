<script setup lang="ts">
import { ref, onMounted, computed, watch, Ref } from "vue";
import { maxBy, minBy } from "lodash";
import { TableDataType } from "../../api/types.ts";
import { useStore } from "../../store/store.ts";
import { getData, inputLeague, getLeague } from "../../api/api.ts";
import { LeagueInfoType } from "../../api/types.ts";
import Alert from "../util/Alert.vue";
import { createTableData } from "../../api/helper.ts";
import AllMatchups from "./AllMatchups.vue";
import MostPoints from "./MostPoints.vue";
import FewestPoints from "./FewestPoints.vue";
import ManagerComparison from "./ManagerComparison.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const isLoading = ref(false);
const loadingYear = ref("");
const tableOrder = ref("wins");
const hover = ref("");
const previousLeagues = ref<string[]>([]);

interface LeagueData {
  previousLeagueId?: string;
  season?: string;
  // Add other relevant fields
}

interface LeagueStore {
  leagueInfo: LeagueInfoType[];
  currentLeagueIndex: number;
}

const fetchLeagueData = async (leagueId: string): Promise<LeagueData> => {
  try {
    // Fetch league info and data in parallel
    const [leagueInfo, leagueData]: [any, any] = await Promise.all([
      getLeague(leagueId),
      getData(leagueId),
    ]);

    // Combine the data
    return {
      ...leagueData,
      season: leagueInfo.season,
    };
  } catch (error) {
    console.error(`Error fetching league data for ID ${leagueId}:`, error);
    throw error;
  }
};

const checkPreviousLeagues = async (
  leagueId: string,
  store: LeagueStore,
  previousLeagues: Ref<string[]>,
  loadingYear: Ref<string>
): Promise<void> => {
  // Early return if league is invalid or already processed
  if (leagueId === "0" || previousLeagues.value.includes(leagueId)) {
    return;
  }

  try {
    const leagueData = await fetchLeagueData(leagueId);
    loadingYear.value = leagueData.season || "";

    // Update store and tracking arrays
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.push(leagueData);
    previousLeagues.value.push(leagueId);

    // Recursively fetch previous league if it exists
    if (leagueData.previousLeagueId) {
      await checkPreviousLeagues(
        leagueData.previousLeagueId,
        store,
        previousLeagues,
        loadingYear
      );
    } else {
      // Only save to localStorage when we've reached the end of the chain
      localStorage.setItem("leagueInfo", JSON.stringify(store.leagueInfo));
    }
  } catch (error) {
    console.error(`Failed to process league ${leagueId}:`, error);
  }
};

const getPreviousLeagues = async (
  store: LeagueStore,
  previousLeagues: Ref<string[]>,
  loadingYear: Ref<string>
): Promise<void> => {
  const previousLeagueId =
    store.leagueInfo[store.currentLeagueIndex].previousLeagueId;

  if (previousLeagueId) {
    await checkPreviousLeagues(
      previousLeagueId,
      store,
      previousLeagues,
      loadingYear
    );
  }
};

const currentLeague = computed(() => {
  if (
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
  ) {
    return 0;
  }
  return -1;
});

const addNewLeague = async (season: string) => {
  if (store.leagueInfo[store.currentLeagueIndex]) {
    const newLeagueInfo = store.leagueInfo[
      store.currentLeagueIndex
    ].previousLeagues.find((league: any) => league.season === season);
    if (newLeagueInfo) {
      if (
        !store.leagueInfo
          .map((league: LeagueInfoType) => league.leagueId)
          .includes(newLeagueInfo.leagueId)
      ) {
        store.updateLeagueInfo(newLeagueInfo);
        store.updateCurrentLeagueId(newLeagueInfo.leagueId);
        store.currentTab = "standings";
        localStorage.currentTab = "standings";
        store.updateShowAddedAlert(true);
        setTimeout(() => {
          store.updateShowAddedAlert(false);
        }, 3000);
        await inputLeague(
          newLeagueInfo.leagueId,
          newLeagueInfo.name,
          newLeagueInfo.totalRosters,
          newLeagueInfo.seasonType,
          newLeagueInfo.season
        );
      } else {
        store.updateExistsAlert(true);
        setTimeout(() => {
          store.updateExistsAlert(false);
        }, 3000);
      }
    } else {
      store.updateExistsAlert(true);
      setTimeout(() => {
        store.updateExistsAlert(false);
      }, 3000);
    }
  }
};

onMounted(async () => {
  if (
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.length == 0
  ) {
    isLoading.value = true;
    await getPreviousLeagues(store, previousLeagues, loadingYear);
    isLoading.value = false;
  }
});

watch(
  () => store.currentLeagueId,
  async () => {
    if (
      store.leagueInfo[store.currentLeagueIndex] &&
      store.leagueInfo[store.currentLeagueIndex].previousLeagues.length == 0
    ) {
      isLoading.value = true;
      await getPreviousLeagues(store, previousLeagues, loadingYear);
      isLoading.value = false;
    }
  }
);

const dataAllYears = computed(() => {
  let result = props.tableData.map((user) => ({
    name: user.name,
    id: user.id,
    wins: user.wins,
    losses: user.losses,
    points: user.pointsFor,
    pointsArr: user.points ? [...user.points] : [],
    pointSeason: store.leagueInfo[store.currentLeagueIndex]
      ? [
          {
            season: store.leagueInfo[store.currentLeagueIndex].season,
            points: user.points ? [...user.points] : [],
          },
        ]
      : [
          {
            season: "2023",
            points: Array.from({ length: 5 }, () =>
              parseFloat((Math.random() * (200 - 100) + 100).toFixed(2))
            ),
          },
          {
            season: "2024",
            points: Array.from({ length: 5 }, () =>
              parseFloat((Math.random() * (200 - 100) + 100).toFixed(2))
            ),
          },
        ],
    avatarImg: user.avatarImg,
    rosterId: user.rosterId,
    matchups: user.matchups ? [...user.matchups] : [],
    managerEfficiency: store.leagueInfo[store.currentLeagueIndex]
      ? user.managerEfficiency
      : 2 * user.managerEfficiency,
    randomScheduleWins: store.leagueInfo[store.currentLeagueIndex]
      ? user.randomScheduleWins
      : 3 * user.randomScheduleWins,
    leagueWinner:
      store.leagueInfo[store.currentLeagueIndex] &&
      store.leagueInfo[store.currentLeagueIndex].status == "complete"
        ? [
            store.leagueInfo[store.currentLeagueIndex].leagueWinner
              ? Number(store.leagueInfo[store.currentLeagueIndex].leagueWinner)
              : store.leagueInfo[store.currentLeagueIndex].legacyWinner,
          ]
        : [null],
    seasons: store.leagueInfo[store.currentLeagueIndex]
      ? [store.leagueInfo[store.currentLeagueIndex].season]
      : ["2023", "2022", "2021"],
  }));

  if (
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.length > 0
  ) {
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.forEach(
      (league: LeagueInfoType) => {
        let tableData;
        if (localStorage.getItem(league.leagueId)) {
          tableData = JSON.parse(<string>localStorage.getItem(league.leagueId));
        } else {
          tableData = createTableData(
            league.users,
            league.rosters,
            league.weeklyPoints,
            league.medianScoring && league.medianScoring === 1 ? true : false
          );
          localStorage.setItem(league.leagueId, JSON.stringify(tableData));
        }
        tableData.forEach((user: TableDataType) => {
          const resultUser = result.find((ru) => ru.id === user.id);
          if (resultUser) {
            resultUser.wins += user.wins;
            resultUser.losses += user.losses;
            resultUser.points += user.pointsFor;
            resultUser.randomScheduleWins += user.randomScheduleWins;
            resultUser.managerEfficiency += user.managerEfficiency;

            if (league.weeklyPoints.length > 0) {
              resultUser.seasons.push(league.season);
            }
            if (league.leagueWinner) {
              // @ts-ignore
              resultUser.leagueWinner.push(Number(league.leagueWinner));
            } else if (league.legacyWinner) {
              // @ts-ignore
              resultUser.leagueWinner.push(league.legacyWinner);
            }
            if (user.matchups?.length) {
              resultUser.matchups.push(...user.matchups);
            }
            if (user.points?.length) {
              resultUser.pointsArr.push(...user.points);
              resultUser.pointSeason.push({
                season: league.season,
                points: user.points,
              });
            }
          }
        });
      }
    );
  } else if (!store.leagueInfo[store.currentLeagueIndex]) {
    // fake data for main page
    result.forEach((user) => {
      user.wins += 2 * user.wins;
      user.losses += 2 * user.losses;
      user.points += 2 * user.points;
      user.pointsArr.push(...user.pointsArr, ...user.pointsArr);
      user.matchups.push(...user.matchups, ...user.matchups);
    });
  }
  return result;
});

const tableDataAllYears = computed(() => {
  if (tableOrder.value === "wins") {
    return dataAllYears.value.sort((a: any, b: any) => {
      if (a.wins / a.losses !== b.wins / b.losses) {
        return b.wins / b.losses - a.wins / a.losses;
      }
      return b.points - a.points;
    });
  } else if (tableOrder.value === "points") {
    return dataAllYears.value.sort((a: any, b: any) => {
      return b.points / (b.wins + b.losses) - a.points / (a.wins + a.losses);
    });
  } else if (tableOrder.value === "expectedWins") {
    return dataAllYears.value.sort((a: any, b: any) => {
      return b.wins - b.randomScheduleWins - (a.wins - a.randomScheduleWins);
    });
  } else if (tableOrder.value === "managerEfficiency") {
    return dataAllYears.value.sort((a: any, b: any) => {
      return (
        b.managerEfficiency / (b.seasons.length + currentLeague.value) -
        a.managerEfficiency / (a.seasons.length + currentLeague.value)
      );
    });
  }
});

const bestRecord = computed(() => {
  const user = maxBy(dataAllYears.value, (a) => a.wins / a.losses);
  return user ? (user.wins / user.losses).toFixed(2) : null;
});
const worstRecord = computed(() => {
  const user = minBy(dataAllYears.value, (a) => a.wins / a.losses);
  return user ? (user.wins / user.losses).toFixed(2) : null;
});

const mostPoints = computed(() => {
  const user = maxBy(dataAllYears.value, (a) => a.points / (a.wins + a.losses));
  return user
    ? Math.round((user.points * 100) / (user.wins + user.losses)) / 100
    : null;
});
const leastPoints = computed(() => {
  const user = minBy(dataAllYears.value, (a) => a.points / (a.wins + a.losses));
  return user
    ? Math.round((user.points * 100) / (user.wins + user.losses)) / 100
    : null;
});

const mostLucky = computed(() => {
  const user = maxBy(dataAllYears.value, (a) => a.wins - a.randomScheduleWins);
  return user ? (user.wins - user.randomScheduleWins).toFixed(2) : null;
});

const mostUnlucky = computed(() => {
  const user = minBy(dataAllYears.value, (a) => a.wins - a.randomScheduleWins);
  return user ? (user.wins - user.randomScheduleWins).toFixed(2) : null;
});

const bestManager = computed(() => {
  const user = maxBy(
    dataAllYears.value,
    (a) => a.managerEfficiency / (a.seasons.length + currentLeague.value)
  );
  return user
    ? (
        (user.managerEfficiency / (user.seasons.length + currentLeague.value)) *
        100
      ).toFixed(1)
    : null;
});
const worstManager = computed(() => {
  const user = minBy(
    dataAllYears.value,
    (a) => a.managerEfficiency / (a.seasons.length + currentLeague.value)
  );
  return user
    ? (
        (user.managerEfficiency / (user.seasons.length + currentLeague.value)) *
        100
      ).toFixed(1)
    : null;
});
</script>
<template>
  <div
    v-if="!isLoading"
    class="relative mt-4 overflow-x-auto rounded-lg shadow-md"
  >
    <table
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
              class="flex items-center w-24 cursor-pointer dark:text-gray-200"
              @click="tableOrder = 'wins'"
              @mouseover="hover = 'wins'"
              @mouseleave="hover = ''"
            >
              Compiled Record
              <svg
                class="w-6 h-3 ms-1.5 fill-slate-400"
                :class="{
                  'fill-slate-600 dark:fill-slate-50': tableOrder == 'wins',
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
            <div
              :class="hover === 'wins' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-20 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
            >
              Total wins and losses across all seasons
            </div>
          </th>
          <th scope="col" class="px-2 py-3 sm:px-6">
            <div
              class="flex items-center cursor-pointer w-28 dark:text-gray-200"
              @click="tableOrder = 'expectedWins'"
              @mouseover="hover = 'expectedWins'"
              @mouseleave="hover = ''"
            >
              Wins above expected
              <svg
                class="w-5 h-3 ms-1.5 fill-slate-400"
                :class="{
                  'fill-slate-600 dark:fill-slate-50':
                    tableOrder == 'expectedWins',
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
            <div
              :class="hover === 'expectedWins' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm sm:-ml-20 tooltip dark:bg-gray-600 max-w-80"
            >
              (Actual wins) - (Average number of wins after simulating 10,000
              randomized weekly matchups)
            </div>
          </th>
          <th scope="col" class="px-2 py-3 sm:px-6">
            <div
              class="flex items-center cursor-pointer w-28 dark:text-gray-200"
              @click="tableOrder = 'points'"
              @mouseover="hover = 'points'"
              @mouseleave="hover = ''"
            >
              Points per game
              <svg
                class="w-5 h-3 ms-1.5 fill-slate-400"
                :class="{
                  'fill-slate-600 dark:fill-slate-50': tableOrder == 'points',
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
            <div
              :class="hover === 'points' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm sm:-ml-20 tooltip dark:bg-gray-600"
            >
              Total regular season points across all seasons
            </div>
          </th>
          <th scope="col" class="px-2 py-3 sm:px-6">
            <div
              class="flex items-center cursor-pointer w-28 dark:text-gray-200"
              @click="tableOrder = 'managerEfficiency'"
              @mouseover="hover = 'managerEfficiency'"
              @mouseleave="hover = ''"
            >
              Manager Efficiency
              <svg
                class="w-5 h-3 ms-1.5 fill-slate-400"
                :class="{
                  'fill-slate-600 dark:fill-slate-50':
                    tableOrder == 'managerEfficiency',
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
            <div
              :class="hover === 'managerEfficiency' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm sm:-ml-10 tooltip dark:bg-gray-600"
            >
              Points / Potential points
            </div>
          </th>

          <th scope="col" class="px-2 py-3 sm:px-6 dark:text-gray-200">
            <div
              class="flex items-center"
              @mouseover="hover = 'season'"
              @mouseleave="hover = ''"
            >
              Seasons
            </div>
            <div
              :class="hover === 'season' ? 'visible' : 'invisible'"
              class="absolute z-10 inline-block px-3 py-2 mt-2 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
            >
              Seasons played
            </div>
          </th>
          <th scope="col" class="px-2 py-3 sm:px-6">
            <span class="sr-only">Edit</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(user, index) in tableDataAllYears"
          class="bg-white border-b odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 dark:border-gray-700"
        >
          <th
            scope="row"
            class="px-4 py-3 font-medium text-gray-900 sm:px-6 whitespace-nowrap dark:text-white"
          >
            <div class="flex items-center">
              <img
                alt="User avatar"
                v-if="user.avatarImg"
                class="w-8 h-8 rounded-full"
                :src="user.avatarImg"
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
                {{ user.name ? user.name : "Ghost Roster" }}
              </p>
            </div>
          </th>
          <td
            class="px-2 py-3 sm:px-6"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                (user.wins / user.losses).toFixed(2) === bestRecord,
              'text-red-600 dark:text-red-500 font-semibold':
                (user.wins / user.losses).toFixed(2) === worstRecord,
            }"
          >
            {{ user.wins }} - {{ user.losses }}
          </td>
          <td
            class="px-2 py-3 sm:px-6"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                (user.wins - user.randomScheduleWins).toFixed(2) === mostLucky,
              'text-red-600 dark:text-red-500 font-semibold':
                (user.wins - user.randomScheduleWins).toFixed(2) ===
                mostUnlucky,
            }"
          >
            {{ (user.wins - user.randomScheduleWins).toFixed(2) }}
          </td>
          <td
            class="px-2 py-3 sm:px-6"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                Math.round((user.points / (user.wins + user.losses)) * 100) /
                  100 ===
                mostPoints,
              'text-red-600 dark:text-red-500 font-semibold':
                Math.round((user.points / (user.wins + user.losses)) * 100) /
                  100 ===
                leastPoints,
            }"
          >
            {{
              Math.round((user.points / (user.wins + user.losses)) * 100) / 100
            }}
          </td>
          <td
            v-if="user.seasons.length + currentLeague != 0"
            class="px-2 py-3 sm:px-6"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                (
                  (user.managerEfficiency /
                    (user.seasons.length + currentLeague)) *
                  100
                ).toFixed(1) === bestManager,
              'text-red-600 dark:text-red-500 font-semibold':
                (
                  (user.managerEfficiency /
                    (user.seasons.length + currentLeague)) *
                  100
                ).toFixed(1) === worstManager,
            }"
          >
            {{
              (
                (user.managerEfficiency /
                  (user.seasons.length + currentLeague)) *
                100
              ).toFixed(1)
            }}%
          </td>
          <td v-else class="px-2 py-3 sm:px-6">0%</td>
          <td class="px-2 py-3 sm:px-6">
            <div class="flex">
              <div
                v-for="(season, index) in user.seasons"
                class="flex flex-nowrap"
              >
                <div
                  class="flex text-blue-600 underline cursor-pointer dark:text-blue-500"
                  @click="addNewLeague(season)"
                >
                  {{ season }}
                  <svg
                    v-if="
                      user.rosterId === user.leagueWinner[index] ||
                      (store.leagueInfo.length < 1 &&
                        index === 1 &&
                        user.rosterId === 2) ||
                      (store.leagueInfo.length < 1 &&
                        index === 0 &&
                        user.rosterId === 6) ||
                      (store.leagueInfo.length < 1 &&
                        index === 2 &&
                        user.rosterId === 8)
                    "
                    class="w-5 ml-2 mr-1"
                    id="Layer_1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 64 64"
                    xml:space="preserve"
                    fill="#000000"
                  >
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      <g>
                        <g>
                          <path
                            fill="#F9EBB2"
                            d="M49,2H15c-1.104,0-2,0.895-2,2v23c0,10.492,8.507,19,19,19s19-8.508,19-19V4C51,2.895,50.104,2,49,2z"
                          ></path>
                        </g>
                        <g>
                          <path
                            fill="#394240"
                            d="M60,6h-7V4c0-2.213-1.789-4-4-4H15c-2.211,0-4,1.787-4,4v2H4c-2.211,0-4,1.787-4,4v8 c0,6.074,4.925,11,11,11h0.101C12.015,38.66,19.477,46.395,29,47.76V56h-7c-2.211,0-4,1.787-4,4v3c0,0.551,0.447,1,1,1h26 c0.553,0,1-0.449,1-1v-3c0-2.213-1.789-4-4-4h-7v-8.24c9.523-1.365,16.985-9.1,17.899-18.76H53c6.075,0,11-4.926,11-11v-8 C64,7.787,62.211,6,60,6z M11,23c-2.762,0-5-2.24-5-5v-6h5V23z M11,10H5c-0.553,0-1,0.445-1,1v7c0,3.865,3.134,7,7,7v2 c-4.971,0-9-4.031-9-9v-8c0-1.105,0.896-2,2-2h7V10z M42,58c1.104,0,2,0.895,2,2v2H20v-2c0-1.105,0.896-2,2-2H42z M31,56v-8.053 C31.334,47.963,31.662,48,32,48s0.666-0.037,1-0.053V56H31z M51,23v2v2c0,10.492-8.507,19-19,19s-19-8.508-19-19v-2v-2V4 c0-1.105,0.896-2,2-2h34c1.104,0,2,0.895,2,2V23z M53,12h5v6c0,2.76-2.238,5-5,5V12z M62,18c0,4.969-4.029,9-9,9v-2 c3.866,0,7-3.135,7-7v-7c0-0.555-0.447-1-1-1h-6V8h7c1.104,0,2,0.895,2,2V18z"
                          ></path>
                          <path
                            fill="#394240"
                            d="M39.147,19.359l-4.309-0.658l-1.936-4.123c-0.165-0.352-0.518-0.574-0.905-0.574s-0.74,0.223-0.905,0.574 l-1.936,4.123l-4.309,0.658c-0.37,0.059-0.678,0.316-0.797,0.672s-0.029,0.746,0.232,1.016l3.146,3.227l-0.745,4.564 c-0.062,0.377,0.099,0.758,0.411,0.979s0.725,0.242,1.061,0.059l3.841-2.123l3.841,2.123C35.99,29.959,36.157,30,36.323,30 c0.202,0,0.404-0.062,0.576-0.184c0.312-0.221,0.473-0.602,0.411-0.979l-0.745-4.564l3.146-3.227 c0.262-0.27,0.352-0.66,0.232-1.016S39.518,19.418,39.147,19.359z M34.781,23.238c-0.222,0.227-0.322,0.545-0.271,0.859 l0.495,3.029l-2.522-1.395c-0.151-0.084-0.317-0.125-0.484-0.125s-0.333,0.041-0.484,0.125l-2.522,1.395l0.495-3.029 c0.051-0.314-0.05-0.633-0.271-0.859l-2.141-2.193l2.913-0.447c0.329-0.049,0.612-0.26,0.754-0.562l1.257-2.678l1.257,2.678 c0.142,0.303,0.425,0.514,0.754,0.562l2.913,0.447L34.781,23.238z"
                          ></path>
                        </g>
                        <path
                          fill="#F76D57"
                          d="M34.781,23.238c-0.222,0.227-0.322,0.545-0.271,0.859l0.495,3.029l-2.522-1.395 c-0.151-0.084-0.317-0.125-0.484-0.125s-0.333,0.041-0.484,0.125l-2.522,1.395l0.495-3.029c0.051-0.314-0.05-0.633-0.271-0.859 l-2.141-2.193l2.913-0.447c0.329-0.049,0.612-0.26,0.754-0.562l1.257-2.678l1.257,2.678c0.142,0.303,0.425,0.514,0.754,0.562 l2.913,0.447L34.781,23.238z"
                        ></path>
                        <g>
                          <path
                            fill="#B4CCB9"
                            d="M2,10v8c0,4.969,4.029,9,9,9v-2c-3.866,0-7-3.135-7-7v-7c0-0.555,0.447-1,1-1h6V8H4C2.896,8,2,8.895,2,10z "
                          ></path>
                          <path
                            fill="#B4CCB9"
                            d="M60,8h-7v2h6c0.553,0,1,0.445,1,1v7c0,3.865-3.134,7-7,7v2c4.971,0,9-4.031,9-9v-8C62,8.895,61.104,8,60,8 z"
                          ></path>
                          <path
                            fill="#B4CCB9"
                            d="M42,58H22c-1.104,0-2,0.895-2,2v2h24v-2C44,58.895,43.104,58,42,58z"
                          ></path>
                          <path
                            fill="#B4CCB9"
                            d="M33,47.947C32.666,47.963,32.338,48,32,48s-0.666-0.037-1-0.053V56h2V47.947z"
                          ></path>
                        </g>
                        <path
                          opacity="0.15"
                          fill="#231F20"
                          d="M33,47.947C32.666,47.963,32.338,48,32,48s-0.666-0.037-1-0.053V56h2V47.947z"
                        ></path>
                      </g>
                    </g>
                  </svg>
                </div>
                <span :class="{ hidden: index == user.seasons.length - 1 }"
                  >,&nbsp;
                </span>
              </div>
            </div>
          </td>
          <td class="px-2 py-3 text-right sm:px-6"></td>
        </tr>
      </tbody>
    </table>
    <Alert
      v-if="store.showLeagueExistsAlert"
      alert-msg="League already exists"
      type="error"
    />
  </div>
  <AllMatchups v-if="!isLoading" :tableData="dataAllYears" class="mt-4" />
  <ManagerComparison v-if="!isLoading" :tableData="dataAllYears" class="mt-4" />
  <div v-if="!isLoading" class="flex flex-wrap mt-4 md:flex-nowrap">
    <MostPoints :tableData="dataAllYears" />
    <FewestPoints :tableData="dataAllYears" class="mt-4 ml-0 md:mt-0 md:ml-4" />
  </div>
  <div class="h-screen" v-else>
    <svg
      aria-hidden="true"
      class="w-8 h-8 mx-auto mt-4 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
      viewBox="0 0 100 101"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
        fill="currentColor"
      />
      <path
        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
        fill="currentFill"
      />
    </svg>
    <p v-if="loadingYear" class="flex justify-center text-lg dark:text-white">
      Loading
      <span class="font-bold">&nbsp;{{ loadingYear }}&nbsp;</span>season...
    </p>
  </div>
</template>
<style scoped>
.light-custom-bg-color {
  background-color: #eff0f2;
}
.dark-custom-bg-color {
  background-color: #374151;
}
</style>
