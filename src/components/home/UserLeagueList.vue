<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useStore } from "../../store/store";
import { getData, inputLeague } from "../../api/api";
import { seasonType } from "../../types/apiTypes";
import { Button } from "../ui/button";
import Card from "../ui/card/Card.vue";
import { Check } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { loadUserLeagues } from "./userLeagueLoader";
import { trackEvent } from "@/lib/analytics";

const checkedLeagues = ref<string[]>([]);
const duplicateLeagueError = ref(false);
const store = useStore();

const showError = computed(() => {
  return checkedLeagues.value.length > 10;
});

const leagueCountError = computed(() => {
  return checkedLeagues.value.length + store.leagueInfo.length > 10 &&
    store.leagueInfo.length > 0
    ? true
    : false;
});

const addLeagues = async () => {
  const isFirstLeague = !store.currentLeagueId;
  const source = isFirstLeague ? "home" : "add_league";
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
        if (isFirstLeague) {
          store.currentTab = "Standings";
          localStorage.setItem("currentTab", "Standings");
        }
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

const goBack = () => {
  store.leaguesList = [];
  store.showLeaguesList = false;
};
</script>
<template>
  <div
    class="w-full px-4 py-5 sm:px-6"
    :class="{ 'min-h-screen': !store.currentLeagueId }"
  >
    <section class="max-w-3xl mx-auto">
      <div class="mb-4">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{
            store.currentLeagueId ? "Add leagues" : `Welcome ${store.username}!`
          }}
        </h1>
        <p class="mt-1 text-base text-muted-foreground">
          Select the leagues you would like to add.
        </p>
      </div>

      <div>
        <p class="mb-3 text-base font-medium">
          <template v-if="store.leaguesList.length > 0">
            {{ store.leaguesList.length }} available league<span
              v-if="store.leaguesList.length !== 1"
              >s</span
            >
            <span
              v-if="checkedLeagues.length"
              class="font-normal text-muted-foreground"
            >
              · {{ checkedLeagues.length }} selected
            </span>
          </template>
          <template v-else>No leagues available</template>
        </p>

        <div v-if="store.leaguesList.length > 0">
          <ul
            class="grid max-h-[32rem] grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2"
          >
            <li v-for="league in store.leaguesList" :key="league.league_id">
              <label
                :for="`league-${league.league_id}`"
                class="block cursor-pointer"
              >
                <Card
                  class="p-3 transition-colors shadow-none"
                  :class="
                    checkedLeagues.includes(league.league_id)
                      ? 'border-primary bg-accent'
                      : 'hover:bg-accent/50'
                  "
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <h2 class="text-base font-medium truncate">
                        {{ league.name }}
                      </h2>
                      <p class="mt-0.5 truncate text-sm text-muted-foreground">
                        {{ league.season }} ·
                        {{ seasonType[league.settings.type] }} ·
                        {{ league.total_rosters }} teams
                      </p>
                    </div>
                    <span
                      class="relative flex items-center justify-center size-5 shrink-0"
                    >
                      <input
                        :id="`league-${league.league_id}`"
                        type="checkbox"
                        class="sr-only peer"
                        :checked="checkedLeagues.includes(league.league_id)"
                        @change="toggleLeague(league.league_id)"
                      />
                      <span
                        class="flex items-center justify-center transition-colors border rounded-md size-5 border-input bg-background text-primary-foreground peer-focus-visible:ring-1 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:border-primary peer-checked:bg-primary"
                        aria-hidden="true"
                      >
                        <Check
                          v-if="checkedLeagues.includes(league.league_id)"
                          :size="13"
                          stroke-width="3"
                        />
                      </span>
                    </span>
                  </div>
                </Card>
              </label>
            </li>
          </ul>
        </div>
        <div v-else class="py-8 text-sm text-center text-muted-foreground">
          Try searching for another season.
        </div>

        <div class="flex items-center gap-2 mt-4">
          <Button
            @click="goBack"
            aria-label="Go back"
            type="button"
            variant="secondary"
          >
            Back
          </Button>
          <Button
            v-if="store.leaguesList.length > 0"
            @click="addLeagues"
            :disabled="
              checkedLeagues.length === 0 || showError || leagueCountError
            "
            :class="{ 'cursor-not-allowed': checkedLeagues.length === 0 }"
          >
            Continue
          </Button>
        </div>
      </div>

      <div aria-live="polite" class="mt-3">
        <p v-if="showError" class="text-sm text-destructive">
          A maximum of 10 leagues can be added at a time.
        </p>
        <p v-if="duplicateLeagueError" class="text-sm text-destructive">
          A selected league already exists.
        </p>
        <p v-if="leagueCountError" class="text-sm text-destructive">
          A maximum of 10 leagues can be active. Please remove a league first.
        </p>
      </div>
    </section>
  </div>
</template>
