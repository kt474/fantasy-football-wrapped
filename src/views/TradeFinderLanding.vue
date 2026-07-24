<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Handshake, ScanSearch, TrendingUp } from "lucide-vue-next";

const features = [
  {
    icon: ScanSearch,
    title: "Scan the whole league",
    description:
      "Compare your roster with every opponent to uncover deals you may not think to build manually.",
  },
  {
    icon: Handshake,
    title: "Look for mutual benefit",
    description:
      "Suggestions stay reasonably balanced and focus on trades that improve both projected starting lineups.",
  },
  {
    icon: TrendingUp,
    title: "Use league specific values",
    description:
      "Each search accounts for league settings, positional needs, player values, and redraft or dynasty format.",
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
        class="grid items-center gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[1.05fr_0.95fr]"
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

        <Card class="overflow-hidden shadow-lg">
          <CardContent class="p-0">
            <div class="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p class="text-xs text-muted-foreground">Sample suggestion</p>
                <h2 class="mt-1 font-semibold">
                  Breece's Puffs / Fourth &amp; Goal
                </h2>
              </div>
              <Badge variant="success">94% fair</Badge>
            </div>
            <div class="grid grid-cols-2 divide-x">
              <div class="p-5">
                <p class="text-xs text-muted-foreground">
                  Breece's Puffs sends
                </p>
                <p class="mt-3 font-medium">WR8 + RB24</p>
                <p class="mt-4 text-sm font-semibold text-success">
                  +2.7 projected pts/wk
                </p>
              </div>
              <div class="p-5">
                <p class="text-xs text-muted-foreground">
                  Fourth &amp; Goal sends
                </p>
                <p class="mt-3 font-medium">RB10</p>
                <p class="mt-4 text-sm font-semibold text-success">
                  +1.9 projected pts/wk
                </p>
              </div>
            </div>
            <div class="px-5 py-4 text-sm border-t bg-muted/30">
              Balanced value with a better projected lineup for both managers.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-medium text-primary">
          Beyond a trade calculator
        </p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Start with useful trade ideas, not an empty builder
        </h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          A calculator evaluates a deal you already have. Trade Finder searches
          the league for realistic starting points, then lets you open a
          suggestion in Trade Lab and adjust the package.
        </p>
      </div>
      <div class="grid gap-4 mt-9 md:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="p-6 border rounded-card"
        >
          <component :is="feature.icon" :size="20" class="text-primary" />
          <h3 class="mt-5 text-lg font-semibold">{{ feature.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ feature.description }}
          </p>
        </article>
      </div>
    </section>

    <section class="max-w-6xl px-5 pb-4 mx-auto">
      <div
        class="flex flex-col items-start gap-6 border p-7 rounded-feature bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:p-9"
      >
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">
            See what trades are hiding in your league
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-muted-foreground">
            Connect a Sleeper or ESPN league, then use Premium Trade Finder to
            scan for balanced opportunities.
          </p>
        </div>
        <Button as-child size="lg" class="shrink-0">
          <RouterLink :to="analyzeRoute">Find trade ideas</RouterLink>
        </Button>
      </div>
    </section>
  </PublicPageShell>
</template>
