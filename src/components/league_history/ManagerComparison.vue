<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getLeagueKey, useStore } from "../../store/store";
import Card from "../ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import type { ManagerArchetype } from "@/lib/narratives";
import {
  generateManagerComparison,
  type ManagerComparisonPayload,
} from "@/api/api";
import { Button } from "@/components/ui/button";
import { useSubscriptionStore } from "@/store/subscription";
import { trackPremiumFunnelEvent } from "@/lib/analytics";
import { renderMarkdown } from "@/lib/markdown";
import { getChartTheme, getChartTooltipTheme } from "@/lib/chartTheme";
import { getRivalryReportPairKey } from "@/lib/rivalryReport";

const store = useStore();
const subscriptionStore = useSubscriptionStore();
const manager1 = ref("");
const manager2 = ref("");
const isGeneratingReport = ref(false);
const generatedReport = ref("");
const generationError = ref("");
type PointSeasonEntry = {
  season: string;
  points: number[];
};

type ComparisonManager = {
  id: string;
  name: string;
  username: string;
  avatarImg?: string;
  matchups: (number | null)[];
  pointsArr: number[];
  leagueWinner: (number | null)[];
  rosterId: number;
  pointSeason: PointSeasonEntry[];
  wins: number;
  losses: number;
  points: number;
  randomScheduleWins: number;
  managerEfficiency: number;
  seasons: string[];
};

const emptyManager: ComparisonManager = {
  id: "",
  name: "",
  username: "",
  avatarImg: "",
  matchups: [],
  pointsArr: [],
  leagueWinner: [],
  rosterId: 0,
  pointSeason: [{ season: "", points: [] }],
  wins: 0,
  losses: 0,
  points: 0,
  randomScheduleWins: 0,
  managerEfficiency: 0,
  seasons: [""],
};

const props = defineProps<{
  tableData: ComparisonManager[];
  managerArchetypes?: ManagerArchetype[];
}>();

const managers = computed(() => {
  return props.tableData.map((user) =>
    store.showUsernames ? user.username : user.name
  );
});

const currentManager1 = computed<ComparisonManager>(() => {
  return (
    props.tableData.find((user) =>
      store.showUsernames
        ? user.username.trim() === manager1.value.trim()
        : user.name.trim() === manager1.value.trim()
    ) ??
    props.tableData[0] ??
    emptyManager
  );
});

const currentManager2 = computed<ComparisonManager>(() => {
  return (
    props.tableData.find((user) =>
      store.showUsernames
        ? user.username.trim() === manager2.value.trim()
        : user.name.trim() === manager2.value.trim()
    ) ??
    props.tableData[0] ??
    emptyManager
  );
});

const matchupRecord = computed(() => {
  if (currentManager1.value.id === currentManager2.value.id) return "0-0";
  let wins = 0;
  let losses = 0;
  const minLength = Math.min(
    currentManager1.value.matchups.length,
    currentManager2.value.matchups.length
  );
  const matchups = [];

  for (let i = 0; i < minLength; i++) {
    if (
      currentManager1.value.matchups[i] !== null &&
      currentManager1.value.matchups[i] === currentManager2.value.matchups[i]
    ) {
      matchups.push(i);
    }
  }

  matchups.forEach((matchup: number) => {
    if (
      currentManager1.value.pointsArr[matchup] >
      currentManager2.value.pointsArr[matchup]
    ) {
      wins += 1;
    } else {
      losses += 1;
    }
  });
  return `${wins}-${losses}`;
});

const matchupRecord2 = computed(() => {
  if (currentManager1.value.id === currentManager2.value.id) return "0-0";
  let wins = 0;
  let losses = 0;
  const minLength = Math.min(
    currentManager1.value.matchups.length,
    currentManager2.value.matchups.length
  );
  const matchups = [];

  for (let i = 0; i < minLength; i++) {
    if (
      currentManager1.value.matchups[i] !== null &&
      currentManager1.value.matchups[i] === currentManager2.value.matchups[i]
    ) {
      matchups.push(i);
    }
  }

  matchups.forEach((matchup: number) => {
    if (
      currentManager1.value.pointsArr[matchup] >
      currentManager2.value.pointsArr[matchup]
    ) {
      wins += 1;
    } else {
      losses += 1;
    }
  });
  return `${losses}-${wins}`;
});

const manager1Champs = computed(() => {
  return (
    currentManager1.value.leagueWinner.filter(
      (item: number | null) => item === currentManager1.value.rosterId
    ).length >
    currentManager2.value.leagueWinner.filter(
      (item: number | null) => item === currentManager2.value.rosterId
    ).length
  );
});

const manager2Champs = computed(() => {
  return (
    currentManager2.value.leagueWinner.filter(
      (item: number | null) => item === currentManager2.value.rosterId
    ).length >
    currentManager1.value.leagueWinner.filter(
      (item: number | null) => item === currentManager1.value.rosterId
    ).length
  );
});

const getDisplayName = (manager: ComparisonManager) =>
  store.showUsernames ? manager.username : manager.name;

const getChampionships = (manager: ComparisonManager) =>
  manager.leagueWinner.filter(
    (item: number | null) => item === manager.rosterId
  ).length;

const getPointsPerGame = (manager: ComparisonManager) =>
  manager.wins + manager.losses > 0
    ? manager.points / (manager.wins + manager.losses)
    : 0;

const formatPoints = (points: number) => String(Number(points.toFixed(2)));

const getAverageEfficiency = (manager: ComparisonManager) =>
  manager.seasons.length > 0
    ? manager.managerEfficiency / manager.seasons.length
    : 0;

const getManagerArchetype = (manager: ComparisonManager) =>
  props.managerArchetypes?.find(
    (archetype) =>
      archetype.userId === manager.id ||
      archetype.displayName.trim() === manager.name.trim() ||
      archetype.displayName.trim() === manager.username.trim()
  );

const manager1Archetype = computed(() =>
  getManagerArchetype(currentManager1.value)
);

const manager2Archetype = computed(() =>
  getManagerArchetype(currentManager2.value)
);

const getManagerPayload = (
  manager: ComparisonManager,
  archetype?: ManagerArchetype
) => ({
  displayName: getDisplayName(manager),
  seasons: manager.seasons,
  championships: getChampionships(manager),
  record: {
    wins: manager.wins,
    losses: manager.losses,
  },
  scoring: {
    totalPoints: Number(manager.points.toFixed(2)),
    pointsPerGame: Number(getPointsPerGame(manager).toFixed(2)),
    recentScoresBySeason: manager.pointSeason,
  },
  lineupEfficiency: {
    averageManagerEfficiency: Number(getAverageEfficiency(manager).toFixed(4)),
  },
  managementStyle: {
    totalTrades: archetype?.totalTrades ?? null,
    tradeValueGained: archetype?.tradeValueGained ?? null,
    totalWaivers: archetype?.totalWaivers ?? null,
    averageDraftPickRank: archetype?.averageDraftPickRank ?? null,
    playoffAppearances: archetype?.playoffAppearances ?? null,
    weeklyScoreStdDev: archetype?.weeklyScoreStdDev ?? null,
  },
});

const currentLeagueId = computed(
  () => store.currentLeague?.leagueId ?? store.currentLeagueId
);

const currentLeagueKey = computed(() =>
  store.currentLeague
    ? getLeagueKey(store.currentLeague)
    : store.currentLeagueId
);

const rivalryReportPairKey = computed(() => {
  const managerOneId = currentManager1.value.id;
  const managerTwoId = currentManager2.value.id;
  if (!managerOneId || !managerTwoId) return null;

  return getRivalryReportPairKey([managerOneId, managerTwoId]);
});

const rivalryReportSelectionKey = computed(() => {
  const leagueKey = currentLeagueKey.value;
  const pairKey = rivalryReportPairKey.value;
  if (!leagueKey || !pairKey) return null;

  return `${encodeURIComponent(leagueKey)}:${pairKey}`;
});

const isSavedRivalryReport = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const loadSavedRivalryReport = () => {
  const pairKey = rivalryReportPairKey.value;
  generatedReport.value = "";
  generationError.value = "";
  if (!pairKey) return;

  const savedReport = store.currentLeague?.rivalryReports?.[pairKey];
  generatedReport.value = isSavedRivalryReport(savedReport)
    ? savedReport
    : "";
};

const aiComparisonPayload = computed<ManagerComparisonPayload>(() => ({
  managers: [
    getManagerPayload(currentManager1.value, manager1Archetype.value),
    getManagerPayload(currentManager2.value, manager2Archetype.value),
  ],
  headToHead: {
    [getDisplayName(currentManager1.value)]: matchupRecord.value,
    [getDisplayName(currentManager2.value)]: matchupRecord2.value,
  },
}));

const lockedReportPreview = computed(() => {
  const managerOne = getDisplayName(currentManager1.value) || "Manager A";
  const managerTwo = getDisplayName(currentManager2.value) || "Manager B";

  return `**${managerOne}** and **${managerTwo}** have the kind of rivalry that makes the standings feel personal. One manager owns the cleaner long-term resume, but the other keeps hanging around with enough weekly spike scores and matchup weirdness to make every head-to-head feel unstable. The real story is not just who has more wins. It is whether consistency, roster aggression, and late-season timing have actually translated into bragging rights when these two are staring at each other across the schedule.`;
});

const visibleReport = computed(() =>
  subscriptionStore.isPremium
    ? generatedReport.value
    : lockedReportPreview.value
);

const renderedReport = computed(() => renderMarkdown(visibleReport.value));

const generateAiReport = async () => {
  if (!subscriptionStore.isPremium || generatedReport.value) {
    return;
  }

  if (!currentLeagueId.value) {
    generationError.value = "League ID is required to generate a report.";
    return;
  }

  if (!import.meta.env.VITE_MANAGER_COMPARISON) {
    generationError.value = "Missing VITE_MANAGER_COMPARISON configuration.";
    return;
  }

  try {
    isGeneratingReport.value = true;
    generationError.value = "";
    const leagueKey = currentLeagueKey.value;
    const pairKey = rivalryReportPairKey.value;
    const selectionKey = rivalryReportSelectionKey.value;
    const result = await generateManagerComparison(
      currentLeagueId.value,
      aiComparisonPayload.value
    );
    if (leagueKey && pairKey && isSavedRivalryReport(result.text)) {
      store.addRivalryReport(leagueKey, pairKey, result.text);
    }
    if (selectionKey === rivalryReportSelectionKey.value) {
      generatedReport.value = result.text;
    }
  } catch (error) {
    generationError.value =
      error instanceof Error
        ? error.message
        : "Unable to generate manager comparison.";
  } finally {
    isGeneratingReport.value = false;
  }
};

const seriesData = computed(() => {
  return [
    {
      name: store.showUsernames
        ? currentManager1.value.username
        : currentManager1.value.name,
      data:
        currentManager1.value.pointSeason[0].points.length > 0
          ? currentManager1.value.pointSeason[0].points
          : currentManager1.value.pointSeason[1]
            ? currentManager1.value.pointSeason[1].points
            : [],
    },
    {
      name: store.showUsernames
        ? currentManager2.value.username
        : currentManager2.value.name,
      data:
        currentManager2.value.pointSeason[0].points.length > 0
          ? currentManager2.value.pointSeason[0].points
          : currentManager2.value.pointSeason[1]
            ? currentManager2.value.pointSeason[1].points
            : [],
    },
  ];
});

watch(
  managers,
  (newManagers) => {
    if (newManagers.length) {
      manager1.value = newManagers[0];
      manager2.value = newManagers[1];
    }
  },
  { immediate: true }
);

watch(
  rivalryReportSelectionKey,
  () => {
    loadSavedRivalryReport();
  },
  { immediate: true }
);

watch([() => store.currentLeagueId, () => store.darkMode], () =>
  updateChartColor()
);

const updateChartColor = () => {
  chartOptions.value = {
    ...chartOptions.value,
    chart: {
      height: 350,
      foreColor: getChartTheme().foreground,
      type: "line",
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      animations: {
        enabled: false,
      },
    },
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-2))"],
    tooltip: {
      theme: getChartTooltipTheme(store.darkMode),
    },
    dataLabels: {
      enabled: true,
    },
    stroke: {
      curve: "smooth",
    },
    grid: {
      borderColor: "hsl(var(--border))",
      row: {
        colors: store.darkMode
          ? ["hsl(var(--muted))", "transparent"]
          : ["hsl(var(--muted))", "transparent"],
        opacity: 0.5,
      },
    },
    markers: {
      size: 1,
    },
    xaxis: {
      title: {
        text: "Week",
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      title: {
        text: "Points",
        style: {
          fontSize: "16px",
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
          fontWeight: 600,
        },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      floating: true,
      offsetY: -25,
      offsetX: -5,
    },
  };
};

const chartOptions = ref({
  chart: {
    height: 350,
    foreColor: getChartTheme().foreground,
    type: "line",
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
    animations: {
      enabled: false,
    },
  },
  colors: ["hsl(var(--chart-1))", "hsl(var(--chart-2))"],
  tooltip: {
    theme: getChartTooltipTheme(store.darkMode),
  },
  dataLabels: {
    enabled: true,
  },
  stroke: {
    curve: "smooth",
  },
  grid: {
    borderColor: "hsl(var(--border))",
    row: {
      colors: store.darkMode
        ? ["hsl(var(--muted))", "transparent"]
        : ["hsl(var(--muted))", "transparent"],
      opacity: 0.5,
    },
  },
  markers: {
    size: 1,
  },
  xaxis: {
    title: {
      text: "Week",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    title: {
      text: "Points",
      style: {
        fontSize: "16px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
    floating: true,
    offsetY: -25,
    offsetX: -5,
  },
});
</script>

<template>
  <Card v-if="manager1 && manager2" class="w-full p-4 md:p-6">
    <h5 class="mb-4 text-2xl font-semibold tracking-tight">
      Manager Comparison
    </h5>
    <div class="relative overflow-x-auto rounded-lg">
      <table class="w-full min-w-[648px] text-sm text-left rtl:text-right">
        <thead class="text-xs uppercase bg-muted/50">
          <tr>
            <th scope="col" class="px-4 py-3 sm:px-6">Name</th>
            <th scope="col" class="px-3 py-3 sm:px-6">
              <div class="flex mt-1 ml-0 lg:ml-20">
                <img
                  alt="User avatar"
                  v-if="currentManager1.avatarImg"
                  class="w-8 h-8 rounded-full"
                  :src="currentManager1.avatarImg"
                  @error="handleImageError"
                />
                <svg
                  v-else
                  class="w-8 h-8"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <Select v-model="manager1">
                  <SelectTrigger class="ml-2 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="manager in managers"
                      :key="manager"
                      :value="manager"
                    >
                      {{ manager }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
            <th scope="col" class="px-3 py-3 sm:px-6">
              <div class="flex mt-1 ml-0 lg:ml-20">
                <img
                  alt="User avatar"
                  v-if="currentManager2.avatarImg"
                  class="w-8 h-8 rounded-full"
                  :src="currentManager2.avatarImg"
                  @error="handleImageError"
                />
                <svg
                  v-else
                  class="w-8 h-8"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                  />
                </svg>
                <Select v-model="manager2">
                  <SelectTrigger class="ml-2 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="manager in managers"
                      :key="manager"
                      :value="manager"
                    >
                      {{ manager }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b">
            <th
              scope="row"
              class="px-4 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Championships
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary': manager1Champs,
              }"
            >
              <p class="text-center">
                {{
                  currentManager1.leagueWinner.filter(
                    (item: number | null) => item === currentManager1.rosterId
                  ).length
                }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary': manager2Champs,
              }"
            >
              <p class="text-center">
                {{
                  currentManager2.leagueWinner.filter(
                    (item: number | null) => item === currentManager2.rosterId
                  ).length
                }}
              </p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Record
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.wins /
                    (currentManager1.losses + currentManager1.wins) >
                  currentManager2.wins /
                    (currentManager2.losses + currentManager2.wins),
              }"
            >
              <p class="text-center">
                {{ `${currentManager1.wins}-${currentManager1.losses}` }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.wins /
                    (currentManager1.losses + currentManager1.wins) <
                  currentManager2.wins /
                    (currentManager2.losses + currentManager2.wins),
              }"
            >
              <p class="text-center">
                {{ `${currentManager2.wins}-${currentManager2.losses}` }}
              </p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Total points
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points > currentManager2.points,
              }"
            >
              <p class="text-center">
                {{ formatPoints(currentManager1.points) }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points < currentManager2.points,
              }"
            >
              <p class="text-center">
                {{ formatPoints(currentManager2.points) }}
              </p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Points per game
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points /
                    (currentManager1.wins + currentManager1.losses) >
                  currentManager2.points /
                    (currentManager2.wins + currentManager2.losses),
              }"
            >
              <p class="text-center">
                {{
                  currentManager1.wins + currentManager1.losses > 0
                    ? Math.round(
                        (currentManager1.points /
                          (currentManager1.wins + currentManager1.losses)) *
                          100
                      ) / 100
                    : 0
                }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.points /
                    (currentManager1.wins + currentManager1.losses) <
                  currentManager2.points /
                    (currentManager2.wins + currentManager2.losses),
              }"
            >
              <p class="text-center">
                {{
                  Math.round(
                    (currentManager2.points /
                      (currentManager2.wins + currentManager2.losses)) *
                      100
                  ) / 100
                }}
              </p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Wins above expected
            </th>
            <td class="px-3 py-4 sm:px-6">
              <p class="text-center">
                {{
                  (
                    currentManager1.wins - currentManager1.randomScheduleWins
                  ).toFixed(2)
                }}
              </p>
            </td>
            <td class="px-3 py-4 sm:px-6">
              <p class="text-center">
                {{
                  (
                    currentManager2.wins - currentManager2.randomScheduleWins
                  ).toFixed(2)
                }}
              </p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              Manager efficiency
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.managerEfficiency /
                    currentManager1.seasons.length >
                  currentManager2.managerEfficiency /
                    currentManager2.seasons.length,
              }"
            >
              <p class="text-center">
                {{
                  (
                    (currentManager1.managerEfficiency /
                      currentManager1.seasons.length) *
                    100
                  ).toFixed(1)
                }}%
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  currentManager1.managerEfficiency /
                    currentManager1.seasons.length <
                  currentManager2.managerEfficiency /
                    currentManager2.seasons.length,
              }"
            >
              <p class="text-center">
                {{
                  (
                    (currentManager2.managerEfficiency /
                      currentManager2.seasons.length) *
                    100
                  ).toFixed(1)
                }}%
              </p>
            </td>
          </tr>
          <tr class="border-b">
            <th
              scope="row"
              class="px-3 py-4 font-medium sm:px-6 whitespace-nowrap"
            >
              H2H
            </th>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold text-primary':
                  Number(matchupRecord[0]) > Number(matchupRecord2[0]),
              }"
            >
              <p class="text-center">
                {{ matchupRecord }}
              </p>
            </td>
            <td
              class="px-3 py-4 sm:px-6"
              :class="{
                'font-semibold':
                  Number(matchupRecord[0]) < Number(matchupRecord2[0]),
              }"
            >
              <p class="text-center">
                {{ matchupRecord2 }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="p-4 mt-4 border-b sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xl font-semibold tracking-tight">Rivalry Report</p>
        </div>
        <Button
          v-if="subscriptionStore.isPremium"
          :disabled="isGeneratingReport || Boolean(generatedReport)"
          @click="generateAiReport"
        >
          {{
            isGeneratingReport
              ? "Generating..."
              : generatedReport
                ? "Report generated"
                : "Generate report"
          }}
        </Button>
      </div>
      <div v-if="subscriptionStore.isPremium">
        <p v-if="generationError" class="mt-3 text-sm text-destructive">
          {{ generationError }}
        </p>
        <div
          v-if="generatedReport"
          v-html="renderedReport"
          class="rivalry-report mt-4 max-w-[86ch] text-base leading-7 text-foreground/90 dark:text-foreground/85"
        ></div>
        <p
          v-else-if="!generationError"
          class="mt-3 max-w-[60ch] leading-7 text-muted-foreground"
        >
          Generate a comparison using the selected managers' performance
          throughout every season.
        </p>
      </div>
      <div v-else class="mt-3 max-w-[86ch]">
        <p
          class="mb-4 max-w-[60ch] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7"
        >
          Premium rivalry reports turn the manager comparison into a
          personalized short story about the selected managers' history, style,
          and bragging rights.
        </p>
        <div
          class="relative p-4 mt-3 overflow-hidden border max-h-48 rounded-card sm:p-5"
        >
          <div
            v-html="renderedReport"
            class="text-base leading-7 rivalry-report text-foreground/90 dark:text-foreground/85"
          ></div>
          <div
            class="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background via-background/95 to-transparent"
          ></div>
          <div class="absolute inset-x-0 z-10 flex justify-center bottom-5">
            <Button class="mt-4" as-child>
              <router-link
                :to="{
                  path: '/account',
                  query: {
                    ...$route.query,
                    intent: 'rivalry_report',
                    upgrade_source: 'manager_comparison',
                  },
                }"
                @click="
                  trackPremiumFunnelEvent('premium_cta_clicked', {
                    cta: 'unlock_rivalry_reports',
                    feature: 'rivalry_report',
                    source: 'manager_comparison',
                  });
                  store.currentTab = '';
                "
              >
                Unlock Rivalry Reports
              </router-link>
            </Button>
          </div>
        </div>
      </div>
    </div>
    <p class="mt-4 mb-8 ml-3 text-lg font-semibold sm:ml-6 sm:mb-0">
      Recent Performances
    </p>
    <apexchart
      class="mt-4"
      type="line"
      height="350"
      :options="chartOptions"
      :series="seriesData"
    ></apexchart>
  </Card>
</template>

<style scoped>
.rivalry-report :deep(p) {
  margin: 0;
}

.rivalry-report :deep(p + p) {
  margin-top: 1rem;
}

.rivalry-report :deep(h1),
.rivalry-report :deep(h2),
.rivalry-report :deep(h3) {
  margin: 1.5rem 0 0.625rem;
  color: hsl(var(--foreground));
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.015em;
}

.rivalry-report :deep(h1:first-child),
.rivalry-report :deep(h2:first-child),
.rivalry-report :deep(h3:first-child) {
  margin-top: 0;
}

.rivalry-report :deep(h1) {
  font-size: 1.375rem;
}

.rivalry-report :deep(h2),
.rivalry-report :deep(h3) {
  font-size: 1.125rem;
}

.rivalry-report :deep(strong) {
  color: hsl(var(--foreground));
  font-weight: 700;
}

.rivalry-report :deep(ul),
.rivalry-report :deep(ol) {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.rivalry-report :deep(ul) {
  list-style: disc;
}

.rivalry-report :deep(ol) {
  list-style: decimal;
}

.rivalry-report :deep(li + li) {
  margin-top: 0.375rem;
}

.rivalry-report :deep(blockquote) {
  margin: 1rem 0;
  border-left: 3px solid hsl(var(--border));
  padding-left: 1rem;
  color: hsl(var(--muted-foreground));
}

.rivalry-report :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
