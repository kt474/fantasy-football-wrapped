<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import { useStore } from "../../store/store";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type SimulatedTeamRecord = {
  index: number;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winDelta: number;
};

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();
const simulatedOpponents = ref<(number | null)[][]>([]);
const selectedWeekValue = ref("week-1");
const selectedSwapTeamAValue = ref("0");
const selectedSwapTeamBValue = ref("1");
const selectedVolatilityTeamValue = ref("0");
const activeScenarioValue = ref("swap");
const activeDetailValue = ref("standings");
const monteCarloRuns = ref(1000);
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
  return Math.max(...props.tableData.map((team) => team.points.length), 0);
});

const usesMedianScoring = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]?.medianScoring === 1;
});

const recordWeekCount = computed(() => {
  const resultCount = Math.max(
    ...props.tableData.map((team) => team.recordByWeek?.length ?? 0),
    0
  );
  return usesMedianScoring.value ? Math.floor(resultCount / 2) : resultCount;
});

const displayedWeekCount = computed(() => {
  const league = store.leagueInfo[store.currentLeagueIndex];
  const regularSeasonLength =
    league?.regularSeasonLength || dataWeekCount.value;
  const lastScoredWeek = league?.lastScoredWeek || 0;
  const completedWeeks =
    recordWeekCount.value ||
    (lastScoredWeek > 0 ? lastScoredWeek : dataWeekCount.value);

  if (regularSeasonLength > 0 && completedWeeks > 0) {
    return Math.min(regularSeasonLength, completedWeeks);
  }

  return regularSeasonLength;
});

const weeklyMedians = computed(() => {
  if (props.tableData[0]?.points) {
    return Array.from({ length: displayedWeekCount.value }, (_, week) => {
      const weeklyScores = props.tableData
        .map((team) => team.points[week])
        .filter((points): points is number => Number.isFinite(points));

      if (weeklyScores.length === 0) return null;

      const sortedScores = [...weeklyScores].sort((a, b) => a - b);
      const midpoint = Math.floor(sortedScores.length / 2);

      if (sortedScores.length % 2 === 0) {
        return (sortedScores[midpoint - 1] + sortedScores[midpoint]) / 2;
      }

      return sortedScores[midpoint];
    });
  }
  return [];
});

const teamName = (team: TableDataType) => {
  if (store.showUsernames) {
    return team.username || "Ghost Roster";
  }
  return team.name || "Ghost Roster";
};

const getWeekPoints = (teamIndex: number, week: number) => {
  const points = props.tableData[teamIndex]?.points[week];
  return Number.isFinite(points) ? points : 0;
};

const recordPoints = (wins: number, ties = 0) => wins + ties * 0.5;

const compareTeamRecords = (
  a: Pick<SimulatedTeamRecord, "wins" | "ties" | "pointsFor">,
  b: Pick<SimulatedTeamRecord, "wins" | "ties" | "pointsFor">
) => {
  const recordDifference =
    recordPoints(b.wins, b.ties) - recordPoints(a.wins, a.ties);
  if (recordDifference !== 0) return recordDifference;
  return b.pointsFor - a.pointsFor;
};

const isValidMatchupNumber = (
  matchupNumber: number | null | undefined
): matchupNumber is number => {
  return Number.isFinite(matchupNumber) && Number(matchupNumber) > 0;
};

const createOpponentMatrix = (tableData: TableDataType[]) => {
  const weeks = displayedWeekCount.value;
  const matrix: (number | null)[][] = tableData.map((team) =>
    Array.from({ length: weeks }, (_, week) => {
      const matchupNumber = team.matchups ? team.matchups[week] : null;
      if (!isValidMatchupNumber(matchupNumber)) return null;
      return null;
    })
  );

  for (let week = 0; week < weeks; week++) {
    const matchupMap = new Map<number, number[]>();
    tableData.forEach((team, teamIndex) => {
      const matchupNumber = team.matchups ? team.matchups[week] : null;
      if (!isValidMatchupNumber(matchupNumber)) return;
      const teams = matchupMap.get(matchupNumber) || [];
      teams.push(teamIndex);
      matchupMap.set(matchupNumber, teams);
    });

    matchupMap.forEach((teamIndexes) => {
      if (teamIndexes.length < 2) return;
      for (let i = 0; i < teamIndexes.length; i += 2) {
        const a = teamIndexes[i];
        const b = teamIndexes[i + 1];
        if (a === undefined || b === undefined) continue;
        matrix[a][week] = b;
        matrix[b][week] = a;
      }
    });
  }

  return matrix;
};

const originalOpponents = computed(() => createOpponentMatrix(props.tableData));

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

const matchupsByWeek = computed(() => {
  return Array.from({ length: displayedWeekCount.value }, (_, week) => {
    const rows: {
      teamA: number;
      teamB: number;
      pointsA: number;
      pointsB: number;
      winner: number | null;
      changed: boolean;
    }[] = [];
    const seen = new Set<number>();

    props.tableData.forEach((_, teamIndex) => {
      if (seen.has(teamIndex)) return;
      const opponent = simulatedOpponents.value[teamIndex]?.[week];
      if (opponent === null || opponent === undefined) return;
      if (seen.has(opponent)) return;

      const pointsA = getWeekPoints(teamIndex, week);
      const pointsB = getWeekPoints(opponent, week);
      const winner =
        pointsA === pointsB ? null : pointsA > pointsB ? teamIndex : opponent;
      const changed = originalOpponents.value[teamIndex]?.[week] !== opponent;

      rows.push({
        teamA: teamIndex,
        teamB: opponent,
        pointsA,
        pointsB,
        winner,
        changed,
      });
      seen.add(teamIndex);
      seen.add(opponent);
    });

    return {
      week: week + 1,
      value: `week-${week + 1}`,
      rows,
    };
  });
});

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

const simulatedStandings = computed<SimulatedTeamRecord[]>(() => {
  const weeks = displayedWeekCount.value;
  const records = props.tableData.map((team, index) => ({
    index,
    name: teamName(team),
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winDelta: 0,
  }));

  for (let week = 0; week < weeks; week++) {
    const seen = new Set<number>();
    for (let teamIndex = 0; teamIndex < props.tableData.length; teamIndex++) {
      const opponent = simulatedOpponents.value[teamIndex]?.[week];
      const teamPoints = getWeekPoints(teamIndex, week);
      records[teamIndex].pointsFor += teamPoints;

      if (opponent === null || opponent === undefined || seen.has(teamIndex)) {
        continue;
      }
      if (seen.has(opponent)) continue;

      const opponentPoints = getWeekPoints(opponent, week);
      records[teamIndex].pointsAgainst += opponentPoints;
      records[opponent].pointsAgainst += teamPoints;

      if (teamPoints > opponentPoints) {
        records[teamIndex].wins += 1;
        records[opponent].losses += 1;
      } else if (teamPoints < opponentPoints) {
        records[teamIndex].losses += 1;
        records[opponent].wins += 1;
      } else {
        records[teamIndex].ties += 1;
        records[opponent].ties += 1;
      }

      seen.add(teamIndex);
      seen.add(opponent);
    }

    if (usesMedianScoring.value && weeklyMedians.value.length > 0) {
      const weekMedian = weeklyMedians.value[week];
      if (weekMedian === null) continue;

      for (let teamIndex = 0; teamIndex < props.tableData.length; teamIndex++) {
        const teamPoints = getWeekPoints(teamIndex, week);
        if (teamPoints > weekMedian) {
          records[teamIndex].wins += 1;
        } else if (teamPoints < weekMedian) {
          records[teamIndex].losses += 1;
        } else {
          records[teamIndex].ties += 1;
        }
      }
    }
  }

  records.forEach((record) => {
    const actualRecordPoints = recordPoints(
      props.tableData[record.index].wins,
      props.tableData[record.index].ties ?? 0
    );
    record.winDelta = Number(
      (recordPoints(record.wins, record.ties) - actualRecordPoints).toFixed(1)
    );
  });

  return records.sort(compareTeamRecords);
});

const actualStandings = computed<SimulatedTeamRecord[]>(() => {
  return props.tableData
    .map((team, index) => ({
      index,
      name: teamName(team),
      wins: team.wins,
      losses: team.losses,
      ties: team.ties ?? 0,
      pointsFor: team.pointsFor,
      pointsAgainst: team.pointsAgainst,
      winDelta: 0,
    }))
    .sort(compareTeamRecords);
});

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
  const playoffTeams =
    store.leagueInfo[store.currentLeagueIndex]?.playoffTeams || 0;
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
  const teamIndexes = props.tableData.map((_, index) => index);
  const nextOpponents = cloneSimulatedOpponents();

  weekIndexes.forEach((week) => {
    const originalByes = teamIndexes.filter(
      (index) => originalOpponents.value[index]?.[week] === null
    );
    const activeTeams = teamIndexes.filter(
      (index) => !originalByes.includes(index)
    );

    for (let i = activeTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activeTeams[i], activeTeams[j]] = [activeTeams[j], activeTeams[i]];
    }

    teamIndexes.forEach((teamIndex) => {
      nextOpponents[teamIndex][week] = null;
    });

    for (let i = 0; i < activeTeams.length; i += 2) {
      const teamA = activeTeams[i];
      const teamB = activeTeams[i + 1];
      if (teamA === undefined || teamB === undefined) continue;
      nextOpponents[teamA][week] = teamB;
      nextOpponents[teamB][week] = teamA;
    }
  });

  applyScenario(nextOpponents, label);
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

  const nextOpponents = cloneSimulatedOpponents();

  for (let week = 0; week < displayedWeekCount.value; week++) {
    const opponentA = nextOpponents[teamA]?.[week] ?? null;
    const opponentB = nextOpponents[teamB]?.[week] ?? null;

    if (opponentA === teamB || opponentB === teamA) continue;

    if (opponentA !== null) nextOpponents[opponentA][week] = null;
    if (opponentB !== null) nextOpponents[opponentB][week] = null;

    nextOpponents[teamA][week] = opponentB;
    if (opponentB !== null) nextOpponents[opponentB][week] = teamA;

    nextOpponents[teamB][week] = opponentA;
    if (opponentA !== null) nextOpponents[opponentA][week] = teamB;
  }

  applyScenario(
    nextOpponents,
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
      foreColor: store.darkMode ? "#ffffff" : "#111827",
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
    colors: ["#2563eb"],
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
      theme: store.darkMode ? "dark" : "light",
      y: {
        formatter: (value: number) => `${value.toFixed(2)}%`,
      },
    },
  };
});

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p))
  );
  return sorted[index];
}

function runMonteCarloDistribution() {
  const teamCount = props.tableData.length;
  const totalWeeks = displayedWeekCount.value;
  const runs = Math.max(100, Math.min(10000, Math.floor(monteCarloRuns.value)));

  if (teamCount === 0 || totalWeeks === 0) {
    monteCarloDistributions.value = [];
    monteCarloSummaryByTeam.value = {};
    monteCarloRunCount.value = 0;
    return;
  }

  const byesByWeek = Array.from({ length: totalWeeks }, (_, week) =>
    Array.from({ length: teamCount }, (_, index) => index).filter(
      (index) => originalOpponents.value[index]?.[week] === null
    )
  );

  const valuesByTeam: number[][] = Array.from({ length: teamCount }, () => []);

  for (let run = 0; run < runs; run++) {
    const wins = Array.from({ length: teamCount }, () => 0);
    const ties = Array.from({ length: teamCount }, () => 0);

    for (let week = 0; week < totalWeeks; week++) {
      const byes = byesByWeek[week];
      const activeTeams = Array.from(
        { length: teamCount },
        (_, index) => index
      ).filter((index) => !byes.includes(index));

      for (let i = activeTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeTeams[i], activeTeams[j]] = [activeTeams[j], activeTeams[i]];
      }

      for (let i = 0; i < activeTeams.length; i += 2) {
        const teamA = activeTeams[i];
        const teamB = activeTeams[i + 1];
        if (teamA === undefined || teamB === undefined) continue;

        const pointsA = props.tableData[teamA]?.points[week] ?? 0;
        const pointsB = props.tableData[teamB]?.points[week] ?? 0;

        if (pointsA > pointsB) {
          wins[teamA] += 1;
        } else if (pointsB > pointsA) {
          wins[teamB] += 1;
        } else {
          ties[teamA] += 1;
          ties[teamB] += 1;
        }
      }

      if (usesMedianScoring.value) {
        const weekMedian = weeklyMedians.value[week];
        if (weekMedian === null) continue;

        for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
          const teamPoints = props.tableData[teamIndex]?.points[week] ?? 0;
          if (teamPoints > weekMedian) {
            wins[teamIndex] += 1;
          } else if (teamPoints < weekMedian) {
            wins[teamIndex] += 0;
          } else {
            ties[teamIndex] += 1;
          }
        }
      }
    }

    for (let index = 0; index < teamCount; index++) {
      valuesByTeam[index].push(
        Number((wins[index] + ties[index] * 0.5).toFixed(1))
      );
    }
  }

  const summary: Record<
    number,
    {
      mode: number;
      average: number;
      p10: number;
      p50: number;
      p90: number;
    }
  > = {};

  valuesByTeam.forEach((values, index) => {
    const sorted = [...values].sort((a, b) => a - b);
    const freq = new Map<number, number>();
    sorted.forEach((value) => {
      freq.set(value, (freq.get(value) || 0) + 1);
    });

    let mode = 0;
    let maxCount = -1;
    freq.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mode = value;
      }
    });

    const avg =
      sorted.reduce((total, value) => total + value, 0) /
      Math.max(sorted.length, 1);

    summary[index] = {
      mode,
      average: Number(avg.toFixed(2)),
      p10: percentile(sorted, 0.1),
      p50: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
    };
  });

  monteCarloDistributions.value = valuesByTeam;
  monteCarloSummaryByTeam.value = summary;
  monteCarloRunCount.value = runs;
}
</script>

<template>
  <div class="w-full space-y-4">
    <Card class="w-full p-4 space-y-4 md:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-3xl font-semibold">Schedule Simulator</p>
          <p class="mt-4 text-muted-foreground">
            Test alternate matchups and see how the standings change.
          </p>
        </div>
        <Button variant="outline" @click="resetScenario">Reset</Button>
      </div>

      <div
        class="grid grid-cols-1 gap-4 mt-4 xl:grid-cols-[minmax(360px,0.9fr)_1.1fr]"
      >
        <div class="p-4 rounded-md bg-muted/20">
          <div>
            <h3 class="text-lg font-semibold">Scenario Builder</h3>
          </div>

          <Tabs v-model="activeScenarioValue" class="mt-3">
            <TabsList class="inline-flex flex-wrap h-auto">
              <TabsTrigger value="swap">Swap Schedules</TabsTrigger>
              <TabsTrigger value="week">Shuffle Week</TabsTrigger>
              <TabsTrigger value="all">Random Season</TabsTrigger>
            </TabsList>

            <TabsContent value="swap" class="mt-3">
              <div
                class="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
              >
                <div>
                  <p class="mb-1 text-sm">First team</p>
                  <Select v-model="selectedSwapTeamAValue">
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="team in teamOptions"
                        :key="`swap-a-${team.value}`"
                        :value="team.value"
                      >
                        {{ team.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p class="mb-1 text-sm">Second team</p>
                  <Select v-model="selectedSwapTeamBValue">
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="team in teamOptions"
                        :key="`swap-b-${team.value}`"
                        :value="team.value"
                      >
                        {{ team.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  class="mt-1 lg:mt-0"
                  :disabled="selectedSwapTeamAIndex === selectedSwapTeamBIndex"
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
        </div>

        <div class="p-4 rounded-md bg-muted/20">
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
        </div>
      </div>

      <div class="p-4 rounded-md bg-muted/20">
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
                <SelectTrigger class="w-44">
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
      </div>
    </Card>

    <Card class="w-full p-4 md:p-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="text-3xl font-semibold">Random Schedule Outcomes</h3>
          <p class="mt-2 text-muted-foreground">
            Distribution of likely win totals from simulating 1000 randomized
            schedules.
          </p>
        </div>
        <Select v-model="selectedVolatilityTeamValue">
          <SelectTrigger class="w-44">
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
</template>
