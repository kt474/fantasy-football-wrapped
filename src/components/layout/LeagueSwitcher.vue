<script setup lang="ts">
import {
  Check,
  ChevronsUpDown,
  Plus,
  X,
  RefreshCcw,
  Share,
} from "lucide-vue-next";
import { capitalize } from "lodash";

import { Button } from "@/components/ui/button";
import Separator from "../ui/separator/Separator.vue";
import { ref } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LeagueInfoType } from "@/types/types";
import { useStore } from "../../store/store";
import { useRouter } from "vue-router";

import { getData, inputLeague } from "../../api/api";
import Dialog from "./Dialog.vue";

const router = useRouter();
const store = useStore();

const props = defineProps<{
  leagues: LeagueInfoType[];
}>();

const selectedVersion = ref(props.leagues[0]?.leagueId);

const selectLeague = () => {
  store.updateCurrentLeagueId(props.leagues[0].leagueId);
};
const removeHistoryLeagues = () => {
  // Regular expression to match keys starting with a digit
  const numberStartRegex = /^[0-9]/;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && numberStartRegex.test(key)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
};
const removeLeague = () => {
  if (localStorage.leagueInfo) {
    if (props.leagues[0].previousLeagues) {
      props.leagues[0].previousLeagues.forEach((league: LeagueInfoType) => {
        localStorage.removeItem(league.leagueId);
      });
    }
    store.$patch((state) => {
      state.leagueInfo = state.leagueInfo.filter(
        (item) => item.leagueId !== props.leagues[0].leagueId
      );
    });
    store.updateCurrentLeagueId(store.leagueIds[0] || "");
    store.updateRemovedAlert(true);
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentTab");
      removeHistoryLeagues();
      store.showUsernames = false;
      store.currentTab = "standings";
      // reset url if there are no leagues
      router.replace({
        path: "/",
        query: {},
      });
    }
    if (localStorage.originalData) {
      const currentData = JSON.parse(localStorage.originalData);
      delete currentData[props.leagues[0].leagueId];
      if (Object.keys(currentData).length == 0) {
        localStorage.removeItem("originalData");
      } else {
        localStorage.originalData = JSON.stringify(currentData);
      }
    }
    setTimeout(() => {
      store.updateRemovedAlert(false);
    }, 3000);
  }
};

const refreshLeague = async () => {
  selectLeague();
  store.$patch((state) => {
    state.leagueInfo = state.leagueInfo.filter(
      (item) => item.leagueId !== props.leagues[0].leagueId
    );
  });
  if (localStorage.originalData) {
    const currentData = JSON.parse(localStorage.originalData);
    delete currentData[props.leagues[0].leagueId];
    localStorage.originalData = JSON.stringify(currentData);
  }
  store.updateLoadingLeague(props.leagues[0].name);
  store.updateLeagueInfo(await getData(props.leagues[0].leagueId));
  store.showRefreshAlert = true;
  store.updateLoadingLeague("");
  setTimeout(() => {
    store.showRefreshAlert = false;
  }, 3000);
  await inputLeague(
    props.leagues[0].leagueId,
    props.leagues[0].name,
    props.leagues[0].totalRosters,
    props.leagues[0].seasonType,
    props.leagues[0].season
  );
};

const shareLeague = () => {
  const currentUrl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname;
  const updatedURL = `${currentUrl}?leagueId=${props.leagues[0].leagueId}`;
  navigator.clipboard.writeText(updatedURL);
  store.showCopiedAlert = true;
  setTimeout(() => {
    store.showCopiedAlert = false;
  }, 3000);
};
</script>

<template>
  <div class="flex">
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <SidebarMenuButton
              size="lg"
              class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-medium">{{ props.leagues[0]?.name }}</span>
                <span class="text-sm text-gray-800">{{
                  props.leagues[0]?.season +
                  ": " +
                  capitalize(props.leagues[0]?.seasonType) +
                  " " +
                  props.leagues[0]?.totalRosters +
                  "-team"
                }}</span>
              </div>
              <ChevronsUpDown class="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-72" align="start">
            <DropdownMenuItem
              v-for="league in leagues"
              :key="league.leagueId"
              @select="selectedVersion = league.leagueId"
            >
              {{ league.name }}
              <Check
                v-if="league.leagueId === selectedVersion"
                class="ml-auto"
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Dialog />
            <DropdownMenuItem class="gap-2 p-2"> </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
    <Separator
      orientation="vertical"
      class="data-[orientation=vertical]:h-8 mt-2 ml-2"
    />
    <div class="flex justify-between mt-2 ml-2">
      <Button @click="removeLeague" variant="ghost" size="icon-sm">
        <X />
        <span class="sr-only">Remove League</span>
      </Button>
      <Button @click="refreshLeague" variant="ghost" size="icon-sm">
        <RefreshCcw />
        <span class="sr-only">Refresh League</span>
      </Button>
      <Button @click="shareLeague" variant="ghost" size="icon-sm">
        <Share />
        <span class="sr-only">Share League</span>
      </Button>
    </div>
  </div>
</template>
