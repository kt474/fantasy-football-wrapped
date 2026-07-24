<script setup lang="ts">
import { computed, ref, watch } from "vue";
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
  getPlayerValues,
  TradeValuesAccessError,
  type TradeValueRequestPayload,
} from "@/api/tradeValuesApi";
import {
  type DynastyPerspective,
  type TradeSuggestion,
} from "@/lib/tradeFinder";

const props = defineProps<{
  rosters: Array<{ id: number; managerName: string }>;
  request: TradeValueRequestPayload | null;
  rosterPositions: string[];
  remainingWeeks: number;
  loading?: boolean;
  valuationMode?: "ros-projection" | "season-results" | "dynasty";
  dynastyPerspective?: DynastyPerspective;
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
const MAX_VISIBLE_SUGGESTIONS = 6;
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

watch(
  [selectedRosterId, () => props.request, finderRetryNonce],
  async ([rosterId, request]) => {
    const currentRequestId = ++finderRequestId;
    if (rosterId == null || !request) {
      suggestions.value = [];
      finderLoading.value = false;
      accessError.value = "";
      finderError.value = "";
      return;
    }
    finderLoading.value = true;
    accessError.value = "";
    finderError.value = "";
    try {
      const response = await getPlayerValues({
        ...request,
        finderForRosterId: rosterId,
      });
      if (currentRequestId === finderRequestId) {
        suggestions.value = (response.suggestions ?? []).slice(
          0,
          MAX_VISIBLE_SUGGESTIONS
        );
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

const formatGain = (value: number) => `+${value.toFixed(2)} pts/wk`;
const formatValue = (value: number) =>
  Number.isFinite(value) ? value.toFixed(1) : "—";
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
            ? "their projected lineups while staying close in long-term dynasty value"
            : valuationMode === "season-results"
              ? "their season long lineup value"
              : "their projected starting lineups"
        }}. Values are based on
        {{
          valuationMode === "dynasty"
            ? `dynasty ADP, league format, and the ${dynastyPerspective || "balanced"} team direction`
            : valuationMode === "season-results"
              ? "full season performance"
              : "rest of season projections"
        }}
        and your league format.
      </p>
      <div class="shrink-0">
        <Select v-model="selectedRosterModel">
          <SelectTrigger class="w-full sm:w-52">
            <SelectValue placeholder="Select a manager" />
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
      <p class="max-w-lg mx-auto mt-1 text-sm text-muted-foreground">
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
        This finder only shows reasonably balanced one-for-one or two-for-one
        deals where both projected starting lineups improve.
        <template v-if="valuationMode === 'dynasty'">
          Dynasty Beta currently suggests player-only deals; owned picks can be
          added in the builder.
        </template>
      </p>
    </div>

    <section v-else aria-labelledby="trade-finder-results">
      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="suggestion in suggestions"
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
                  {{ suggestion.fairnessPercent }}% fair
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

            <div class="flex items-center justify-between gap-3 mt-4">
              <dl class="flex flex-wrap min-w-0 gap-2">
                <div
                  class="inline-flex items-center h-9 min-w-0 gap-1.5 px-2.5 border rounded-md border-border bg-muted/30"
                >
                  <dt class="min-w-0 text-xs truncate">
                    {{ suggestion.teamAName }}
                  </dt>
                  <dd class="text-xs font-semibold shrink-0">
                    {{ formatGain(suggestion.teamAGainPerWeek) }}
                  </dd>
                </div>
                <div
                  class="inline-flex items-center h-9 min-w-0 gap-1.5 px-2.5 border rounded-md border-border bg-muted/30"
                >
                  <dt class="min-w-0 text-xs truncate">
                    {{ suggestion.teamBName }}
                  </dt>
                  <dd class="text-xs font-semibold shrink-0">
                    {{ formatGain(suggestion.teamBGainPerWeek) }}
                  </dd>
                </div>
              </dl>

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
    </section>
  </div>
</template>
