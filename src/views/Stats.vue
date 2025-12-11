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
type PositionKey = "QB" | "RB" | "WR" | "TE" | "DEF" | "K";

const store = useStore();
const activeTab = ref<TabKey>("season");
const loading = ref(true);
const loadingMessage = ref("");
const error = ref("");
const errorDetail = ref("");
const leagueName = ref("");
const season = ref("");
const lastWeek = ref(0);
const regularSeasonLength = ref<number | null>(null);
const lastLoadedAt = ref<string>("");
const rosterPositions = ref<string[]>([]);
const weeksLoaded = ref<number[]>([]);
const rosters = ref<TeamRecordRow[]>([]);
const contributions = ref<TeamPlayerContribution[]>([]);
const playerRows = ref<PlayerAggregateRow[]>([]);
const playerWeekly = ref<Map<string, PlayerWeeklyStat[]>>(new Map());

const filters = reactive({
  startWeek: 1,
  endWeek: 0,
  starterOnly: true,
  positions: [] as PositionKey[],
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
const positionsHydrated = ref(false);
const showDraftPositions = ref(false);
const showDraftRounds = ref(false);
const showPlayerPositions = ref(false);
const showPlayerRounds = ref(false);

const leagueId = computed(
  () => store.currentLeagueId || getDefaultLeagueId()
);

const filtersKeyFor = (id: string) => `stats:filters:${id}`;
const tabKeyFor = (id: string) => `stats:tab:${id}`;

const weekPresets = computed(() => {
  const maxWeek = lastWeek.value || filters.endWeek || 18;
  const regSeason = regularSeasonLength.value || null;
  const seasonRange = { key: "season", label: "Season", start: 1, end: maxWeek };
  const lastFourStart = Math.max(1, maxWeek - 3);
  const lastFourRange = {
    key: "last4",
    label: "Last 4",
    start: lastFourStart,
    end: maxWeek,
  };
  const playoffsStartBase = regSeason ? regSeason + 1 : 15;
  const playoffsStart = Math.max(15, playoffsStartBase);
  const playoffsEndCap = 17;
  const playoffsEnd = Math.max(playoffsStart, Math.min(maxWeek, playoffsEndCap));
  const presets = [seasonRange, lastFourRange];
  if (lastWeek.value >= playoffsStart) {
    presets.push({
      key: "playoffs",
      label: "Playoffs",
      start: playoffsStart,
      end: playoffsEnd,
    });
  }
  return presets;
});

const activePresetKey = computed(() => {
  const match = weekPresets.value.find(
    (preset) =>
      preset.start === filters.startWeek && preset.end === filters.endWeek
  );
  return match?.key || "";
});

const weekRangeHint = computed(() => {
  if (filters.startWeek < 1) return "Start week must be at least 1.";
  if (filters.endWeek && filters.endWeek < filters.startWeek) {
    return "End week cannot be before start week.";
  }
  if (lastWeek.value && filters.endWeek > lastWeek.value) {
    return `Clamped to last completed week (${lastWeek.value}).`;
  }
  return "";
});

const isInvalidRange = computed(() =>
  Boolean(filters.endWeek && filters.endWeek < filters.startWeek)
);

const isApplyDisabled = computed(() => {
  if (loading.value) return true;
  if (!filters.startWeek) return true;
  if (filters.endWeek && filters.endWeek < filters.startWeek) return true;
  return false;
});

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

const hydrateFiltersFromStorage = (lid: string) => {
  try {
    positionsHydrated.value = false;
    const raw = localStorage.getItem(filtersKeyFor(lid));
    if (raw) {
      const parsed = JSON.parse(raw);
      const parsedPositions =
        parsed && typeof parsed === "object" && ("positions" in parsed || "position" in parsed)
          ? parsed.positions ?? parsed.position
          : undefined;
      const parsedStart = Number(parsed.startWeek);
      const parsedEnd = Number(parsed.endWeek);
      filters.startWeek = Number.isFinite(parsedStart)
        ? parsedStart
        : filters.startWeek;
      filters.endWeek = Number.isFinite(parsedEnd)
        ? parsedEnd
        : filters.endWeek;
      filters.starterOnly =
        parsed.starterOnly !== undefined
          ? Boolean(parsed.starterOnly)
          : filters.starterOnly;
      if (parsedPositions !== undefined) {
        const positionList = Array.isArray(parsedPositions)
          ? parsedPositions.filter((p: unknown) => isPositionKey(p))
          : typeof parsedPositions === "string" && parsedPositions === "ALL"
            ? []
            : typeof parsedPositions === "string" && isPositionKey(parsedPositions)
              ? [parsedPositions]
              : [];
        filters.positions = positionList;
        positionsHydrated.value = true;
      }
      filters.draftRounds = Array.isArray(parsed.draftRounds)
        ? [...parsed.draftRounds]
        : filters.draftRounds;
      filters.playerSearch =
        typeof parsed.playerSearch === "string"
          ? parsed.playerSearch
          : filters.playerSearch;
      filters.ownerId =
        typeof parsed.ownerId === "string" ? parsed.ownerId : filters.ownerId;
    }
    const savedTab = localStorage.getItem(tabKeyFor(lid));
    if (
      savedTab === "season" ||
      savedTab === "draft" ||
      savedTab === "players"
    ) {
      activeTab.value = savedTab as TabKey;
    }
  } catch (err) {
    console.warn("Unable to restore stats filters", err);
  }
};

const persistFiltersToStorage = () => {
  try {
    const payload = {
      ...filters,
      draftRounds: [...filters.draftRounds],
      positions: [...filters.positions],
    };
    localStorage.setItem(filtersKeyFor(leagueId.value), JSON.stringify(payload));
  } catch (err) {
    console.warn("Unable to persist stats filters", err);
  }
};

const ownerOptions = computed(() => {
  const opts = rosters.value.map((r) => ({
    value: r.ownerId,
    label: r.ownerName,
  }));
  return [{ value: "ALL", label: "All Teams" }, ...opts];
});

const isPositionKey = (value: unknown): value is PositionKey =>
  value === "QB" ||
  value === "RB" ||
  value === "WR" ||
  value === "TE" ||
  value === "DEF" ||
  value === "K";

const normalizeRosterPos = (pos: string): PositionKey | null => {
  if (!pos) return null;
  if (pos === "DST" || pos === "DEF") return "DEF";
  if (pos === "K") return "K";
  if (pos === "QB" || pos === "RB" || pos === "WR" || pos === "TE") return pos;
  return null;
};

const positionsForLeague = computed<PositionKey[]>(() => {
  const set = new Set<PositionKey>();
  rosterPositions.value.forEach((pos) => {
    const norm = normalizeRosterPos(pos);
    if (norm) set.add(norm);
  });
  const order: PositionKey[] = ["QB", "RB", "WR", "TE", "DEF", "K"];
  if (set.size === 0) {
    return order.slice(0, 5);
  }
  return order.filter((p) => set.has(p));
});

const selectedPositions = computed<PositionKey[]>(() => {
  return filters.positions;
});

const loadData = async () => {
  loading.value = true;
  error.value = "";
  errorDetail.value = "";
  const fallbackEnd = filters.endWeek || lastWeek.value || 14;
  loadingMessage.value = `Loading weeks ${filters.startWeek}-${fallbackEnd}`;
  try {
    const data = await loadStatsData({
      leagueId: leagueId.value,
      startWeek: filters.startWeek,
      endWeek: fallbackEnd,
    });
    leagueName.value = data.league.name;
    season.value = data.league.season;
    lastWeek.value = data.league.lastScoredWeek;
    regularSeasonLength.value = data.league.regularSeasonLength || null;
    rosterPositions.value = data.league.rosterPositions || [];
    weeksLoaded.value = data.weeks;
    rosters.value = data.rosters;
    contributions.value = data.contributions;
    playerRows.value = data.playerRows;
    playerWeekly.value = data.playerWeekly;
    if (!positionsHydrated.value && filters.positions.length === 0) {
      filters.positions = [...positionsForLeague.value];
    }
    if (!filters.endWeek || filters.endWeek > data.league.lastScoredWeek) {
      filters.endWeek = data.league.lastScoredWeek;
    }
    lastLoadedAt.value = new Date().toLocaleTimeString();
    ensureRoundsSelected();
  } catch (e) {
    console.error(e);
    error.value = "Unable to load stats right now.";
    errorDetail.value =
      (e as Error)?.message || "Check your connection and try again.";
  } finally {
    loading.value = false;
    loadingMessage.value = "";
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

  positionsForLeague.value.forEach((pos) => {
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
  const allowedPositions = selectedPositions.value;
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
    const totalGames = teamPlayers.reduce((acc, c) => acc + gamesFor(c), 0);
    const avg = totalGames > 0 ? total / totalGames : total;
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

const togglePosition = (pos: PositionKey) => {
  const idx = filters.positions.indexOf(pos);
  if (idx >= 0) {
    filters.positions.splice(idx, 1);
  } else {
    filters.positions.push(pos);
  }
};

const isPositionSelected = (pos: PositionKey) => {
  return filters.positions.includes(pos);
};

const applyWeekRange = async () => {
  if (filters.startWeek < 1) filters.startWeek = 1;
  if (filters.endWeek && filters.endWeek < filters.startWeek) {
    filters.endWeek = filters.startWeek;
  }
  if (!filters.endWeek && lastWeek.value) {
    filters.endWeek = lastWeek.value;
  }
  if (lastWeek.value && filters.endWeek > lastWeek.value) {
    filters.endWeek = lastWeek.value;
  }
  await loadData();
};

const applyPreset = async (presetKey: string) => {
  const preset = weekPresets.value.find((p) => p.key === presetKey);
  if (!preset) return;
  filters.startWeek = preset.start;
  filters.endWeek = preset.end;
  await applyWeekRange();
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
  const allowedPositions = selectedPositions.value;
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

const positionsSummaryLabel = computed(() => {
  if (!filters.positions.length) return "None";
  if (filters.positions.length === positionsForLeague.value.length) return "All positions";
  return `${filters.positions.length} selected`;
});

const refreshPlayerDirectory = async () => {
  clearSleeperCache("playersDirectory");
  clearSleeperCache("draft:picks:");
  clearSleeperPersistentCache("sleeper:players");
  clearSleeperPersistentCache("sleeper:draft:");
  loadingMessage.value = "Refreshing Sleeper data…";
  await loadData();
};

watch(
  filters,
  () => {
    persistFiltersToStorage();
  },
  { deep: true }
);

watch(
  () => activeTab.value,
  (tab) => {
    try {
      localStorage.setItem(tabKeyFor(leagueId.value), tab);
    } catch (err) {
      console.warn("Unable to persist stats tab", err);
    }
  }
);

onMounted(async () => {
  hydrateFiltersFromStorage(leagueId.value);
  await loadData();
});

watch(
  () => leagueId.value,
  async (newLeagueId) => {
    hydrateFiltersFromStorage(newLeagueId);
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
              :max="lastWeek || 18"
              :disabled="loading"
              :class="[
                'w-16 px-2 py-1 text-gray-900 bg-white border rounded-md focus:outline-none',
                isInvalidRange ? 'border-red-300 ring-1 ring-red-200' : 'border-blue-100',
              ]"
              v-model.number="filters.startWeek"
            />
            <span class="text-blue-100">to</span>
            <input
              type="number"
              :max="lastWeek || 18"
              :disabled="loading"
              :class="[
                'w-16 px-2 py-1 text-gray-900 bg-white border rounded-md focus:outline-none',
                isInvalidRange ? 'border-red-300 ring-1 ring-red-200' : 'border-blue-100',
              ]"
              v-model.number="filters.endWeek"
            />
            <button
              @click="applyWeekRange"
              :disabled="isApplyDisabled"
              :class="[
                'px-3 py-1 text-sm font-semibold rounded-md shadow',
                isApplyDisabled
                  ? 'text-blue-900/60 bg-white/60 cursor-not-allowed'
                  : 'text-blue-900 bg-white hover:bg-blue-50',
              ]"
            >
              Apply
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs text-blue-50">
            <span class="px-2 py-1 text-[11px] font-semibold bg-white/10 rounded-md">
              Quick ranges
            </span>
            <button
              v-for="preset in weekPresets"
              :key="preset.key"
              @click="applyPreset(preset.key)"
              :disabled="loading"
              :class="[
                'px-3 py-1 rounded-md border text-xs font-semibold backdrop-blur',
                activePresetKey === preset.key
                  ? 'bg-white text-blue-900 border-white shadow-sm'
                  : 'bg-white/10 text-blue-50 border-white/30 hover:bg-white/20',
              ]"
            >
              {{ preset.label }} (W{{ preset.start }}-{{ preset.end }})
            </button>
          </div>
          <label class="flex items-center gap-2 text-sm text-blue-100">
            <input
              type="checkbox"
              v-model="filters.starterOnly"
              :disabled="loading"
              class="w-4 h-4 text-blue-600 border-blue-200 rounded focus:ring-blue-400"
            />
            Starter points only
          </label>
          <div class="flex flex-wrap items-center gap-2 text-xs text-blue-100">
            <span class="px-2 py-1 bg-white/10 rounded-md">
              Loaded weeks: {{ weeksLoaded.join(", ") || "—" }}
            </span>
            <span class="px-2 py-1 bg-white/10 rounded-md">
              Max completed week: {{ lastWeek || "—" }}
            </span>
            <span class="px-2 py-1 bg-white/10 rounded-md">
              Filters auto-saved
            </span>
            <span class="px-2 py-1 bg-white/10 rounded-md">
              Last refreshed: {{ lastLoadedAt || "—" }}
            </span>
          </div>
          <button
            @click="refreshPlayerDirectory"
            class="px-3 py-1 text-xs font-semibold text-blue-900 bg-white rounded-md shadow hover:bg-blue-50 disabled:opacity-60"
            :disabled="loading"
          >
            Refresh data
          </button>
        </div>
        <div v-if="weekRangeHint" class="mt-2 text-xs text-blue-100">
          {{ weekRangeHint }}
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

    <div
      v-if="error"
      class="p-4 mt-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex items-center justify-center w-8 h-8 text-red-700 bg-white rounded-full border border-red-200"
        >
          !
        </div>
        <div class="flex-1 space-y-2">
          <p class="font-semibold">{{ error }}</p>
          <p v-if="errorDetail" class="text-xs text-red-700">
            {{ errorDetail }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="loadData"
              class="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-md shadow hover:bg-red-700"
            >
              Retry
            </button>
            <button
              @click="refreshPlayerDirectory"
              class="px-3 py-1 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-60"
              :disabled="loading"
            >
              Hard refresh
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="loading" class="mt-8 flex justify-center">
      <div
        class="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <svg
          class="w-5 h-5 text-indigo-600 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
          ></path>
        </svg>
        <div class="text-left">
          <div class="text-sm font-semibold text-gray-900">
            Crunching numbers…
          </div>
          <div class="text-xs text-gray-600">
            {{
              loadingMessage ||
                `Loading weeks ${filters.startWeek}-${
                  filters.endWeek || lastWeek || "…"
                } and rebuilding tables`
            }}
          </div>
        </div>
      </div>
    </div>

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
                      v-for="pos in positionsForLeague"
                      :key="`${row.rosterId}-${pos}`"
                      class="p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <div class="flex items-center justify-between">
                        <div class="text-sm font-semibold text-gray-800">
                          {{ pos }} • Rank {{ row.ranks[pos as PositionKey].rank }}
                        </div>
                        <div class="text-xs text-gray-500">
                          {{ row.ranks[pos as PositionKey].total.toFixed(2) }} pts
                        </div>
                      </div>
                      <ul class="mt-2 space-y-1 text-sm text-gray-700">
                        <li
                          v-for="p in row.ranks[pos as PositionKey].topPlayers"
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
                        <li v-if="row.ranks[pos as PositionKey].topPlayers.length === 0" class="text-gray-400">
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
        <div class="flex flex-col text-sm text-gray-700">
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md"
            @click="showDraftPositions = !showDraftPositions"
          >
            Positions
            <span class="text-xs text-indigo-500">({{ positionsSummaryLabel }})</span>
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
            v-show="showDraftPositions"
            class="flex flex-wrap items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md"
          >
            <label
              v-for="pos in positionsForLeague"
              :key="`pos-${pos}`"
              class="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md"
            >
              <input
                type="checkbox"
                :value="pos"
                :checked="isPositionSelected(pos)"
                @change="togglePosition(pos)"
              />
              {{ pos }}
            </label>
            <button
              class="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md"
              @click="filters.positions = [...positionsForLeague]"
            >
              Select all
            </button>
            <button
              class="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md"
              @click="filters.positions = []"
            >
              Clear
            </button>
          </div>
        </div>
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
        <div class="flex flex-col text-sm text-gray-700">
          <span class="font-semibold text-gray-800">Positions</span>
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md mt-1"
            @click="showPlayerPositions = !showPlayerPositions"
          >
            Positions
            <span class="text-xs text-indigo-500">({{ positionsSummaryLabel }})</span>
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
            v-show="showPlayerPositions"
            class="flex flex-wrap items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md"
          >
            <label
              v-for="pos in positionsForLeague"
              :key="`ppos-${pos}`"
              class="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md"
            >
              <input
                type="checkbox"
                :value="pos"
                :checked="isPositionSelected(pos)"
                @change="togglePosition(pos)"
              />
              {{ pos }}
            </label>
            <button
              class="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md"
              @click="filters.positions = [...positionsForLeague]"
            >
              Select all
            </button>
            <button
              class="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md"
              @click="filters.positions = []"
            >
              Clear
            </button>
          </div>
        </div>
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
