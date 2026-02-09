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
import { ref, computed } from "vue";
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

const currentLeague = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex];
});

const currentLeagueId = computed(() => {
  return store.currentLeagueId;
});

const leagueMetadata = computed(() => {
  if (currentLeague.value) {
    return (
      currentLeague?.value.season +
      ": " +
      capitalize(currentLeague?.value.seasonType) +
      " " +
      currentLeague?.value.totalRosters +
      "-team"
    );
  }
  return "";
});

const selectLeague = (leagueId: string) => {
  store.updateCurrentLeagueId(leagueId);
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
    if (currentLeague.value.previousLeagues) {
      currentLeague.value.previousLeagues.forEach((league: LeagueInfoType) => {
        localStorage.removeItem(league.leagueId);
      });
    }
    store.$patch((state) => {
      state.leagueInfo = state.leagueInfo.filter(
        (item) => item.leagueId !== currentLeagueId.value
      );
    });
    store.updateCurrentLeagueId(store.leagueIds[0] || "");
    store.updateRemovedAlert(true);
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentTab");
      removeHistoryLeagues();
      store.showUsernames = false;
      store.currentTab = "Standings";
      // reset url if there are no leagues
      router.replace({
        path: "/",
        query: {},
      });
    }
    if (localStorage.originalData) {
      const currentData = JSON.parse(localStorage.originalData);
      delete currentData[currentLeagueId.value];
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
  selectLeague(currentLeagueId.value);
  store.$patch((state) => {
    state.leagueInfo = state.leagueInfo.filter(
      (item) => item.leagueId !== currentLeagueId.value
    );
  });
  if (localStorage.originalData) {
    const currentData = JSON.parse(localStorage.originalData);
    delete currentData[currentLeagueId.value];
    localStorage.originalData = JSON.stringify(currentData);
  }
  store.updateLoadingLeague(currentLeague.value?.name);
  store.updateLeagueInfo(await getData(currentLeagueId.value));
  store.showRefreshAlert = true;
  store.updateLoadingLeague("");
  setTimeout(() => {
    store.showRefreshAlert = false;
  }, 3000);
  await inputLeague(
    currentLeague.value.leagueId,
    currentLeague.value.name,
    currentLeague.value.totalRosters,
    currentLeague.value.seasonType,
    currentLeague.value.season
  );
};

const shareLeague = () => {
  const currentUrl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname;
  const updatedURL = `${currentUrl}?leagueId=${currentLeague.value.leagueId}`;
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
              <div class="flex flex-col gap-0.5 leading-none w-40">
                <span class="font-medium truncate">{{
                  currentLeague?.name ?? "Loading... "
                }}</span>
                <span class="text-sm text-gray-800">{{ leagueMetadata }}</span>
              </div>
              <ChevronsUpDown class="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-60" align="start">
            <DropdownMenuItem
              v-for="league in leagues"
              :key="league.leagueId"
              @select="currentLeagueId = league.leagueId"
            >
              <div @click="selectLeague(league.leagueId)">
                <p class="truncate max-w-40">{{ league.name }}</p>
                <p class="text-xs text-gray-800">
                  {{ leagueMetadata }}
                </p>
              </div>

              <Check
                v-if="league.leagueId === currentLeagueId"
                class="ml-auto"
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Dialog>
              <template #trigger>
                <div class="flex p-1 cursor-default hover:bg-neutral-100">
                  <div
                    class="flex items-center justify-center bg-transparent border rounded-md size-6"
                  >
                    <Plus class="size-4" />
                  </div>
                  <p class="ml-2 mt-0.5 text-sm text-gray-700">Add League</p>
                </div>
              </template>
            </Dialog>
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
