import { computed, onMounted, ref, unref, watch, type MaybeRef } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useStore } from "@/store/store";
import type { LeagueInfoType } from "@/types/types";
import type { LeagueOriginal } from "@/types/apiTypes";
import { getData, inputLeague, inputUsername } from "@/api/api";
import { getAllLeagues, getLeague, getUsername } from "@/api/sleeperApi";
import { getEspnLeagueInfo } from "@/api/espnApi";

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
  const seasonYear = ref("2025");
  const showErrorMsg = ref(false);
  const errorMsg = ref("");
  const showHelperMsg = ref(false);

  const leagueIds = computed(() => {
    return store.leagueInfo.map((league: LeagueInfoType) => league.leagueId);
  });

  const resetRoute = async () => {
    if (route.path !== "/") {
      const currentQueryParams = route.query;
      await router.replace({ path: "/", query: currentQueryParams });
    }
  };

  const updateURL = async (leagueID: string) => {
    await router.replace({
      path: "/",
      query: { ...route.query, leagueId: leagueID },
    });
  };

  const clearError = () => {
    errorMsg.value = "";
    showErrorMsg.value = false;
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
          errorMsg.value = "Please enter a username";
          showErrorMsg.value = true;
          return;
        }
        const user = await getUsername(leagueIdInput.value);
        if (!user?.user_id || !user?.display_name) {
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
        localStorage.setItem("inputType", "League ID");
        store.updateShowInput(false);
        inputUsername(user.display_name, seasonYear.value);
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        await resetRoute();
        return;
      }

      if (store.leagueInfo.length >= 5) {
        errorMsg.value = "Maximum of 5 leagues allowed";
        showErrorMsg.value = true;
        return;
      }
      if (leagueIdInput.value === "") {
        errorMsg.value = "Please enter a league ID";
        showErrorMsg.value = true;
        return;
      }

      const checkInput: LeagueOriginal = await getLeague(leagueIdInput.value);
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
          errorMsg.value = "Unable to load league right now. Please try again.";
          showErrorMsg.value = true;
        } finally {
          store.updateLoadingLeague("");
        }
      }

      leagueIdInput.value = "";
      return;
    }

    if (currentPlatform === "espn") {
      try {
        store.currentTab = "Standings";
        localStorage.setItem("currentTab", "Standings");
        await resetRoute();
        showErrorMsg.value = false;
        store.updateLoadingLeague("ESPN League");
        store.updateCurrentLeagueId(leagueIdInput.value);
        store.leagueSubmitted = true;
        store.updateShowInput(false);
        await updateURL(leagueIdInput.value);
        const espnLeague = await getEspnLeagueInfo(
          seasonYear.value,
          leagueIdInput.value
        );
        if (espnLeague) {
          store.updateLeagueInfo(espnLeague);
        }
      } catch (error) {
        console.error("Failed to load league:", error);
        errorMsg.value = "Unable to load league right now. Please try again.";
        showErrorMsg.value = true;
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
