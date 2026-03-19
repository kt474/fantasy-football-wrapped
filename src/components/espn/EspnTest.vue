<script setup lang="ts">
import { ref } from "vue";
import {
  getLeagueData,
  getTeamData,
  getRosterData,
  getMatchups,
  getDraftData,
} from "@/api/espnApi";
import Button from "../ui/button/Button.vue";

const data = ref();

const testApi = async () => {
  const [league, team, roster, matchups, draft] = await Promise.all([
    getLeagueData("2025", "2127"),
    getTeamData("2025", "2127"),
    getRosterData("2025", "2127"),
    getMatchups("2025", "2127"),
    getDraftData("2025", "2127"),
  ]);
  const result = {
    name: league?.leagueName,
    regularSeasonLength: 14,
    medianScoring: 0,
    totalRosters: roster?.teams.length,
    season: "2025",
    seasonType: "Redraft",
    leagueId: "2127",
    leagueWinner: "1",
    lastUpdate: new Date().getTime(),
    previousLeagueId: null,
    lastScoredWeek: 17,
  };
  data.value = result;
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
