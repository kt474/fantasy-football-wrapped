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

  const playoffMatchup =
    store.leagueInfo[store.currentLeagueIndex]?.currentWeek >
    store.leagueInfo[store.currentLeagueIndex]?.regularSeasonLength;

  if (playoffMatchup) {
    return {
      leagueMetadata: {
        regularSeasonLength:
          store.leagueInfo[store.currentLeagueIndex]?.regularSeasonLength,
        playoffTeams: store.leagueInfo[store.currentLeagueIndex]?.playoffTeams,
        currentWeek: store.leagueInfo[store.currentLeagueIndex]?.currentWeek,
        playoffMatchup: playoffMatchup,
        playoffBracket:
          props.matchup1.regularSeasonRank <=
          store.leagueInfo[store.currentLeagueIndex]?.playoffTeams
            ? "winners"
            : "losers",
      },
      team1,
      team2,
    };
  }
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
  <div class="p-4 mx-0 mt-3 rounded bg-gray-50 dark:bg-gray-700 sm:mx-2">
    <h3 class="font-semibold text-gray-800 dark:text-gray-50">
      Matchup Preview
    </h3>
    <button
      v-if="preview === ''"
      @click="getPreview"
      class="w-full px-3 py-2 mt-3 text-base font-medium text-center bg-blue-700 rounded-lg text-gray-50 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 sm:text-sm sm:w-auto sm:px-3 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >
      Generate
    </button>
    <div v-if="preview" class="mt-1">
      <p>{{ preview }}</p>
      <p
        v-if="preview !== 'Unable to generate preview. Please try again later.'"
        class="mt-1 text-xs text-gray-500 dark:text-gray-400"
      >
        Generated using GPT-4.1-mini. Information provided may not always be
        accurate.
      </p>
    </div>

    <p class="mt-2" v-if="loading">Loading...</p>
  </div>
</template>
