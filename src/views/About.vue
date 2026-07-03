<script setup lang="ts">
import { getLeagueCount } from "@/api/api";
import { watch, ref, onMounted } from "vue";
import { useStore } from "@/store/store";
import Switch from "@/components/ui/switch/Switch.vue";
import { useRoute } from "vue-router";
import Separator from "@/components/ui/separator/Separator.vue";

const route = useRoute();
const leagueCount = ref(13382); // initial load current unique league count value 7/1/26

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
  }
);
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto sm:ml-8">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold">About</h1>

      <div class="max-w-4xl text-base leading-relaxed">
        <div class="space-y-4">
          <p class="text-base leading-relaxed">
            Hi! I’m Kevin, and I built ffwrapped to make fantasy football
            leagues more fun to follow, with stats, charts, recaps, and awards
            that bring each season’s story to life.
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
              aria-label="Discord link"
              class="font-medium text-primary hover:underline"
              href="https://discord.gg/sSVwNhyv7U"
              target="_blank"
              rel="noopener noreferrer"
              >Discord,</a
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
              rel="noopener noreferrer"
              >Twitter</a
            >. Any suggestions are welcome! I also have a
            <a
              aria-label="Link to ffwrapped blog"
              class="font-medium text-primary hover:underline"
              href="https://blog.ffwrapped.com"
              target="_blank"
              rel="noopener noreferrer"
              >ffwrapped blog</a
            >
            where I write about fantasy football statistics and programming.
          </p>
          <p class="text-base leading-relaxed">
            The core ffwrapped experience will always be free and ad free. As
            the userbase grows, hosting and AI feature costs grow too, so
            donations are always greatly appreciated. I also offer an optional
            <router-link
              :to="{ path: '/account', query: $route.query }"
              class="font-medium cursor-pointer text-primary hover:underline"
            >
              Premium subscription </router-link
            >with deeper league and manager insights, and I’ll keep pricing as
            affordable as possible. My goal is to make fantasy football more
            fun, insightful, and engaging for every league, and every bit of
            support helps keep ffwrapped running and improving.
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
