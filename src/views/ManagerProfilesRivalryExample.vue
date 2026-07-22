<script setup lang="ts">
import { Swords } from "lucide-vue-next";

import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackPremiumFunnelEvent } from "@/lib/analytics";

const manager = {
  initials: "S",
  name: "Saquondo",
  seasons: 4,
  badges: ["Draft Room Menace", "Roster Never Sleeps"],
  profile:
    "Saquondo has been the league’s model of sustained menace, pairing the best scoring profile with a championship to back it up. The draft room clearly loves this manager, and the league-wide top draft ability ranking shows the foundation of the run is not luck or waiver scraping. They also stay active on waivers and turn that work into real production, even if the trade market has been more decorative than dangerous. The only real knock is that opponents have had chances to hang around, but when you finish first in points and first in hardware, that is a very polished problem to have.",
  stats: [
    { label: "Career record", value: "27–15" },
    { label: "Win rate", value: "64.3%" },
    { label: "Playoffs", value: "4 of 4" },
    { label: "Titles", value: "1" },
  ],
};

const profileRoute = {
  path: "/account",
  query: {
    intent: "manager_profiles",
    upgrade_source: "manager_profiles_rivalry_example",
  },
};

const rivalryRoute = {
  path: "/account",
  query: {
    intent: "rivalry_report",
    upgrade_source: "manager_profiles_rivalry_example",
  },
};

const trackUnlockClick = (feature: "manager_profiles" | "rivalry_report") => {
  trackPremiumFunnelEvent("premium_cta_clicked", {
    cta:
      feature === "manager_profiles"
        ? "unlock_manager_profiles"
        : "unlock_rivalry_reports",
    feature,
    source: "manager_profiles_rivalry_example",
  });
};
</script>

<template>
  <PublicPageShell>
    <article>
      <section class="max-w-6xl px-5 py-12 mx-auto sm:py-16">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">Manager profile sample</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight">
            A league résumé with an actual point of view
          </h1>
          <p class="mt-4 leading-7 text-muted-foreground">
            Each profile combines long-term results, playoff history, lineup
            efficiency, draft habits, trades, and waiver activity. The numbers
            stay visible next to the generated description, so the story can be
            checked against the record.
          </p>
        </div>

        <div class="max-w-3xl mt-8">
          <Card>
            <CardContent class="p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <div
                  class="flex items-center justify-center font-semibold rounded-full size-11 bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  {{ manager.initials }}
                </div>
                <div>
                  <h3 class="font-semibold">{{ manager.name }}</h3>
                  <p class="text-sm text-muted-foreground">
                    {{ manager.seasons }} seasons
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 mt-4">
                <Badge
                  v-for="badge in manager.badges"
                  :key="badge"
                  variant="secondary"
                >
                  {{ badge }}
                </Badge>
              </div>

              <p class="mt-4 text-sm leading-6">
                {{ manager.profile }}
              </p>

              <dl class="grid grid-cols-2 gap-3 mt-5">
                <div
                  v-for="stat in manager.stats"
                  :key="stat.label"
                  class="px-3 py-2 rounded-md bg-secondary"
                >
                  <dt
                    class="text-xs tracking-wide uppercase text-muted-foreground"
                  >
                    {{ stat.label }}
                  </dt>
                  <dd class="mt-1 text-sm font-medium">{{ stat.value }}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div class="flex justify-start mt-6">
          <Button as-child>
            <RouterLink
              :to="profileRoute"
              @click="trackUnlockClick('manager_profiles')"
            >
              Unlock your manager profiles
            </RouterLink>
          </Button>
        </div>
      </section>

      <section class="border-y bg-muted/30">
        <div class="max-w-6xl px-5 py-12 mx-auto sm:py-16">
          <div
            class="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start"
          >
            <div>
              <p class="text-sm font-medium text-primary">
                Rivalry report sample
              </p>
              <h2 class="mt-2 text-3xl font-semibold tracking-tight">
                Turn the head-to-head table into league lore
              </h2>
              <p class="mt-4 leading-7 text-muted-foreground">
                Choose any two managers to connect their record, scoring,
                efficiency, championships, closest games, and biggest blowouts
                across every available season.
              </p>

              <dl class="grid grid-cols-2 gap-3 mt-6 text-sm">
                <div class="p-3 border rounded-lg bg-background">
                  <dt class="text-muted-foreground">Head to head</dt>
                  <dd class="mt-1 font-semibold">Laporta leads 3–2</dd>
                </div>
                <div class="p-3 border rounded-lg bg-background">
                  <dt class="text-muted-foreground">Championships</dt>
                  <dd class="mt-1 font-semibold">Saquondo leads 1–0</dd>
                </div>
                <div class="p-3 border rounded-lg bg-background">
                  <dt class="text-muted-foreground">Closest game</dt>
                  <dd class="mt-1 font-semibold">1.18 points</dd>
                </div>
                <div class="p-3 border rounded-lg bg-background">
                  <dt class="text-muted-foreground">Biggest blowout</dt>
                  <dd class="mt-1 font-semibold">54.36 points</dd>
                </div>
              </dl>
            </div>

            <Card class="overflow-hidden shadow-none">
              <div
                class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b"
              >
                <div class="flex items-center gap-2">
                  <Swords :size="18" class="text-primary" />
                  <h3 class="font-semibold">The Regular-Season Reckoning</h3>
                </div>
                <Badge variant="outline">Complete sample</Badge>
              </div>
              <CardContent class="p-5 text-sm leading-7 sm:p-7 sm:text-base">
                <p>
                  <strong>Saquondo</strong> and
                  <strong>Laporta Potty</strong> have been running the same
                  league for years, but they’ve taken very different roads to
                  the same weekly chaos. <strong>Saquondo</strong> is the
                  steadier menace, with a title, four playoff trips, better
                  efficiency, and a healthier scoring floor that makes them look
                  like the manager who always has the right guy on the bench two
                  minutes before kickoff. <strong>Laporta Potty</strong>,
                  meanwhile, has the more dramatic résumé: fewer wins, no
                  trophy, one lonely playoff appearance, and a weekly profile
                  that swings like they’re drafting by horoscope. They’ve also
                  been busier on the trade market, but the extra dealing hasn’t
                  exactly turned into treasure, since the standings and the
                  title count still favor <strong>Saquondo</strong>. The
                  head-to-head record leans 3–2 toward
                  <strong>Laporta Potty</strong>, which is the kind of small
                  sample bragging rights that keep a rivalry deliciously
                  annoying. In short, <strong>Saquondo</strong> is the efficient
                  adult in the room, while <strong>Laporta Potty</strong> is the
                  impulsive chaos goblin who keeps insisting the next waiver
                  pickup is “different this time.”
                </p>
              </CardContent>
            </Card>
          </div>

          <div
            class="flex flex-col items-start gap-5 p-5 mt-8 border rounded-card bg-background sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div>
              <h2 class="text-xl font-semibold tracking-tight">
                Find the story hiding in your league history
              </h2>
              <p class="max-w-2xl mt-2 text-sm leading-6 text-muted-foreground">
                Premium unlocks manager profiles and rivalry reports across
                every Sleeper and ESPN league you manage.
              </p>
            </div>
            <Button as-child class="shrink-0">
              <RouterLink
                :to="rivalryRoute"
                @click="trackUnlockClick('rivalry_report')"
              >
                Unlock rivalry reports
              </RouterLink>
            </Button>
          </div>
        </div>
      </section>
    </article>
  </PublicPageShell>
</template>
