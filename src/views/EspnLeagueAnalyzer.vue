<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Check,
  Database,
  History,
  LockKeyhole,
  Newspaper,
  ShieldCheck,
  Trophy,
} from "lucide-vue-next";

const importedData = [
  "League settings and scoring format",
  "Managers, rosters, and draft results",
  "Completed matchups and standings",
  "Season schedule and available history",
];

const calculatedViews = [
  {
    icon: BarChart3,
    title: "Power rankings",
    description:
      "Compare record with scoring, expected wins, schedule strength, and roster projections.",
  },
  {
    icon: Trophy,
    title: "Playoff and season forecast",
    description:
      "Estimate playoff probability, seed range, and the remaining paths through the schedule.",
  },
  {
    icon: Newspaper,
    title: "Weekly reports",
    description:
      "Turn ESPN matchup results and lineup decisions into a recap built for the league chat.",
  },
  {
    icon: History,
    title: "Draft and season review",
    description:
      "Revisit the draft, manager decisions, scoring trends, and the story the season produced.",
    href: "/fantasy-football-draft-grades",
  },
];

const connectionPaths = [
  {
    label: "Public ESPN league",
    requirement: "League ID + season",
    description:
      "Select Public, paste the league ID from ESPN, choose the season, and load the league directly.",
  },
  {
    label: "Private ESPN league",
    requirement: "League ID + SWID + espn_s2",
    description:
      "Use the guided credential steps while signed in to ESPN. Credentials are stored locally in your browser and sent through ffwrapped only when loading that league from ESPN.",
  },
];

const faqs = [
  {
    question: "Where do I find my ESPN fantasy football league ID?",
    answer:
      "Open the league in ESPN and look for the number following leagueId= in the page URL. Select the matching season in ffwrapped before importing.",
  },
  {
    question: "Can ffwrapped analyze a private ESPN league?",
    answer:
      "Yes. Private leagues require the SWID and espn_s2 values from the signed-in ESPN browser session in addition to the league ID and season.",
  },
  {
    question: "What happens to private ESPN credentials?",
    answer:
      "ffwrapped stores them locally in the browser and only sends them through its service to ESPN when loading the private league. They should be treated like a password.",
  },
  {
    question: "Does the ESPN analyzer replace the ESPN app?",
    answer:
      "No. ESPN remains the league platform. ffwrapped adds analysis, simulations, history views, and reports around the imported league data.",
  },
  {
    question: "Can I grade my ESPN fantasy football draft?",
    answer:
      "Yes. After a completed ESPN draft is available to import, open the Draft area to review the board, individual pick grades, and league relative team grades supported by the imported data.",
  },
];

const espnAnalysisRoute = {
  path: "/",
  query: { platform: "espn", source: "espn_analyzer_landing" },
};
</script>

<template>
  <PublicPageShell>
    <section class="relative overflow-hidden border-b">
      <div
        aria-hidden="true"
        class="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
      ></div>
      <div
        class="relative grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[minmax(0,1.04fr)_minmax(380px,0.96fr)] lg:items-center"
      >
        <div>
          <Badge variant="secondary">ESPN fantasy football tools</Badge>
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            An ESPN fantasy football league analyzer built for the whole season
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Import a public or private ESPN league, then explore power rankings,
            expected wins, playoff forecasts, draft results, weekly recaps, and
            manager trends in one place.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg"
              ><RouterLink :to="espnAnalysisRoute"
                >Analyze an ESPN league</RouterLink
              ></Button
            >
            <Button as-child size="lg" variant="outline"
              ><RouterLink to="/fantasy-football-weekly-recap"
                >Explore weekly recaps</RouterLink
              ></Button
            >
          </div>
          <div
            class="flex flex-wrap mt-6 text-sm gap-x-5 gap-y-2 text-muted-foreground"
          >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Public and private leagues</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Season-aware import</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> No spreadsheet setup</span
            >
          </div>
        </div>

        <div
          class="overflow-hidden border shadow-xl rounded-card bg-card shadow-black/10"
        >
          <div
            class="flex items-center justify-between gap-4 px-5 py-4 border-b"
          >
            <div class="flex items-center gap-3">
              <img
                src="/espnlogo.webp"
                width="28"
                height="28"
                alt="ESPN logo"
              />
              <div>
                <p class="text-xs text-muted-foreground">Connect league</p>
                <h2 class="font-semibold">ESPN Fantasy Football</h2>
              </div>
            </div>
            <Badge variant="outline" class="font-normal">2026 season</Badge>
          </div>
          <div class="p-5">
            <div
              class="inline-flex p-1 text-sm border rounded-control bg-muted/30"
            >
              <span
                class="px-4 py-1.5 rounded-sm bg-background shadow-sm font-medium"
                >Public</span
              >
              <span class="px-4 py-1.5 text-muted-foreground">Private</span>
            </div>
            <div class="flex gap-2 mt-4">
              <div
                class="flex-1 px-3 py-2 text-sm border rounded-control text-muted-foreground"
              >
                League ID
              </div>
              <div
                class="px-3 py-2 text-sm border rounded-control text-muted-foreground"
              >
                Season
              </div>
            </div>
            <div
              class="flex items-center justify-center h-10 mt-3 text-sm font-medium rounded-control bg-primary text-primary-foreground"
            >
              Load ESPN league
            </div>
          </div>
          <div class="grid grid-cols-3 border-t divide-x bg-muted/30">
            <div class="p-4 text-center">
              <p class="text-lg font-semibold">12</p>
              <p class="mt-1 text-xs text-muted-foreground">Teams</p>
            </div>
            <div class="p-4 text-center">
              <p class="text-lg font-semibold">PPR</p>
              <p class="mt-1 text-xs text-muted-foreground">Scoring</p>
            </div>
            <div class="p-4 text-center">
              <p class="text-lg font-semibold">14</p>
              <p class="mt-1 text-xs text-muted-foreground">Weeks</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="grid max-w-6xl gap-12 px-5 py-16 mx-auto sm:py-20 lg:grid-cols-2 lg:items-start"
    >
      <div>
        <p class="text-sm font-medium text-primary">From ESPN</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Bring the league structure with you
        </h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          The import supplies the facts ffwrapped needs to understand the league
          on its own terms.
        </p>
        <ul class="border-t mt-7">
          <li
            v-for="item in importedData"
            :key="item"
            class="flex items-center gap-3 py-4 text-sm border-b"
          >
            <Database :size="15" class="text-primary shrink-0" /> {{ item }}
          </li>
        </ul>
      </div>
      <div>
        <p class="text-sm font-medium text-primary">Calculated by ffwrapped</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Add the context ESPN leaves between screens
        </h2>
        <div
          class="grid gap-px overflow-hidden border mt-7 bg-border rounded-card sm:grid-cols-2"
        >
          <article
            v-for="view in calculatedViews"
            :key="view.title"
            class="p-5 bg-background"
          >
            <component :is="view.icon" :size="18" class="text-primary" />
            <h3 class="mt-4 font-semibold">{{ view.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              {{ view.description }}
            </p>
            <RouterLink
              v-if="view.href"
              :to="view.href"
              class="inline-block mt-4 text-sm font-medium text-primary hover:underline"
            >
              See how it works →
            </RouterLink>
          </article>
        </div>
      </div>
    </section>

    <section class="border-y bg-muted/30">
      <div class="max-w-6xl px-5 py-16 mx-auto sm:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">
            Public and private leagues
          </p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            A clear connection path for either ESPN setup
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            Private ESPN access needs more information than a public league. The
            page explains the difference before you enter anything.
          </p>
        </div>
        <div class="grid gap-4 mt-9 lg:grid-cols-2">
          <article
            v-for="path in connectionPaths"
            :key="path.label"
            class="p-6 border rounded-card bg-background sm:p-7"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <LockKeyhole
                  v-if="path.label.startsWith('Private')"
                  :size="19"
                  class="text-primary"
                />
                <ShieldCheck v-else :size="19" class="text-primary" />
                <h3 class="text-lg font-semibold">{{ path.label }}</h3>
              </div>
              <Badge variant="outline" class="font-normal">{{
                path.requirement
              }}</Badge>
            </div>
            <p class="mt-5 text-sm leading-6 text-muted-foreground">
              {{ path.description }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="max-w-4xl px-5 py-16 mx-auto sm:py-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">
        ESPN league analyzer questions
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
            Give your ESPN league a deeper view
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
            Choose ESPN on the homepage, connect the right season, and explore
            the league tools available for its imported data.
          </p>
        </div>
        <Button as-child size="lg" variant="secondary" class="relative shrink-0"
          ><RouterLink :to="espnAnalysisRoute">Connect ESPN</RouterLink></Button
        >
      </div>
    </section>
  </PublicPageShell>
</template>
