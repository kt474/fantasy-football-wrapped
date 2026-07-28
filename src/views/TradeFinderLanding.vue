<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import TradeFinderPreview from "@/components/seo/previews/TradeFinderPreview.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Calculator,
  Check,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "@lucide/vue";

const workflow = [
  {
    number: "01",
    title: "Choose the roster you want to improve",
    description:
      "Start with one manager or scan the entire league. Trade Finder reads the real rosters, starting requirements, scoring, and available player values.",
    detail: "Manager filter · roster needs · league settings",
  },
  {
    number: "02",
    title: "Review offers with a benefit on both sides",
    description:
      "Each result shows the outgoing assets, league-adjusted value match, and the projected lineup change for both managers.",
    detail: "Value match · lineup gain · replacement context",
  },
  {
    number: "03",
    title: "Open the idea in Trade Builder",
    description:
      "A suggestion is a starting point. Carry it into Trade Lab, adjust the package, and compare the updated value and lineup impact before sending anything.",
    detail: "Editable package · side-by-side analysis · copyable offer",
  },
];

const evaluationSignals = [
  {
    icon: TrendingUp,
    label: "Starting-lineup improvement",
    value: "Required for both teams",
    description:
      "The incoming assets must improve each modelled starting lineup rather than merely adding bench depth.",
  },
  {
    icon: ShieldCheck,
    label: "League-adjusted value match",
    value: "Reasonably balanced",
    description:
      "Values account for format, scoring, starting slots, position scarcity, and redraft or dynasty context.",
  },
  {
    icon: Calculator,
    label: "Replacement-level context",
    value: "Position aware",
    description:
      "A player is measured against the realistic starter-level replacement at the same position in that league.",
  },
  {
    icon: SlidersHorizontal,
    label: "Package flexibility",
    value: "Editable in Trade Lab",
    description:
      "Every result can be adjusted after discovery, so the final offer can reflect manager preference and roster depth.",
  },
];

const faqs = [
  {
    question: "How is Trade Finder different from a trade calculator?",
    answer:
      "A calculator evaluates a deal you already built. Trade Finder starts with the rosters in your league, searches for reasonably balanced exchanges, and surfaces offers where both projected starting lineups improve.",
  },
  {
    question: "How does ffwrapped decide whether a trade is balanced?",
    answer:
      "The value comparison uses league-adjusted player values and checks the gap between both sides. The model also requires a projected lineup benefit for each manager before showing a suggestion.",
  },
  {
    question: "Does Trade Finder support dynasty leagues?",
    answer:
      "Yes. Dynasty mode blends longer-term market context with league-specific projected production, positional needs, lineup requirements, and the selected team direction. Eligible draft picks may also help balance a dynasty package.",
  },
  {
    question: "Are suggested trades guaranteed to be accepted?",
    answer:
      "No. Manager preferences, injuries, risk tolerance, favorite players, and league dynamics cannot be fully modeled. Suggestions are credible starting points to edit and discuss, not predictions that another manager will accept.",
  },
  {
    question: "Which fantasy football platforms are supported?",
    answer:
      "Trade Finder works with supported Sleeper and ESPN fantasy football leagues after their roster and scoring data have been imported into ffwrapped.",
  },
  {
    question: "Is Trade Finder a Premium feature?",
    answer:
      "Yes. You can connect and explore a league for free, including a preview of league-specific Player Values. Premium unlocks Trade Finder’s league-wide suggestion search and the complete Player Values experience.",
  },
];

const analyzeRoute = {
  path: "/",
  query: {
    source: "trade_finder_landing",
    destination: "trade_finder",
    tradeMode: "finder",
  },
};
</script>

<template>
  <PublicPageShell>
    <section class="border-b">
      <div
        class="grid items-center gap-12 px-5 py-16 mx-auto max-w-7xl sm:py-24 lg:grid-cols-[minmax(0,0.72fr)_minmax(600px,1.28fr)]"
      >
        <div>
          <Badge variant="secondary">Premium trade tool</Badge>
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            Find fantasy football trades that help both teams
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Trade Finder scans the real rosters in your league for balanced
            deals projected to improve both teams’ starting lineups.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg">
              <RouterLink :to="analyzeRoute">Analyze your league</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink to="/fantasy-football-player-values">
                See Player Values
              </RouterLink>
            </Button>
          </div>
          <div
            class="flex flex-wrap mt-6 text-sm gap-x-5 gap-y-2 text-muted-foreground"
          >
            <span class="inline-flex items-center gap-1.5">
              <Check :size="14" /> League specific suggestions
            </span>
            <span class="inline-flex items-center gap-1.5">
              <Check :size="14" /> Redraft and dynasty
            </span>
          </div>
        </div>

        <TradeFinderPreview />
      </div>
    </section>

    <section class="border-y bg-muted/25">
      <div
        class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[0.72fr_1.28fr]"
      >
        <div class="lg:sticky lg:top-24 lg:self-start">
          <p class="text-sm font-medium text-primary">From search to offer</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Find the starting point, then make it yours
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            Trade Finder handles discovery. Trade Lab handles negotiation. The
            handoff keeps the original reasoning visible while you adjust the
            package.
          </p>
        </div>

        <ol class="overflow-hidden border divide-y rounded-card bg-background">
          <li
            v-for="step in workflow"
            :key="step.number"
            class="grid gap-4 p-6 sm:grid-cols-[3rem_minmax(0,1fr)] sm:p-7"
          >
            <span class="text-sm font-semibold text-primary">{{
              step.number
            }}</span>
            <div>
              <h3 class="text-lg font-semibold">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                {{ step.description }}
              </p>
              <p class="pt-3 mt-4 text-xs border-t text-primary">
                {{ step.detail }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section>
      <div class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
        <div
          class="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-center"
        >
          <div>
            <p class="text-sm font-medium text-primary">
              Why a suggestion appears
            </p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight">
              Balance is necessary. Mutual improvement is the filter.
            </h2>
            <p class="mt-4 leading-7 text-muted-foreground">
              Trade Finder does not show every mathematically similar exchange.
              A result has to stay close in league-adjusted value and improve
              both projected lineups.
            </p>

            <div class="mt-8 overflow-hidden border divide-y rounded-card bg-background">
              <article
                v-for="signal in evaluationSignals"
                :key="signal.label"
                class="grid gap-3 p-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]"
              >
                <component
                  :is="signal.icon"
                  :size="17"
                  class="mt-0.5 text-primary"
                />
                <div>
                  <h3 class="text-sm font-semibold">{{ signal.label }}</h3>
                  <p class="mt-1 text-xs leading-5 text-muted-foreground">
                    {{ signal.description }}
                  </p>
                </div>
                <span class="text-xs font-medium text-right text-primary">{{
                  signal.value
                }}</span>
              </article>
            </div>
          </div>

          <div class="overflow-hidden border shadow-lg rounded-xl bg-card">
            <div
              class="flex items-center justify-between gap-4 px-5 py-4 border-b bg-muted/15"
            >
              <div>
                <p class="text-xs text-muted-foreground">Trade Lab</p>
                <h3 class="mt-1 font-semibold">Adjust the suggested package</h3>
              </div>
              <Badge variant="success">98% match</Badge>
            </div>
            <div class="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div class="p-5">
                <p class="text-xs font-medium text-muted-foreground">
                  Bijan Mustard receives
                </p>
                <div class="p-3 mt-3 border rounded-lg bg-muted/20">
                  <p class="font-semibold">Ja’Marr Chase</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    WR1 · CIN · Value 94.0
                  </p>
                </div>
                <button
                  type="button"
                  class="w-full py-2 mt-2 text-xs border border-dashed rounded-lg text-muted-foreground"
                  tabindex="-1"
                >
                  + Add another asset
                </button>
                <p class="mt-4 text-sm font-semibold text-success">
                  +1.8 projected pts/week
                </p>
              </div>
              <div class="p-5">
                <p class="text-xs font-medium text-muted-foreground">
                  Ja’Marr the Merrier receives
                </p>
                <div class="p-3 mt-3 border rounded-lg bg-muted/20">
                  <p class="font-semibold">Bijan Robinson</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    RB1 · ATL · Value 92.0
                  </p>
                </div>
                <button
                  type="button"
                  class="w-full py-2 mt-2 text-xs border border-dashed rounded-lg text-muted-foreground"
                  tabindex="-1"
                >
                  + Add another asset
                </button>
                <p class="mt-4 text-sm font-semibold text-success">
                  +1.3 projected pts/week
                </p>
              </div>
            </div>
            <div
              class="flex flex-col gap-4 px-5 py-4 border-t bg-muted/15 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <ListChecks :size="15" class="text-primary" />
                Recalculates as the package changes
              </p>
              <Button as-child size="sm" variant="secondary">
                <RouterLink :to="analyzeRoute">
                  Try Trade Finder <ArrowRight :size="14" class="ml-1.5" />
                </RouterLink>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
      <div
        class="grid gap-8 p-7 overflow-hidden border rounded-feature bg-card sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center"
      >
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles :size="17" /> Premium discovery tool
          </div>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Connect the league for free. Upgrade when you want the full search.
          </h2>
          <p class="mt-3 leading-7 text-muted-foreground">
            Free league analysis includes a preview of league-specific Player
            Values. Premium unlocks the complete rankings and Trade Finder’s
            league-wide suggestion search.
          </p>
          <div class="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-muted-foreground">
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Sleeper and ESPN</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Redraft and dynasty</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Editable suggestions</span
            >
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Button as-child size="lg">
            <RouterLink :to="analyzeRoute">Analyze your league</RouterLink>
          </Button>
          <Button as-child size="lg" variant="outline">
            <RouterLink to="/fantasy-football-player-values">
              Preview Player Values
            </RouterLink>
          </Button>
        </div>
      </div>
    </section>

    <section class="max-w-4xl px-5 pb-16 mx-auto sm:pb-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">
        Fantasy football Trade Finder questions
      </h2>
      <Accordion type="single" collapsible class="mt-8 border-t">
        <AccordionItem
          v-for="faq in faqs"
          :key="faq.question"
          :value="faq.question"
        >
          <AccordionTrigger class="text-left">{{
            faq.question
          }}</AccordionTrigger>
          <AccordionContent
            class="max-w-3xl text-sm leading-6 text-muted-foreground"
          >
            {{ faq.answer }}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>

    <section class="max-w-6xl px-5 pb-4 mx-auto">
      <div
        class="relative flex flex-col items-start gap-6 p-7 overflow-hidden border rounded-feature bg-primary text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-9"
      >
        <div
          aria-hidden="true"
          class="absolute rounded-full -right-20 -top-32 h-72 w-72 bg-white/10"
        ></div>
        <div class="relative">
          <h2 class="text-2xl font-semibold tracking-tight">
            See what trades are hiding in your league
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
            Connect a Sleeper or ESPN league, then use Premium Trade Finder to
            scan for balanced opportunities.
          </p>
        </div>
        <Button
          as-child
          size="lg"
          variant="secondary"
          class="relative shrink-0"
        >
          <RouterLink :to="analyzeRoute">Find trade ideas</RouterLink>
        </Button>
      </div>
    </section>
  </PublicPageShell>
</template>
