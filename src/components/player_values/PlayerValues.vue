<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import {
  getTradeValuationMode,
  getTradeValueWeek,
  loadLeaguePlayerValues,
  type LeagueTradeValueRoster,
} from "@/lib/leagueTradeValues";
import { useDynastyTradePerspective } from "@/composables/useDynastyTradePerspective";
import Card from "@/components/ui/card/Card.vue";
import { Button } from "@/components/ui/button";
import TradeRankings from "@/components/trade_lab/TradeRankings.vue";
import { loadDemoTradeValues } from "@/data/demo/loaders";
import {
  getLeagueAnalyticsProperties,
  trackPremiumFunnelEvent,
} from "@/lib/analytics";

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();
const route = useRoute();
const router = useRouter();
const rosters = ref<LeagueTradeValueRoster[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const access = ref<"preview" | "premium">("preview");
const totalPlayers = ref(0);
const trackedPreviewPaywall = ref(false);
const dynastyPerspective = useDynastyTradePerspective();
const activeLeague = computed(() => store.currentLeague);
const isDemoLeague = computed(
  () => !store.currentLeagueId && store.leagueIds.length === 0
);
const visiblePlayerCount = computed(
  () =>
    new Set(
      rosters.value.flatMap((roster) =>
        roster.players.map((player) => player.playerId)
      )
    ).size
);
const selectedWeek = computed(() =>
  activeLeague.value ? getTradeValueWeek(activeLeague.value) : 1
);
const valuationMode = computed(() => getTradeValuationMode(activeLeague.value));

const previewAnalyticsProperties = () => ({
  feature: "player_values",
  source: "player_values_preview",
  preview_player_count: visiblePlayerCount.value,
  locked_player_count: Math.max(
    0,
    totalPlayers.value - visiblePlayerCount.value
  ),
  total_player_count: totalPlayers.value,
  valuation_mode: valuationMode.value,
  ...getLeagueAnalyticsProperties(activeLeague.value),
});

let requestId = 0;

const openPlayerInTradeBuilder = async ({
  playerId,
  rosterId,
}: {
  playerId: string;
  rosterId: number;
}) => {
  await router.replace({
    path: "/",
    query: {
      ...route.query,
      destination: undefined,
      tradeMode: "builder",
      tradePlayerId: playerId,
      tradeRosterId: String(rosterId),
    },
  });
  store.currentTab = "Trade Lab";
  localStorage.setItem("currentTab", "Trade Lab");
};

const fetchPlayerValues = async () => {
  const league = activeLeague.value;
  const currentRequestId = ++requestId;
  loading.value = true;
  errorMessage.value = "";

  if (isDemoLeague.value) {
    try {
      const demo = await loadDemoTradeValues();
      if (currentRequestId === requestId) {
        rosters.value = demo.demoTradeValueRosters;
        access.value = "premium";
        totalPlayers.value = demo.demoTradeValuePlayerCount;
      }
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false;
      }
    }
    return;
  }

  if (!league || store.leagueIds.length === 0) {
    rosters.value = [];
    loading.value = false;
    return;
  }

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
    () => activeLeague.value?.lastUpdated,
    () => store.showUsernames,
    () => dynastyPerspective.value,
  ],
  fetchPlayerValues,
  { flush: "post" }
);

watch(
  [access, visiblePlayerCount, totalPlayers],
  ([currentAccess, visibleCount, currentTotal]) => {
    if (
      trackedPreviewPaywall.value ||
      currentAccess !== "preview" ||
      visibleCount <= 0 ||
      currentTotal <= visibleCount
    ) {
      return;
    }

    trackedPreviewPaywall.value = true;
    trackPremiumFunnelEvent("paywall_viewed", previewAnalyticsProperties());
  }
);

const trackPreviewUpgradeClick = () => {
  trackPremiumFunnelEvent("premium_cta_clicked", {
    ...previewAnalyticsProperties(),
    cta: "unlock_complete_player_values",
  });
};

onMounted(fetchPlayerValues);
</script>

<template>
  <Card class="min-h-[calc(100dvh-6rem)] w-full p-4 my-4 md:p-6">
    <h2 class="heading-section">Player Values</h2>

    <TradeRankings
      v-if="!errorMessage"
      v-model:dynasty-perspective="dynastyPerspective"
      :rosters="rosters"
      :loading="loading"
      :valuation-mode="valuationMode"
      :access="access"
      :total-players="totalPlayers"
      :season="activeLeague?.season ?? (isDemoLeague ? '2026' : undefined)"
      :league-last-updated="activeLeague?.lastUpdated"
      @build-trade="openPlayerInTradeBuilder"
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
      v-if="
        !loading &&
        access === 'preview' &&
        visiblePlayerCount > 0 &&
        totalPlayers > visiblePlayerCount
      "
      class="p-5 mt-4 border rounded-lg bg-muted/20 sm:p-6"
    >
      <div
        class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="font-semibold">
            Your preview shows {{ visiblePlayerCount }} of
            {{ totalPlayers }} player values
          </p>
          <p class="max-w-lg mt-1 text-sm leading-6 text-muted-foreground">
            Unlock every rostered player, filter the complete league, and carry
            any player into Trade Lab. Premium also includes Trade Finder
            access.
          </p>
        </div>
        <router-link
          :to="{
            path: '/account',
            query: {
              ...$route.query,
              intent: 'player_values',
              upgrade_source: 'player_values_preview',
            },
          }"
          class="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground shrink-0"
          @click="trackPreviewUpgradeClick"
        >
          Unlock all {{ totalPlayers }} player values
        </router-link>
      </div>
    </div>
  </Card>
</template>
