<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { LeagueInfoType } from "../../types/types";
import { useStore } from "../../store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent class="">
      <DialogHeader>
        <DialogTitle>Add League</DialogTitle>
        <DialogDescription>
          Enter your Sleeper league ID or username.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <!-- Stack everything vertically on mobile, single row on desktop -->
        <div class="flex flex-col gap-2 sm:flex-row">
          <div class="flex flex-row gap-2">
            <Select v-model="inputType">
              <SelectTrigger class="sm:w-32">
                <SelectValue placeholder="League ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="League ID">League ID</SelectItem>
                <SelectItem value="Username">Username</SelectItem>
              </SelectContent>
            </Select>
            <Select v-if="inputType === 'Username'" v-model="seasonYear">
              <SelectTrigger class="sm:w-24">
                <SelectValue placeholder="2025" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            v-model="leagueIdInput"
            type="text"
            class="flex-1 min-h-9"
            @keydown.enter="onSubmit()"
            :placeholder="
              inputType === 'League ID' ? 'Enter League ID' : 'Enter Username'
            "
          />
          <Button @click="onSubmit()">Submit</Button>
        </div>
        <p v-if="showErrorMsg" class="text-xs text-destructive">
          {{ errorMsg }}
        </p>
        <p v-if="showHelperMsg" class="text-xs text-muted-foreground">
          Loading leagues...
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
