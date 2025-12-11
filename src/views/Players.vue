<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import {
  getPlayerWeeklyFantasyStats,
  getStats,
  getCurrentLeagueState,
  searchPlayers,
  getRosters,
} from "../api/api";
import { useStore } from "../store/store";
import { useRoute } from "vue-router";

type PlayerResult = {
  id: string;
  name: string;
  position: string;
  team?: string;
  points?: number;
};

const store = useStore();
const route = useRoute();

const query = ref("");
const selectedPlayer = ref<PlayerResult | null>(null);
const suggestions = ref<PlayerResult[]>([]);
const defaultSuggestions = ref<PlayerResult[]>([]);
const suggestionLoading = ref(false);
const defaultSuggestionsLoading = ref(false);
const inputFocused = ref(false);
const rosterFilter = ref<string>("");
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
const allowedPositions = ["QB", "RB", "WR", "TE", "K", "DEF"];
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const scoringType = computed(() => {
  if (store.currentLeagueId && store.leagueInfo[store.currentLeagueIndex]) {
    return store.leagueInfo[store.currentLeagueIndex].scoringType ?? 1;
  }
  return 1;
});

const headerSubtitle = computed(() => {
  if (!selectedPlayer.value) return "";
  const pos = selectedPlayer.value.position || "";
  return `${pos} • ${seasonYear.value} regular season`;
});

const rosterOptions = computed(() => {
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (!currentLeague?.rosters?.length) return [];
  return currentLeague.rosters.map((roster: any) => {
    const user = (currentLeague.users || []).find(
      (u: any) => u?.id === roster.id
    );
    return {
      value: String(roster.rosterId),
      label: user?.name || user?.username || `Roster ${roster.rosterId}`,
      players: roster.players || [],
    };
  });
});

const isLoadingSuggestions = computed(
  () => suggestionLoading.value || defaultSuggestionsLoading.value
);

const visibleSuggestions = computed(() => {
  if (selectedPlayer.value && !rosterFilter.value) return [];
  const trimmed = query.value.trim();
  let list: PlayerResult[] = [];
  if (trimmed.length >= 2) {
    list = suggestions.value;
  } else if (!trimmed) {
    list = defaultSuggestions.value;
  }
  if (selectedPlayer.value && rosterFilter.value) {
    list = list.filter((p) => p.id !== selectedPlayer.value?.id);
  }
  return list;
});

const usingDefaultSuggestions = computed(
  () => !query.value.trim() && defaultSuggestions.value.length > 0
);

const suggestionTitle = computed(() => {
  if (query.value.trim().length >= 2) return "Suggestions";
  if (rosterFilter.value) {
    const option = rosterOptions.value.find(
      (opt) => opt.value === rosterFilter.value
    );
    return option ? `Roster: ${option.label}` : "Roster suggestions";
  }
  return "Top scorers";
});

const isRosterSuggestions = computed(() => Boolean(rosterFilter.value));

const showClearButton = computed(
  () => Boolean(selectedPlayer.value || query.value.trim() || rosterFilter.value)
);

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

const setPlayerFromStats = async (player: PlayerResult) => {
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
    if (!seasonStats && weeklyStats.length === 0) {
      errorMessage.value = "No stats available for this player.";
    }
    const displayName = seasonStats
      ? `${seasonStats.firstName} ${seasonStats.lastName}`.trim()
      : player.name;
    const displayTeam = seasonStats?.team || player.team;
    const displayPos = seasonStats?.position || player.position;
    selectedPlayer.value = {
      id: player.id,
      name: displayName || player.name,
      position: displayPos || "",
      team: displayTeam,
    };
    seasonLine.value = {
      points: seasonStats?.points,
      ppg: seasonStats?.ppg ? Number(seasonStats.ppg.toFixed(2)) : undefined,
      rank: seasonStats?.rank,
      overallRank: seasonStats?.overallRank,
      team: displayTeam,
      position: displayPos,
      gp: seasonStats?.gp,
      name: displayName,
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

const loadPlayer = async (player: PlayerResult) => {
  await setPlayerFromStats(player);
  if (player.name) {
    query.value = player.name;
  }
  rosterFilter.value = "";
};

const loadPlayerById = async (playerId: string) => {
  if (!playerId) return;
  await setPlayerFromStats({
    id: playerId,
    name: "",
    position: "",
    team: "",
  });
};

const updateSuggestions = async (
  term: string,
  { showErrors }: { showErrors?: boolean } = {}
) => {
  const trimmed = term.trim();
  errorMessage.value = "";
  if (!trimmed) {
    suggestions.value = [];
    return;
  }
  if (trimmed.length < 2) {
    suggestions.value = [];
    if (showErrors) {
      errorMessage.value = "Enter at least 2 characters.";
    }
    return;
  }
  suggestionLoading.value = true;
  try {
    const results = await searchPlayers(trimmed);
    suggestions.value = results;
    if (showErrors && results.length === 0) {
      errorMessage.value = "No players found. Try a different name.";
    }
  } catch (err) {
    console.error("Error searching players:", err);
    if (showErrors) {
      errorMessage.value = "Unable to search players right now.";
    }
  } finally {
    suggestionLoading.value = false;
  }
};

const search = async () => {
  await updateSuggestions(query.value, { showErrors: true });
};

const handleBlur = () => {
  // Delay to allow clicks on suggestion list before hiding
  setTimeout(() => {
    inputFocused.value = false;
  }, 120);
};

const buildTopSuggestionsFromIds = async (playerIds: string[]) => {
  if (playerIds.length === 0) return [];
  const unique = Array.from(new Set(playerIds)).slice(0, 200);
  const stats = await Promise.all(
    unique.map((id) => getStats(id, seasonYear.value, scoringType.value))
  );
  const topPlayers = stats
    .map((stat, idx) => {
      if (!stat) return null;
      const position = stat.position || "";
      if (!allowedPositions.includes(position)) return null;
      const name = `${stat.firstName || ""} ${stat.lastName || ""}`.trim();
      return {
        id: stat.id || unique[idx],
        name: name || "Unknown Player",
        position,
        team: stat.team || "FA",
        points: stat.points ?? 0,
      };
    })
    .filter(Boolean) as PlayerResult[];
  const sorted = topPlayers
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 10);
  return sorted;
};

const collectPlayerPool = async () => {
  const ids = new Set<string>();
  const currentLeague = store.leagueInfo[store.currentLeagueIndex];
  if (currentLeague?.rosters?.length) {
    currentLeague.rosters.forEach((roster: any) => {
      (roster.players || []).forEach((playerId: string) => ids.add(playerId));
    });
  }
  if (ids.size === 0 && import.meta.env.VITE_DEFAULT_LEAGUE_ID) {
    try {
      const fallbackRosters = await getRosters(
        import.meta.env.VITE_DEFAULT_LEAGUE_ID
      );
      fallbackRosters.forEach((roster: any) => {
        (roster.players || []).forEach((playerId: string) => ids.add(playerId));
      });
    } catch (error) {
      console.warn("Unable to fetch fallback rosters for suggestions", error);
    }
  }
  return Array.from(ids);
};

const loadDefaultSuggestions = async () => {
  defaultSuggestionsLoading.value = true;
  try {
    const playerIds = await collectPlayerPool();
    if (playerIds.length === 0) {
      defaultSuggestions.value = [];
      return;
    }
    defaultSuggestions.value = await buildTopSuggestionsFromIds(playerIds);
    if (!query.value.trim()) {
      suggestions.value = [];
    }
  } catch (error) {
    console.error("Unable to load default player suggestions", error);
  } finally {
    defaultSuggestionsLoading.value = false;
  }
};

const loadRosterSuggestions = async (rosterId: string) => {
  if (!rosterId) return;
  defaultSuggestionsLoading.value = true;
  try {
    const players =
      rosterOptions.value.find((opt) => opt.value === rosterId)?.players || [];
    defaultSuggestions.value = await buildTopSuggestionsFromIds(players);
    if (!query.value.trim()) {
      suggestions.value = [];
    }
  } catch (error) {
    console.error("Unable to load roster suggestions", error);
  } finally {
    defaultSuggestionsLoading.value = false;
  }
};

onMounted(async () => {
  await fetchSeasonYear();
  const playerId = Array.isArray(route.query.playerId)
    ? route.query.playerId[0]
    : route.query.playerId;
  if (playerId) {
    await loadPlayerById(playerId);
  } else {
    await loadDefaultSuggestions();
  }
});

watch(
  () => route.query.playerId,
  async (newId) => {
    const playerId = Array.isArray(newId) ? newId[0] : newId;
    if (playerId) {
      await loadPlayerById(playerId);
    }
  }
);

watch(
  () => store.currentLeagueId,
  async () => {
    await fetchSeasonYear();
    await loadDefaultSuggestions();
  }
);

watch(
  () => query.value,
  (newQuery) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      updateSuggestions(newQuery);
    }, 200);
  }
);

const resetView = async () => {
  selectedPlayer.value = null;
  seasonLine.value = {};
  weeklyRows.value = [];
  query.value = "";
  rosterFilter.value = "";
  errorMessage.value = "";
  await loadDefaultSuggestions();
};

const handleRosterSelect = async () => {
  if (rosterFilter.value) {
    await loadRosterSuggestions(rosterFilter.value);
  } else {
    await loadDefaultSuggestions();
  }
};

watch(
  () => rosterFilter.value,
  async () => {
    await handleRosterSelect();
  }
);
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
          Search for any player to view their fantasy production.
        </h1>
        <p class="mt-2 text-sm text-blue-100">
          {{ headerSubtitle }}
        </p>
        <div class="flex flex-col mt-6 sm:flex-row sm:items-center">
          <div class="flex-1">
            <input
              v-model="query"
              @keydown.enter.prevent="search"
              @focus="inputFocused = true"
              @blur="handleBlur"
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
        <div
          class="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap gap-2">
            <button
              v-if="showClearButton"
              @click="resetView"
              class="px-4 py-2 text-xs font-semibold text-blue-900 bg-white rounded-lg shadow-sm hover:bg-blue-50 focus:ring-2 focus:ring-blue-300"
            >
              Reset
            </button>
          </div>
          <div
            v-if="rosterOptions.length"
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <span class="text-xs font-semibold uppercase text-blue-100">
              View player suggestions by roster
            </span>
            <div class="flex items-center gap-2">
              <select
                v-model="rosterFilter"
                class="px-3 py-2 text-sm text-gray-900 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">All rosters (top scorers)</option>
                <option v-for="opt in rosterOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <p v-if="errorMessage" class="mt-2 text-sm text-red-100">
          {{ errorMessage }}
        </p>
        <p v-if="visibleSuggestions.length" class="mt-3 text-sm font-semibold text-blue-100">
          Suggested players
        </p>
        <div
          v-if="isLoadingSuggestions && (!selectedPlayer || inputFocused)"
          class="flex items-center gap-2 mt-3 text-sm text-blue-100"
        >
          <span class="h-2 w-2 rounded-full bg-blue-200 animate-pulse"></span>
          Fetching suggestions...
        </div>
        <div
          v-if="visibleSuggestions.length"
          class="relative z-10 mt-4 overflow-hidden bg-white border border-blue-100 rounded-lg shadow-lg"
        >
          <div
            class="flex items-center justify-between px-4 py-2 text-xs font-semibold tracking-wide uppercase text-gray-500 bg-gray-50"
          >
            <span>
              {{ suggestionTitle }}
            </span>
            <span v-if="isRosterSuggestions" class="text-gray-400">
              Roster-specific suggestions
            </span>
          </div>
          <ul class="divide-y divide-gray-100">
            <li
              v-for="player in visibleSuggestions"
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
                  v-if="player.points !== undefined"
                  class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full"
                >
                  {{ Number(player.points).toFixed(1) }} pts
                </span>
                <span
                  v-else
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
