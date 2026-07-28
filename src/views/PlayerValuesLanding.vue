<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import PlayerValuesPreview from "@/components/seo/previews/PlayerValuesPreview.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListOrdered, RefreshCw, SlidersHorizontal } from "@lucide/vue";

const features = [
  {
    icon: SlidersHorizontal,
    title: "Adjusted to your league",
    description:
      "Scoring, league size, starting requirements, and positional scarcity shape every value.",
  },
  {
    icon: RefreshCw,
    title: "Redraft and dynasty",
    description:
      "Use rest-of-season production for redraft or blend long term market value with team direction in dynasty.",
  },
  {
    icon: ListOrdered,
    title: "Easy to compare",
    description:
      "Rank every rostered player together, then filter by position and inspect the numbers behind each value.",
  },
];

const analyzeRoute = {
  path: "/",
  query: {
    source: "player_values_landing",
    destination: "player_values",
  },
};
</script>

<template>
  <PublicPageShell>
    <section class="border-b">
      <div
        class="grid items-center gap-12 px-5 py-16 mx-auto max-w-7xl sm:py-24 lg:grid-cols-[minmax(0,0.78fr)_minmax(560px,1.22fr)]"
      >
        <div>
          <Badge variant="secondary">League adjusted rankings</Badge>
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            Fantasy football player values built for your league
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Rank every rostered player using your league’s format, scoring, and
            lineup requirements.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg">
              <RouterLink :to="analyzeRoute">Analyze your league</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink to="/fantasy-football-trade-finder">
                Explore Trade Finder
              </RouterLink>
            </Button>
          </div>
        </div>

        <PlayerValuesPreview />
      </div>
    </section>

    <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-medium text-primary">Values with context</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          See why the same player can be worth more in one league than another
        </h2>
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
            Replace the generic rankings with your league’s values
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-muted-foreground">
            Connect a league to preview its highest-valued players. Premium
            unlocks the complete rankings.
          </p>
        </div>
        <Button as-child size="lg" class="shrink-0">
          <RouterLink :to="analyzeRoute">View player values</RouterLink>
        </Button>
      </div>
    </section>
  </PublicPageShell>
</template>
