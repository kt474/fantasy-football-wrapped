<script setup lang="ts">
import { getLeagueCount } from "@/api/api";
import { watch, ref, onMounted } from "vue";
import { useStore } from "@/store/store";
import Switch from "@/components/ui/switch/Switch.vue";
import { useRoute } from "vue-router";
import Separator from "@/components/ui/separator/Separator.vue";
import { toast } from "vue-sonner";
import { LeagueInfoType } from "../types/types";
import { getData, getLeague, inputLeague } from "../api/api";

const route = useRoute();
const leagueCount = ref(12047); // initial load current unique league count value 2/26/26

onMounted(async () => {
  const leagueId = route.query.leagueId;
  if (!leagueId) {
    const data = await getLeagueCount();
    const newCount = data?.league_id_count;
    if (newCount) {
      leagueCount.value = newCount;
    }
  }
  await loadSavedLeagues();
});

const store = useStore();

const loadSavedLeagues = async () => {
  try {
    if (localStorage.leagueInfo) {
      const savedLeagues = JSON.parse(localStorage.leagueInfo);
      await Promise.all(
        savedLeagues.map(async (league: LeagueInfoType) => {
          if (!store.leagueIds.includes(league.leagueId)) {
            store.updateLeagueInfo(league);
          }
        })
      );
      store.updateCurrentLeagueId(localStorage.currentLeagueId);
      store.updateLoadingLeague("");
    }
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (leagueId && !store.leagueIds.includes(leagueId)) {
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
          league.season
        );
        store.updateLoadingLeague("");
      } else {
        toast.error("Invalid League ID");
      }
    }
  } catch {
    toast.error("Error fetching data. Please try refreshing the page.");
  }
};

watch(
  () => store.showUsernames,
  (newValue) => {
    localStorage.setItem("showUsernames", JSON.stringify(newValue));
  }
);
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold">About</h1>

      <div class="max-w-4xl text-base leading-relaxed">
        <div class="space-y-4">
          <p class="text-base leading-relaxed">
            Welcome to ffwrapped, a platform designed to provide insightful data
            and charts for your
            <a
              aria-label="Link to sleeper website"
              class="font-medium text-primary hover:underline"
              href="https://sleeper.com"
              target="_blank"
              rel="noopener noreferrer"
              >Sleeper</a
            >
            fantasy football leagues.
          </p>
          <p class="text-base leading-relaxed">
            The source code can be found on
            <a
              aria-label="Link to github repository"
              class="font-medium text-primary hover:underline"
              href="https://github.com/kt474/fantasy-football-wrapped"
              target="_blank"
              rel="noopener noreferrer"
              >Github</a
            >. To report a bug or request new features, please join our
            <a
              aria-label="Link to github issues page"
              class="font-medium text-primary hover:underline"
              href="https://discord.gg/sSVwNhyv7U"
              target="_blank"
              rel="noopener noreferrer"
              >Discord,</a
            >
            send an
            <a
              href="mailto:kt474@cornell.edu?subject=ffwrapped request"
              class="font-medium text-primary hover:underline"
              >email,</a
            >
            or reach out on
            <a
              aria-label="Link to twitter"
              class="font-medium text-primary hover:underline"
              href="https://twitter.com/kevkevkt"
              target="_blank"
              rel="noopener noreferrer"
              >Twitter</a
            >. Any suggestions are welcome!
          </p>
          <p class="text-base leading-relaxed">
            I will always try to keep this site free (and ad free) but as the
            userbase grows, the hosting and weekly AI recap costs also grow, so
            if you find value in ffwrapped, any donations are greatly
            appreciated. If you’d like to support ffwrapped beyond donations,
            consider subscribing to the
            <router-link
              :to="{ path: '/account', query: $route.query }"
              class="font-medium cursor-pointer text-primary hover:underline"
            >
              Premium tier</router-link
            >. Your support helps keep the platform running and improving for
            everyone.
          </p>
          <div class="flex flex-wrap justify-evenly sm:flex-nowrap">
            <a
              href="https://www.buymeacoffee.com/kt474"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                alt="Buy Me A Coffee"
                style="height: 55px !important; width: 217px !important"
                class="mx-auto my-4"
            /></a>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <h3 class="text-3xl font-semibold">Settings</h3>
        </div>
        <div class="flex items-center mt-4 space-x-2">
          <Switch
            v-model="store.showUsernames"
            :disabled="store.leagueInfo.length == 0"
          />
          <label>Show usernames instead of team names</label>
        </div>
        <div class="flex items-center justify-between mt-4">
          <h3 class="text-3xl font-semibold">League Count</h3>
        </div>
        <div>
          <p class="mt-2 text-xl font-medium">
            {{ leagueCount.toLocaleString() }}
            <span class="text-base font-normal">Fantasy leagues added</span>
          </p>
        </div>
        <Separator class="mt-3" />
        <p class="mt-2 text-sm text-muted-foreground">
          &copy; 2024-2026. Kevin Tian
        </p>
      </div>
    </div>
  </div>
</template>
