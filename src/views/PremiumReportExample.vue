<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import PremiumReportContent from "@/components/weekly_report/PremiumReportContent.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import premiumReportExampleJson from "@/data/premiumReportExample.json";
import type { SharedReportResponse } from "@/api/api";
import { ArrowLeft, Check, FileText, ShieldCheck } from "lucide-vue-next";

const premiumReportExample = premiumReportExampleJson as SharedReportResponse;

const reportOutline = [
  {
    label: "Front page",
    detail: "Championship headline and week-wide lead",
  },
  {
    label: "Matchup reports",
    detail: `${premiumReportExample.report.matchupReports.length} games covered individually`,
  },
  {
    label: "Team of the Week",
    detail: premiumReportExample.report.teamOfTheWeek.teamName,
  },
  {
    label: "Weekly lowlights",
    detail: `${premiumReportExample.report.weeklyLowlights.entries.length} decisions and performances reviewed`,
  },
];

const reportNotes = [
  {
    term: "Preserved for the example",
    description:
      "The report structure, team names, scores, headlines, matchup analysis, Team of the Week, and weekly lowlights appear as generated.",
  },
  {
    term: "Removed before publishing",
    description:
      "The underlying Sleeper league identifier is omitted, so the public example cannot be used to open the source league.",
  },
  {
    term: "Calculated by ffwrapped",
    description:
      "Matchup results, player scoring, lineup context, standings implications, and eligible lineup decisions were structured before AI wrote the copy.",
  },
];
</script>

<template>
  <PublicPageShell>
    <article>
      <header class="border-b">
        <div class="grid gap-12 px-5 py-14 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <RouterLink
              class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              to="/fantasy-football-weekly-recap"
            >
              <ArrowLeft :size="15" /> Weekly recap guide
            </RouterLink>
            <div class="max-w-4xl mt-7">
              <Badge variant="secondary">Premium report example</Badge>
              <h1 class="mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
                Fantasy football weekly recap example: championship week
              </h1>
              <p class="max-w-3xl mt-5 text-lg leading-8 text-muted-foreground">
                A complete anonymized sample Premium report for a Sleeper league, including every Week 17 matchup and the championship story that connected them.
              </p>
            </div>
          </div>

          <dl class="grid grid-cols-3 overflow-hidden border rounded-card lg:grid-cols-1 lg:divide-y">
            <div class="p-4 text-center lg:flex lg:items-baseline lg:justify-between lg:text-left">
              <dt class="text-xs text-muted-foreground">Season</dt>
              <dd class="mt-1 font-semibold tabular-nums lg:mt-0">{{ premiumReportExample.season }}</dd>
            </div>
            <div class="p-4 text-center border-l lg:flex lg:items-baseline lg:justify-between lg:border-l-0 lg:text-left">
              <dt class="text-xs text-muted-foreground">Week</dt>
              <dd class="mt-1 font-semibold tabular-nums lg:mt-0">{{ premiumReportExample.week }}</dd>
            </div>
            <div class="p-4 text-center border-l lg:flex lg:items-baseline lg:justify-between lg:border-l-0 lg:text-left">
              <dt class="text-xs text-muted-foreground">Matchups</dt>
              <dd class="mt-1 font-semibold tabular-nums lg:mt-0">{{ premiumReportExample.report.matchupReports.length }}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section class="bg-muted/30 border-b">
        <div class="flex flex-col gap-5 px-5 py-6 mx-auto max-w-6xl sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <ShieldCheck :size="20" class="mt-0.5 text-primary shrink-0" />
            <div>
              <h2 class="text-sm font-semibold">Anonymized published example</h2>
              <p class="max-w-2xl mt-1 text-sm leading-6 text-muted-foreground">
                Report copy and team names are preserved; the source league identifier is not. Statistics were normalized and calculated before writing.
              </p>
            </div>
          </div>
          <Button as-child variant="outline" class="bg-background shrink-0">
            <RouterLink to="/">Analyze your league</RouterLink>
          </Button>
        </div>
      </section>

      <section class="grid gap-8 px-5 py-12 mx-auto max-w-6xl sm:py-16 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside class="lg:sticky lg:top-24 lg:self-start" aria-label="Report contents">
          <div class="flex items-center gap-2">
            <FileText :size="16" class="text-primary" />
            <h2 class="text-sm font-semibold">In this report</h2>
          </div>
          <ol class="grid gap-4 mt-5 sm:grid-cols-2 lg:grid-cols-1">
            <li v-for="(section, index) in reportOutline" :key="section.label" class="flex gap-3">
              <span class="pt-0.5 text-xs font-medium text-muted-foreground">0{{ index + 1 }}</span>
              <div>
                <p class="text-sm font-medium">{{ section.label }}</p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ section.detail }}</p>
              </div>
            </li>
          </ol>
          <div class="pt-5 mt-6 border-t text-xs leading-5 text-muted-foreground">
            {{ premiumReportExample.leagueName }}<br />
            {{ premiumReportExample.season }} season · Week {{ premiumReportExample.week }}
          </div>
        </aside>

        <Card class="overflow-hidden shadow-none">
          <div class="flex items-center justify-between gap-4 px-5 py-3 border-b bg-muted/30">
            <p class="text-xs font-medium tracking-wide uppercase text-muted-foreground">Full published report</p>
            <Badge variant="outline" class="font-normal">Complete example</Badge>
          </div>
          <CardContent class="p-5 sm:p-8 lg:p-10">
            <PremiumReportContent :report="premiumReportExample.report" />
          </CardContent>
        </Card>
      </section>

      <section class="border-y bg-muted/30">
        <div class="grid gap-10 px-5 py-14 mx-auto max-w-6xl sm:py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p class="text-sm font-medium text-primary">About this example</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight">
              Real enough to evaluate, private enough to publish
            </h2>
            <p class="mt-4 leading-7 text-muted-foreground">
              This page shows the finished product and the boundaries around the sample, so you can judge both the depth of the report and how its facts were handled.
            </p>
          </div>

          <dl class="border-t">
            <div v-for="note in reportNotes" :key="note.term" class="grid gap-2 py-5 border-b sm:grid-cols-[12rem_1fr]">
              <dt class="flex items-start gap-2 text-sm font-medium">
                <Check :size="15" class="mt-0.5 text-primary shrink-0" />
                {{ note.term }}
              </dt>
              <dd class="text-sm leading-6 text-muted-foreground">{{ note.description }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="px-5 pt-14 mx-auto max-w-6xl sm:pt-16">
        <div class="relative flex flex-col items-start gap-6 p-7 overflow-hidden border rounded-feature bg-primary text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div aria-hidden="true" class="absolute rounded-full -right-20 -top-32 h-72 w-72 bg-white/10"></div>
          <div class="relative">
            <h2 class="text-2xl font-semibold tracking-tight">Create a report for your own league</h2>
            <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
              Connect a Sleeper or ESPN league, choose a completed week, and generate a report ready for the league chat.
            </p>
          </div>
          <div class="relative flex flex-wrap gap-3 shrink-0">
            <Button as-child size="lg" variant="secondary">
              <RouterLink to="/">Analyze your league</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline" class="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <RouterLink to="/fantasy-football-weekly-recap">How reports work</RouterLink>
            </Button>
          </div>
        </div>
        <p class="mt-5 text-xs leading-5 text-muted-foreground">
          AI-generated report. Information provided may not always be accurate. Published for product demonstration and search discovery.
        </p>
      </section>
    </article>
  </PublicPageShell>
</template>
