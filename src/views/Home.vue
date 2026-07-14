<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from "vue";

import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import UserLeagueList from "../components/home/UserLeagueList.vue";
import { fakePoints, fakeRosters, fakeUsers } from "../api/fakeLeague";
import Input from "@/components/ui/input/Input.vue";
import { getLeagueKey, useStore } from "../store/store";
import { getData, inputLeague } from "../api/api";
import {
  getEspnErrorMessage,
  getEspnLeagueInfo,
  getSavedEspnAuth,
} from "@/api/espnApi";
import { getLeague } from "../api/sleeperApi";
import { LeagueInfoType } from "../types/types";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { getParsedStorageItem, isBoolean } from "@/lib/storage";
import { mapWithConcurrency } from "@/lib/async";
import { trackEvent } from "@/lib/analytics";

const Table = defineAsyncComponent(
  () => import("../components/standings/Table.vue")
);

const route = useRoute();
const router = useRouter();
const store = useStore();

const isInitialLoading = ref(true);
const cachedGoogleSitelinks = ["1218604624068497408", "1057743221285101568"];

const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const clicked = ref(systemDarkMode);

const hasMissingEspnPlayerIds = (league: LeagueInfoType) =>
  league.platform === "espn" &&
  league.rosters.length > 0 &&
  league.rosters.every((roster) => !roster.players?.length);

const persistSavedLeagues = () => {
  localStorage.setItem("leagueInfo", JSON.stringify(store.leagueInfo));
};

const canApplyRefresh = (league: LeagueInfoType) =>
  store.findLeague(getLeagueKey(league))?.lastUpdated === league.lastUpdated;

const refreshSavedLeagues = async (savedLeagues: LeagueInfoType[]) => {
  const staleLeagues = savedLeagues.filter((league) => {
    const age = Date.now() - league.lastUpdated;
    return age > 86400000 || hasMissingEspnPlayerIds(league);
  });

  await mapWithConcurrency(staleLeagues, 2, async (league) => {
    if (league.platform === "espn") {
      try {
        const refreshedData = await getEspnLeagueInfo(
          league.season,
          league.leagueId,
          getSavedEspnAuth(league.season, league.leagueId)
        );
        if (!canApplyRefresh(league)) return;
        store.updateLeagueInfo(refreshedData);
        persistSavedLeagues();
      } catch (error) {
        toast.error(getEspnErrorMessage(error));
      }
      return;
    }

    try {
      const refreshedData = await getData(league.leagueId);
      if (!canApplyRefresh(league)) return;
      store.updateLeagueInfo(refreshedData);
      persistSavedLeagues();
      await inputLeague(
        league.leagueId,
        league.name,
        league.totalRosters,
        league.seasonType,
        league.season,
        "sleeper"
      );
    } catch (error) {
      console.error(`Unable to refresh saved league ${league.leagueId}:`, error);
      toast.error(`Unable to refresh ${league.name}. Showing saved data.`);
    }
  });
};

onMounted(async () => {
  try {
    checkSystemTheme();
    const savedLeagues = getParsedStorageItem<LeagueInfoType[]>(
      "leagueInfo",
      [],
      { isValid: Array.isArray }
    );
    if (savedLeagues.length > 0) {
      const leaguesToHydrate = savedLeagues.filter(
        (league) => !store.leagueIds.includes(getLeagueKey(league))
      );
      leaguesToHydrate.forEach((league) => store.updateLeagueInfo(league));
      store.updateCurrentLeagueId(localStorage.getItem("currentLeagueId") ?? "");
      isInitialLoading.value = false;

      // Cached data is immediately usable. Refresh stale leagues without
      // keeping Safari's main view behind a loading screen.
      void refreshSavedLeagues(leaguesToHydrate);
    }
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    const season = Array.isArray(route.query.season)
      ? route.query.season[0]
      : route.query.season;
    const isEspnLeague = "espn" in route.query;
    const routeSource = Array.isArray(route.query.source)
      ? route.query.source[0]
      : route.query.source;
    const routeLeagueKey =
      isEspnLeague && leagueId && season
        ? getLeagueKey({ platform: "espn", leagueId, season })
        : leagueId;
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (
      leagueId &&
      routeLeagueKey &&
      !store.leagueIds.includes(routeLeagueKey) &&
      !cachedGoogleSitelinks.includes(leagueId)
    ) {
      if (isEspnLeague) {
        if (!season) {
          toast.error("Missing ESPN season");
          return;
        }
        store.updateLoadingLeague("ESPN League");
        try {
          const league = await getEspnLeagueInfo(
            season,
            leagueId,
            getSavedEspnAuth(season, leagueId)
          );
          store.updateLeagueInfo(league);
          store.updateCurrentLeagueId(getLeagueKey(league));
          store.currentTab = "Standings";
          localStorage.setItem("currentTab", "Standings");
          trackEvent("League Added", {
            platform: "espn",
            source: routeSource || "shared_link",
          });
        } catch (error) {
          toast.error(getEspnErrorMessage(error));
        }
        store.updateLoadingLeague("");
        return;
      }

      const checkInput = await getLeague(leagueId);
      if (checkInput["name"]) {
        store.updateCurrentLeagueId(leagueId);
        store.updateLoadingLeague(checkInput["name"]);
        const league = await getData(leagueId);
        store.updateLeagueInfo(league);
        await inputLeague(
          leagueId,
          league.name,
          league.totalRosters,
          league.seasonType,
          league.season,
          "sleeper"
        );
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        trackEvent("League Added", {
          platform: "sleeper",
          source: routeSource || "shared_link",
        });
        store.updateLoadingLeague("");
      } else {
        toast.error("Invalid League ID");
      }
    } else if (leagueId === "undefined") {
      localStorage.removeItem("currentLeagueId");
      localStorage.removeItem("leagueInfo");
      toast.error("Error fetching data. Please try refreshing the page.");
      // these leagues are somehow being cached in google sitelinks
    } else if (leagueId && cachedGoogleSitelinks.includes(leagueId)) {
      const newQuery = { ...route.query };
      delete newQuery.leagueId;
      router.replace({ path: route.path, query: newQuery });
    } else if (routeLeagueKey && store.leagueIds.includes(routeLeagueKey)) {
      store.updateCurrentLeagueId(routeLeagueKey);
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
    clicked.value = getParsedStorageItem("darkMode", systemDarkMode, {
      isValid: isBoolean,
    });
    store.updateDarkMode(clicked.value);
  }
};
</script>

<template>
  <div>
    <SkeletonLoading v-if="isInitialLoading" />
    <div v-else>
      <SkeletonLoading v-if="store.loadingLeague" />
      <div
        v-else-if="store.currentLeagueId"
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
      <div
        v-else
        :class="store.currentTab === 'Home' ? '' : 'container mx-auto'"
      >
        <Table :users="fakeUsers" :rosters="fakeRosters" :points="fakePoints" />
      </div>
    </div>
  </div>
</template>
