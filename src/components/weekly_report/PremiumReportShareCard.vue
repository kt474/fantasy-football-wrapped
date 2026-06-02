<script setup lang="ts">
import type { PremiumLeagueReport } from "@/types/premiumReport";

const props = defineProps<{
  leagueName?: string;
  week: number;
  report: PremiumLeagueReport;
}>();

const featuredSections = props.report.sections.slice(0, 2);
</script>

<template>
  <div
    class="box-border flex min-h-[1350px] w-[1080px] flex-col bg-background p-10 text-foreground"
  >
    <header class="border-b pb-7">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img
            height="30"
            width="30"
            src="../../assets/football-helmet.webp"
            class="h-8 w-8"
            alt="ffwrapped logo"
          />
          <span class="text-3xl font-semibold tracking-tight">
            <span class="text-primary">ff</span>wrapped
          </span>
        </div>
        <div class="rounded-md border px-4 py-2 text-lg font-semibold">
          League Report
        </div>
      </div>
      <div class="mt-10">
        <p class="text-xl font-medium uppercase text-muted-foreground">
          {{ props.report.eyebrow || `Week ${props.week} League Report` }}
        </p>
        <h1 class="mt-3 max-w-[920px] text-6xl font-bold leading-tight">
          {{ props.report.headline }}
        </h1>
        <p class="mt-5 max-w-[850px] text-2xl leading-9 text-muted-foreground">
          {{ props.report.intro }}
        </p>
      </div>
    </header>

    <main class="grid flex-1 grid-cols-2 gap-5 py-7">
      <section
        v-for="section in featuredSections"
        :key="`${section.kicker}-${section.title}`"
        class="flex flex-col rounded-xl border bg-card p-6"
      >
        <p class="text-lg font-semibold uppercase text-primary">
          {{ section.kicker }}
        </p>
        <h2 class="mt-2 text-4xl font-bold leading-tight">
          {{ section.title }}
        </h2>
        <p class="mt-4 text-2xl leading-9 text-muted-foreground">
          {{ section.body }}
        </p>
      </section>
    </main>

    <section class="rounded-xl border bg-secondary p-6">
      <p class="text-lg font-semibold uppercase text-muted-foreground">
        Share caption
      </p>
      <p class="mt-2 text-3xl font-semibold leading-10">
        {{ props.report.shareCaption }}
      </p>
    </section>

    <footer class="mt-7 flex items-center justify-between text-xl">
      <p class="font-medium">{{ props.leagueName || "Your League" }}</p>
      <p class="text-muted-foreground">
        Built with <span class="font-semibold text-primary">ffwrapped.com</span>
      </p>
    </footer>
  </div>
</template>
