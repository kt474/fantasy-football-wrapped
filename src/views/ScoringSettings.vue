<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "../store/store";

const store = useStore();
const route = useRoute();

type ScoringMeta = {
  group: string;
  label: string;
  note?: string;
};

const scoringMapping: Record<string, ScoringMeta> = {
  // Passing
  pass_yd: { group: "Passing", label: "Passing Yards", note: "points per yard" },
  pass_td: { group: "Passing", label: "Passing TD" },
  pass_int: { group: "Passing", label: "Pass Intercepted" },
  pass_2pt: { group: "Passing", label: "2-Pt Conversion (Pass)" },
  // Rushing
  rush_yd: { group: "Rushing", label: "Rushing Yards", note: "points per yard" },
  rush_td: { group: "Rushing", label: "Rushing TD" },
  rush_2pt: { group: "Rushing", label: "2-Pt Conversion (Rush)" },
  // Receiving
  rec: { group: "Receiving", label: "Reception" },
  rec_yd: { group: "Receiving", label: "Receiving Yards", note: "points per yard" },
  rec_td: { group: "Receiving", label: "Receiving TD" },
  rec_2pt: { group: "Receiving", label: "2-Pt Conversion (Receive)" },
  // Kicking (team or individual kickers)
  fg_0_19: { group: "Kicking", label: "FG 0-19" },
  fg_20_29: { group: "Kicking", label: "FG 20-29" },
  fg_30_39: { group: "Kicking", label: "FG 30-39" },
  fg_40_49: { group: "Kicking", label: "FG 40-49" },
  fg_50p: { group: "Kicking", label: "FG 50+" },
  fg_miss: { group: "Kicking", label: "FG Miss" },
  xp: { group: "Kicking", label: "Extra Point" },
  xp_miss: { group: "Kicking", label: "Extra Point Miss" },
  // Team Defense
  def_td: { group: "Team Defense", label: "Defense TD" },
  pts_allow_0: { group: "Team Defense", label: "Points Allowed 0" },
  pts_allow_1_6: { group: "Team Defense", label: "Points Allowed 1-6" },
  pts_allow_7_13: { group: "Team Defense", label: "Points Allowed 7-13" },
  pts_allow_14_20: { group: "Team Defense", label: "Points Allowed 14-20" },
  pts_allow_21_27: { group: "Team Defense", label: "Points Allowed 21-27" },
  pts_allow_28_34: { group: "Team Defense", label: "Points Allowed 28-34" },
  pts_allow_35p: { group: "Team Defense", label: "Points Allowed 35+" },
  yds_allow_350_399: { group: "Team Defense", label: "350-399 Total Yards Allowed" },
  yds_allow_400_449: { group: "Team Defense", label: "400-449 Total Yards Allowed" },
  yds_allow_450_499: { group: "Team Defense", label: "450-499 Total Yards Allowed" },
  yds_allow_500_549: { group: "Team Defense", label: "500-549 Total Yards Allowed" },
  yds_allow_550p: { group: "Team Defense", label: "550+ Total Yards Allowed" },
  def_3_and_out: { group: "Team Defense", label: "3 and Out" },
  def_4th_down_stop: { group: "Team Defense", label: "4th Down Stop" },
  sack: { group: "Team Defense", label: "Sacks" },
  int: { group: "Team Defense", label: "Interceptions" },
  fum_rec: { group: "Team Defense", label: "Fumble Recovery" },
  tfl: { group: "Team Defense", label: "Tackle for Loss" },
  safety: { group: "Team Defense", label: "Safety" },
  blk_kick: { group: "Team Defense", label: "Blocked Kick" },
  pass_def: { group: "Team Defense", label: "Pass Defended" },
  def_2pt: { group: "Team Defense", label: "2-Pt Conversion Return" },
  // Special Teams - Player
  st_td: { group: "Special Teams (Player)", label: "Special Teams Player TD" },
  // Special Teams - Defense
  st_def_td: { group: "Special Teams (Defense)", label: "Special Teams TD" },
  st_def_fum_rec: { group: "Special Teams (Defense)", label: "Special Teams Fumble Recovery" },
  // Misc / Ball security
  fum_lost: { group: "Misc", label: "Fumble Lost" },
  fum_rec_td: { group: "Misc", label: "Fumble Recovery TD" },
};

const league = computed(() => {
  if (!store.currentLeagueId) return null;
  return store.leagueInfo[store.currentLeagueIndex] || null;
});

const scoringEntries = computed(() => {
  if (!league.value?.scoringSettings) return [];
  return Object.entries(league.value.scoringSettings)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
});

const formattedJson = computed(() =>
  JSON.stringify(league.value?.scoringSettings ?? {}, null, 2)
);

const groupedSettings = computed(() => {
  const groups: Record<
    string,
    { key: string; label: string; value: number; note?: string }[]
  > = {};

  scoringEntries.value.forEach(({ key, value }) => {
    const meta = scoringMapping[key] || {
      group: "Other",
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    };
    const numericValue = typeof value === "number" ? value : Number(value);
    if (!groups[meta.group]) groups[meta.group] = [];
    groups[meta.group].push({
      key,
      label: meta.label,
      value: numericValue,
      note: meta.note,
    });
  });

  const groupOrder = [
    "Passing",
    "Rushing",
    "Receiving",
    "Kicking",
    "Team Defense",
    "Special Teams (Player)",
    "Special Teams (Defense)",
    "Misc",
    "Other",
  ];

  return groupOrder
    .filter((group) => groups[group]?.length)
    .map((group) => ({
      name: group,
      items: groups[group].sort((a, b) => a.label.localeCompare(b.label)),
    }));
});

const copyState = ref<"idle" | "copied" | "error">("idle");

const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(formattedJson.value);
    copyState.value = "copied";
    setTimeout(() => (copyState.value = "idle"), 1500);
  } catch (error) {
    console.error("Copy failed", error);
    copyState.value = "error";
  }
};

onMounted(() => {
  // Restore league data from localStorage when visiting directly.
  if (store.leagueInfo.length === 0 && localStorage.leagueInfo) {
    try {
      const savedLeagues = JSON.parse(localStorage.leagueInfo);
      if (Array.isArray(savedLeagues)) {
        savedLeagues.forEach((leagueData: any) => store.updateLeagueInfo(leagueData));
      }
    } catch (error) {
      console.error("Failed to parse saved leagues", error);
    }
  }

  const queryLeagueId = Array.isArray(route.query.leagueId)
    ? route.query.leagueId[0]
    : (route.query.leagueId as string | undefined);

  if (!store.currentLeagueId) {
    const fallbackId = queryLeagueId || localStorage.currentLeagueId;
    if (fallbackId && fallbackId !== "undefined") {
      store.updateCurrentLeagueId(fallbackId);
    }
  }
});

const formatValue = (value: number) => {
  if (Number.isInteger(value)) return value;
  return Number(value.toFixed(3));
};

const perYardNote = (item: { key: string; note?: string; value: number }) => {
  if (item.note !== "points per yard" || !item.value) return "";
  const yardsPerPoint = Number((1 / item.value).toFixed(2));
  return `1 point every ${yardsPerPoint} yards`;
};
</script>

<template>
  <div class="max-w-5xl px-4 py-10 mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-sm font-semibold text-gray-600 uppercase dark:text-gray-300">
          Debug
        </p>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Scoring Settings Export
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Temporary page to view and copy the full Sleeper scoring_settings object for the active league.
        </p>
      </div>
      <button
        class="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
        :disabled="!league"
        @click="copyJson"
      >
        <span v-if="copyState === 'copied'">Copied</span>
        <span v-else-if="copyState === 'error'">Copy failed</span>
        <span v-else>Copy JSON</span>
      </button>
    </div>

    <div
      v-if="!league"
      class="p-4 text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100"
    >
      Load a league first to inspect its scoring settings. Use the home page to add a league, then return here.
    </div>

    <div v-else class="space-y-6">
      <div
        class="p-4 border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Active league
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {{ league.name }} • {{ league.season }}
            </p>
            <p class="text-sm text-gray-500">
              ID: {{ league.leagueId }}
            </p>
          </div>
          <span
            class="px-3 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-100"
          >
            {{ scoringEntries.length }} settings
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="group in groupedSettings"
          :key="group.name"
          class="overflow-hidden border border-gray-200 rounded-lg shadow-sm dark:border-gray-700"
        >
          <div
            class="px-4 py-3 bg-gray-50 border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between"
          >
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {{ group.name }}
            </p>
            <span
              class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-100"
            >
              {{ group.items.length }} items
            </span>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              v-for="item in group.items"
              :key="item.key"
              class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900"
            >
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {{ item.label }}
                </p>
                <p class="text-xs text-gray-500 font-mono break-all">
                  {{ item.key }}
                </p>
                <p v-if="perYardNote(item)" class="text-xs text-gray-500">
                  {{ perYardNote(item) }}
                </p>
              </div>
              <span class="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {{ formatValue(item.value) }}
              </span>
            </div>
          </div>
        </div>
        <div
          v-if="!groupedSettings.length"
          class="px-4 py-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
        >
          No scoring settings were found for this league.
        </div>
      </div>

      <div
        class="border border-gray-200 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Raw JSON
            </p>
            <p class="text-xs text-gray-500">
              Matches the scoring_settings object returned by Sleeper.
            </p>
          </div>
          <span
            class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-100"
          >
            Ready to copy
          </span>
        </div>
        <pre
          class="overflow-x-auto p-4 text-sm text-gray-800 bg-white font-mono dark:bg-black dark:text-gray-100"
        ><code>{{ formattedJson }}</code></pre>
      </div>
    </div>
  </div>
</template>
