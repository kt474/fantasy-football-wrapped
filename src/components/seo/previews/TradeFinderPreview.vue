<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import type {
  TradeFinderPick,
  TradeFinderPlayer,
  TradeSuggestion,
} from "@/lib/tradeFinder";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";
import PlayerHeadshot from "./PlayerHeadshot.vue";
import {
  demoTradeSuggestionsByRoster,
  demoTradeValueRosters,
} from "@/data/demo/trade-values";

const getRosterPlayer = (rosterId: number) =>
  demoTradeValueRosters.find((roster) => roster.id === rosterId)!.players[0];

const dynastyPackage: TradeSuggestion = {
  id: "demo-dynasty-package",
  tradeType: "multi-asset",
  teamAId: 5,
  teamAName: "Breece's Puffs",
  teamBId: 6,
  teamBName: "Saquondo",
  teamASends: [getRosterPlayer(5)],
  teamBSends: [getRosterPlayer(6)],
  teamAPicks: [{ id: "breece-2027-2", season: 2027, round: 2 }],
  teamAValue: 91,
  teamBValue: 86,
  teamAGain: 16.8,
  teamBGain: 13.6,
  teamAGainPerWeek: 2.1,
  teamBGainPerWeek: 1.7,
  fairnessPercent: 94.5,
  valueGapPercent: 5.5,
  score: 98.3,
};

const allSuggestions = [
  ...new Map(
    [dynastyPackage, ...Object.values(demoTradeSuggestionsByRoster).flat()]
      .map((suggestion) => [suggestion.id, suggestion])
  ).values(),
];

const selectedManagerId = ref(0);
const sortMode = ref<"match" | "lineup">("match");
const currentIndex = ref(0);
const copied = ref(false);

const suggestions = computed(() => {
  const filtered =
    selectedManagerId.value === 0
      ? [...allSuggestions]
      : allSuggestions.filter(
          (candidate) =>
            candidate.teamAId === selectedManagerId.value ||
            candidate.teamBId === selectedManagerId.value
        );

  return filtered.sort((a, b) =>
    sortMode.value === "match"
      ? b.fairnessPercent - a.fairnessPercent
      : b.teamAGainPerWeek +
        b.teamBGainPerWeek -
        (a.teamAGainPerWeek + a.teamBGainPerWeek)
  );
});

const suggestion = computed(
  () => suggestions.value[currentIndex.value] ?? allSuggestions[0]
);
const fairness = computed(() => Math.round(suggestion.value.fairnessPercent));
const hasDraftPicks = computed(() =>
  Boolean(
    suggestion.value.teamAPicks?.length || suggestion.value.teamBPicks?.length
  )
);

const formatPick = (pick: TradeFinderPick) =>
  `${pick.season} ${pick.round}${pick.round === 1 ? "st" : pick.round === 2 ? "nd" : pick.round === 3 ? "rd" : "th"}`;

const formatAssets = (
  players: TradeFinderPlayer[],
  picks: TradeFinderPick[] = []
) =>
  [
    ...players.map((player) => player.name),
    ...picks.map((pick) => `${formatPick(pick)}-round pick`),
  ].join(", ");

const previousSuggestion = () => {
  currentIndex.value =
    (currentIndex.value - 1 + suggestions.value.length) %
    suggestions.value.length;
  copied.value = false;
};

const nextSuggestion = () => {
  currentIndex.value = (currentIndex.value + 1) % suggestions.value.length;
  copied.value = false;
};

const copyTrade = async () => {
  const trade = suggestion.value;
  const teamAAssets = formatAssets(trade.teamASends, trade.teamAPicks);
  const teamBAssets = formatAssets(trade.teamBSends, trade.teamBPicks);
  await navigator.clipboard.writeText(
    `${trade.teamAName} sends ${teamAAssets}; ${trade.teamBName} sends ${teamBAssets}.`
  );
  copied.value = true;
};

watch([selectedManagerId, sortMode], () => {
  currentIndex.value = 0;
  copied.value = false;
});
</script>

<template>
  <ProductPreviewFrame
    title="Trade Finder"
    :eyebrow="
      hasDraftPicks
        ? 'Fourth & Long · Dynasty values'
        : 'Fourth & Long · Rest-of-season values'
    "
  >
    <template #toolbar>
      <span
        class="hidden text-[0.68rem] tabular-nums text-muted-foreground sm:inline"
      >
        {{ currentIndex + 1 }} of {{ suggestions.length }} suggestions
      </span>
    </template>

    <div class="p-4">
      <div
        class="flex flex-col gap-3 pb-4 border-b sm:flex-row sm:items-end sm:justify-between"
      >
        <p class="max-w-sm text-xs leading-5 text-muted-foreground">
          Balanced offers where both projected starting lineups improve.
        </p>
        <div class="grid grid-cols-2 gap-2 text-xs sm:min-w-[20rem]">
          <label>
            <span class="block mb-1 text-[0.62rem] text-muted-foreground"
              >Sort suggestions</span
            >
            <select
              v-model="sortMode"
              class="w-full h-9 px-2 border rounded-md outline-none bg-background focus:ring-2 focus:ring-ring"
            >
              <option value="match">Best value match</option>
              <option value="lineup">Largest lineup gain</option>
            </select>
          </label>
          <label>
            <span class="block mb-1 text-[0.62rem] text-muted-foreground"
              >Manager</span
            >
            <select
              v-model.number="selectedManagerId"
              class="w-full h-9 px-2 border rounded-md outline-none bg-background focus:ring-2 focus:ring-ring"
            >
              <option :value="0">All managers</option>
              <option
                v-for="roster in demoTradeValueRosters"
                :key="roster.id"
                :value="roster.id"
              >
                {{ roster.managerName }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <article class="mt-4 overflow-hidden border rounded-lg bg-background">
        <header
          class="flex flex-col gap-3 p-3.5 border-b bg-muted/10 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <p class="text-[0.65rem] text-muted-foreground">
              Recommended trade
            </p>
            <h3 class="mt-0.5 text-sm font-semibold">
              {{ suggestion.teamAName }} / {{ suggestion.teamBName }}
            </h3>
            <p
              v-if="hasDraftPicks"
              class="mt-1 text-[0.65rem] font-medium text-primary"
            >
              Multi-asset dynasty package
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center border rounded-md size-7 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              :disabled="suggestions.length < 2"
              aria-label="Previous trade suggestion"
              @click="previousSuggestion"
            >
              <ChevronLeft :size="14" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center border rounded-md size-7 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              :disabled="suggestions.length < 2"
              aria-label="Next trade suggestion"
              @click="nextSuggestion"
            >
              <ChevronRight :size="14" />
            </button>
            <span
              class="px-2 py-1 text-xs font-semibold border rounded-md border-success/20 bg-success/10 text-success"
            >
              {{ fairness }}% match
            </span>
          </div>
        </header>

        <div class="grid gap-3 p-3 sm:grid-cols-2">
          <section class="p-3 border rounded-md bg-muted/15">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.65rem] text-muted-foreground">
                {{ suggestion.teamAName }} sends
              </p>
              <span class="text-xs font-semibold tabular-nums">
                {{ suggestion.teamAValue.toFixed(1) }}
              </span>
            </div>
            <div
              v-for="player in suggestion.teamASends"
              :key="player.playerId"
              class="flex items-center gap-2 mt-3"
            >
              <PlayerHeadshot
                :player-id="player.playerId"
                :name="player.name"
                :position="player.position"
                :team="player.team"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ player.name }}</p>
                <p class="text-[0.68rem] text-muted-foreground">
                  {{ player.position }} · {{ player.team }}
                </p>
              </div>
            </div>
            <div
              v-for="pick in suggestion.teamAPicks ?? []"
              :key="pick.id"
              class="flex items-center gap-2 mt-2"
            >
              <span
                class="inline-flex items-center justify-center border rounded-full size-9 shrink-0 bg-background text-[0.52rem] font-bold text-primary"
                aria-hidden="true"
              >
                PICK
              </span>
              <div>
                <p class="text-sm font-medium">
                  {{ formatPick(pick) }}-round pick
                </p>
                <p class="text-[0.68rem] text-muted-foreground">
                  Dynasty asset
                </p>
              </div>
            </div>
          </section>

          <section class="p-3 border rounded-md bg-muted/15">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.65rem] text-muted-foreground">
                {{ suggestion.teamBName }} sends
              </p>
              <span class="text-xs font-semibold tabular-nums">
                {{ suggestion.teamBValue.toFixed(1) }}
              </span>
            </div>
            <div
              v-for="player in suggestion.teamBSends"
              :key="player.playerId"
              class="flex items-center gap-2 mt-3"
            >
              <PlayerHeadshot
                :player-id="player.playerId"
                :name="player.name"
                :position="player.position"
                :team="player.team"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ player.name }}</p>
                <p class="text-[0.68rem] text-muted-foreground">
                  {{ player.position }} · {{ player.team }}
                </p>
              </div>
            </div>
            <div
              v-for="pick in suggestion.teamBPicks ?? []"
              :key="pick.id"
              class="flex items-center gap-2 mt-2"
            >
              <span
                class="inline-flex items-center justify-center border rounded-full size-9 shrink-0 bg-background text-[0.52rem] font-bold text-primary"
                aria-hidden="true"
              >
                PICK
              </span>
              <div>
                <p class="text-sm font-medium">
                  {{ formatPick(pick) }}-round pick
                </p>
                <p class="text-[0.68rem] text-muted-foreground">
                  Dynasty asset
                </p>
              </div>
            </div>
          </section>
        </div>

        <div class="p-3 mx-3 mb-3 border rounded-md bg-muted/15">
          <p class="text-xs font-semibold">Why it works</p>
          <div
            class="grid gap-2 mt-2 text-[0.68rem] leading-5 text-muted-foreground sm:grid-cols-2"
          >
            <p>
              <span class="font-medium text-foreground"
                >{{ suggestion.teamAName }}:</span
              >
              {{ suggestion.teamBSends[0].name }} adds
              <span class="font-semibold text-success"
                >+{{ suggestion.teamAGainPerWeek.toFixed(1) }} pts/week</span
              >
              to the best lineup.
            </p>
            <p>
              <span class="font-medium text-foreground"
                >{{ suggestion.teamBName }}:</span
              >
              {{ suggestion.teamASends[0].name }} adds
              <span class="font-semibold text-success"
                >+{{ suggestion.teamBGainPerWeek.toFixed(1) }} pts/week</span
              >
              while keeping the value gap close<template
                v-if="suggestion.teamAPicks?.length"
                >, with the
                {{ formatPick(suggestion.teamAPicks[0]) }}-round pick balancing
                the long-term side</template
              >.
            </p>
          </div>
        </div>

        <footer class="flex flex-wrap justify-end gap-2 px-3 py-3 border-t">
          <Button
            size="sm"
            variant="outline"
            type="button"
            @click="copyTrade"
          >
            <Check v-if="copied" :size="13" class="mr-1.5 text-success" />
            <Copy v-else :size="13" class="mr-1.5" />
            {{ copied ? "Copied" : "Copy trade" }}
          </Button>
          <Button as-child size="sm" variant="secondary">
            <RouterLink
              :to="{
                path: '/',
                query: {
                  source: 'trade_finder_preview',
                  destination: 'trade_finder',
                  tradeMode: 'finder',
                },
              }"
            >
              Try Trade Finder <ArrowRight :size="13" class="ml-1.5" />
            </RouterLink>
          </Button>
        </footer>
      </article>
    </div>
  </ProductPreviewFrame>
</template>
