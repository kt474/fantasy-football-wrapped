import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "@/store/store";
import type { LeagueInfoType } from "@/types/types";
import {
  getData,
  getLeague,
  getUsername,
  inputLeague,
  inputUsername,
  getAllLeagues,
} from "@/api/api";

export const SEASON_YEAR_OPTIONS = ["2025", "2024", "2023", "2022", "2021"];

export const useLeagueInput = () => {
  const store = useStore();
  const router = useRouter();

  const leagueIdInput = ref("");
  const inputType = ref("League ID");
  const seasonYear = ref("2025");
  const showErrorMsg = ref(false);
  const errorMsg = ref("");
  const showHelperMsg = ref(false);

  const leagueIds = computed(() => {
    return store.leagueInfo.map((league: LeagueInfoType) => league.leagueId);
  });

  const updateURL = (leagueID: string) => {
    router.replace({ query: { leagueId: leagueID } });
  };

  const clearError = () => {
    errorMsg.value = "";
    showErrorMsg.value = false;
  };

  onMounted(() => {
    if (localStorage.inputType) {
      inputType.value = localStorage.inputType;
    }
  });

  watch(
    () => inputType.value,
    () => (localStorage.inputType = inputType.value)
  );

  const onSubmit = async () => {
    clearError();

    if (inputType.value === "Username") {
      if (leagueIdInput.value === "") {
        errorMsg.value = "Please enter a username";
        showErrorMsg.value = true;
        return;
      }
      const user = await getUsername(leagueIdInput.value);
      if (!user) {
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
      localStorage.inputType = "League ID";
      store.updateShowInput(false);
      inputUsername(user.display_name, seasonYear.value);
      store.currentTab = "Standings";
      localStorage.currentTab = "Standings";
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

    const checkInput: any = await getLeague(leagueIdInput.value);
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
      localStorage.currentTab = "Standings";
      showErrorMsg.value = false;
      store.updateLoadingLeague(checkInput["name"]);
      store.updateCurrentLeagueId(leagueIdInput.value);
      const newLeagueInfo = await getData(leagueIdInput.value);
      store.updateLeagueInfo(newLeagueInfo);
      store.leagueSubmitted = true;
      store.updateShowInput(false);
      store.updateLoadingLeague("");
      updateURL(leagueIdInput.value);
      await inputLeague(
        leagueIdInput.value,
        newLeagueInfo.name,
        newLeagueInfo.totalRosters,
        newLeagueInfo.seasonType,
        newLeagueInfo.season
      );
    }

    leagueIdInput.value = "";
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
