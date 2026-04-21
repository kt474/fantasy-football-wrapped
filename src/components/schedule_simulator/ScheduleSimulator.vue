<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import { useStore } from "../../store/store";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
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
const monteCarloRuns = ref(1000);
const selectedDistributionTeamValue = ref("0");
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

const dataWeekCount = computed(() => {
  return Math.max(...props.tableData.map((team) => team.points.length), 0);
});

const displayedWeekCount = computed(() => {
  const league = store.leagueInfo[store.currentLeagueIndex];
  if (league?.regularSeasonLength) {
    return league.regularSeasonLength;
  }
  return dataWeekCount.value;
});

const usesMedianScoring = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]?.medianScoring === 1;
});

const weeklyMedians = computed(() => {
  if (props.tableData[0].points) {
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

const createOpponentMatrix = (tableData: TableDataType[]) => {
  const weeks = displayedWeekCount.value;
  const matrix: (number | null)[][] = tableData.map((team) =>
    Array.from({ length: weeks }, (_, week) => {
      const matchupNumber = team.matchups ? team.matchups[week] : null;
      if (matchupNumber === null || matchupNumber === undefined) return null;
      return null;
    })
  );

  for (let week = 0; week < weeks; week++) {
    const matchupMap = new Map<number, number[]>();
    tableData.forEach((team, teamIndex) => {
      const matchupNumber = team.matchups ? team.matchups[week] : null;
      if (matchupNumber === null || matchupNumber === undefined) return;
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
      selectedDistributionTeamValue.value = "0";
      return;
    }
    const teamIndex = Number(selectedDistributionTeamValue.value);
    if (!Number.isFinite(teamIndex) || teamIndex < 0 || teamIndex > count - 1) {
      selectedDistributionTeamValue.value = "0";
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

    props.tableData.forEach((team, teamIndex) => {
      if (seen.has(teamIndex)) return;
      const opponent = simulatedOpponents.value[teamIndex]?.[week];
      if (opponent === null || opponent === undefined) return;
      if (seen.has(opponent)) return;

      const pointsA = team.points[week] ?? 0;
      const pointsB = props.tableData[opponent]?.points[week] ?? 0;
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
      const teamPoints = props.tableData[teamIndex]?.points
        ? props.tableData[teamIndex]?.points[week]
        : 0;
      records[teamIndex].pointsFor += teamPoints;

      if (opponent === null || opponent === undefined || seen.has(teamIndex)) {
        continue;
      }
      if (seen.has(opponent)) continue;

      const opponentPoints = props.tableData[opponent]?.points[week] ?? 0;
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
        const teamPoints = props.tableData[teamIndex]?.points[week] ?? 0;
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
    record.winDelta = Number(
      (record.wins - props.tableData[record.index].wins).toFixed(1)
    );
  });

  return records.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.ties !== b.ties) return b.ties - a.ties;
    return b.pointsFor - a.pointsFor;
  });
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
    .sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.ties !== b.ties) return b.ties - a.ties;
      return b.pointsFor - a.pointsFor;
    });
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

const distributionTeamOptions = computed(() => {
  return props.tableData.map((team, index) => ({
    value: String(index),
    label: teamName(team),
  }));
});

const selectedDistributionTeamIndex = computed(() => {
  const index = Number(selectedDistributionTeamValue.value);
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(index, 0), Math.max(props.tableData.length - 1, 0));
});

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
        ...summary,
      };
    })
    .sort((a, b) => b.average - a.average);
});

const selectedDistributionSeries = computed(() => {
  const values =
    monteCarloDistributions.value[selectedDistributionTeamIndex.value] || [];
  const runCount = Math.max(monteCarloRunCount.value, 1);
  const maxWins = displayedWeekCount.value;
  const frequencies = new Map<number, number>();

  for (let wins = 0; wins <= maxWins; wins += 1) {
    frequencies.set(wins, 0);
  }

  values.forEach((value) => {
    const key = Math.min(maxWins, Math.max(0, Math.round(value)));
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  });

  const xValues = Array.from(frequencies.keys()).sort((a, b) => a - b);

  return {
    categories: xValues.map((value) => String(value)),
    series: [
      {
        name: "Likelihood",
        data: xValues.map((value) =>
          Number((((frequencies.get(value) || 0) / runCount) * 100).toFixed(2))
        ),
      },
    ],
  };
});

const distributionChartOptions = computed(() => {
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
      categories: selectedDistributionSeries.value.categories,
      title: {
        text: "Wins",
      },
    },
    yaxis: {
      title: {
        text: "Likelihood (%)",
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

const randomizeEntireSchedule = () => {
  const totalWeeks = displayedWeekCount.value;
  const teamIndexes = props.tableData.map((_, index) => index);
  const nextOpponents = originalOpponents.value.map((teamWeeks) => [
    ...teamWeeks,
  ]);

  for (let week = 0; week < totalWeeks; week++) {
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
  }

  simulatedOpponents.value = nextOpponents;
};

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
  <Card class="w-full h-full p-4 mt-4 md:p-6">
    <p class="text-3xl font-bold leading-none">Schedule Simulator (Beta)</p>
    <p class="mt-4 text-muted-foreground">
      Analyze the impact of weekly matchup scheduling on the final standings.
    </p>

    <div class="flex flex-wrap items-center gap-2 mt-4">
      <Button @click="randomizeEntireSchedule">Randomize Schedules</Button>
    </div>

    <div class="grid grid-cols-1 gap-4 mt-2 lg:grid-cols-2">
      <Card class="px-4 py-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-semibold">Matchups</h3>
        </div>

        <div class="mt-2 overflow-x-auto">
          <Tabs v-model="selectedWeekValue" class="w-full">
            <TabsList class="inline-flex h-9 w-max">
              <TabsTrigger
                v-for="weekData in matchupsByWeek"
                :key="weekData.value"
                :value="weekData.value"
                class="px-3"
              >
                W{{ weekData.week }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          v-if="selectedWeekMatchups.length === 0"
          class="mt-3 text-sm text-muted-foreground"
        >
          No matchups found for this view.
        </div>

        <div v-else class="mt-3 space-y-2">
          <div
            v-for="matchup in selectedWeekMatchups"
            :key="`matchup-${selectedWeekData.week}-${matchup.teamA}-${matchup.teamB}`"
            class="p-2 border rounded-md"
            :class="matchup.changed ? 'bg-secondary' : ''"
          >
            <p class="text-sm">
              <span
                class="font-medium"
                :class="matchup.winner === matchup.teamA ? 'text-primary' : ''"
              >
                {{ teamName(tableData[matchup.teamA]) }}
              </span>
              <span class="mx-1 text-muted-foreground"
                >({{ matchup.pointsA.toFixed(2) }})</span
              >
              vs
              <span
                class="ml-1 font-medium"
                :class="matchup.winner === matchup.teamB ? 'text-primary' : ''"
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
      </Card>

      <Card class="px-4 py-3">
        <h3 class="text-lg font-semibold">Simulated Standings</h3>
        <div class="mt-2 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase text-muted-foreground">
              <tr>
                <th class="pb-2 text-left min-w-32">Team</th>
                <th class="w-20 pb-2 text-left min-w-20">Actual Record</th>
                <th class="w-16 pb-2 text-left min-w-16">Sim Record</th>
                <th class="w-16 pb-2 text-left min-w-16">Wins Delta</th>
                <th class="w-20 pb-2 text-left min-w-20">Playoff Delta</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="team in standingsWithSeedDelta"
                :key="`sim-${team.index}`"
                class="border-t"
              >
                <td class="py-2 pr-2">{{ team.name }}</td>
                <td class="py-2 pr-2">
                  {{ team.actualWins }}-{{ team.actualLosses
                  }}<span v-if="team.actualTies">-{{ team.actualTies }}</span>
                </td>
                <td class="py-2 pr-2">
                  {{ team.wins }}-{{ team.losses
                  }}<span v-if="team.ties">-{{ team.ties }}</span>
                </td>
                <td
                  class="py-2 pr-2"
                  :class="
                    team.winDelta > 0
                      ? 'text-primary'
                      : team.winDelta < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  "
                >
                  {{ team.winDelta > 0 ? "+" : ""
                  }}{{ team.winDelta.toFixed(1) }}
                </td>
                <td
                  class="py-2 pr-2"
                  :class="
                    team.seedDelta > 0
                      ? 'text-primary'
                      : team.seedDelta < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  "
                >
                  {{ team.seedDelta > 0 ? "+" : "" }}{{ team.seedDelta }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <Card class="px-4 py-3 mt-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold">Record Likelihood</h3>
          <p class="text-sm text-muted-foreground">
            Distribution of likely win totals from simulating 1000 randomized
            schedules.
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex flex-col">
            <Select v-model="selectedDistributionTeamValue">
              <SelectTrigger class="w-44">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="team in distributionTeamOptions"
                  :key="team.value"
                  :value="team.value"
                >
                  {{ team.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <apexchart
        type="area"
        width="100%"
        height="320"
        :options="distributionChartOptions"
        :series="selectedDistributionSeries.series"
        class="mt-2"
      ></apexchart>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs uppercase text-muted-foreground">
            <tr>
              <th class="pb-2 text-left min-w-32">Team</th>
              <th class="pb-2 text-left min-w-20">Most Likely</th>
              <th class="pb-2 text-left min-w-16">Avg</th>
              <th class="pb-2 text-left min-w-20">P10</th>
              <th class="pb-2 text-left min-w-20">P50</th>
              <th class="pb-2 text-left min-w-20">P90</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="team in monteCarloTeamSummaryRows"
              :key="`mc-summary-${team.index}`"
              class="border-t"
            >
              <td class="py-2 pr-2">{{ team.name }}</td>
              <td class="py-2 pr-2">{{ team.mode.toFixed(1) }}</td>
              <td class="py-2 pr-2">{{ team.average.toFixed(2) }}</td>
              <td class="py-2 pr-2">{{ team.p10.toFixed(1) }}</td>
              <td class="py-2 pr-2">{{ team.p50.toFixed(1) }}</td>
              <td class="py-2 pr-2">{{ team.p90.toFixed(1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </Card>
</template>
