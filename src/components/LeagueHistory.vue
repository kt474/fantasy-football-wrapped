<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { TableDataType, RosterType } from "../api/types";
import { useStore } from "../store/store";
import { getData } from "../api/api";
import { LeagueInfoType } from "../api/types";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const checkPreviousLeagues = async (leagueId: string) => {
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
};

const getPreviousLeagues = async () => {
  const previousLeagueId =
    store.leagueInfo[store.currentLeagueIndex].previousLeagueId;

  if (previousLeagueId) {
    await checkPreviousLeagues(previousLeagueId);
  }
};

onMounted(async () => {
  if (store.leagueInfo[store.currentLeagueIndex].previousLeagues.length == 0) {
    await getPreviousLeagues();
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
    });
  });
  if (store.leagueInfo[store.currentLeagueIndex].previousLeagues.length > 0) {
    store.leagueInfo[store.currentLeagueIndex].previousLeagues.forEach(
      (league: any) => {
        league.rosters.forEach((user: RosterType) => {
          result.forEach((resultUser) => {
            if (resultUser.id === user.id) {
              resultUser.wins += user.wins;
              resultUser.losses += user.losses;
              resultUser.points += user.pointsFor;
            }
          });
        });
      }
    );
  }
  return result;
});
</script>
<template>
  <div class="relative mt-4 overflow-x-auto shadow-md sm:rounded-lg">
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
          <th scope="col" class="px-6 py-3">Team name</th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Wins
              <a href="#"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Losses
              <a href="#"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <div class="flex items-center">
              Points
              <a href="#"
                ><svg
                  class="w-3 h-3 ms-1.5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"
                  /></svg
              ></a>
            </div>
          </th>
          <th scope="col" class="px-6 py-3">
            <span class="sr-only">Edit</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(user, index) in dataAllYears"
          class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
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
          <td class="px-6 py-4">{{ user.wins }}</td>
          <td class="px-6 py-4">{{ user.losses }}</td>
          <td class="px-6 py-4">{{ user.points }}</td>
          <td class="px-6 py-4 text-right"></td>
        </tr>
      </tbody>
    </table>
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
