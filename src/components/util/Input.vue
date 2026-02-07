<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "../../store/store";
import { LeagueInfoType } from "../../types/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  emit("submit");
};
</script>

<template></template>
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
