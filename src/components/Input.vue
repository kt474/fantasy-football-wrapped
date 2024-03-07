<script setup lang="ts">
import { ref, computed } from "vue";
import { useStore } from "../store/store";
import { LeagueInfoType } from "../api/types";
import { getData, getLeague } from "../api/api";
const store = useStore();
const leagueIdInput = ref("");
const showErrorMsg = ref(false);
const errorMsg = ref("");

const leagueIds = computed(() => {
  return store.leagueInfo.map((league: LeagueInfoType) => league.leagueId);
});

const onSubmit = async () => {
  if (store.leagueInfo.length >= 5) {
    errorMsg.value = "Maximum of 5 leagues allowed";
    showErrorMsg.value = true;
    return;
  }
  if (leagueIdInput.value === "") {
    errorMsg.value = "Please enter a league ID";
    showErrorMsg.value = true;
  } else {
    const checkInput: any = await getLeague(leagueIdInput.value);
    if (!checkInput["name"]) {
      errorMsg.value = "Invalid league ID";
      showErrorMsg.value = true;
    } else if ((leagueIds.value as string[]).includes(leagueIdInput.value)) {
      errorMsg.value = "League already added";
      showErrorMsg.value = true;
    } else {
      showErrorMsg.value = false;
      store.updateCurrentLeagueId(leagueIdInput.value);
      store.updateLeagueInfo(await getData(leagueIdInput.value));
      store.leagueSubmitted = true;
      store.updateShowInput(false);
    }
    leagueIdInput.value = "";
  }
};
</script>

<template>
  <div class="container mt-4">
    <div class="flex justify-start">
      <div class="w-full">
        <input
          v-model="leagueIdInput"
          type="text"
          id="default-input"
          placeholder="League ID"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        />
        <p
          v-if="showErrorMsg"
          id="helper-text-explanation"
          class="mt-2 -mb-2 text-xs text-red-600 dark:text-red-500"
        >
          {{ errorMsg }}
        </p>
      </div>
      <div class="ml-4">
        <button
          aria-label="Button to submit league ID"
          @click="onSubmit()"
          type="submit"
          class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
</template>
