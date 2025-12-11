<script setup lang="ts">
import { computed, ref } from "vue";
import { LeagueInfoType, TableDataType } from "../../types/types";
import { useStore } from "../../store/store";
import PayoutTracker from "./PayoutTracker.vue";

const props = defineProps<{
  league?: LeagueInfoType;
  tableData?: TableDataType[];
}>();

const store = useStore();

const league = computed(() => {
  if (props.league) return props.league;
  if (store.currentLeagueId) {
    return store.leagueInfo[store.currentLeagueIndex];
  }
  return null;
});

const scoringLabel = computed(() => {
  if (!league.value) return "—";
  const scoring = league.value.scoringType;
  if (scoring === 0) return "Standard";
  if (scoring === 0.5) return "Half-PPR";
  if (scoring === 1) return "PPR";
  return `${scoring} scoring`;
});

const playoffType = computed(() => {
  if (!league.value) return "—";
  if (league.value.playoffType === 0) return "Standard Bracket";
  if (league.value.playoffType === 1) return "Losers Bracket";
  return "Custom";
});

const waiverType = computed(() => {
  if (!league.value) return "—";
  if (league.value.waiverType === 0) return "Rolling / Reverse Standings";
  if (league.value.waiverType === 1) return "FAAB";
  return "Unknown";
});

const rosterCounts = computed(() => {
  if (!league.value?.rosterPositions) return [];
  const counts: Record<string, number> = {};
  league.value.rosterPositions.forEach((pos: string) => {
    counts[pos] = (counts[pos] || 0) + 1;
  });
  return Object.entries(counts).map(([pos, count]) => ({ pos, count }));
});

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
  // Kicking
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

const scoringEntries = computed(() => {
  if (!league.value?.scoringSettings) return [];
  return Object.entries(league.value.scoringSettings);
});

const groupedScoring = computed(() => {
  const groups: Record<
    string,
    { key: string; label: string; value: number; note?: string }[]
  > = {};

  scoringEntries.value.forEach(([key, value]) => {
    const meta = scoringMapping[key] || {
      group: "Other",
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    };
    const numericValue = typeof value === "number" ? value : Number(value);
    if (meta.group === "Other" && Number(numericValue) === 0) return;
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

const formatValue = (value: number) => {
  if (Number.isInteger(value)) return value;
  return Number(value.toFixed(3));
};

const perYardNote = (item: { note?: string; value: number }) => {
  if (item.note !== "points per yard" || !item.value) return "";
  const yardsPerPoint = Number((1 / item.value).toFixed(2));
  return `1 point every ${yardsPerPoint} yards`;
};

const showRosterSettings = ref(false);
const showScoringDetails = ref(false);

const safeWeekValue = (week?: number | null) =>
  typeof week === "number" && week > 0 ? week : null;

const derivedWeekFromTable = computed(() => {
  if (!props.tableData?.length) return null;
  const weekCounts = props.tableData.map((team) => team.points?.length || 0);
  const maxWeeks = Math.max(...weekCounts);
  return maxWeeks > 0 ? maxWeeks : null;
});

const currentWeekNumber = computed(() => {
  const fromCurrent = safeWeekValue(league.value?.currentWeek);
  if (fromCurrent) return fromCurrent;
  const fromLastScored = safeWeekValue(league.value?.lastScoredWeek);
  if (fromLastScored) return fromLastScored;
  return derivedWeekFromTable.value;
});

const currentWeekText = computed(() =>
  currentWeekNumber.value ? `Week ${currentWeekNumber.value}` : "—"
);

const playoffRoundLabel = computed(() => {
  const week = currentWeekNumber.value;
  const regularWeeks =
    league.value?.regularSeasonLength && league.value.regularSeasonLength > 0
      ? league.value.regularSeasonLength
      : 14;
  if (!week) return "";
  if (week <= regularWeeks) {
    if (league.value?.status === "post_season" || league.value?.status === "complete") {
      return "Playoffs";
    }
    return "";
  }
  const roundIndex = week - regularWeeks;
  const roundNames: Record<number, string> = {
    1: "Quarterfinals",
    2: "Semifinals",
    3: "Championship",
    4: "Championship",
  };
  return roundNames[roundIndex] || "Playoffs";
});
</script>

<template>
  <div class="mt-4">
    <div v-if="!league" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      Add a league to view its overview.
    </div>
    <div v-else class="space-y-4">
      <div
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr"
      >
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            League
          </p>
          <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ league.name }}
          </p>
          <p class="text-sm text-gray-500">
            {{ league.seasonType }} • {{ league.season }}
          </p>
        </div>
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Teams & Season
          </p>
          <p class="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {{ league.totalRosters }}
          </p>
          <p class="text-sm text-gray-500">
            Regular season {{ league.regularSeasonLength }} weeks
          </p>
        </div>
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Scoring
          </p>
          <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ scoringLabel }}
          </p>
          <p class="text-sm text-gray-500">
            Median scoring: {{ league.medianScoring ? "On" : "Off" }}
          </p>
        </div>
        <div
          class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase">
            Playoffs & Waivers
          </p>
          <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {{ league.playoffTeams }} teams • {{ playoffType }}
          </p>
          <p class="text-sm text-gray-500">Waivers: {{ waiverType }}</p>
        </div>
      </div>

      <div
        class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
          role="button"
          tabindex="0"
          @click="showRosterSettings = !showRosterSettings"
          @keyup.enter.space.prevent="showRosterSettings = !showRosterSettings"
        >
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Roster & lineup settings
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              Slot counts and lineup requirements
            </p>
          </div>
          <!-- <span
            class="px-3 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-200"
          >
            {{ league.rosterPositions?.length || 0 }} slots
          </span> -->
          <span class="ml-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
            {{ showRosterSettings ? "Hide" : "Show" }}
          </span>
        </div>
        <div
          v-if="showRosterSettings"
          class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4"
        >
          <div
            v-for="slot in rosterCounts"
            :key="slot.pos"
            class="flex items-center justify-between px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <span class="font-semibold text-gray-800 dark:text-gray-100">
              {{ slot.pos }}
            </span>
            <span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200">
              ×{{ slot.count }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-900 dark:border-gray-700"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
          role="button"
          tabindex="0"
          @click="showScoringDetails = !showScoringDetails"
          @keyup.enter.space.prevent="showScoringDetails = !showScoringDetails"
        >
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Scoring details
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              Grouped by category; uses league scoring_settings.
            </p>
          </div>
          <!-- <span
            class="px-3 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-200"
          >
            {{ scoringEntries.length }} settings
          </span> -->
          <span class="ml-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
            {{ showScoringDetails ? "Hide" : "Show" }}
          </span>
        </div>
        <div v-if="showScoringDetails" class="p-4 space-y-3">
          <div
            v-for="group in groupedScoring"
            :key="group.name"
            class="border border-gray-200 rounded-lg dark:border-gray-700"
          >
            <div
              class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700"
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
                class="flex items-center justify-between px-3 py-3 bg-white dark:bg-gray-900"
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
            v-if="!groupedScoring.length"
            class="px-4 py-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
          >
            No scoring settings were found for this league.
          </div>
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
              Status
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-300">
              League state and last scored week
            </p>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Current status
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-50">
              {{ league.status || "—" }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Last scored week
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-gray-50">
              {{ league.lastScoredWeek ?? "—" }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase">
              Current week
            </p>
            <div class="mt-1 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
              <span>{{ currentWeekText }}</span>
              <span
                v-if="playoffRoundLabel"
                class="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 text-indigo-800 rounded-full dark:bg-indigo-900 dark:text-indigo-100"
              >
                {{ playoffRoundLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <PayoutTracker :league="league || undefined" :tableData="props.tableData" />
    </div>
  </div>
</template>
