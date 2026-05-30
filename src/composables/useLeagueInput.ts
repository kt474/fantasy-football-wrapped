import { computed, onMounted, ref, unref, watch, type MaybeRef } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getLeagueKey, useStore } from "@/store/store";
import type { LeagueOriginal } from "@/types/apiTypes";
import { getData, inputLeague, inputUsername } from "@/api/api";
import { getAllLeagues, getLeague, getUsername } from "@/api/sleeperApi";
import { getEspnErrorMessage, getEspnLeagueInfo } from "@/api/espnApi";
import { toast } from "vue-sonner";

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

export const useLeagueInput = (
  platform: MaybeRef<LeaguePlatform> = "sleeper"
) => {
  const store = useStore();
  const router = useRouter();
  const route = useRoute();

  const leagueIdInput = ref("");
  const inputType = ref("League ID");
  const seasonYear = ref("2026");
  const showErrorMsg = ref(false);
  const errorMsg = ref("");
  const showHelperMsg = ref(false);

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
    currentPlatform: LeaguePlatform = "sleeper"
  ) => {
    const query =
      currentPlatform === "espn"
        ? {
            ...route.query,
            espn: null,
            leagueId: leagueID,
            season: seasonYear.value,
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
    clearError();
    const currentPlatform = unref(platform);

    if (currentPlatform === "sleeper") {
      if (inputType.value === "Username") {
        if (leagueIdInput.value === "") {
          showError("Please enter a username");
          return;
        }
        const user = await getUsername(leagueIdInput.value);
        if (!user?.user_id || !user?.display_name) {
          showError("Invalid username");
          return;
        }
        showHelperMsg.value = true;
        const leagues = await getAllLeagues(user.user_id, seasonYear.value);
        store.username = user.display_name;
        store.setLeaguesList(leagues);
        store.updateShowLeaguesList(true);
        showHelperMsg.value = false;
        localStorage.setItem("inputType", "League ID");
        store.updateShowInput(false);
        inputUsername(user.display_name, seasonYear.value);
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        await resetRoute();
        return;
      }

      if (store.leagueInfo.length >= 5) {
        showError("Maximum of 5 leagues allowed");
        return;
      }
      if (leagueIdInput.value === "") {
        showError("Please enter a league ID");
        return;
      }

      const checkInput: LeagueOriginal = await getLeague(leagueIdInput.value);
      if (!checkInput["name"]) {
        showError("Invalid league ID");
      } else if ((leagueIds.value as string[]).includes(leagueIdInput.value)) {
        showError("League already added");
      } else if (checkInput["sport"] !== "nfl") {
        showError("Only NFL leagues are supported");
      } else {
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        await resetRoute();
        showErrorMsg.value = false;
        store.updateLoadingLeague(checkInput["name"]);
        store.updateCurrentLeagueId(leagueIdInput.value);
        try {
          const newLeagueInfo = await getData(leagueIdInput.value);
          store.updateLeagueInfo(newLeagueInfo);
          store.leagueSubmitted = true;
          store.updateShowInput(false);
          await updateURL(leagueIdInput.value);

          try {
            await inputLeague(
              leagueIdInput.value,
              newLeagueInfo.name,
              newLeagueInfo.totalRosters,
              newLeagueInfo.seasonType,
              newLeagueInfo.season
            );
          } catch (error) {
            console.error("Failed to save league metadata:", error);
          }
        } catch (error) {
          console.error("Failed to load league:", error);
          showError("Unable to load league right now. Please try again.");
        } finally {
          store.updateLoadingLeague("");
        }
      }

      leagueIdInput.value = "";
      return;
    }

    if (currentPlatform === "espn") {
      if (store.leagueInfo.length >= 5) {
        showError("Maximum of 5 leagues allowed");
        return;
      }
      if (leagueIdInput.value === "") {
        showError("Please enter a league ID");
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
        return;
      }

      try {
        await resetRoute();
        showErrorMsg.value = false;
        store.updateLoadingLeague("ESPN League");
        const espnLeague = await getEspnLeagueInfo(
          seasonYear.value,
          leagueIdInput.value
        );
        if (espnLeague) {
          store.updateLeagueInfo(espnLeague);
          store.updateCurrentLeagueId(getLeagueKey(espnLeague));
          store.leagueSubmitted = true;
          store.updateShowInput(false);
          store.currentTab = "Standings";
          localStorage.setItem("currentTab", "Standings");
          await updateURL(leagueIdInput.value, "espn");
        } else {
          showError("Unable to load league right now. Please try again.");
        }
      } catch (error) {
        showError(getEspnErrorMessage(error));
      } finally {
        store.updateLoadingLeague("");
      }
    }
  };

  return {
    inputType,
    seasonYear,
    leagueIdInput,
    showErrorMsg,
    errorMsg,
    showHelperMsg,
    onSubmit,
    clearError,
  };
};
