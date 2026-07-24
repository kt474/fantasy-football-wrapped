<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  BarChart3,
  Calculator,
  Check,
  Grid3X3,
  ListOrdered,
  TrendingUp,
} from "lucide-vue-next";

const sampleRankings = [
  { rank: 1, team: "Breece's Puffs", score: 82.4, move: "+2", width: 100 },
  { rank: 2, team: "Lamario Kart", score: 79.1, move: "–1", width: 88 },
  { rank: 3, team: "Waiver Weather", score: 74.6, move: "+1", width: 72 },
  { rank: 4, team: "Monday Regret", score: 69.8, move: "–1", width: 56 },
];

const formulaInputs = [
  {
    label: "Weekly scoring",
    weight: "6×",
    detail:
      "Average points keeps repeatable team performance at the center of the score.",
  },
  {
    label: "Scoring range",
    weight: "2×",
    detail: "The highest and lowest weeks capture a team’s ceiling and floor.",
  },
  {
    label: "Win percentage",
    weight: "400×",
    detail:
      "Results still matter, without allowing the standings to tell the whole story.",
  },
];

const rankingViews = [
  {
    icon: TrendingUp,
    title: "Weekly ranking history",
    question: "Who is rising, and who is living on an early hot streak?",
    description:
      "Follow every team’s ranking score from preseason through the latest completed week instead of treating today’s order as the entire season.",
    output: "Weekly score · rank movement · preseason baseline",
  },
  {
    icon: Grid3X3,
    title: "Position strength heatmap",
    question: "Where is each roster actually stronger than the league?",
    description:
      "Compare projected positional strength across QB, RB, WR, TE, K, and defense to expose the roster construction underneath the overall ranking.",
    output: "Position rank · team comparison · projection context",
  },
  {
    icon: ListOrdered,
    title: "Roster ranking detail",
    question: "Which players are carrying—or limiting—the team score?",
    description:
      "Move from the league order into each manager’s roster, with player rankings grouped by position and readable alongside the broader team trend.",
    output: "Player rank · position group · manager roster",
  },
];

const faqs = [
  {
    question: "How are ffwrapped power rankings calculated?",
    answer:
      "The ranking score combines average weekly points, the team’s highest and lowest scoring weeks, and win percentage. Average scoring carries the most weight, while results and weekly range add context.",
  },
  {
    question: "How are power rankings different from standings?",
    answer:
      "Standings order teams by wins, losses, and league tiebreakers. Power rankings evaluate scoring performance and consistency alongside win percentage, so a strong team with an unlucky schedule can rank above its current seed.",
  },
  {
    question: "When do fantasy football power rankings update?",
    answer:
      "The ranking history updates as completed weekly league data is loaded. You can select an earlier week to see what the order looked like at that point in the season.",
  },
  {
    question: "Do power rankings predict the league winner?",
    answer:
      "No. They summarize performance to date. Injuries, trades, lineup decisions, schedule strength, and future player performance can all change the order.",
  },
];
</script>

<template>
  <PublicPageShell>
    <section class="relative overflow-hidden border-b">
      <div aria-hidden="true" class="ranking-field absolute inset-0"></div>
      <div
        class="relative grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)] lg:items-center"
      >
        <div>
          <Badge variant="secondary">Sleeper and ESPN league rankings</Badge>
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            Fantasy football power rankings with a score you can explain
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Rank every team using scoring, consistency, and results—then follow
            the order week by week and inspect the roster strengths behind each
            move.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg"
              ><RouterLink to="/">Rank your league</RouterLink></Button
            >
            <Button as-child size="lg" variant="outline"
              ><RouterLink to="/fantasy-football-playoff-odds-calculator"
                >Compare playoff odds</RouterLink
              ></Button
            >
          </div>
          <div
            class="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-muted-foreground"
          >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Weekly ranking history</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Position strength</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Transparent formula</span
            >
          </div>
        </div>

        <div
          class="overflow-hidden border shadow-xl rounded-card bg-card shadow-black/10"
        >
          <div
            class="flex items-center justify-between gap-4 px-5 py-4 border-b"
          >
            <div>
              <p
                class="text-xs font-medium tracking-wide uppercase text-muted-foreground"
              >
                Sample league
              </p>
              <h2 class="mt-1 font-semibold">Power rankings · Week 8</h2>
            </div>
            <Badge variant="outline" class="font-normal">Updated weekly</Badge>
          </div>
          <ol>
            <li
              v-for="team in sampleRankings"
              :key="team.team"
              class="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 border-b last:border-b-0"
            >
              <span class="text-sm font-semibold tabular-nums">{{
                team.rank
              }}</span>
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-medium truncate">{{ team.team }}</p>
                  <span class="text-xs text-muted-foreground tabular-nums">{{
                    team.move
                  }}</span>
                </div>
                <div class="h-1.5 mt-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{ width: `${team.width}%` }"
                  ></div>
                </div>
              </div>
              <span
                class="w-12 text-sm font-semibold text-right tabular-nums"
                >{{ team.score }}</span
              >
            </li>
          </ol>
          <div
            class="flex items-center gap-2 px-5 py-4 text-xs border-t bg-muted/30 text-muted-foreground"
          >
            <Activity :size="15" class="text-primary" /> Scoring performance
            carries more weight than record alone.
          </div>
        </div>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.68fr_1.32fr]">
        <div class="lg:sticky lg:top-24 lg:self-start">
          <p class="text-sm font-medium text-primary">Ranking methodology</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            The standings matter. The scoreboard matters more.
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            The formula rewards sustained scoring, adds the team’s weekly
            ceiling and floor, and then brings win percentage back into the
            picture.
          </p>
          <div class="p-5 mt-6 border rounded-card bg-muted/30">
            <div class="flex items-center gap-2 text-sm font-medium">
              <Calculator :size="17" class="text-primary" /> Published formula
            </div>
            <p class="mt-3 text-sm leading-6 text-muted-foreground">
              ((average weekly score × 6) + ((highest score + lowest score) × 2)
              + (win percentage × 400)) ÷ 10
            </p>
          </div>
        </div>
        <ol class="overflow-hidden border divide-y rounded-card">
          <li
            v-for="input in formulaInputs"
            :key="input.label"
            class="grid gap-4 p-6 sm:grid-cols-[4rem_minmax(0,1fr)] sm:p-7"
          >
            <span class="text-2xl font-semibold text-primary tabular-nums">{{
              input.weight
            }}</span>
            <div>
              <h3 class="text-lg font-semibold">{{ input.label }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                {{ input.detail }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">Read beneath the rank</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Three views, three different questions
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            The league order is the starting point. Trends and roster detail
            explain why a team landed there.
          </p>
        </div>
        <div
          class="grid mt-10 overflow-hidden border divide-y rounded-card bg-background lg:grid-cols-3 lg:divide-x lg:divide-y-0"
        >
          <article
            v-for="view in rankingViews"
            :key="view.title"
            class="p-6 sm:p-7"
          >
            <component :is="view.icon" :size="20" class="text-primary" />
            <h3 class="mt-5 text-lg font-semibold">{{ view.title }}</h3>
            <p class="mt-3 font-medium">{{ view.question }}</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              {{ view.description }}
            </p>
            <p class="pt-4 mt-5 text-xs border-t text-primary">
              {{ view.output }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section
      class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center"
    >
      <div>
        <p class="text-sm font-medium text-primary">Week-by-week context</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          See when the league changed its mind
        </h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          Select any completed week to reconstruct that ranking. Preseason
          projections establish the opening baseline when available, while
          completed scores and results reshape the order as the season develops.
        </p>
      </div>
      <div class="p-6 border rounded-card bg-card">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs text-muted-foreground">Breece's Puffs</p>
            <p class="mt-1 text-lg font-semibold">Ranking trajectory</p>
          </div>
          <BarChart3 :size="20" class="text-primary" />
        </div>
        <div class="grid grid-cols-6 gap-2 mt-8 items-end h-36">
          <div
            v-for="(height, index) in [38, 46, 55, 52, 71, 88]"
            :key="index"
            class="flex flex-col items-center justify-end h-full gap-2"
          >
            <div
              class="w-full rounded-t bg-primary/80"
              :style="{ height: `${height}%` }"
            ></div>
            <span class="text-[0.68rem] text-muted-foreground">{{
              index === 0 ? "Pre" : `W${index}`
            }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-4xl px-5 pb-16 mx-auto sm:pb-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">
        Fantasy football power ranking questions
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
            Find the team your standings are underrating
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
            Connect a Sleeper or ESPN league, open Power Rankings, and follow
            the order after every completed week.
          </p>
        </div>
        <Button as-child size="lg" variant="secondary" class="relative shrink-0"
          ><RouterLink to="/">View league rankings</RouterLink></Button
        >
      </div>
    </section>
  </PublicPageShell>
</template>

<style scoped>
.ranking-field {
  background:
    linear-gradient(
      105deg,
      transparent 0 54%,
      hsl(var(--primary) / 0.05) 54% 55%,
      transparent 55%
    ),
    radial-gradient(
      circle at 82% 20%,
      hsl(var(--primary) / 0.11),
      transparent 27rem
    );
}
</style>
