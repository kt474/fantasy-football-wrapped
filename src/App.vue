<script setup lang="ts">
import { onMounted, ref } from "vue";
import Table from "./components/Table.vue";

const leagueName = ref("");
const leagueRosters = ref([]);
const leagueUsers = ref([]);

const getLeague = async () => {
  const response = await fetch(
    "https://api.sleeper.app/v1/league/992195707941212160"
  );
  const league = await response.json();
  leagueName.value = league.name;
};
const getRosters = async () => {
  const response = await fetch(
    "https://api.sleeper.app/v1/league/992195707941212160/rosters"
  );
  const rosters = await response.json();
  const result = rosters.map((roster: any) => {
    return {
      id: roster["owner_id"],
      pointsFor: roster["settings"]["fpts"],
      pointsAgainst: roster["settings"]["fpts_against"],
      wins: roster["settings"]["wins"],
      losses: roster["settings"]["losses"],
    };
  });
  leagueRosters.value = result;
};
const getUsers = async () => {
  const response = await fetch(
    "https://api.sleeper.app/v1/league/992195707941212160/users"
  );
  const users = await response.json();
  const result = users.map((user: any) => {
    return {
      id: user["user_id"],
      name: user["metadata"]["team_name"] || user["display_name"],
    };
  });
  leagueUsers.value = result;
};

onMounted(async () => {
  await getLeague();
  await getRosters();
  await getUsers();
});
</script>

<template>
  <div class="m-4">
    <p class="">{{ leagueName }}</p>
    <Table :users="leagueUsers" :rosters="leagueRosters" />
  </div>
</template>

<style scoped></style>
