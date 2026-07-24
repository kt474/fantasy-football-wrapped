<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import {
  getTradeValuationMode,
  getTradeValueWeek,
  isDynastyLeague,
  loadLeaguePlayerValues,
  type LeagueTradeValueRoster,
} from "@/lib/leagueTradeValues";
import { useDynastyTradePerspective } from "@/composables/useDynastyTradePerspective";
import Card from "@/components/ui/card/Card.vue";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TradeRankings from "@/components/trade_lab/TradeRankings.vue";

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();
const rosters = ref<LeagueTradeValueRoster[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const access = ref<"preview" | "premium">("preview");
const previewLimit = ref(10);
const totalPlayers = ref(0);
const dynastyPerspective = useDynastyTradePerspective();
const activeLeague = computed(() => store.currentLeague);
const dynasty = computed(() => isDynastyLeague(activeLeague.value));
const selectedWeek = computed(() =>
  activeLeague.value ? getTradeValueWeek(activeLeague.value) : 1
);
const valuationMode = computed(() =>
  getTradeValuationMode(activeLeague.value)
);

let requestId = 0;

const fetchPlayerValues = async () => {
  const league = activeLeague.value;
  if (!league || store.leagueIds.length === 0) {
    rosters.value = [];
    return;
  }

  const currentRequestId = ++requestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await loadLeaguePlayerValues({
      league,
      tableData: props.tableData,
      selectedWeek: selectedWeek.value,
      showUsernames: store.showUsernames,
      dynastyPerspective: dynastyPerspective.value,
    });
    if (currentRequestId === requestId) {
      rosters.value = result.rosters;
      access.value = result.access;
      previewLimit.value = result.previewLimit;
      totalPlayers.value = result.totalPlayers;
    }
  } catch (error) {
    console.error("Unable to load player values:", error);
    if (currentRequestId === requestId) {
      rosters.value = [];
      access.value = "preview";
      totalPlayers.value = 0;
      errorMessage.value = "Player values are unavailable right now.";
    }
  } finally {
    if (currentRequestId === requestId) {
      loading.value = false;
    }
  }
};

watch(
  [
    () => store.currentLeagueId,
    () => store.showUsernames,
    () => dynastyPerspective.value,
  ],
  fetchPlayerValues
);

onMounted(fetchPlayerValues);
</script>

<template>
  <Card class="w-full h-full p-4 my-4 md:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="heading-section">Player Values</h2>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <div v-if="dynasty">
          <label class="block mb-1 text-xs font-medium text-muted-foreground">
            Team direction
          </label>
          <Select v-model="dynastyPerspective">
            <SelectTrigger class="w-36" aria-label="Dynasty team direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="contender">Contender</SelectItem>
              <SelectItem value="rebuilder">Rebuilder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <TradeRankings
      v-if="!errorMessage"
      :rosters="rosters"
      :loading="loading"
      :valuation-mode="valuationMode"
    />
    <div
      v-if="errorMessage"
      class="p-4 mt-4 text-center border rounded-lg border-destructive/30"
    >
      <p class="text-sm text-destructive">{{ errorMessage }}</p>
      <Button class="mt-3" variant="outline" @click="fetchPlayerValues">
        Retry rankings
      </Button>
    </div>
    <div
      v-if="!loading && access === 'preview' && totalPlayers > previewLimit"
      class="p-4 mt-4 text-center border rounded-lg"
    >
      <p class="font-medium">
        Previewing {{ previewLimit }} out of {{ totalPlayers }} players
      </p>
      <p class="mt-1 text-sm text-muted-foreground">
        Premium unlocks complete league adjusted rankings and Trade Finder.
      </p>
      <router-link
        :to="{
          path: '/account',
          query: {
            ...$route.query,
            intent: 'player_values',
            upgrade_source: 'player_values_preview',
          },
        }"
        class="inline-flex items-center justify-center px-4 mt-3 text-sm font-medium rounded-md h-9 bg-primary text-primary-foreground"
      >
        Unlock complete rankings
      </router-link>
    </div>
  </Card>
</template>
