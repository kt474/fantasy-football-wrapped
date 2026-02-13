<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "../../store/store";
import { generatePreview } from "../../api/api";
import { TableDataType } from "../../types/types";
import Button from "../ui/button/Button.vue";

const preview = ref<string>("");
const loading = ref<boolean>(false);

const getPreview = async () => {
  loading.value = true;
  const response = await generatePreview(promptData.value);
  preview.value = response.text;
  loading.value = false;
};

interface PlayerType {
  name: string;
  player_id: string;
  position: string;
  projection: number;
  team: string;
}

interface PlayerNameType {
  id: number;
  players: PlayerType[];
  total: number;
}

const store = useStore();
const props = defineProps<{
  matchup1: TableDataType;
  matchup2: TableDataType;
  playerNames: PlayerNameType[];
}>();

const getStarters = (id: number) => {
  const playerObj = props.playerNames.find((user) => user.id === id);
  if (playerObj) {
    return playerObj.players.map((player) => {
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
  <div class="p-4 mx-0 mt-3 rounded bg-secondary sm:mx-2">
    <h3 class="font-semibold">Matchup Preview</h3>
    <Button v-if="preview === ''" @click="getPreview"> Generate </Button>
    <div v-if="preview" class="mt-1">
      <p>{{ preview }}</p>
      <p
        v-if="preview !== 'Unable to generate preview. Please try again later.'"
        class="mt-1 text-xs text-muted-foreground"
      >
        Generated using GPT-4.1-mini. Information provided may not always be
        accurate.
      </p>
    </div>
    <p class="mt-2" v-if="loading">Loading...</p>
  </div>
</template>
