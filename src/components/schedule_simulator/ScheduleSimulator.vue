<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import { useStore } from "../../store/store";
import { recordPoints } from "./seasonSimulation";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getManagerDisplayName } from "@/lib/manager";
import { getChartTheme, getChartTooltipTheme } from "@/lib/chartTheme";
import { useSeasonForecast } from "./useSeasonForecast";
import { useSeasonReplay } from "./useSeasonReplay";
import {
  buildActualStandings,
  buildMatchupsByWeek,
  calculateSimulatedStandings,
  calculateWeeklyMedians,
  createOpponentMatrix,
  runScheduleMonteCarlo,
  shuffleScheduleWeeks,
  swapTeamSchedules,
  type SimulatedTeamRecord,
} from "./scheduleScenarios";

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();
const tableData = computed(() => props.tableData);
const simulatedOpponents = ref<(number | null)[][]>([]);
const selectedWeekValue = ref("week-1");
const selectedSwapTeamAValue = ref("0");
const selectedSwapTeamBValue = ref("1");
const selectedVolatilityTeamValue = ref("0");
const activeScenarioValue = ref("swap");
const activeDetailValue = ref("standings");
const activeToolValue = ref("season-simulation");
const monteCarloDistributions = ref<number[][]>([]);
const monteCarloSummaryByTeam = ref<
  Record<
    number,
    {
      mode: number;
      average: number;
      p10: number;
      p50: number;
      p90: number;
    }
  >
>({});
const monteCarloRunCount = ref(0);
const scenarioLabel = ref("Original schedule");

const dataWeekCount = computed(() => {
  return Math.max(...props.tableData.map((team) => team.points?.length), 0);
});

const usesMedianScoring = computed(() => {
  return store.currentLeague?.medianScoring === 1;
});

const recordWeekCount = computed(() => {
  const resultCount = Math.max(
    ...props.tableData.map((team) => team.recordByWeek?.length ?? 0),
    0
  );
  return usesMedianScoring.value ? Math.floor(resultCount / 2) : resultCount;
});

const displayedWeekCount = computed(() => {
  const league = store.currentLeague;
  const regularSeasonLength =
    league?.regularSeasonLength || dataWeekCount.value;
  const lastScoredWeek = league?.lastScoredWeek || 0;
  const isActiveLeague =
    league?.status === "pre_draft" ||
    league?.status === "drafting" ||
    league?.status === "in_season";
  const completedWeeks = isActiveLeague
    ? Math.max(recordWeekCount.value, lastScoredWeek)
    : recordWeekCount.value ||
      (lastScoredWeek > 0 ? lastScoredWeek : dataWeekCount.value);

  if (isActiveLeague) {
    return Math.min(regularSeasonLength, completedWeeks);
  }

  if (regularSeasonLength > 0 && completedWeeks > 0) {
    return Math.min(regularSeasonLength, completedWeeks);
  }

  return regularSeasonLength;
});

const regularSeasonWeekCount = computed(() => {
  const configured = store.currentLeague?.regularSeasonLength || 0;
  return Math.max(configured, displayedWeekCount.value);
});

const remainingWeekCount = computed(() =>
  Math.max(regularSeasonWeekCount.value - displayedWeekCount.value, 0)
);

const seasonSimulationTabLabel = "Season Forecast";

const weeklyMedians = computed(() =>
  calculateWeeklyMedians(props.tableData, displayedWeekCount.value)
);

const teamName = (team: TableDataType) => {
  return getManagerDisplayName(team, store.showUsernames);
};

const originalOpponents = computed(() =>
  createOpponentMatrix(props.tableData, displayedWeekCount.value)
);
const fullSeasonOpponents = computed(() =>
  createOpponentMatrix(props.tableData, regularSeasonWeekCount.value)
);

const resetSimulation = () => {
  simulatedOpponents.value = originalOpponents.value.map((teamWeeks) => [
    ...teamWeeks,
  ]);
  scenarioLabel.value = "Original schedule";
};

watch(
  [() => props.tableData, displayedWeekCount],
  () => {
    resetSimulation();
    runMonteCarloDistribution();
  },
  { immediate: true, deep: true }
);

watch(
  displayedWeekCount,
  (count) => {
    if (count <= 0) {
      selectedWeekValue.value = "week-1";
      return;
    }
    const weekNumber = Number(selectedWeekValue.value.replace("week-", ""));
    if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > count) {
      selectedWeekValue.value = "week-1";
    }
  },
  { immediate: true }
);

watch(
  () => props.tableData.length,
  (count) => {
    if (count <= 0) {
      selectedSwapTeamAValue.value = "0";
      selectedSwapTeamBValue.value = "1";
      selectedVolatilityTeamValue.value = "0";
      return;
    }
    const teamAIndex = Number(selectedSwapTeamAValue.value);
    const teamBIndex = Number(selectedSwapTeamBValue.value);
    const volatilityTeamIndex = Number(selectedVolatilityTeamValue.value);
    if (
      !Number.isFinite(teamAIndex) ||
      teamAIndex < 0 ||
      teamAIndex > count - 1
    ) {
      selectedSwapTeamAValue.value = "0";
    }
    if (
      !Number.isFinite(teamBIndex) ||
      teamBIndex < 0 ||
      teamBIndex > count - 1 ||
      teamBIndex === Number(selectedSwapTeamAValue.value)
    ) {
      selectedSwapTeamBValue.value = String(Math.min(1, count - 1));
    }
    if (
      !Number.isFinite(volatilityTeamIndex) ||
      volatilityTeamIndex < 0 ||
      volatilityTeamIndex > count - 1
    ) {
      selectedVolatilityTeamValue.value = "0";
    }
  },
  { immediate: true }
);

const matchupsByWeek = computed(() =>
  buildMatchupsByWeek({
    tableData: props.tableData,
    opponents: simulatedOpponents.value,
    originalOpponents: originalOpponents.value,
    weeks: displayedWeekCount.value,
  })
);

const selectedWeekData = computed(() => {
  return (
    matchupsByWeek.value.find(
      (week) => week.value === selectedWeekValue.value
    ) ||
    matchupsByWeek.value[0] || { week: 1, value: "week-1", rows: [] }
  );
});

const selectedWeekMatchups = computed(() => {
  return selectedWeekData.value.rows;
});

const simulatedStandings = computed<SimulatedTeamRecord[]>(() =>
  calculateSimulatedStandings({
    tableData: props.tableData,
    opponents: simulatedOpponents.value,
    weeks: displayedWeekCount.value,
    medianScoring: usesMedianScoring.value,
    weeklyMedians: weeklyMedians.value,
    teamName,
  })
);

const actualStandings = computed<SimulatedTeamRecord[]>(() =>
  buildActualStandings(props.tableData, teamName)
);

const seedAndPlayoffByTeam = computed(() => {
  const actualSeedByTeam = new Map<number, number>();
  const simulatedSeedByTeam = new Map<number, number>();

  actualStandings.value.forEach((team, index) => {
    actualSeedByTeam.set(team.index, index + 1);
  });
  simulatedStandings.value.forEach((team, index) => {
    simulatedSeedByTeam.set(team.index, index + 1);
  });

  return props.tableData.reduce(
    (acc, _, index) => {
      const actualSeed = actualSeedByTeam.get(index) ?? props.tableData.length;
      const simulatedSeed =
        simulatedSeedByTeam.get(index) ?? props.tableData.length;
      acc[index] = {
        actualSeed,
        simulatedSeed,
        seedDelta: actualSeed - simulatedSeed,
      };
      return acc;
    },
    {} as Record<
      number,
      {
        actualSeed: number;
        simulatedSeed: number;
        seedDelta: number;
      }
    >
  );
});

const standingsWithSeedDelta = computed(() => {
  return simulatedStandings.value.map((team) => ({
    ...team,
    ...seedAndPlayoffByTeam.value[team.index],
    actualWins: props.tableData[team.index]?.wins ?? 0,
    actualLosses: props.tableData[team.index]?.losses ?? 0,
    actualTies: props.tableData[team.index]?.ties ?? 0,
  }));
});

const teamOptions = computed(() => {
  return props.tableData.map((team, index) => ({
    value: String(index),
    label: teamName(team),
  }));
});

const weekOptions = computed(() => {
  return Array.from({ length: displayedWeekCount.value }, (_, index) => ({
    value: `week-${index + 1}`,
    label: `Week ${index + 1}`,
  }));
});

const selectedSwapTeamAIndex = computed(() => {
  const index = Number(selectedSwapTeamAValue.value);
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(index, 0), Math.max(props.tableData.length - 1, 0));
});

const selectedSwapTeamBIndex = computed(() => {
  const index = Number(selectedSwapTeamBValue.value);
  if (!Number.isFinite(index)) return Math.min(1, props.tableData.length - 1);
  return Math.min(Math.max(index, 0), Math.max(props.tableData.length - 1, 0));
});

const selectedVolatilityTeamIndex = computed(() => {
  const index = Number(selectedVolatilityTeamValue.value);
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(index, 0), Math.max(props.tableData.length - 1, 0));
});

const playoffCutoff = computed(() => {
  const playoffTeams = store.currentLeague?.playoffTeams || 0;
  if (playoffTeams > 0) {
    return Math.min(playoffTeams, props.tableData.length);
  }
  return Math.ceil(props.tableData.length / 2);
});

const scenarioImpactRows = computed(() => {
  return standingsWithSeedDelta.value.map((team) => {
    const actualMadePlayoffs = team.actualSeed <= playoffCutoff.value;
    const simulatedMadePlayoffs = team.simulatedSeed <= playoffCutoff.value;
    return {
      ...team,
      actualMadePlayoffs,
      simulatedMadePlayoffs,
      playoffChange:
        actualMadePlayoffs === simulatedMadePlayoffs
          ? "same"
          : simulatedMadePlayoffs
            ? "in"
            : "out",
    };
  });
});

const playoffMovementRows = computed(() => {
  return scenarioImpactRows.value.filter(
    (team) => team.playoffChange !== "same"
  );
});

type ScenarioImpactRow = (typeof scenarioImpactRows.value)[number];

const biggestSeedRise = computed<ScenarioImpactRow | undefined>(() => {
  const [first, ...rest] = scenarioImpactRows.value;
  if (!first) return undefined;
  return rest.reduce(
    (best, team) => (team.seedDelta > best.seedDelta ? team : best),
    first
  );
});

const biggestSeedFall = computed<ScenarioImpactRow | undefined>(() => {
  const [first, ...rest] = scenarioImpactRows.value;
  if (!first) return undefined;
  return rest.reduce(
    (worst, team) => (team.seedDelta < worst.seedDelta ? team : worst),
    first
  );
});

const biggestRecordSwing = computed<ScenarioImpactRow | undefined>(() => {
  const [first, ...rest] = scenarioImpactRows.value;
  if (!first) return undefined;
  return rest.reduce(
    (biggest, team) =>
      Math.abs(team.winDelta) > Math.abs(biggest.winDelta) ? team : biggest,
    first
  );
});

const impactScore = (team: ScenarioImpactRow) => {
  return team.winDelta * 10 + team.seedDelta;
};

const helpedMostTeam = computed<ScenarioImpactRow | undefined>(() => {
  const [first, ...rest] = scenarioImpactRows.value;
  if (!first) return undefined;
  return rest.reduce(
    (best, team) => (impactScore(team) > impactScore(best) ? team : best),
    first
  );
});

const hurtMostTeam = computed<ScenarioImpactRow | undefined>(() => {
  const [first, ...rest] = scenarioImpactRows.value;
  if (!first) return undefined;
  return rest.reduce(
    (worst, team) => (impactScore(team) < impactScore(worst) ? team : worst),
    first
  );
});

const impactTeamDetail = (team: ScenarioImpactRow | undefined) => {
  if (!team) return "No movement";
  const seedPart =
    team.seedDelta === 0
      ? "same seed"
      : team.seedDelta > 0
        ? `up ${team.seedDelta} seed${team.seedDelta === 1 ? "" : "s"}`
        : `down ${Math.abs(team.seedDelta)} seed${
            Math.abs(team.seedDelta) === 1 ? "" : "s"
          }`;
  return `${winDeltaText(team.winDelta)} wins, ${seedPart}`;
};

const scenarioCards = computed(() => {
  const rise = biggestSeedRise.value;
  const fall = biggestSeedFall.value;
  const swing = biggestRecordSwing.value;
  const biggestSeedMove =
    Math.abs(rise?.seedDelta ?? 0) >= Math.abs(fall?.seedDelta ?? 0)
      ? rise
      : fall;

  return [
    {
      label: "Playoff Line",
      value: String(playoffMovementRows.value.length),
      detail:
        playoffMovementRows.value.length === 1
          ? "team changes status"
          : "teams change status",
      tone:
        playoffMovementRows.value.length > 0
          ? "text-primary"
          : "text-muted-foreground",
    },
    {
      label: "Biggest Seed Move",
      value: biggestSeedMove ? seedDeltaText(biggestSeedMove.seedDelta) : "0",
      detail:
        biggestSeedMove && biggestSeedMove.seedDelta !== 0
          ? biggestSeedMove.name
          : "No seed change",
      tone:
        biggestSeedMove && biggestSeedMove.seedDelta > 0
          ? "text-primary"
          : biggestSeedMove && biggestSeedMove.seedDelta < 0
            ? "text-destructive"
            : "text-muted-foreground",
    },
    {
      label: "Record Swing",
      value:
        swing && swing.winDelta > 0
          ? `+${swing.winDelta.toFixed(1)}`
          : swing
            ? swing.winDelta.toFixed(1)
            : "0.0",
      detail: swing ? swing.name : "No record change",
      tone:
        swing && swing.winDelta > 0
          ? "text-primary"
          : swing && swing.winDelta < 0
            ? "text-destructive"
            : "text-muted-foreground",
    },
  ];
});

const cloneSimulatedOpponents = () => {
  const source =
    simulatedOpponents.value.length > 0
      ? simulatedOpponents.value
      : originalOpponents.value;
  return source.map((teamWeeks) => [...teamWeeks]);
};

const applyScenario = (nextOpponents: (number | null)[][], label: string) => {
  simulatedOpponents.value = nextOpponents;
  scenarioLabel.value = label;
};

const selectedWeekNumber = computed(() => {
  const weekNumber = Number(selectedWeekValue.value.replace("week-", ""));
  if (!Number.isFinite(weekNumber)) return 1;
  return Math.min(
    Math.max(weekNumber, 1),
    Math.max(displayedWeekCount.value, 1)
  );
});

const shuffleWeeks = (weekIndexes: number[], label: string) => {
  applyScenario(
    shuffleScheduleWeeks({
      opponents: cloneSimulatedOpponents(),
      originalOpponents: originalOpponents.value,
      weekIndexes,
    }),
    label
  );
};

const shuffleSelectedWeek = () => {
  shuffleWeeks(
    [selectedWeekNumber.value - 1],
    `Shuffled Week ${selectedWeekNumber.value}`
  );
};

const swapSelectedTeamSchedules = () => {
  const teamA = selectedSwapTeamAIndex.value;
  const teamB = selectedSwapTeamBIndex.value;
  if (teamA === teamB || props.tableData.length < 2) return;

  applyScenario(
    swapTeamSchedules(
      cloneSimulatedOpponents(),
      teamA,
      teamB,
      displayedWeekCount.value
    ),
    `${teamName(props.tableData[teamA])} swapped schedules with ${teamName(
      props.tableData[teamB]
    )}`
  );
};

const randomizeEntireSchedule = () => {
  const weeks = Array.from(
    { length: displayedWeekCount.value },
    (_, index) => index
  );
  shuffleWeeks(weeks, "Randomized full schedule");
};

const resetScenario = () => {
  resetSimulation();
};

const seedText = (seed: number) => {
  if (!Number.isFinite(seed)) return "-";
  return `#${seed}`;
};

const playoffStatusText = (change: string) => {
  if (change === "in") return "Made playoffs";
  if (change === "out") return "Missed playoffs";
  return "No change";
};

const playoffStatusClass = (change: string) => {
  if (change === "in") return "text-primary";
  if (change === "out") return "text-destructive";
  return "text-muted-foreground";
};

const seedDeltaText = (seedDelta: number) => {
  if (seedDelta > 0) return `+${seedDelta}`;
  return String(seedDelta);
};

const winDeltaText = (winDelta: number) => {
  if (winDelta > 0) return `+${winDelta.toFixed(1)}`;
  return winDelta.toFixed(1);
};

const monteCarloTeamSummaryRows = computed(() => {
  return props.tableData
    .map((team, index) => {
      const summary = monteCarloSummaryByTeam.value[index] || {
        mode: 0,
        average: 0,
        p10: 0,
        p50: 0,
        p90: 0,
      };
      return {
        index,
        name: teamName(team),
        actualWins: recordPoints(team.wins, team.ties ?? 0),
        ...summary,
        range: summary.p90 - summary.p10,
      };
    })
    .sort((a, b) => b.range - a.range);
});

const selectedVolatilitySeries = computed(() => {
  const values =
    monteCarloDistributions.value[selectedVolatilityTeamIndex.value] || [];
  const runCount = Math.max(monteCarloRunCount.value, 1);
  const maxWins = usesMedianScoring.value
    ? displayedWeekCount.value * 2
    : displayedWeekCount.value;
  const frequencies = new Map<number, number>();

  for (let wins = 0; wins <= maxWins; wins += 1) {
    frequencies.set(wins, 0);
  }

  values.forEach((value) => {
    // Keep the chart readable by grouping half-win outcomes into whole-win buckets.
    const key = Math.min(maxWins, Math.max(0, Math.round(value)));
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  });

  const xValues = Array.from(frequencies.keys()).sort((a, b) => a - b);

  return {
    categories: xValues.map((value) => String(value)),
    series: [
      {
        name: "Schedule outcomes",
        data: xValues.map((value) =>
          Number((((frequencies.get(value) || 0) / runCount) * 100).toFixed(2))
        ),
      },
    ],
  };
});

const volatilityChartOptions = computed(() => {
  return {
    chart: {
      type: "area",
      foreColor: getChartTheme().foreground,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.2,
        opacityFrom: 0.45,
        opacityTo: 0.05,
      },
    },
    colors: ["hsl(var(--chart-1))"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: selectedVolatilitySeries.value.categories,
      title: {
        text: "Wins",
      },
    },
    yaxis: {
      title: {
        text: "Share of simulations (%)",
      },
      min: 0,
    },
    tooltip: {
      theme: getChartTooltipTheme(store.darkMode),
      y: {
        formatter: (value: number) => `${value.toFixed(2)}%`,
      },
    },
  };
});

function runMonteCarloDistribution() {
  const result = runScheduleMonteCarlo({
    tableData: props.tableData,
    originalOpponents: originalOpponents.value,
    weeks: displayedWeekCount.value,
    medianScoring: usesMedianScoring.value,
    weeklyMedians: weeklyMedians.value,
    runs: 1000,
  });
  monteCarloDistributions.value = result.distributions;
  monteCarloSummaryByTeam.value = result.summaryByTeam;
  monteCarloRunCount.value = result.runCount;
}

const {
  forecastComparisonChartOptions,
  forecastComparisonSeries,
  forecastLoadingProjections,
  forecastRaceChartOptions,
  forecastRaceSeries,
  forecastReady,
  forecastRows,
  forecastRunCount,
  isCurrentSeasonLeague,
  rerunSeasonForecast,
} = useSeasonForecast({
  tableData,
  displayedWeekCount,
  regularSeasonWeekCount,
  remainingWeekCount,
  fullSeasonOpponents,
  playoffCutoff,
  usesMedianScoring,
  activeToolValue,
  teamName,
});

const {
  replayComparisonChartOptions,
  replayComparisonSeries,
  replayRecordChartOptions,
  replayRecordSeries,
  replayRows,
  replayRunCount,
  replayThroughWeekOptions,
  replayThroughWeekValue,
  rerunSeasonReplay,
} = useSeasonReplay({
  tableData,
  actualStandings,
  displayedWeekCount,
  regularSeasonWeekCount,
  fullSeasonOpponents,
  playoffCutoff,
  usesMedianScoring,
  teamName,
});
</script>

<template>
  <div class="w-full space-y-4">
    <div v-if="activeToolValue === 'schedule-luck'" class="space-y-4">
      <Card class="w-full p-4 space-y-4 md:p-6">
        <div
          class="flex flex-col items-start justify-between gap-4 sm:flex-row"
        >
          <div>
            <h2 class="heading-section">Schedule Luck</h2>
            <p class="mt-4 text-supporting">
              Swap, shuffle, or randomize team schedules to see how each
              scenario reshapes the standings.
            </p>
          </div>
          <Tabs v-model="activeToolValue" class="w-full sm:w-auto sm:shrink-0">
            <TabsList class="grid w-full h-auto grid-cols-2 sm:w-auto">
              <TabsTrigger value="season-simulation">
                {{ seasonSimulationTabLabel }}
              </TabsTrigger>
              <TabsTrigger value="schedule-luck">Schedule Luck</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          class="grid grid-cols-1 gap-4 mt-4 xl:grid-cols-[minmax(360px,0.9fr)_1.1fr]"
        >
          <section class="p-4 border rounded-lg bg-muted/20">
            <div class="flex items-center justify-between gap-3">
              <h3 class="heading-card">Scenario Builder</h3>
              <Button
                variant="outline"
                size="sm"
                :disabled="scenarioLabel === 'Original schedule'"
                @click="resetScenario"
              >
                Reset
              </Button>
            </div>

            <Tabs v-model="activeScenarioValue" class="mt-3">
              <TabsList
                class="grid w-full h-auto grid-cols-1 sm:inline-flex sm:w-auto"
              >
                <TabsTrigger value="swap" class="w-full sm:w-auto">
                  Swap Schedules
                </TabsTrigger>
                <TabsTrigger value="week" class="w-full sm:w-auto">
                  Shuffle Week
                </TabsTrigger>
                <TabsTrigger value="all" class="w-full sm:w-auto">
                  Random Season
                </TabsTrigger>
              </TabsList>

              <TabsContent value="swap" class="mt-3">
                <div class="flex flex-wrap items-end gap-2">
                  <div class="w-full max-w-56">
                    <p class="mb-1 text-sm">First team</p>
                    <Select v-model="selectedSwapTeamAValue">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent class="w-56 max-w-[calc(100vw-2rem)]">
                        <SelectItem
                          v-for="team in teamOptions"
                          :key="`swap-a-${team.value}`"
                          :value="team.value"
                        >
                          <span class="block truncate">{{ team.label }}</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="w-full max-w-56">
                    <p class="mb-1 text-sm">Second team</p>
                    <Select v-model="selectedSwapTeamBValue">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent class="w-56 max-w-[calc(100vw-2rem)]">
                        <SelectItem
                          v-for="team in teamOptions"
                          :key="`swap-b-${team.value}`"
                          :value="team.value"
                        >
                          <span class="block truncate">{{ team.label }}</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    class="mt-1 lg:mt-0"
                    :disabled="
                      selectedSwapTeamAIndex === selectedSwapTeamBIndex
                    "
                    @click="swapSelectedTeamSchedules"
                  >
                    Apply Swap
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="week" class="mt-3">
                <div class="flex flex-wrap items-end gap-3">
                  <div class="min-w-40">
                    <p class="mb-1 text-sm">Week to shuffle</p>
                    <Select v-model="selectedWeekValue">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select week" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="week in weekOptions"
                          :key="week.value"
                          :value="week.value"
                        >
                          {{ week.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button @click="shuffleSelectedWeek">
                    Shuffle Week {{ selectedWeekNumber }}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="all" class="mt-3">
                <div class="flex flex-wrap items-center gap-3">
                  <Button @click="randomizeEntireSchedule">
                    Randomize Full Schedule
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </section>

          <section class="p-4 border rounded-lg bg-muted/20">
            <div>
              <h3 class="text-lg font-semibold">Scenario Impact</h3>
            </div>

            <div class="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-3">
              <div
                v-for="card in scenarioCards"
                :key="card.label"
                class="p-3.5 rounded-md bg-background/70"
              >
                <p
                  class="text-xs font-semibold uppercase text-muted-foreground"
                >
                  {{ card.label }}
                </p>
                <p
                  class="mt-2 text-2xl font-semibold tabular-nums"
                  :class="card.tone"
                >
                  {{ card.value }}
                </p>
                <p class="mt-1 text-sm truncate text-muted-foreground">
                  {{ card.detail }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
              <div class="p-3.5 rounded-md bg-background/70">
                <p
                  class="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Biggest Boost
                </p>
                <p class="mt-2 text-base font-semibold">
                  {{ helpedMostTeam?.name || "No movement" }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ impactTeamDetail(helpedMostTeam) }}
                </p>
              </div>
              <div class="p-3.5 rounded-md bg-background/70">
                <p
                  class="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Biggest Drop
                </p>
                <p class="mt-2 text-base font-semibold">
                  {{ hurtMostTeam?.name || "No movement" }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ impactTeamDetail(hurtMostTeam) }}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section class="p-4 border rounded-lg bg-muted/20">
          <h3 class="text-lg font-semibold">Simulation Results</h3>

          <Tabs v-model="activeDetailValue" class="mt-3">
            <TabsList class="inline-flex flex-wrap h-auto">
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="matchups">Matchups</TabsTrigger>
            </TabsList>

            <TabsContent value="standings" class="mt-3">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead
                    class="sticky top-0 text-xs uppercase bg-card text-muted-foreground"
                  >
                    <tr>
                      <th class="pb-2 text-left min-w-32">Team</th>
                      <th class="pb-2 text-left min-w-20">Actual</th>
                      <th class="pb-2 text-left min-w-20">Simulated</th>
                      <th class="pb-2 text-left min-w-20">Seed</th>
                      <th class="pb-2 text-left min-w-24">Playoff Status</th>
                      <th class="pb-2 text-left min-w-20">Record Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="team in scenarioImpactRows"
                      :key="`standings-${team.index}`"
                      class="border-t h-9"
                    >
                      <td class="py-1.5 pr-2">{{ team.name }}</td>
                      <td class="py-1.5 pr-2">
                        {{ team.actualWins }}-{{ team.actualLosses
                        }}<span v-if="team.actualTies"
                          >-{{ team.actualTies }}</span
                        >
                        <span class="ml-1 text-muted-foreground">
                          ({{ seedText(team.actualSeed) }})
                        </span>
                      </td>
                      <td class="py-1.5 pr-2">
                        {{ team.wins }}-{{ team.losses
                        }}<span v-if="team.ties">-{{ team.ties }}</span>
                        <span class="ml-1 text-muted-foreground">
                          ({{ seedText(team.simulatedSeed) }})
                        </span>
                      </td>
                      <td
                        class="py-1.5 pr-2"
                        :class="
                          team.seedDelta > 0
                            ? 'text-primary'
                            : team.seedDelta < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        "
                      >
                        {{ seedDeltaText(team.seedDelta) }}
                      </td>
                      <td
                        class="py-1.5 pr-2"
                        :class="playoffStatusClass(team.playoffChange)"
                      >
                        {{ playoffStatusText(team.playoffChange) }}
                      </td>
                      <td
                        class="py-1.5 pr-2"
                        :class="
                          team.winDelta > 0
                            ? 'text-primary'
                            : team.winDelta < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        "
                      >
                        {{ winDeltaText(team.winDelta) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="matchups" class="mt-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-muted-foreground">
                  Changed matchups are highlighted.
                </p>
                <Select v-model="selectedWeekValue">
                  <SelectTrigger class="w-full sm:w-44">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="week in weekOptions"
                      :key="`detail-${week.value}`"
                      :value="week.value"
                    >
                      {{ week.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                v-if="selectedWeekMatchups.length === 0"
                class="mt-3 text-sm text-muted-foreground"
              >
                No matchups found for this view.
              </div>

              <div v-else class="grid grid-cols-1 gap-2 mt-3 md:grid-cols-2">
                <div
                  v-for="matchup in selectedWeekMatchups"
                  :key="`matchup-${selectedWeekData.week}-${matchup.teamA}-${matchup.teamB}`"
                  class="px-2 py-1.5 rounded-md bg-muted/30"
                  :class="matchup.changed ? 'bg-secondary' : ''"
                >
                  <p class="text-sm">
                    <span
                      class="font-semibold"
                      :class="
                        matchup.winner === matchup.teamA ? 'text-primary' : ''
                      "
                    >
                      {{ teamName(tableData[matchup.teamA]) }}
                    </span>
                    <span class="mx-1 text-muted-foreground"
                      >({{ matchup.pointsA.toFixed(2) }})</span
                    >
                    vs
                    <span
                      class="ml-1 font-semibold"
                      :class="
                        matchup.winner === matchup.teamB ? 'text-primary' : ''
                      "
                    >
                      {{ teamName(tableData[matchup.teamB]) }}
                    </span>
                    <span class="mx-1 text-muted-foreground"
                      >({{ matchup.pointsB.toFixed(2) }})</span
                    >
                    <span
                      v-if="matchup.winner === null"
                      class="ml-2 text-xs text-muted-foreground"
                    >
                      Tie
                    </span>
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </Card>

      <Card class="w-full p-4 md:p-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="heading-section">Random Schedule Outcomes</h2>
            <p class="mt-2 text-supporting">
              Distribution of likely win totals from simulating 1000 randomized
              schedules.
            </p>
          </div>
          <Select v-model="selectedVolatilityTeamValue">
            <SelectTrigger class="w-full sm:w-44">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="team in teamOptions"
                :key="`volatility-${team.value}`"
                :value="team.value"
              >
                {{ team.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <apexchart
          type="area"
          width="100%"
          height="320"
          :options="volatilityChartOptions"
          :series="selectedVolatilitySeries.series"
          class="mt-2"
        ></apexchart>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase text-muted-foreground">
              <tr>
                <th class="pb-2 text-left min-w-32">Team</th>
                <th class="pb-2 text-left min-w-20">Actual</th>
                <th class="pb-2 text-left min-w-20">Average</th>
                <th class="pb-2 text-left min-w-20">Most Common</th>
                <th class="pb-2 text-left min-w-20">P10</th>
                <th class="pb-2 text-left min-w-20">P90</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="team in monteCarloTeamSummaryRows"
                :key="`volatility-summary-${team.index}`"
                class="border-t"
              >
                <td class="py-2 pr-2">{{ team.name }}</td>
                <td class="py-2 pr-2">{{ team.actualWins.toFixed(1) }}</td>
                <td class="py-2 pr-2">{{ team.average.toFixed(2) }}</td>
                <td class="py-2 pr-2">{{ team.mode.toFixed(1) }}</td>
                <td class="py-2 pr-2">{{ team.p10.toFixed(1) }}</td>
                <td class="py-2 pr-2">{{ team.p90.toFixed(1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <div v-else-if="isCurrentSeasonLeague" class="space-y-4">
      <Card class="w-full p-4 md:p-6">
        <div
          class="flex flex-col items-start justify-between gap-4 sm:flex-row"
        >
          <div>
            <h2 class="heading-section">Season Forecast</h2>
            <p class="max-w-3xl mt-4 text-supporting">
              Simulate the remaining schedule using current records, roster
              projections, and scoring volatility.
            </p>
          </div>
          <Tabs v-model="activeToolValue" class="w-full sm:w-auto">
            <TabsList class="grid w-full h-auto grid-cols-2 sm:w-auto">
              <TabsTrigger value="season-simulation">
                {{ seasonSimulationTabLabel }}
              </TabsTrigger>
              <TabsTrigger value="schedule-luck">Schedule Luck</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div class="flex items-end mt-4">
          <Button
            class="w-full sm:w-auto"
            :disabled="forecastLoadingProjections"
            @click="rerunSeasonForecast"
          >
            {{
              forecastLoadingProjections
                ? "Loading Projections…"
                : "Rerun Simulations"
            }}
          </Button>
        </div>

        <div
          v-if="forecastLoadingProjections"
          role="status"
          aria-live="polite"
          class="flex items-center gap-2 p-3 mt-4 text-sm rounded-md bg-muted/35 text-muted-foreground"
        >
          Updating player projections and rerunning the forecast…
        </div>
        <div
          v-if="forecastReady"
          class="grid grid-cols-1 gap-6 mt-4 xl:grid-cols-2"
        >
          <div class="min-w-0">
            <div>
              <h3 class="heading-card">Projected Season Race</h3>
              <p class="text-supporting">
                Average cumulative wins across all
                {{ forecastRunCount.toLocaleString() }} simulated seasons.
              </p>
            </div>
            <apexchart
              type="line"
              width="100%"
              height="440"
              :options="forecastRaceChartOptions"
              :series="forecastRaceSeries"
              class="mt-3"
            ></apexchart>
          </div>

          <div class="min-w-0">
            <div>
              <h3 class="heading-card">Current Record vs. Projected Finish</h3>
              <p class="text-supporting">
                Wins already secured compared with the forecasted final total.
              </p>
            </div>
            <apexchart
              type="bar"
              width="100%"
              height="440"
              :options="forecastComparisonChartOptions"
              :series="forecastComparisonSeries"
              class="mt-3"
            ></apexchart>
          </div>
        </div>
      </Card>

      <Card v-if="forecastReady" class="w-full p-4 md:p-6">
        <div>
          <h3 class="heading-card">Projected Standings</h3>
          <p class="mt-2 text-supporting">
            Win ranges show the 10th through 90th percentile outcome.
          </p>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase text-muted-foreground">
              <tr>
                <th class="pb-2 text-left min-w-40">Team</th>
                <th class="pb-2 text-left min-w-24">Playoffs</th>
                <th class="pb-2 text-left min-w-24">Avg. Wins</th>
                <th class="pb-2 text-left min-w-28">Win Range</th>
                <th class="pb-2 text-left min-w-24">Avg. Seed</th>
                <th class="pb-2 text-left min-w-24">No. 1 Seed</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(team, rowIndex) in forecastRows"
                :key="`forecast-${team.index}`"
                class="transition-colors border-t hover:bg-muted/35"
                :class="{
                  'border-b-2 border-b-primary/50':
                    rowIndex === playoffCutoff - 1,
                }"
              >
                <td class="py-3 pr-3 font-medium">{{ team.name }}</td>
                <td class="py-3 pr-3 font-semibold text-primary tabular-nums">
                  {{ team.playoffOdds.toFixed(1) }}%
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.averageWins.toFixed(2) }}
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.p10Wins.toFixed(1) }}–{{ team.p90Wins.toFixed(1) }}
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  #{{ team.averageSeed.toFixed(1) }}
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.topSeedOdds.toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <div v-else class="space-y-4">
      <Card class="w-full p-4 md:p-6">
        <div
          class="flex flex-col items-start justify-between gap-4 sm:flex-row"
        >
          <div>
            <h2 class="heading-section">Season Forecast</h2>
            <p class="max-w-3xl mt-4 text-supporting">
              Simulate the schedule after a certain week using current records,
              roster projections, and scoring volatility.
            </p>
          </div>
          <Tabs v-model="activeToolValue" class="w-full sm:w-auto">
            <TabsList class="grid w-full h-auto grid-cols-2 sm:w-auto">
              <TabsTrigger value="season-simulation">
                {{ seasonSimulationTabLabel }}
              </TabsTrigger>
              <TabsTrigger value="schedule-luck">Schedule Luck</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          class="flex flex-col items-stretch gap-2 mt-4 sm:flex-row sm:items-end"
        >
          <div class="w-full sm:min-w-44 sm:w-auto">
            <p class="mb-1 text-sm">Start forecast</p>
            <Select v-model="replayThroughWeekValue">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="week in replayThroughWeekOptions"
                  :key="`replay-through-${week.value}`"
                  :value="week.value"
                >
                  {{ week.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button class="w-full sm:w-auto" @click="rerunSeasonReplay">
            Rerun Simulations
          </Button>
        </div>

        <div class="grid grid-cols-1 gap-6 mt-4 xl:grid-cols-2">
          <div class="min-w-0">
            <h3 class="heading-card">Projected Season Race</h3>
            <p class="text-supporting">
              Average cumulative wins across all
              {{ replayRunCount.toLocaleString() }} simulated seasons
            </p>
            <apexchart
              type="line"
              width="100%"
              height="440"
              :options="replayRecordChartOptions"
              :series="replayRecordSeries"
              class="mt-3"
            ></apexchart>
          </div>

          <div class="min-w-0">
            <h3 class="heading-card">Actual Record vs. Projected Finish</h3>
            <p class="text-supporting">
              Actual number of wins compared with the projected number of wins
            </p>
            <apexchart
              type="bar"
              width="100%"
              height="440"
              :options="replayComparisonChartOptions"
              :series="replayComparisonSeries"
              class="mt-3"
            ></apexchart>
          </div>
        </div>
      </Card>

      <Card class="w-full p-4 md:p-6">
        <div>
          <h3 class="heading-card">Projected Standings</h3>
          <p class="mt-2 text-supporting">
            Compare the real finish with the range forecast using only results
            available through the selected week.
          </p>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase text-muted-foreground">
              <tr>
                <th class="pb-2 text-left min-w-40">Team</th>
                <th class="pb-2 text-left min-w-24">Actual</th>
                <th class="pb-2 text-left min-w-24">Avg. Wins</th>
                <th class="pb-2 text-left min-w-28">Win Range</th>
                <th class="pb-2 text-left min-w-24">Playoffs</th>
                <th class="pb-2 text-left min-w-24">Avg. Seed</th>
                <th class="pb-2 text-left min-w-24">Same Finish</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(team, rowIndex) in replayRows"
                :key="`replay-${team.index}`"
                class="transition-colors border-t hover:bg-muted/35"
                :class="{
                  'border-b-2 border-b-primary/50':
                    rowIndex === playoffCutoff - 1,
                }"
              >
                <td class="py-3 pr-3 font-medium">{{ team.name }}</td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.actualWins.toFixed(1) }} / #{{ team.actualSeed }}
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.averageWins.toFixed(2) }}
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.p10Wins.toFixed(1) }}–{{ team.p90Wins.toFixed(1) }}
                </td>
                <td class="py-3 pr-3 font-semibold text-primary tabular-nums">
                  {{ team.playoffOdds.toFixed(1) }}%
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  #{{ team.averageSeed.toFixed(1) }}
                </td>
                <td class="py-3 pr-3 tabular-nums">
                  {{ team.sameSeedOdds.toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
