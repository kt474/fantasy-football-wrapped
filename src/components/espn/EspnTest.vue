<script setup lang="ts">
import { ref } from "vue";
import { getData } from "@/api/espnApi";
import Button from "../ui/button/Button.vue";

const data = ref();

const testApi = async () => {
  data.value = await getData("2025", "2127");
};
</script>
<template>
  <div>
    <Button @click="testApi()">Fetch Data</Button>
    <div>
      {{ data }}
    </div>
  </div>
</template>
