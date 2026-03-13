<script setup lang="ts">
import { onMounted, ref } from "vue";

import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import UserLeagueList from "../components/home/UserLeagueList.vue";
import { fakePoints, fakeRosters, fakeUsers } from "../api/fakeLeague";
import Input from "@/components/ui/input/Input.vue";
import Table from "../components/standings/Table.vue";
import { useStore } from "../store/store";
import { getData, inputLeague, validateLeague } from "../api/api";
import { LeagueInfoType } from "../types/types";
import { useRoute } from "vue-router";
import { toast } from "vue-sonner";
import {
  buildLeagueKey,
  DEFAULT_FANTASY_PROVIDER,
  normalizeLeagueInfo,
} from "@/lib/leagueIdentity";

const route = useRoute();
const store = useStore();

const showLoading = ref(false);
const isInitialLoading = ref(true);

const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const clicked = ref(systemDarkMode);

onMounted(async () => {
  try {
    checkSystemTheme();
    const savedLeagueInfo = localStorage.getItem("leagueInfo");
    if (savedLeagueInfo) {
      const savedLeagues = JSON.parse(savedLeagueInfo);
      await Promise.all(
        savedLeagues.map(async (league: LeagueInfoType) => {
          const normalizedLeague = normalizeLeagueInfo(league);
          if (!store.leagueKeys.includes(normalizedLeague.leagueKey)) {
            const currentTime = new Date().getTime();
            const diff = currentTime - normalizedLeague.lastUpdated;
            if (diff > 86400000) {
              // 1 day
              showLoading.value = true;
              const originalData = localStorage.getItem("originalData");
              if (originalData) {
                const currentData = JSON.parse(originalData);
                delete currentData[normalizedLeague.leagueKey];
                delete currentData[normalizedLeague.leagueId];
                localStorage.setItem("originalData", JSON.stringify(currentData));
              }
              store.updateLoadingLeague(normalizedLeague.name);
              const refreshedData = await getData({
                provider: normalizedLeague.provider,
                leagueId: normalizedLeague.leagueId,
              });
              store.updateLeagueInfo(refreshedData);
              await inputLeague(
                normalizedLeague.leagueId,
                normalizedLeague.name,
                normalizedLeague.totalRosters,
                normalizedLeague.seasonType,
                normalizedLeague.season
              );
              showLoading.value = false;
            } else {
              store.updateLeagueInfo(normalizedLeague);
            }
          }
        })
      );
      const savedLeagueKey = localStorage.getItem("currentLeagueKey");
      const savedLeagueId = localStorage.getItem("currentLeagueId");
      const savedProvider =
        (localStorage.getItem("currentLeagueProvider") as
          | "sleeper"
          | "espn"
          | null) ?? DEFAULT_FANTASY_PROVIDER;
      if (savedLeagueKey) {
        store.updateCurrentLeagueKey(savedLeagueKey);
      } else if (savedLeagueId) {
        store.updateCurrentLeagueId(savedLeagueId, savedProvider);
      }
      store.updateLoadingLeague("");
    }
    const provider = Array.isArray(route.query.provider)
      ? route.query.provider[0]
      : route.query.provider;
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    const season = Array.isArray(route.query.season)
      ? route.query.season[0]
      : route.query.season;
    const routeProvider =
      provider === "espn" || provider === "sleeper"
        ? provider
        : DEFAULT_FANTASY_PROVIDER;
    const routeLeagueKey = leagueId
      ? buildLeagueKey(routeProvider, leagueId)
      : "";
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (leagueId && !store.leagueKeys.includes(routeLeagueKey)) {
      const checkInput = await validateLeague({
        provider: routeProvider,
        leagueId,
        season: routeProvider === "espn" ? season ?? undefined : undefined,
      });
      if (checkInput?.name) {
        store.updateCurrentLeagueId(leagueId, routeProvider);
        store.updateLoadingLeague(checkInput.name);
        const league = await getData({
          provider: routeProvider,
          leagueId,
          season: routeProvider === "espn" ? season ?? undefined : undefined,
        });
        store.updateLeagueInfo(league);
        await inputLeague(
          leagueId,
          league.name,
          league.totalRosters,
          league.seasonType,
          league.season
        );
        store.updateLoadingLeague("");
      } else {
        toast.error("Invalid League ID");
      }
    } else if (leagueId === "undefined") {
      localStorage.removeItem("currentLeagueKey");
      localStorage.removeItem("currentLeagueId");
      localStorage.removeItem("currentLeagueProvider");
      localStorage.removeItem("leagueInfo");
      toast.error("Error fetching data. Please try refreshing the page.");
    }
  } catch {
    toast.error("Error fetching data. Please try refreshing the page.");
  } finally {
    isInitialLoading.value = false;
  }
});

const checkSystemTheme = () => {
  const savedDarkMode = localStorage.getItem("darkMode");
  if (systemDarkMode && savedDarkMode === null) {
    clicked.value = true;
    store.updateDarkMode(true);
  } else if (savedDarkMode !== null) {
    clicked.value = JSON.parse(savedDarkMode);
    store.updateDarkMode(clicked.value);
  }
};
</script>

<template>
  <div>
    <SkeletonLoading v-if="isInitialLoading" />
    <div v-else>
      <div
        v-if="store.currentLeagueId"
        :class="store.currentTab === 'Home' ? '' : 'container mx-auto'"
      >
        <Input v-if="store.showInput" class="custom-input-width" />
        <div v-if="store.showLeaguesList" class="container mx-auto">
          <UserLeagueList />
        </div>
        <div
          v-if="
            store.leagueUsers[store.currentLeagueIndex] &&
            !store.loadingUserLeagues
          "
        >
          <Table
            :users="store.leagueUsers[store.currentLeagueIndex]"
            :rosters="store.leagueRosters[store.currentLeagueIndex]"
            :points="store.weeklyPoints[store.currentLeagueIndex]"
          />
        </div>
        <SkeletonLoading v-else />
      </div>
      <div v-else-if="store.showLeaguesList" class="container mx-auto">
        <UserLeagueList />
      </div>

      <SkeletonLoading v-else-if="showLoading" />
      <div
        v-else
        :class="store.currentTab === 'Home' ? '' : 'container mx-auto'"
      >
        <Table :users="fakeUsers" :rosters="fakeRosters" :points="fakePoints" />
      </div>
    </div>
  </div>
</template>
