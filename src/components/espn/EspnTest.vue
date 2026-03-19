<script setup lang="ts">
import { ref } from "vue";
import {
  getLeagueInfoLike,
} from "@/api/espnApi";
import Button from "../ui/button/Button.vue";

const data = ref();

const testApi = async () => {
  data.value = await getLeagueInfoLike("2025", "2127");
};
</script>
<template>
  <div class="p-4">
    <Button @click="testApi()">Fetch Data</Button>
    <pre class="mt-4 overflow-x-auto text-sm">{{ data }}</pre>
  </div>
</template>
