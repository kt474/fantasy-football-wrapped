<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Separator from "@/components/ui/separator/Separator.vue";
import { renderMarkdown } from "@/lib/markdown";
import type { PremiumReport } from "@/types/types";

defineProps<{
  report: PremiumReport;
}>();
</script>

<template>
  <div class="space-y-4">
    <header class="max-w-5xl">
      <h2 class="max-w-4xl text-3xl font-bold sm:text-4xl text-pretty">
        {{ report.frontPage.headline }}
      </h2>
      <div
        v-html="renderMarkdown(report.frontPage.subheadline)"
        class="max-w-3xl mt-2 text-lg text-muted-foreground"
      ></div>
      <div
        v-html="renderMarkdown(report.frontPage.lead)"
        class="max-w-3xl mt-5 text-base leading-7 text-foreground/90 dark:text-foreground/85"
      ></div>
    </header>

    <Separator />

    <section class="space-y-3">
      <div>
        <h3 class="text-2xl font-semibold">Matchup Reports</h3>
        <p class="text-sm text-muted-foreground">
          This week's head-to-head action.
        </p>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <Card
          v-for="matchup in report.matchupReports"
          :key="`${matchup.bracket}-${matchup.matchupNumber}`"
          class="shadow-sm"
        >
          <CardHeader class="pb-3">
            <CardTitle class="text-base">
              {{ matchup.headline }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              class="text-base leading-7 text-foreground/90 dark:text-foreground/85"
            >
              {{ matchup.recap }}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="text-2xl font-semibold">Team of the Week</h3>
        <p class="text-sm text-muted-foreground">
          The team that defined the week.
        </p>
      </div>
      <Card>
        <CardHeader class="p-4 pb-3">
          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="space-y-0.5">
              <CardTitle class="text-xl">
                {{ report.teamOfTheWeek.teamName }}
              </CardTitle>
              <CardDescription class="text-base">
                {{ report.teamOfTheWeek.headline }}
              </CardDescription>
            </div>
            <div class="shrink-0 sm:text-right">
              <p class="text-2xl font-bold tabular-nums">
                {{ report.teamOfTheWeek.pointsScored }}
              </p>
              <p class="text-xs font-medium uppercase text-muted-foreground">
                Points
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-4 pt-0">
          <p
            class="text-base leading-7 text-foreground/90 dark:text-foreground/85"
          >
            {{ report.teamOfTheWeek.analysis }}
          </p>
        </CardContent>
      </Card>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="max-w-xl text-2xl font-semibold">
          {{ report.weeklyLowlights.headline }}
        </h3>
        <p class="text-sm text-muted-foreground">
          The decisions and performances that went wrong.
        </p>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <Card
          v-for="entry in report.weeklyLowlights.entries"
          :key="`${entry.teamName}-${entry.category}`"
          class="shadow-sm"
        >
          <CardHeader class="gap-y-0.5 p-4 pb-3">
            <CardTitle class="text-xl">
              {{ entry.teamName }}
            </CardTitle>
            <CardDescription class="text-base">
              {{ entry.headline }}
            </CardDescription>
          </CardHeader>
          <CardContent class="p-4 pt-0">
            <p
              class="text-base leading-7 text-foreground/90 dark:text-foreground/85"
            >
              {{ entry.analysis }}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
