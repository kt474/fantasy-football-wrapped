<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { TableDataType } from "../../types/types.ts";
import { useStore } from "../../store/store";
import { getPlayersByIdsMap } from "../../api/api.ts";
import { getStats } from "../../api/sleeperApi.ts";
import { Player } from "../../types/apiTypes.ts";
import Card from "../ui/card/Card.vue";
import Separator from "../ui/separator/Separator.vue";
import { Label } from "../ui/label/index.ts";
import Button from "../ui/button/Button.vue";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-vue-next";

type TradeLabPlayer = Player & {
  projection: number;
  overallRank: number;
};

type TradeLabRoster = {
  id: number;
  managerName: string;
  players: TradeLabPlayer[];
};

type TradeDraftPickAsset = {
  id: string;
  season: number;
  round: number;
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
const teamAFaab = ref(0);
const teamBFaab = ref(0);
const pendingTeamAFaab = ref(0);
const pendingTeamBFaab = ref(0);
const teamAPicks = ref<TradeDraftPickAsset[]>([]);
const teamBPicks = ref<TradeDraftPickAsset[]>([]);
const pendingAPickSeason = ref<number | null>(null);
const pendingAPickRound = ref<number | null>(null);
const pendingBPickSeason = ref<number | null>(null);
const pendingBPickRound = ref<number | null>(null);
const draggedPlayer = ref<{ playerId: string; fromTeam: "A" | "B" } | null>(
  null
);
const isMobile = ref(false);

const activeLeague = computed(() => store.leagueInfo[store.currentLeagueIndex]);

const fallbackWeek = computed(() => {
  if (!activeLeague.value) return 1;
  const nextWeek = Math.min((activeLeague.value.lastScoredWeek || 0) + 1, 18);
  return Math.max(1, nextWeek);
});

const draftSeasons = computed(() => {
  const baseYear =
    Number(activeLeague.value?.season) || new Date().getFullYear();
  return [baseYear, baseYear + 1, baseYear + 2];
});

const draftRounds = computed(() => {
  const picks = activeLeague.value?.draftPicks || [];
  const maxRoundFromLeague = picks.reduce((maxRound, pick) => {
    return Math.max(maxRound, Number(pick.round || 0));
  }, 0);
  const maxRound = Math.max(maxRoundFromLeague, 6);
  return Array.from({ length: maxRound }, (_, idx) => idx + 1);
});

const pendingAPickSeasonModel = computed({
  get: () => String(pendingAPickSeason.value ?? ""),
  set: (value: string) => {
    pendingAPickSeason.value = Number(value);
  },
});

const pendingAPickRoundModel = computed({
  get: () => String(pendingAPickRound.value ?? ""),
  set: (value: string) => {
    pendingAPickRound.value = Number(value);
  },
});

const pendingBPickSeasonModel = computed({
  get: () => String(pendingBPickSeason.value ?? ""),
  set: (value: string) => {
    pendingBPickSeason.value = Number(value);
  },
});

const pendingBPickRoundModel = computed({
  get: () => String(pendingBPickRound.value ?? ""),
  set: (value: string) => {
    pendingBPickRound.value = Number(value);
  },
});

const teamAFaabInputModel = computed({
  get: () => String(pendingTeamAFaab.value ?? 0),
  set: (value: string | number) => {
    pendingTeamAFaab.value = Math.max(0, Number(value || 0));
  },
});

const teamBFaabInputModel = computed({
  get: () => String(pendingTeamBFaab.value ?? 0),
  set: (value: string | number) => {
    pendingTeamBFaab.value = Math.max(0, Number(value || 0));
  },
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

const getWeekLineup = (team: TableDataType, weekIndex: number) => {
  const starters =
    Array.isArray(team.starters?.[weekIndex]) && team.starters[weekIndex]
      ? team.starters[weekIndex]
      : [];
  const benchByWeek = Array.isArray(team.benchPlayers?.[weekIndex])
    ? team.benchPlayers[weekIndex]
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
        const projection = await getStats(
          playerId,
          currentLeague.season,
          currentLeague.scoringType
        );
        return [
          playerId,
          {
            rank: Number(projection?.rank || 0),
            overallRank: Number(projection?.overallRank || 0),
          },
        ] as const;
      })
    );
    const projectionMap = new Map<
      string,
      { rank: number; overallRank: number }
    >(projectionEntries);

    rosters.value = props.tableData.map((team) => {
      const { starters, bench } = getWeekLineup(team, weekIndex);
      const allPlayers = [...starters, ...bench]
        .map((playerId) => {
          const playerMeta = playerMap.get(playerId);
          if (!playerMeta) return null;
          const playerProjection = projectionMap.get(playerId);

          return {
            ...playerMeta,
            projection: Number(playerProjection?.rank || 0),
            overallRank: Number(playerProjection?.overallRank || 0),
          };
        })
        .filter((player): player is TradeLabPlayer => player !== null)
        .sort((a, b) => a.overallRank - b.overallRank);

      const managerName = store.showUsernames
        ? team.username || team.name
        : team.name || team.username;

      return {
        id: team.rosterId,
        managerName: managerName || `Roster ${team.rosterId}`,
        players: allPlayers,
      };
    });
  } finally {
    loading.value = false;
  }
};

const resetTrade = () => {
  teamASends.value = [];
  teamBSends.value = [];
  teamAFaab.value = 0;
  teamBFaab.value = 0;
  teamAPicks.value = [];
  teamBPicks.value = [];
  pendingAPickSeason.value = draftSeasons.value[0] ?? null;
  pendingBPickSeason.value = draftSeasons.value[0] ?? null;
  pendingAPickRound.value = draftRounds.value[0] ?? null;
  pendingBPickRound.value = draftRounds.value[0] ?? null;
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

const updateMobileState = () => {
  isMobile.value = window.innerWidth < 640;
};

const onPlayerDragStart = (playerId: string, fromTeam: "A" | "B") => {
  draggedPlayer.value = { playerId, fromTeam };
};

const onPlayerCardTap = (team: "A" | "B", playerId: string) => {
  if (!isMobile.value) return;

  const selectedPlayers = team === "A" ? teamASends : teamBSends;
  if (selectedPlayers.value.includes(playerId)) {
    selectedPlayers.value = selectedPlayers.value.filter(
      (id) => id !== playerId
    );
    return;
  }
  selectedPlayers.value.push(playerId);
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

const addDraftPickToPackage = (team: "A" | "B") => {
  const season =
    team === "A" ? pendingAPickSeason.value : pendingBPickSeason.value;
  const round =
    team === "A" ? pendingAPickRound.value : pendingBPickRound.value;
  if (!season || !round) return;

  const newPick: TradeDraftPickAsset = {
    id: `${team}-${season}-${round}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    season,
    round,
  };

  if (team === "A") {
    teamAPicks.value.push(newPick);
    return;
  }

  teamBPicks.value.push(newPick);
};

const openAssetsModal = (team: "A" | "B") => {
  if (team === "A") {
    pendingTeamAFaab.value = teamAFaab.value;
    return;
  }
  pendingTeamBFaab.value = teamBFaab.value;
};

const addFaabToPackage = (team: "A" | "B") => {
  if (team === "A") {
    teamAFaab.value = Math.max(0, pendingTeamAFaab.value);
    return;
  }
  teamBFaab.value = Math.max(0, pendingTeamBFaab.value);
};

const removeDraftPickFromPackage = (team: "A" | "B", pickId: string) => {
  if (team === "A") {
    teamAPicks.value = teamAPicks.value.filter((pick) => pick.id !== pickId);
    return;
  }

  teamBPicks.value = teamBPicks.value.filter((pick) => pick.id !== pickId);
};

const clearFaab = (team: "A" | "B") => {
  if (team === "A") {
    teamAFaab.value = 0;
    return;
  }
  teamBFaab.value = 0;
};

const isIncluded = (team: "A" | "B", playerId: string) => {
  return team === "A"
    ? teamASends.value.includes(playerId)
    : teamBSends.value.includes(playerId);
};

const rankLabel = (rank: number) => {
  return rank > 0 ? `#${rank}` : "N/A";
};

const waiverPaletteClass = (tier: number) => {
  if (tier === 1) return "bg-emerald-500 dark:bg-emerald-600 text-gray-50";
  if (tier === 2) return "bg-green-500 dark:bg-green-600 text-gray-50";
  if (tier === 3) return "bg-yellow-300 dark:bg-yellow-600 text-black";
  if (tier === 4) return "bg-orange-400 dark:bg-orange-500 text-gray-50";
  return "bg-red-400 dark:bg-red-600 text-gray-50";
};

const posRankClass = (rank: number) => {
  if (rank <= 0) return "bg-muted text-muted-foreground";
  if (rank <= 12) return waiverPaletteClass(1);
  if (rank <= 24) return waiverPaletteClass(2);
  if (rank <= 36) return waiverPaletteClass(3);
  if (rank <= 48) return waiverPaletteClass(4);
  return waiverPaletteClass(5);
};

const overallRankClass = (rank: number) => {
  if (rank <= 0) return "bg-muted text-muted-foreground";
  if (rank <= 24) return waiverPaletteClass(1);
  if (rank <= 60) return waiverPaletteClass(2);
  if (rank <= 120) return waiverPaletteClass(3);
  if (rank <= 180) return waiverPaletteClass(4);
  return waiverPaletteClass(5);
};

const positionWeights: Record<string, number> = {
  QB: 0.82,
  RB: 1.3,
  WR: 1.16,
  TE: 1.08,
  K: 0.35,
  DEF: 0.45,
};

const depthMultipliers = [1, 0.64, 0.38, 0.2];
const faabValuePerDollar = 0.17;

const rankToScore = (rank: number) => {
  if (!rank || rank <= 0) return 0;
  return 100 / Math.sqrt(rank + 2);
};

const getPlayerTradeScore = (player: TradeLabPlayer) => {
  const posScore = rankToScore(player.projection);
  const overallScore = rankToScore(player.overallRank);
  const baseScore = posScore * 0.67 + overallScore * 0.33;
  const positionWeight = positionWeights[player.position] ?? 1;
  return baseScore * positionWeight;
};

const getPackageTradeValue = (players: TradeLabPlayer[]) => {
  if (players.length === 0) return 0;
  const sortedScores = players
    .map((player) => getPlayerTradeScore(player))
    .sort((a, b) => b - a);

  const total = sortedScores.reduce((sum, score, index) => {
    const multiplier =
      depthMultipliers[index] ?? depthMultipliers[depthMultipliers.length - 1];
    return sum + score * multiplier;
  }, 0);

  return Number(total.toFixed(2));
};

const getDraftPickTradeValue = (pick: TradeDraftPickAsset) => {
  const roundBaseValue =
    {
      1: 38,
      2: 24,
      3: 14,
      4: 8,
      5: 5,
      6: 3.2,
      7: 2.2,
      8: 1.6,
      9: 1.2,
      10: 0.9,
      11: 0.7,
      12: 0.55,
    }[pick.round] ?? Math.max(0.4, 7 / (pick.round + 1));

  const seasonGap = Math.max(0, pick.season - draftSeasons.value[0]);
  const seasonMultiplier = Math.max(0.74, 1 - seasonGap * 0.1);

  return Number((roundBaseValue * seasonMultiplier).toFixed(2));
};

const teamAPlayerValue = computed(() =>
  getPackageTradeValue(teamAOutgoingPlayers.value)
);
const teamBPlayerValue = computed(() =>
  getPackageTradeValue(teamBOutgoingPlayers.value)
);

const teamADraftPickValue = computed(() =>
  Number(
    teamAPicks.value
      .reduce((sum, pick) => sum + getDraftPickTradeValue(pick), 0)
      .toFixed(2)
  )
);
const teamBDraftPickValue = computed(() =>
  Number(
    teamBPicks.value
      .reduce((sum, pick) => sum + getDraftPickTradeValue(pick), 0)
      .toFixed(2)
  )
);

const teamAFaabValue = computed(() =>
  Number((teamAFaab.value * faabValuePerDollar).toFixed(2))
);
const teamBFaabValue = computed(() =>
  Number((teamBFaab.value * faabValuePerDollar).toFixed(2))
);

const teamATradeValue = computed(() =>
  Number(
    (
      teamAPlayerValue.value +
      teamADraftPickValue.value +
      teamAFaabValue.value
    ).toFixed(2)
  )
);
const teamBTradeValue = computed(() =>
  Number(
    (
      teamBPlayerValue.value +
      teamBDraftPickValue.value +
      teamBFaabValue.value
    ).toFixed(2)
  )
);

const tradeDelta = computed(() =>
  Number((teamATradeValue.value - teamBTradeValue.value).toFixed(2))
);

const fairnessPercent = computed(() => {
  const maxSide = Math.max(teamATradeValue.value, teamBTradeValue.value, 1);
  return Number(((Math.abs(tradeDelta.value) / maxSide) * 100).toFixed(1));
});

const fairnessLabel = computed(() => {
  if (teamATradeValue.value === 0 && teamBTradeValue.value === 0) {
    return "No assets selected";
  }
  if (fairnessPercent.value <= 10) return "Very fair";
  if (fairnessPercent.value <= 22) return "Reasonably fair";
  if (fairnessPercent.value <= 35) return "Slightly uneven";
  return "Very uneven";
});

const fairnessPillClass = computed(() => {
  if (teamATradeValue.value === 0 && teamBTradeValue.value === 0) {
    return "bg-muted text-muted-foreground";
  }
  if (fairnessPercent.value <= 10) return waiverPaletteClass(1);
  if (fairnessPercent.value <= 22) return waiverPaletteClass(2);
  if (fairnessPercent.value <= 35) return waiverPaletteClass(4);
  return waiverPaletteClass(5);
});

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

watch(
  () => draftSeasons.value,
  (newSeasons) => {
    if (
      !pendingAPickSeason.value ||
      !newSeasons.includes(pendingAPickSeason.value)
    ) {
      pendingAPickSeason.value = newSeasons[0] ?? null;
    }
    if (
      !pendingBPickSeason.value ||
      !newSeasons.includes(pendingBPickSeason.value)
    ) {
      pendingBPickSeason.value = newSeasons[0] ?? null;
    }
  },
  { immediate: true }
);

watch(
  () => draftRounds.value,
  (newRounds) => {
    if (
      !pendingAPickRound.value ||
      !newRounds.includes(pendingAPickRound.value)
    ) {
      pendingAPickRound.value = newRounds[0] ?? null;
    }
    if (
      !pendingBPickRound.value ||
      !newRounds.includes(pendingBPickRound.value)
    ) {
      pendingBPickRound.value = newRounds[0] ?? null;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  updateMobileState();
  window.addEventListener("resize", updateMobileState);
  selectedWeek.value = fallbackWeek.value;
  await fetchPlayers();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateMobileState);
});
</script>
<template>
  <Card class="w-full h-full p-4 mt-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h5 class="text-3xl font-bold leading-none">Trade Lab (Beta)</h5>
    </div>
    <p class="mt-4 mb-2 text-muted-foreground">
      Drag players into each team's package to brainstorm offers.
    </p>
    <p v-if="isMobile" class="mb-2 text-xs text-muted-foreground">
      Mobile: tap players to add/remove from each package.
    </p>

    <div v-if="loading" class="py-2 mb-96">
      Loading players and projections...
    </div>
    <div v-else>
      <div class="grid gap-3 xl:grid-cols-3">
        <Card class="px-4 py-3">
          <div class="mb-2">
            <Label class="block mb-1 text-sm">Manager</Label>
            <Select
              :model-value="selectedTeamAId"
              @update:model-value="
                handleTeamSelectionChange('A', Number($event))
              "
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
          <div class="grid max-h-[31rem] gap-2 overflow-y-auto pr-1">
            <button
              v-for="player in teamA?.players || []"
              :key="`A-${player.player_id}`"
              :draggable="!isMobile"
              @dragstart="onPlayerDragStart(player.player_id, 'A')"
              @click="onPlayerCardTap('A', player.player_id)"
              type="button"
              class="flex w-full flex-col items-start gap-[0.1rem] rounded-[0.6rem] border border-border bg-background px-[0.65rem] py-[0.55rem] text-left"
              :class="{
                'bg-primary/10 border-primary': isIncluded(
                  'A',
                  player.player_id
                ),
                'hover:border-primary': !isIncluded('A', player.player_id),
              }"
            >
              <div class="flex w-full">
                <img
                  v-if="player.position !== 'DEF'"
                  class="object-cover rounded-full w-14"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                  alt="Player avatar"
                />
                <img
                  v-else
                  class="w-10 h-10 mx-2 rounded-full"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                  alt="Team avatar"
                />
                <div class="ml-2">
                  <p class="font-medium">
                    {{ player.name || `${player.team} Defense` }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ player.position }} - {{ player.team }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1 ml-auto">
                  <span
                    :class="[
                      'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                      posRankClass(player.projection),
                    ]"
                  >
                    POS {{ rankLabel(player.projection) }}
                  </span>
                  <span
                    :class="[
                      'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                      overallRankClass(player.overallRank),
                    ]"
                  >
                    OVR {{ rankLabel(player.overallRank) }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </Card>

        <Card class="p-3">
          <p class="mb-1 text-sm font-semibold">Trade Package</p>
          <p class="text-sm text-muted-foreground">
            Drop players from each roster into its matching side.
          </p>
          <Separator class="h-px my-2" />

          <div
            class="min-h-28 rounded-[0.7rem] border border-dashed border-border p-3"
            @dragover.prevent
            @drop.prevent="onDropToTradePackage('A')"
          >
            <div class="flex justify-between gap-3">
              <p class="text-sm font-semibold">
                {{ teamA?.managerName }}
              </p>
              <Dialog>
                <DialogTrigger as-child>
                  <Button
                    variant="secondary"
                    size="xs"
                    class="-mt-1"
                    @click="openAssetsModal('A')"
                  >
                    <Plus class="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle> Add Assets </DialogTitle>
                    <DialogDescription>
                      Add FAAB or draft picks.
                    </DialogDescription>
                  </DialogHeader>
                  <div class="flex flex-wrap sm:flex-nowrap">
                    <div class="mr-4">
                      <Label for="faab" class="text-xs">FAAB</Label>
                      <div class="flex gap-2 mt-0.5">
                        <Input
                          class="w-20"
                          id="faab"
                          type="number"
                          min="0"
                          v-model="teamAFaabInputModel"
                        />
                        <DialogClose as-child>
                          <Button
                            type="button"
                            variant="outline"
                            @click="addFaabToPackage('A')"
                          >
                            Add
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                    <div class="">
                      <Label class="text-xs">Draft Pick</Label>
                      <div class="flex gap-2 mt-0.5">
                        <Select v-model="pendingAPickSeasonModel">
                          <SelectTrigger class="w-24 text-xs">
                            <SelectValue placeholder="Season" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              v-for="season in draftSeasons"
                              :key="`modal-a-season-${season}`"
                              :value="String(season)"
                            >
                              {{ season }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select v-model="pendingAPickRoundModel">
                          <SelectTrigger class="w-24 text-xs">
                            <SelectValue placeholder="Round" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              v-for="round in draftRounds"
                              :key="`modal-a-round-${round}`"
                              :value="String(round)"
                            >
                              Round {{ round }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <DialogClose as-child>
                          <Button
                            type="button"
                            variant="outline"
                            @click="addDraftPickToPackage('A')"
                          >
                            Add
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div class="space-y-1 overflow-y-auto max-h-32">
              <div class="pt-2 mt-2 border-t border-border">
                <div class="flex flex-wrap items-center gap-1.5 mb-2">
                  <span
                    v-if="teamAFaab > 0"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                  >
                    ${{ teamAFaab }} FAAB
                    <button type="button" @click="clearFaab('A')">
                      <X class="size-3 text-muted-foreground" />
                    </button>
                  </span>
                  <span
                    v-for="pick in teamAPicks"
                    :key="`a-pill-${pick.id}`"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                  >
                    {{ pick.season }} R{{ pick.round }}
                    <button
                      type="button"
                      @click="removeDraftPickFromPackage('A', pick.id)"
                    >
                      <X class="size-3 text-muted-foreground" />
                    </button>
                  </span>
                </div>
              </div>
              <div
                v-for="player in teamAOutgoingPlayers"
                :key="`send-a-${player.player_id}`"
                class="flex items-center justify-between rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                <div class="flex w-full">
                  <img
                    v-if="player.position !== 'DEF'"
                    class="object-cover rounded-full w-14"
                    :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                    alt="Player avatar"
                  />
                  <img
                    v-else
                    class="w-10 h-10 mx-2 rounded-full"
                    :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                    alt="Team avatar"
                  />
                  <div class="ml-2">
                    <p class="font-medium">
                      {{ player.name || `${player.team} Defense` }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ player.position }} - {{ player.team }}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-1 ml-auto mr-4">
                    <span
                      :class="[
                        'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                        posRankClass(player.projection),
                      ]"
                    >
                      POS {{ rankLabel(player.projection) }}
                    </span>
                    <span
                      :class="[
                        'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                        overallRankClass(player.overallRank),
                      ]"
                    >
                      OVR {{ rankLabel(player.overallRank) }}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  class="text-xs underline text-muted-foreground"
                  @click="removeFromPackage('A', player.player_id)"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            class="mt-3 min-h-28 rounded-[0.7rem] border border-dashed border-border p-3"
            @dragover.prevent
            @drop.prevent="onDropToTradePackage('B')"
          >
            <div class="flex justify-between gap-3">
              <p class="mb-2 text-sm font-semibold">
                {{ teamB?.managerName }}
              </p>
              <Dialog>
                <DialogTrigger as-child>
                  <Button
                    variant="secondary"
                    size="xs"
                    class="-mt-0.5"
                    @click="openAssetsModal('B')"
                  >
                    <Plus class="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle> Add Assets </DialogTitle>
                    <DialogDescription>
                      Add FAAB or draft picks.
                    </DialogDescription>
                  </DialogHeader>
                  <div class="flex flex-wrap sm:flex-nowrap">
                    <div class="mr-4">
                      <Label for="faab-b" class="text-xs">FAAB</Label>
                      <div class="flex gap-2 mt-0.5">
                        <Input
                          class="w-20"
                          id="faab-b"
                          type="number"
                          min="0"
                          v-model="teamBFaabInputModel"
                        />
                        <DialogClose as-child>
                          <Button
                            type="button"
                            variant="outline"
                            @click="addFaabToPackage('B')"
                          >
                            Add
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                    <div class="">
                      <Label class="text-xs">Draft Pick</Label>
                      <div class="flex gap-2 mt-0.5">
                        <Select v-model="pendingBPickSeasonModel">
                          <SelectTrigger class="w-24 text-xs">
                            <SelectValue placeholder="Season" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              v-for="season in draftSeasons"
                              :key="`modal-b-season-${season}`"
                              :value="String(season)"
                            >
                              {{ season }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select v-model="pendingBPickRoundModel">
                          <SelectTrigger class="w-24 text-xs">
                            <SelectValue placeholder="Round" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              v-for="round in draftRounds"
                              :key="`modal-b-round-${round}`"
                              :value="String(round)"
                            >
                              Round {{ round }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <DialogClose as-child>
                          <Button
                            type="button"
                            variant="outline"
                            @click="addDraftPickToPackage('B')"
                          >
                            Add
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div class="pt-2 mt-2 border-t border-border">
              <div class="flex flex-wrap items-center gap-1.5 mb-2">
                <span
                  v-if="teamBFaab > 0"
                  class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                >
                  ${{ teamBFaab }} FAAB
                  <button type="button" @click="clearFaab('B')">
                    <X class="size-3 text-muted-foreground" />
                  </button>
                </span>
                <span
                  v-for="pick in teamBPicks"
                  :key="`b-pill-${pick.id}`"
                  class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                >
                  {{ pick.season }} R{{ pick.round }}
                  <button
                    type="button"
                    @click="removeDraftPickFromPackage('B', pick.id)"
                  >
                    <X class="size-3 text-muted-foreground" />
                  </button>
                </span>
              </div>
            </div>
            <div class="space-y-1 overflow-y-auto max-h-32">
              <div
                v-for="player in teamBOutgoingPlayers"
                :key="`send-b-${player.player_id}`"
                class="flex items-center justify-between rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                <div class="flex w-full">
                  <img
                    v-if="player.position !== 'DEF'"
                    class="object-cover rounded-full w-14"
                    :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                    alt="Player avatar"
                  />
                  <img
                    v-else
                    class="w-10 h-10 mx-2 rounded-full"
                    :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                    alt="Team avatar"
                  />
                  <div class="ml-2">
                    <p class="font-medium">
                      {{ player.name || `${player.team} Defense` }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ player.position }} - {{ player.team }}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-1 ml-auto mr-4">
                    <span
                      :class="[
                        'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                        posRankClass(player.projection),
                      ]"
                    >
                      POS {{ rankLabel(player.projection) }}
                    </span>
                    <span
                      :class="[
                        'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                        overallRankClass(player.overallRank),
                      ]"
                    >
                      OVR {{ rankLabel(player.overallRank) }}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  class="text-xs underline text-muted-foreground"
                  @click="removeFromPackage('B', player.player_id)"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>
          </div>
          <Separator class="h-px my-3" />
          <div class="p-1">
            <p class="mb-2 text-sm font-semibold">Trade Value Estimate</p>
            <div class="flex items-center justify-between mb-1.5 text-sm">
              <span>{{ teamA?.managerName }}</span>
              <span class="font-semibold">{{ teamATradeValue }}</span>
            </div>
            <div class="mb-2 text-xs text-muted-foreground">
              Players: {{ teamAPlayerValue }} | Picks:
              {{ teamADraftPickValue }} | FAAB: {{ teamAFaabValue }}
            </div>
            <div class="flex items-center justify-between mb-2.5 text-sm">
              <span>{{ teamB?.managerName }}</span>
              <span class="font-semibold">{{ teamBTradeValue }}</span>
            </div>
            <div class="mb-2 text-xs text-muted-foreground">
              Players: {{ teamBPlayerValue }} | Picks:
              {{ teamBDraftPickValue }} | FAAB: {{ teamBFaabValue }}
            </div>
            <div class="flex items-center justify-between">
              <span
                :class="[
                  'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                  fairnessPillClass,
                ]"
              >
                {{ fairnessLabel }}
              </span>
              <span class="text-xs text-muted-foreground">
                gap: {{ fairnessPercent }}%
              </span>
            </div>
            <Separator class="h-px mt-3" />
            <p class="mt-4 text-xs text-muted-foreground">
              Formula combines player rank strength, position scarcity, and
              depth discounts.
            </p>
          </div>
        </Card>

        <Card class="px-4 py-3">
          <div class="mb-2">
            <Label class="block mb-1 text-sm">Manager</Label>
            <Select
              :model-value="selectedTeamBId"
              @update:model-value="
                handleTeamSelectionChange('B', Number($event))
              "
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
          <div class="grid max-h-[31rem] gap-2 overflow-y-auto pr-1">
            <button
              v-for="player in teamB?.players || []"
              :key="`B-${player.player_id}`"
              :draggable="!isMobile"
              @dragstart="onPlayerDragStart(player.player_id, 'B')"
              @click="onPlayerCardTap('B', player.player_id)"
              type="button"
              class="flex w-full flex-col items-start gap-[0.1rem] rounded-[0.6rem] border border-border bg-background px-[0.65rem] py-[0.55rem] text-left"
              :class="{
                'bg-primary/10 border-primary': isIncluded(
                  'B',
                  player.player_id
                ),
                'hover:border-primary': !isIncluded('B', player.player_id),
              }"
            >
              <div class="flex w-full">
                <img
                  v-if="player.position !== 'DEF'"
                  class="object-cover rounded-full w-14"
                  :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
                  alt="Player avatar"
                />
                <img
                  v-else
                  class="w-10 h-10 mx-2 rounded-full"
                  :src="`https://sleepercdn.com/images/team_logos/nfl/${player.player_id.toLowerCase()}.png`"
                  alt="Team avatar"
                />
                <div class="ml-2">
                  <p class="font-medium">
                    {{ player.name || `${player.team} Defense` }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ player.position }} - {{ player.team }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1 ml-auto">
                  <span
                    :class="[
                      'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                      posRankClass(player.projection),
                    ]"
                  >
                    POS {{ rankLabel(player.projection) }}
                  </span>
                  <span
                    :class="[
                      'rounded-md px-2 py-1 text-[0.72rem] font-semibold leading-none',
                      overallRankClass(player.overallRank),
                    ]"
                  >
                    OVR {{ rankLabel(player.overallRank) }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  </Card>
</template>
