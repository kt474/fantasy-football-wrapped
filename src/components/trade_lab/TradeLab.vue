<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { TableDataType } from "../../types/types.ts";
import { useStore } from "../../store/store";
import { getPlayersByIdsMap, getSingleWeekProjection } from "../../api/api.ts";
import { Player } from "../../types/apiTypes.ts";
import Card from "../ui/card/Card.vue";
import Separator from "../ui/separator/Separator.vue";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type TradeLabPlayer = Player & {
  projection: number;
  isStarter: boolean;
};

type TradeLabRoster = {
  id: number;
  managerName: string;
  players: TradeLabPlayer[];
  totalProjection: number;
};

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();
const rosters = ref<TradeLabRoster[]>([]);
const loading = ref(false);
const selectedWeek = ref(1);
const selectedTeamAId = ref<number | null>(null);
const selectedTeamBId = ref<number | null>(null);
const teamASends = ref<string[]>([]);
const teamBSends = ref<string[]>([]);
const draggedPlayer = ref<{ playerId: string; fromTeam: "A" | "B" } | null>(
  null
);

const activeLeague = computed(() => store.leagueInfo[store.currentLeagueIndex]);

const fallbackWeek = computed(() => {
  if (!activeLeague.value) return 1;
  const nextWeek = Math.min((activeLeague.value.lastScoredWeek || 0) + 1, 18);
  return Math.max(1, nextWeek);
});

const teamA = computed(() =>
  rosters.value.find((team) => team.id === selectedTeamAId.value)
);
const teamB = computed(() =>
  rosters.value.find((team) => team.id === selectedTeamBId.value)
);

const teamAOutgoingPlayers = computed(() => {
  if (!teamA.value) return [];
  return teamA.value.players.filter((player) =>
    teamASends.value.includes(player.player_id)
  );
});

const teamBOutgoingPlayers = computed(() => {
  if (!teamB.value) return [];
  return teamB.value.players.filter((player) =>
    teamBSends.value.includes(player.player_id)
  );
});

const teamAOutgoingProjection = computed(() =>
  teamAOutgoingPlayers.value.reduce(
    (sum, player) => sum + (Number(player.projection) || 0),
    0
  )
);

const teamBOutgoingProjection = computed(() =>
  teamBOutgoingPlayers.value.reduce(
    (sum, player) => sum + (Number(player.projection) || 0),
    0
  )
);

const teamAAfterTradeProjection = computed(() => {
  if (!teamA.value) return 0;
  return (
    teamA.value.totalProjection -
    teamAOutgoingProjection.value +
    teamBOutgoingProjection.value
  );
});

const teamBAfterTradeProjection = computed(() => {
  if (!teamB.value) return 0;
  return (
    teamB.value.totalProjection -
    teamBOutgoingProjection.value +
    teamAOutgoingProjection.value
  );
});

const teamANet = computed(() =>
  Number(
    (
      teamAAfterTradeProjection.value - (teamA.value?.totalProjection || 0)
    ).toFixed(2)
  )
);

const teamBNet = computed(() =>
  Number(
    (
      teamBAfterTradeProjection.value - (teamB.value?.totalProjection || 0)
    ).toFixed(2)
  )
);

const getWeekLineup = (team: TableDataType, weekIndex: number) => {
  const starters =
    Array.isArray(team.starters?.[weekIndex]) && team.starters[weekIndex]
      ? team.starters[weekIndex]
      : [];
  const benchByWeek = Array.isArray((team.benchPlayers as any)?.[weekIndex])
    ? ((team.benchPlayers as any)[weekIndex] as string[])
    : [];
  const bench =
    benchByWeek.length > 0
      ? benchByWeek
      : (team.players || []).filter((id) => !starters.includes(id));

  return { starters, bench };
};

const fetchPlayers = async () => {
  if (store.leagueIds.length === 0 || !activeLeague.value) {
    rosters.value = [];
    return;
  }

  loading.value = true;
  const weekIndex = selectedWeek.value - 1;
  const currentLeague = activeLeague.value;

  try {
    const uniquePlayerIds = Array.from(
      new Set(
        props.tableData
          .map((team) => {
            const lineup = getWeekLineup(team, weekIndex);
            return [...lineup.starters, ...lineup.bench];
          })
          .flat()
      )
    );

    const playerMap =
      uniquePlayerIds.length > 0
        ? await getPlayersByIdsMap(uniquePlayerIds)
        : new Map<string, Player>();

    const projectionEntries = await Promise.all(
      uniquePlayerIds.map(async (playerId) => {
        const projection = await getSingleWeekProjection(
          playerId,
          currentLeague.season,
          selectedWeek.value,
          currentLeague.scoringType
        );
        return [playerId, Number(projection?.stats || 0)] as const;
      })
    );
    const projectionMap = new Map<string, number>(projectionEntries);

    rosters.value = props.tableData.map((team) => {
      const { starters, bench } = getWeekLineup(team, weekIndex);
      const allPlayers = [...starters, ...bench]
        .map((playerId) => {
          const playerMeta = playerMap.get(playerId);
          if (!playerMeta) return null;

          return {
            ...playerMeta,
            projection: Number(projectionMap.get(playerId) || 0),
            isStarter: starters.includes(playerId),
          };
        })
        .filter((player): player is TradeLabPlayer => player !== null)
        .sort((a, b) => b.projection - a.projection);

      const managerName = store.showUsernames
        ? team.username || team.name
        : team.name || team.username;

      return {
        id: team.rosterId,
        managerName: managerName || `Roster ${team.rosterId}`,
        players: allPlayers,
        totalProjection: Number(
          allPlayers
            .reduce((sum, player) => sum + player.projection, 0)
            .toFixed(2)
        ),
      };
    });
  } finally {
    loading.value = false;
  }
};

const resetTrade = () => {
  teamASends.value = [];
  teamBSends.value = [];
};

const syncTeamSelections = () => {
  if (rosters.value.length < 2) {
    selectedTeamAId.value = rosters.value[0]?.id ?? null;
    selectedTeamBId.value = null;
    resetTrade();
    return;
  }

  const existingA = rosters.value.some(
    (team) => team.id === selectedTeamAId.value
  );
  const existingB = rosters.value.some(
    (team) => team.id === selectedTeamBId.value
  );

  if (!existingA) selectedTeamAId.value = rosters.value[0].id;
  if (!existingB) {
    selectedTeamBId.value =
      rosters.value.find((team) => team.id !== selectedTeamAId.value)?.id ??
      null;
  }

  if (selectedTeamAId.value === selectedTeamBId.value) {
    selectedTeamBId.value =
      rosters.value.find((team) => team.id !== selectedTeamAId.value)?.id ??
      null;
  }

  resetTrade();
};

const handleTeamSelectionChange = (team: "A" | "B", rosterId: number) => {
  if (team === "A") {
    selectedTeamAId.value = rosterId;
    if (selectedTeamBId.value === rosterId) {
      selectedTeamBId.value =
        rosters.value.find((entry) => entry.id !== rosterId)?.id ?? null;
    }
  } else {
    selectedTeamBId.value = rosterId;
    if (selectedTeamAId.value === rosterId) {
      selectedTeamAId.value =
        rosters.value.find((entry) => entry.id !== rosterId)?.id ?? null;
    }
  }
  resetTrade();
};

const onPlayerDragStart = (playerId: string, fromTeam: "A" | "B") => {
  draggedPlayer.value = { playerId, fromTeam };
};

const onDropToTradePackage = (targetTeam: "A" | "B") => {
  if (!draggedPlayer.value || draggedPlayer.value.fromTeam !== targetTeam)
    return;

  const source = targetTeam === "A" ? teamASends : teamBSends;
  const playerId = draggedPlayer.value.playerId;
  if (!source.value.includes(playerId)) {
    source.value.push(playerId);
  }
  draggedPlayer.value = null;
};

const removeFromPackage = (targetTeam: "A" | "B", playerId: string) => {
  if (targetTeam === "A") {
    teamASends.value = teamASends.value.filter((id) => id !== playerId);
    return;
  }
  teamBSends.value = teamBSends.value.filter((id) => id !== playerId);
};

const isIncluded = (team: "A" | "B", playerId: string) => {
  return team === "A"
    ? teamASends.value.includes(playerId)
    : teamBSends.value.includes(playerId);
};

const projectionText = (value: number) => value.toFixed(2);
const netClass = (value: number) =>
  value > 0
    ? "text-emerald-500"
    : value < 0
      ? "text-rose-500"
      : "text-muted-foreground";

watch(
  () => store.currentLeagueId,
  () => {
    selectedWeek.value = fallbackWeek.value;
    fetchPlayers();
  }
);

watch(
  () => selectedWeek.value,
  () => fetchPlayers()
);

watch(
  () => rosters.value,
  () => syncTeamSelections()
);

onMounted(async () => {
  selectedWeek.value = fallbackWeek.value;
  await fetchPlayers();
});
</script>
<template>
  <Card class="w-full h-full p-4 mt-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h5 class="text-3xl font-bold leading-none">Trade Lab (Beta)</h5>
    </div>
    <p class="mt-4 text-muted-foreground">
      Drag players into each team's package to brainstorm offers.
    </p>

    <div v-if="loading" class="py-2 mb-96">
      Loading players and projections...
    </div>
    <div v-else>
      <div class="grid gap-3 mt-3 mb-2 lg:grid-cols-2">
        <div>
          <Select
            :model-value="selectedTeamAId"
            @update:model-value="handleTeamSelectionChange('A', Number($event))"
          >
            <SelectTrigger class="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="team in rosters"
                :key="team.id"
                :value="team.id"
                :disabled="team.id === selectedTeamBId"
              >
                {{ team.managerName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select
            :model-value="selectedTeamBId"
            @update:model-value="handleTeamSelectionChange('B', Number($event))"
          >
            <SelectTrigger class="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="team in rosters"
                :key="team.id"
                :value="team.id"
                :disabled="team.id === selectedTeamAId"
              >
                {{ team.managerName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="grid gap-3 xl:grid-cols-3">
        <Card class="p-3">
          <p class="mb-2 font-semibold">{{ teamA?.managerName }}</p>
          <p class="mb-2 text-xs text-muted-foreground">
            Roster projection: {{ projectionText(teamA?.totalProjection || 0) }}
          </p>
          <div class="trade-player-list">
            <button
              v-for="player in teamA?.players || []"
              :key="`A-${player.player_id}`"
              draggable="true"
              @dragstart="onPlayerDragStart(player.player_id, 'A')"
              type="button"
              class="trade-player-chip"
              :class="{
                'trade-player-chip-selected': isIncluded('A', player.player_id),
              }"
            >
              <span class="font-medium">
                {{ player.name || `${player.team} Defense` }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ player.position }} • {{ projectionText(player.projection) }}
                {{ player.isStarter ? "• Starter" : "" }}
              </span>
            </button>
          </div>
        </Card>

        <Card class="p-3">
          <p class="mb-1 text-sm font-semibold">Trade Package</p>
          <p class="text-xs text-muted-foreground">
            Drop from each roster into its matching side.
          </p>
          <Separator class="h-px my-2" />

          <div
            class="trade-drop-zone"
            @dragover.prevent
            @drop.prevent="onDropToTradePackage('A')"
          >
            <p class="mb-2 text-sm font-semibold">
              {{ teamA?.managerName }} sends
            </p>
            <div
              v-if="teamAOutgoingPlayers.length === 0"
              class="text-sm text-muted-foreground"
            >
              Drop Team A players here
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="player in teamAOutgoingPlayers"
                :key="`send-a-${player.player_id}`"
                class="trade-selected-player"
              >
                <span>{{ player.name || `${player.team} Defense` }}</span>
                <button
                  type="button"
                  class="text-xs underline text-muted-foreground"
                  @click="removeFromPackage('A', player.player_id)"
                >
                  remove
                </button>
              </div>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">
              Outgoing projection: {{ projectionText(teamAOutgoingProjection) }}
            </p>
          </div>

          <div
            class="mt-3 trade-drop-zone"
            @dragover.prevent
            @drop.prevent="onDropToTradePackage('B')"
          >
            <p class="mb-2 text-sm font-semibold">
              {{ teamB?.managerName }} sends
            </p>
            <div
              v-if="teamBOutgoingPlayers.length === 0"
              class="text-sm text-muted-foreground"
            >
              Drop Team B players here
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="player in teamBOutgoingPlayers"
                :key="`send-b-${player.player_id}`"
                class="trade-selected-player"
              >
                <span>{{ player.name || `${player.team} Defense` }}</span>
                <button
                  type="button"
                  class="text-xs underline text-muted-foreground"
                  @click="removeFromPackage('B', player.player_id)"
                >
                  remove
                </button>
              </div>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">
              Outgoing projection: {{ projectionText(teamBOutgoingProjection) }}
            </p>
          </div>

          <Separator class="h-px my-3" />
          <div class="text-sm">
            <p class="font-semibold">Quick Impact</p>
            <p class="mt-1">
              {{ teamA?.managerName }} net:
              <span :class="netClass(teamANet)">
                {{ teamANet > 0 ? "+" : "" }}{{ projectionText(teamANet) }}
              </span>
            </p>
            <p>
              {{ teamB?.managerName }} net:
              <span :class="netClass(teamBNet)">
                {{ teamBNet > 0 ? "+" : "" }}{{ projectionText(teamBNet) }}
              </span>
            </p>
          </div>
        </Card>

        <Card class="p-3">
          <p class="mb-2 font-semibold">{{ teamB?.managerName }}</p>
          <p class="mb-2 text-xs text-muted-foreground">
            Roster projection: {{ projectionText(teamB?.totalProjection || 0) }}
          </p>
          <div class="trade-player-list">
            <button
              v-for="player in teamB?.players || []"
              :key="`B-${player.player_id}`"
              draggable="true"
              @dragstart="onPlayerDragStart(player.player_id, 'B')"
              type="button"
              class="trade-player-chip"
              :class="{
                'trade-player-chip-selected': isIncluded('B', player.player_id),
              }"
            >
              <span class="font-medium">
                {{ player.name || `${player.team} Defense` }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ player.position }} • {{ projectionText(player.projection) }}
                {{ player.isStarter ? "• Starter" : "" }}
              </span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.trade-player-list {
  display: grid;
  gap: 0.5rem;
  max-height: 28rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.trade-player-chip {
  align-items: flex-start;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.6rem;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.55rem 0.65rem;
  text-align: left;
  width: 100%;
}

.trade-player-chip:hover {
  border-color: hsl(var(--primary));
}

.trade-player-chip-selected {
  background: hsl(var(--primary) / 0.08);
  border-color: hsl(var(--primary));
}

.trade-drop-zone {
  border: 1px dashed hsl(var(--border));
  border-radius: 0.7rem;
  min-height: 7rem;
  padding: 0.75rem;
}

.trade-selected-player {
  align-items: center;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  display: flex;
  font-size: 0.9rem;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
}
</style>
