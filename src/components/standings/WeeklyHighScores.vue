<script setup lang="ts">
import { computed } from "vue";
import { TableDataType } from "../../api/types";
import { useStore } from "../../store/store";

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();

const weeksPlayed = computed(() => {
  if (!props.tableData || props.tableData.length === 0) return 0;
  return Math.max(
    ...props.tableData.map((team) => (team.points ? team.points.length : 0))
  );
});

const weeklyLeaders = computed(() => {
  const leaders: {
    week: number;
    points: number;
    team: TableDataType;
  }[] = [];
  for (let weekIndex = 0; weekIndex < weeksPlayed.value; weekIndex++) {
    let bestTeam: TableDataType | undefined;
    let bestScore = -Infinity;
    props.tableData.forEach((team) => {
      const score = team.points?.[weekIndex];
      if (score !== undefined && score !== null && score > bestScore) {
        bestScore = score;
        bestTeam = team;
      }
    });
    if (bestTeam && isFinite(bestScore)) {
      leaders.push({
        week: weekIndex + 1,
        points: Number(bestScore.toFixed(2)),
        team: bestTeam,
      });
    }
  }
  return leaders;
});

const formatTeamName = (team: TableDataType) => {
  if (store.showUsernames) {
    return team.username ? team.username : team.name || "Ghost Roster";
  }
  return team.name ? team.name : team.username || "Ghost Roster";
};
</script>

<template>
  <div
    class="w-full overflow-hidden bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-900 dark:border-gray-700"
  >
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:border-gray-700 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
    >
      <div>
        <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">
          Weekly Fireworks
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-300">
          Highest starter score each week
        </p>
      </div>
      <span
        class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200"
      >
        Weeks {{ weeksPlayed || 0 }}
      </span>
    </div>
    <div v-if="weeklyLeaders.length > 0" class="overflow-x-auto">
      <table
        class="w-full text-sm text-left text-gray-600 rtl:text-right dark:text-gray-200"
      >
        <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
              Week
            </th>
            <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
              Team
            </th>
            <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="leader in weeklyLeaders"
            :key="leader.week"
            class="border-b odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 dark:border-gray-700"
          >
            <td class="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">
              {{ leader.week }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center">
                <img
                  v-if="leader.team.avatarImg"
                  :src="leader.team.avatarImg"
                  alt="Avatar"
                  class="w-8 h-8 rounded-full"
                />
                <svg
                  v-else
                  class="w-8 h-8 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <div class="ml-3">
                  <p class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatTeamName(leader.team) }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Roster #{{ leader.team.rosterId }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-blue-700 dark:text-blue-400 font-semibold">
              {{ leader.points }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-else
      class="px-4 py-6 text-sm text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
    >
      Weekly scores will appear here once games are played.
    </div>
  </div>
</template>
