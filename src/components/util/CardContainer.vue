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
</script>
<template>
  <div class="flex flex-1 min-w-0">
    <div class="flex w-full overflow-auto no-scrollbar">
      <LeagueSwitcher v-if="leagues.length > 0" :leagues="leagues" />
      <div
        class="relative flex items-center w-full"
        v-else-if="
          store.currentTab !== 'Home' &&
          !store.currentLeagueId &&
          !store.showLeaguesList
        "
      >
        <Dialog>
          <template #trigger>
            <Button type="button" size="sm" class="text-sm font-medium ml-1.5">
              Add League
            </Button>
          </template>
        </Dialog>
        <p
          v-if="route.path === '/'"
          class="absolute inset-x-0 mr-4 font-medium text-right pointer-events-none sm:mr-0 sm:text-center whitespace-nowrap"
        >
          Sample League
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
