<script setup lang="ts">
import { getLeagueCount } from "@/api/api";
import { watch, ref, onMounted } from "vue";
import { useStore } from "@/store/store";
import Switch from "@/components/ui/switch/Switch.vue";
import { useRoute } from "vue-router";
import Separator from "@/components/ui/separator/Separator.vue";
import { trackPremiumFunnelEvent } from "@/lib/analytics";
import PageContainer from "@/components/layout/PageContainer.vue";
import PageHeader from "@/components/layout/PageHeader.vue";
import SectionHeader from "@/components/layout/SectionHeader.vue";

const route = useRoute();
const leagueCount = ref(13436); // initial load current unique league count value 7/8/26

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
  <PageContainer>
      <PageHeader title="About" class="mb-4" />

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
            the userbase grows, hosting and AI costs grow too, so donations are
            always appreciated. I also offer an optional
            <router-link
              :to="{ path: '/account', query: $route.query }"
              class="font-medium cursor-pointer text-primary hover:underline"
              @click="
                trackPremiumFunnelEvent('premium_cta_clicked', {
                  cta: 'about_premium_tier',
                  source: 'about',
                  feature: 'premium',
                })
              "
            >
              Premium tier
            </router-link>
            for those who want even deeper league insights. Supporting the
            project this way really helps me out and I'm committed to keeping it
            as affordable as possible. My goal is to make fantasy football more
            enjoyable and engaging for every league, and every bit of support
            helps keep ffwrapped running and growing.
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
        <SectionHeader title="Settings" class="mt-6" />
        <div class="flex items-center mt-4 space-x-2">
          <Switch
            v-model="store.showUsernames"
            :disabled="store.leagueInfo.length == 0"
          />
          <label>Show usernames instead of team names</label>
        </div>
        <SectionHeader title="League Count" class="mt-6" />
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
  </PageContainer>
</template>
