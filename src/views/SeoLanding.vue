<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LandingPage = {
  eyebrow: string;
  heading: string;
  introduction: string;
  benefits: string[];
  sectionHeading: string;
  sections: Array<{ title: string; body: string }>;
};

const route = useRoute();
const page = computed(() => route.meta.landingPage as LandingPage);

const analysisOutputs = [
  ["Power rankings", "Performance beyond win-loss record"],
  ["Expected wins", "Schedule-adjusted scoring context"],
  ["Playoff outlook", "Current odds and remaining paths"],
  ["Weekly reports", "Matchups turned into league stories"],
];

const steps = [
  ["01", "Add the league", "Use a Sleeper username or league ID. No spreadsheet or manual roster entry is required."],
  ["02", "Compare the context", "Review records alongside scoring, schedules, rosters, transactions, and playoff position."],
  ["03", "Share the story", "Bring the clearest rankings, recaps, and season takeaways back to the league chat."],
];
</script>

<template>
  <PublicPageShell>
    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-24">
      <div class="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center">
        <div>
          <Badge variant="secondary">{{ page.eyebrow }}</Badge>
          <h1 class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl">
            {{ page.heading }}
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            {{ page.introduction }}
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg">
              <RouterLink to="/">Analyze a Sleeper league</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink to="/fantasy-football-weekly-recap">Explore weekly recaps</RouterLink>
            </Button>
          </div>
        </div>

        <Card class="shadow-none">
          <CardHeader class="border-b">
            <CardTitle>A clearer view of the league</CardTitle>
            <CardDescription>One import, with the important context organized for you.</CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <dl class="divide-y">
              <div v-for="output in analysisOutputs" :key="output[0]" class="grid gap-1 px-6 py-4 sm:grid-cols-[9rem_1fr]">
                <dt class="text-sm font-medium">{{ output[0] }}</dt>
                <dd class="text-sm leading-6 text-muted-foreground">{{ output[1] }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div class="grid px-5 mx-auto max-w-6xl sm:grid-cols-3">
        <div v-for="(benefit, index) in page.benefits" :key="benefit" class="py-5 text-sm font-medium sm:px-6 sm:first:pl-0 sm:last:pr-0" :class="index > 0 ? 'border-t sm:border-l sm:border-t-0' : ''">
          {{ benefit }}
        </div>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-medium text-primary">League analysis</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">{{ page.sectionHeading }}</h2>
        <p class="mt-3 leading-7 text-muted-foreground">
          Useful league tools should answer a specific question and show enough context to trust the answer.
        </p>
      </div>
      <div class="grid gap-4 mt-8 md:grid-cols-2">
        <Card v-for="section in page.sections" :key="section.title" class="shadow-none">
          <CardHeader class="pb-3">
            <CardTitle class="text-lg">{{ section.title }}</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="leading-7 text-muted-foreground">{{ section.body }}</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="border-y">
      <div class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
        <div class="max-w-2xl">
          <p class="text-sm font-medium text-primary">How it works</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">From league ID to useful context</h2>
        </div>
        <ol class="grid gap-8 mt-10 md:grid-cols-3">
          <li v-for="step in steps" :key="step[0]" class="pt-5 border-t">
            <p class="text-sm font-medium text-muted-foreground">{{ step[0] }}</p>
            <h3 class="mt-3 text-lg font-semibold">{{ step[1] }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ step[2] }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
      <Card class="shadow-none">
        <CardContent class="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight">Analyze your Sleeper league</h2>
            <p class="max-w-2xl mt-2 leading-7 text-muted-foreground">
              Add a league and explore the complete set of rankings, projections, reports, and season context.
            </p>
          </div>
          <Button as-child size="lg" class="shrink-0">
            <RouterLink to="/">Get started free</RouterLink>
          </Button>
        </CardContent>
      </Card>
    </section>
  </PublicPageShell>
</template>
