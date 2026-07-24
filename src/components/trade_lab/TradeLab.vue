<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { TableDataType } from "../../types/types.ts";
import { useStore } from "../../store/store";
import { type TradeSuggestion } from "@/lib/tradeFinder";
import {
  getPlayerValues,
  getTradeQuote,
  type TradeQuoteResponse,
  type TradeValueRequestPayload,
} from "@/api/tradeValuesApi";
import { useDynastyTradePerspective } from "@/composables/useDynastyTradePerspective";
import {
  applyTradeBuilderRankingResponse,
  buildTradeValueRequest,
  getTradeValueWeek,
  isDynastyLeague,
  loadDynastyDraftPickAssets,
  loadTradeBuilderRosters,
  type DynastyDraftPickAsset,
  type TradeBuilderRoster,
} from "@/lib/leagueTradeValues";
import Card from "../ui/card/Card.vue";
import { Button } from "@/components/ui/button";
import Separator from "../ui/separator/Separator.vue";
import { Label } from "../ui/label/index.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { X } from "lucide-vue-next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import TradeDatabase from "./TradeDatabase.vue";
import TradeFinder from "./TradeFinder.vue";
import TradeAssetDialog from "./TradeAssetDialog.vue";

type TradeLabRoster = TradeBuilderRoster;

type TradeDraftPickAsset = {
  id: string;
  season: number;
  round: number;
  originalRosterId?: number;
  ownerRosterId?: number;
  label?: string;
};

const store = useStore();
const route = useRoute();
const props = defineProps<{
  tableData: TableDataType[];
}>();
const rosters = ref<TradeLabRoster[]>([]);
const dynastyPickAssets = ref<DynastyDraftPickAsset[]>([]);
const loading = ref(false);
const tradeValueRequest = ref<TradeValueRequestPayload | null>(null);
const tradeQuote = ref<TradeQuoteResponse | null>(null);
const quoteLoading = ref(false);
const quoteError = ref("");
const quoteRetryNonce = ref(0);
const dynastyPerspective = useDynastyTradePerspective();
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
const pendingAPickId = ref("");
const pendingBPickId = ref("");
const draggedPlayer = ref<{ playerId: string; fromTeam: "A" | "B" } | null>(
  null
);
const isMobile = ref(false);
const activeMode = ref(
  route.query.tradeMode === "finder" ? "finder" : "builder"
);

const activeLeague = computed(() => store.currentLeague);
const dynasty = computed(() => isDynastyLeague(activeLeague.value));

const fallbackWeek = computed(() => {
  if (!activeLeague.value) return 1;
  return getTradeValueWeek(activeLeague.value);
});

const usesCompletedSeasonValues = computed(
  () => activeLeague.value?.status === "complete"
);

const remainingWeeks = computed(() =>
  usesCompletedSeasonValues.value
    ? 18
    : Math.max(1, 18 - selectedWeek.value + 1)
);

const draftSeasons = computed(() => {
  if (dynasty.value && dynastyPickAssets.value.length > 0) {
    return [
      ...new Set(dynastyPickAssets.value.map((pick) => pick.season)),
    ].sort((a, b) => a - b);
  }
  const baseYear =
    Number(activeLeague.value?.season) || new Date().getFullYear();
  return [baseYear, baseYear + 1, baseYear + 2];
});

const draftRounds = computed(() => {
  if (dynasty.value && dynastyPickAssets.value.length > 0) {
    const maxRound = Math.max(
      ...dynastyPickAssets.value.map((pick) => pick.round)
    );
    return Array.from({ length: maxRound }, (_, idx) => idx + 1);
  }
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
const availableTeamAPicks = computed(() =>
  dynastyPickAssets.value.filter(
    (pick) =>
      pick.ownerRosterId === selectedTeamAId.value &&
      !teamAPicks.value.some((selected) => selected.id === pick.id)
  )
);
const availableTeamBPicks = computed(() =>
  dynastyPickAssets.value.filter(
    (pick) =>
      pick.ownerRosterId === selectedTeamBId.value &&
      !teamBPicks.value.some((selected) => selected.id === pick.id)
  )
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

const isTradePackageEmpty = computed(
  () =>
    teamASends.value.length === 0 &&
    teamBSends.value.length === 0 &&
    teamAPicks.value.length === 0 &&
    teamBPicks.value.length === 0 &&
    teamAFaab.value === 0 &&
    teamBFaab.value === 0
);

const teamAHasAssets = computed(
  () =>
    teamASends.value.length > 0 ||
    teamAPicks.value.length > 0 ||
    teamAFaab.value > 0
);
const teamBHasAssets = computed(
  () =>
    teamBSends.value.length > 0 ||
    teamBPicks.value.length > 0 ||
    teamBFaab.value > 0
);

let rosterRequestId = 0;
const fetchPlayers = async () => {
  const currentRequestId = ++rosterRequestId;
  if (store.leagueIds.length === 0 || !activeLeague.value) {
    rosters.value = [];
    dynastyPickAssets.value = [];
    tradeValueRequest.value = null;
    loading.value = false;
    return;
  }

  loading.value = true;
  const currentLeague = activeLeague.value;

  try {
    const request = buildTradeValueRequest({
      league: currentLeague,
      tableData: props.tableData,
      selectedWeek: selectedWeek.value,
      showUsernames: store.showUsernames,
      dynastyPerspective: dynastyPerspective.value,
    });
    tradeValueRequest.value = request;
    const nextRosters = await loadTradeBuilderRosters({
      league: currentLeague,
      tableData: props.tableData,
      selectedWeek: selectedWeek.value,
      showUsernames: store.showUsernames,
    });
    if (currentRequestId !== rosterRequestId) return;
    rosters.value = nextRosters;
    syncTeamSelections();
    const nextDraftPicks = await loadDynastyDraftPickAssets({
      league: currentLeague,
      rosters: nextRosters,
    });
    if (currentRequestId !== rosterRequestId) return;
    dynastyPickAssets.value = nextDraftPicks;
    void getPlayerValues(request)
      .then((values) => {
        if (
          currentRequestId !== rosterRequestId ||
          tradeValueRequest.value !== request
        ) {
          return;
        }
        rosters.value = applyTradeBuilderRankingResponse(nextRosters, values);
      })
      .catch((error) => {
        console.error("Unable to load ranking preview:", error);
      });
  } finally {
    if (currentRequestId === rosterRequestId) {
      loading.value = false;
    }
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
  pendingAPickId.value = "";
  pendingBPickId.value = "";
};

const syncTeamSelections = () => {
  const previousTeamAId = selectedTeamAId.value;
  const previousTeamBId = selectedTeamBId.value;

  if (rosters.value.length < 2) {
    selectedTeamAId.value = rosters.value[0]?.id ?? null;
    selectedTeamBId.value = null;
    if (
      selectedTeamAId.value !== previousTeamAId ||
      selectedTeamBId.value !== previousTeamBId
    ) {
      resetTrade();
    }
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

  if (
    selectedTeamAId.value !== previousTeamAId ||
    selectedTeamBId.value !== previousTeamBId
  ) {
    resetTrade();
  }
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
  if (dynasty.value && dynastyPickAssets.value.length > 0) {
    const pickId = team === "A" ? pendingAPickId.value : pendingBPickId.value;
    const availablePicks =
      team === "A" ? availableTeamAPicks.value : availableTeamBPicks.value;
    const pick = availablePicks.find((entry) => entry.id === pickId);
    if (!pick) return;

    if (team === "A") {
      teamAPicks.value.push(pick);
      pendingAPickId.value = "";
    } else {
      teamBPicks.value.push(pick);
      pendingBPickId.value = "";
    }
    return;
  }

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
  if (tier === 1) return "performance-excellent";
  if (tier === 2) return "performance-good";
  if (tier === 3) return "performance-average";
  if (tier === 4) return "performance-poor";
  return "performance-bad";
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

const fairnessLabel = computed(() => {
  if (isTradePackageEmpty.value) return "No assets selected";
  if (!teamAHasAssets.value || !teamBHasAssets.value) {
    return "Add assets to both sides";
  }
  return tradeQuote.value?.fairnessLabel ?? "Waiting for estimate";
});

const favoredLabel = computed(() => {
  if (!tradeQuote.value) return "";
  if (tradeQuote.value.favoredSide === "even") return "Even trade";
  const manager =
    tradeQuote.value.favoredSide === "team_a"
      ? teamA.value?.managerName
      : teamB.value?.managerName;
  return manager ? `${manager} favored` : "One side favored";
});

const gapBandLabel = computed(() => {
  const gapBand = tradeQuote.value?.gapBand;
  if (gapBand === "within_10_percent") return "Within 10%";
  if (gapBand === "10_to_20_percent") return "10–20%";
  if (gapBand === "20_to_35_percent") return "20–35%";
  if (gapBand === "greater_than_35_percent") return "Greater than 35%";
  return "";
});

const fairnessPillClass = computed(() => {
  if (!tradeQuote.value) {
    return "bg-muted text-muted-foreground";
  }
  if (tradeQuote.value.gapBand === "within_10_percent") {
    return waiverPaletteClass(1);
  }
  if (tradeQuote.value.gapBand === "10_to_20_percent") {
    return waiverPaletteClass(2);
  }
  if (tradeQuote.value.gapBand === "20_to_35_percent") {
    return waiverPaletteClass(4);
  }
  return waiverPaletteClass(5);
});

let quoteRequestId = 0;
watch(
  [
    tradeValueRequest,
    teamASends,
    teamBSends,
    teamAPicks,
    teamBPicks,
    teamAFaab,
    teamBFaab,
    selectedTeamAId,
    selectedTeamBId,
    quoteRetryNonce,
  ],
  (_values, _oldValues, onCleanup) => {
    const currentRequestId = ++quoteRequestId;
    const request = tradeValueRequest.value;
    quoteLoading.value = false;
    quoteError.value = "";
    if (
      !request ||
      selectedTeamAId.value == null ||
      selectedTeamBId.value == null ||
      !teamAHasAssets.value ||
      !teamBHasAssets.value
    ) {
      tradeQuote.value = null;
      return;
    }

    const quote = {
      teamARosterId: selectedTeamAId.value,
      teamBRosterId: selectedTeamBId.value,
      teamAPlayerIds: [...teamASends.value],
      teamBPlayerIds: [...teamBSends.value],
      teamAPicks: teamAPicks.value.map(({ season, round }) => ({
        season,
        round,
      })),
      teamBPicks: teamBPicks.value.map(({ season, round }) => ({
        season,
        round,
      })),
      teamAFaab: teamAFaab.value,
      teamBFaab: teamBFaab.value,
      firstDraftSeason: draftSeasons.value[0] ?? new Date().getFullYear(),
    };

    const timer = window.setTimeout(async () => {
      if (currentRequestId !== quoteRequestId) return;
      quoteLoading.value = true;
      try {
        const result = await getTradeQuote(request, quote);
        if (currentRequestId === quoteRequestId) {
          tradeQuote.value = result;
        }
      } catch (error) {
        if (currentRequestId === quoteRequestId) {
          console.error("Unable to update trade quote:", error);
          tradeQuote.value = null;
          quoteError.value = "Unable to evaluate this trade right now.";
        }
      } finally {
        if (currentRequestId === quoteRequestId) {
          quoteLoading.value = false;
        }
      }
    }, 250);
    onCleanup(() => window.clearTimeout(timer));
  },
  { deep: true }
);

const retryTradeQuote = () => {
  quoteRetryNonce.value += 1;
};

const openTradeSuggestion = (suggestion: TradeSuggestion) => {
  selectedTeamAId.value = suggestion.teamAId;
  selectedTeamBId.value = suggestion.teamBId;
  resetTrade();
  teamASends.value = suggestion.teamASends.map((player) => player.playerId);
  teamBSends.value = suggestion.teamBSends.map((player) => player.playerId);
  activeMode.value = "builder";
};

watch(
  () => store.currentLeagueId,
  () => {
    ++rosterRequestId;
    ++quoteRequestId;
    selectedTeamAId.value = null;
    selectedTeamBId.value = null;
    resetTrade();
    const nextWeek = fallbackWeek.value;
    if (selectedWeek.value === nextWeek) {
      fetchPlayers();
    } else {
      selectedWeek.value = nextWeek;
    }
  }
);

watch(
  () => selectedWeek.value,
  () => fetchPlayers()
);

watch(dynastyPerspective, () => {
  if (dynasty.value) fetchPlayers();
});

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
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h2 class="heading-section">Trade Lab</h2>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Select v-if="dynasty" v-model="dynastyPerspective">
          <SelectTrigger class="w-36" aria-label="Dynasty team direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balanced">Balanced</SelectItem>
            <SelectItem value="contender">Contender</SelectItem>
            <SelectItem value="rebuilder">Rebuilder</SelectItem>
          </SelectContent>
        </Select>
        <Tabs v-model="activeMode">
          <TabsList>
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="finder">Finder</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
    <TradeDatabase v-if="activeMode === 'database'" class="mt-4" />
    <TradeFinder
      v-else-if="activeMode === 'finder'"
      :rosters="rosters"
      :request="tradeValueRequest"
      :roster-positions="activeLeague?.rosterPositions || []"
      :remaining-weeks="remainingWeeks"
      :loading="loading"
      :valuation-mode="
        dynasty
          ? 'dynasty'
          : usesCompletedSeasonValues
            ? 'season-results'
            : 'ros-projection'
      "
      :dynasty-perspective="dynastyPerspective"
      @open-suggestion="openTradeSuggestion"
    />
    <div v-else>
      <p
        v-if="!isMobile"
        class="max-w-3xl my-4 text-muted-foreground text-balance"
      >
        Drag players into each team's package to brainstorm offers. The trade
        value estimate combines
        {{
          dynasty
            ? "dynasty ADP and league specific projected value"
            : usesCompletedSeasonValues
              ? "full-season performance"
              : "rest-of-season projections"
        }}, league specific replacement value, and package depth discounts.
      </p>
      <p v-if="isMobile" class="mt-4 mb-2 text-sm text-muted-foreground">
        Click/tap players to add or remove from each package.
      </p>

      <div
        v-if="loading"
        class="grid gap-3 xl:min-h-[31rem] xl:grid-cols-3"
        aria-busy="true"
        aria-live="polite"
      >
        <span class="sr-only">Loading players and projections...</span>
        <Card
          v-for="side in ['A', 'B']"
          :key="`roster-skeleton-${side}`"
          class="px-4 py-3"
          :class="{ 'xl:order-3': side === 'B' }"
        >
          <div class="mb-3 space-y-2">
            <Skeleton class="w-16 h-4 bg-muted dark:bg-muted/70" />
            <Skeleton class="h-10 w-44 bg-muted dark:bg-muted/70" />
          </div>
          <div class="grid gap-2 pr-1">
            <div
              v-for="index in 7"
              :key="`player-skeleton-${side}-${index}`"
              class="flex w-full rounded-md border border-border bg-background px-[0.65rem] py-[0.55rem]"
            >
              <Skeleton
                class="rounded-full size-14 shrink-0 bg-muted dark:bg-muted/70"
              />
              <div class="w-full min-w-0 ml-2 space-y-2">
                <Skeleton class="w-3/5 h-5 bg-muted dark:bg-muted/70" />
                <Skeleton class="w-24 h-4 bg-muted dark:bg-muted/70" />
              </div>
              <div class="space-y-1.5 shrink-0">
                <Skeleton class="w-16 h-6 bg-muted dark:bg-muted/70" />
                <Skeleton class="w-16 h-6 bg-muted dark:bg-muted/70" />
              </div>
            </div>
          </div>
        </Card>
        <Card class="p-3 xl:order-2">
          <Skeleton class="w-32 h-5 mb-2 bg-muted dark:bg-muted/70" />
          <Skeleton class="w-4/5 h-4 mb-3 bg-muted dark:bg-muted/70" />
          <Separator class="h-px my-2" />
          <div
            v-for="side in ['A', 'B']"
            :key="`package-skeleton-${side}`"
            class="min-h-40 rounded-lg border border-dashed border-border p-3 sm:min-h-[14.5rem]"
            :class="{ 'mt-3': side === 'B' }"
          >
            <div class="flex items-start justify-between gap-3">
              <Skeleton class="h-5 w-28 bg-muted dark:bg-muted/70" />
              <Skeleton class="w-8 h-8 bg-muted dark:bg-muted/70" />
            </div>
            <div class="pt-3 mt-3 space-y-2 border-t border-border">
              <div class="flex gap-2">
                <Skeleton class="w-16 h-7 bg-muted dark:bg-muted/70" />
                <Skeleton class="w-20 h-7 bg-muted dark:bg-muted/70" />
              </div>
              <Skeleton class="w-full h-12 bg-muted dark:bg-muted/70" />
              <Skeleton class="w-4/5 h-12 bg-muted dark:bg-muted/70" />
            </div>
          </div>
          <Separator class="h-px my-3" />
          <div class="p-1 space-y-3">
            <Skeleton class="w-40 h-5 bg-muted dark:bg-muted/70" />
            <div v-for="index in 2" :key="`value-skeleton-${index}`">
              <div class="flex items-center justify-between mb-2">
                <Skeleton class="h-4 w-28 bg-muted dark:bg-muted/70" />
                <Skeleton class="w-10 h-4 bg-muted dark:bg-muted/70" />
              </div>
              <Skeleton class="w-3/4 h-3 bg-muted dark:bg-muted/70" />
            </div>
            <div class="flex items-center justify-between">
              <Skeleton class="w-24 h-7 bg-muted dark:bg-muted/70" />
              <Skeleton class="w-16 h-4 bg-muted dark:bg-muted/70" />
            </div>
          </div>
        </Card>
      </div>
      <div v-else>
        <div
          class="grid gap-3 xl:grid-cols-3"
          :class="isTradePackageEmpty ? 'items-stretch' : 'items-start'"
        >
          <Card class="flex flex-col px-4 py-3">
            <div class="mb-2">
              <Label class="block mb-1 text-sm">Manager</Label>
              <Select
                :model-value="selectedTeamAId"
                @update:model-value="
                  handleTeamSelectionChange('A', Number($event))
                "
              >
                <SelectTrigger class="w-full sm:w-44">
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
            <div
              class="grid min-h-0 max-h-[35rem] flex-1 content-start gap-2 overflow-y-auto pr-1"
            >
              <button
                v-for="player in teamA?.players || []"
                :key="`A-${player.player_id}`"
                :draggable="!isMobile"
                @dragstart="onPlayerDragStart(player.player_id, 'A')"
                @click="onPlayerCardTap('A', player.player_id)"
                type="button"
                class="flex w-full flex-col items-start gap-[0.1rem] rounded-md border border-border bg-background px-[0.65rem] py-[0.55rem] text-left"
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
                        'rounded-md px-2 py-1 text-xs font-semibold',
                        posRankClass(player.positionRank),
                      ]"
                    >
                      POS {{ rankLabel(player.positionRank) }}
                    </span>
                    <span
                      :class="[
                        'rounded-md px-2 py-1 text-xs font-semibold',
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

            <div
              class="min-h-40 rounded-lg border border-dashed border-border p-3 sm:min-h-[14.5rem]"
              @dragover.prevent
              @drop.prevent="onDropToTradePackage('A')"
            >
              <div class="flex justify-between gap-3">
                <p class="text-sm font-semibold">
                  {{ teamA?.managerName }}
                </p>
                <TradeAssetDialog
                  v-model:faab="teamAFaabInputModel"
                  v-model:pick-season="pendingAPickSeasonModel"
                  v-model:pick-round="pendingAPickRoundModel"
                  v-model:pick-id="pendingAPickId"
                  :manager-name="teamA?.managerName"
                  fallback-team-label="first team"
                  input-id="trade-faab-a"
                  :draft-seasons="draftSeasons"
                  :draft-rounds="draftRounds"
                  :available-draft-picks="
                    dynasty ? availableTeamAPicks : undefined
                  "
                  trigger-class="-mt-1"
                  @open="openAssetsModal('A')"
                  @add-faab="addFaabToPackage('A')"
                  @add-draft-pick="addDraftPickToPackage('A')"
                />
              </div>
              <div class="space-y-1">
                <div class="pt-2 mt-2 border-t border-border">
                  <div class="flex flex-wrap items-center gap-1.5 mb-2">
                    <span
                      v-if="teamAFaab > 0"
                      class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                    >
                      ${{ teamAFaab }} FAAB
                      <button
                        type="button"
                        aria-label="Remove FAAB from first trade package"
                        @click="clearFaab('A')"
                      >
                        <X class="size-3 text-muted-foreground" />
                      </button>
                    </span>
                    <span
                      v-for="pick in teamAPicks"
                      :key="`a-pill-${pick.id}`"
                      class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                    >
                      {{ pick.label || `${pick.season} R${pick.round}` }}
                      <button
                        type="button"
                        :aria-label="`Remove ${pick.season} round ${pick.round} pick from first trade package`"
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
                          'rounded-md px-2 py-1 text-xs font-semibold',
                          posRankClass(player.positionRank),
                        ]"
                      >
                        POS {{ rankLabel(player.positionRank) }}
                      </span>
                      <span
                        :class="[
                          'rounded-md px-2 py-1 text-xs font-semibold',
                          overallRankClass(player.overallRank),
                        ]"
                      >
                        OVR {{ rankLabel(player.overallRank) }}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    :aria-label="`Remove ${player.name || `${player.team} Defense`} from first trade package`"
                    class="text-xs underline text-muted-foreground"
                    @click="removeFromPackage('A', player.player_id)"
                  >
                    <X class="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div
              class="mt-3 min-h-40 rounded-lg border border-dashed border-border p-3 sm:min-h-[14.5rem]"
              @dragover.prevent
              @drop.prevent="onDropToTradePackage('B')"
            >
              <div class="flex justify-between gap-3">
                <p class="mb-2 text-sm font-semibold">
                  {{ teamB?.managerName }}
                </p>
                <TradeAssetDialog
                  v-model:faab="teamBFaabInputModel"
                  v-model:pick-season="pendingBPickSeasonModel"
                  v-model:pick-round="pendingBPickRoundModel"
                  v-model:pick-id="pendingBPickId"
                  :manager-name="teamB?.managerName"
                  fallback-team-label="second team"
                  input-id="trade-faab-b"
                  :draft-seasons="draftSeasons"
                  :draft-rounds="draftRounds"
                  :available-draft-picks="
                    dynasty ? availableTeamBPicks : undefined
                  "
                  trigger-class="-mt-0.5"
                  @open="openAssetsModal('B')"
                  @add-faab="addFaabToPackage('B')"
                  @add-draft-pick="addDraftPickToPackage('B')"
                />
              </div>
              <div class="pt-2 mt-2 border-t border-border">
                <div class="flex flex-wrap items-center gap-1.5 mb-2">
                  <span
                    v-if="teamBFaab > 0"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                  >
                    ${{ teamBFaab }} FAAB
                    <button
                      type="button"
                      aria-label="Remove FAAB from second trade package"
                      @click="clearFaab('B')"
                    >
                      <X class="size-3 text-muted-foreground" />
                    </button>
                  </span>
                  <span
                    v-for="pick in teamBPicks"
                    :key="`b-pill-${pick.id}`"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-md border-border bg-background"
                  >
                    {{ pick.label || `${pick.season} R${pick.round}` }}
                    <button
                      type="button"
                      :aria-label="`Remove ${pick.season} round ${pick.round} pick from second trade package`"
                      @click="removeDraftPickFromPackage('B', pick.id)"
                    >
                      <X class="size-3 text-muted-foreground" />
                    </button>
                  </span>
                </div>
              </div>
              <div class="space-y-1">
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
                          'rounded-md px-2 py-1 text-xs font-semibold',
                          posRankClass(player.positionRank),
                        ]"
                      >
                        POS {{ rankLabel(player.positionRank) }}
                      </span>
                      <span
                        :class="[
                          'rounded-md px-2 py-1 text-xs font-semibold',
                          overallRankClass(player.overallRank),
                        ]"
                      >
                        OVR {{ rankLabel(player.overallRank) }}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    :aria-label="`Remove ${player.name || `${player.team} Defense`} from second trade package`"
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
              <div class="flex items-center justify-between">
                <span
                  :class="[
                    'rounded-md px-2 py-1 text-xs font-semibold',
                    fairnessPillClass,
                  ]"
                >
                  {{ fairnessLabel }}
                </span>
                <span v-if="quoteLoading" class="text-xs text-muted-foreground">
                  Updating…
                </span>
                <span
                  v-else-if="tradeQuote"
                  class="text-xs text-muted-foreground"
                >
                  {{ favoredLabel }} · {{ gapBandLabel }} gap
                </span>
              </div>
              <div
                v-if="quoteError"
                class="flex items-center justify-between gap-3 p-3 mt-3 border rounded-md border-destructive/30"
              >
                <p class="text-xs text-destructive">{{ quoteError }}</p>
                <Button variant="outline" size="sm" @click="retryTradeQuote">
                  Retry
                </Button>
              </div>
              <Separator class="h-px mt-3" />
            </div>
          </Card>

          <Card class="flex flex-col px-4 py-3">
            <div class="mb-2">
              <Label class="block mb-1 text-sm">Manager</Label>
              <Select
                :model-value="selectedTeamBId"
                @update:model-value="
                  handleTeamSelectionChange('B', Number($event))
                "
              >
                <SelectTrigger class="w-full sm:w-44">
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
            <div
              class="grid min-h-0 max-h-[35rem] flex-1 content-start gap-2 overflow-y-auto pr-1"
            >
              <button
                v-for="player in teamB?.players || []"
                :key="`B-${player.player_id}`"
                :draggable="!isMobile"
                @dragstart="onPlayerDragStart(player.player_id, 'B')"
                @click="onPlayerCardTap('B', player.player_id)"
                type="button"
                class="flex w-full flex-col items-start gap-[0.1rem] rounded-md border border-border bg-background px-[0.65rem] py-[0.55rem] text-left"
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
                        'rounded-md px-2 py-1 text-xs font-semibold',
                        posRankClass(player.positionRank),
                      ]"
                    >
                      POS {{ rankLabel(player.positionRank) }}
                    </span>
                    <span
                      :class="[
                        'rounded-md px-2 py-1 text-xs font-semibold',
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
      <div
        class="pt-3 mt-4 text-xs border-t border-border text-muted-foreground"
      >
        POS/OVR badges use standard Sleeper season rankings. Player Values adds
        rankings adjusted for your league's scoring and roster format.
      </div>
    </div>
  </Card>
</template>
