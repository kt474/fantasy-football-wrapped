<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useStore } from "../../store/store";
import { getData, inputLeague } from "../../api/api";
import { seasonType } from "../../types/apiTypes";
import { Button } from "../ui/button";
import Card from "../ui/card/Card.vue";
import Checkbox from "../ui/checkbox/Checkbox.vue";
import { toast } from "vue-sonner";
import { loadUserLeagues } from "./userLeagueLoader";
import { trackEvent } from "@/lib/analytics";

const checkedLeagues = ref<string[]>([]);
const duplicateLeagueError = ref(false);
const store = useStore();

const showError = computed(() => {
  return checkedLeagues.value.length > 5 ? true : false;
});

const leagueCountError = computed(() => {
  return checkedLeagues.value.length + store.leagueInfo.length > 5 &&
    store.leagueInfo.length > 0
    ? true
    : false;
});

const addLeagues = async () => {
  const source = store.currentLeagueId ? "add_league" : "home";
  if (checkedLeagues.value.some((league) => store.leagueIds.includes(league))) {
    duplicateLeagueError.value = true;
    trackEvent("League Add Failed", {
      platform: "sleeper",
      reason: "duplicate",
    });
    return;
  }
  if (checkedLeagues.value.length >= 1) {
    store.updateLoadingUserLeagues(true);
    store.updateLoadingLeague(
      checkedLeagues.value.length === 1
        ? "Selected league"
        : `${checkedLeagues.value.length} selected leagues`
    );

    try {
      const { loaded, failed } = await loadUserLeagues(
        checkedLeagues.value,
        getData
      );

      loaded.forEach(({ league }) => store.updateLeagueInfo(league));

      await Promise.all(
        loaded.map(({ leagueId, league }) =>
          inputLeague(
            leagueId,
            league.name,
            league.totalRosters,
            league.seasonType,
            league.season,
            "sleeper"
          )
        )
      );

      const firstLoadedLeague = loaded[0];
      if (firstLoadedLeague) {
        store.updateCurrentLeagueId(firstLoadedLeague.leagueId);
        store.updateShowLeaguesList(false);
        store.setLeaguesList([]);
        loaded.forEach(() =>
          trackEvent("League Added", {
            platform: "sleeper",
            source,
          })
        );
        toast.success(
          loaded.length === 1
            ? "League added!"
            : `${loaded.length} leagues added!`
        );
      }

      if (failed.length > 0) {
        failed.forEach(() =>
          trackEvent("League Add Failed", {
            platform: "sleeper",
            reason: "api_error",
          })
        );
        toast.error(
          failed.length === checkedLeagues.value.length
            ? "Unable to add the selected leagues. Please try again."
            : `${failed.length} selected ${
                failed.length === 1 ? "league" : "leagues"
          } could not be added.`
        );
      }
    } catch (error) {
      console.error("Unable to finish adding selected leagues:", error);
      trackEvent("League Add Failed", {
        platform: "sleeper",
        reason: "api_error",
      });
      toast.error("Unable to finish adding the selected leagues.");
    } finally {
      store.updateLoadingUserLeagues(false);
      store.updateLoadingLeague("");
    }
  }
};
onMounted(() => {
  const main = document.getElementById("mainScrollSection");
  if (main) {
    main.scrollTop = 0;
  }
});

const toggleLeague = (id: string) => {
  if (checkedLeagues.value.includes(id)) {
    checkedLeagues.value = checkedLeagues.value.filter((l) => l !== id);
  } else {
    checkedLeagues.value.push(id);
  }
};

const handleLeagueKeydown = (event: KeyboardEvent, id: string) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleLeague(id);
  }
};

const goBack = () => {
  store.leaguesList = [];
  store.showLeaguesList = false;
  store.currentTab = "Home";
  localStorage.setItem("currentTab", "Home");
};
</script>
<template>
  <div class="w-full px-6" :class="{ 'h-screen': !store.currentLeagueId }">
    <h3
      class="my-4 text-2xl font-medium"
      :class="{ hidden: store.currentLeagueId }"
    >
      Welcome {{ store.username }}!
    </h3>
    <p
      v-if="store.leaguesList.length > 0 || store.currentLeagueId"
      class="text-lg"
      :class="{ 'my-2': store.currentLeagueId }"
    >
      Select the leagues you would like to add
    </p>
    <div v-if="!store.currentLeagueId">
      <h3
        v-if="store.leaguesList.length > 0"
        class="mb-2 text-lg"
        :class="{ 'mt-2': store.currentLeagueId }"
      >
        <span class="font-semibold">{{ store.leaguesList.length }}</span>
        available league<span v-if="store.leaguesList.length !== 1">s</span>:
      </h3>
      <h3
        v-else
        class="mb-2 text-lg"
        :class="{ 'mt-2': store.currentLeagueId }"
      >
        No leagues available, please try another year
      </h3>
    </div>
    <ul
      class="flex flex-wrap w-full overflow-auto rounded-lg custom-max-height"
    >
      <li
        v-for="league in store.leaguesList"
        :key="league.league_id"
        class="w-full mb-2 sm:mr-2 sm:w-64"
      >
        <Card
          class="p-4 transition-colors border-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :class="
            checkedLeagues.includes(league.league_id)
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/50'
          "
          role="checkbox"
          tabindex="0"
          :aria-checked="checkedLeagues.includes(league.league_id)"
          :aria-label="`Select ${league.name}`"
          @click="toggleLeague(league.league_id)"
          @keydown="handleLeagueKeydown($event, league.league_id)"
        >
          <div class="flex items-start justify-between">
            <div>
              <h5 class="text-lg font-medium truncate max-w-52">
                {{ league.name }}
              </h5>

              <p class="mt-2 text-sm text-muted-foreground">
                {{ seasonType[league.settings.type] }}:
                {{ league.season }}
                {{ league.total_rosters }}-team
              </p>
            </div>
            <Checkbox
              :model-value="checkedLeagues.includes(league.league_id)"
              class="mt-1.5"
            />
          </div>
        </Card>
      </li>
    </ul>
    <p v-if="showError" class="mt-2 text-destructive">
      A maximum of 5 leagues can be added at a time
    </p>
    <p v-if="duplicateLeagueError" class="-mt-1 text-destructive">
      A selected league already exists
    </p>
    <p v-if="leagueCountError" class="-mt-1 text-destructive">
      A maximum of 5 leagues can be active. Please remove a league first.
    </p>
    <Button
      class="mr-2"
      @click="goBack"
      aria-label="Button to go back if there are no leagues"
      type="submit"
      variant="secondary"
    >
      Back
    </Button>
    <Button
      v-if="store.leaguesList.length > 0"
      @click="addLeagues"
      class="mt-1"
      :disabled="checkedLeagues.length == 0 || showError || leagueCountError"
      :class="{ 'cursor-not-allowed': checkedLeagues.length == 0 }"
    >
      Continue
      <span
        class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold rounded-full ms-2"
      >
        {{ checkedLeagues.length }}
      </span>
    </Button>
  </div>
</template>
<style scoped>
.custom-max-height {
  max-height: 26rem;
}
</style>
