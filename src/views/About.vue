<script setup lang="ts">
import { getLeagueCount } from "@/api/api";
import { watch, ref, onMounted } from "vue";
import { useStore } from "@/store/store";
import Switch from "@/components/ui/switch/Switch.vue";
import { useRoute } from "vue-router";
import Separator from "@/components/ui/separator/Separator.vue";

const route = useRoute();
const leagueCount = ref(11947); // initial load current unique league count value 2/13/26

onMounted(async () => {
  const leagueId = route.query.leagueId;
  if (!leagueId) {
    const data = await getLeagueCount();
    const newCount = data?.league_id_count;
    if (newCount) {
      leagueCount.value = newCount;
    }
  }
});

const store = useStore();

watch(
  () => store.showUsernames,
  (newValue) => {
    localStorage.setItem("showUsernames", JSON.stringify(newValue));
  },
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
              >Sleeper</a
            >
            fantasy football leagues.
          </p>
          <p class="text-base leading-relaxed">
            Everything on this site is free to use and the source code can be
            found on
            <a
              aria-label="Link to github repository"
              class="font-medium text-primary hover:underline"
              href="https://github.com/kt474/fantasy-football-wrapped"
              target="_blank"
              >Github</a
            >. To report a bug or request new features, please join our
            <a
              aria-label="Link to github issues page"
              class="font-medium text-primary hover:underline"
              href="https://discord.gg/sSVwNhyv7U"
              target="_blank"
              >discord,</a
            >
            send an
            <a
              href="mailto:kevin@ffwrapped.com?subject=ffwrapped request"
              class="font-medium text-primary hover:underline"
              >email,</a
            >
            or reach out on
            <a
              aria-label="Link to twitter"
              class="font-medium text-primary hover:underline"
              href="https://twitter.com/kevkevkt"
              target="_blank"
              >twitter</a
            >.
          </p>
          <p class="text-base leading-relaxed">
            Using this site will always be completely free (and ad free) but if
            you would like to support this project, any donations would be
            greatly appreciated.
          </p>
          <div class="flex flex-wrap justify-evenly sm:flex-nowrap">
            <a href="https://www.buymeacoffee.com/kt474" target="_blank"
              ><img
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
        <Separator class="mt-2" />
        <p class="mt-2 text-sm text-muted-foreground">
          &copy; 2024-2026. Kevin Tian
        </p>
      </div>
    </div>
  </div>
</template>
