<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";

import SkeletonLoading from "../components/util/SkeletonLoading.vue";
import UserLeagueList from "../components/home/UserLeagueList.vue";
import { fakePoints, fakeRosters, fakeUsers } from "../api/fakeLeague";
import Input from "@/components/ui/input/Input.vue";
import { Button } from "@/components/ui/button";
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
import {
  flushLeaguePersistence,
  hasPendingLeaguePersistence,
  LeagueStorageUnavailableError,
  leaguePersistenceStatus,
  loadSavedLeagues,
} from "@/lib/leagueStorage";
import { refreshLeagueAtomically } from "@/lib/leagueRefresh";
import {
  createLatestRequestGuard,
  getLeagueLoadErrorMessage,
  isRequestCancellation,
} from "@/lib/request";

const Table = defineAsyncComponent(
  () => import("../components/standings/Table.vue")
);

const route = useRoute();
const router = useRouter();
const store = useStore();

const isInitialLoading = ref(true);
const storageUnavailable = computed(
  () => leaguePersistenceStatus.value === "blocked"
);
const homeInitializationRequests = createLatestRequestGuard();
const cachedGoogleSitelinks = ["1218604624068497408", "1057743221285101568"];

const systemDarkMode = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const clicked = ref(systemDarkMode);

const hasMissingEspnPlayerIds = (league: LeagueInfoType) =>
  league.platform === "espn" &&
  league.rosters.length > 0 &&
  league.rosters.every((roster) => !roster.players?.length);

const canApplyRefresh = (league: LeagueInfoType) =>
  store.findLeague(getLeagueKey(league))?.lastUpdated === league.lastUpdated;

const refreshSavedLeagues = async (savedLeagues: LeagueInfoType[]) => {
  const staleLeagues = savedLeagues.filter((league) => {
    const age = Date.now() - league.lastUpdated;
    return age > 86400000 || hasMissingEspnPlayerIds(league);
  });

  await mapWithConcurrency(staleLeagues, 2, async (league) => {
    try {
      await refreshLeagueAtomically(league, (refreshedLeague) => {
        if (!canApplyRefresh(league)) return;
        store.updateLeagueInfo(refreshedLeague);
        void inputLeague(
          refreshedLeague.leagueId,
          refreshedLeague.name,
          refreshedLeague.totalRosters,
          refreshedLeague.seasonType,
          refreshedLeague.season,
          refreshedLeague.platform === "espn" ? "espn" : "sleeper"
        );
      });
    } catch (error) {
      console.error(`Unable to refresh saved league ${league.leagueId}:`, error);
      toast.error(
        league.platform === "espn"
          ? getEspnErrorMessage(error)
          : `${league.name}: ${getLeagueLoadErrorMessage(error)} Showing saved data.`
      );
    }
  });
};

const initializeHome = async () => {
  const controller = homeInitializationRequests.start();
  const routeSnapshot = {
    fullPath: route.fullPath,
    path: route.path,
    query: { ...route.query },
  };
  const routeIsEspnLeague = "espn" in routeSnapshot.query;
  const leagueId = Array.isArray(routeSnapshot.query.leagueId)
    ? routeSnapshot.query.leagueId[0]
    : routeSnapshot.query.leagueId;
  const season = Array.isArray(routeSnapshot.query.season)
    ? routeSnapshot.query.season[0]
    : routeSnapshot.query.season;
  const routeSource = Array.isArray(routeSnapshot.query.source)
    ? routeSnapshot.query.source[0]
    : routeSnapshot.query.source;
  const isInitializationActive = () =>
    homeInitializationRequests.isActive(controller);
  const isActive = () =>
    isInitializationActive() && route.fullPath === routeSnapshot.fullPath;

  isInitialLoading.value = true;
  try {
    checkSystemTheme();
    const recoveringPendingChanges = hasPendingLeaguePersistence();
    const savedLeagues = await loadSavedLeagues();
    if (!isInitializationActive()) return;

    if (recoveringPendingChanges) {
      const recovered = await flushLeaguePersistence();
      if (!recovered) {
        throw new LeagueStorageUnavailableError(
          new Error("Pending league changes could not be saved")
        );
      }
      if (!isInitializationActive()) return;
    }

    if (!recoveringPendingChanges && savedLeagues.length > 0) {
      const leaguesToHydrate = savedLeagues.filter(
        (league) => !store.leagueIds.includes(getLeagueKey(league))
      );
      leaguesToHydrate.forEach((league) => store.updateLeagueInfo(league));
      if (route.fullPath === routeSnapshot.fullPath && !leagueId) {
        store.updateCurrentLeagueId(
          localStorage.getItem("currentLeagueId") ?? ""
        );
      }
      isInitialLoading.value = false;

      // Cached data is immediately usable. Refresh stale leagues without
      // keeping Safari's main view behind a loading screen.
      void refreshSavedLeagues(leaguesToHydrate);
    }

    // Storage hydration must survive query changes made by the add-league flow.
    // Only the route-specific import work below depends on the original URL.
    if (!isActive()) return;

    const isEspnLeague = routeIsEspnLeague;
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
            getSavedEspnAuth(season, leagueId),
            { signal: controller.signal }
          );
          if (!isActive()) return;

          store.updateLeagueInfo(league);
          store.updateCurrentLeagueId(getLeagueKey(league));
          store.currentTab = "Standings";
          localStorage.setItem("currentTab", "Standings");
          trackEvent("League Added", {
            platform: "espn",
            source: routeSource || "shared_link",
          });
          void inputLeague(
            league.leagueId,
            league.name,
            league.totalRosters,
            league.seasonType,
            league.season,
            "espn"
          );
        } catch (error) {
          if (isRequestCancellation(error) || !isActive()) return;
          toast.error(getEspnErrorMessage(error));
        }
        store.updateLoadingLeague("");
        return;
      }

      const checkInput = await getLeague(leagueId, controller.signal);
      if (!isActive()) return;

      if (checkInput["name"]) {
        store.updateLoadingLeague(checkInput["name"]);
        const league = await getData(leagueId, { signal: controller.signal });
        if (!isActive()) return;

        store.updateLeagueInfo(league);
        store.updateCurrentLeagueId(getLeagueKey(league));
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
      toast.error("Error fetching data. Please try refreshing the page.");
      // these leagues are somehow being cached in google sitelinks
    } else if (leagueId && cachedGoogleSitelinks.includes(leagueId)) {
      const newQuery = { ...routeSnapshot.query };
      delete newQuery.leagueId;
      await router.replace({ path: routeSnapshot.path, query: newQuery });
      const savedCurrentLeagueId =
        localStorage.getItem("currentLeagueId") ?? "";
      store.updateCurrentLeagueId(
        store.leagueIds.includes(savedCurrentLeagueId)
          ? savedCurrentLeagueId
          : (store.leagueIds[0] ?? "")
      );
    } else if (routeLeagueKey && store.leagueIds.includes(routeLeagueKey)) {
      store.updateCurrentLeagueId(routeLeagueKey);
    }
  } catch (error) {
    if (isRequestCancellation(error) || !isInitializationActive()) return;
    if (error instanceof LeagueStorageUnavailableError) {
      toast.error("Saved leagues are temporarily unavailable.");
      return;
    }
    if (!isActive()) return;
    toast.error(
      routeIsEspnLeague
        ? getEspnErrorMessage(error)
        : getLeagueLoadErrorMessage(error)
    );
  } finally {
    if (homeInitializationRequests.finish(controller)) {
      store.updateLoadingLeague("");
      isInitialLoading.value = false;
    }
  }
};

onMounted(initializeHome);

onBeforeUnmount(() => {
  homeInitializationRequests.cancel();
  store.updateLoadingLeague("");
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
    <div
      v-if="storageUnavailable"
      class="container mx-auto flex min-h-[60vh] items-center justify-center px-4"
    >
      <div class="max-w-lg rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 class="text-xl font-semibold">Saved leagues are unavailable</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          We could not safely read your saved league data, so league changes
          are paused to prevent data loss. Close any other open ffwrapped tabs,
          then try again.
        </p>
        <Button
          class="mt-4"
          type="button"
          :disabled="isInitialLoading"
          @click="initializeHome"
        >
          {{ isInitialLoading ? "Trying again…" : "Try again" }}
        </Button>
      </div>
    </div>
    <SkeletonLoading v-else-if="isInitialLoading" />
    <div v-else>
      <SkeletonLoading v-if="store.loadingLeague" />
      <div v-show="!store.loadingLeague">
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
        <div
          v-else
          :class="store.currentTab === 'Home' ? '' : 'container mx-auto'"
        >
          <Table
            :users="fakeUsers"
            :rosters="fakeRosters"
            :points="fakePoints"
          />
        </div>
      </div>
    </div>
  </div>
</template>
