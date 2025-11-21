<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { generatePreview } from "../../api/api";

const preview: any = ref("");
const loading = ref<boolean>(false);

const getPreview = async () => {
  loading.value = true;
  const response = await generatePreview(promptData.value);
  preview.value = response.text;
  loading.value = false;
};

const store = useStore();
const props = defineProps<{
  matchup1: any;
  matchup2: any;
  playerNames: any[];
}>();

const getStarters = (id: number) => {
  const playerObj: any = props.playerNames.find((user: any) => user.id === id);
  if (playerObj) {
    return playerObj.players.map((player: any) => {
      return {
        name: player.name,
        position: player.position,
        projectedPoints: player.projection,
        team: player.team,
      };
    });
  }
};

const promptData = computed(() => {
  const team1 = {
    name: store.showUsernames ? props.matchup1.username : props.matchup1.name,
    losses: props.matchup1.losses,
    wins: props.matchup1.wins,
    starters: getStarters(props.matchup1.rosterId),
    previousWeekScores: props.matchup1.points,
    currentRanking: props.matchup1.regularSeasonRank,
  };
  const team2 = {
    name: store.showUsernames ? props.matchup2.username : props.matchup2.name,
    losses: props.matchup2.losses,
    wins: props.matchup2.wins,
    starters: getStarters(props.matchup2.rosterId),
    previousWeekScores: props.matchup2.points,
    currentRanking: props.matchup2.regularSeasonRank,
  };

  return {
    leagueMetadata: {
      regularSeasonLength:
        store.leagueInfo[store.currentLeagueIndex]?.regularSeasonLength,
      playoffTeams: store.leagueInfo[store.currentLeagueIndex]?.playoffTeams,
      currentWeek: store.leagueInfo[store.currentLeagueIndex]?.currentWeek,
    },
    team1,
    team2,
  };
});
</script>
<template>
  <div class="bg-gray-50 mt-4 rounded dark:bg-gray-700 mx-2 p-4">
    <h3 class="font-semibold text-gray-800 dark:text-gray-50">
      Matchup Preview
    </h3>
    <button
      v-if="preview === ''"
      @click="getPreview"
      class="text-gray-50 mt-3 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-base sm:text-sm w-full sm:w-auto px-3 sm:px-3 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >
      Generate
    </button>
    <div v-if="preview" class="mt-1">
      <p>{{ preview }}</p>
      <p class="text-xs text-gray-500 dark:text-gray-300 mt-1">
        Generated using GPT-4.1-mini. Information provided may not always be
        accurate.
      </p>
    </div>

    <p class="mt-2" v-if="loading">Loading...</p>
  </div>
</template>
