<script setup lang="ts">
import { computed } from "vue";

interface ShareTeam {
  name: string;
  points: number;
  avatar: string;
}

interface SharePlayer {
  name: string;
  user: string;
  points: number;
  position: string;
  player_id: string;
}

interface PremiumFrontPage {
  headline: string;
  subheadline: string;
  lead: string;
}

const props = defineProps<{
  leagueName?: string;
  week: number;
  topTeams: ShareTeam[];
  hotPlayers: SharePlayer[];
  coldPlayers: SharePlayer[];
  benchPlayers: SharePlayer[];
  summary: string;
  tier?: string;
  premiumFrontPage?: PremiumFrontPage;
}>();

const formatPoints = (points: number) =>
  Number.isFinite(points) ? points.toFixed(2) : "0.00";

const stripMarkdown = (value: string) =>
  value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/[#*_`>[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const cleanSummary = computed(() => stripMarkdown(props.summary || ""));
const cleanPremiumFrontPage = computed(() => ({
  headline: stripMarkdown(props.premiumFrontPage?.headline || ""),
  subheadline: stripMarkdown(props.premiumFrontPage?.subheadline || ""),
  lead: stripMarkdown(props.premiumFrontPage?.lead || ""),
}));
const isPremiumCard = computed(
  () => props.tier === "Premium" && Boolean(cleanPremiumFrontPage.value.lead)
);

const topTeam = computed(() => props.topTeams[0]);
const topPlayer = computed(() => props.hotPlayers[0]);
const benchPain = computed(() => props.benchPlayers[0]);
const coldPlayer = computed(() => props.coldPlayers[0]);

const reportExcerpt = computed(() => {
  if (isPremiumCard.value) {
    return cleanPremiumFrontPage.value.lead;
  }

  if (!cleanSummary.value) {
    return "Generate your weekly fantasy football report to get the full league story, matchup notes, and manager-by-manager takeaways.";
  }

  const sentences =
    cleanSummary.value
      .match(/[^.!?]+[.!?]+/g)
      ?.map((sentence) => sentence.trim()) ?? [];
  const preview = sentences.length
    ? sentences.slice(0, 5).join(" ")
    : cleanSummary.value;

  return preview;
});

const topTeamsForCard = computed(() => props.topTeams.slice(0, 3));
const highestScoringPlayers = computed(() => props.hotPlayers.slice(0, 2));
const lowestScoringPlayers = computed(() => props.coldPlayers.slice(0, 2));
const topBenchwarmers = computed(() => props.benchPlayers.slice(0, 3));

const moments = computed(() =>
  [
    topTeam.value
      ? {
          label: "Top Team",
          title: topTeam.value.name,
          detail: `${formatPoints(topTeam.value.points)} points`,
        }
      : null,
    topPlayer.value
      ? {
          label: "Top Performer",
          title: topPlayer.value.name,
          detail: `${formatPoints(topPlayer.value.points)} for ${topPlayer.value.user}`,
        }
      : null,
    benchPain.value
      ? {
          label: "Bench Pain",
          title: benchPain.value.name,
          detail: `${formatPoints(benchPain.value.points)} left by ${benchPain.value.user}`,
        }
      : coldPlayer.value
        ? {
            label: "Rough Start",
            title: coldPlayer.value.name,
            detail: `${formatPoints(coldPlayer.value.points)} for ${coldPlayer.value.user}`,
          }
        : null,
  ].filter(
    (moment): moment is { label: string; title: string; detail: string } =>
      Boolean(moment)
  )
);
</script>

<template>
  <div
    class="relative box-border flex h-[1350px] w-[1080px] flex-col overflow-hidden bg-background p-12 pb-32 text-foreground"
  >
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img
          height="36"
          width="36"
          src="../../assets/logo.webp"
          class="-mx-1"
          alt="ffwrapped logo"
        />
        <span class="text-2xl font-semibold">
          <span class="text-primary">ff</span>wrapped
        </span>
      </div>
      <p
        class="px-4 py-2 text-base font-medium border rounded-full border-border bg-card text-muted-foreground"
      >
        Week {{ props.week }}
      </p>
    </header>

    <section class="p-8 mt-8 border rounded-3xl border-border bg-card">
      <p
        :class="
          isPremiumCard
            ? 'text-xl font-medium text-muted-foreground'
            : 'text-3xl font-semibold'
        "
      >
        {{ props.leagueName || "Your League" }}
      </p>

      <template v-if="isPremiumCard">
        <h1 class="mt-3 line-clamp-2 max-w-[900px] text-3xl font-semibold">
          {{ cleanPremiumFrontPage.headline }}
        </h1>
        <p
          v-if="cleanPremiumFrontPage.subheadline"
          class="mt-3 line-clamp-1 max-w-[900px] text-lg text-muted-foreground"
        >
          {{ cleanPremiumFrontPage.subheadline }}
        </p>
      </template>

      <p class="mt-5 line-clamp-5 max-w-[900px] text-xl leading-7">
        {{ reportExcerpt }}
      </p>
    </section>

    <section class="grid grid-cols-3 gap-4 mt-4">
      <div
        v-for="moment in moments"
        :key="moment.label"
        class="min-h-[160px] rounded-2xl border border-border bg-card p-5"
      >
        <p
          class="text-xs font-semibold uppercase text-muted-foreground"
        >
          {{ moment.label }}
        </p>
        <h2 class="mt-4 text-2xl font-semibold line-clamp-2">
          {{ moment.title }}
        </h2>
        <p class="mt-2 text-lg leading-7 text-muted-foreground">
          {{ moment.detail }}
        </p>
      </div>
    </section>

    <section
      v-if="highestScoringPlayers.length > 0 || lowestScoringPlayers.length > 0"
      class="grid h-[230px] grid-cols-2 gap-4 mt-4"
    >
      <div
        v-if="highestScoringPlayers.length > 0"
        class="p-5 border rounded-2xl border-border bg-card"
      >
        <h3 class="text-xl font-semibold">Highest scoring players</h3>
        <div class="mt-3 space-y-2">
          <div
            v-for="(player, index) in highestScoringPlayers"
            :key="`high-${player.name}-${index}`"
            class="flex items-center justify-between gap-4 rounded-xl bg-muted/35 p-2.5"
          >
            <div class="min-w-0">
              <p class="text-lg font-semibold truncate">{{ player.name }}</p>
              <p class="text-sm truncate text-muted-foreground">
                {{ player.user }}
              </p>
            </div>
            <p class="text-2xl font-semibold tabular-nums shrink-0">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="lowestScoringPlayers.length > 0"
        class="p-5 border rounded-2xl border-border bg-card"
      >
        <h3 class="text-xl font-semibold">Lowest scoring players</h3>
        <div class="mt-3 space-y-2">
          <div
            v-for="(player, index) in lowestScoringPlayers"
            :key="`low-${player.name}-${index}`"
            class="flex items-center justify-between gap-4 rounded-xl bg-muted/35 p-2.5"
          >
            <div class="min-w-0">
              <p class="text-lg font-semibold truncate">{{ player.name }}</p>
              <p class="text-sm truncate text-muted-foreground">
                {{ player.user }}
              </p>
            </div>
            <p class="text-2xl font-semibold tabular-nums shrink-0">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-4 grid h-[325px] grid-cols-[1.1fr_0.9fr] gap-4">
      <div class="p-5 border rounded-2xl border-border bg-card">
        <h3 class="text-2xl font-semibold">Top scores</h3>
        <div v-if="topTeamsForCard.length > 0" class="mt-4 space-y-2.5">
          <div
            v-for="(team, index) in topTeamsForCard"
            :key="`${team.name}-${index}`"
            class="flex items-center justify-between gap-5 p-3 rounded-xl bg-muted/35"
          >
            <div class="flex items-center min-w-0 gap-4">
              <img
                v-if="team.avatar"
                alt="User avatar"
                class="rounded-full size-12"
                :src="team.avatar"
              />
              <svg
                v-else
                class="size-12 shrink-0 text-muted-foreground"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="text-xl font-semibold truncate">{{
                team.name
              }}</span>
            </div>
            <span class="text-2xl font-semibold shrink-0 tabular-nums">
              {{ team.points ? formatPoints(team.points) : "" }}
            </span>
          </div>
        </div>
        <p v-else class="mt-6 text-xl text-muted-foreground">
          No team data available.
        </p>
      </div>

      <div class="p-5 overflow-hidden border rounded-2xl border-border bg-card">
        <h3 class="text-2xl font-semibold">Top benchwarmers</h3>
        <div v-if="topBenchwarmers.length > 0" class="mt-4 space-y-2.5">
          <div
            v-for="(player, index) in topBenchwarmers"
            :key="`bench-${player.name}-${index}`"
            class="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/35"
          >
            <div class="flex items-center min-w-0 gap-3">
              <div class="min-w-0">
                <p class="text-lg font-semibold truncate">
                  {{ player.name }}
                </p>
                <p class="text-sm truncate text-muted-foreground">
                  Left by {{ player.user }}
                </p>
              </div>
            </div>
            <p class="text-2xl font-semibold tabular-nums shrink-0">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
        <p v-else class="mt-6 text-xl text-muted-foreground">
          No bench data available.
        </p>
      </div>
    </section>

    <footer
      class="absolute flex items-center justify-between py-5 border bottom-10 left-12 right-12 rounded-2xl border-border bg-card px-7"
    >
      <p class="text-2xl font-semibold">
        View the full report at ffwrapped.com
      </p>
      <p class="text-lg font-medium text-muted-foreground">
        {{ props.tier || "Weekly" }} weekly report
      </p>
    </footer>
  </div>
</template>
