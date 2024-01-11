<script setup lang="ts">
import { ref, computed } from "vue";
import { useStore, LeagueInfoType } from "../store/store";
import { getLeague, getRosters, getUsers, getAvatar } from "../api/api";
import { getWeeklyPoints } from "../api/helper";
const store = useStore();
const leagueIdInput = ref("");
const showErrorMsg = ref(false);
const errorMsg = ref("");

const leagueIds = computed(() => {
  return store.leagueInfo.map((league: LeagueInfoType) => league.leagueId);
});

const onSubmit = async () => {
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
      const newLeagueInfo: any = await getLeague(leagueIdInput.value);
      newLeagueInfo["rosters"] = await getRosters(leagueIdInput.value);
      newLeagueInfo["weeklyPoints"] = await getWeeklyPoints(
        leagueIdInput.value,
        12
      );
      newLeagueInfo["users"] = await getUsers(leagueIdInput.value);
      for (const val of newLeagueInfo["users"]) {
        if (val["avatar"] !== null) {
          val["avatarImg"] = await getAvatar(val["avatar"]);
        }
      }
      store.updateLeagueInfo(newLeagueInfo);
      const currentLeagues = JSON.parse(
        localStorage.getItem("leagueInfo") || "[]"
      );
      currentLeagues.push(newLeagueInfo);
      localStorage.setItem("leagueInfo", JSON.stringify(currentLeagues));

      store.updateShowAddedAlert(true);
      store.updateShowInput(false);
      setTimeout(() => {
        store.updateShowAddedAlert(false);
      }, 3000);
    }
    leagueIdInput.value = "";
  }
};
</script>

<template>
  <div class="container mx-auto my-4">
    <div class="flex justify-start">
      <div class="w-1/4">
        <label
          for="platform-menu"
          class="block mb-2 text-lg font-medium text-gray-900 dark:text-white"
          >Platform</label
        >
        <select
          id="platform-menu"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          <option selected>Sleeper</option>
          <option value="espn">ESPN (support on the way)</option>
        </select>
      </div>
      <div class="w-2/3 ml-4">
        <label
          for="default-input"
          class="block mb-2 text-lg font-medium text-gray-900 dark:text-white"
          >League ID</label
        >
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
          class="mt-2 text-xs text-red-600 dark:text-red-500"
        >
          {{ errorMsg }}
        </p>
      </div>
      <div class="ml-4 mt-9">
        <button
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
