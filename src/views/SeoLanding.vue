<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  CalendarRange,
  Check,
  History,
  ScanLine,
  Trophy,
} from "lucide-vue-next";

type LandingPage = {
  eyebrow: string;
  heading: string;
  introduction: string;
};

const route = useRoute();
const page = computed(() => route.meta.landingPage as LandingPage);

const leaguePulse = [
  {
    label: "Power rank",
    value: "#2",
    note: "Up 3 this week",
    tone: "text-primary",
  },
  { label: "Expected wins", value: "7.4", note: "5–6 actual record" },
  { label: "Playoff odds", value: "78%", note: "14% top-seed odds" },
  { label: "Scoring rank", value: "3rd", note: "1,462.8 season points" },
];

const analysisViews = [
  {
    number: "01",
    title: "Power rankings",
    question: "Who is stronger than their record looks?",
    description:
      "Put win-loss record beside all-play performance, expected wins, schedule strength, and roster projections. The gap between those signals is often the real story.",
    signal: "Record · all-play · expected wins · projection",
  },
  {
    number: "02",
    title: "Playoff outlook",
    question: "What does each manager need from the remaining schedule?",
    description:
      "See current playoff probability, remaining opponents, likely seeds, and the routes still open to teams around the cutoff.",
    signal: "Odds · seed range · schedule · win range",
  },
  {
    number: "03",
    title: "Roster and draft review",
    question: "Where did a team build—or lose—its edge?",
    description:
      "Connect draft value, current roster strength, lineup decisions, trades, and waiver activity instead of judging each move in isolation.",
    signal: "Draft grades · projections · trades · waivers",
  },
  {
    number: "04",
    title: "League history",
    question: "Which rivalries and manager trends hold up over time?",
    description:
      "Follow linked Sleeper seasons for head-to-head records, scoring highs and lows, final placements, and manager profiles that span more than one year.",
    signal: "Seasons · matchups · finishes · records",
  },
];

const workflow = [
  {
    icon: ScanLine,
    title: "Connect",
    description:
      "Use a Sleeper username or league ID. Rosters, matchups, standings, and settings load together.",
  },
  {
    icon: CalendarRange,
    title: "Choose a lens",
    description:
      "Start with the current week, the playoff race, roster construction, or the full history of the league.",
  },
  {
    icon: ArrowUpRight,
    title: "Follow the season",
    description:
      "Return after scoring updates to see which rankings, probabilities, and season narratives actually changed.",
  },
];

const faqs = [
  {
    question: "Where do I find my Sleeper fantasy football league ID?",
    answer:
      "Open the league in Sleeper on the web and copy the numeric league ID from the URL. You can also enter a Sleeper username and select a season to choose from that user’s leagues.",
  },
  {
    question: "Can I analyze a Sleeper league before the season starts?",
    answer:
      "Yes. Preseason views depend on the data currently available, such as league settings, rosters, projections, and a completed draft. Weekly reports and results-based analysis become available after matchups are scored.",
  },
  {
    question: "Does the Sleeper league need to be public?",
    answer:
      "Sleeper league data used by ffwrapped is available through Sleeper’s league APIs, so you can normally connect with a username or league ID without entering Sleeper account credentials.",
  },
  {
    question: "Does ffwrapped support dynasty and redraft leagues?",
    answer:
      "ffwrapped supports Sleeper NFL leagues across common redraft, keeper, and dynasty setups. Some analysis depends on the scoring, roster, schedule, and history data available for that specific league.",
  },
];

const sleeperAnalysisRoute = {
  path: "/",
  query: { platform: "sleeper", source: "sleeper_analyzer_landing" },
};
</script>

<template>
  <PublicPageShell>
    <section class="relative overflow-hidden border-b">
      <div
        aria-hidden="true"
        class="hero-grid absolute inset-0 opacity-40"
      ></div>
      <div
        class="relative grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:items-center"
      >
        <div>
          <Badge variant="secondary">{{ page.eyebrow }}</Badge>
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            {{ page.heading }}
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            {{ page.introduction }}
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg">
              <RouterLink :to="sleeperAnalysisRoute"
                >Analyze a Sleeper league</RouterLink
              >
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink to="/fantasy-football-weekly-recap"
                >See weekly reports</RouterLink
              >
            </Button>
          </div>
          <div
            class="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-muted-foreground"
          >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> No spreadsheet setup</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Current and linked seasons</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Free to explore</span
            >
          </div>
        </div>

        <Card
          class="overflow-hidden shadow-xl shadow-black/10 bg-card/95 backdrop-blur"
        >
          <CardContent class="p-0">
            <div
              class="flex items-center justify-between gap-4 px-5 py-4 border-b"
            >
              <div>
                <p
                  class="text-xs font-medium tracking-wide uppercase text-muted-foreground"
                >
                  Sample league pulse
                </p>
                <h2 class="mt-1 font-semibold">Fourth &amp; Goal · Week 11</h2>
              </div>
              <Badge variant="outline" class="gap-1.5 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
                Synced
              </Badge>
            </div>
            <dl class="grid grid-cols-2">
              <div
                v-for="(metric, index) in leaguePulse"
                :key="metric.label"
                class="p-5"
                :class="[
                  index < 2 ? 'border-b' : '',
                  index % 2 === 1 ? 'border-l' : '',
                ]"
              >
                <dt class="text-xs text-muted-foreground">
                  {{ metric.label }}
                </dt>
                <dd
                  class="mt-2 text-2xl font-semibold tracking-tight tabular-nums"
                  :class="metric.tone"
                >
                  {{ metric.value }}
                </dd>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ metric.note }}
                </p>
              </div>
            </dl>
            <div class="px-5 py-4 border-t bg-muted/30">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="inline-flex items-center gap-2 font-medium"
                  ><Trophy :size="15" class="text-primary" /> Biggest
                  mover</span
                >
                <span class="text-muted-foreground"
                  >Breece's Puffs · +18 pts</span
                >
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div class="lg:sticky lg:top-24 lg:self-start">
          <p class="text-sm font-medium text-primary">
            Four ways to read the league
          </p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Start with a question, not another dashboard
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            Each view combines the league signals that belong together, so a
            ranking or probability comes with the evidence behind it.
          </p>
        </div>

        <ol class="border-t">
          <li
            v-for="view in analysisViews"
            :key="view.number"
            class="grid gap-4 py-7 border-b sm:grid-cols-[2.5rem_minmax(0,1fr)]"
          >
            <p class="pt-1 text-xs font-medium text-muted-foreground">
              {{ view.number }}
            </p>
            <div>
              <div
                class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
              >
                <h3 class="text-xl font-semibold">{{ view.title }}</h3>
                <p class="text-xs text-muted-foreground">{{ view.signal }}</p>
              </div>
              <p class="mt-3 font-medium">{{ view.question }}</p>
              <p class="mt-2 leading-7 text-muted-foreground">
                {{ view.description }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div
        class="grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center"
      >
        <div>
          <p class="text-sm font-medium text-primary">The long view</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            A season makes more sense when it remembers the ones before it
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            Sleeper links renewed leagues from year to year. ffwrapped follows
            that chain so a manager profile can include the rivalry record,
            scoring history, and finishes that built it.
          </p>
          <div class="flex items-center gap-2 mt-6 text-sm font-medium">
            <History :size="17" class="text-primary" />
            Multi-season history, without combining exports
          </div>
        </div>

        <div class="p-5 border bg-background rounded-card sm:p-6">
          <div class="flex items-center justify-between pb-5 border-b">
            <div>
              <p class="text-xs text-muted-foreground">Manager profile</p>
              <p class="mt-1 font-semibold">The Waiver Wire</p>
            </div>
            <p class="text-sm font-medium text-primary">3 seasons</p>
          </div>
          <div class="relative mt-6 ml-2 border-l">
            <div class="relative pb-7 pl-6">
              <span
                class="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background"
              ></span>
              <p class="text-xs text-muted-foreground">2025 · Current</p>
              <p class="mt-1 font-medium">6–5 · Projected playoff seed #4</p>
            </div>
            <div class="relative pb-7 pl-6">
              <span
                class="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-muted-foreground ring-4 ring-background"
              ></span>
              <p class="text-xs text-muted-foreground">2024 · Final</p>
              <p class="mt-1 font-medium">
                Runner-up · League-high 1,744 points
              </p>
            </div>
            <div class="relative pl-6">
              <span
                class="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-muted-foreground ring-4 ring-background"
              ></span>
              <p class="text-xs text-muted-foreground">2023 · Final</p>
              <p class="mt-1 font-medium">7th place · 3–1 rivalry record</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-medium text-primary">A lightweight workflow</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Built to become part of the season
        </h2>
      </div>
      <ol
        class="grid mt-10 overflow-hidden border divide-y rounded-card md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        <li v-for="item in workflow" :key="item.title" class="p-6 sm:p-7">
          <component :is="item.icon" :size="20" class="text-primary" />
          <h3 class="mt-5 text-lg font-semibold">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ item.description }}
          </p>
        </li>
      </ol>
    </section>

    <section class="max-w-4xl px-5 py-16 mx-auto sm:py-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">
        Sleeper league analyzer questions
      </h2>
      <dl class="mt-8 border-t">
        <div
          v-for="faq in faqs"
          :key="faq.question"
          class="grid gap-2 py-5 border-b sm:grid-cols-[15rem_1fr]"
        >
          <dt class="font-medium">{{ faq.question }}</dt>
          <dd class="text-sm leading-6 text-muted-foreground">
            {{ faq.answer }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="px-5 pb-4 mx-auto max-w-6xl">
      <div
        class="relative flex flex-col items-start gap-6 p-7 overflow-hidden border rounded-feature bg-primary text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-9"
      >
        <div
          aria-hidden="true"
          class="absolute rounded-full -right-20 -top-32 h-72 w-72 bg-white/10"
        ></div>
        <div class="relative">
          <h2 class="text-2xl font-semibold tracking-tight">
            See what your Sleeper standings leave out
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
            Add a league once, then follow the rankings, playoff race, roster
            decisions, and history as the season changes.
          </p>
        </div>
        <Button
          as-child
          size="lg"
          variant="secondary"
          class="relative shrink-0"
        >
          <RouterLink :to="sleeperAnalysisRoute"
            >Analyze your league</RouterLink
          >
        </Button>
      </div>
    </section>
  </PublicPageShell>
</template>

<style scoped>
.hero-grid {
  background-image:
    linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 88%);
}
</style>
