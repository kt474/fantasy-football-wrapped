<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "../../store/store";
import { Badge } from "../ui/badge";
import Card from "../ui/card/Card.vue";
import CardContent from "../ui/card/CardContent.vue";
import CardHeader from "../ui/card/CardHeader.vue";
import CardTitle from "../ui/card/CardTitle.vue";

const store = useStore();

interface PointSeasonEntry {
  season: string;
  points: number[];
}

interface MatchupHistoryRow {
  id: string;
  name: string;
  username: string;
  matchups: (number | null)[];
  pointsArr: number[];
  pointSeason: PointSeasonEntry[];
}

interface MatchupDifference {
  teamA: MatchupHistoryRow;
  teamB: MatchupHistoryRow;
  scoreA: number;
  scoreB: number;
  difference: number;
  matchupId: number;
  matchupIndex: number;
}

interface MatchupSection {
  title: string;
  matchups: MatchupDifference[];
}

interface MatchupTeamDisplay {
  team: MatchupHistoryRow;
  score: number;
  isWinner: boolean;
}

const props = defineProps<{
  tableData: MatchupHistoryRow[];
}>();

const displayName = (team: MatchupHistoryRow) =>
  store.showUsernames
    ? team.username || "Ghost Roster"
    : team.name || "Ghost Roster";

const formatPoints = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const matchupRecords = computed(() => {
  const matchupDifferences: MatchupDifference[] = [];

  props.tableData.forEach((teamA) => {
    teamA.matchups.forEach((matchupId: number | null, matchupIndex: number) => {
      if (matchupId === null) {
        return;
      }

      const teamB = props.tableData.find(
        (team) => team !== teamA && team.matchups[matchupIndex] === matchupId
      );

      if (teamB && teamB.matchups[matchupIndex] !== null) {
        const scoreA = teamA.pointsArr[matchupIndex];
        const scoreB = teamB.pointsArr[matchupIndex];

        if (
          typeof scoreA === "number" &&
          typeof scoreB === "number" &&
          !Number.isNaN(scoreA) &&
          !Number.isNaN(scoreB) &&
          scoreA !== 0 &&
          scoreB !== 0
        ) {
          const difference = Math.abs(scoreA - scoreB);
          matchupDifferences.push({
            teamA,
            teamB,
            scoreA,
            scoreB,
            difference,
            matchupId,
            matchupIndex,
          });
        }
      }
    });
  });

  const uniqueMatchups: MatchupDifference[] = [];
  const processedMatchups = new Set<string>();

  matchupDifferences.forEach((matchup) => {
    const teamAId =
      matchup.teamA.id ||
      matchup.teamA.name ||
      `teamA-idx-${matchup.matchupIndex}`;
    const teamBId =
      matchup.teamB.id ||
      matchup.teamB.name ||
      `teamB-idx-${matchup.matchupIndex}`;

    const sortedTeamIds = [teamAId, teamBId].sort();
    const id = `${sortedTeamIds[0]}-${sortedTeamIds[1]}-${matchup.matchupId}-${matchup.matchupIndex}`;

    if (!processedMatchups.has(id)) {
      uniqueMatchups.push(matchup);
      processedMatchups.add(id);
    }
  });

  return uniqueMatchups;
});

const getWeek = (seasonsData: PointSeasonEntry[], index: number) => {
  const sortedSeasons = [...seasonsData];

  let cumulativeWeekCount = -1;

  for (const seasonObj of sortedSeasons) {
    const numWeeksInSeason = seasonObj.points.length;
    if (
      index > cumulativeWeekCount &&
      index <= cumulativeWeekCount + numWeeksInSeason
    ) {
      const weekIndex = index - cumulativeWeekCount;
      return `${seasonObj.season} / Week ${weekIndex}`;
    }

    cumulativeWeekCount += numWeeksInSeason;
  }

  return "Week N/A";
};

const getMatchupTeams = (matchup: MatchupDifference): MatchupTeamDisplay[] => [
  {
    team: matchup.teamA,
    score: matchup.scoreA,
    isWinner: matchup.scoreA > matchup.scoreB,
  },
  {
    team: matchup.teamB,
    score: matchup.scoreB,
    isWinner: matchup.scoreB > matchup.scoreA,
  },
];

const matchupSections = computed<MatchupSection[]>(() => [
  {
    title: "Closest Matchups",

    matchups: [...matchupRecords.value]
      .sort((a, b) => a.difference - b.difference)
      .slice(0, 4),
  },
  {
    title: "Biggest Blowouts",

    matchups: [...matchupRecords.value]
      .sort((a, b) => b.difference - a.difference)
      .slice(0, 4),
  },
]);
</script>

<template>
  <Card v-if="matchupRecords.length" class="mt-4 overflow-hidden">
    <CardHeader class="p-4 border-b sm:p-6 bg-muted/30">
      <CardTitle class="text-2xl sm:text-3xl">Matchup Margins</CardTitle>
    </CardHeader>
    <CardContent class="p-4 sm:p-6">
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section
          v-for="section in matchupSections"
          :key="section.title"
          class="space-y-3"
        >
          <div>
            <h4 class="text-lg font-semibold">
              {{ section.title }}
            </h4>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card
              v-for="matchup in section.matchups"
              :key="`${section.title}-${matchup.matchupId}-${matchup.matchupIndex}`"
              class="flex flex-col h-40"
            >
              <CardHeader class="p-4 pb-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-2xl font-bold tabular-nums">
                      {{ formatPoints(matchup.difference) }}
                    </p>
                    <p class="text-xs font-medium text-muted-foreground">
                      Margin
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    class="text-xs text-right whitespace-normal max-w-28"
                  >
                    {{
                      getWeek(matchup.teamA.pointSeason, matchup.matchupIndex)
                    }}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent class="flex flex-col flex-1 p-4 pt-2">
                <div class="space-y-1.5">
                  <div
                    v-for="team in getMatchupTeams(matchup)"
                    :key="team.team.id || team.team.name"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-md bg-muted/40 px-3 py-1.5"
                  >
                    <p
                      class="min-w-0 text-sm font-medium break-words"
                    >
                      {{ displayName(team.team) }}
                    </p>
                    <p
                      class="text-sm font-semibold text-right tabular-nums"
                      :class="{ 'text-primary': team.isWinner }"
                    >
                      {{ formatPoints(team.score) }}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </CardContent>
  </Card>
</template>
