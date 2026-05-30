<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { getLeagueKey, useStore } from "../../store/store";
import { generatePreview } from "../../api/api";
import { TableDataType, LeagueInfoType } from "../../types/types";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import Button from "../ui/button/Button.vue";

const preview = ref<string>("");
const loading = ref<boolean>(false);

onMounted(() => {
  preview.value =
    store.leagueInfo[store.currentLeagueIndex]?.weeklyPreview ?? "";
});

const getPreview = async () => {
  if (!preview.value) {
    loading.value = true;
    const response = await generatePreview(promptData.value);
    preview.value = response.text;
    const currentLeague = store.leagueInfo[store.currentLeagueIndex];
    store.addWeeklyPreview(getLeagueKey(currentLeague), preview.value);
    localStorage.setItem(
      "leagueInfo",
      JSON.stringify(store.leagueInfo as LeagueInfoType[])
    );
    loading.value = false;
  }
};

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const renderedPreview = computed(() => {
  return DOMPurify.sanitize(md.render(preview.value));
});

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
  matchups: TableDataType[][];
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
  const matchupData = props.matchups.map((matchup: any) => {
    const team1 = {
      name: store.showUsernames ? matchup[0].username : matchup[0].name,
      losses: matchup[0].losses,
      wins: matchup[0].wins,
      starters: getStarters(matchup[0].rosterId),
      previousWeekScores: matchup[0].points,
      currentRanking: matchup[0].regularSeasonRank,
      recordByWeek: matchup[0].recordByWeek,
    };
    const team2 = {
      name: store.showUsernames ? matchup[1].username : matchup[1].name,
      losses: matchup[1].losses,
      wins: matchup[1].wins,
      starters: getStarters(matchup[1].rosterId),
      previousWeekScores: matchup[1].points,
      currentRanking: matchup[1].regularSeasonRank,
      recordByWeek: matchup[1].recordByWeek,
    };
    return [team1, team2];
  });

  const currentWeek =
    store.leagueInfo[store.currentLeagueIndex]?.currentWeek ??
    store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek;

  const playoffMatchup =
    currentWeek >
    store.leagueInfo[store.currentLeagueIndex]?.regularSeasonLength;

  if (playoffMatchup) {
    return {
      leagueMetadata: {
        regularSeasonLength:
          store.leagueInfo[store.currentLeagueIndex]?.regularSeasonLength,
        playoffTeams: store.leagueInfo[store.currentLeagueIndex]?.playoffTeams,
        currentWeek: currentWeek,
        playoffMatchup: playoffMatchup,
      },
      matchupData,
    };
  }
  return {
    leagueMetadata: {
      regularSeasonLength:
        store.leagueInfo[store.currentLeagueIndex]?.regularSeasonLength,
      playoffTeams: store.leagueInfo[store.currentLeagueIndex]?.playoffTeams,
      currentWeek: currentWeek,
    },
    matchupData,
  };
});
</script>
<template>
  <div class="w-full mb-4">
    <div class="flex justify-between">
      <h3 class="text-xl font-bold">Matchup Forecast</h3>
      <Button class="" v-if="preview === ''" @click="getPreview">
        Generate
      </Button>
    </div>
    <div v-if="preview" class="mt-1">
      <p v-html="renderedPreview"></p>
      <p
        v-if="preview !== 'Unable to generate preview. Please try again later.'"
        class="mt-1 text-xs text-muted-foreground"
      >
        AI-generated summary. Information provided may not always be accurate.
      </p>
    </div>
    <p v-if="loading">Loading...</p>
  </div>
</template>
