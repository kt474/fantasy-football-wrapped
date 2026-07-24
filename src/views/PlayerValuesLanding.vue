<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListOrdered, RefreshCw, SlidersHorizontal } from "lucide-vue-next";

const rankings = [
  {
    rank: 1,
    initials: "JC",
    player: "Ja’Marr Chase",
    detail: "WR · CIN",
    value: "92.4",
    tier: "Elite",
  },
  {
    rank: 2,
    initials: "BR",
    player: "Bijan Robinson",
    detail: "RB · ATL",
    value: "87.1",
    tier: "Elite",
  },
  {
    rank: 3,
    initials: "JA",
    player: "Josh Allen",
    detail: "QB · BUF",
    value: "78.6",
    tier: "High",
  },
  {
    rank: 4,
    initials: "BB",
    player: "Brock Bowers",
    detail: "TE · LV",
    value: "65.2",
    tier: "High",
  },
];

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
        class="grid items-center gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[1.05fr_0.95fr]"
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

        <Card class="overflow-hidden shadow-lg">
          <CardContent class="p-0">
            <div class="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p class="text-xs text-muted-foreground">Sample league</p>
                <h2 class="mt-1 font-semibold">Player value rankings</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  12-team PPR · Example values
                </p>
              </div>
              <Badge variant="outline">All positions</Badge>
            </div>
            <div
              v-for="player in rankings"
              :key="player.rank"
              class="grid grid-cols-[2rem_2.5rem_1fr_auto] items-center gap-3 px-5 py-4 border-b last:border-b-0"
            >
              <p class="font-semibold">#{{ player.rank }}</p>
              <span
                class="inline-flex items-center justify-center text-xs font-semibold rounded-full size-9 bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                {{ player.initials }}
              </span>
              <div>
                <p class="font-medium">{{ player.player }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ player.detail }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold tabular-nums">{{ player.value }}</p>
                <p class="mt-1 text-xs text-primary">{{ player.tier }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
