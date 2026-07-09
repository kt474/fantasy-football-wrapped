<script setup lang="ts">
import {
  Check,
  ChevronsUpDown,
  Plus,
  X,
  RefreshCcw,
  Share,
  EllipsisVertical,
} from "lucide-vue-next";
import capitalize from "lodash/capitalize";

import { Button } from "@/components/ui/button";
import Separator from "../ui/separator/Separator.vue";
import { computed, nextTick, ref } from "vue";
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
import { getLeagueKey, useStore } from "../../store/store";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

import { getData, inputLeague } from "../../api/api";
import {
  getEspnErrorMessage,
  getEspnLeagueInfo,
  getSavedEspnAuth,
  removeSavedEspnAuth,
} from "@/api/espnApi";
import Dialog from "./Dialog.vue";
import { getParsedStorageItem, isRecord } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";

const router = useRouter();
const store = useStore();
const leagueMenuOpen = ref(false);
const addLeagueOpen = ref(false);

defineProps<{
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
  const numberStartRegex = /^[0-9]/;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (numberStartRegex.test(key) || key.startsWith("league-history"))
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
};

const removeLeague = () => {
  if (localStorage.getItem("leagueInfo")) {
    const removedLeagueId = currentLeagueId.value;
    const removedLeague = currentLeague.value;
    removeHistoryLeagues();
    if (removedLeague.platform === "espn") {
      removeSavedEspnAuth(removedLeague.season, removedLeague.leagueId);
    }
    if (removedLeague.previousLeagues) {
      removedLeague.previousLeagues.forEach((league: LeagueInfoType) => {
        localStorage.removeItem(league.leagueId);
      });
    }
    store.$patch((state) => {
      state.leagueInfo = state.leagueInfo.filter(
        (item) => getLeagueKey(item) !== removedLeagueId
      );
    });
    store.updateCurrentLeagueId(store.leagueIds[0] || "");
    toast.success("League removed!");
    if (store.currentLeagueId === "") {
      localStorage.removeItem("currentTab");
      store.showUsernames = false;
      store.currentTab = "Home";
      // reset url if there are no leagues
      router.replace({
        path: "/",
        query: {},
      });
    }
    const originalData = localStorage.getItem("originalData");
    if (originalData) {
      const currentData = getParsedStorageItem<Record<string, unknown>>(
        "originalData",
        {},
        { isValid: isRecord }
      );
      delete currentData[removedLeagueId];
      if (Object.keys(currentData).length == 0) {
        localStorage.removeItem("originalData");
      } else {
        localStorage.setItem("originalData", JSON.stringify(currentData));
      }
    }
  }
};

const refreshLeague = async () => {
  const leagueToRefresh = currentLeague.value;
  if (!leagueToRefresh) {
    return;
  }

  selectLeague(currentLeagueId.value);
  store.$patch((state) => {
    state.leagueInfo = state.leagueInfo.filter(
      (item) => getLeagueKey(item) !== currentLeagueId.value
    );
  });
  const originalData = localStorage.getItem("originalData");
  if (originalData) {
    const currentData = getParsedStorageItem<Record<string, unknown>>(
      "originalData",
      {},
      { isValid: isRecord }
    );
    delete currentData[currentLeagueId.value];
    localStorage.setItem("originalData", JSON.stringify(currentData));
  }
  store.updateLoadingLeague(leagueToRefresh.name);
  let didRefresh = false;
  try {
    if (leagueToRefresh.platform === "espn") {
      const refreshedLeague = await getEspnLeagueInfo(
        leagueToRefresh.season,
        leagueToRefresh.leagueId,
        getSavedEspnAuth(leagueToRefresh.season, leagueToRefresh.leagueId)
      );
      store.updateLeagueInfo(refreshedLeague);
      store.updateCurrentLeagueId(getLeagueKey(refreshedLeague));
      didRefresh = true;
    } else {
      const refreshedLeague = await getData(leagueToRefresh.leagueId);
      store.updateLeagueInfo(refreshedLeague);
      await inputLeague(
        leagueToRefresh.leagueId,
        leagueToRefresh.name,
        leagueToRefresh.totalRosters,
        leagueToRefresh.seasonType,
        leagueToRefresh.season,
        "sleeper"
      );
      didRefresh = true;
    }
  } catch (error) {
    toast.error(
      leagueToRefresh.platform === "espn"
        ? getEspnErrorMessage(error)
        : "Unable to refresh league data right now. Please try again."
    );
    store.updateLeagueInfo(leagueToRefresh);
    store.updateCurrentLeagueId(getLeagueKey(leagueToRefresh));
  } finally {
    store.updateLoadingLeague("");
  }
  if (didRefresh) {
    toast.success("League data refreshed!");
  }
};

const isShareSupported = ref(false);

if (typeof window !== "undefined") {
  isShareSupported.value = !!navigator.share;
}

const sharePopup = async () => {
  try {
    await navigator.share({
      title: `${currentLeague.value.name} ffwrapped`,
      text: "ffwrapped",
      url: window.location.href,
    });
    trackEvent("League Shared", {
      method: "native",
      platform: currentLeague.value.platform ?? "sleeper",
    });
  } catch (error) {
    console.error("Sharing failed:", error);
  }
};

const shareLeague = () => {
  const currentUrl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname;
  const updatedURL =
    currentLeague.value.platform === "espn"
      ? `${currentUrl}?espn&leagueId=${currentLeague.value.leagueId}&season=${currentLeague.value.season}`
      : `${currentUrl}?leagueId=${currentLeague.value.leagueId}`;
  navigator.clipboard.writeText(updatedURL);
  trackEvent("League Shared", {
    method: "clipboard",
    platform: currentLeague.value.platform ?? "sleeper",
  });
  toast.success("Link copied to clipboard!");
};

const openAddLeagueDialog = async () => {
  leagueMenuOpen.value = false;
  await nextTick();
  addLeagueOpen.value = true;
};
</script>

<template>
  <div class="flex">
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu v-model:open="leagueMenuOpen">
          <DropdownMenuTrigger as-child>
            <SidebarMenuButton
              size="lg"
              class="text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div class="flex flex-col gap-0.5 w-40">
                <span class="font-medium truncate">{{
                  currentLeague?.name ?? "Loading... "
                }}</span>
                <span class="text-sm text-muted-foreground">{{
                  leagueMetadata
                }}</span>
              </div>
              <ChevronsUpDown class="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-60" align="start">
            <DropdownMenuItem
              v-for="league in leagues"
              :key="getLeagueKey(league)"
              @select="selectLeague(getLeagueKey(league))"
              class="flex items-start cursor-pointer"
            >
              <div class="flex flex-col">
                <p class="truncate max-w-40">
                  {{ league.name }}
                </p>

                <p class="text-xs text-muted-foreground">
                  {{
                    league.season +
                    ": " +
                    capitalize(league.seasonType) +
                    " " +
                    league.totalRosters +
                    "-team"
                  }}
                </p>
              </div>
              <Check
                v-if="getLeagueKey(league) === currentLeagueId"
                class="w-4 h-4 mt-2 ml-auto text-primary"
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              @select="openAddLeagueDialog"
              class="flex items-start cursor-pointer"
            >
              <div
                class="flex items-center justify-center border rounded-md size-6"
              >
                <Plus class="size-4" />
              </div>
              <p class="ml-3 mt-0.5 text-sm">Add League</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog v-model:open="addLeagueOpen" />
      </SidebarMenuItem>
    </SidebarMenu>
    <Separator
      orientation="vertical"
      class="data-[orientation=vertical]:h-8 mt-2 ml-2"
    />
    <!-- Desktop: horizontal buttons -->
    <div class="justify-between hidden mt-2 ml-2 md:flex">
      <Button
        @click="removeLeague"
        variant="ghost"
        size="icon-sm"
        class="transition-colors text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <X />
        <span class="sr-only">Remove League</span>
      </Button>
      <Button
        @click="refreshLeague"
        variant="ghost"
        size="icon-sm"
        class="transition-colors text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <RefreshCcw />
        <span class="sr-only">Refresh League</span>
      </Button>
      <Button
        v-if="isShareSupported"
        @click="sharePopup"
        variant="ghost"
        size="icon-sm"
        class="transition-colors text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Share />
        <span class="sr-only">Share League</span>
      </Button>
      <Button
        v-else
        @click="shareLeague"
        variant="ghost"
        size="icon-sm"
        class="transition-colors text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Share />
        <span class="sr-only">Share League</span>
      </Button>
    </div>

    <!-- Mobile: dropdown menu -->
    <div class="flex mt-2 ml-2 md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon-sm"
            class="transition-colors text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <EllipsisVertical />
            <span class="sr-only">League Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @select="removeLeague" class="cursor-pointer p-2.5">
            Remove
            <X class="ml-auto size-4" />
          </DropdownMenuItem>
          <DropdownMenuItem
            @select="refreshLeague"
            class="cursor-pointer p-2.5"
          >
            Refresh
            <RefreshCcw class="ml-auto size-4" />
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="isShareSupported"
            @select="sharePopup"
            class="cursor-pointer p-2.5"
          >
            Share
            <Share class="ml-auto size-4" />
          </DropdownMenuItem>
          <DropdownMenuItem
            v-else
            @select="shareLeague"
            class="cursor-pointer p-2.5"
          >
            Share
            <Share class="ml-auto size-4" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>
