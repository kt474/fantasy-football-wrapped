<script setup lang="ts">
import {
  BadgeCheck,
  ChartNoAxesCombined,
  History,
  ScanSearch,
} from "@lucide/vue";

import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import ManagerProfilesPreview from "@/components/seo/previews/ManagerProfilesPreview.vue";
import RivalryReportPreview from "@/components/seo/previews/RivalryReportPreview.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackPremiumJourneyStep } from "@/lib/analytics";

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

const evidence = [
  {
    icon: History,
    title: "Multi-season results",
    description:
      "Career records, scoring, playoff appearances, championships, and head-to-head matchups across every available season.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Manager tendencies",
    description:
      "Lineup efficiency, draft performance, trades, waiver activity, and scoring consistency supply the behavioral context.",
  },
  {
    icon: ScanSearch,
    title: "League-relative ranks",
    description:
      "A manager’s numbers are ranked against the people in that league before badges and descriptions are assigned.",
  },
];

const faqs = [
  {
    question: "Which seasons are included?",
    answer:
      "ffwrapped follows the available season history for a connected Sleeper or ESPN league. The exact depth depends on the platform data and linked seasons available for that league.",
  },
  {
    question: "How are manager badges selected?",
    answer:
      "Badges come from calculated thresholds and league-relative ranks, including championships, playoff rate, lineup efficiency, draft performance, trade value, and transaction activity.",
  },
  {
    question: "What goes into a rivalry report?",
    answer:
      "The comparison combines career results, scoring, championships, efficiency, expected wins, and the complete head-to-head record for the selected managers.",
  },
  {
    question: "Are profiles and rivalry reports Premium?",
    answer:
      "Yes. Premium unlocks generated manager profiles and rivalry reports for the leagues you manage. The underlying comparison statistics remain visible alongside the generated story.",
  },
];

const trackUnlockClick = (feature: "manager_profiles" | "rivalry_report") => {
  trackPremiumJourneyStep("premium_cta_clicked", {
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
      <section class="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          class="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/5 to-transparent"
        ></div>
        <div
          class="relative grid max-w-6xl gap-12 px-5 py-16 mx-auto sm:py-24 lg:grid-cols-[minmax(0,0.82fr)_minmax(500px,1.18fr)] lg:items-center"
        >
          <div>
            <Badge variant="secondary">Premium league history</Badge>
            <h1
              class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
            >
              Manager profiles built from the resume behind the record
            </h1>
            <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
              Turn seasons of results, lineup decisions, draft habits, trades,
              and waiver activity into a league-relative profile with the
              numbers still visible beside the story.
            </p>
            <div class="flex flex-wrap gap-3 mt-8">
              <Button as-child size="lg">
                <RouterLink
                  :to="profileRoute"
                  @click="trackUnlockClick('manager_profiles')"
                >
                  Unlock manager profiles
                </RouterLink>
              </Button>
              <Button as-child size="lg" variant="outline">
                <a href="#rivalry-report">See rivalry report</a>
              </Button>
            </div>
            <div
              class="flex flex-wrap mt-6 text-sm gap-x-5 gap-y-2 text-muted-foreground"
            >
              <span class="inline-flex items-center gap-1.5">
                <BadgeCheck :size="15" /> Sleeper and ESPN
              </span>
            </div>
          </div>

          <ManagerProfilesPreview />
        </div>
      </section>

      <section class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">
            The evidence underneath
          </p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            A point of view you can check against the league
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            The description is the final layer. League history is normalized and
            calculated first, so every profile stays attached to the manager’s
            real performance.
          </p>
        </div>

        <div
          class="grid gap-px mt-10 overflow-hidden border rounded-card bg-border md:grid-cols-3"
        >
          <article
            v-for="item in evidence"
            :key="item.title"
            class="p-6 bg-background sm:p-7"
          >
            <component :is="item.icon" :size="20" class="text-primary" />
            <h3 class="mt-5 text-lg font-semibold">{{ item.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              {{ item.description }}
            </p>
          </article>
        </div>
      </section>

      <section id="rivalry-report" class="border-y bg-muted/30 scroll-mt-20">
        <div
          class="grid max-w-6xl gap-12 px-5 py-16 mx-auto sm:py-20 lg:grid-cols-[minmax(0,0.72fr)_minmax(520px,1.28fr)] lg:items-center"
        >
          <div>
            <p class="text-sm font-medium text-primary">Rivalry reports</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight">
              Turn the head-to-head table into league lore
            </h2>
            <p class="mt-4 leading-7 text-muted-foreground">
              Pick any two managers and compare the complete résumé: titles,
              career record, scoring, efficiency, expected results, and every
              matchup they played against each other.
            </p>
            <p class="mt-4 leading-7 text-muted-foreground">
              The generated report explains where the numbers agree, where the
              rivalry breaks the pattern, and which bragging rights still
              survive the larger sample.
            </p>
            <Button as-child class="mt-7">
              <RouterLink
                :to="rivalryRoute"
                @click="trackUnlockClick('rivalry_report')"
              >
                Unlock rivalry reports
              </RouterLink>
            </Button>
          </div>

          <RivalryReportPreview />
        </div>
      </section>

      <section class="max-w-4xl px-5 py-16 mx-auto sm:py-20">
        <p class="text-sm font-medium text-primary">
          Frequently asked questions
        </p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Manager profile and rivalry questions
        </h2>
        <dl class="mt-8 border-t">
          <div
            v-for="faq in faqs"
            :key="faq.question"
            class="grid gap-2 py-5 border-b sm:grid-cols-[15rem_1fr]"
          >
            <dt class="font-medium">{{ faq.question }}</dt>
            <dd class="text-sm leading-6 text-muted-foreground">
              {{ faq.answer }}
            </dd>
          </div>
        </dl>
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
              Find the story hiding in your league history
            </h2>
            <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
              Premium unlocks manager profiles and rivalry reports across every
              Sleeper and ESPN league you manage.
            </p>
          </div>
          <Button
            as-child
            size="lg"
            variant="secondary"
            class="relative shrink-0"
          >
            <RouterLink
              :to="profileRoute"
              @click="trackUnlockClick('manager_profiles')"
            >
              Explore Premium
            </RouterLink>
          </Button>
        </div>
      </section>
    </article>
  </PublicPageShell>
</template>
