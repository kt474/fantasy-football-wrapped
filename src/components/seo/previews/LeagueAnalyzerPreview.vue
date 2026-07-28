<script setup lang="ts">
import { computed } from "vue";
import {
  ChartNoAxesCombined,
  FolderClock,
  Newspaper,
  TicketPercent,
  Trophy,
} from "@lucide/vue";

import LeagueInputForm from "@/components/shared/LeagueInputForm.vue";
import { useLeagueInput, type LeaguePlatform } from "@/composables/useLeagueInput";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";

const props = defineProps<{
  platform: LeaguePlatform;
}>();

const platform = computed(() => props.platform);
const {
  inputType,
  seasonYear,
  leagueIdInput,
  espnPrivate,
  espnSwid,
  espnS2,
  onSubmit,
} = useLeagueInput(platform);

const platformName = computed(() =>
  props.platform === "espn" ? "ESPN" : "Sleeper"
);
const platformLogo = computed(() =>
  props.platform === "espn" ? "/espnlogo.webp" : "/sleeperlogo.webp"
);

const navigation = [
  { label: "Standings", icon: Trophy },
  { label: "Power Rankings", icon: ChartNoAxesCombined, active: true },
  { label: "Playoffs", icon: TicketPercent },
  { label: "Weekly Report", icon: Newspaper },
  { label: "League History", icon: FolderClock },
];

const rankings = [
  { rank: 1, avatar: 6, team: "Saquondo", record: "9-5", score: 82.4, trend: "↑2" },
  { rank: 2, avatar: 8, team: "Ja’Marr the Merrier", record: "8-6", score: 79.1, trend: "↓1" },
  { rank: 3, avatar: 5, team: "Breece's Puffs", record: "8-6", score: 76.8, trend: "↑1" },
];
</script>

<template>
  <ProductPreviewFrame
    title="League workspace"
    :eyebrow="`${platformName} · 2026 redraft`"
    status="Product preview"
  >
    <section class="p-4 border-b sm:p-5">
      <div class="flex items-center gap-3 mb-4">
        <div
          class="flex items-center justify-center border rounded-lg size-10 bg-background"
        >
          <img
            :src="platformLogo"
            :alt="`${platformName} logo`"
            class="object-contain size-5"
          />
        </div>
        <div>
          <p class="text-sm font-semibold">Connect a {{ platformName }} league</p>
          <p class="text-xs text-muted-foreground">
            {{
              platform === "espn"
                ? "Public and private league imports"
                : "League ID or username"
            }}
          </p>
        </div>
      </div>

      <LeagueInputForm
        v-model:input-type="inputType"
        v-model:season-year="seasonYear"
        v-model:league-id-input="leagueIdInput"
        v-model:espn-private="espnPrivate"
        v-model:espn-swid="espnSwid"
        v-model:espn-s2="espnS2"
        :platform="platform"
        @submit="onSubmit"
      />
    </section>

    <div class="grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
      <nav
        class="flex gap-1 p-2 overflow-x-auto border-b bg-muted/15 sm:block sm:border-b-0 sm:border-r"
        aria-label="Sample league features"
      >
        <div
          v-for="item in navigation"
          :key="item.label"
          class="flex items-center gap-2 px-2.5 py-2 text-[0.68rem] rounded-md whitespace-nowrap"
          :class="
            item.active
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground'
          "
        >
          <component :is="item.icon" :size="13" />
          {{ item.label }}
        </div>
      </nav>

      <section class="min-w-0 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">Power Rankings</p>
            <p class="mt-0.5 text-[0.65rem] text-muted-foreground">
              Scoring, consistency, and record through Week 8
            </p>
          </div>
          <span
            class="px-2 py-1 text-[0.62rem] border rounded-md text-muted-foreground"
          >
            Week 8
          </span>
        </div>

        <div class="mt-3 overflow-hidden border rounded-lg">
          <div
            class="grid grid-cols-[1.7rem_minmax(0,1fr)_3rem] gap-2 px-3 py-2 text-[0.58rem] font-medium tracking-wide uppercase border-b bg-muted/20 text-muted-foreground"
          >
            <span>#</span><span>Team</span><span class="text-right">Score</span>
          </div>
          <div
            v-for="team in rankings"
            :key="team.team"
            class="grid grid-cols-[1.7rem_minmax(0,1fr)_3rem] items-center gap-2 px-3 py-2 border-b last:border-b-0"
          >
            <span class="text-xs font-bold">{{ team.rank }}</span>
            <div class="flex items-center min-w-0 gap-2">
              <img
                :src="`/avatars/avatar${team.avatar}.svg`"
                alt=""
                class="border rounded-full size-7 bg-muted"
              />
              <div class="min-w-0">
                <p class="text-[0.68rem] font-medium truncate">
                  {{ team.team }}
                </p>
                <p class="text-[0.59rem] text-muted-foreground">
                  {{ team.record }}
                  <span
                    class="ml-1"
                    :class="
                      team.trend.startsWith('↑')
                        ? 'text-success'
                        : 'text-destructive'
                    "
                  >
                    {{ team.trend }}
                  </span>
                </p>
              </div>
            </div>
            <span class="text-xs font-semibold text-right tabular-nums">
              {{ team.score.toFixed(1) }}
            </span>
          </div>
        </div>

        <div
          class="flex items-center justify-between gap-3 px-3 py-2.5 mt-3 border rounded-lg bg-muted/15"
        >
          <div>
            <p class="text-[0.62rem] text-muted-foreground">Playoff forecast</p>
            <p class="mt-0.5 text-xs font-medium">Breece's Puffs · 78%</p>
          </div>
          <p class="text-[0.62rem] text-right text-success">
            +14 pts this week
          </p>
        </div>
      </section>
    </div>
  </ProductPreviewFrame>
</template>
