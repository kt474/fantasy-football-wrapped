import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  watch,
  type MaybeRef,
} from "vue";
import { useRouter, useRoute } from "vue-router";
import { getLeagueKey, useStore } from "@/store/store";
import type { LeagueOriginal } from "@/types/apiTypes";
import { getData, inputLeague, inputUsername } from "@/api/api";
import { getAllLeagues, getLeague, getUsername } from "@/api/sleeperApi";
import {
  getEspnErrorMessage,
  getEspnLeagueInfo,
  saveEspnAuth,
  type EspnAuth,
} from "@/api/espnApi";
import { toast } from "vue-sonner";
import {
  getLeagueAnalyticsProperties,
  trackEvent,
  type AnalyticsProperties,
} from "@/lib/analytics";
import {
  createLatestRequestGuard,
  getLeagueLoadErrorMessage,
  isRequestCancellation,
  isRequestTimeout,
} from "@/lib/request";

export const SEASON_YEAR_OPTIONS = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
];

export type LeaguePlatform = "sleeper" | "espn";
type LeagueInputSource = "home" | "add_league";

export const useLeagueInput = (
  platform: MaybeRef<LeaguePlatform> = "sleeper",
  source: LeagueInputSource = "home"
) => {
  const store = useStore();
  const router = useRouter();
  const route = useRoute();

  const leagueIdInput = ref("");
  const inputType = ref("League ID");
  const seasonYear = ref("2026");
  const espnPrivate = ref(false);
  const espnSwid = ref("");
  const espnS2 = ref("");
  const showErrorMsg = ref(false);
  const errorMsg = ref("");
  const showHelperMsg = ref(false);
  const leagueLoadRequests = createLatestRequestGuard();

  const cancelActiveLeagueLoad = () => {
    leagueLoadRequests.cancel();
    showHelperMsg.value = false;
    store.updateLoadingLeague("");
  };

  const isActiveLeagueLoad = (controller: AbortController) =>
    leagueLoadRequests.isActive(controller);

  onBeforeUnmount(cancelActiveLeagueLoad);

  const leagueIds = computed(() => {
    return store.leagueIds;
  });

  const resetRoute = async () => {
    if (route.path !== "/") {
      const currentQueryParams = route.query;
      await router.replace({ path: "/", query: currentQueryParams });
    }
  };

  const updateURL = async (
    leagueID: string,
    currentPlatform: LeaguePlatform = "sleeper",
    espnSeason = seasonYear.value
  ) => {
    const query =
      currentPlatform === "espn"
        ? {
            ...route.query,
            espn: null,
            leagueId: leagueID,
            season: espnSeason,
          }
        : {
            ...route.query,
            espn: undefined,
            leagueId: leagueID,
            season: undefined,
          };

    await router.replace({
      path: "/",
      query,
    });
  };

  const clearError = () => {
    errorMsg.value = "";
    showErrorMsg.value = false;
  };

  const showError = (message: string) => {
    errorMsg.value = message;
    toast.error(message);
    showErrorMsg.value = true;
  };

  const trackLeagueAddFailed = (
    currentPlatform: LeaguePlatform,
    reason: string,
    properties: AnalyticsProperties = {}
  ) => {
    trackEvent("League Add Failed", {
      platform: currentPlatform,
      reason,
      ...properties,
    });
  };

  onMounted(() => {
    const savedInputType = localStorage.getItem("inputType");
    if (savedInputType) {
      inputType.value = savedInputType;
    }
  });

  watch(
    () => inputType.value,
    () => localStorage.setItem("inputType", inputType.value)
  );

  const onSubmit = async () => {
    cancelActiveLeagueLoad();
    clearError();
    const currentPlatform = unref(platform);
    const attemptStartedAt = Date.now();
    const attemptProperties: AnalyticsProperties = {
      source,
      input_type:
        currentPlatform === "espn"
          ? "league_id"
          : inputType.value === "Username"
            ? "username"
            : "league_id",
      private_league: currentPlatform === "espn" && espnPrivate.value,
      season: seasonYear.value,
    };
    const trackAttemptFailed = (reason: string) =>
      trackLeagueAddFailed(currentPlatform, reason, {
        ...attemptProperties,
        duration_ms: Date.now() - attemptStartedAt,
      });

    trackEvent("League Add Started", {
      platform: currentPlatform,
      ...attemptProperties,
    });

    if (currentPlatform === "sleeper") {
      if (inputType.value === "Username") {
        if (leagueIdInput.value === "") {
          showError("Please enter a username");
          trackAttemptFailed("invalid");
          return;
        }
        const submittedUsername = leagueIdInput.value;
        const submittedSeason = seasonYear.value;
        const controller = leagueLoadRequests.start();
        try {
          const user = await getUsername(
            submittedUsername,
            controller.signal
          );
          if (!isActiveLeagueLoad(controller)) return;
          if (!user?.user_id || !user?.display_name) {
            showError("Invalid username");
            trackAttemptFailed("invalid");
            return;
          }

          showHelperMsg.value = true;
          const leagues = await getAllLeagues(
            user.user_id,
            submittedSeason,
            controller.signal
          );
          if (!isActiveLeagueLoad(controller)) return;

          store.username = user.display_name;
          store.setLeaguesList(leagues);
          store.updateShowLeaguesList(true);
          localStorage.setItem("inputType", "League ID");
          store.updateShowInput(false);
          void inputUsername(user.display_name, submittedSeason);
          await resetRoute();
        } catch (error) {
          if (isRequestCancellation(error)) return;
          showError(getLeagueLoadErrorMessage(error));
          trackAttemptFailed(
            isRequestTimeout(error) ? "timeout" : "api_error"
          );
        } finally {
          if (leagueLoadRequests.finish(controller)) {
            showHelperMsg.value = false;
          }
        }
        return;
      }

      if (store.leagueInfo.length >= 10) {
        showError("Maximum of 10 leagues allowed");
        trackAttemptFailed("max_leagues");
        return;
      }
      if (leagueIdInput.value === "") {
        showError("Please enter a league ID");
        trackAttemptFailed("invalid");
        return;
      }

      const submittedLeagueId = leagueIdInput.value;
      const controller = leagueLoadRequests.start();
      try {
        const checkInput: LeagueOriginal = await getLeague(
          submittedLeagueId,
          controller.signal
        );
        if (!isActiveLeagueLoad(controller)) return;

        if (!checkInput["name"]) {
          showError("Invalid league ID");
          trackAttemptFailed("invalid");
          return;
        }
        if ((leagueIds.value as string[]).includes(submittedLeagueId)) {
          showError("League already added");
          trackAttemptFailed("duplicate");
          return;
        }
        if (checkInput["sport"] !== "nfl") {
          showError("Only NFL leagues are supported");
          trackAttemptFailed("invalid");
          return;
        }

        await resetRoute();
        if (!isActiveLeagueLoad(controller)) return;

        showErrorMsg.value = false;
        store.updateLoadingLeague(checkInput["name"]);
        const newLeagueInfo = await getData(submittedLeagueId, {
          signal: controller.signal,
        });
        if (!isActiveLeagueLoad(controller)) return;

        await updateURL(submittedLeagueId);
        if (!isActiveLeagueLoad(controller)) return;
        store.updateLeagueInfo(newLeagueInfo);
        store.updateCurrentLeagueId(getLeagueKey(newLeagueInfo));
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        store.leagueSubmitted = true;
        store.updateShowInput(false);
        trackEvent("League Added", {
          ...attemptProperties,
          ...getLeagueAnalyticsProperties(newLeagueInfo),
          duration_ms: Date.now() - attemptStartedAt,
        });
        void inputLeague(
          submittedLeagueId,
          newLeagueInfo.name,
          newLeagueInfo.totalRosters,
          newLeagueInfo.seasonType,
          newLeagueInfo.season,
          "sleeper"
        );
      } catch (error) {
        if (isRequestCancellation(error)) return;
        console.error("Failed to load league:", error);
        showError(getLeagueLoadErrorMessage(error));
        trackAttemptFailed(isRequestTimeout(error) ? "timeout" : "api_error");
      } finally {
        if (leagueLoadRequests.finish(controller)) {
          store.updateLoadingLeague("");
          leagueIdInput.value = "";
        }
      }
      return;
    }

    if (currentPlatform === "espn") {
      if (store.leagueInfo.length >= 10) {
        showError("Maximum of 10 leagues allowed");
        trackAttemptFailed("max_leagues");
        return;
      }
      if (leagueIdInput.value === "") {
        showError("Please enter a league ID");
        trackAttemptFailed("invalid");
        return;
      }
      const espnAuth: EspnAuth | undefined = espnPrivate.value
        ? {
            swid: espnSwid.value.trim(),
            espnS2: espnS2.value.trim(),
          }
        : undefined;
      if (espnPrivate.value && (!espnAuth?.swid || !espnAuth.espnS2)) {
        showError("Please enter both SWID and espn_s2 cookies");
        trackAttemptFailed("espn_auth");
        return;
      }
      if (
        (leagueIds.value as string[]).includes(
          getLeagueKey({
            platform: "espn",
            leagueId: leagueIdInput.value,
            season: seasonYear.value,
          })
        )
      ) {
        showError("League already added");
        trackAttemptFailed("duplicate");
        return;
      }

      const submittedLeagueId = leagueIdInput.value;
      const submittedSeason = seasonYear.value;
      const controller = leagueLoadRequests.start();
      try {
        await resetRoute();
        if (!isActiveLeagueLoad(controller)) return;
        showErrorMsg.value = false;
        store.updateLoadingLeague("ESPN League");
        const espnLeague = await getEspnLeagueInfo(
          submittedSeason,
          submittedLeagueId,
          espnAuth,
          { signal: controller.signal }
        );
        if (espnLeague && isActiveLeagueLoad(controller)) {
          await updateURL(submittedLeagueId, "espn", submittedSeason);
          if (!isActiveLeagueLoad(controller)) return;
          if (espnAuth) {
            saveEspnAuth(submittedSeason, submittedLeagueId, espnAuth);
          }
          store.updateLeagueInfo(espnLeague);
          store.updateCurrentLeagueId(getLeagueKey(espnLeague));
          store.leagueSubmitted = true;
          store.updateShowInput(false);
          store.currentTab = "Standings";
          localStorage.setItem("currentTab", "Standings");
          trackEvent("League Added", {
            ...attemptProperties,
            ...getLeagueAnalyticsProperties(espnLeague),
            duration_ms: Date.now() - attemptStartedAt,
          });
          void inputLeague(
            submittedLeagueId,
            espnLeague.name,
            espnLeague.totalRosters,
            espnLeague.seasonType,
            espnLeague.season,
            "espn"
          );
        } else {
          showError("Unable to load league right now. Please try again.");
          trackAttemptFailed("api_error");
        }
      } catch (error) {
        if (isRequestCancellation(error)) return;
        showError(getEspnErrorMessage(error));
        trackAttemptFailed(
          isRequestTimeout(error) ? "timeout" : "espn_auth"
        );
      } finally {
        if (leagueLoadRequests.finish(controller)) {
          store.updateLoadingLeague("");
        }
      }
    }
  };

  return {
    inputType,
    seasonYear,
    espnPrivate,
    espnSwid,
    espnS2,
    leagueIdInput,
    showErrorMsg,
    errorMsg,
    showHelperMsg,
    onSubmit,
    clearError,
  };
};
