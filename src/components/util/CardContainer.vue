<script setup lang="ts">
import LeagueSwitcher from "../layout/LeagueSwitcher.vue";
import Dialog from "../layout/Dialog.vue";
import { Button } from "../ui/button";
import { useRoute } from "vue-router";

import { useStore } from "../../store/store";
import { computed } from "vue";

const store = useStore();
const route = useRoute();

const leagues = computed(() => {
  return store.leagueInfo;
});

const hasLeagueIdInUrl = computed(() => {
  const leagueId = route.query.leagueId;
  const normalizedLeagueId = Array.isArray(leagueId) ? leagueId[0] : leagueId;
  return Boolean(normalizedLeagueId) && normalizedLeagueId !== "undefined";
});

const showAddLeagueButton = computed(() => {
  const isHomeTabOnHomeRoute =
    route.path === "/" && store.currentTab === "Home";
  return !store.loadingLeague && !hasLeagueIdInUrl.value && !isHomeTabOnHomeRoute;
});
</script>
<template>
  <div class="flex min-w-0 flex-1">
    <div class="flex w-full min-w-0 overflow-auto no-scrollbar">
      <LeagueSwitcher
        v-if="hasLeagueIdInUrl && route.path === '/'"
        :leagues="leagues"
      />
      <div
        class="flex w-full min-w-0 items-center gap-2"
        v-else-if="showAddLeagueButton"
      >
        <Dialog>
          <template #trigger>
            <Button
              type="button"
              size="sm"
              class="ml-1.5 shrink-0 text-sm font-medium"
            >
              Add League
            </Button>
          </template>
        </Dialog>
        <p
          v-if="route.path === '/' && !store.loadingLeague"
          class="ml-auto truncate text-right text-sm font-medium pointer-events-none sm:mr-auto sm:text-base"
        >
          <span class="sm:hidden">Demo</span>
          <span class="hidden sm:inline">Demo League</span>
        </p>
      </div>
    </div>
  </div>
</template>
<style>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
