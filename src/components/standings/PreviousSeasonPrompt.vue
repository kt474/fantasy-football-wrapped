<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import { toast } from "vue-sonner";

import { getData, inputLeague } from "@/api/api";
import {
  getEspnErrorMessage,
  getEspnLeagueInfo,
  getSavedEspnAuth,
} from "@/api/espnApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLeagueAnalyticsProperties, trackEvent } from "@/lib/analytics";
import { hasLeagueSeasonData } from "@/lib/leagueHistory";
import { getLeagueLoadErrorMessage, isRequestTimeout } from "@/lib/request";
import {
  getPreviousSeasonOption,
  isSeasonWithoutStandings,
} from "@/lib/previousSeason";
import { getLeagueKey, useStore } from "@/store/store";
import type { LeagueInfoType } from "@/types/types";

const store = useStore();
const isLoading = ref(false);
const isDismissed = ref(false);
const lastTrackedPrompt = ref("");

const currentLeague = computed(
  () => store.leagueInfo[store.currentLeagueIndex]
);
const previousSeason = computed(() =>
  getPreviousSeasonOption(currentLeague.value, store.leagueInfo)
);
const promptKey = computed(() => {
  const league = currentLeague.value;
  if (!league) return "";
  return `previous-season-prompt-dismissed:${getLeagueKey(league)}:${league.season}`;
});
const shouldShow = computed(
  () =>
    isSeasonWithoutStandings(currentLeague.value) &&
    Boolean(previousSeason.value) &&
    !isDismissed.value
);

const getTrackingProperties = () => ({
  ...getLeagueAnalyticsProperties(currentLeague.value),
  previous_season: previousSeason.value?.season,
  already_loaded: Boolean(previousSeason.value?.loadedLeague),
});

watch(
  promptKey,
  (key) => {
    isDismissed.value = Boolean(key && localStorage.getItem(key) === "true");
  },
  { immediate: true }
);

watch(
  () => [shouldShow.value, promptKey.value] as const,
  ([visible, key]) => {
    if (!visible || !key || lastTrackedPrompt.value === key) return;
    lastTrackedPrompt.value = key;
    trackEvent("Previous Season Prompt Viewed", getTrackingProperties());
  },
  { immediate: true }
);

const loadPreviousLeague = async (): Promise<LeagueInfoType> => {
  const league = currentLeague.value;
  const option = previousSeason.value;
  if (!league || !option) {
    throw new Error("No previous season is available.");
  }
  if (option.loadedLeague) return option.loadedLeague;

  if (option.platform === "espn") {
    return getEspnLeagueInfo(
      option.season,
      option.leagueId,
      getSavedEspnAuth(league.season, league.leagueId)
    );
  }

  return getData(option.leagueId);
};

const openPreviousSeason = async () => {
  const sourceLeague = currentLeague.value;
  const option = previousSeason.value;
  const sourcePromptKey = promptKey.value;
  if (!sourceLeague || !option || isLoading.value) return;

  isLoading.value = true;
  trackEvent("Previous Season Load Started", getTrackingProperties());

  try {
    const league = await loadPreviousLeague();
    if (!hasLeagueSeasonData(league)) {
      throw new Error("The previous season does not contain matchup results.");
    }

    const wasAlreadyLoaded = Boolean(option.loadedLeague);
    if (sourcePromptKey) {
      localStorage.setItem(sourcePromptKey, "true");
    }
    isDismissed.value = true;
    store.updateLeagueInfo(league);
    store.updateCurrentLeagueId(getLeagueKey(league));
    store.currentTab = "Standings";
    localStorage.setItem("currentTab", "Standings");

    if (!wasAlreadyLoaded) {
      await inputLeague(
        league.leagueId,
        league.name,
        league.totalRosters,
        league.seasonType,
        league.season,
        league.platform === "espn" ? "espn" : "sleeper"
      );
    }

    trackEvent("Previous Season Loaded", {
      ...getLeagueAnalyticsProperties(sourceLeague),
      previous_season: league.season,
      already_loaded: wasAlreadyLoaded,
    });
    toast.success(`Now viewing the ${league.season} season`);
  } catch (error) {
    console.error("Unable to load previous season:", error);
    trackEvent("Previous Season Load Failed", getTrackingProperties());
    const isOffline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    toast.error(
      option.platform === "espn"
        ? getEspnErrorMessage(error)
        : isRequestTimeout(error) || isOffline
          ? getLeagueLoadErrorMessage(error)
          : `Unable to load the ${option.season} season. It may not have matchup data.`
    );
  } finally {
    isLoading.value = false;
  }
};

const dismissPrompt = () => {
  if (promptKey.value) {
    localStorage.setItem(promptKey.value, "true");
  }
  isDismissed.value = true;
  trackEvent("Previous Season Prompt Dismissed", getTrackingProperties());
};
</script>

<template>
  <Card v-if="shouldShow" class="mt-4 shadow-none border-border/80 bg-muted/20">
    <div
      class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 gap-3">
        <CardHeader class="min-w-0 space-y-0.5 p-0">
          <CardTitle class="font-medium tracking-normal">
            Looking for last season?
          </CardTitle>
          <CardDescription class="max-w-md leading-5">
            {{ currentLeague?.season }} doesn't have matchup results yet. Your
            {{ previousSeason?.season }} season is available if you'd like to
            explore last year's data.
          </CardDescription>
        </CardHeader>
      </div>

      <CardContent class="flex flex-wrap items-center gap-2 p-0 shrink-0">
        <Button size="sm" :disabled="isLoading" @click="openPreviousSeason">
          <LoaderCircle
            v-if="isLoading"
            class="animate-spin"
            aria-hidden="true"
          />
          <template v-if="isLoading">
            Loading {{ previousSeason?.season }}...
          </template>
          <template v-else>
            {{ previousSeason?.loadedLeague ? "View" : "Load" }}
            {{ previousSeason?.season }}
          </template>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          :disabled="isLoading"
          @click="dismissPrompt"
        >
          Not now
        </Button>
      </CardContent>
    </div>
  </Card>
</template>
