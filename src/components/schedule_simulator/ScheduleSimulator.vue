<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import { useStore } from "../../store/store";

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

type TimelineRow = {
  week: number;
  teamPoints: number;
  originalOpponentName: string;
  originalOpponentPoints: number | null;
  originalResult: "W" | "L" | "T" | "BYE";
  simulatedOpponentName: string;
  simulatedOpponentPoints: number | null;
  simulatedResult: "W" | "L" | "T" | "BYE";
  opponentChanged: boolean;
  resultChanged: boolean;
};

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();
const selectedWeek = ref(0);
const selectedTimelineTeam = ref(0);
const simulatedOpponents = ref<(number | null)[][]>([]);

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
      const matchupNumber = team.matchups[week];
      if (matchupNumber === null || matchupNumber === undefined) return null;
      return null;
    })
  );

  for (let week = 0; week < weeks; week++) {
    const matchupMap = new Map<number, number[]>();
    tableData.forEach((team, teamIndex) => {
      const matchupNumber = team.matchups[week];
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
const playoffSpots = computed(() => {
  const league = store.leagueInfo[store.currentLeagueIndex];
  if (league?.playoffTeams) return league.playoffTeams;
  return Math.max(1, Math.floor(props.tableData.length / 2));
});
const timelineTeamOptions = computed(() =>
  props.tableData.map((team, index) => ({
    index,
    name: teamName(team),
  }))
);

const resetSimulation = () => {
  simulatedOpponents.value = originalOpponents.value.map((teamWeeks) => [
    ...teamWeeks,
  ]);
  selectedWeek.value = 0;
};

watch(
  [() => props.tableData, displayedWeekCount],
  () => {
    resetSimulation();
  },
  { immediate: true, deep: true }
);

watch(
  displayedWeekCount,
  (count) => {
    if (count <= 0) {
      selectedWeek.value = 0;
      return;
    }
    if (selectedWeek.value > count - 1) {
      selectedWeek.value = count - 1;
    }
  },
  { immediate: true }
);

watch(
  () => props.tableData.length,
  (count) => {
    if (count <= 0) {
      selectedTimelineTeam.value = 0;
      return;
    }
    if (selectedTimelineTeam.value > count - 1) {
      selectedTimelineTeam.value = 0;
    }
  },
  { immediate: true }
);

const selectedWeekMatchups = computed(() => {
  const week = selectedWeek.value;
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
    const winner = pointsA === pointsB ? null : pointsA > pointsB ? teamIndex : opponent;
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

  return rows;
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
      const teamPoints = props.tableData[teamIndex]?.points[week] ?? 0;
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
  }

  records.forEach((record) => {
    record.winDelta = Number((record.wins - props.tableData[record.index].wins).toFixed(1));
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
  const playoffCutoff = Math.min(playoffSpots.value, props.tableData.length);

  actualStandings.value.forEach((team, index) => {
    actualSeedByTeam.set(team.index, index + 1);
  });
  simulatedStandings.value.forEach((team, index) => {
    simulatedSeedByTeam.set(team.index, index + 1);
  });

  return props.tableData.reduce(
    (acc, _, index) => {
      const actualSeed = actualSeedByTeam.get(index) ?? props.tableData.length;
      const simulatedSeed = simulatedSeedByTeam.get(index) ?? props.tableData.length;
      acc[index] = {
        actualSeed,
        simulatedSeed,
        seedDelta: actualSeed - simulatedSeed,
        actualInPlayoffs: actualSeed <= playoffCutoff,
        simulatedInPlayoffs: simulatedSeed <= playoffCutoff,
      };
      return acc;
    },
    {} as Record<
      number,
      {
        actualSeed: number;
        simulatedSeed: number;
        seedDelta: number;
        actualInPlayoffs: boolean;
        simulatedInPlayoffs: boolean;
      }
    >
  );
});

const standingsWithSeedDelta = computed(() => {
  return simulatedStandings.value.map((team) => ({
    ...team,
    ...seedAndPlayoffByTeam.value[team.index],
  }));
});

const winsByTeamIndex = computed(() => {
  return simulatedStandings.value.reduce(
    (acc, team) => {
      acc[team.index] = team.wins;
      return acc;
    },
    {} as Record<number, number>
  );
});

const luckSwingSeries = computed(() => {
  const data = props.tableData.map((team, index) => {
    const actualWins = team.wins ?? 0;
    const simulatedWins = winsByTeamIndex.value[index] ?? 0;
    const minWins = Math.min(actualWins, simulatedWins);
    const maxWins = Math.max(actualWins, simulatedWins);
    const seedInfo = seedAndPlayoffByTeam.value[index];
    const fillColor =
      seedInfo?.seedDelta > 0
        ? "#22c55e"
        : seedInfo?.seedDelta < 0
          ? "#ef4444"
          : "#94a3b8";

    return {
      x: teamName(team),
      y: [minWins, maxWins],
      goals: [
        {
          name: "Actual",
          value: actualWins,
          strokeColor: "#f97316",
          strokeHeight: 4,
        },
        {
          name: "Simulated",
          value: simulatedWins,
          strokeColor: "#0ea5e9",
          strokeHeight: 4,
        },
      ],
      fillColor,
      actualWins,
      simulatedWins,
      seedDelta: seedInfo?.seedDelta ?? 0,
    };
  });

  return [{ name: "Wins Shift", data }];
});

const luckSwingChartOptions = computed(() => ({
  chart: {
    type: "rangeBar",
    foreColor: store.darkMode ? "#ffffff" : "#111827",
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: false },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: "65%",
      rangeBarGroupRows: false,
      distributed: true,
    },
  },
  dataLabels: { enabled: false },
  xaxis: {
    title: {
      text: "Wins",
      style: {
        fontSize: "14px",
        fontFamily:
          "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji",
        fontWeight: 600,
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 170,
      formatter: (label: string) => {
        const n = 20;
        return label.length > n ? `${label.slice(0, n - 1)}...` : label;
      },
    },
  },
  tooltip: {
    theme: store.darkMode ? "dark" : "light",
    custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
      const point = luckSwingSeries.value[0].data[dataPointIndex] as {
        x: string;
        actualWins: number;
        simulatedWins: number;
        seedDelta: number;
      };
      if (!point) return "";
      const seedText =
        point.seedDelta > 0
          ? `+${point.seedDelta}`
          : point.seedDelta < 0
            ? `${point.seedDelta}`
            : "0";
      return `<div style="padding:8px 10px;">
        <div style="font-weight:600;">${point.x}</div>
        <div>Actual Wins: ${point.actualWins}</div>
        <div>Simulated Wins: ${point.simulatedWins}</div>
        <div>Seed Delta: ${seedText}</div>
      </div>`;
    },
  },
  legend: {
    show: true,
    customLegendItems: [
      "Actual marker (orange)",
      "Simulated marker (blue)",
      "Seed up (green) / down (red)",
    ],
    markers: {
      fillColors: ["#f97316", "#0ea5e9", "#22c55e"],
    },
  },
}));

const randomizeEntireSchedule = () => {
  const totalWeeks = displayedWeekCount.value;
  const teamIndexes = props.tableData.map((_, index) => index);
  const nextOpponents = originalOpponents.value.map((teamWeeks) => [...teamWeeks]);

  for (let week = 0; week < totalWeeks; week++) {
    const originalByes = teamIndexes.filter(
      (index) => originalOpponents.value[index]?.[week] === null
    );
    const activeTeams = teamIndexes.filter((index) => !originalByes.includes(index));

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

function getResultForWeek(
  teamIndex: number,
  opponentIndex: number | null,
  weekIndex: number
): "W" | "L" | "T" | "BYE" {
  if (opponentIndex === null || opponentIndex === undefined) return "BYE";
  const teamPoints = props.tableData[teamIndex]?.points[weekIndex] ?? 0;
  const opponentPoints = props.tableData[opponentIndex]?.points[weekIndex] ?? 0;
  if (teamPoints > opponentPoints) return "W";
  if (teamPoints < opponentPoints) return "L";
  return "T";
}

const timelineRows = computed<TimelineRow[]>(() => {
  const teamIndex = selectedTimelineTeam.value;
  const team = props.tableData[teamIndex];
  if (!team) return [];

  return Array.from({ length: displayedWeekCount.value }, (_, weekIndex) => {
    const originalOpponentIndex = originalOpponents.value[teamIndex]?.[weekIndex] ?? null;
    const simulatedOpponentIndex = simulatedOpponents.value[teamIndex]?.[weekIndex] ?? null;
    const teamPoints = team.points[weekIndex] ?? 0;

    const originalOpponentName =
      originalOpponentIndex === null
        ? "BYE"
        : teamName(props.tableData[originalOpponentIndex] as TableDataType);
    const simulatedOpponentName =
      simulatedOpponentIndex === null
        ? "BYE"
        : teamName(props.tableData[simulatedOpponentIndex] as TableDataType);

    const originalOpponentPoints =
      originalOpponentIndex === null
        ? null
        : (props.tableData[originalOpponentIndex]?.points[weekIndex] ?? 0);
    const simulatedOpponentPoints =
      simulatedOpponentIndex === null
        ? null
        : (props.tableData[simulatedOpponentIndex]?.points[weekIndex] ?? 0);

    const originalResult = getResultForWeek(teamIndex, originalOpponentIndex, weekIndex);
    const simulatedResult = getResultForWeek(teamIndex, simulatedOpponentIndex, weekIndex);

    return {
      week: weekIndex + 1,
      teamPoints,
      originalOpponentName,
      originalOpponentPoints,
      originalResult,
      simulatedOpponentName,
      simulatedOpponentPoints,
      simulatedResult,
      opponentChanged: originalOpponentIndex !== simulatedOpponentIndex,
      resultChanged: originalResult !== simulatedResult,
    };
  });
});
</script>
<template>
  <Card class="w-full p-4 mt-4 md:p-6">
    <h2 class="text-2xl font-bold">Schedule Simulator</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Try different weekly matchups and compare the simulated standings to actual records.
    </p>

    <div class="flex flex-wrap items-end gap-3 mt-4">
      <div class="flex flex-col">
        <label class="text-sm text-muted-foreground">Week</label>
        <select
          v-model.number="selectedWeek"
          class="px-2 py-2 mt-1 text-sm border rounded-md bg-background min-w-44"
        >
          <option v-for="week in displayedWeekCount" :key="week" :value="week - 1">
            Week {{ week }}
          </option>
        </select>
      </div>
      <button
        @click="randomizeEntireSchedule"
        class="px-3 py-2 text-sm border rounded-md bg-secondary hover:bg-accent"
      >
        Randomize Entire Schedule
      </button>
    </div>

    <div class="p-3 mt-4 border rounded-lg overflow-x-auto">
      <h3 class="text-lg font-semibold">Schedule Luck Swing (Actual vs Simulated Wins)</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Orange marker is actual wins, blue marker is simulated wins. Bar color reflects seed movement.
      </p>
      <apexchart
        type="rangeBar"
        width="100%"
        height="430"
        :options="luckSwingChartOptions"
        :series="luckSwingSeries"
      ></apexchart>
    </div>

    <div class="grid grid-cols-1 gap-4 mt-6 lg:grid-cols-2">
      <div class="p-3 border rounded-lg">
        <h3 class="text-lg font-semibold">Week {{ selectedWeek + 1 }} Matchups</h3>
        <div v-if="selectedWeekMatchups.length === 0" class="mt-2 text-sm text-muted-foreground">
          No matchups found for this week.
        </div>
        <div v-else class="mt-2 space-y-2">
          <div
            v-for="matchup in selectedWeekMatchups"
            :key="`matchup-${selectedWeek}-${matchup.teamA}-${matchup.teamB}`"
            class="p-2 border rounded-md"
            :class="matchup.changed ? 'border-primary' : ''"
          >
            <p class="text-sm">
              <span
                class="font-medium"
                :class="matchup.winner === matchup.teamA ? 'text-primary' : ''"
              >
                {{ teamName(tableData[matchup.teamA]) }}
              </span>
              <span class="mx-1 text-muted-foreground">({{ matchup.pointsA.toFixed(2) }})</span>
              vs
              <span
                class="ml-1 font-medium"
                :class="matchup.winner === matchup.teamB ? 'text-primary' : ''"
              >
                {{ teamName(tableData[matchup.teamB]) }}
              </span>
              <span class="mx-1 text-muted-foreground">({{ matchup.pointsB.toFixed(2) }})</span>
              <span v-if="matchup.winner === null" class="ml-2 text-xs text-muted-foreground">
                Tie
              </span>
              <span v-if="matchup.changed" class="ml-2 text-xs text-primary">Simulated</span>
            </p>
          </div>
        </div>
      </div>

      <div class="p-3 border rounded-lg overflow-x-auto">
        <h3 class="text-lg font-semibold">Simulated Standings</h3>
        <table class="w-full mt-2 text-sm">
          <thead class="text-xs uppercase text-muted-foreground">
            <tr>
              <th class="pb-2 text-left">Team</th>
              <th class="pb-2 text-left">Record</th>
              <th class="pb-2 text-left">Wins Delta</th>
              <th class="pb-2 text-left">Seed Delta</th>
              <th class="pb-2 text-left">Playoff Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="team in standingsWithSeedDelta"
              :key="`sim-${team.index}`"
              class="border-t"
            >
              <td class="py-2 pr-2">{{ team.name }}</td>
              <td class="py-2 pr-2">{{ team.wins }}-{{ team.losses }}<span v-if="team.ties">-{{ team.ties }}</span></td>
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
                {{ team.winDelta > 0 ? "+" : "" }}{{ team.winDelta.toFixed(1) }}
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
              <td class="py-2 pr-2">
                <span v-if="!team.actualInPlayoffs && team.simulatedInPlayoffs" class="text-primary">
                  In (from Out)
                </span>
                <span v-else-if="team.actualInPlayoffs && !team.simulatedInPlayoffs" class="text-destructive">
                  Out (from In)
                </span>
                <span v-else-if="team.simulatedInPlayoffs">In</span>
                <span v-else>Out</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="p-3 mt-4 border rounded-lg overflow-x-auto">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold">Head-to-Head Timeline Diff</h3>
          <p class="text-sm text-muted-foreground">
            Week-by-week original opponent/result versus simulated opponent/result.
          </p>
        </div>
        <div class="flex flex-col">
          <label class="text-sm text-muted-foreground">Team</label>
          <select
            v-model.number="selectedTimelineTeam"
            class="px-2 py-2 mt-1 text-sm border rounded-md bg-background min-w-48"
          >
            <option v-for="team in timelineTeamOptions" :key="team.index" :value="team.index">
              {{ team.name }}
            </option>
          </select>
        </div>
      </div>
      <table class="w-full mt-3 text-sm">
        <thead class="text-xs uppercase text-muted-foreground">
          <tr>
            <th class="pb-2 text-left">Week</th>
            <th class="pb-2 text-left">Team Pts</th>
            <th class="pb-2 text-left">Original</th>
            <th class="pb-2 text-left">Simulated</th>
            <th class="pb-2 text-left">Diff</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in timelineRows" :key="`timeline-${row.week}`" class="border-t">
            <td class="py-2 pr-2">W{{ row.week }}</td>
            <td class="py-2 pr-2">{{ row.teamPoints.toFixed(2) }}</td>
            <td class="py-2 pr-2">
              {{ row.originalOpponentName }}
              <span v-if="row.originalOpponentPoints !== null" class="text-muted-foreground">
                ({{ row.originalOpponentPoints.toFixed(2) }})
              </span>
              <span class="ml-1 font-medium">[{{ row.originalResult }}]</span>
            </td>
            <td class="py-2 pr-2">
              {{ row.simulatedOpponentName }}
              <span v-if="row.simulatedOpponentPoints !== null" class="text-muted-foreground">
                ({{ row.simulatedOpponentPoints.toFixed(2) }})
              </span>
              <span class="ml-1 font-medium">[{{ row.simulatedResult }}]</span>
            </td>
            <td class="py-2 pr-2">
              <span v-if="row.opponentChanged || row.resultChanged" class="text-primary">
                {{ row.opponentChanged ? "Opponent changed" : "" }}
                {{
                  row.opponentChanged && row.resultChanged
                    ? " + "
                    : row.resultChanged
                      ? "Result changed"
                      : ""
                }}
              </span>
              <span v-else class="text-muted-foreground">No change</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </Card>
</template>
