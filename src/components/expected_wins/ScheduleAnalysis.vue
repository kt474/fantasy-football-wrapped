<script setup lang="ts">
import { computed } from "vue";
import { TableDataType } from "../../types/types";
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
        : 14);
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
      for (
        let week = 0;
        week <
        (store.leagueInfo.length > 0
          ? store.leagueInfo[store.currentLeagueIndex].lastScoredWeek
          : 14);
        week++
      ) {
        const opponentId = otherTeam.matchups[week];
        const opponent = teams.find(
          (t) => t.matchups[week] === opponentId && t !== otherTeam
        );

        if (!opponent) continue;

        // Would this team have won with their points against this opponent?
        if (team.points[week] > opponent.points[week]) {
          winsWithThisSchedule++;
        } else if (team.points[week] === opponent.points[week]) {
          if (team.points[week] > otherTeam.points[week]) {
            winsWithThisSchedule++;
          }
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
      expectedWins: team.expectedWins,
      bestPossibleRecord: bestRecord,
      worstPossibleRecord: worstRecord,
      bestScheduleTeam,
      worstScheduleTeam,
      recordRange: bestRecord - worstRecord,
    };
  });
});

// Helper function for ordinal suffix
const getRankSuffix = (rank: number) => {
  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

// Returns a css value like "53%" for position of a dot
const getDotPosition = (value: number, min: number, max: number) => {
  if (max === min) return "50%"; // Prevent divide by zero
  const marginPercent = 4; // Change this for more/less side margin
  const percent =
    marginPercent + ((value - min) / (max - min)) * (100 - 2 * marginPercent);
  // Clamp between 0 and 100 just in case
  return `${Math.max(0, Math.min(100, percent))}%`;
};
</script>
<template>
  <div
    class="w-full p-4 mt-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6"
  >
    <h1
      class="pb-2 mb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
    >
      Luckiest/Unluckiest Teams
    </h1>
    <p
      class="max-w-3xl mb-4 text-sm text-gray-600 sm:text-base dark:text-gray-300"
    >
      Highlighting the specific weeks teams had lucky/unlucky matchups.
    </p>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div
        class="flex flex-col px-4 py-3 border rounded-lg shadow dark:shadow-gray-600 dark:border-gray-600"
        v-for="team in luckAnalysis.luckiest"
        :key="team.teamName"
      >
        <h3 class="mb-3 text-xl font-semibold dark:text-gray-200">
          {{ team.teamName }}
        </h3>
        <div class="flex mb-3 text-center justify-evenly">
          <div>
            <p class="text-gray-600 dark:text-gray-300">Wins</p>
            <p class="text-2xl font-semibold dark:text-gray-200">
              {{ team.actualWins }}
            </p>
          </div>
          <div class="w-px mx-4 bg-gray-200 dark:bg-gray-700"></div>
          <div>
            <p class="text-gray-600 dark:text-gray-300">Expected</p>
            <p class="text-2xl font-semibold dark:text-gray-200">
              {{ team.expectedWins.toFixed(2) }}
            </p>
          </div>
          <div class="w-px mx-4 bg-gray-200 dark:bg-gray-700"></div>
          <div>
            <p class="text-gray-600 dark:text-gray-300">Luck</p>
            <p class="text-2xl font-semibold text-green-500">
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
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Won with
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                week.points
              }}</span>
              pts ({{ week.rankText }}) vs {{ week.opponentName }}
            </p>
          </li>
        </ul>
        <div v-if="team.luckyWeeks.length === 0">
          <p class="text-gray-800 dark:text-gray-200">
            <b>{{ team.teamName }}</b> did not have any individual weeks where
            they won with a particularly low score. Their luck came from facing
            opponents with below average scores.
          </p>
        </div>
      </div>
      <div
        class="flex flex-col px-4 py-3 border rounded-lg shadow dark:shadow-gray-600 dark:border-gray-600"
        v-for="team in luckAnalysis.unluckiest"
        :key="team.teamName"
      >
        <h3 class="mb-3 text-xl font-semibold dark:text-gray-200">
          {{ team.teamName }}
        </h3>
        <div class="flex mb-3 text-center justify-evenly">
          <div>
            <p class="text-gray-600 dark:text-gray-300">Wins</p>
            <p class="text-2xl font-semibold dark:text-gray-200">
              {{ team.actualWins }}
            </p>
          </div>
          <div class="w-px mx-4 bg-gray-200 dark:bg-gray-700"></div>
          <div>
            <p class="text-gray-600 dark:text-gray-300">Expected</p>
            <p class="text-2xl font-semibold dark:text-gray-200">
              {{ team.expectedWins.toFixed(2) }}
            </p>
          </div>
          <div class="w-px mx-4 bg-gray-200 dark:bg-gray-700"></div>
          <div>
            <p class="text-gray-600 dark:text-gray-300">Luck</p>
            <p class="text-2xl font-semibold text-red-500">
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
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Lost with
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                week.points
              }}</span>
              pts ({{ week.rankText }}) vs {{ week.opponentName }}
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
  <div
    class="w-full p-4 mt-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-6"
  >
    <h1
      class="pb-2 mb-2 text-3xl font-bold leading-none text-gray-900 dark:text-gray-50"
    >
      Schedule Analysis
    </h1>
    <p
      class="max-w-3xl mb-4 text-sm text-gray-600 sm:text-base dark:text-gray-300"
    >
      Actual record, expected number of wins, and best/worst possible records
      (team names in parentheses indicate the teams with the schedule that would
      achieve those records).
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 dark:text-gray-300">
      <div
        v-for="team in scheduleAnalysis"
        :key="team.teamName"
        class="px-4 py-3 border rounded-lg shadow dark:shadow-gray-600 dark:border-gray-600"
      >
        <h3 class="mb-2 text-xl font-semibold dark:text-gray-200">
          {{ team.teamName }}
        </h3>
        <div class="relative w-full h-10 mt-4">
          <div
            class="absolute left-0 right-0 h-4 mx-3 bg-gray-100 rounded-lg dark:bg-gray-700"
          ></div>
          <div
            v-for="dot in [
              {
                key: 'worst',
                color: 'bg-red-500',
                label: 'Worst',
                value: team.worstPossibleRecord,
              },
              {
                key: 'actual',
                color: 'bg-gray-900 p-2 border-fuchsia-300 dark:bg-gray-200',
                label: 'Actual',
                value: team.actualWins,
              },
              {
                key: 'best',
                color: 'bg-green-500',
                label: 'Best',
                value: team.bestPossibleRecord,
              },
              {
                key: 'expected',
                color: 'bg-blue-500',
                label: 'Expected',
                value: team.expectedWins,
              },
            ]"
            :key="dot.key"
            class="absolute flex flex-col items-center"
            :style="{
              left: getDotPosition(
                dot.value,
                team.worstPossibleRecord,
                team.bestPossibleRecord
              ),
              top: '20%',
              transform: 'translate(-50%, -50%)',
            }"
          >
            <div
              :class="[
                'w-4 h-4 rounded-full border-2 border-white shadow',
                dot.color,
              ]"
            ></div>
          </div>
        </div>
        <div class="flex justify-between text-center">
          <div class="flex-1">
            <p class="text-gray-600 dark:text-gray-300">Actual</p>
            <p class="text-xl font-semibold">
              {{ team.actualWins }}-{{
                (store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
                  ? store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
                  : 14) - team.actualWins
              }}
            </p>
          </div>
          <div class="flex-1">
            <p class="text-gray-600 dark:text-gray-300">Exp. Wins</p>
            <p class="text-xl font-semibold text-blue-500">
              {{ team.expectedWins.toFixed(2) }}
            </p>
          </div>
          <div class="flex-1">
            <p class="text-gray-600 dark:text-gray-300">Best</p>
            <p class="text-xl font-semibold text-green-500">
              {{ team.bestPossibleRecord }}-{{
                (store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
                  ? store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
                  : 14) - team.bestPossibleRecord
              }}
            </p>
            <p class="mt-1 text-xs">({{ team.bestScheduleTeam }})</p>
          </div>
          <div class="flex-1">
            <p class="text-gray-600 dark:text-gray-300">Worst</p>
            <p class="text-xl font-semibold text-red-500">
              {{ team.worstPossibleRecord }}-{{
                (store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
                  ? store.leagueInfo[store.currentLeagueIndex]?.lastScoredWeek
                  : 14) - team.worstPossibleRecord
              }}
            </p>
            <p class="mt-1 text-xs">({{ team.worstScheduleTeam }})</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
