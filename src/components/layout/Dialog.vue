<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { LeagueInfoType } from "../../types/types";
import { useStore } from "../../store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
const open = ref(false);
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

watch(
  () => open.value,
  () => {
    errorMsg.value = "";
    showErrorMsg.value = false;
  }
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
    open.value = false;
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
        open.value = false;
      }
      leagueIdInput.value = "";
    }
  }
  // return to standings tab when league is added
  store.currentTab = "Standings";
  localStorage.currentTab = "Standings";
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button type="button" size="sm" class="ml-2 text-sm font-medium">
        Add League
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add League</DialogTitle>
      </DialogHeader>
      <div class="flex items-center gap-2">
        <div class="grid flex-1 gap-2">
          <div class="container mt-4">
            <div
              class="flex justify-start max-w-md gap-2 mx-auto sm:max-w-lg lg:max-w-xl xl:max-w-full"
            >
              <Select v-model="inputType">
                <SelectTrigger>
                  <SelectValue placeholder="League ID" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="League ID"> League ID </SelectItem>
                  <SelectItem value="Username"> Username </SelectItem>
                </SelectContent>
              </Select>
              <Select v-if="inputType === 'Username'" v-model="seasonYear">
                <SelectTrigger class="w-40">
                  <SelectValue placeholder="2025" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025"> 2025 </SelectItem>
                  <SelectItem value="2024"> 2024 </SelectItem>
                  <SelectItem value="2023"> 2023 </SelectItem>
                  <SelectItem value="2022"> 2022 </SelectItem>
                  <SelectItem value="2021"> 2021 </SelectItem>
                </SelectContent>
              </Select>
              <div class="w-full mr-2">
                <Input
                  v-model="leagueIdInput"
                  type="text"
                  id="default-input"
                  @keydown.enter="onSubmit()"
                  :placeholder="
                    inputType === 'League ID'
                      ? 'Enter League ID'
                      : 'Enter Username'
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
              <div class="">
                <Button
                  aria-label="Button to submit league ID"
                  @click="onSubmit()"
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
