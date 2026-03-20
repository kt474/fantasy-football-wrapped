<script setup lang="ts">
import { ref } from "vue";
import { getLeagueInfoLike } from "@/api/espnApi";
import Button from "../ui/button/Button.vue";
import { useStore } from "@/store/store";

const store = useStore();
const data = ref();

const testApi = async () => {
  data.value = await getLeagueInfoLike("2025", "2127");
  store.updateCurrentLeagueId(data.value.leagueId);
  store.updateLeagueInfo(data.value);
};
</script>
<template>
  <div class="p-4">
    <Button @click="testApi()">Fetch Data</Button>
    <div v-for="move in data.waivers">
      {{ move.type }}
    </div>
    <!-- <pre class="mt-4 overflow-x-auto text-sm">{{ data }}</pre> -->
  </div>
</template>
