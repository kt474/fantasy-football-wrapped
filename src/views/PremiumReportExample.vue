<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import PremiumReportContent from "@/components/weekly_report/PremiumReportContent.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import premiumReportExampleJson from "@/data/premiumReportExample.json";
import type { SharedReportResponse } from "@/api/api";

const premiumReportExample = premiumReportExampleJson as SharedReportResponse;

const exampleHighlights = [
  {
    title: "Lead with the week’s real story",
    description: "The report opens with the championship result and the decisions that made it meaningful.",
  },
  {
    title: "Give every matchup a purpose",
    description: "Championship and placement games each receive their own concise, league-specific recap.",
  },
  {
    title: "Connect awards to evidence",
    description: "Team of the Week and weekly lowlights are explained with lineup and transaction context.",
  },
];
</script>

<template>
  <PublicPageShell>
    <article>
      <header class="px-5 py-14 mx-auto max-w-5xl sm:py-20">
        <RouterLink class="text-sm text-muted-foreground hover:text-foreground" to="/fantasy-football-weekly-recap">
          Weekly recap guide
        </RouterLink>
        <div class="max-w-4xl mt-7">
          <Badge variant="secondary">Premium report example</Badge>
          <h1 class="mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
            Fantasy football weekly recap example: championship week
          </h1>
          <p class="max-w-3xl mt-5 text-lg leading-8 text-muted-foreground">
            A complete AI-written report from an anonymized Sleeper league, including every Week 17 matchup, the championship story, Team of the Week, and weekly lowlights.
          </p>
          <p class="mt-5 text-sm text-muted-foreground">
            {{ premiumReportExample.leagueName }} · {{ premiumReportExample.season }} season · Week {{ premiumReportExample.week }}
          </p>
        </div>
      </header>

      <section class="border-y bg-muted/30">
        <div class="grid gap-6 px-5 py-8 mx-auto max-w-5xl sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 class="text-base font-semibold">Anonymized published example</h2>
            <p class="max-w-2xl mt-2 text-sm leading-6 text-muted-foreground">
              The report copy and team names are preserved while the underlying league identifier is omitted. Statistics were normalized and calculated before the report was written.
            </p>
          </div>
          <Button as-child>
            <RouterLink to="/">Analyze your league</RouterLink>
          </Button>
        </div>
      </section>

      <section class="px-5 py-12 mx-auto max-w-5xl sm:py-16">
        <Card class="shadow-none">
          <CardContent class="p-5 sm:p-8">
            <PremiumReportContent :report="premiumReportExample.report" />
          </CardContent>
        </Card>
      </section>

      <section class="border-y">
        <div class="px-5 py-14 mx-auto max-w-5xl sm:py-16">
          <div class="max-w-2xl">
            <p class="text-sm font-medium text-primary">What this example demonstrates</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight">A report should explain the week, not repeat the scoreboard</h2>
          </div>
          <ol class="grid gap-8 mt-9 md:grid-cols-3">
            <li v-for="(highlight, index) in exampleHighlights" :key="highlight.title" class="pt-5 border-t">
              <p class="text-sm font-medium text-muted-foreground">0{{ index + 1 }}</p>
              <h3 class="mt-3 text-lg font-semibold">{{ highlight.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ highlight.description }}</p>
            </li>
          </ol>
        </div>
      </section>

      <section class="px-5 pt-14 mx-auto max-w-5xl sm:pt-16">
        <Card class="shadow-none">
          <CardContent class="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight">Create a report for your league</h2>
              <p class="max-w-2xl mt-2 leading-7 text-muted-foreground">
                Connect a Sleeper or ESPN league, choose a completed week, and generate a report ready for the league chat.
              </p>
            </div>
            <div class="flex flex-wrap gap-3 shrink-0">
              <Button as-child size="lg">
                <RouterLink to="/">Analyze your league</RouterLink>
              </Button>
              <Button as-child size="lg" variant="outline">
                <RouterLink to="/fantasy-football-weekly-recap">How reports work</RouterLink>
              </Button>
            </div>
          </CardContent>
        </Card>
        <p class="mt-5 text-xs leading-5 text-muted-foreground">
          AI-generated report. Information provided may not always be accurate. Published for product demonstration and search discovery.
        </p>
      </section>
    </article>
  </PublicPageShell>
</template>
