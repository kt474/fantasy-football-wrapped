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

const excerptAtNaturalBoundary = (value: string, maxCharacters: number) => {
  if (value.length <= maxCharacters) {
    return value;
  }

  const sentences = value.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
  let excerpt = "";

  for (const sentence of sentences) {
    const candidate = `${excerpt} ${sentence.trim()}`.trim();
    if (candidate.length > maxCharacters) {
      break;
    }
    excerpt = candidate;
  }

  // Very long opening sentences still need a clean, word-safe fallback.
  if (!excerpt) {
    const candidate = value.slice(0, maxCharacters + 1);
    const lastWordBoundary = candidate.lastIndexOf(" ");
    excerpt = candidate.slice(
      0,
      lastWordBoundary > maxCharacters * 0.65
        ? lastWordBoundary
        : maxCharacters
    );
  }

  return `${excerpt.trim()} …`;
};

const topTeam = computed(() => props.topTeams[0]);
const topPlayer = computed(() => props.hotPlayers[0]);
const benchPain = computed(() => props.benchPlayers[0]);
const coldPlayer = computed(() => props.coldPlayers[0]);

const reportExcerpt = computed(() => {
  if (isPremiumCard.value) {
    return excerptAtNaturalBoundary(cleanPremiumFrontPage.value.lead, 360);
  }

  if (!cleanSummary.value) {
    return "Generate your weekly fantasy football report to get the full league story, matchup notes, and manager-by-manager takeaways.";
  }

  return excerptAtNaturalBoundary(cleanSummary.value, 430);
});

const topTeamsForCard = computed(() => props.topTeams.slice(0, 3));
const highestScoringPlayers = computed(() => props.hotPlayers.slice(0, 3));
const lowestScoringPlayers = computed(() => props.coldPlayers.slice(0, 3));
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
    class="relative box-border flex h-[1350px] w-[1080px] flex-col overflow-hidden bg-[#f8fafc] p-12 pb-32 text-slate-950"
  >
    <header class="relative z-10 flex items-center justify-between">
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
        class="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600"
      >
        Week {{ props.week }}
      </p>
    </header>

    <section
      class="relative z-10 mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white p-8"
    >
      <p
        :class="
          isPremiumCard
            ? 'text-sm font-semibold uppercase tracking-[0.16em] text-primary'
            : 'text-3xl font-semibold tracking-tight'
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
          class="mt-3 line-clamp-1 max-w-[900px] text-lg text-slate-500"
        >
          {{ cleanPremiumFrontPage.subheadline }}
        </p>
      </template>

      <p class="relative mt-5 max-w-[880px] text-xl leading-8 text-slate-600">
        {{ reportExcerpt }}
      </p>
    </section>

    <section class="relative z-10 mt-5 grid grid-cols-3 gap-4">
      <div
        v-for="moment in moments"
        :key="moment.label"
        class="relative min-h-[155px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div class="absolute inset-x-0 top-0 h-1 bg-primary"></div>
        <p
          class="text-xs font-bold uppercase tracking-[0.16em] text-primary"
        >
          {{ moment.label }}
        </p>
        <h2 class="mt-4 text-2xl font-semibold line-clamp-2">
          {{ moment.title }}
        </h2>
        <p class="mt-2 text-base leading-6 text-slate-500">
          {{ moment.detail }}
        </p>
      </div>
    </section>

    <section
      v-if="highestScoringPlayers.length > 0 || lowestScoringPlayers.length > 0"
      class="relative z-10 mt-5 grid h-[285px] grid-cols-2 gap-4"
    >
      <div
        v-if="highestScoringPlayers.length > 0"
        class="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-primary">
          Highest scoring players
        </h3>
        <div class="mt-3 space-y-2">
          <div
            v-for="(player, index) in highestScoringPlayers"
            :key="`high-${player.name}-${index}`"
            class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-2.5"
          >
            <div class="min-w-0">
              <p class="text-lg font-semibold truncate">{{ player.name }}</p>
              <p class="text-sm truncate text-slate-500">
                {{ player.user }}
              </p>
            </div>
            <p class="shrink-0 text-2xl font-bold tabular-nums text-slate-900">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="lowestScoringPlayers.length > 0"
        class="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-primary">
          Lowest scoring players
        </h3>
        <div class="mt-3 space-y-2">
          <div
            v-for="(player, index) in lowestScoringPlayers"
            :key="`low-${player.name}-${index}`"
            class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-2.5"
          >
            <div class="min-w-0">
              <p class="text-lg font-semibold truncate">{{ player.name }}</p>
              <p class="text-sm truncate text-slate-500">
                {{ player.user }}
              </p>
            </div>
            <p class="shrink-0 text-2xl font-bold tabular-nums text-slate-900">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="relative z-10 mt-5 grid h-[315px] grid-cols-[1.1fr_0.9fr] gap-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-primary">
          Top scores
        </h3>
        <div v-if="topTeamsForCard.length > 0" class="mt-4 space-y-2.5">
          <div
            v-for="(team, index) in topTeamsForCard"
            :key="`${team.name}-${index}`"
            class="flex items-center justify-between gap-5 rounded-xl bg-slate-50 p-3"
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
            <span class="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-xl font-bold tabular-nums text-primary">
              {{ team.points ? formatPoints(team.points) : "" }}
            </span>
          </div>
        </div>
        <p v-else class="mt-6 text-xl text-muted-foreground">
          No team data available.
        </p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
        <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-primary">
          Top benchwarmers
        </h3>
        <div v-if="topBenchwarmers.length > 0" class="mt-4 space-y-2.5">
          <div
            v-for="(player, index) in topBenchwarmers"
            :key="`bench-${player.name}-${index}`"
            class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3"
          >
            <div class="flex items-center min-w-0 gap-3">
              <div class="min-w-0">
                <p class="text-lg font-semibold truncate">
                  {{ player.name }}
                </p>
                <p class="text-sm truncate text-slate-500">
                  Left by {{ player.user }}
                </p>
              </div>
            </div>
            <p class="shrink-0 text-xl font-bold tabular-nums text-slate-900">
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
      class="absolute bottom-10 left-12 right-12 z-10 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-7 py-5"
    >
      <p class="text-2xl font-semibold">
        View the full report at ffwrapped.com
      </p>
      <p class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        {{ props.tier || "Weekly" }} weekly report
      </p>
    </footer>
  </div>
</template>
