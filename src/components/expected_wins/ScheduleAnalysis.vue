<script setup lang="ts">
import { computed } from "vue";
import { TableDataType } from "../../api/types";
import { useStore } from "../../store/store";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const promptData = computed(() => {
  return props.tableData.map((user) => {
    return {
      teamName: store.showUsernames ? user.username : user.name,
      matchups: user.matchups,
      points: user.points,
      actualWins: user.wins,
      expectedWins: user.randomScheduleWins,
    };
  });
});

const luckAnalysis = computed(() => {
  const teams = promptData.value;

  // Calculate luck differential for each team
  const teamLuck = teams.map((team) => ({
    teamName: team.teamName,
    actualWins: team.actualWins,
    expectedWins: team.expectedWins,
    luckDiff: team.actualWins - team.expectedWins,
    luckyWeeks: [] as any[],
    unluckyWeeks: [] as any[],
  }));

  // Analyze each week for each team
  teams.forEach((team, teamIndex) => {
    for (
      let week = 0;
      week <
      (store.leagueInfo.length > 0
        ? store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
        : 17);
      week++
    ) {
      const opponentId = team.matchups[week];
      const opponent = teams.find(
        (t) => t.matchups[week] === opponentId && t !== team
      );

      if (!opponent) continue;

      const teamPoints = team.points[week];
      const opponentPoints = opponent.points[week];
      const won = teamPoints > opponentPoints;

      // Get all scores for this week and sort
      const weekScores = teams.map((t) => t.points[week]).sort((a, b) => b - a);

      // Find ranking (1-indexed)
      const ranking = weekScores.indexOf(teamPoints) + 1;
      const totalTeams = weekScores.length;

      // Determine if it's top/bottom half for descriptive text
      const rankText =
        ranking <= 3
          ? `${ranking}${getRankSuffix(ranking)} highest`
          : ranking >= totalTeams - 2
            ? `${totalTeams - ranking + 1}${getRankSuffix(
                totalTeams - ranking + 1
              )} lowest`
            : `${ranking}${getRankSuffix(ranking)}`;

      const wouldBeat = teams.filter((t) => teamPoints > t.points[week]).length;
      const wouldLose = teams.filter((t) => teamPoints < t.points[week]).length;

      // Lucky win
      if (won && wouldLose > wouldBeat) {
        teamLuck[teamIndex].luckyWeeks.push({
          week: week + 1,
          points: teamPoints,
          opponentName: opponent.teamName,
          opponentPoints,
          wouldBeat,
          wouldLose,
          ranking,
          rankText,
        });
      }

      // Unlucky loss
      if (!won && wouldBeat > wouldLose) {
        teamLuck[teamIndex].unluckyWeeks.push({
          week: week + 1,
          points: teamPoints,
          opponentName: opponent.teamName,
          opponentPoints,
          wouldBeat,
          wouldLose,
          ranking,
          rankText,
        });
      }
    }
  });

  const sorted = teamLuck.sort((a, b) => b.luckDiff - a.luckDiff);

  return {
    luckiest: sorted.slice(0, 3),
    unluckiest: sorted.slice(-3).reverse(),
  };
});

const scheduleAnalysis = computed(() => {
  const teams = promptData.value;

  return teams.map((team) => {
    let bestRecord = team.actualWins;
    let worstRecord = team.actualWins;
    let bestScheduleTeam = team.teamName;
    let worstScheduleTeam = team.teamName;

    // Try each other team's schedule
    teams.forEach((otherTeam) => {
      if (otherTeam.teamName === team.teamName) return;

      let winsWithThisSchedule = 0;

      // Play this team's points against the other team's opponents
      for (let week = 0; week < 10; week++) {
        const opponentId = otherTeam.matchups[week];
        const opponent = teams.find(
          (t) => t.matchups[week] === opponentId && t !== otherTeam
        );

        if (!opponent) continue;

        // Would this team have won with their points against this opponent?
        if (team.points[week] > opponent.points[week]) {
          winsWithThisSchedule++;
        }
      }

      // Track best and worst possible records
      if (winsWithThisSchedule > bestRecord) {
        bestRecord = winsWithThisSchedule;
        bestScheduleTeam = otherTeam.teamName;
      }

      if (winsWithThisSchedule < worstRecord) {
        worstRecord = winsWithThisSchedule;
        worstScheduleTeam = otherTeam.teamName;
      }
    });

    return {
      teamName: team.teamName,
      actualWins: team.actualWins,
      bestPossibleRecord: bestRecord,
      worstPossibleRecord: worstRecord,
      bestScheduleTeam,
      worstScheduleTeam,
      recordRange: bestRecord - worstRecord,
    };
  });
});

// Helper function for ordinal suffix
function getRankSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
</script>
<template>
  <div
    class="w-full p-4 mt-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6"
  >
    <h1
      class="pb-2 mb-3 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
    >
      Schedule Analysis (Beta)
    </h1>
    <hr class="h-px mt-1 mb-4 bg-gray-200 border-0 dark:bg-gray-700" />
    <h2 class="mb-4 text-xl font-bold dark:text-gray-50">
      Luckiest/Unluckiest Teams
    </h2>
    <div class="flex flex-wrap justify-start lg:flex-nowrap">
      <div class="lg:mr-4 lg:w-1/2">
        <div
          class="px-4 py-3 mb-4 border rounded-lg shadow dark:shadow-gray-600 dark:border-gray-600 min-h-52"
          v-for="team in luckAnalysis.luckiest"
          :key="team.teamName"
        >
          <h3 class="mb-2 text-xl font-semibold dark:text-gray-200">
            {{ team.teamName }}
          </h3>
          <div class="flex mb-3 text-center justify-evenly">
            <div>
              <p class="text-gray-600 dark:text-gray-300">Wins</p>
              <p class="font-semibold dark:text-gray-200 text-2xl">
                {{ team.actualWins }}
              </p>
            </div>
            <div class="w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>
            <div>
              <p class="text-gray-600 dark:text-gray-300">Expected</p>
              <p class="font-semibold dark:text-gray-200 text-2xl">
                {{ team.expectedWins.toFixed(2) }}
              </p>
            </div>
            <div class="w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>
            <div>
              <p class="text-gray-600 dark:text-gray-300">Luck</p>
              <p class="font-semibold text-green-500 text-2xl">
                +{{ team.luckDiff.toFixed(2) }}
              </p>
            </div>
          </div>
          <h4
            v-if="team.luckyWeeks.length > 0"
            class="my-2 text-gray-600 dark:text-gray-300"
          >
            Key Matchups
          </h4>
          <ul>
            <li
              v-for="week in team.luckyWeeks"
              :key="week.week"
              class="p-2.5 mb-2 bg-gray-50 rounded dark:bg-gray-700 dark:text-gray-200"
            >
              <p class="font-semibold">Week {{ week.week }}</p>
              <p>
                Won with
                <span class="font-semibold">{{ week.points }}</span> pts ({{
                  week.rankText
                }}) vs {{ week.opponentName }}
              </p>
            </li>
          </ul>
          <div v-if="team.luckyWeeks.length === 0">
            <p class="text-gray-800 dark:text-gray-200">
              <b>{{ team.teamName }}</b> did not have any individual weeks where
              they won with a particularly low score. Their luck came from
              facing opponents with below average scores.
            </p>
          </div>
        </div>
      </div>
      <div class="lg:w-1/2">
        <div
          class="px-4 py-3 mb-4 border rounded-lg shadow dark:shadow-gray-600 dark:border-gray-600 min-h-52"
          v-for="team in luckAnalysis.unluckiest"
          :key="team.teamName"
        >
          <h3 class="mb-2 text-xl font-semibold dark:text-gray-200">
            {{ team.teamName }}
          </h3>
          <div class="flex mb-3 text-center justify-evenly">
            <div>
              <p class="text-gray-600 dark:text-gray-300">Wins</p>
              <p class="font-semibold dark:text-gray-200 text-2xl">
                {{ team.actualWins }}
              </p>
            </div>
            <div class="w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>
            <div>
              <p class="text-gray-600 dark:text-gray-300">Expected</p>
              <p class="font-semibold dark:text-gray-200 text-2xl">
                {{ team.expectedWins.toFixed(2) }}
              </p>
            </div>
            <div class="w-px bg-gray-200 dark:bg-gray-700 mx-4"></div>
            <div>
              <p class="text-gray-600 dark:text-gray-300">Luck</p>
              <p class="font-semibold text-red-500 text-2xl">
                {{ team.luckDiff.toFixed(2) }}
              </p>
            </div>
          </div>
          <h4
            v-if="team.unluckyWeeks.length > 0"
            class="my-2 text-gray-600 dark:text-gray-300"
          >
            Key Matchups
          </h4>
          <ul>
            <li
              v-for="week in team.unluckyWeeks"
              :key="week.week"
              class="p-2.5 mb-2 bg-gray-50 rounded dark:bg-gray-700 dark:text-gray-200"
            >
              <p class="font-semibold">Week {{ week.week }}</p>
              <p>
                Won with
                <span class="font-semibold">{{ week.points }}</span> pts ({{
                  week.rankText
                }}) vs {{ week.opponentName }}
              </p>
            </li>
          </ul>
          <div v-if="team.unluckyWeeks.length === 0">
            <p class="text-gray-800 dark:text-gray-200">
              <b>{{ team.teamName }}</b> did not have any individual weeks where
              they lost with a particularly high score. Their bad luck came from
              facing opponents with above average scores.
            </p>
          </div>
        </div>
      </div>
    </div>
    <hr class="h-px mt-1 mb-4 bg-gray-200 border-0 dark:bg-gray-700" />
    <h2 class="mb-4 text-xl font-bold dark:text-gray-50">
      Best/Worst Possible Records
    </h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 dark:text-gray-300">
      <div
        v-for="team in scheduleAnalysis"
        :key="team.teamName"
        class="px-4 py-3 border rounded-lg shadow dark:shadow-gray-600 dark:border-gray-600"
      >
        <h3 class="mb-2 text-xl font-semibold dark:text-gray-200">
          {{ team.teamName }}
        </h3>
        <p>
          Actual Record:
          <span class="font-semibold"
            >{{ team.actualWins }}-{{ 10 - team.actualWins }}</span
          >
        </p>
        <p>
          Best Possible:
          <span class="font-semibold text-green-500"
            >{{ team.bestPossibleRecord }}-{{
              10 - team.bestPossibleRecord
            }}</span
          >
          (with {{ team.bestScheduleTeam }}'s schedule)
        </p>
        <p>
          Worst Possible:
          <span class="font-semibold text-red-500"
            >{{ team.worstPossibleRecord }}-{{
              10 - team.worstPossibleRecord
            }}</span
          >
          (with {{ team.worstScheduleTeam }}'s schedule)
        </p>
      </div>
    </div>
  </div>
</template>
<style scoped></style>
