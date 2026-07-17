<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Card from "../ui/card/Card.vue";
import { generateManagerArchetype, type ManagerBlurbsPayload } from "@/api/api";
import type { ManagerArchetype } from "@/lib/narratives";
import { toast } from "vue-sonner";
import { getLeagueKey, useStore } from "@/store/store";
import Separator from "../ui/separator/Separator.vue";
import { useSubscriptionStore } from "@/store/subscription.ts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fakeProfileText } from "@/api/fakeLeague";
import {
  getLeagueAnalyticsProperties,
  trackEvent,
  trackPremiumFunnelEvent,
} from "@/lib/analytics";

const store = useStore();
const subscriptionStore = useSubscriptionStore();

const props = defineProps<{
  archetypes: ManagerArchetype[];
  payload: ManagerBlurbsPayload;
  preparePayload?: () => Promise<ManagerBlurbsPayload>;
}>();

const isLoading = ref(false);
const blurbsByUserId = ref<Record<string, string>>({});
const showAllProfiles = ref(false);
const failedAvatarIds = ref(new Set<string>());

const hasAvatar = (archetype: ManagerArchetype) =>
  Boolean(archetype.avatarImg) && !failedAvatarIds.value.has(archetype.userId);

const handleAvatarError = (userId: string) => {
  failedAvatarIds.value = new Set(failedAvatarIds.value).add(userId);
};

const getManagerArchetypes = async () => {
  if (!props.payload.managers.length) {
    return;
  }

  try {
    isLoading.value = true;
    const payload = props.preparePayload
      ? await props.preparePayload()
      : props.payload;
    const result = await generateManagerArchetype(payload);
    blurbsByUserId.value = result.blurbs.reduce(
      (accumulator, entry) => {
        accumulator[entry.userId] = entry.blurb;
        return accumulator;
      },
      {} as Record<string, string>
    );
    store.addManagerProfiles(
      getLeagueKey(store.currentLeague),
      blurbsByUserId.value
    );
    trackEvent("Feature Action Completed", {
      feature: "manager_profiles",
      action: "profiles_generated",
      profile_count: Object.keys(blurbsByUserId.value).length,
      ...getLeagueAnalyticsProperties(
        store.currentLeague
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate manager blurbs.";
    toast.error(message);
    trackEvent("Feature Action Failed", {
      feature: "manager_profiles",
      action: "profiles_generated",
      error_code: "generation_failed",
      recoverable: true,
      ...getLeagueAnalyticsProperties(
        store.currentLeague
      ),
    });
  } finally {
    isLoading.value = false;
  }
};

const storedManagerProfiles = computed(
  () => store.currentLeague?.managerProfiles ?? {}
);

const canGenerateArchetypes = computed(
  () =>
    props.payload.managers.length > 0 &&
    !isLoading.value &&
    (Object.keys(blurbsByUserId.value).length === 0 ||
      subscriptionStore.isPremium)
);

const generateButtonLabel = computed(() => {
  if (isLoading.value) return "Generating...";
  return "Generate profiles";
});

const visibleArchetypes = computed(() =>
  showAllProfiles.value ? props.archetypes : props.archetypes.slice(0, 6)
);

const hasHiddenProfiles = computed(() => props.archetypes.length > 6);

const toggleProfiles = () => {
  showAllProfiles.value = !showAllProfiles.value;
};

type RankedMetric =
  | "winRate"
  | "averageEfficiency"
  | "averagePointsPerSeason"
  | "totalTrades"
  | "totalWaivers"
  | "tradeValueGained"
  | "weeklyScoreStdDev"
  | "averageDraftPickRank";

type ManagerBadge = {
  label: string;
  title: string;
};

const rankMaps = computed(() => {
  const buildRankMap = (
    metric: RankedMetric,
    direction: "asc" | "desc" = "desc"
  ) => {
    const managers = props.archetypes.filter(
      (manager) => manager[metric] !== null
    );
    const sorted = [...managers].sort((left, right) => {
      const leftValue = left[metric] as number;
      const rightValue = right[metric] as number;
      return direction === "desc"
        ? rightValue - leftValue
        : leftValue - rightValue;
    });
    const ranks: Record<string, number> = {};

    sorted.forEach((manager, index) => {
      const previous = sorted[index - 1];
      ranks[manager.userId] =
        previous && previous[metric] === manager[metric]
          ? ranks[previous.userId]
          : index + 1;
    });

    return ranks;
  };

  return {
    winRate: buildRankMap("winRate"),
    lowestWinRate: buildRankMap("winRate", "asc"),
    efficiency: buildRankMap("averageEfficiency"),
    lowestEfficiency: buildRankMap("averageEfficiency", "asc"),
    scoring: buildRankMap("averagePointsPerSeason"),
    lowestScoring: buildRankMap("averagePointsPerSeason", "asc"),
    trades: buildRankMap("totalTrades"),
    waivers: buildRankMap("totalWaivers"),
    tradeValue: buildRankMap("tradeValueGained"),
    lowestTradeValue: buildRankMap("tradeValueGained", "asc"),
    volatility: buildRankMap("weeklyScoreStdDev"),
    consistency: buildRankMap("weeklyScoreStdDev", "asc"),
    draft: buildRankMap("averageDraftPickRank"),
    lowestDraft: buildRankMap("averageDraftPickRank", "asc"),
  };
});

const playoffRate = (manager: ManagerArchetype) =>
  manager.seasons ? manager.playoffAppearances / manager.seasons : 0;

const titleConversion = (manager: ManagerArchetype) =>
  manager.playoffAppearances ? manager.titles / manager.playoffAppearances : 0;

const pointsDifferentialPerSeason = (manager: ManagerArchetype) =>
  manager.seasons
    ? (manager.totalPointsFor - manager.totalPointsAgainst) / manager.seasons
    : 0;

const academicGrade = (score: number) => {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
};

const tradeGrade = (manager: ManagerArchetype) => {
  if (!manager.totalTrades) return null;

  // A neutral trade-value delta anchors at a B (85). Each net value point per
  // trade moves the standardized score by 1.25 points in either direction.
  // This keeps an average trader respectable without making elite grades easy.
  const valuePerTrade = manager.tradeValueGained / manager.totalTrades;
  const standardizedScore = Math.max(
    0,
    Math.min(100, 85 + valuePerTrade * 1.25)
  );
  return academicGrade(standardizedScore);
};

const draftGrade = (manager: ManagerArchetype) => {
  const score = manager.averageDraftPickRank;
  if (score === null) return null;

  // Draft pick performance is a delta centered near zero, not a 0–100 score.
  // These fixed bands refine the thresholds already used by the Draft page.
  if (score >= 2.5) return "A+";
  if (score >= 2.1) return "A";
  if (score >= 1.75) return "A-";
  if (score >= 1.4) return "B+";
  if (score >= 1.1) return "B";
  if (score >= 0.75) return "B-";
  if (score >= 0.5) return "C+";
  if (score >= 0.25) return "C";
  if (score >= 0) return "C-";
  if (score >= -0.6) return "D+";
  if (score >= -1.2) return "D";
  if (score >= -1.75) return "D-";
  return "F";
};

const gradeIs = (grade: string | null, prefixes: string[]) =>
  grade !== null && prefixes.some((prefix) => grade.startsWith(prefix));

const getManagerBadges = (manager: ManagerArchetype): ManagerBadge[] => {
  const badges: ManagerBadge[] = [];
  const managerCount = props.archetypes.length;
  const add = (label: string, title: string) => {
    if (badges.length < 2 && !badges.some((badge) => badge.label === label)) {
      badges.push({ label, title });
    }
  };

  if (
    manager.titles >= 2 ||
    (manager.titles > 0 && titleConversion(manager) >= 0.5)
  ) {
    add("Final Boss Energy", "Turns playoff trips into championships");
  }
  if (manager.seasons >= 2 && playoffRate(manager) >= 0.7) {
    add("Always in the Hunt", "Makes the playoffs in at least 70% of seasons");
  }
  if (
    manager.titles === 0 &&
    manager.winRate >= 0.55 &&
    manager.playoffAppearances > 0
  ) {
    add(
      "Regular Season Royalty",
      "Wins often, but is still chasing the championship that matters"
    );
  }
  if (
    rankMaps.value.tradeValue[manager.userId] === 1 &&
    manager.tradeValueGained > 0
  ) {
    add("Certified Trade Thief", "Leads the league in net trade value gained");
  }
  if (
    rankMaps.value.efficiency[manager.userId] === 1 &&
    manager.averageEfficiency > 0
  ) {
    add("Lineup Whisperer", "Owns the league's best average lineup efficiency");
  }
  if (
    rankMaps.value.draft[manager.userId] === 1 &&
    manager.averageDraftPickRank !== null
  ) {
    add("Draft Room Menace", "Ranks first in average draft performance");
  }
  if (
    managerCount >= 3 &&
    (rankMaps.value.trades[manager.userId] === 1 ||
      rankMaps.value.waivers[manager.userId] === 1)
  ) {
    add("Roster Never Sleeps", "Leads the league in trades or waiver moves");
  }
  if (pointsDifferentialPerSeason(manager) > 0 && manager.winRate < 0.5) {
    add(
      "Schedule’s Favorite Victim",
      "Scores more than opponents but owns a losing record"
    );
  }
  if (pointsDifferentialPerSeason(manager) < 0 && manager.winRate >= 0.5) {
    add("Luck Merchant", "Wins despite being outscored overall");
  }

  const managerTradeGrade = tradeGrade(manager);
  const managerDraftGrade = draftGrade(manager);

  if (gradeIs(managerTradeGrade, ["A"])) {
    add("Deal Maker", "Owns an A-range standardized trade value grade");
  }
  if (gradeIs(managerTradeGrade, ["D", "F"])) {
    add("Trade Regret Collector", "Owns a D- or F-range standardized trade value grade");
  }
  if (gradeIs(managerDraftGrade, ["A"])) {
    add("Draft Day Dealer", "Owns an A-range standardized draft ability grade");
  }
  if (gradeIs(managerDraftGrade, ["D", "F"])) {
    add("Autodraft Advocate", "Owns a D- or F-range standardized draft ability grade");
  }
  if (Math.abs(manager.winRate - 0.5) <= 0.03) {
    add("Coin Flip Commander", "Has a career win rate within three points of .500");
  }
  if (
    manager.seasons >= 3 &&
    manager.playoffAppearances === 1 &&
    manager.titles === 0
  ) {
    add("Playoff Cameo", "Has made one playoff appearance without a title");
  }

  if (
    manager.seasons >= 2 &&
    rankMaps.value.lowestWinRate[manager.userId] === 1
  ) {
    add("Rebuilding Since Forever", "Owns the league's lowest career win rate");
  }
  if (manager.seasons >= 2 && manager.playoffAppearances === 0) {
    add("Playoff Allergy", "Has yet to make the playoffs");
  }
  if (
    managerCount >= 3 &&
    rankMaps.value.lowestEfficiency[manager.userId] === 1
  ) {
    add(
      "Bench Points Champion",
      "Owns the league's lowest average lineup efficiency"
    );
  }
  if (
    manager.totalTrades > 0 &&
    manager.tradeValueGained < 0 &&
    rankMaps.value.lowestTradeValue[manager.userId] === 1
  ) {
    add("Trade Donation Center", "Has given away the most net value in trades");
  }
  if (
    manager.averageDraftPickRank !== null &&
    manager.averageDraftPickRank < 0 &&
    rankMaps.value.lowestDraft[manager.userId] === 1
  ) {
    add(
      "Draft Day Panic",
      "Owns the league's lowest average draft performance"
    );
  }
  if (managerCount >= 3 && rankMaps.value.lowestScoring[manager.userId] === 1) {
    add("Scoreboard Optional", "Ranks last in average points per season");
  }
  if (!badges.length) {
    if (manager.seasons <= 1) {
      add("Small Sample Superstar", "Still building a long-term league resume");
    } else if (manager.winRate >= 0.5) {
      add("Quietly Getting It Done", "Owns a winning or even career record");
    } else {
      add(
        "Trust the Process",
        "The long-term results are still a work in progress"
      );
    }
  }

  return badges;
};

watch(
  storedManagerProfiles,
  (profiles) => {
    if (Object.keys(profiles).length > 0) {
      blurbsByUserId.value = profiles;
      return;
    }
    blurbsByUserId.value = {};
  },
  { immediate: true }
);
</script>

<template>
  <Card class="p-4 md:p-6">
    <div>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <p class="text-2xl font-semibold tracking-tight">Manager Profiles</p>
        <Button
          :disabled="!canGenerateArchetypes"
          @click="getManagerArchetypes"
        >
          {{ generateButtonLabel }}
        </Button>
      </div>
      <p class="mt-4 text-sm sm:max-w-2xl text-muted-foreground sm:text-base">
        Long-term records, trends, and custom profiles that capture each
        manager’s tendencies, strengths, and overall identity.
      </p>
    </div>
    <div class="grid gap-4 mt-4 sm:grid-cols-2 md:grid-cols-3">
      <div
        v-for="archetype in visibleArchetypes"
        :key="archetype.userId"
        class="p-4 border rounded-lg"
      >
        <div class="flex items-center gap-3">
          <img
            v-if="hasAvatar(archetype)"
            :src="archetype.avatarImg"
            :alt="`${archetype.displayName} avatar`"
            @error="handleAvatarError(archetype.userId)"
            class="w-10 h-10 rounded-full"
          />
          <svg
            v-else
            class="w-10 h-10 shrink-0"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="-0.5 -0.5 21 21"
          >
            <path
              d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
            />
          </svg>
          <div>
            <p class="font-semibold">{{ archetype.displayName }}</p>
            <p class="text-sm text-muted-foreground">
              {{ archetype.seasons }} seasons
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-3">
          <Badge
            v-for="badge in getManagerBadges(archetype)"
            :key="badge.label"
            variant="secondary"
            :title="badge.title"
            class="font-medium"
          >
            {{ badge.label }}
          </Badge>
        </div>
        <Separator class="mt-2" />
        <p
          v-if="blurbsByUserId[archetype.userId]"
          class="mt-2 text-sm leading-relaxed"
        >
          {{ blurbsByUserId[archetype.userId] }}
        </p>
        <div
          v-if="
            !subscriptionStore.isPremium && blurbsByUserId[archetype.userId]
          "
          class="flex justify-center mt-3"
        >
          <Button size="sm" as-child>
            <router-link
              :to="{
                path: '/account',
                query: {
                  ...$route.query,
                  intent: 'manager_profiles',
                  upgrade_source: 'manager_profiles',
                },
              }"
              @click="
                trackPremiumFunnelEvent('premium_cta_clicked', {
                  cta: 'unlock_all_manager_profiles',
                  feature: 'manager_profiles',
                  source: 'manager_profiles',
                });
                store.currentTab = '';
              "
            >
              Unlock All Manager Profiles
            </router-link>
          </Button>
        </div>
        <p
          class="my-4 text-sm leading-relaxed text-muted-foreground"
          v-else-if="isLoading"
        >
          Loading manager description...
        </p>
        <p
          v-else-if="store.leagueInfo.length === 0"
          class="mt-2 text-sm leading-relaxed"
        >
          {{ fakeProfileText }}
        </p>
        <div class="grid grid-cols-2 gap-3 mt-4 text-sm text-muted-foreground">
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Win Rate</p>
            <p class="mt-1 font-medium text-foreground">
              {{ (archetype.winRate * 100).toFixed(1) }}%
              <span class="ml-1 text-xs text-muted-foreground">
                #{{ rankMaps.winRate[archetype.userId] }}
              </span>
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Playoffs</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.playoffAppearances }}
              <span class="ml-1 text-xs text-muted-foreground">
                {{ (playoffRate(archetype) * 100).toFixed(0) }}%
              </span>
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Titles</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.titles }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Avg Efficiency</p>
            <p class="mt-1 font-medium text-foreground">
              {{ (archetype.averageEfficiency * 100).toFixed(1) }}%
              <span class="ml-1 text-xs text-muted-foreground">
                #{{ rankMaps.efficiency[archetype.userId] }}
              </span>
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Record</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalWins }}-{{ archetype.totalLosses
              }}<span v-if="archetype.totalTies"
                >-{{ archetype.totalTies }}</span
              >
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Points For</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalPointsFor.toFixed(1) }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Points Against</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.totalPointsAgainst.toFixed(1) }}
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Points / Season</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.averagePointsPerSeason.toFixed(1) }}
              <span class="text-xs text-muted-foreground"
                >#{{ rankMaps.scoring[archetype.userId] }}</span
              >
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Trades / Season</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.averageTradesPerSeason.toFixed(1) }}
              <span class="text-xs text-muted-foreground"
                >({{ archetype.totalTrades }} total)</span
              >
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Waivers / Season</p>
            <p class="mt-1 font-medium text-foreground">
              {{ archetype.averageWaiversPerSeason.toFixed(1) }}
              <span class="text-xs text-muted-foreground"
                >({{ archetype.totalWaivers }} total)</span
              >
            </p>
          </div>
          <div class="px-3 py-2 rounded-md bg-secondary">
            <p class="text-xs uppercase">Trade Value</p>
            <p class="mt-1 font-medium text-foreground">
              <template v-if="tradeGrade(archetype)"
                >{{ tradeGrade(archetype) }}
                <span class="text-xs text-muted-foreground"
                  >#{{ rankMaps.tradeValue[archetype.userId] }}</span
                ></template
              >
              <span v-else class="text-muted-foreground">No grade</span>
            </p>
          </div>
          <div
            v-if="archetype.averageDraftPickRank !== null"
            class="px-3 py-2 rounded-md bg-secondary"
          >
            <p class="text-xs uppercase">Draft Ability</p>
            <p class="mt-1 font-medium text-foreground">
              {{ draftGrade(archetype) }}
              <span class="text-xs text-muted-foreground"
                >#{{ rankMaps.draft[archetype.userId] }}</span
              >
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="hasHiddenProfiles" class="flex justify-center mt-4">
      <Button
        @click="toggleProfiles"
        aria-label="Button to show all manager profiles"
        class="flex"
      >
        <svg
          v-if="showAllProfiles"
          class="w-5 h-5 mr-1.5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m5 15 7-7 7 7"
          />
        </svg>
        <svg
          v-else
          class="w-5 h-5 mr-1.5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m19 9-7 7-7-7"
          />
        </svg>
        {{
          showAllProfiles
            ? "Show Fewer Profiles"
            : `Show All Profiles (${props.archetypes.length})`
        }}
      </Button>
    </div>
  </Card>
</template>
