<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import PremiumReportContent from "@/components/weekly_report/PremiumReportContent.vue";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { premiumReportPreview } from "@/lib/premiumReportSample";
import {
  ArrowRight,
  Calculator,
  Check,
  Database,
  MessageSquareText,
  ScanSearch,
} from "lucide-vue-next";

const reportAnatomy = [
  {
    number: "01",
    title: "Front page",
    label: "The week in one story",
    description:
      "The lead identifies the result that changed the league most, then connects it to the playoff race, a streak, or a decision that mattered.",
    contents: "Headline · subheadline · league-wide lead",
  },
  {
    number: "02",
    title: "Matchup desk",
    label: "Every result gets its context",
    description:
      "Each matchup recap covers the score, weekly scoring rank, decisive players, standings effect, and whether the margin was routine or unusual.",
    contents: "Scores · performers · rank movement · margin",
  },
  {
    number: "03",
    title: "Decision review",
    label: "Bench regret, checked for legality",
    description:
      "Lineup analysis only calls out swaps that fit the original roster slots, and separates harmless missed points from a choice that flipped the result.",
    contents: "Eligible swaps · efficiency · points left · result impact",
  },
  {
    number: "04",
    title: "Closing columns",
    label: "The performances people remember",
    description:
      "Team of the Week rewards the strongest complete performance; lowlights capture collapses, costly moves, and the week’s most painful outliers.",
    contents: "Team of the Week · lowlights · waiver impact",
  },
];

const reportPipeline = [
  {
    icon: Database,
    title: "Import",
    description:
      "Completed matchups, starters, benches, standings, scoring rules, and available transaction data arrive from Sleeper or ESPN.",
  },
  {
    icon: ScanSearch,
    title: "Normalize",
    description:
      "Platform-specific data becomes one consistent view of teams, players, roster slots, scores, and completed league activity.",
  },
  {
    icon: Calculator,
    title: "Calculate",
    description:
      "ffwrapped works out scoring rank, lineup efficiency, legal swaps, streaks, season averages, and standings movement before writing begins.",
  },
  {
    icon: MessageSquareText,
    title: "Write",
    description:
      "Structured facts become a Standard summary or a Premium report in the selected voice, ready to copy, publish, or turn into a video recap.",
  },
];

const reportComparison = [
  {
    area: "Weekly overview",
    standard: "Concise AI summary with scores, chart, and performers",
    premium: "Front-page story plus a complete league-wide narrative",
  },
  {
    area: "Matchup coverage",
    standard: "Scores and weekly scoring context",
    premium: "A written recap for every matchup",
  },
  {
    area: "Manager context",
    standard: "Bench performers and weekly awards",
    premium: "Legal lineup swaps, efficiency, standings movement, and streaks",
  },
  {
    area: "Presentation",
    standard: "Copyable summary and share card",
    premium: "Four voices, public report link, and video recap",
  },
];

const sampleStorylines = [
  {
    label: "Playoff race",
    title: "Breece's Puffs escapes onto the cutoff",
    detail: "132.60–128.80",
  },
  {
    label: "Team of the Week",
    title: "Bijan Mustard turns a matchup into a warning",
    detail: "156.42 points · Four starters above 20",
  },
  {
    label: "Decision that mattered",
    title: "Lamario Kart benches the winning points",
    detail: "11.40-point miss · 3.20-point loss",
  },
];

const faqs = [
  {
    question: "Which fantasy football platforms are supported?",
    answer:
      "ffwrapped supports Sleeper and ESPN fantasy football leagues. Sleeper leagues can be added by league ID or username, while ESPN leagues can be imported through the ESPN flow in the app.",
  },
  {
    question: "When is a weekly recap available?",
    answer:
      "A recap can be generated after the selected fantasy week has completed scoring and the league platform has finalized its matchup data.",
  },
  {
    question: "Is the weekly recap generator free?",
    answer:
      "The Standard weekly report and the core ffwrapped league-analysis experience are free. Premium adds the longer newspaper-style report, deeper manager context, customizable commentary, sharing, and video options.",
  },
  {
    question: "What league data goes into a report?",
    answer:
      "Reports can use matchup results, starters and bench scoring, weekly scoring rank, records, standings movement, streaks, lineup efficiency, season averages, playoff context, and completed waiver activity when available.",
  },
  {
    question: "Do league mates need Premium to read a shared report?",
    answer:
      "No. A Premium user can publish a report link and share it with the entire league. Recipients can read that report without purchasing Premium.",
  },
  {
    question: "Does AI calculate the matchup statistics?",
    answer:
      "No. The application calculates and normalizes the underlying league facts first. AI turns that structured context into the written report.",
  },
];
</script>

<template>
  <PublicPageShell>
    <section
      class="relative max-w-6xl px-5 py-16 mx-auto overflow-hidden sm:py-24"
    >
      <div
        class="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-center"
      >
        <div>
          <Badge variant="secondary">Sleeper and ESPN leagues</Badge>
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            Fantasy football weekly recaps your league will actually read
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Turn matchup results, lineup decisions, standings changes, and the
            week’s best performances into a polished report and short form video
            built from your league data.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg">
              <RouterLink to="/">Generate your recap</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink to="/fantasy-football-weekly-recap-example"
                >Read a full example</RouterLink
              >
            </Button>
          </div>
          <p class="mt-5 text-sm text-muted-foreground">
            13,000+ leagues added · Free Standard reports · No spreadsheet setup
          </p>
        </div>

        <Card class="overflow-hidden shadow-none">
          <CardHeader class="border-b">
            <CardDescription>Sample report · Week 8</CardDescription>
            <CardTitle class="text-2xl leading-tight text-pretty">
              {{ premiumReportPreview.frontPage.headline }}
            </CardTitle>
          </CardHeader>
          <CardContent class="pt-4">
            <div class="overflow-hidden border rounded-card">
              <article
                v-for="storyline in sampleStorylines"
                :key="storyline.label"
                class="px-4 py-3 border-b last:border-b-0"
              >
                <div class="flex items-center justify-between gap-4">
                  <p class="text-xs font-medium text-primary">
                    {{ storyline.label }}
                  </p>
                  <p
                    class="text-xs text-right text-muted-foreground tabular-nums"
                  >
                    {{ storyline.detail }}
                  </p>
                </div>
                <h3 class="mt-1 text-sm font-semibold leading-5">
                  {{ storyline.title }}
                </h3>
              </article>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
        <div
          class="grid gap-10 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]"
        >
          <div>
            <p class="text-sm font-medium text-primary">
              Premium report preview
            </p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight">
              A league newspaper grounded in the numbers
            </h2>
            <p class="mt-4 leading-7 text-muted-foreground">
              The structure keeps the biggest story, matchup details, standout
              team, and manager decisions easy to scan and share.
            </p>
          </div>
          <Card class="relative max-h-[400px] overflow-hidden shadow-none">
            <CardContent class="p-5 sm:p-7">
              <PremiumReportContent :report="premiumReportPreview" />
            </CardContent>
            <div
              aria-hidden="true"
              class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-card via-card/95 to-transparent"
            ></div>
            <div class="absolute inset-x-0 z-10 flex justify-center bottom-6">
              <Button as-child variant="outline" class="bg-card">
                <RouterLink to="/fantasy-football-weekly-recap-example"
                  >Read the complete example</RouterLink
                >
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>

    <section class="border-y">
      <div
        class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[0.68fr_1.32fr]"
      >
        <div class="lg:sticky lg:top-24 lg:self-start">
          <p class="text-sm font-medium text-primary">
            Anatomy of a Premium recap
          </p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Each section has a different job
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            The report moves from the week’s central story to matchup evidence,
            manager choices, and the moments worth carrying into the league
            chat.
          </p>
        </div>

        <ol class="border-t">
          <li
            v-for="part in reportAnatomy"
            :key="part.number"
            class="grid gap-4 py-7 border-b sm:grid-cols-[3rem_minmax(0,1fr)]"
          >
            <p class="pt-1 text-xs font-medium text-muted-foreground">
              {{ part.number }}
            </p>
            <div>
              <div
                class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
              >
                <h3 class="text-xl font-semibold">{{ part.title }}</h3>
                <p class="text-xs text-primary">{{ part.contents }}</p>
              </div>
              <p class="mt-3 font-medium">{{ part.label }}</p>
              <p class="mt-2 leading-7 text-muted-foreground">
                {{ part.description }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="max-w-2xl">
          <p class="text-sm font-medium text-primary">Standard and Premium</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Two report depths, clearly separated
          </h2>
        </div>
        <p class="max-w-sm text-sm leading-6 text-muted-foreground">
          Standard covers the weekly snapshot. Premium turns the same verified
          league data into a publication.
        </p>
      </div>

      <div class="overflow-hidden border mt-9 rounded-card">
        <div
          class="hidden grid-cols-[0.55fr_1fr_1fr] border-b bg-muted/40 text-sm font-medium md:grid"
        >
          <div class="p-4">Coverage</div>
          <div class="p-4 border-l">Standard · Free</div>
          <div class="flex items-center justify-between gap-3 p-4 border-l">
            <span>Premium · Full report</span>
            <Badge>Most detail</Badge>
          </div>
        </div>
        <div
          v-for="row in reportComparison"
          :key="row.area"
          class="grid border-b last:border-b-0 md:grid-cols-[0.55fr_1fr_1fr]"
        >
          <div class="p-4 text-sm font-medium bg-muted/20 md:bg-transparent">
            {{ row.area }}
          </div>
          <div class="p-4 text-sm leading-6 text-muted-foreground md:border-l">
            <span
              class="block mb-1 text-xs font-medium md:hidden text-foreground"
              >Standard</span
            >
            {{ row.standard }}
          </div>
          <div class="p-4 text-sm leading-6 border-t md:border-l md:border-t-0">
            <span class="block mb-1 text-xs font-medium md:hidden text-primary"
              >Premium</span
            >
            {{ row.premium }}
          </div>
        </div>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">How a report is made</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Calculation first. Commentary second.
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            AI does not decide what the score was, invent a legal lineup swap,
            or guess who moved in the standings. Those facts are prepared before
            the writing step.
          </p>
        </div>

        <ol
          class="grid mt-10 overflow-hidden border divide-y rounded-card bg-background lg:grid-cols-4 lg:divide-x lg:divide-y-0"
        >
          <li
            v-for="(stage, index) in reportPipeline"
            :key="stage.title"
            class="relative p-6"
          >
            <div class="flex items-center justify-between">
              <component :is="stage.icon" :size="19" class="text-primary" />
              <ArrowRight
                v-if="index < reportPipeline.length - 1"
                :size="16"
                class="hidden text-muted-foreground lg:block"
              />
            </div>
            <h3 class="mt-5 font-semibold">{{ stage.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              {{ stage.description }}
            </p>
          </li>
        </ol>

        <div
          class="flex flex-wrap mt-6 text-sm gap-x-6 gap-y-2 text-muted-foreground"
        >
          <span class="inline-flex items-center gap-2"
            ><Check :size="15" /> Roster-slot-aware decisions</span
          >
          <span class="inline-flex items-center gap-2"
            ><Check :size="15" /> Week and season context</span
          >
          <span class="inline-flex items-center gap-2"
            ><Check :size="15" /> Shareable without a reader subscription</span
          >
        </div>
      </div>
    </section>

    <section class="max-w-4xl px-5 py-16 mx-auto sm:py-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">
        Fantasy football recap questions
      </h2>
      <Card class="mt-8 shadow-none">
        <CardContent class="px-6 py-2">
          <Accordion type="single" collapsible>
            <AccordionItem
              v-for="(faq, index) in faqs"
              :key="faq.question"
              :value="`faq-${index}`"
              :class="index === faqs.length - 1 ? 'border-b-0' : ''"
            >
              <AccordionTrigger class="text-left">{{
                faq.question
              }}</AccordionTrigger>
              <AccordionContent class="leading-6 text-muted-foreground">{{
                faq.answer
              }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </section>

    <section class="max-w-6xl px-5 pb-4 mx-auto">
      <div
        class="relative flex flex-col items-start gap-6 overflow-hidden border p-7 rounded-feature bg-primary text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-9"
      >
        <div
          aria-hidden="true"
          class="absolute rounded-full -right-20 -top-32 h-72 w-72 bg-white/10"
        ></div>
        <div class="relative">
          <h2 class="text-2xl font-semibold tracking-tight">
            Give this week the recap it deserves
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
            Connect a Sleeper or ESPN league and turn its latest completed
            matchups into a report for the whole league.
          </p>
        </div>
        <Button
          as-child
          size="lg"
          variant="secondary"
          class="relative shrink-0"
        >
          <RouterLink to="/">Analyze your league</RouterLink>
        </Button>
      </div>
    </section>
  </PublicPageShell>
</template>
