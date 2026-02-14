<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useStore } from "../../store/store";
import Card from "../ui/card/Card.vue";

const store = useStore();
const props = defineProps<{
  tableData: any[];
}>();
const closestMatchups: any = ref([]);
const farthestMatchups: any = ref([]);

onMounted(() => {
  getMatchups();
});

watch(
  () => store.currentLeagueId,
  () => getMatchups()
);

const getMatchups = () => {
  const matchupDifferences: any[] = [];

  props.tableData.forEach((teamA) => {
    teamA.matchups.forEach((matchupId: number, matchupIndex: number) => {
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
          !isNaN(scoreA) &&
          !isNaN(scoreB) &&
          scoreA !== 0 &&
          scoreB !== 0
        ) {
          const difference = Math.abs(scoreA - scoreB);
          matchupDifferences.push({
            teamA: teamA,
            teamB: teamB,
            scoreA: scoreA,
            scoreB: scoreB,
            difference: difference,
            matchupId: matchupId,
            matchupIndex: matchupIndex,
          });
        }
      }
    });
  });

  const uniqueMatchups: any[] = [];
  const processedMatchups = new Set();

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
    const id = `${sortedTeamIds[0]}-${sortedTeamIds[1]}-${matchup.matchupId}`;

    if (!processedMatchups.has(id)) {
      uniqueMatchups.push(matchup);
      processedMatchups.add(id);
    }
  });

  uniqueMatchups.sort((a, b) => a.difference - b.difference);
  closestMatchups.value = uniqueMatchups.slice(0, 5);

  uniqueMatchups.sort((a, b) => b.difference - a.difference);
  farthestMatchups.value = uniqueMatchups.slice(0, 5);
};

const getWeek = (seasonsData: any[], index: number) => {
  // We need to work with years in ascending order,
  // so let's sort a copy of the array.
  const sortedSeasons = [...seasonsData];

  let cumulativeWeekCount = -1;

  for (const seasonObj of sortedSeasons) {
    const numWeeksInSeason = seasonObj.points.length;

    // Check if the target week falls within the current season
    if (
      index > cumulativeWeekCount &&
      index <= cumulativeWeekCount + numWeeksInSeason
    ) {
      // Calculate the 0-based index within this season's points array
      const weekIndex = index - cumulativeWeekCount;
      return `${seasonObj.season} Week ${weekIndex}`;
    }

    cumulativeWeekCount += numWeeksInSeason;
  }

  // If we reach here, the targetWeekNumber is out of range
  return "Week N/A";
};
</script>

<template>
  <div class="flex flex-wrap justify-start mt-4 md:flex-nowrap">
    <Card class="w-full px-6 py-4 mr-0 md:mr-4">
      <h5 class="mb-4 text-2xl font-bold sm:text-3xl">Closest Matchups</h5>
      <Card v-for="matchup in closestMatchups" class="p-4 mb-4 bg-secondary">
        <div class="">
          <p class="mb-2 font-medium">
            {{ getWeek(matchup.teamA.pointSeason, matchup.matchupIndex) }}
          </p>

          <div class="flex justify-between mt-1 mr-1">
            <div class="mb-2 mr-4 text-center">
              <p class="text-2xl font-semibold">
                {{ matchup.difference.toFixed(2) }}
              </p>
              <p class="text-muted-foreground">
                <span class="hidden sm:inline">Point</span
                ><span class="inline sm:hidden">Pt.</span> Diff
              </p>
            </div>
            <div class="w-4/5">
              <div class="flex justify-between mb-2">
                <p>
                  {{
                    store.showUsernames
                      ? matchup.teamA.username
                      : matchup.teamA.name
                  }}
                </p>
                <p
                  class="font-semibold"
                  :class="{
                    'text-primary': matchup.scoreA > matchup.scoreB,
                  }"
                >
                  {{ matchup.scoreA }}
                </p>
              </div>
              <div class="flex justify-between">
                <p>
                  {{
                    store.showUsernames
                      ? matchup.teamB.username
                      : matchup.teamB.name
                  }}
                </p>
                <p
                  class="font-semibold text"
                  :class="{
                    'text-primary': matchup.scoreB > matchup.scoreA,
                  }"
                >
                  {{ matchup.scoreB }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Card>
    <Card class="w-full px-6 py-4 mt-4 md:mt-0">
      <h5 class="mb-4 text-2xl font-bold sm:text-3xl">Biggest Blowouts</h5>
      <Card v-for="matchup in farthestMatchups" class="p-4 mb-4 bg-secondary">
        <div class="">
          <p class="mb-2 font-medium">
            {{ getWeek(matchup.teamA.pointSeason, matchup.matchupIndex) }}
          </p>

          <div class="flex justify-between mt-1 mr-1">
            <div class="mb-2 mr-4 text-center">
              <p class="text-2xl font-semibold">
                {{ matchup.difference.toFixed(2) }}
              </p>
              <p class="text-muted-foreground">
                <span class="hidden sm:inline">Point</span
                ><span class="inline sm:hidden">Pt.</span> Diff
              </p>
            </div>
            <div class="w-4/5">
              <div class="flex justify-between mb-2">
                <p>
                  {{
                    store.showUsernames
                      ? matchup.teamA.username
                      : matchup.teamA.name
                  }}
                </p>
                <p
                  class="font-semibold"
                  :class="{
                    'text-primary': matchup.scoreA > matchup.scoreB,
                  }"
                >
                  {{ matchup.scoreA }}
                </p>
              </div>
              <div class="flex justify-between">
                <p>
                  {{
                    store.showUsernames
                      ? matchup.teamB.username
                      : matchup.teamB.name
                  }}
                </p>
                <p
                  class="font-semibold text"
                  :class="{
                    'text-primary': matchup.scoreB > matchup.scoreA,
                  }"
                >
                  {{ matchup.scoreB }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Card>
  </div>
</template>
