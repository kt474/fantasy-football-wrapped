<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeftRight, ArrowRight, Search } from "lucide-vue-next";
import {
  getPlayerTradeDatabase,
  getPlayersByIdsMap,
  type TradeDatabaseAsset,
  type TradeDatabaseResult,
} from "@/api/api";
import {
  getSearchablePlayers,
  type SearchableSleeperPlayer,
} from "@/api/sleeperApi";
import type { Player } from "@/types/apiTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 20;

const query = ref("");
const directory = ref<SearchableSleeperPlayer[]>([]);
const selectedPlayer = ref<SearchableSleeperPlayer | null>(null);
const trades = ref<TradeDatabaseResult[]>([]);
const playerLookup = ref(new Map<string, Player>());
const loadingDirectory = ref(false);
const loadingTrades = ref(false);
const errorMessage = ref("");
const totalTrades = ref(0);
const hasMore = ref(false);
const searchFocused = ref(false);
const leagueType = ref("all");
const leagueSize = ref("all");
const selectedWeek = ref("all");

const weekOptions = Array.from({ length: 18 }, (_, index) => index + 1);

const suggestions = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (normalizedQuery.length < 2 || selectedPlayer.value) return [];

  return directory.value
    .filter((player) => {
      const searchable =
        `${player.name} ${player.team} ${player.position}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    })
    .slice(0, 8);
});

const showSuggestions = computed(
  () => searchFocused.value && suggestions.value.length > 0
);

const loadDirectory = async () => {
  if (directory.value.length || loadingDirectory.value) return;
  loadingDirectory.value = true;
  try {
    directory.value = await getSearchablePlayers();
  } catch (error) {
    console.error("Unable to load player directory:", error);
    errorMessage.value = "Player search is unavailable right now.";
  } finally {
    loadingDirectory.value = false;
  }
};

const loadPlayerNames = async (results: TradeDatabaseResult[]) => {
  const missingIds = Array.from(
    new Set(
      results.flatMap((trade) =>
        trade.sides.flatMap((side) =>
          side.received
            .map((asset) => asset.playerId)
            .filter((id): id is string => Boolean(id))
        )
      )
    )
  ).filter((id) => !playerLookup.value.has(id));

  if (!missingIds.length) return;

  const chunks = Array.from(
    { length: Math.ceil(missingIds.length / 50) },
    (_, index) => missingIds.slice(index * 50, index * 50 + 50)
  );
  const maps = await Promise.all(chunks.map(getPlayersByIdsMap));
  const nextLookup = new Map(playerLookup.value);
  maps.forEach((map) =>
    map.forEach((player, id) => nextLookup.set(id, player))
  );
  playerLookup.value = nextLookup;
};

const fetchTrades = async (append = false) => {
  if (!selectedPlayer.value || loadingTrades.value) return;

  loadingTrades.value = true;
  errorMessage.value = "";
  const offset = append ? trades.value.length : 0;

  try {
    const response = await getPlayerTradeDatabase(
      selectedPlayer.value.player_id,
      offset,
      PAGE_SIZE,
      {
        leagueType: leagueType.value === "all" ? undefined : leagueType.value,
        leagueSize: leagueSize.value === "all" ? undefined : leagueSize.value,
        week:
          selectedWeek.value === "all" ? undefined : Number(selectedWeek.value),
      }
    );
    await loadPlayerNames(response.trades);
    trades.value = append
      ? [...trades.value, ...response.trades]
      : response.trades;
    totalTrades.value = response.pagination.total;
    hasMore.value = response.pagination.hasMore;
  } catch (error) {
    console.error("Unable to load trade database:", error);
    errorMessage.value = "Could not load trades. Please try again.";
  } finally {
    loadingTrades.value = false;
  }
};

const selectPlayer = async (player: SearchableSleeperPlayer) => {
  selectedPlayer.value = player;
  query.value = player.name;
  searchFocused.value = false;
  trades.value = [];
  totalTrades.value = 0;
  await fetchTrades();
};

const handleQueryInput = () => {
  if (selectedPlayer.value && query.value !== selectedPlayer.value.name) {
    selectedPlayer.value = null;
    trades.value = [];
    totalTrades.value = 0;
    hasMore.value = false;
  }
};

const closeSuggestions = () => {
  window.setTimeout(() => {
    searchFocused.value = false;
  }, 150);
};

const applyFilters = async () => {
  if (!selectedPlayer.value) return;
  trades.value = [];
  totalTrades.value = 0;
  hasMore.value = false;
  await fetchTrades();
};

const clearFilters = async () => {
  leagueType.value = "all";
  leagueSize.value = "all";
  selectedWeek.value = "all";
  await applyFilters();
};

const hasActiveFilters = computed(
  () =>
    leagueType.value !== "all" ||
    leagueSize.value !== "all" ||
    selectedWeek.value !== "all"
);

const assetLabel = (asset: TradeDatabaseAsset) => {
  if (asset.type === "player") {
    const player = asset.playerId
      ? playerLookup.value.get(asset.playerId)
      : undefined;
    return player?.name || (player?.team ? `${player.team} Defense` : "Player");
  }
  if (asset.type === "draft_pick") {
    const round = asset.pickRound ?? 0;
    const suffix =
      round % 100 >= 11 && round % 100 <= 13
        ? "th"
        : round % 10 === 1
          ? "st"
          : round % 10 === 2
            ? "nd"
            : round % 10 === 3
              ? "rd"
              : "th";
    return `${asset.pickSeason ?? ""} ${round}${suffix}-round pick`;
  }
  return `$${asset.faabAmount ?? 0} FAAB`;
};

const assetMeta = (asset: TradeDatabaseAsset) => {
  if (asset.type !== "player" || !asset.playerId) return "";
  const player = playerLookup.value.get(asset.playerId);
  return player
    ? [player.position, player.team].filter(Boolean).join(" · ")
    : "";
};

const leagueTypeLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    "0": "Redraft",
    "1": "Keeper",
    "2": "Dynasty",
    "3": "Guillotine",
  };
  return type ? (labels[type] ?? type) : null;
};
</script>

<template>
  <div
    class="space-y-2"
    :class="{
      'min-h-[calc(100vh-14rem)]':
        !selectedPlayer || (loadingTrades && trades.length === 0),
    }"
  >
    <div class="max-w-3xl">
      <p class="mt-4 text-muted-foreground">
        Search any player to see real, anonymized trades from ffwrapped leagues.
      </p>
    </div>

    <div class="max-w-xl">
      <div class="relative">
        <Search
          class="absolute z-10 w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground"
        />
        <Input
          v-model="query"
          class="pl-9"
          placeholder="Search players..."
          autocomplete="off"
          @focus="
            searchFocused = true;
            loadDirectory();
          "
          @input="handleQueryInput"
          @blur="closeSuggestions"
        />
        <div
          v-if="showSuggestions"
          class="absolute z-20 w-full mt-1 overflow-hidden border rounded-md shadow-lg bg-popover text-popover-foreground"
        >
          <button
            v-for="player in suggestions"
            :key="player.player_id"
            type="button"
            class="flex items-center w-full gap-3 px-3 py-2 text-left hover:bg-accent"
            @pointerdown.prevent="selectPlayer(player)"
          >
            <img
              v-if="player.position !== 'DEF'"
              class="object-cover w-10 h-10 rounded-full bg-muted"
              :src="`https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`"
              alt=""
            />
            <img
              v-else
              class="object-contain w-10 h-10 p-1 rounded-full bg-muted"
              :src="`https://sleepercdn.com/images/team_logos/nfl/${player.team.toLowerCase()}.png`"
              alt=""
            />
            <span>
              <span class="block text-sm font-medium">{{ player.name }}</span>
              <span class="block text-xs text-muted-foreground">
                {{ player.position }} · {{ player.team }}
              </span>
            </span>
          </button>
        </div>
      </div>
      <p v-if="loadingDirectory" class="mt-2 text-xs text-muted-foreground">
        Loading player search…
      </p>
    </div>

    <div
      v-if="!selectedPlayer"
      class="flex min-h-[calc(100vh-25rem)] items-center justify-center"
    >
      <Card class="w-full max-w-xl">
        <CardContent class="p-6">
          <h3 class="text-xl font-semibold">What is a player worth?</h3>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
            Search above to see the actual trade packages ffwrapped leagues have
            exchanged for a player.
          </p>

          <div class="p-4 mt-5 border rounded-lg bg-muted/30">
            <p
              class="mb-3 text-xs font-semibold uppercase text-muted-foreground"
            >
              Example trade
            </p>
            <div class="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <img
                    class="object-cover rounded-full w-9 h-9 bg-muted"
                    src="https://sleepercdn.com/content/nfl/players/thumb/6794.jpg"
                    alt=""
                  />
                  <div>
                    <p class="text-sm font-medium">Justin Jefferson</p>
                    <p class="text-xs text-muted-foreground">WR · MIN</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <img
                    class="object-cover rounded-full w-9 h-9 bg-muted"
                    src="https://sleepercdn.com/content/nfl/players/thumb/9221.jpg"
                    alt=""
                  />
                  <div>
                    <p class="text-sm font-medium">Jahmyr Gibbs</p>
                    <p class="text-xs text-muted-foreground">RB · DET</p>
                  </div>
                </div>
                <p class="text-xs font-medium">2027 2nd-round pick</p>
              </div>
              <ArrowLeftRight class="w-3 h-3 mt-2 sm:w-5 sm:h-5 text-primary" />
              <div class="space-y-3">
                <div class="flex items-center justify-end gap-2">
                  <div class="text-right">
                    <p class="text-sm font-medium">Ja'Marr Chase</p>
                    <p class="text-xs text-muted-foreground">WR · CIN</p>
                  </div>
                  <img
                    class="object-cover rounded-full w-9 h-9 bg-muted"
                    src="https://sleepercdn.com/content/nfl/players/thumb/7564.jpg"
                    alt=""
                  />
                </div>
                <div class="flex items-center justify-end gap-2">
                  <div class="text-right">
                    <p class="text-sm font-medium">Breece Hall</p>
                    <p class="text-xs text-muted-foreground">RB · NYJ</p>
                  </div>
                  <img
                    class="object-cover rounded-full w-9 h-9 bg-muted"
                    src="https://sleepercdn.com/content/nfl/players/thumb/8155.jpg"
                    alt=""
                  />
                </div>
                <p class="text-xs font-medium text-right">$15 FAAB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      v-if="selectedPlayer"
      class="flex flex-col gap-4 p-3 border rounded-lg md:flex-row md:items-end"
    >
      <div class="flex items-center gap-3 md:mr-auto md:min-w-52">
        <img
          v-if="selectedPlayer.position !== 'DEF'"
          class="object-cover w-12 h-12 rounded-full bg-muted"
          :src="`https://sleepercdn.com/content/nfl/players/thumb/${selectedPlayer.player_id}.jpg`"
          alt=""
        />
        <img
          v-else
          class="object-contain w-12 h-12 p-1 rounded-full bg-muted"
          :src="`https://sleepercdn.com/images/team_logos/nfl/${selectedPlayer.team.toLowerCase()}.png`"
          alt=""
        />
        <div>
          <p class="font-semibold">{{ selectedPlayer.name }}</p>
          <p class="text-sm text-muted-foreground">
            {{ selectedPlayer.position }} · {{ selectedPlayer.team }} ·
            {{ totalTrades }} trades
          </p>
        </div>
      </div>

      <div class="grid flex-1 gap-2 sm:grid-cols-3 md:max-w-xl">
        <div class="space-y-1">
          <Select v-model="leagueType">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              <SelectItem value="Redraft">Redraft</SelectItem>
              <SelectItem value="Keeper">Keeper</SelectItem>
              <SelectItem value="Dynasty">Dynasty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Select v-model="leagueSize">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              <SelectItem value="8">8 teams</SelectItem>
              <SelectItem value="10">10 teams</SelectItem>
              <SelectItem value="12">12 teams</SelectItem>
              <SelectItem value="14_plus">14+ teams</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Select v-model="selectedWeek">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All weeks</SelectItem>
              <SelectItem
                v-for="week in weekOptions"
                :key="week"
                :value="String(week)"
              >
                Week {{ week }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="flex gap-2 md:shrink-0">
        <Button :disabled="loadingTrades" @click="applyFilters"> Apply </Button>
        <Button
          v-if="hasActiveFilters"
          variant="outline"
          :disabled="loadingTrades"
          @click="clearFilters"
        >
          Clear
        </Button>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <div
      v-if="loadingTrades && trades.length === 0"
      class="flex min-h-[calc(100vh-25rem)] items-center justify-center py-10 text-sm text-center text-muted-foreground"
    >
      Searching the trade database…
    </div>
    <Card v-else-if="selectedPlayer && !trades.length && !errorMessage">
      <CardContent class="py-10 text-center">
        <p class="font-medium">No trades found</p>
        <p class="mt-1 text-sm text-muted-foreground">
          This player has not appeared in an indexed 2026 trade yet.
        </p>
      </CardContent>
    </Card>

    <div v-if="trades.length" class="grid gap-4 pt-2 lg:grid-cols-2">
      <Card v-for="trade in trades" :key="trade.tradeId">
        <CardHeader class="pb-3">
          <div class="flex items-start justify-between gap-3">
            <CardTitle class="text-base">
              {{ trade.season || "2026"
              }}{{ trade.week ? ` · Week ${trade.week}` : "" }}
            </CardTitle>
            <div class="flex flex-wrap justify-end gap-1">
              <Badge
                v-if="leagueTypeLabel(trade.league.type)"
                variant="secondary"
              >
                {{ leagueTypeLabel(trade.league.type) }}
              </Badge>
              <Badge v-if="trade.league.size" variant="outline">
                {{ trade.league.size }} teams
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            class="grid gap-4"
            :class="trade.sides.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-3'"
          >
            <div v-for="side in trade.sides" :key="side.side" class="min-w-0">
              <p
                class="mb-2 text-xs font-semibold uppercase text-muted-foreground"
              >
                Team {{ side.side }}
              </p>
              <div class="space-y-2">
                <div
                  v-for="(asset, index) in side.received"
                  :key="`${asset.type}-${asset.playerId}-${index}`"
                  class="flex items-center gap-2 text-sm"
                >
                  <img
                    v-if="asset.type === 'player' && asset.playerId"
                    class="object-cover w-8 h-8 rounded-full bg-muted"
                    :src="`https://sleepercdn.com/content/nfl/players/thumb/${asset.playerId}.jpg`"
                    alt=""
                  />
                  <ArrowRight
                    v-else-if="asset.type === 'faab'"
                    class="w-4 h-4 text-muted-foreground"
                  />
                  <span class="min-w-0">
                    <span class="block font-medium truncate">
                      {{ assetLabel(asset) }}
                    </span>
                    <span
                      v-if="assetMeta(asset)"
                      class="block text-xs text-muted-foreground"
                    >
                      {{ assetMeta(asset) }}
                    </span>
                  </span>
                </div>
                <p
                  v-if="side.received.length === 0"
                  class="text-sm text-muted-foreground"
                >
                  No assets listed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-if="hasMore" class="flex justify-center">
      <Button
        variant="outline"
        :disabled="loadingTrades"
        @click="fetchTrades(true)"
      >
        {{ loadingTrades ? "Loading…" : "Load more trades" }}
      </Button>
    </div>
  </div>
</template>
