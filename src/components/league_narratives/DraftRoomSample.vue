<script setup lang="ts">
import { ChevronDown, LockKeyhole } from "lucide-vue-next";

import { Badge } from "@/components/ui/badge";
import Card from "@/components/ui/card/Card.vue";

withDefaults(
  defineProps<{
    showLockedControls?: boolean;
  }>(),
  {
    showLockedControls: true,
  }
);

const samplePulse = [
  {
    label: "Room lean",
    value: "RB early",
    detail: "6 of 10 managers emphasize RB most in the opening rounds.",
  },
  {
    label: "QB window",
    value: "Rounds 5–7",
    detail: "Most managers make their first QB pick in this range.",
  },
  {
    label: "Early pressure",
    value: "WR + RB",
    detail:
      "The room creates its heaviest historical demand at these positions.",
  },
];

const sampleRounds = [
  {
    round: 1,
    overallPick: 7,
    picksBeforePick: 6,
    pressureLevel: "High",
    pressure: ["~4–5 RB", "~1–2 WR"],
    guidance:
      "Start with your preferred cornerstone; RB demand is likely to move fastest.",
    threats: "Breece's Puffs, Lamario Kart",
  },
  {
    round: 2,
    overallPick: 14,
    picksBeforePick: 6,
    pressureLevel: "Medium",
    pressure: ["~2–3 WR", "~2 RB"],
    guidance: "Keep both WR and RB paths open as the turn approaches.",
    threats: "Laporta Potty, Bijan Mustard",
  },
  {
    round: 3,
    overallPick: 27,
    picksBeforePick: 12,
    pressureLevel: "High",
    pressure: ["~5–6 WR", "~3 RB"],
    guidance:
      "Consider acting on WR before the room’s strongest historical run.",
    threats: "Lamario Kart, Goal Line Stand",
  },
  {
    round: 4,
    overallPick: 34,
    picksBeforePick: 6,
    pressureLevel: "Low",
    pressure: ["~1–2 QB", "~1 TE"],
    guidance: "There is usually time to stay patient at QB and TE here.",
    threats: "Breece's Puffs",
  },
];

const sampleManagers = [
  {
    name: "Breece's Puffs",
    drafts: 3,
    confidence: "Consistent",
    projected: "RB → WR",
    coverage: "2/3",
    lean: "RB · 58%",
    firstQb: "Round 6.3",
  },
  {
    name: "Lamario Kart",
    drafts: 4,
    confidence: "Strong pattern",
    projected: "WR → WR",
    coverage: "3/4",
    lean: "WR · 64%",
    firstQb: "Round 7.0",
  },
];
</script>

<template>
  <div class="space-y-4">
    <Card class="overflow-hidden shadow-none">
      <div class="p-4 bg-background sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="max-w-2xl">
            <h3 class="heading-card">Positional Draft Plan</h3>
            <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
              Estimates of which positions may thin out before each pick using
              sample league history.
            </p>
          </div>
          <Badge variant="outline">Sample data</Badge>
        </div>

        <div class="grid gap-4 mt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="insight in samplePulse"
            :key="insight.label"
            class="p-4 border rounded-md"
          >
            <p class="text-sm text-muted-foreground">{{ insight.label }}</p>
            <p class="mt-1 text-lg font-semibold tracking-tight">
              {{ insight.value }}
            </p>
            <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
              {{ insight.detail }}
            </p>
          </div>
        </div>

        <div
          v-if="showLockedControls"
          class="grid gap-2 mt-5 sm:grid-cols-2 lg:w-[28rem]"
        >
          <div>
            <p class="text-sm font-medium">Build for</p>
            <div
              class="flex items-center justify-between h-10 px-3 mt-1 text-sm border rounded-md bg-muted/30 text-muted-foreground"
              aria-disabled="true"
            >
              Your team
              <LockKeyhole class="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <p class="text-sm font-medium">Snake draft slot</p>
            <div
              class="flex items-center justify-between h-10 px-3 mt-1 text-sm border rounded-md bg-muted/30 text-muted-foreground"
              aria-disabled="true"
            >
              Slot 7
              <LockKeyhole class="size-3.5" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div
          v-else
          class="flex flex-wrap gap-x-5 gap-y-1 px-4 py-3 mt-5 text-sm border rounded-md bg-muted/20"
        >
          <span><span class="text-muted-foreground">Build for:</span> Your team</span>
          <span><span class="text-muted-foreground">Snake draft slot:</span> 7</span>
        </div>

        <div class="grid gap-4 mt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="round in sampleRounds"
            :key="round.round"
            class="flex flex-col p-4 border rounded-card bg-surface-subtle"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-base font-semibold">
                  Round {{ round.round }}
                  <span class="font-normal text-muted-foreground">
                    #{{ round.overallPick }}
                  </span>
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ round.picksBeforePick }} picks before you
                </p>
              </div>
              <Badge
                :variant="
                  round.pressureLevel === 'High'
                    ? 'destructive'
                    : round.pressureLevel === 'Medium'
                      ? 'warning'
                      : 'info'
                "
                class="whitespace-nowrap"
              >
                {{ round.pressureLevel }}
              </Badge>
            </div>

            <div class="flex flex-wrap gap-1 mt-3">
              <Badge
                v-for="position in round.pressure"
                :key="position"
                variant="secondary"
              >
                {{ position }}
              </Badge>
            </div>
            <p class="mt-3 text-sm leading-relaxed">{{ round.guidance }}</p>
            <p class="pt-3 mt-auto text-sm">
              Likely position drafters: {{ round.threats }}
            </p>
          </div>
        </div>
      </div>
    </Card>

    <Card class="overflow-hidden shadow-none">
      <div class="p-3 sm:px-4 sm:py-3">
        <h3 class="heading-card">Manager Draft Patterns</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          Opening patterns, position timing, and recent strategy shifts.
        </p>
      </div>

      <div class="border-t bg-background">
        <div
          v-for="manager in sampleManagers"
          :key="manager.name"
          class="grid items-center grid-cols-2 gap-2 px-3 py-3 border-b last:border-b-0 sm:grid-cols-[minmax(180px,1.3fr)_1fr_1fr_1fr_auto] sm:gap-3 sm:px-4"
        >
          <div class="min-w-0 col-span-2 sm:col-span-1">
            <p class="font-semibold truncate">{{ manager.name }}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span class="text-sm text-muted-foreground">
                {{ manager.drafts }} drafts
              </span>
              <Badge variant="outline">{{ manager.confidence }}</Badge>
            </div>
          </div>
          <div class="col-span-2 sm:col-span-1">
            <p class="text-xs text-muted-foreground">Projected</p>
            <p class="mt-0.5 text-sm font-semibold">
              {{ manager.projected }}
              <span class="font-normal text-muted-foreground">
                · {{ manager.coverage }}
              </span>
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Early lean</p>
            <p class="mt-0.5 text-sm font-semibold">{{ manager.lean }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">First QB</p>
            <p class="mt-0.5 text-sm font-semibold">{{ manager.firstQb }}</p>
          </div>
          <ChevronDown
            class="hidden size-4 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </div>
      </div>
    </Card>
  </div>
</template>
