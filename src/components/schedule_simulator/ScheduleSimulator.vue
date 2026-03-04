<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { TableDataType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import { useStore } from "../../store/store";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

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

const resetSimulation = () => {
  simulatedOpponents.value = originalOpponents.value.map((teamWeeks) => [
    ...teamWeeks,
  ]);
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
    matchupsByWeek.value.find((week) => week.value === selectedWeekValue.value) ||
    matchupsByWeek.value[0] || { week: 1, value: "week-1", rows: [] }
  );
});

const selectedWeekMatchups = computed(() => {
  return selectedWeekData.value.rows;
});

const selectedWeekChangedCount = computed(() => {
  return selectedWeekData.value.rows.filter((row) => row.changed).length;
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
      const simulatedSeed =
        simulatedSeedByTeam.get(index) ?? props.tableData.length;
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
    actualWins: props.tableData[team.index]?.wins ?? 0,
    actualLosses: props.tableData[team.index]?.losses ?? 0,
    actualTies: props.tableData[team.index]?.ties ?? 0,
  }));
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
</script>

<template>
  <Card class="w-full h-full p-4 mt-4 md:p-6">
    <p class="text-3xl font-bold leading-none">Schedule Simulator (Beta)</p>
    <p class="mt-4 text-muted-foreground">
      Analyze the impact of weekly matchup scheduling on the final standings.
    </p>

    <div class="flex flex-wrap items-center gap-2 mt-4">
      <Button @click="randomizeEntireSchedule">Randomize Schedule</Button>
    </div>

    <div class="grid grid-cols-1 gap-4 mt-2 lg:grid-cols-2">
      <Card class="px-4 py-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-lg font-semibold">Matchups</h3>
          <p class="text-xs text-muted-foreground">
            Week {{ selectedWeekData.week }} · {{ selectedWeekChangedCount }} changed
          </p>
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
              <span class="mx-1 text-muted-foreground">({{ matchup.pointsA.toFixed(2) }})</span>
              vs
              <span
                class="ml-1 font-medium"
                :class="matchup.winner === matchup.teamB ? 'text-primary' : ''"
              >
                {{ teamName(tableData[matchup.teamB]) }}
              </span>
              <span class="mx-1 text-muted-foreground">({{ matchup.pointsB.toFixed(2) }})</span>
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
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </Card>
</template>
