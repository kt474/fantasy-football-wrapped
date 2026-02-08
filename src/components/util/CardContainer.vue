<script setup lang="ts">
import LeagueSwitcher from "../layout/LeagueSwitcher.vue";
import Dialog from "../layout/Dialog.vue";

import { useStore } from "../../store/store";
import { computed } from "vue";

const store = useStore();

const leagues = computed(() => {
  return store.leagueInfo;
});
</script>
<template>
  <div class="flex">
    <div class="flex overflow-auto no-scrollbar">
      <LeagueSwitcher v-if="leagues.length > 0" :leagues="leagues" />
      <div v-else>
        <Dialog />
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
