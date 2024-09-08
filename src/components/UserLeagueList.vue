<script setup lang="ts">
import { ref } from "vue";
import { useStore } from "../store/store";
import { seasonType, getData } from "../api/api";

const checkedLeagues = ref([]);
const showError = ref(false);
const store = useStore();

const addLeagues = async () => {
  if (checkedLeagues.value.length > 5) {
    showError.value = true;
    return;
  }
  if (checkedLeagues.value.length >= 1) {
    for (const league of checkedLeagues.value) {
      store.updateCurrentLeagueId(league);
      const newLeagueInfo = await getData(league);
      store.updateLeagueInfo(newLeagueInfo);
    }
    store.setLeaguesList([]);
    store.updateShowLeaguesList(false);
    store.updateShowAddedAlert(true);
    setTimeout(() => {
      store.updateShowAddedAlert(false);
    }, 3000);
  }
};
</script>
<template>
  <div class="w-full">
    <h3 class="my-4 text-2xl font-medium text-gray-900 dark:text-white">
      Welcome {{ store.username }}!
    </h3>
    <h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
      Select leagues:
    </h3>
    <ul class="flex flex-wrap w-full rounded-lg">
      <li v-for="(league, index) in store.leaguesList" class="mb-2 mr-2 w-60">
        <input
          type="checkbox"
          :id="'league-' + index"
          :value="league.league_id"
          class="hidden peer"
          v-model="checkedLeagues"
        />
        <label
          :for="'league-' + index"
          class="inline-flex items-center justify-between w-full px-3 py-2.5 text-gray-500 bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-blue-600 hover:text-gray-600 dark:peer-checked:text-gray-300 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <div>
            <h5
              class="mb-1 text-lg font-medium text-gray-900 truncate dark:text-white max-w-52"
            >
              {{ league.name }}
            </h5>
            <div
              class="w-full border-b border-slate-200 dark:border-slate-600"
            ></div>
            <p class="mt-1 font-normal text-gray-700 dark:text-gray-300">
              {{ seasonType[league["settings"]["type"]] }}:
              {{ league.season }}
              {{ league.total_rosters }}-team
            </p>
          </div>
        </label>
      </li>
    </ul>
    <p v-if="showError" class="mt-2 -mb-2 text-red-600 dark:text-red-500">
      A maximum of 5 leagues can be added at a time
    </p>
    <button
      @click="addLeagues"
      aria-label="Button to add leagues"
      type="submit"
      :disabled="checkedLeagues.length == 0"
      :class="{ 'cursor-not-allowed': checkedLeagues.length == 0 }"
      class="text-white mt-2 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >
      Add
      <span
        class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full ms-2"
      >
        {{ checkedLeagues.length }}
      </span>
    </button>
  </div>
</template>
