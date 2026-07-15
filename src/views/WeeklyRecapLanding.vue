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

const reportFeatures = [
  {
    title: "Every matchup, in context",
    description:
      "Close calls, blowouts, standout starters, scoring rank, and the result’s place in the wider week.",
  },
  {
    title: "Manager decisions",
    description:
      "Legal bench swaps, points left unused, lineup efficiency, and decisions large enough to change a result.",
  },
  {
    title: "Standings consequences",
    description:
      "Records, rank movement, streaks, playoff position, and the season story around every manager.",
  },
  {
    title: "Weekly recognition",
    description:
      "Team of the Week, painful losses, one-player carries, lucky escapes, and memorable performances.",
  },
  {
    title: "A voice that fits the league",
    description:
      "Roast, neutral, newspaper, or cutthroat commentary without changing the underlying facts.",
  },
  {
    title: "Simple sharing",
    description:
      "Copy the recap, save a share card, or publish a report link league mates can open without Premium.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect the league",
    description:
      "Enter a Sleeper league or import an ESPN league. ffwrapped organizes the matchup, roster, standings, and scoring data.",
  },
  {
    number: "02",
    title: "Choose the week",
    description:
      "Open Weekly Report, select a completed week, and choose Standard or a Premium commentary style.",
  },
  {
    number: "03",
    title: "Generate and share",
    description:
      "Review the finished recap, copy it into the league chat, save the share card, or publish the full report.",
  },
];

const standardFeatures = [
  "AI-written weekly summary",
  "Top and bottom performers",
  "Bench performers and weekly awards",
  "Matchup scores and weekly points chart",
];

const premiumFeatures = [
  "League-newspaper presentation",
  "Detailed matchup-by-matchup reporting",
  "Lineup efficiency and manager decisions",
  "Standings movement, streaks, and season averages",
  "Waiver impact when transaction data is available",
  "Four commentary styles, report links, and audio recap",
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

const methodology = [
  [
    "Real league context",
    "Team names, player scoring, records, lineup choices, and completed league activity.",
  ],
  [
    "Legal lineup decisions",
    "Bench analysis respects roster slots so every suggested swap was actually possible.",
  ],
  [
    "Week and season together",
    "Results are connected to rank movement, records, streaks, averages, and playoff context.",
  ],
  [
    "Structured before generation",
    "The underlying facts are normalized and calculated before AI writes the report.",
  ],
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
      "The Standard weekly report and the core ffwrapped league-analysis experience are free. Premium adds the longer newspaper-style report, deeper manager context, customizable commentary, sharing, and audio options.",
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
    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-24">
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
            week’s best performances into a polished report built from your
            league data.
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

    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-medium text-primary">How it works</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          From final score to finished report
        </h2>
      </div>
      <ol class="grid gap-8 mt-10 md:grid-cols-3">
        <li v-for="step in steps" :key="step.number" class="pt-5 border-t">
          <p class="text-sm font-medium text-muted-foreground">
            {{ step.number }}
          </p>
          <h3 class="mt-3 text-lg font-semibold">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ step.description }}
          </p>
        </li>
      </ol>
    </section>

    <section class="border-y">
      <div class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
        <div class="max-w-2xl">
          <p class="text-sm font-medium text-primary">Inside every recap</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            The moments and decisions behind the scores
          </h2>
        </div>
        <div class="grid gap-4 mt-8 md:grid-cols-2 lg:grid-cols-3">
          <Card
            v-for="feature in reportFeatures"
            :key="feature.title"
            class="shadow-none"
          >
            <CardHeader class="pb-3">
              <CardTitle class="text-lg">{{ feature.title }}</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm leading-6 text-muted-foreground">
                {{ feature.description }}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-medium text-primary">Standard and Premium</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Choose how much of the week you want covered
        </h2>
      </div>
      <div class="grid gap-4 mt-8 lg:grid-cols-2">
        <Card class="shadow-none">
          <CardHeader>
            <CardTitle>Standard</CardTitle>
            <CardDescription
              >A useful weekly snapshot included in the free
              experience.</CardDescription
            >
          </CardHeader>
          <CardContent>
            <ul class="space-y-3 text-sm">
              <li
                v-for="feature in standardFeatures"
                :key="feature"
                class="pb-3 border-b last:border-0 last:pb-0"
              >
                {{ feature }}
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card class="shadow-none border-primary/40">
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <CardTitle>Premium</CardTitle>
              <Badge>Full report</Badge>
            </div>
            <CardDescription
              >A deeper publication for leagues that want the full
              story.</CardDescription
            >
          </CardHeader>
          <CardContent>
            <ul class="space-y-3 text-sm">
              <li
                v-for="feature in premiumFeatures"
                :key="feature"
                class="pb-3 border-b last:border-0 last:pb-0"
              >
                {{ feature }}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div
        class="grid gap-10 px-5 py-16 mx-auto max-w-6xl lg:grid-cols-[0.8fr_1.2fr] sm:py-20"
      >
        <div>
          <p class="text-sm font-medium text-primary">Methodology</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            The statistics are calculated before the story is written
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            ffwrapped prepares the matchup and lineup context first, then sends
            structured facts for report generation.
          </p>
        </div>
        <dl class="divide-y border-y">
          <div
            v-for="item in methodology"
            :key="item[0]"
            class="grid gap-2 py-4 sm:grid-cols-[11rem_1fr]"
          >
            <dt class="text-sm font-medium">{{ item[0] }}</dt>
            <dd class="text-sm leading-6 text-muted-foreground">
              {{ item[1] }}
            </dd>
          </div>
        </dl>
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
      <Card class="shadow-none">
        <CardContent
          class="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div>
            <h2 class="text-2xl font-semibold tracking-tight">
              Give this week the recap it deserves
            </h2>
            <p class="max-w-2xl mt-2 leading-7 text-muted-foreground">
              Connect a Sleeper or ESPN league and turn its latest completed
              matchups into a report for the whole league.
            </p>
          </div>
          <Button as-child size="lg" class="shrink-0">
            <RouterLink to="/">Analyze your league</RouterLink>
          </Button>
        </CardContent>
      </Card>
    </section>
  </PublicPageShell>
</template>
