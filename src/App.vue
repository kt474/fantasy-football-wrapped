<script setup lang="ts">
import { onMounted, ref } from "vue";
import Table from "./components/Table.vue";
import { getLeague, getRosters, getUsers, getMatchup } from "./api";
const leagueName = ref("");
const leagueRosters = ref([]);
const leagueUsers = ref([]);
const leagueMatchups = ref([]);

onMounted(async () => {
  leagueName.value = await getLeague();
  leagueRosters.value = await getRosters();
  leagueUsers.value = await getUsers();
  leagueMatchups.value = await getMatchup(1);
});
</script>

<template>
  <div class="">
    <div class="container mx-auto">
      <h2 class="text-3xl font-bold dark:text-white my-4">
        {{ leagueName }}
      </h2>

      <Table :users="leagueUsers" :rosters="leagueRosters" />
    </div>
  </div>
</template>

<style scoped></style>
