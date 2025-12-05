<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useStore } from "../store/store";
import { getDefaultLeagueId, loadStatsData } from "../api/statsPage";
import { clearSleeperCache, clearSleeperPersistentCache } from "../api/sleeperClient";
import type {
  TeamPlayerContribution,
  TeamRecordRow,
  PlayerAggregateRow,
  PlayerWeeklyStat,
} from "../types/types";

type TabKey = "season" | "draft" | "players";
type PositionKey = "QB" | "RB" | "WR" | "TE" | "DEF";

const store = useStore();
const activeTab = ref<TabKey>("season");
const loading = ref(true);
const error = ref("");
const leagueName = ref("");
const season = ref("");
const lastWeek = ref(0);
const weeksLoaded = ref<number[]>([]);
const rosters = ref<TeamRecordRow[]>([]);
const contributions = ref<TeamPlayerContribution[]>([]);
const playerRows = ref<PlayerAggregateRow[]>([]);
const playerWeekly = ref<Map<string, PlayerWeeklyStat[]>>(new Map());

const filters = reactive({
  startWeek: 1,
  endWeek: 0,
  starterOnly: true,
  position: "ALL" as "ALL" | PositionKey,
  draftRounds: [] as (number | "ud")[],
  playerSearch: "",
  ownerId: "ALL" as string | "ALL",
});

const seasonSortKey = ref<PositionKey>("QB");
const seasonSortDir = ref<"asc" | "desc">("asc");
const draftSortKey = ref<"total" | "avg" | "team">("total");
const draftSortDir = ref<"asc" | "desc">("desc");
const openSeasonRows = ref<number[]>([]);
const openDraftRows = ref<number[]>([]);
const openPlayerRows = ref<string[]>([]);
const showDraftRounds = ref(false);
const showPlayerRounds = ref(false);

const leagueId = computed(
  () => store.currentLeagueId || getDefaultLeagueId()
);

const availableDraftRounds = computed(() => {
  const set = new Set<number | null>();
  contributions.value.forEach((c) => {
    set.add(c.draftRound);
  });
  const sorted = Array.from(set).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });
  return sorted;
});

const ensureRoundsSelected = () => {
  if (filters.draftRounds.length === 0) {
    filters.draftRounds = availableDraftRounds.value.map((r) =>
      r === null ? "ud" : r
    );
  }
};

const ownerOptions = computed(() => {
  const opts = rosters.value.map((r) => ({
    value: r.ownerId,
    label: r.ownerName,
  }));
  return [{ value: "ALL", label: "All Teams" }, ...opts];
});

const loadData = async () => {
  loading.value = true;
  error.value = "";
  try {
    const fallbackEnd = filters.endWeek || lastWeek.value || 14;
    const data = await loadStatsData({
      leagueId: leagueId.value,
      startWeek: filters.startWeek,
      endWeek: fallbackEnd,
    });
    leagueName.value = data.league.name;
    season.value = data.league.season;
    lastWeek.value = data.league.lastScoredWeek;
    weeksLoaded.value = data.weeks;
    rosters.value = data.rosters;
    contributions.value = data.contributions;
    playerRows.value = data.playerRows;
    playerWeekly.value = data.playerWeekly;
    if (!filters.endWeek || filters.endWeek > data.league.lastScoredWeek) {
      filters.endWeek = data.league.lastScoredWeek;
    }
    ensureRoundsSelected();
  } catch (e) {
    console.error(e);
    error.value = "Unable to load stats right now.";
  } finally {
    loading.value = false;
  }
};

const formatRound = (round: number | null | undefined) => {
  if (round === null || round === undefined) return "UD";
  return `R${round}`;
};

const pointsFor = (row: TeamPlayerContribution) =>
  filters.starterOnly ? row.startedPoints : row.totalPoints;

const gamesFor = (row: TeamPlayerContribution) =>
  filters.starterOnly ? row.startedGames : row.totalGames;

const positionList: PositionKey[] = ["QB", "RB", "WR", "TE", "DEF"];

const seasonRows = computed(() => {
  const base = rosters.value.map((r) => ({
    rosterId: r.rosterId,
    ownerName: r.ownerName,
    record: `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}`,
    ranks: {} as Record<
      PositionKey,
      { total: number; rank: number; topPlayers: TeamPlayerContribution[] }
    >,
  }));

  positionList.forEach((pos) => {
    const totals = base.map((row) => {
      const playerRows = contributions.value.filter(
        (c) => c.rosterId === row.rosterId && c.position === pos
      );
      const sum = playerRows.reduce((acc, c) => acc + pointsFor(c), 0);
      row.ranks[pos] = {
        total: sum,
        rank: 0,
        topPlayers: playerRows
          .sort((a, b) => pointsFor(b) - pointsFor(a))
          .slice(0, 4),
      };
      return { rosterId: row.rosterId, total: sum };
    });
    const sorted = [...totals].sort((a, b) => b.total - a.total);
    sorted.forEach((item, index) => {
      const target = base.find((r) => r.rosterId === item.rosterId);
      if (target) {
        target.ranks[pos].rank = index + 1;
      }
    });
  });

  const sortedRows = [...base].sort((a, b) => {
    const key = seasonSortKey.value;
    const diff = a.ranks[key].rank - b.ranks[key].rank;
    return seasonSortDir.value === "asc" ? diff : -diff;
  });
  return sortedRows;
});

const draftRows = computed(() => {
  const allowedPositions =
    filters.position === "ALL" ? positionList : [filters.position];
  const selectedRounds = new Set(filters.draftRounds);
  const rows = rosters.value.map((r) => {
    const matches = contributions.value.filter((c) => {
      const roundKey = c.draftRound === null ? "ud" : c.draftRound;
      return (
        allowedPositions.includes(c.position as PositionKey) &&
        selectedRounds.has(roundKey as any)
      );
    });
    const teamPlayers = matches.filter((m) => m.rosterId === r.rosterId);
    const total = teamPlayers.reduce((acc, c) => acc + pointsFor(c), 0);
    const avg =
      weeksLoaded.value.length > 0
        ? total / weeksLoaded.value.length
        : total;
    return {
      rosterId: r.rosterId,
      ownerName: r.ownerName,
      total,
      avg,
      players: teamPlayers
        .map((c) => ({
          ...c,
          ppg: gamesFor(c) ? pointsFor(c) / gamesFor(c) : pointsFor(c),
        }))
        .sort((a, b) => pointsFor(b) - pointsFor(a)),
      roundsSummary: Array.from(
        new Set(
          teamPlayers.map((p) => (p.draftRound === null ? "UD" : `R${p.draftRound}`))
        )
      ).join(", "),
    };
  });

  const sorted = [...rows].sort((a, b) => {
    if (draftSortKey.value === "team") {
      const cmp = a.ownerName.localeCompare(b.ownerName);
      return draftSortDir.value === "asc" ? cmp : -cmp;
    }
    if (draftSortKey.value === "avg") {
      return draftSortDir.value === "asc" ? a.avg - b.avg : b.avg - a.avg;
    }
    return draftSortDir.value === "asc" ? a.total - b.total : b.total - a.total;
  });
  return sorted;
});

const toggleRound = (round: number | "ud") => {
  const idx = filters.draftRounds.indexOf(round);
  if (idx >= 0) {
    filters.draftRounds.splice(idx, 1);
  } else {
    filters.draftRounds.push(round);
  }
  ensureRoundsSelected();
};

const isRoundSelected = (round: number | null) => {
  const key = round === null ? "ud" : round;
  return filters.draftRounds.includes(key);
};

const applyWeekRange = async () => {
  if (filters.startWeek < 1) filters.startWeek = 1;
  if (filters.endWeek && filters.endWeek < filters.startWeek) {
    filters.endWeek = filters.startWeek;
  }
  if (lastWeek.value && filters.endWeek > lastWeek.value) {
    filters.endWeek = lastWeek.value;
  }
  await loadData();
};

const toggleSeasonRow = (rosterId: number) => {
  if (openSeasonRows.value.includes(rosterId)) {
    openSeasonRows.value = openSeasonRows.value.filter((r) => r !== rosterId);
  } else {
    openSeasonRows.value = [...openSeasonRows.value, rosterId];
  }
};

const toggleDraftRow = (rosterId: number) => {
  if (openDraftRows.value.includes(rosterId)) {
    openDraftRows.value = openDraftRows.value.filter((r) => r !== rosterId);
  } else {
    openDraftRows.value = [...openDraftRows.value, rosterId];
  }
};

const playerSortKey = ref<"total" | "avg" | "starts" | "name">("total");
const playerSortDir = ref<"asc" | "desc">("desc");

const playerFilteredRows = computed(() => {
  const allowedPositions =
    filters.position === "ALL" ? positionList : [filters.position];
  const selectedRounds = new Set(filters.draftRounds);
  const search = filters.playerSearch.toLowerCase().trim();
  const rows = playerRows.value
    .filter((p) => allowedPositions.includes(p.position as PositionKey))
    .filter((p) => selectedRounds.size === 0 || selectedRounds.has((p.draftRound === null ? "ud" : p.draftRound) as any))
    .filter((p) =>
      filters.ownerId === "ALL"
        ? true
        : p.ownerId === filters.ownerId
    )
    .filter((p) =>
      search ? p.name.toLowerCase().includes(search) : true
    )
    .map((p) => {
      const total = filters.starterOnly ? p.startedPoints : p.totalPoints;
      const avg = p.weeksPlayed
        ? total / p.weeksPlayed
        : total;
      return {
        ...p,
        displayTotal: total,
        displayAvg: avg,
      };
    });

  const sorted = [...rows].sort((a, b) => {
    if (playerSortKey.value === "name") {
      const cmp = a.name.localeCompare(b.name);
      return playerSortDir.value === "asc" ? cmp : -cmp;
    }
    if (playerSortKey.value === "starts") {
      const diff = a.weeksStarted - b.weeksStarted;
      return playerSortDir.value === "asc" ? diff : -diff;
    }
    if (playerSortKey.value === "avg") {
      const diff = a.displayAvg - b.displayAvg;
      return playerSortDir.value === "asc" ? diff : -diff;
    }
    const diff = a.displayTotal - b.displayTotal;
    return playerSortDir.value === "asc" ? diff : -diff;
  });
  return sorted;
});

const togglePlayerRow = (playerId: string) => {
  if (openPlayerRows.value.includes(playerId)) {
    openPlayerRows.value = openPlayerRows.value.filter((p) => p !== playerId);
  } else {
    openPlayerRows.value = [...openPlayerRows.value, playerId];
  }
};

const handlePlayerHeaderSort = (key: "name" | "total" | "avg" | "starts") => {
  if (playerSortKey.value === key) {
    playerSortDir.value = playerSortDir.value === "asc" ? "desc" : "asc";
  } else {
    playerSortKey.value = key;
    playerSortDir.value = key === "name" ? "asc" : "desc";
  }
};

const handleSeasonHeaderSort = (pos: PositionKey) => {
  if (seasonSortKey.value === pos) {
    seasonSortDir.value = seasonSortDir.value === "asc" ? "desc" : "asc";
  } else {
    seasonSortKey.value = pos;
    seasonSortDir.value = "asc";
  }
};

const handleDraftHeaderSort = (key: "team" | "total" | "avg") => {
  if (draftSortKey.value === key) {
    draftSortDir.value = draftSortDir.value === "asc" ? "desc" : "asc";
  } else {
    draftSortKey.value = key;
    draftSortDir.value = key === "team" ? "asc" : "desc";
  }
};

const roundsSummaryLabel = computed(() => {
  if (!filters.draftRounds.length || filters.draftRounds.length === availableDraftRounds.value.length) {
    return "All rounds";
  }
  return `${filters.draftRounds.length} selected`;
});

const refreshPlayerDirectory = async () => {
  clearSleeperCache("playersDirectory");
  clearSleeperCache("draft:picks:");
  clearSleeperPersistentCache("sleeper:players");
  clearSleeperPersistentCache("sleeper:draft:");
  await loadData();
};

onMounted(async () => {
  await loadData();
});

watch(
  () => leagueId.value,
  async () => {
    await loadData();
  }
);
</script>

<template>
  <div class="container w-11/12 max-w-screen-xl mx-auto pb-12">
    <div
      class="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-700 to-sky-600 text-gray-50 shadow-lg"
    >
      <div
        class="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_rgba(255,255,255,0.25)_1px,_transparent_1px)] bg-[size:26px_26px]"
      ></div>
      <div class="relative px-6 py-8 sm:px-10 sm:py-10">
        <p class="text-xs uppercase tracking-[0.3em] text-blue-100">
          Team Stats Lab
        </p>
        <h1 class="mt-2 text-2xl font-semibold sm:text-3xl">
          Team Sortable Stats
        </h1>
        <p class="mt-2 text-sm text-blue-100">
          {{ leagueName || "Sleeper League" }} • {{ season || "2025" }} regular
          season
        </p>
        <div class="flex flex-wrap items-center gap-3 mt-6">
          <div class="flex items-center gap-2 text-sm text-blue-100">
            <span class="px-2 py-1 text-xs font-semibold bg-white/10 rounded-md"
              >Week range</span
            >
            <input
              type="number"
              min="1"
              class="w-16 px-2 py-1 text-gray-900 bg-white border border-blue-100 rounded-md"
              v-model.number="filters.startWeek"
            />
            <span class="text-blue-100">to</span>
            <input
              type="number"
              :max="lastWeek || 18"
              class="w-16 px-2 py-1 text-gray-900 bg-white border border-blue-100 rounded-md"
              v-model.number="filters.endWeek"
            />
            <button
              @click="applyWeekRange"
              class="px-3 py-1 text-sm font-semibold text-blue-900 bg-white rounded-md shadow hover:bg-blue-50"
            >
              Apply
            </button>
          </div>
          <label class="flex items-center gap-2 text-sm text-blue-100">
            <input
              type="checkbox"
              v-model="filters.starterOnly"
              class="w-4 h-4 text-blue-600 border-blue-200 rounded focus:ring-blue-400"
            />
            Starter points only
          </label>
          <div class="text-xs text-blue-100">
            Loaded weeks: {{ weeksLoaded.join(", ") || "—" }}
          </div>
          <button
            @click="refreshPlayerDirectory"
            class="px-3 py-1 text-xs font-semibold text-blue-900 bg-white rounded-md shadow hover:bg-blue-50"
            :disabled="loading"
          >
            Refresh data
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 mt-6">
      <button
        class="px-4 py-2 text-sm font-semibold rounded-lg shadow-sm"
        :class="[
          activeTab === 'season'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-200',
        ]"
        @click="activeTab = 'season'"
      >
        Season Ranks
      </button>
      <button
        class="px-4 py-2 text-sm font-semibold rounded-lg shadow-sm"
        :class="[
          activeTab === 'draft'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-200',
        ]"
        @click="activeTab = 'draft'"
      >
        Draft Ranks
      </button>
      <button
        class="px-4 py-2 text-sm font-semibold rounded-lg shadow-sm"
        :class="[
          activeTab === 'players'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-200',
        ]"
        @click="activeTab = 'players'"
      >
        Player Ranks
      </button>
    </div>

    <div v-if="error" class="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-lg">
      {{ error }}
    </div>
    <div v-if="loading" class="mt-8 text-center text-gray-600">Loading…</div>

    <!-- Season Ranks -->
    <div v-if="!loading && activeTab === 'season'" class="mt-6">
      <div
        class="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <p class="text-sm text-gray-700">
          Click any positional header to sort ({{ seasonSortDir === "asc" ? "asc" : "desc" }}).
        </p>
      </div>

      <div class="mt-4 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
        <table class="w-full text-sm text-left text-gray-700">
          <thead class="text-xs uppercase bg-gray-50 text-gray-500">
            <tr>
              <th class="px-4 py-3">Team</th>
              <th class="px-4 py-3">Record</th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleSeasonHeaderSort('QB')"
              >
                QB Rank
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleSeasonHeaderSort('RB')"
              >
                RB Rank
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleSeasonHeaderSort('WR')"
              >
                WR Rank
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleSeasonHeaderSort('TE')"
              >
                TE Rank
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleSeasonHeaderSort('DEF')"
              >
                DEF Rank
              </th>
              <th class="px-4 py-3 text-right">Expand</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in seasonRows" :key="row.rosterId">
              <tr
                class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                @click="toggleSeasonRow(row.rosterId)"
              >
                <td class="px-4 py-3 font-medium text-gray-900">
                  <RouterLink
                    class="text-indigo-600 hover:underline"
                    :to="{ path: '/rosters', query: { rosterId: row.rosterId } }"
                    @click.stop
                  >
                    {{ row.ownerName }}
                  </RouterLink>
                </td>
                <td class="px-4 py-3">{{ row.record }}</td>
                <td class="px-4 py-3 text-right">{{ row.ranks.QB.rank }}</td>
                <td class="px-4 py-3 text-right">{{ row.ranks.RB.rank }}</td>
                <td class="px-4 py-3 text-right">{{ row.ranks.WR.rank }}</td>
                <td class="px-4 py-3 text-right">{{ row.ranks.TE.rank }}</td>
                <td class="px-4 py-3 text-right">{{ row.ranks.DEF.rank }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    class="text-indigo-600 hover:underline"
                    @click="toggleSeasonRow(row.rosterId)"
                  >
                    {{ openSeasonRows.includes(row.rosterId) ? "Hide" : "View" }}
                  </button>
                </td>
              </tr>
              <tr
                v-if="openSeasonRows.includes(row.rosterId)"
                class="border-t border-gray-100 bg-gray-50"
              >
                <td colspan="8" class="px-4 py-4">
                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div
                      v-for="pos in positionList"
                      :key="`${row.rosterId}-${pos}`"
                      class="p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <div class="flex items-center justify-between">
                        <div class="text-sm font-semibold text-gray-800">
                          {{ pos }} • Rank {{ row.ranks[pos].rank }}
                        </div>
                        <div class="text-xs text-gray-500">
                          {{ row.ranks[pos].total.toFixed(2) }} pts
                        </div>
                      </div>
                      <ul class="mt-2 space-y-1 text-sm text-gray-700">
                        <li
                          v-for="p in row.ranks[pos].topPlayers"
                          :key="p.playerId"
                          class="flex items-center justify-between"
                        >
                          <RouterLink
                            class="truncate text-indigo-600 hover:underline"
                            :to="{ path: '/players', query: { playerId: p.playerId } }"
                            @click.stop
                          >
                            {{ p.name }}
                          </RouterLink>
                          <span class="text-gray-500">
                            {{ pointsFor(p).toFixed(2) }} ({{ formatRound(p.draftRound) }})
                          </span>
                        </li>
                        <li v-if="row.ranks[pos].topPlayers.length === 0" class="text-gray-400">
                          No players
                        </li>
                      </ul>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Draft Ranks -->
    <div v-if="!loading && activeTab === 'draft'" class="mt-6 space-y-4">
      <div
        class="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <label class="text-sm text-gray-700">
          Position filter
          <select
            v-model="filters.position"
            class="block w-32 px-3 py-2 mt-1 text-sm bg-white border border-gray-200 rounded-md"
          >
            <option value="ALL">All</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
            <option value="DEF">DEF</option>
          </select>
        </label>
        <div class="flex flex-col text-sm text-gray-700">
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md"
            @click="showDraftRounds = !showDraftRounds"
          >
            Rounds
            <span class="text-xs text-indigo-500">({{ roundsSummaryLabel }})</span>
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
            </svg>
          </button>
          <div
            v-show="showDraftRounds"
            class="flex flex-wrap items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md"
          >
            <label
              v-for="round in availableDraftRounds"
              :key="`round-${round ?? 'ud'}`"
              class="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md"
            >
              <input
                type="checkbox"
                :value="round === null ? 'ud' : round"
                :checked="isRoundSelected(round)"
                @change="toggleRound(round === null ? 'ud' : round)"
              />
              {{ formatRound(round) }}
            </label>
            <button
              class="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md"
              @click="ensureRoundsSelected()"
            >
              Select all
            </button>
            <button
              class="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md"
              @click="filters.draftRounds = []"
            >
              Clear
            </button>
          </div>
        </div>
        <p class="text-sm text-gray-700">
          Click table headers to sort ({{ draftSortDir === "asc" ? "asc" : "desc" }}).
        </p>
      </div>

      <div class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
        <table class="w-full text-sm text-left text-gray-700">
          <thead class="text-xs uppercase bg-gray-50 text-gray-500">
            <tr>
              <th
                class="px-4 py-3 cursor-pointer"
                @click="handleDraftHeaderSort('team')"
              >
                Team
              </th>
              <th class="px-4 py-3">Rounds</th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleDraftHeaderSort('total')"
              >
                Total
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handleDraftHeaderSort('avg')"
              >
                Avg/Week
              </th>
              <th class="px-4 py-3 text-right">Expand</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in draftRows" :key="row.rosterId">
              <tr
                class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                @click="toggleDraftRow(row.rosterId)"
              >
                <td class="px-4 py-3 font-medium text-gray-900">
                  <RouterLink
                    class="text-indigo-600 hover:underline"
                    :to="{ path: '/rosters', query: { rosterId: row.rosterId } }"
                    @click.stop
                  >
                    {{ row.ownerName }}
                  </RouterLink>
                </td>
                <td class="px-4 py-3">{{ row.roundsSummary || "—" }}</td>
                <td class="px-4 py-3 text-right">{{ row.total.toFixed(2) }}</td>
                <td class="px-4 py-3 text-right">{{ row.avg.toFixed(2) }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    class="text-indigo-600 hover:underline"
                    @click="toggleDraftRow(row.rosterId)"
                  >
                    {{ openDraftRows.includes(row.rosterId) ? "Hide" : "View" }}
                  </button>
                </td>
              </tr>
              <tr
                v-if="openDraftRows.includes(row.rosterId)"
                class="border-t border-gray-100 bg-gray-50"
              >
                <td colspan="5" class="px-4 py-4">
                  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div
                      v-for="p in row.players.slice(0, 12)"
                      :key="p.playerId"
                      class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <div>
                        <div class="text-sm font-semibold text-gray-900">
                          <RouterLink
                            class="text-indigo-600 hover:underline"
                            :to="{ path: '/players', query: { playerId: p.playerId } }"
                            @click.stop
                          >
                            {{ p.name }}
                          </RouterLink>
                          • {{ p.position }}
                        </div>
                        <div class="text-xs text-gray-500">
                          {{ formatRound(p.draftRound) }} • {{ p.team || "FA" }}
                        </div>
                      </div>
                      <div class="text-right text-sm text-gray-800">
                        <div>{{ pointsFor(p).toFixed(2) }} pts</div>
                        <div class="text-xs text-gray-500">
                          {{ p.ppg.toFixed(2) }} ppg
                        </div>
                      </div>
                    </div>
                    <div v-if="row.players.length === 0" class="text-sm text-gray-500">
                      No players in this filter.
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Player Ranks -->
    <div v-if="!loading && activeTab === 'players'" class="mt-6 space-y-4">
      <div class="grid gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label class="flex flex-col text-sm text-gray-700">
          <span class="font-semibold text-gray-800">Position</span>
          <select
            v-model="filters.position"
            class="mt-1 block w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-200"
          >
            <option value="ALL">All</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
            <option value="DEF">DEF</option>
          </select>
        </label>
        <label class="flex flex-col text-sm text-gray-700">
          <span class="font-semibold text-gray-800">Team / Manager</span>
          <select
            v-model="filters.ownerId"
            class="mt-1 block w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-200"
          >
            <option
              v-for="opt in ownerOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </label>
        <label class="flex flex-col text-sm text-gray-700">
          <span class="font-semibold text-gray-800">Search</span>
          <input
            v-model="filters.playerSearch"
            type="text"
            placeholder="Player name"
            class="mt-1 block w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <div class="flex flex-col text-sm text-gray-700">
          <span class="font-semibold text-gray-800">Rounds</span>
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md mt-1"
            @click="showPlayerRounds = !showPlayerRounds"
          >
            Rounds
            <span class="text-xs text-indigo-500">({{ roundsSummaryLabel }})</span>
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
            </svg>
          </button>
          <div
            v-show="showPlayerRounds"
            class="flex flex-wrap items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md"
          >
            <label
              v-for="round in availableDraftRounds"
              :key="`pround-${round ?? 'ud'}`"
              class="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md"
            >
              <input
                type="checkbox"
                :value="round === null ? 'ud' : round"
                :checked="isRoundSelected(round)"
                @change="toggleRound(round === null ? 'ud' : round)"
              />
              {{ formatRound(round) }}
            </label>
            <button
              class="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md"
              @click="ensureRoundsSelected()"
            >
              Select all
            </button>
            <button
              class="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md"
              @click="filters.draftRounds = []"
            >
              Clear
            </button>
          </div>
        </div>
        <p class="text-sm text-gray-700 md:col-span-2 lg:col-span-1">
          Click headers to sort ({{ playerSortDir === "asc" ? "asc" : "desc" }}).
        </p>
      </div>

      <div class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow">
        <table class="w-full text-sm text-left text-gray-800">
          <thead class="text-xs uppercase bg-gray-50 text-gray-500">
            <tr>
              <th
                class="px-4 py-3 cursor-pointer"
                @click="handlePlayerHeaderSort('name')"
              >
                Player
              </th>
              <th class="px-4 py-3">Pos</th>
              <th class="px-4 py-3">Team</th>
              <th class="px-4 py-3">Draft</th>
              <th class="px-4 py-3">Owner</th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handlePlayerHeaderSort('total')"
              >
                Total
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handlePlayerHeaderSort('avg')"
              >
                Avg
              </th>
              <th
                class="px-4 py-3 text-right cursor-pointer"
                @click="handlePlayerHeaderSort('starts')"
              >
                Starts
              </th>
              <th class="px-4 py-3 text-right">Expand</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in playerFilteredRows" :key="row.playerId">
              <tr
                class="border-t border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-indigo-50/60 cursor-pointer transition"
                @click="togglePlayerRow(row.playerId)"
              >
                <td class="px-4 py-3 font-semibold text-gray-900">
                  <RouterLink
                    class="text-indigo-600 hover:underline"
                    :to="{ path: '/players', query: { playerId: row.playerId } }"
                    @click.stop
                  >
                    {{ row.name }}
                  </RouterLink>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {{ row.position }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ row.team || "—" }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    {{ formatRound(row.draftRound) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <RouterLink
                    class="text-indigo-600 hover:underline"
                    :to="{ path: '/rosters', query: { rosterId: row.ownerId ? rosters.find((r) => r.ownerId === row.ownerId)?.rosterId : undefined } }"
                    @click.stop
                  >
                    {{ row.ownerName }}
                  </RouterLink>
                </td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">
                  {{ row.displayTotal.toFixed(2) }}
                </td>
                <td class="px-4 py-3 text-right text-gray-700">
                  {{ row.displayAvg.toFixed(2) }}
                </td>
                <td class="px-4 py-3 text-right">{{ row.weeksStarted }}</td>
                <td class="px-4 py-3 text-right">
                  <span class="text-indigo-600 hover:underline">
                    {{ openPlayerRows.includes(row.playerId) ? "Hide" : "View" }}
                  </span>
                </td>
              </tr>
              <tr
                v-if="openPlayerRows.includes(row.playerId)"
                class="border-t border-gray-100 bg-gray-50"
              >
                <td colspan="9" class="px-4 py-4">
                  <div class="flex flex-wrap gap-2 text-xs text-gray-700">
                    <span class="font-semibold text-gray-800">Weekly:</span>
                    <span v-if="!(playerWeekly.get(row.playerId)?.length)">
                      No weekly data.
                    </span>
                    <span
                      v-for="w in (playerWeekly.get(row.playerId) || []).sort((a,b) => a.week - b.week)"
                      :key="`${row.playerId}-w${w.week}`"
                      class="px-2 py-1 bg-white border border-gray-200 rounded-md"
                    >
                      W{{ w.week }}: {{ w.points.toFixed(2) }}
                      <span class="text-gray-500">
                        ({{ w.started ? "S" : "B" }})
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
