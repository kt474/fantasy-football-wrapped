<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { maxBy, minBy } from "lodash";
import { TableDataType, RosterType } from "../api/types";
import { useStore } from "../store/store";
import { getData, inputLeague } from "../api/api";
import { LeagueInfoType } from "../api/types";
import Alert from "../components/Alert.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const isLoading = ref(false);
const tableOrder = ref("wins");
const hover = ref("");

const checkPreviousLeagues = async (leagueId: string) => {
  // for some reason sometimes 0 is returned as the previous league id
  if (leagueId !== "0") {
    const leagueData = await getData(leagueId);
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.push(leagueData);

    if (leagueData.previousLeagueId) {
      await checkPreviousLeagues(leagueData.previousLeagueId);
    } else {
      localStorage.setItem(
        "leagueInfo",
        JSON.stringify(store.leagueInfo as LeagueInfoType[])
      );
    }
  }
};

const getPreviousLeagues = async () => {
  const previousLeagueId =
    store.leagueInfo[store.currentLeagueIndex].previousLeagueId;

  if (previousLeagueId) {
    await checkPreviousLeagues(previousLeagueId);
  }
};

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
    await getPreviousLeagues();
    isLoading.value = false;
  }
});

const dataAllYears = computed(() => {
  let result: any[] = [];
  props.tableData.forEach((user) => {
    result.push({
      name: user.name,
      id: user.id,
      wins: user.wins,
      losses: user.losses,
      points: user.pointsFor,
      avatarImg: user.avatarImg,
      seasons: store.leagueInfo[store.currentLeagueIndex]
        ? [store.leagueInfo[store.currentLeagueIndex].season]
        : ["2023", "2022", "2021"], // defaulting to this for main page fake data
    });
  });
  if (
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.length > 0
  ) {
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.forEach(
      (league: any) => {
        league.rosters.forEach((user: RosterType) => {
          result.forEach((resultUser) => {
            if (resultUser.id === user.id) {
              resultUser.wins += user.wins;
              resultUser.losses += user.losses;
              resultUser.points += user.pointsFor;
              if (league.weeklyPoints.length > 0) {
                resultUser.seasons.push(league.season);
              }
            }
          });
        });
      }
    );
  } else if (!store.leagueInfo[store.currentLeagueIndex]) {
    // fake data for main page
    result.forEach((user) => {
      user.wins += 2 * user.wins;
      user.losses += 2 * user.losses;
      user.points += 2 * user.points;
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
      return b.points - a.points;
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
  return maxBy(dataAllYears.value, "points")?.points;
});
const leastPoints = computed(() => {
  return minBy(dataAllYears.value, "points")?.points;
});
</script>
<template>
  <div
    v-if="!isLoading"
    class="relative mt-4 overflow-x-auto shadow-md sm:rounded-lg"
  >
    <table
      class="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-400"
    >
      <thead
        :class="
          store.darkMode ? 'dark-custom-bg-color' : 'light-custom-bg-color'
        "
        class="text-xs text-gray-700 uppercase dark:text-gray-400"
      >
        <tr>
          <th scope="col" class="px-6 py-3 dark:text-gray-200">Team name</th>
          <th scope="col" class="px-6 py-3">
            <div
              class="flex items-center cursor-pointer dark:text-gray-200"
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
          <th scope="col" class="px-6 py-3">
            <div
              class="flex items-center cursor-pointer dark:text-gray-200"
              @click="tableOrder = 'points'"
              @mouseover="hover = 'points'"
              @mouseleave="hover = ''"
            >
              Points
              <svg
                class="w-3 h-3 ms-1.5 fill-slate-400"
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
              class="absolute z-10 inline-block px-3 py-2 mt-2 -ml-20 text-sm font-medium text-white normal-case bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-600"
            >
              Total regular season points across all seasons
            </div>
          </th>
          <th scope="col" class="px-6 py-3 dark:text-gray-200">
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
          <th scope="col" class="px-6 py-3">
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
            class="px-6 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white"
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
              <p>{{ user.name }}</p>
            </div>
          </th>
          <td
            class="px-6 py-3"
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
            class="px-6 py-3"
            :class="{
              'text-blue-600 dark:text-blue-500 font-semibold':
                user.points === mostPoints,
              'text-red-600 dark:text-red-500 font-semibold':
                user.points === leastPoints,
            }"
          >
            {{ user.points }}
          </td>
          <td class="px-6 py-3">
            <div class="flex">
              <div
                v-for="(season, index) in user.seasons"
                class="flex flex-nowrap"
              >
                <p
                  class="text-blue-600 underline cursor-pointer dark:text-blue-500"
                  @click="addNewLeague(season)"
                >
                  {{ season }}
                </p>
                <span :class="{ hidden: index == user.seasons.length - 1 }"
                  >,&nbsp;
                </span>
              </div>
            </div>
          </td>
          <td class="px-6 py-3 text-right"></td>
        </tr>
      </tbody>
    </table>
    <Alert
      v-if="store.showLeagueExistsAlert"
      alert-msg="League already exists"
      type="error"
    />
  </div>
  <div v-else>
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
    <p class="flex justify-center text-lg dark:text-white">
      Loading previous leagues...
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
