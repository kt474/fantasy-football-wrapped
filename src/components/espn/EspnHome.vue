<script setup lang="ts">
import { ref } from "vue";
import { getEspnLeague } from "@/api/espnApi";
import Button from "../ui/button/Button.vue";

const data = ref();

const getData = async () => {
  const response = await getEspnLeague("42654852", "2025");
  data.value = response;
};
</script>
<template>
  <div>
    <Button @click="getData">Get Data</Button>
    <div>
      {{ data }}
    </div>
  </div>
</template>
