<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import {
  getPlayerWeeklyFantasyStats,
  getStats,
  getCurrentLeagueState,
  searchPlayers,
} from "../api/api";
import { useStore } from "../store/store";

type PlayerResult = {
  id: string;
  name: string;
  position: string;
  team?: string;
};

const store = useStore();

const query = ref("");
const selectedPlayer = ref<PlayerResult | null>(null);
const suggestions = ref<PlayerResult[]>([]);
const loading = ref(false);
const weeklyLoading = ref(false);
const errorMessage = ref("");
const seasonYear = ref<string>("2025");
const weeklyRows = ref<
  { week: number; points: number; opponent: string; rank: number; snaps: number }[]
>([]);
const seasonLine = ref<{
  points?: number;
  ppg?: number;
  rank?: number;
  overallRank?: number;
  team?: string;
  position?: string;
  gp?: number;
  name?: string;
}>({});

const scoringType = computed(() => {
  if (store.currentLeagueId && store.leagueInfo[store.currentLeagueIndex]) {
    return store.leagueInfo[store.currentLeagueIndex].scoringType ?? 1;
  }
  return 1;
});

const headerSubtitle = computed(() => {
  if (!selectedPlayer.value) return "Search any NFL player for fantasy production.";
  const pos = selectedPlayer.value.position || "";
  return `${pos} • ${seasonYear.value} regular season`;
});

const fetchSeasonYear = async () => {
  if (store.currentLeagueId && store.leagueInfo[store.currentLeagueIndex]) {
    seasonYear.value = store.leagueInfo[store.currentLeagueIndex].season;
    return;
  }
  const state = await getCurrentLeagueState();
  if (state?.season) {
    seasonYear.value = state.season;
  }
};

const loadPlayer = async (player: PlayerResult) => {
  selectedPlayer.value = player;
  suggestions.value = [];
  errorMessage.value = "";
  loading.value = true;
  weeklyLoading.value = true;
  try {
    const [seasonStats, weeklyStats] = await Promise.all([
      getStats(player.id, seasonYear.value, scoringType.value),
      getPlayerWeeklyFantasyStats(player.id, seasonYear.value, scoringType.value),
    ]);
    seasonLine.value = {
      points: seasonStats?.points,
      ppg: seasonStats?.ppg ? Number(seasonStats.ppg.toFixed(2)) : undefined,
      rank: seasonStats?.rank,
      overallRank: seasonStats?.overallRank,
      team: seasonStats?.team || player.team,
      position: seasonStats?.position || player.position,
      gp: seasonStats?.gp,
      name: seasonStats
        ? `${seasonStats.firstName} ${seasonStats.lastName}`.trim()
        : player.name,
    };
    weeklyRows.value = weeklyStats;
  } catch (error) {
    console.error(error);
    errorMessage.value = "Unable to fetch player data right now.";
    weeklyRows.value = [];
    seasonLine.value = {};
  } finally {
    loading.value = false;
    weeklyLoading.value = false;
  }
};

const search = async () => {
  errorMessage.value = "";
  suggestions.value = [];
  if (!query.value || query.value.length < 2) {
    errorMessage.value = "Enter at least 2 characters.";
    return;
  }
  loading.value = true;
  const results = await searchPlayers(query.value);
  loading.value = false;
  if (results.length === 0) {
    errorMessage.value = "No players found. Try a different name.";
  } else {
    suggestions.value = results;
  }
};

onMounted(async () => {
  await fetchSeasonYear();
});
</script>

<template>
  <div class="container w-11/12 max-w-screen-xl mx-auto">
    <div
      class="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 text-gray-50 shadow-lg"
    >
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_rgba(255,255,255,0.2)_1px,_transparent_1px)] bg-[size:30px_30px]"></div>
      <div class="relative px-6 py-8 sm:px-10 sm:py-10">
        <p class="text-xs uppercase tracking-[0.3em] text-blue-100">
          Player Explorer
        </p>
        <h1 class="mt-2 text-2xl font-semibold sm:text-3xl">
          Fantasy stats at your fingertips
        </h1>
        <p class="mt-2 text-sm text-blue-100">
          {{ headerSubtitle }}
        </p>
        <div class="flex flex-col mt-6 sm:flex-row sm:items-center">
          <div class="flex-1">
            <input
              v-model="query"
              @keydown.enter.prevent="search"
              type="text"
              placeholder="Search by player name (e.g., 'Ja'Marr Chase')"
              class="w-full px-4 py-3 text-gray-900 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
          <button
            @click="search"
            class="flex items-center justify-center px-4 py-3 mt-3 text-sm font-semibold text-blue-900 bg-white rounded-lg shadow-sm sm:mt-0 sm:ml-3 hover:bg-blue-50 focus:ring-2 focus:ring-blue-300"
          >
            Search
          </button>
        </div>
        <p v-if="errorMessage" class="mt-2 text-sm text-red-100">
          {{ errorMessage }}
        </p>
        <div
          v-if="suggestions.length"
          class="relative z-10 mt-4 overflow-hidden bg-white border border-blue-100 rounded-lg shadow-lg"
        >
          <ul class="divide-y divide-gray-100">
            <li
              v-for="player in suggestions"
              :key="player.id"
              @click="loadPlayer(player)"
              class="px-4 py-3 cursor-pointer hover:bg-blue-50"
            >
              <div class="flex items-center justify-between text-gray-900">
                <div>
                  <p class="font-semibold">
                    {{ player.name || "Unknown Player" }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ player.position }} • {{ player.team || "FA" }}
                  </p>
                </div>
                <span
                  class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full"
                >
                  Select
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="selectedPlayer" class="mt-6 space-y-4">
      <div
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr"
      >
        <div
          class="flex flex-col justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Season points
          </p>
          <p class="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {{ seasonLine.points ?? "—" }}
          </p>
          <p class="text-sm text-gray-500">Total fantasy points</p>
        </div>
        <div
          class="flex flex-col justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Points per game
          </p>
          <p class="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {{ seasonLine.ppg ?? "—" }}
          </p>
          <p class="text-sm text-gray-500">Based on games played</p>
        </div>
        <div
          class="flex flex-col justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Positional rank
          </p>
          <p class="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {{ seasonLine.rank ?? "—" }}
          </p>
          <p class="text-sm text-gray-500">
            {{ seasonLine.position || selectedPlayer.position }}
          </p>
        </div>
        <div
          class="flex flex-col justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Team / Games
          </p>
          <p class="mt-2 text-xl font-bold text-blue-700 dark:text-blue-400">
            {{ seasonLine.team || selectedPlayer.team || "FA" }}
          </p>
          <p class="text-sm text-gray-500">GP: {{ seasonLine.gp ?? "—" }}</p>
        </div>
      </div>

      <div
        class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        >
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Weekly breakdown
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              Points by week ({{ seasonLine.position || selectedPlayer.position
              }})
            </p>
          </div>
          <div
            class="px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200"
          >
            {{ weeklyRows.length }} weeks
          </div>
        </div>
        <div v-if="weeklyLoading" class="p-6 text-sm text-gray-500">
          Loading weekly stats...
        </div>
        <div v-else-if="weeklyRows.length === 0" class="p-6 text-sm text-gray-500">
          No weekly stats available for this player.
        </div>
        <div v-else class="overflow-x-auto">
          <table
            class="w-full text-sm text-left text-gray-600 rtl:text-right dark:text-gray-200"
          >
            <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  Week
                </th>
                <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  Opponent
                </th>
                <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  Points
                </th>
                <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  Pos Rank
                </th>
                <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  Snaps
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in weeklyRows"
                :key="row.week"
                class="border-b odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 dark:border-gray-700"
              >
                <td class="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">
                  {{ row.week }}
                </td>
                <td class="px-4 py-3">{{ row.opponent || "—" }}</td>
                <td class="px-4 py-3 text-blue-700 dark:text-blue-300 font-semibold">
                  {{ row.points }}
                </td>
                <td class="px-4 py-3">{{ row.rank ?? "—" }}</td>
                <td class="px-4 py-3">{{ row.snaps ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
