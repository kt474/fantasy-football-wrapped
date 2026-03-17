<script setup lang="ts">
import { ref } from "vue";
import { getLeagueData } from "@/api/espnApi";
import Button from "../ui/button/Button.vue";

const data = ref();

const testApi = async () => {
  data.value = await getLeagueData("2025", "2127");
};
</script>
<template>
  <div class="p-4">
    <Button @click="testApi()">Fetch Data</Button>
    <div>
      {{ data }}
    </div>
  </div>
</template>
