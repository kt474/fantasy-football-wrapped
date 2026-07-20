<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Check,
  ClipboardList,
  Gauge,
  Scale,
} from "lucide-vue-next";

const samplePicks = [
  { pick: "2.06", position: "WR", grade: "A", note: "11 picks after ADP" },
  { pick: "4.06", position: "RB", grade: "B+", note: "Slight value versus ADP" },
  { pick: "7.07", position: "QB", grade: "A-", note: "Taken later than ADP" },
];

const gradeViews = [
  {
    number: "01",
    title: "Pick-by-pick grades",
    question: "Was the player taken at a sensible point in the draft?",
    description:
      "Each selection gets a letter grade from its pick number versus average draft position, with projected scoring shown beside it for useful context.",
    detail: "Pick number · ADP · letter grade · projection",
  },
  {
    number: "02",
    title: "Team grade",
    question: "How did the complete draft compare with the rest of the league?",
    description:
      "The first 13 selections are combined using draft position, ADP, and projected points, then graded relative to the other managers in that same draft.",
    detail: "Team score · league average · relative grade",
  },
  {
    number: "03",
    title: "Full draft recap",
    question: "Where did every player and manager come off the board?",
    description:
      "Review the original order, round reversals, auction results when available, and how draft cost compares with current positional performance.",
    detail: "Draft order · rounds · auction cost · current performance",
  },
];

const methodology = [
  {
    icon: ClipboardList,
    title: "Start with the real draft",
    description:
      "ffwrapped imports completed picks, draft slots, league format, scoring type, and roster ownership from the connected league.",
  },
  {
    icon: Gauge,
    title: "Estimate player value",
    description:
      "Pick grades compare draft cost with ADP, while format-aware projected points also contribute to the team score when supported.",
  },
  {
    icon: Scale,
    title: "Grade within the league",
    description:
      "Team scores are standardized against the other drafts in the league, so the final letter grade reflects that specific room.",
  },
];

const faqs = [
  {
    question: "Which platforms can I use for draft grades?",
    answer:
      "ffwrapped can load completed draft data from connected Sleeper and ESPN fantasy football leagues. Available draft details can vary by platform and league format.",
  },
  {
    question: "What goes into a fantasy football draft grade?",
    answer:
      "Individual pick grades compare pick number with average draft position. The team grade combines ADP value and projected points from a manager’s first 13 selections, then compares that score with the rest of the draft room.",
  },
  {
    question: "Does a high draft grade predict the league winner?",
    answer:
      "No. Draft grades evaluate information available around draft cost and projections. Injuries, waivers, trades, lineup choices, and projection error can change the season dramatically.",
  },
  {
    question: "Can I inspect individual picks as well as the team grade?",
    answer:
      "Yes. The Draft area includes the full recap and a manager-level grade view, with pick number, ADP, and an individual grade shown for supported drafts.",
  },
  {
    question: "When are draft grades available?",
    answer:
      "Draft grades are available after the draft is complete and the platform exposes its finished picks. Connect the league again after your draft if it was first added during the preseason.",
  },
];

const analysisRoute = {
  path: "/",
  query: { source: "draft_grades_landing" },
};
</script>

<template>
  <PublicPageShell>
    <section class="relative overflow-hidden border-b">
      <div aria-hidden="true" class="draft-grid absolute inset-0 opacity-35"></div>
      <div class="relative grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[minmax(0,1.04fr)_minmax(380px,0.96fr)] lg:items-center">
        <div>
          <Badge variant="secondary">Sleeper and ESPN draft analysis</Badge>
          <h1 class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
            Fantasy football draft grades with the picks behind the score
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Grade a completed fantasy football draft using pick position, ADP, projections, and the performance of the entire draft room—not a mystery score with no explanation.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg"><RouterLink :to="analysisRoute">Grade your draft</RouterLink></Button>
            <Button as-child size="lg" variant="outline"><RouterLink to="/sleeper-league-analyzer">Sleeper draft grades</RouterLink></Button>
          </div>
          <div class="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-muted-foreground">
            <span class="inline-flex items-center gap-1.5"><Check :size="14" /> Completed drafts</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="14" /> Individual and team grades</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="14" /> Free league analysis</span>
          </div>
        </div>

        <div class="overflow-hidden border shadow-xl rounded-card bg-card shadow-black/10">
          <div class="flex items-center justify-between gap-4 px-5 py-4 border-b">
            <div>
              <p class="text-xs font-medium tracking-wide uppercase text-muted-foreground">Sample draft report</p>
              <h2 class="mt-1 font-semibold">12-team PPR · Snake draft</h2>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground">Team grade</p>
              <p class="mt-1 text-3xl font-semibold text-primary">A-</p>
            </div>
          </div>
          <div class="px-5 py-3 text-xs font-medium border-b bg-muted/30 text-muted-foreground">
            Highest-value selections
          </div>
          <ol>
            <li v-for="pick in samplePicks" :key="pick.pick" class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-5 py-4 border-b last:border-b-0">
              <span class="text-sm font-medium tabular-nums">{{ pick.pick }}</span>
              <div>
                <p class="text-sm font-semibold">{{ pick.position }} selection</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ pick.note }}</p>
              </div>
              <span class="flex items-center justify-center w-9 h-9 font-semibold rounded-full bg-primary/10 text-primary">{{ pick.grade }}</span>
            </li>
          </ol>
          <div class="flex items-center justify-between gap-4 px-5 py-4 border-t bg-muted/30">
            <span class="inline-flex items-center gap-2 text-sm font-medium"><BarChart3 :size="16" class="text-primary" /> League rank</span>
            <span class="text-sm text-muted-foreground">2nd of 12 teams</span>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[0.68fr_1.32fr]">
      <div class="lg:sticky lg:top-24 lg:self-start">
        <p class="text-sm font-medium text-primary">What the grade explains</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">More useful than a letter by itself</h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          The team score is the summary. The draft order, player cost, and league comparison are the evidence you can inspect underneath it.
        </p>
      </div>
      <ol class="border-t">
        <li v-for="view in gradeViews" :key="view.number" class="grid gap-4 py-7 border-b sm:grid-cols-[3rem_minmax(0,1fr)]">
          <p class="pt-1 text-xs font-medium text-muted-foreground">{{ view.number }}</p>
          <div>
            <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
              <h3 class="text-xl font-semibold">{{ view.title }}</h3>
              <p class="text-xs text-primary">{{ view.detail }}</p>
            </div>
            <p class="mt-3 font-medium">{{ view.question }}</p>
            <p class="mt-2 leading-7 text-muted-foreground">{{ view.description }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="border-y bg-muted/30">
      <div class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">Grading methodology</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">Draft cost, projected value, then league context</h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            Grades are estimates, not season predictions. The method is designed to make the assumptions visible enough to disagree with them intelligently.
          </p>
        </div>
        <ol class="grid mt-10 overflow-hidden border divide-y rounded-card bg-background lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <li v-for="step in methodology" :key="step.title" class="p-6 sm:p-7">
            <component :is="step.icon" :size="20" class="text-primary" />
            <h3 class="mt-5 text-lg font-semibold">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ step.description }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="max-w-3xl">
        <p class="text-sm font-medium text-primary">Sleeper and ESPN</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">Use the draft already attached to your league</h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          There is no draft board to rebuild. Connect the platform that hosted your league, then open Draft after the completed picks load.
        </p>
      </div>
      <div class="grid gap-4 mt-9 sm:grid-cols-2">
        <RouterLink to="/sleeper-league-analyzer" class="p-6 transition-colors border rounded-card bg-background hover:border-primary/50 sm:p-7">
          <h3 class="text-lg font-semibold">Sleeper fantasy football draft grades</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">Connect by Sleeper username or league ID and review the completed snake or auction draft data available for that league.</p>
          <p class="mt-5 text-sm font-medium text-primary">Analyze a Sleeper league →</p>
        </RouterLink>
        <RouterLink to="/espn-league-analyzer" class="p-6 transition-colors border rounded-card bg-background hover:border-primary/50 sm:p-7">
          <h3 class="text-lg font-semibold">ESPN fantasy football draft grades</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">Connect the correct ESPN league and season, including private leagues, to load the draft results ESPN makes available.</p>
          <p class="mt-5 text-sm font-medium text-primary">Analyze an ESPN league →</p>
        </RouterLink>
      </div>
    </section>

    <section class="max-w-4xl px-5 py-16 mx-auto sm:py-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">Fantasy football draft grade questions</h2>
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
        <div class="relative">
          <h2 class="text-2xl font-semibold tracking-tight">Put your draft room under review</h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">Connect the league, open Draft, and compare every manager’s picks with the value available at the time.</p>
        </div>
        <Button as-child size="lg" variant="secondary" class="relative shrink-0"><RouterLink :to="analysisRoute">Analyze your draft</RouterLink></Button>
      </div>
    </section>
  </PublicPageShell>
</template>

<style scoped>
.draft-grid {
  background-image:
    linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 88%);
}
</style>
