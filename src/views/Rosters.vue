<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "../store/store";
import { getCurrentLeagueState, getStats } from "../api/api";

type RosterPlayerRow = {
  playerId: string;
  name: string;
  position: string;
  team: string;
  points: number | null;
  ppg: number | null;
  rank: number | null;
  games: number | null;
};

const store = useStore();
const router = useRouter();
const route = useRoute();

const seasonYear = ref<string>("2025");
const loading = ref(false);
const errorMessage = ref("");
const selectedRosterId = ref<number | null>(null);
const rosterPlayers = ref<RosterPlayerRow[]>([]);

const currentLeague = computed(() =>
  store.currentLeagueId ? store.leagueInfo[store.currentLeagueIndex] : null
);

const scoringType = computed(() => {
  if (currentLeague.value) {
    return currentLeague.value.scoringType ?? 1;
  }
  return 1;
});

const rosterOptions = computed(() => {
  if (!currentLeague.value) return [];
  return currentLeague.value.rosters.map((roster: any) => {
    const manager = currentLeague.value?.users.find(
      (u: any) => u.id === roster.id
    );
    const name =
      manager && (store.showUsernames ? manager.username : manager.name)
        ? store.showUsernames
          ? manager.username || manager.name
          : manager.name || manager.username
        : "Ghost Roster";
    return {
      label: `${name} (Roster #${roster.rosterId})`,
      value: roster.rosterId,
    };
  });
});

const selectedRoster = computed(() => {
  if (!currentLeague.value || selectedRosterId.value === null) return null;
  return currentLeague.value.rosters.find(
    (r: any) => r.rosterId === selectedRosterId.value
  );
});

const fetchSeasonYear = async () => {
  if (currentLeague.value) {
    seasonYear.value = currentLeague.value.season;
    return;
  }
  const state = await getCurrentLeagueState();
  if (state?.season) {
    seasonYear.value = state.season;
  }
};

const loadRosterPlayers = async () => {
  if (!selectedRoster.value || !selectedRoster.value.players) {
    rosterPlayers.value = [];
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    const playerIds: string[] = selectedRoster.value.players.filter(Boolean);
    const stats = await Promise.all(
      playerIds.map((id) => getStats(id, seasonYear.value, scoringType.value))
    );
    rosterPlayers.value = stats
      .map((stat: any) => {
        if (!stat) return null;
        return {
          playerId: stat.id,
          name: `${stat.firstName || ""} ${stat.lastName || ""}`.trim() || "—",
          position: stat.position || "",
          team: stat.team || "FA",
          points: stat.points ?? null,
          ppg: stat.ppg ? Number(stat.ppg.toFixed(2)) : null,
          rank: stat.rank ?? null,
          games: stat.gp ?? null,
        } as RosterPlayerRow;
      })
      .filter(Boolean) as RosterPlayerRow[];
  } catch (error) {
    console.error(error);
    errorMessage.value = "Unable to load roster players right now.";
    rosterPlayers.value = [];
  } finally {
    loading.value = false;
  }
};

const goToPlayer = (playerId: string) => {
  router.push({ path: "/players", query: { playerId } });
};

onMounted(async () => {
  await fetchSeasonYear();
  if (rosterOptions.value.length > 0) {
    const routeRoster = Number(route.query.rosterId);
    const match = rosterOptions.value.find((r) => r.value === routeRoster);
    selectedRosterId.value = match ? match.value : rosterOptions.value[0].value;
    loadRosterPlayers();
  }
});

watch(selectedRosterId, () => {
  loadRosterPlayers();
});

watch(
  () => store.currentLeagueId,
  async () => {
    await fetchSeasonYear();
    if (rosterOptions.value.length > 0) {
      const routeRoster = Number(route.query.rosterId);
      const match = rosterOptions.value.find((r) => r.value === routeRoster);
      selectedRosterId.value = match ? match.value : rosterOptions.value[0].value;
    }
  }
);

watch(
  () => route.query.rosterId,
  () => {
    const routeRoster = Number(route.query.rosterId);
    const match = rosterOptions.value.find((r) => r.value === routeRoster);
    if (match) {
      selectedRosterId.value = match.value;
    }
  }
);
</script>

<template>
  <div class="container w-11/12 max-w-screen-xl mx-auto">
    <div
      class="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-gray-50 shadow-lg"
    >
      <div class="absolute inset-0 opacity-15 bg-[radial-gradient(circle,_rgba(255,255,255,0.15)_1px,_transparent_1px)] bg-[size:28px_28px]"></div>
      <div class="relative px-6 py-8 sm:px-10 sm:py-10">
        <p class="text-xs uppercase tracking-[0.3em] text-emerald-100">
          Rosters
        </p>
        <h1 class="mt-2 text-2xl font-semibold sm:text-3xl">
          Switch teams and explore player production
        </h1>
        <p class="mt-2 text-sm text-emerald-50">
          Showing season fantasy stats for rostered players (season
          {{ seasonYear }}).
        </p>
        <div class="mt-6">
          <label
            class="block text-xs font-semibold uppercase text-emerald-50 mb-2"
          >
            Select roster
          </label>
          <select
            v-model="selectedRosterId"
            class="w-full px-4 py-3 text-gray-900 bg-white rounded-lg shadow-sm sm:w-96 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
            <option
              v-for="opt in rosterOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="!currentLeague" class="mt-6 text-sm text-gray-600">
      Add a league on the home page to view rosters.
    </div>

    <div v-else class="mt-6 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700">
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
      >
        <div>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Roster players
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-300">
            Click a player to open detailed weekly breakdown.
          </p>
        </div>
        <div
          class="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full dark:bg-emerald-900 dark:text-emerald-200"
        >
          {{ rosterPlayers.length }} players
        </div>
      </div>

      <div v-if="loading" class="p-6 text-sm text-gray-500">
        Loading roster...
      </div>
      <div v-else-if="errorMessage" class="p-6 text-sm text-red-600">
        {{ errorMessage }}
      </div>
      <div v-else-if="rosterPlayers.length === 0" class="p-6 text-sm text-gray-500">
        No players found on this roster.
      </div>
      <div v-else class="overflow-x-auto">
        <table
          class="w-full text-sm text-left text-gray-600 rtl:text-right dark:text-gray-200"
        >
          <thead class="text-xs uppercase bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                Player
              </th>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                Pos
              </th>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                Team
              </th>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                Season Points
              </th>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                PPG
              </th>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                Pos Rank
              </th>
              <th scope="col" class="px-4 py-3 text-gray-700 dark:text-gray-300">
                Games
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="player in rosterPlayers"
              :key="player.playerId"
              @click="goToPlayer(player.playerId)"
              class="border-b cursor-pointer odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 dark:border-gray-700 hover:bg-emerald-50 hover:dark:bg-gray-800/80"
            >
              <td class="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">
                {{ player.name }}
              </td>
              <td class="px-4 py-3">{{ player.position }}</td>
              <td class="px-4 py-3">{{ player.team }}</td>
              <td class="px-4 py-3 text-blue-700 dark:text-blue-300 font-semibold">
                {{ player.points ?? "—" }}
              </td>
              <td class="px-4 py-3">{{ player.ppg ?? "—" }}</td>
              <td class="px-4 py-3">{{ player.rank ?? "—" }}</td>
              <td class="px-4 py-3">{{ player.games ?? "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
