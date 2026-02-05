<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../../store/store";
import { LeagueInfoType } from "../../types/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getData,
  getLeague,
  getUsername,
  inputLeague,
  inputUsername,
  getAllLeagues,
} from "../../api/api";
const store = useStore();
const leagueIdInput = ref("");
const inputType = ref("League ID");
const seasonYear = ref("2025");
const showErrorMsg = ref(false);
const errorMsg = ref("");
const showHelperMsg = ref(false);
import { useRouter } from "vue-router";

const router = useRouter();
const leagueIds = computed(() => {
  return store.leagueInfo.map((league: LeagueInfoType) => league.leagueId);
});

const updateURL = (leagueID: string) => {
  router.replace({ query: { leagueId: leagueID } });
};

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
    showHelperMsg.value = true;
    const leagues = await getAllLeagues(user.user_id, seasonYear.value);
    store.username = user.display_name;
    store.setLeaguesList(leagues);
    store.updateShowLeaguesList(true);
    showHelperMsg.value = false;
    localStorage.inputType = "League ID";
    store.updateShowInput(false);
    inputUsername(user.display_name, seasonYear.value);
  } else {
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
      } else if (checkInput["sport"] !== "nfl") {
        errorMsg.value = "Only NFL leagues are supported";
        showErrorMsg.value = true;
      } else {
        showErrorMsg.value = false;
        store.updateLoadingLeague(checkInput["name"]);
        store.updateCurrentLeagueId(leagueIdInput.value);
        const newLeagueInfo = await getData(leagueIdInput.value);
        store.updateLeagueInfo(newLeagueInfo);
        store.leagueSubmitted = true;
        store.updateShowInput(false);
        store.updateLoadingLeague("");
        updateURL(leagueIdInput.value);
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
  // return to standings tab when league is added
  store.currentTab = "standings";
  localStorage.currentTab = "standings";
};
</script>

<template>
  <div class="container mt-4">
    <div
      class="flex justify-start max-w-md mx-auto sm:max-w-lg lg:max-w-xl xl:max-w-full"
    >
      <select
        aria-label="Input type"
        v-model="inputType"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-base sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-50 dark:focus:ring-blue-500 dark:focus:border-blue-500 input-height custom-drop-width"
      >
        <option selected>League ID</option>
        <option>Username</option>
      </select>
      <select
        aria-label="Season year"
        v-if="inputType === 'Username'"
        v-model="seasonYear"
        class="bg-gray-50 border border-gray-300 text-gray-900 text-base sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-50 dark:focus:ring-blue-500 dark:focus:border-blue-500 input-height custom-year-width"
      >
        <option selected>2025</option>
        <option>2024</option>
        <option>2023</option>
        <option>2022</option>
        <option>2021</option>
      </select>
      <div class="w-full">
        <Input
          v-model="leagueIdInput"
          type="text"
          id="default-input"
          @keydown.enter="onSubmit()"
          :placeholder="
            inputType === 'League ID' ? 'Enter League ID' : 'Enter Username'
          "
        />
        <p
          v-if="showErrorMsg"
          id="helper-text-explanation"
          class="mt-1 ml-0.5 -mb-2 text-xs text-red-600 dark:text-red-500"
        >
          {{ errorMsg }}
        </p>
        <p
          v-if="showHelperMsg"
          id="helper-text-explanation"
          class="mt-2 -mb-2 text-xs dark:text-gray-50"
        >
          Loading leagues...
        </p>
      </div>
      <div class="sm:ml-4">
        <Button aria-label="Button to submit league ID" @click="onSubmit()">
          Submit
        </Button>
      </div>
    </div>
    <div class="">
      <button
        aria-label="Button to submit league ID"
        @click="onSubmit()"
        type="submit"
        class="text-gray-50 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-base sm:text-sm sm:w-auto px-3 sm:px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 block sm:hidden mt-4 w-full max-w-md mx-auto"
      >
        Submit
      </button>
    </div>
  </div>
</template>
<style scoped>
.input-height {
  max-height: 46px;
}
.custom-year-width {
  width: 90px;
}
.custom-drop-width {
  width: 126px;
}
</style>
