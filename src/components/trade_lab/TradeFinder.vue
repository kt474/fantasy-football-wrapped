<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Copy } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTradeSuggestions,
  TradeValuesAccessError,
  type TradeValueRequestPayload,
} from "@/api/tradeValuesApi";
import {
  type TradeSuggestion,
  type TradeValuationMode,
} from "@/lib/tradeFinder";

const props = defineProps<{
  rosters: Array<{ id: number; managerName: string }>;
  request: TradeValueRequestPayload | null;
  loading?: boolean;
  valuationMode?: TradeValuationMode;
  starterPlayerIdsByRoster: Record<number, string[]>;
  demoSuggestionsByRoster?: Record<number, TradeSuggestion[]>;
}>();

const emit = defineEmits<{
  openSuggestion: [suggestion: TradeSuggestion];
}>();

const selectedRosterId = ref<number | null>(null);
const suggestions = ref<TradeSuggestion[]>([]);
const finderLoading = ref(false);
const accessError = ref("");
const finderError = ref("");
const finderRetryNonce = ref(0);
const visibleSuggestionCount = ref(4);
const SUGGESTION_PAGE_SIZE = 4;
let finderRequestId = 0;

watch(
  () => props.rosters,
  (rosters) => {
    if (
      selectedRosterId.value == null ||
      !rosters.some((roster) => roster.id === selectedRosterId.value)
    ) {
      selectedRosterId.value = rosters[0]?.id ?? null;
    }
  },
  { immediate: true }
);

const selectedRosterModel = computed({
  get: () => String(selectedRosterId.value ?? ""),
  set: (value: string) => {
    selectedRosterId.value = Number(value);
  },
});

const selectedRosterName = computed(
  () =>
    props.rosters.find((roster) => roster.id === selectedRosterId.value)
      ?.managerName ?? ""
);

const visibleSuggestions = computed(() =>
  suggestions.value.slice(0, visibleSuggestionCount.value)
);
const remainingSuggestionCount = computed(() =>
  Math.max(0, suggestions.value.length - visibleSuggestions.value.length)
);

watch(
  [
    selectedRosterId,
    () => props.request,
    () => props.demoSuggestionsByRoster,
    finderRetryNonce,
  ],
  async ([rosterId, request, demoSuggestionsByRoster]) => {
    const currentRequestId = ++finderRequestId;
    if (rosterId == null) {
      suggestions.value = [];
      finderLoading.value = false;
      accessError.value = "";
      finderError.value = "";
      return;
    }
    if (demoSuggestionsByRoster) {
      suggestions.value = demoSuggestionsByRoster[rosterId] ?? [];
      visibleSuggestionCount.value = SUGGESTION_PAGE_SIZE;
      finderLoading.value = false;
      accessError.value = "";
      finderError.value = "";
      return;
    }
    if (!request) {
      suggestions.value = [];
      finderLoading.value = false;
      accessError.value = "";
      finderError.value = "";
      return;
    }
    finderLoading.value = true;
    visibleSuggestionCount.value = SUGGESTION_PAGE_SIZE;
    accessError.value = "";
    finderError.value = "";
    try {
      const response = await getTradeSuggestions({
        ...request,
        finderForRosterId: rosterId,
      });
      if (currentRequestId === finderRequestId) {
        suggestions.value = response.suggestions ?? [];
      }
    } catch (error) {
      if (currentRequestId !== finderRequestId) return;
      suggestions.value = [];
      if (error instanceof TradeValuesAccessError) {
        accessError.value = error.message;
      } else {
        finderError.value = "Trade Finder is unavailable right now.";
      }
    } finally {
      if (currentRequestId === finderRequestId) {
        finderLoading.value = false;
      }
    }
  },
  { immediate: true }
);

const retryFinder = () => {
  finderRetryNonce.value += 1;
};

const showMoreSuggestions = () => {
  visibleSuggestionCount.value = Math.min(
    visibleSuggestionCount.value + SUGGESTION_PAGE_SIZE,
    suggestions.value.length
  );
};

const formatGain = (value: number) =>
  `${Number.isFinite(value) ? value.toFixed(1) : "—"} pts/wk`;
const formatValue = (value: number) =>
  Number.isFinite(value) ? Math.round(value).toString() : "—";
const formatValueMatch = (value: number) =>
  `${Math.min(100, Math.max(0, Math.round(value / 5) * 5))}%`;
const formatPlayerNames = (players: TradeSuggestion["teamASends"]) =>
  players.map((player) => player.name).join(" + ");
const formatIncomingPlayers = (players: TradeSuggestion["teamASends"]) =>
  players.map((player) => `${player.name} (${player.position})`).join(" and ");
const improvementBasis = computed(() =>
  props.valuationMode === "season results"
    ? "estimated lineup output based on season results"
    : "projected starting-lineup output"
);

const describeGain = (value: number) => {
  const gain = formatGain(value);
  if (value < 0.5) return `a modest ${gain} lift`;
  if (value < 1.5) return `a useful ${gain} boost`;
  if (value < 3) return `a meaningful ${gain} upgrade`;
  return `a major ${gain} upgrade`;
};

const describeTeamImpact = ({
  receivingRosterId,
  receives,
  sends,
  gain,
}: {
  receivingRosterId: number;
  receives: TradeSuggestion["teamASends"];
  sends: TradeSuggestion["teamASends"];
  gain: number;
}) => {
  const starterIds = new Set(
    props.starterPlayerIdsByRoster[receivingRosterId] ?? []
  );
  const outgoingStarters = sends.filter((player) =>
    starterIds.has(player.playerId)
  );
  let directSwap:
    | {
        incoming: TradeSuggestion["teamASends"][number];
        outgoing: TradeSuggestion["teamASends"][number];
      }
    | undefined;

  for (const incoming of receives) {
    const outgoing = outgoingStarters.find(
      (starter) => starter.position === incoming.position
    );
    if (outgoing) {
      directSwap = { incoming, outgoing };
      break;
    }
  }

  const lineupChange = directSwap
    ? `${directSwap.incoming.name} takes the ${directSwap.incoming.position} spot vacated by ${directSwap.outgoing.name}`
    : receives.length === 1
      ? `${receives[0].name} moves into the model's best starting lineup`
      : "the incoming package creates a stronger starting lineup combination";

  return `adds ${formatIncomingPlayers(receives)}. ${lineupChange}, creating ${describeGain(gain)} in ${improvementBasis.value}.`;
};

const buildTradeText = (suggestion: TradeSuggestion) =>
  [
    `${suggestion.teamAName} sends ${formatPlayerNames(suggestion.teamASends)} to ${suggestion.teamBName}.`,
    `${suggestion.teamBName} sends ${formatPlayerNames(suggestion.teamBSends)} to ${suggestion.teamAName}.`,
    "",
    `${suggestion.teamAName} ${describeTeamImpact({
      receivingRosterId: suggestion.teamAId,
      receives: suggestion.teamBSends,
      sends: suggestion.teamASends,
      gain: suggestion.teamAGainPerWeek,
    })}`,
    `${suggestion.teamBName} ${describeTeamImpact({
      receivingRosterId: suggestion.teamBId,
      receives: suggestion.teamASends,
      sends: suggestion.teamBSends,
      gain: suggestion.teamBGainPerWeek,
    })}`,
    `About a ${formatValueMatch(suggestion.fairnessPercent)} league adjusted value match.`,
    "",
    "Created with Fantasy Football Wrapped — https://ffwrapped.com",
  ].join("\n");

const copySuggestion = async (suggestion: TradeSuggestion) => {
  try {
    await navigator.clipboard.writeText(buildTradeText(suggestion));
    toast.success("Trade copied to clipboard");
  } catch (error) {
    console.error("Unable to copy trade suggestion:", error);
    toast.error("Unable to copy this trade");
  }
};
</script>

<template>
  <div class="mt-4 space-y-4">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <p
        class="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base"
      >
        Find trades where both teams improve
        {{
          valuationMode === "dynasty"
            ? "their projected lineups while staying close in long term dynasty value"
            : valuationMode === "season results"
              ? "their season long lineup value"
              : "their projected starting lineups"
        }}. Values are based on
        {{
          valuationMode === "dynasty"
            ? "dynasty ADP, league adjusted projected production,"
            : valuationMode === "season results"
              ? "full season performance"
              : "rest of season projections"
        }}
        and your league format.
      </p>
      <div class="shrink-0">
        <label class="block mb-1 text-xs font-medium text-muted-foreground">
          Manager
        </label>
        <Select v-model="selectedRosterModel">
          <SelectTrigger class="w-full sm:w-52">
            <SelectValue placeholder="Select a manager">
              {{ selectedRosterName || "Select a manager" }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="roster in rosters"
              :key="roster.id"
              :value="String(roster.id)"
            >
              {{ roster.managerName }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div
      v-if="loading || finderLoading"
      class="grid gap-4 md:grid-cols-2"
      aria-busy="true"
      aria-live="polite"
    >
      <span class="sr-only">Finding trades from player projections...</span>
      <div
        v-for="index in 6"
        :key="index"
        class="flex flex-col p-4 border rounded-lg min-h-64 border-border"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 space-y-2">
            <Skeleton class="w-48 h-4 bg-muted dark:bg-muted/70" />
            <Skeleton class="w-32 h-3 bg-muted dark:bg-muted/70" />
          </div>
          <Skeleton class="w-20 h-4 bg-muted dark:bg-muted/70" />
        </div>
        <div class="grid flex-1 grid-cols-2 gap-3 mt-4">
          <Skeleton class="w-full h-full bg-muted dark:bg-muted/70" />
          <Skeleton class="w-full h-full bg-muted dark:bg-muted/70" />
        </div>
        <div class="flex gap-3 mt-4">
          <Skeleton class="flex-1 h-9 bg-muted dark:bg-muted/70" />
          <Skeleton class="w-28 h-9 bg-muted dark:bg-muted/70" />
        </div>
      </div>
    </div>

    <div
      v-else-if="accessError"
      class="flex min-h-[60vh] flex-col items-center justify-center px-5 py-10 text-center border rounded-lg bg-muted/20 border-border"
    >
      <p class="font-medium">Trade Finder is a Premium feature</p>
      <p class="max-w-sm mx-auto mt-1 text-sm text-muted-foreground">
        Upgrade to compare league adjusted packages and find deals that improve
        both starting lineups.
      </p>
      <Button as-child class="mt-4">
        <router-link
          :to="{
            path: '/account',
            query: {
              ...$route.query,
              intent: 'trade_finder',
              upgrade_source: 'trade_finder_locked',
            },
          }"
        >
          Unlock Trade Finder
        </router-link>
      </Button>
    </div>

    <div
      v-else-if="finderError"
      class="px-5 py-10 text-center border rounded-lg bg-muted/20 border-border"
    >
      <p class="font-medium">Trade Finder could not load</p>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ finderError }}
      </p>
      <Button class="mt-3" variant="outline" @click="retryFinder">
        Retry Trade Finder
      </Button>
    </div>

    <div
      v-else-if="suggestions.length === 0"
      class="px-5 py-10 text-center border rounded-lg bg-muted/20 border-border"
    >
      <p class="font-medium">No mutually beneficial trades found</p>
      <p class="max-w-2xl mx-auto mt-1 text-sm text-muted-foreground">
        This finder only shows reasonably balanced deals where both projected
        starting lineups improve.
        <template v-if="valuationMode === 'dynasty'">
          Dynasty Beta currently suggests player-only deals; owned picks can be
          added in the builder.
        </template>
      </p>
    </div>

    <section v-else aria-labelledby="trade-finder-results">
      <div class="flex items-baseline justify-between gap-3 mb-3">
        <h3 id="trade-finder-results" class="text-sm font-semibold">
          Recommended trades
        </h3>
        <p class="text-xs text-muted-foreground">
          Showing {{ visibleSuggestions.length }} of {{ suggestions.length }}
        </p>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="suggestion in visibleSuggestions"
          :key="suggestion.id"
          class="flex flex-col overflow-hidden transition-shadow border rounded-lg shadow-sm bg-card border-border hover:shadow-md"
        >
          <header
            class="flex items-start justify-between gap-4 p-4 border-b border-border"
          >
            <div>
              <h4 class="mt-1 text-sm font-medium">
                {{ suggestion.teamAName }} / {{ suggestion.teamBName }}
              </h4>
            </div>
            <dl class="text-right shrink-0">
              <div>
                <dt class="sr-only">Fairness</dt>
                <dd
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                >
                  ~{{ formatValueMatch(suggestion.fairnessPercent) }} match
                </dd>
              </div>
              <div class="mt-0.5">
                <dt class="sr-only">Value gap</dt>
              </div>
            </dl>
          </header>

          <div class="flex flex-col flex-1 p-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 border rounded-md border-border/70 bg-muted/20">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="text-xs font-medium text-muted-foreground">
                    {{ suggestion.teamAName }} sends
                  </p>
                  <p class="px-1.5 py-0.5 text-xs rounded bg-background/80">
                    {{ formatValue(suggestion.teamAValue) }}
                  </p>
                </div>
                <ul class="mt-2 space-y-2">
                  <li
                    v-for="player in suggestion.teamASends"
                    :key="player.playerId"
                    class="flex items-center min-w-0 gap-2"
                  >
                    <img
                      v-if="player.position !== 'DEF'"
                      class="object-cover rounded-full size-8 shrink-0 bg-muted"
                      :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.playerId}.jpg`"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      v-else
                      class="object-contain p-1 rounded-full size-8 shrink-0 bg-background"
                      :src="`https://sleepercdn.com/images/team_logos/nfl/${player.playerId.toLowerCase()}.png`"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <div class="min-w-0">
                      <p class="text-sm font-medium leading-tight truncate">
                        {{ player.name }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        {{ player.position }} · {{ player.team || "FA" }}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div class="p-3 border rounded-md border-border/70 bg-muted/20">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="text-xs font-medium text-muted-foreground">
                    {{ suggestion.teamBName }} sends
                  </p>
                  <p class="px-1.5 py-0.5 text-xs rounded bg-background/80">
                    {{ formatValue(suggestion.teamBValue) }}
                  </p>
                </div>
                <ul class="mt-2 space-y-2">
                  <li
                    v-for="player in suggestion.teamBSends"
                    :key="player.playerId"
                    class="flex items-center min-w-0 gap-2"
                  >
                    <img
                      v-if="player.position !== 'DEF'"
                      class="object-cover rounded-full size-8 shrink-0 bg-muted"
                      :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.playerId}.jpg`"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      v-else
                      class="object-contain p-1 rounded-full size-8 shrink-0 bg-background"
                      :src="`https://sleepercdn.com/images/team_logos/nfl/${player.playerId.toLowerCase()}.png`"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <div class="min-w-0">
                      <p class="text-sm font-medium leading-tight truncate">
                        {{ player.name }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted-foreground">
                        {{ player.position }} · {{ player.team || "FA" }}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="p-3 mt-4 border rounded-md border-border bg-muted/20">
              <p class="text-xs font-semibold">Why it works</p>
              <ul
                class="mt-1.5 space-y-1 text-xs leading-relaxed text-muted-foreground"
              >
                <li>
                  <span class="font-medium text-foreground">
                    {{ suggestion.teamAName }}:
                  </span>
                  {{
                    describeTeamImpact({
                      receivingRosterId: suggestion.teamAId,
                      receives: suggestion.teamBSends,
                      sends: suggestion.teamASends,
                      gain: suggestion.teamAGainPerWeek,
                    })
                  }}
                </li>
                <li>
                  <span class="font-medium text-foreground">
                    {{ suggestion.teamBName }}:
                  </span>
                  {{
                    describeTeamImpact({
                      receivingRosterId: suggestion.teamBId,
                      receives: suggestion.teamASends,
                      sends: suggestion.teamBSends,
                      gain: suggestion.teamBGainPerWeek,
                    })
                  }}
                </li>
              </ul>
            </div>

            <div class="flex flex-wrap justify-end gap-2 mt-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                @click="copySuggestion(suggestion)"
              >
                <Copy class="mr-1.5 size-4" aria-hidden="true" />
                Copy trade
              </Button>
              <Button
                type="button"
                size="sm"
                class="px-4"
                @click="emit('openSuggestion', suggestion)"
              >
                Open in builder
              </Button>
            </div>
          </div>
        </article>
      </div>
      <div v-if="remainingSuggestionCount > 0" class="mt-5 text-center">
        <Button type="button" variant="outline" @click="showMoreSuggestions">
          Show {{ Math.min(SUGGESTION_PAGE_SIZE, remainingSuggestionCount) }}
          more
          <span class="ml-1 text-muted-foreground">
            ({{ remainingSuggestionCount }} remaining)
          </span>
        </Button>
      </div>
    </section>
  </div>
</template>
