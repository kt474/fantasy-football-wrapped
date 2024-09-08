<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../store/store";
import { LeagueInfoType } from "../api/types";
import {
  getData,
  getLeague,
  getUsername,
  inputLeague,
  getAllLeagues,
} from "../api/api";
const store = useStore();
const leagueIdInput = ref("");
const inputType = ref("League ID");
const seasonYear = ref("2024");
const showErrorMsg = ref(false);
const errorMsg = ref("");

const leagueIds = computed(() => {
  return store.leagueInfo.map((league: LeagueInfoType) => league.leagueId);
});

onMounted(() => {
  if (localStorage.inputType) {
    inputType.value = localStorage.inputType;
  }
});

watch(
  () => inputType.value,
  () => (localStorage.inputType = inputType.value)
);

const onSubmit = async () => {
  if (inputType.value === "Username") {
    if (leagueIdInput.value === "") {
      errorMsg.value = "Please enter a username";
      showErrorMsg.value = true;
      return;
    }
    const user = await getUsername(leagueIdInput.value);
    if (!user) {
      errorMsg.value = "Invalid username";
      showErrorMsg.value = true;
      return;
    }
    const leagues = await getAllLeagues(user.user_id, seasonYear.value);
    store.username = user.display_name;
    store.setLeaguesList(leagues);
    store.updateShowLeaguesList(true);
  } else {
    if (store.leagueInfo.length > 5) {
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
        const newLeagueInfo = await getData(leagueIdInput.value);
        store.updateLeagueInfo(newLeagueInfo);
        store.leagueSubmitted = true;
        store.updateShowInput(false);
        await inputLeague(
          leagueIdInput.value,
          newLeagueInfo.name,
          newLeagueInfo.totalRosters,
          newLeagueInfo.seasonType,
          newLeagueInfo.season
        );
      }
      leagueIdInput.value = "";
    }
  }
};
</script>

<template>
  <div class="container mt-4">
    <div class="flex justify-start">
      <select
        v-model="inputType"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 input-height"
      >
        <option selected>League ID</option>
        <option>Username</option>
      </select>
      <select
        v-if="inputType === 'Username'"
        v-model="seasonYear"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 input-height"
      >
        <option selected>2024</option>
        <option>2023</option>
        <option>2022</option>
        <option>2021</option>
      </select>
      <div class="w-full">
        <input
          v-model="leagueIdInput"
          type="text"
          id="default-input"
          :placeholder="inputType"
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
<style scoped>
.input-height {
  max-height: 42px;
}
</style>
