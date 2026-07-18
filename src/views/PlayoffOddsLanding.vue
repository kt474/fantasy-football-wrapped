<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Check,
  Dices,
  Route,
  ShieldCheck,
} from "lucide-vue-next";

const sampleOdds = [
  { team: "Sunday Scaries", record: "8–3", odds: 96, seed: "1.8 avg" },
  { team: "Fourth & Goal", record: "7–4", odds: 78, seed: "3.4 avg" },
  { team: "Waiver Weather", record: "5–6", odds: 41, seed: "5.9 avg" },
  { team: "Monday Regret", record: "4–7", odds: 12, seed: "8.1 avg" },
];

const forecastStages = [
  {
    title: "League state",
    detail: "Current record, points scored, completed weeks, playoff cutoff, and the imported remaining schedule when available.",
  },
  {
    title: "Team strength",
    detail: "Recent scoring form and projected starter output using the league’s starting roster slots and scoring format.",
  },
  {
    title: "5,000 seasons",
    detail: "The remaining schedule is replayed with weekly scoring variation, head-to-head matchups, and median scoring when enabled.",
  },
  {
    title: "Probability range",
    detail: "Playoff odds, top-seed odds, average seed, expected wins, and a likely win range for every manager.",
  },
];

const views = [
  {
    icon: BarChart3,
    title: "Season forecast",
    description: "Follow the expected win race week by week and compare wins already secured with the simulated final total.",
    output: "Playoff odds · top seed · average seed · win range",
  },
  {
    icon: Route,
    title: "Schedule scenarios",
    description: "Replay or rearrange schedules to see how much a manager’s record and seed depend on opponent timing.",
    output: "Record change · seed movement · schedule impact",
  },
  {
    icon: Dices,
    title: "Monte Carlo distribution",
    description: "See a range of plausible finishes instead of treating one projected record as a guaranteed outcome.",
    output: "Likely finish · low/high wins · placement distribution",
  },
];

const faqs = [
  {
    question: "How are fantasy football playoff odds calculated?",
    answer: "ffwrapped combines the current league state, remaining schedule, scoring history, roster projections, playoff cutoff, and league rules, then runs 5,000 simulated finishes for the active-season forecast.",
  },
  {
    question: "Do the odds use my league’s real remaining matchups?",
    answer: "Yes. The season forecast begins with the imported schedule when it is available. Scenario tools can also show how standings change under alternate schedule arrangements.",
  },
  {
    question: "Are playoff probabilities guaranteed?",
    answer: "No. They are estimates based on projections and scoring variation. Injuries, lineup changes, trades, and unpredictable weekly results can move the forecast quickly.",
  },
  {
    question: "Does the forecast support median scoring?",
    answer: "The simulation accounts for the league’s median-scoring setting when it is enabled and applies those weekly results alongside head-to-head matchups.",
  },
];
</script>

<template>
  <PublicPageShell>
    <section class="relative overflow-hidden border-b">
      <div aria-hidden="true" class="odds-glow absolute inset-0"></div>
      <div class="relative grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)] lg:items-center">
        <div>
          <Badge variant="secondary">Fantasy football season forecast</Badge>
          <h1 class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
            Fantasy football playoff odds calculated from your real league
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Simulate the remaining schedule 5,000 times to estimate playoff probability, projected wins, likely seed, and the range of finishes still open to every team.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg"><RouterLink to="/">Calculate playoff odds</RouterLink></Button>
            <Button as-child size="lg" variant="outline"><RouterLink to="/sleeper-league-analyzer">Explore league analysis</RouterLink></Button>
          </div>
          <div class="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-muted-foreground">
            <span class="inline-flex items-center gap-1.5"><Check :size="14" /> Sleeper and ESPN</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="14" /> Real remaining schedule</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="14" /> League-specific scoring</span>
          </div>
        </div>

        <div class="overflow-hidden border shadow-xl rounded-card bg-card shadow-black/10">
          <div class="flex items-center justify-between gap-4 px-5 py-4 border-b">
            <div>
              <p class="text-xs font-medium tracking-wide uppercase text-muted-foreground">Sample playoff race</p>
              <h2 class="mt-1 font-semibold">Week 11 · Six playoff teams</h2>
            </div>
            <Badge variant="outline" class="font-normal">5,000 simulations</Badge>
          </div>
          <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 text-xs font-medium border-b bg-muted/30 text-muted-foreground">
            <span>Team</span><span>Odds</span><span>Seed</span>
          </div>
          <div v-for="row in sampleOdds" :key="row.team" class="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 border-b last:border-b-0">
            <div><p class="text-sm font-medium">{{ row.team }}</p><p class="mt-1 text-xs text-muted-foreground">{{ row.record }}</p></div>
            <div class="w-24">
              <p class="text-sm font-semibold text-right tabular-nums">{{ row.odds }}%</p>
              <div class="h-1.5 mt-2 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" :style="{ width: `${row.odds}%` }"></div></div>
            </div>
            <p class="text-xs text-right text-muted-foreground tabular-nums">{{ row.seed }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="max-w-3xl">
        <p class="text-sm font-medium text-primary">How the forecast works</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">From current standings to a range of possible finishes</h2>
        <p class="mt-4 leading-7 text-muted-foreground">A probability becomes more useful when the inputs and outputs are visible. The forecast keeps the real league structure intact throughout the simulation.</p>
      </div>
      <ol class="grid mt-10 overflow-hidden border divide-y rounded-card lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <li v-for="(stage, index) in forecastStages" :key="stage.title" class="p-6">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">0{{ index + 1 }}</span>
            <ArrowRight v-if="index < forecastStages.length - 1" :size="15" class="hidden text-muted-foreground lg:block" />
          </div>
          <h3 class="mt-5 font-semibold">{{ stage.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ stage.detail }}</p>
        </li>
      </ol>
    </section>

    <section class="border-y bg-muted/30">
      <div class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[0.65fr_1.35fr]">
        <div class="lg:sticky lg:top-24 lg:self-start">
          <p class="text-sm font-medium text-primary">Three ways to read the race</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">Probability, trajectory, and schedule luck</h2>
          <p class="mt-4 leading-7 text-muted-foreground">Each view answers a different question, so the same percentage does not have to carry the entire playoff story.</p>
        </div>
        <div class="border-t">
          <article v-for="view in views" :key="view.title" class="grid gap-4 py-7 border-b sm:grid-cols-[2rem_minmax(0,1fr)]">
            <component :is="view.icon" :size="18" class="mt-1 text-primary" />
            <div>
              <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
                <h3 class="text-xl font-semibold">{{ view.title }}</h3>
                <p class="text-xs text-primary">{{ view.output }}</p>
              </div>
              <p class="mt-3 leading-7 text-muted-foreground">{{ view.description }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p class="text-sm font-medium text-primary">Read probabilities honestly</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">A forecast is a range, not a promise</h2>
          <p class="mt-4 leading-7 text-muted-foreground">The model reflects the information available now. A single lineup change, injury, trade, or breakout week can change the strength assumptions and move the next forecast.</p>
          <div class="flex items-center gap-2 mt-6 text-sm font-medium"><ShieldCheck :size="17" class="text-primary" /> Re-run after league data and projections update</div>
        </div>
        <div class="p-6 border rounded-card bg-card">
          <div class="flex items-center justify-between gap-3 pb-4 border-b">
            <div><p class="text-xs text-muted-foreground">Fourth &amp; Goal</p><p class="mt-1 text-lg font-semibold">Projected finish</p></div>
            <span class="text-3xl font-semibold text-primary">78%</span>
          </div>
          <dl class="grid grid-cols-2 mt-5 gap-x-6 gap-y-5">
            <div><dt class="text-xs text-muted-foreground">Average wins</dt><dd class="mt-1 font-semibold">8.2</dd></div>
            <div><dt class="text-xs text-muted-foreground">Likely range</dt><dd class="mt-1 font-semibold">7–10 wins</dd></div>
            <div><dt class="text-xs text-muted-foreground">Average seed</dt><dd class="mt-1 font-semibold">3.4</dd></div>
            <div><dt class="text-xs text-muted-foreground">Top-seed odds</dt><dd class="mt-1 font-semibold">14%</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <section class="max-w-4xl px-5 pb-16 mx-auto sm:pb-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">Fantasy football playoff odds questions</h2>
      <dl class="mt-8 border-t">
        <div v-for="faq in faqs" :key="faq.question" class="grid gap-2 py-5 border-b sm:grid-cols-[15rem_1fr]">
          <dt class="font-medium">{{ faq.question }}</dt>
          <dd class="text-sm leading-6 text-muted-foreground">{{ faq.answer }}</dd>
        </div>
      </dl>
    </section>

    <section class="px-5 pb-4 mx-auto max-w-6xl">
      <div class="relative flex flex-col items-start gap-6 p-7 overflow-hidden border rounded-feature bg-primary text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div aria-hidden="true" class="absolute rounded-full -right-20 -top-32 h-72 w-72 bg-white/10"></div>
        <div class="relative"><h2 class="text-2xl font-semibold tracking-tight">See every remaining path through your season</h2><p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">Connect the league, open Season Forecast, and compare the playoff race after every completed week.</p></div>
        <Button as-child size="lg" variant="secondary" class="relative shrink-0"><RouterLink to="/">Run the forecast</RouterLink></Button>
      </div>
    </section>
  </PublicPageShell>
</template>

<style scoped>
.odds-glow {
  background:
    radial-gradient(circle at 82% 26%, hsl(var(--primary) / 0.1), transparent 28rem),
    linear-gradient(to bottom, hsl(var(--muted) / 0.2), transparent 75%);
}
</style>
