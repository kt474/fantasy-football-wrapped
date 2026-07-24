<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Check,
  Crown,
  History,
  Medal,
  Scale,
  Swords,
  Trophy,
} from "lucide-vue-next";

const sampleManagers = [
  {
    rank: 1,
    name: "Breece's Puffs",
    record: "46–22",
    ppg: "128.6",
    luck: "+1.4",
    seasons: 5,
  },
  {
    rank: 2,
    name: "Lamario Kart",
    record: "41–27",
    ppg: "126.9",
    luck: "–0.8",
    seasons: 5,
  },
  {
    rank: 3,
    name: "Waiver Weather",
    record: "36–32",
    ppg: "122.4",
    luck: "+2.1",
    seasons: 4,
  },
  {
    rank: 4,
    name: "Monday Regret",
    record: "31–37",
    ppg: "119.8",
    luck: "–1.9",
    seasons: 5,
  },
];

const archiveViews = [
  {
    number: "01",
    icon: Trophy,
    title: "All-time standings",
    description:
      "Combine wins, losses, points per game, wins above expected, lineup efficiency, seasons played, and championships into one current-manager table.",
    detail: "Career record · PPG · expected wins · efficiency",
  },
  {
    number: "02",
    icon: Medal,
    title: "Season finish history",
    description:
      "See where every manager finished in every available season, with champions marked and each year linked back to its original league view.",
    detail: "Final placement · titles · season links",
  },
  {
    number: "03",
    icon: Swords,
    title: "Head-to-head matchups",
    description:
      "Compare current manager pairings across the available archive, including rivalry records, closest matchups, and the blowouts nobody has been allowed to forget.",
    detail: "H2H record · close games · biggest margins",
  },
];

const recordCards = [
  {
    icon: Crown,
    label: "Highest weekly score",
    value: "184.72",
    note: "Breece's Puffs · 2023 Week 11",
  },
  {
    icon: Scale,
    label: "Closest matchup",
    value: "0.14 pts",
    note: "Lamario Kart over Waiver Weather",
  },
  {
    icon: History,
    label: "Best career record",
    value: "46–22",
    note: "Five connected seasons",
  },
];

const faqs = [
  {
    question: "What is included in fantasy football league history?",
    answer:
      "ffwrapped combines available seasons into all-time standings, season finishes, championships, head-to-head matchup records, scoring highs and lows, close games, blowouts, expected-win luck, and manager efficiency.",
  },
  {
    question: "How are managers matched across different seasons?",
    answer:
      "Connected platform and roster data are used to associate managers with their available seasons. Team names can change without erasing the manager’s underlying history.",
  },
  {
    question: "Can I open an older season from the history page?",
    answer:
      "Yes. Available years appear beside each manager, and connected seasons can be opened to inspect that season’s original league analysis.",
  },
  {
    question: "Why might an older season be missing?",
    answer:
      "Historical coverage depends on the seasons and matchup data available from the connected platform. A season without usable league data cannot be included in the all-time calculations.",
  },
];
</script>

<template>
  <PublicPageShell>
    <section class="relative overflow-hidden border-b">
      <div aria-hidden="true" class="history-lines absolute inset-0"></div>
      <div
        class="relative grid gap-12 px-5 py-16 mx-auto max-w-6xl sm:py-24 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,1.02fr)] lg:items-center"
      >
        <div>
          <Badge variant="secondary"
            >Your league’s multi-season record book</Badge
          >
          <h1
            class="max-w-3xl mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
          >
            Fantasy football league history built from every available season
          </h1>
          <p class="max-w-2xl mt-5 text-lg leading-8 text-muted-foreground">
            Turn years of standings and matchups into all-time records,
            championship history, scoring milestones, and head-to-head receipts
            across the connected archive.
          </p>
          <div class="flex flex-wrap gap-3 mt-8">
            <Button as-child size="lg"
              ><RouterLink to="/">Open your league history</RouterLink></Button
            >
            <Button as-child size="lg" variant="outline"
              ><RouterLink to="/fantasy-football-power-rankings"
                >View power rankings</RouterLink
              ></Button
            >
          </div>
          <div
            class="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-muted-foreground"
          >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> All-time standings</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Championships and finishes</span
            >
            <span class="inline-flex items-center gap-1.5"
              ><Check :size="14" /> Manager rivalries</span
            >
          </div>
        </div>

        <div
          class="overflow-hidden border shadow-xl rounded-card bg-card shadow-black/10"
        >
          <div
            class="flex items-center justify-between gap-4 px-5 py-4 border-b"
          >
            <div>
              <p
                class="text-xs font-medium tracking-wide uppercase text-muted-foreground"
              >
                Sample record book
              </p>
              <h2 class="mt-1 font-semibold">All-time league standings</h2>
            </div>
            <Badge variant="outline" class="font-normal">2019–2024</Badge>
          </div>
          <div
            class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 text-xs font-medium border-b bg-muted/30 text-muted-foreground sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <span>Manager</span><span>Record</span><span>PPG</span
            ><span class="hidden sm:block">WAE</span>
          </div>
          <ol>
            <li
              v-for="manager in sampleManagers"
              :key="manager.name"
              class="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 border-b last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  <span class="mr-2 text-muted-foreground"
                    >{{ manager.rank }}.</span
                  >{{ manager.name }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ manager.seasons }} seasons
                </p>
              </div>
              <span class="text-sm font-semibold tabular-nums">{{
                manager.record
              }}</span>
              <span
                class="text-xs text-right text-muted-foreground tabular-nums"
                >{{ manager.ppg }}</span
              >
              <span
                class="hidden w-10 text-xs text-right tabular-nums sm:block"
                :class="
                  manager.luck.startsWith('+')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                "
                >{{ manager.luck }}</span
              >
            </li>
          </ol>
          <div
            class="flex items-center gap-2 px-5 py-4 text-xs border-t bg-muted/30 text-muted-foreground"
          >
            <BookOpen :size="15" class="text-primary" /> Sample data · WAE means
            wins above expected.
          </div>
        </div>
      </div>
    </section>

    <section
      class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[0.65fr_1.35fr]"
    >
      <div class="lg:sticky lg:top-24 lg:self-start">
        <p class="text-sm font-medium text-primary">
          One archive, several answers
        </p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Settle the argument with the right record
        </h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          Career success, peak seasons, and rivalry dominance are different
          claims. The history view keeps their evidence separate.
        </p>
      </div>
      <ol class="border-t">
        <li
          v-for="view in archiveViews"
          :key="view.number"
          class="grid gap-4 py-7 border-b sm:grid-cols-[3rem_minmax(0,1fr)]"
        >
          <div>
            <span class="text-xs font-medium text-muted-foreground">{{
              view.number
            }}</span
            ><component :is="view.icon" :size="18" class="mt-3 text-primary" />
          </div>
          <div>
            <div
              class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
            >
              <h3 class="text-xl font-semibold">{{ view.title }}</h3>
              <p class="text-xs text-primary">{{ view.detail }}</p>
            </div>
            <p class="mt-3 leading-7 text-muted-foreground">
              {{ view.description }}
            </p>
          </div>
        </li>
      </ol>
    </section>

    <section class="border-y bg-muted/30">
      <div class="px-5 py-16 mx-auto max-w-6xl sm:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-medium text-primary">The league ledger</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight">
            Records that survive longer than the group chat
          </h2>
          <p class="mt-4 leading-7 text-muted-foreground">
            The archive preserves both career totals and the single matchups
            that became league folklore.
          </p>
        </div>
        <div class="grid gap-4 mt-10 lg:grid-cols-3">
          <article
            v-for="record in recordCards"
            :key="record.label"
            class="p-6 border rounded-card bg-background sm:p-7"
          >
            <div class="flex items-center justify-between">
              <component
                :is="record.icon"
                :size="20"
                class="text-primary"
              /><span class="text-xs text-muted-foreground">Sample record</span>
            </div>
            <p
              class="mt-8 text-xs font-medium tracking-wide uppercase text-muted-foreground"
            >
              {{ record.label }}
            </p>
            <p class="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {{ record.value }}
            </p>
            <p class="mt-3 text-sm text-muted-foreground">{{ record.note }}</p>
          </article>
        </div>
      </div>
    </section>

    <section
      class="grid gap-10 px-5 py-16 mx-auto max-w-6xl sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center"
    >
      <div>
        <p class="text-sm font-medium text-primary">Connected seasons</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight">
          Follow the managers, even when team names change
        </h2>
        <p class="mt-4 leading-7 text-muted-foreground">
          ffwrapped walks through the available league seasons and compiles
          manager performance into one record. Each successfully loaded year can
          be opened, so an all-time total can be traced back to the season that
          produced it.
        </p>
      </div>
      <div class="p-6 border rounded-card bg-card">
        <div class="flex items-center gap-3 pb-5 border-b">
          <History :size="19" class="text-primary" />
          <div>
            <p class="text-xs text-muted-foreground">League archive</p>
            <p class="font-semibold">Five seasons connected</p>
          </div>
        </div>
        <ol class="mt-5 space-y-4">
          <li
            v-for="(season, index) in ['2024', '2023', '2022', '2021', '2020']"
            :key="season"
            class="flex items-center gap-4"
          >
            <span
              class="flex items-center justify-center w-7 h-7 text-xs font-medium rounded-full"
              :class="
                index === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-background'
              "
              >{{ index + 1 }}</span
            >
            <div class="flex-1 h-px bg-border"></div>
            <span class="text-sm font-medium tabular-nums">{{ season }}</span>
            <Crown v-if="index === 1" :size="15" class="text-primary" />
          </li>
        </ol>
      </div>
    </section>

    <section class="max-w-4xl px-5 pb-16 mx-auto sm:pb-20">
      <p class="text-sm font-medium text-primary">Frequently asked questions</p>
      <h2 class="mt-2 text-3xl font-semibold tracking-tight">
        Fantasy football league history questions
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

    <section class="px-5 pb-4 mx-auto max-w-6xl">
      <div
        class="relative flex flex-col items-start gap-6 p-7 overflow-hidden border rounded-feature bg-primary text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-9"
      >
        <div
          aria-hidden="true"
          class="absolute rounded-full -right-20 -top-32 h-72 w-72 bg-white/10"
        ></div>
        <div class="relative">
          <h2 class="text-2xl font-semibold tracking-tight">
            Build the record book your league never kept
          </h2>
          <p class="max-w-2xl mt-2 leading-7 text-primary-foreground/80">
            Connect the league, open League History, and turn every available
            season into permanent bragging rights.
          </p>
        </div>
        <div class="relative flex flex-wrap gap-3">
          <Button as-child size="lg" variant="secondary"
            ><RouterLink to="/">Explore league history</RouterLink></Button
          >
          <Button
            as-child
            size="lg"
            variant="outline"
            class="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            ><RouterLink
              to="/fantasy-football-manager-profiles-rivalry-report-example"
              >View profiles &amp; rivalry example</RouterLink
            ></Button
          >
        </div>
      </div>
    </section>
  </PublicPageShell>
</template>

<style scoped>
.history-lines {
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 84px,
      hsl(var(--border) / 0.28) 84px 85px
    ),
    linear-gradient(to bottom, hsl(var(--muted) / 0.25), transparent 78%);
  mask-image: linear-gradient(to bottom, black, transparent 92%);
}
</style>
