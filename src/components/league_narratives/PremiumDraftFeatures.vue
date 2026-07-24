<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  getDraftRoomPulse,
  getDraftRoomCheatSheetSummary,
  getDraftStrategyResult,
  getDraftStrategyShifts,
  getLeagueRelativeDraftInsights,
  getPositionalDraftPlan,
  type ManagerArchetype,
} from "@/lib/narratives";
import ManagerAvatar from "@/components/shared/ManagerAvatar.vue";
import { Badge } from "@/components/ui/badge";
import Card from "@/components/ui/card/Card.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const props = defineProps<{
  archetypes: ManagerArchetype[];
  draftRoomArchetypes?: ManagerArchetype[];
  leagueSize?: number;
  embedded?: boolean;
}>();

const draftRoomManagers = computed(
  () => props.draftRoomArchetypes ?? props.archetypes
);
const draftRoomLeagueSize = computed(() =>
  Math.max(
    1,
    Math.round(props.leagueSize ?? draftRoomManagers.value.length) || 1
  )
);

const premiumInsightsByUserId = computed(() =>
  Object.fromEntries(
    draftRoomManagers.value.map((manager) => [
      manager.userId,
      {
        relative: getLeagueRelativeDraftInsights(
          manager,
          draftRoomManagers.value
        ),
        strategyResult: getDraftStrategyResult(manager.draftHistory ?? []),
        shifts: getDraftStrategyShifts(manager.draftHistory ?? []),
      },
    ])
  )
);

const premiumInsightsFor = (manager: ManagerArchetype) =>
  premiumInsightsByUserId.value[manager.userId];

const cheatSheetRows = computed(() =>
  draftRoomManagers.value.flatMap((manager) => {
    const summary = getDraftRoomCheatSheetSummary(manager.draftHistory ?? []);
    return summary ? [{ manager, summary }] : [];
  })
);

const draftRoomPulse = computed(() =>
  getDraftRoomPulse(draftRoomManagers.value)
);
const draftRoomPulseGridClass = computed(() => {
  if (draftRoomPulse.value.length >= 4) return "lg:grid-cols-4";
  if (draftRoomPulse.value.length === 3) return "lg:grid-cols-3";
  return "lg:grid-cols-2";
});

const selectedPlanManagerId = ref(props.archetypes[0]?.userId ?? "");
const selectedDraftSlot = ref("1");
const draftSlotOptions = computed(() =>
  Array.from({ length: draftRoomLeagueSize.value }, (_, index) =>
    String(index + 1)
  )
);
const selectedPlanManager = computed(
  () =>
    draftRoomManagers.value.find(
      (manager) => manager.userId === selectedPlanManagerId.value
    ) ?? cheatSheetRows.value[0]?.manager
);
const positionalDraftPlan = computed(() => {
  const manager = selectedPlanManager.value;
  return manager
    ? getPositionalDraftPlan(
        manager,
        draftRoomManagers.value,
        Number(selectedDraftSlot.value),
        draftRoomLeagueSize.value
      )
    : null;
});

watch(
  cheatSheetRows,
  (rows) => {
    if (
      rows.length &&
      !rows.some((row) => row.manager.userId === selectedPlanManagerId.value)
    ) {
      selectedPlanManagerId.value = rows[0].manager.userId;
    }
    if (Number(selectedDraftSlot.value) > draftRoomLeagueSize.value) {
      selectedDraftSlot.value = String(draftRoomLeagueSize.value);
    }
  },
  { immediate: true }
);

const hasDetailedPremiumInsights = (manager: ManagerArchetype) => {
  const insights = premiumInsightsFor(manager);
  return Boolean(
    insights?.relative.length ||
    insights?.strategyResult ||
    insights?.shifts.length
  );
};

const formatStrategyResult = (manager: ManagerArchetype) => {
  const result = premiumInsightsFor(manager)?.strategyResult;
  if (!result) return "";

  const playoffResult =
    result.playoffAppearances === result.seasons
      ? `made the playoffs in all ${result.seasons} completed seasons`
      : result.playoffAppearances === 0
        ? `missed the playoffs in all ${result.seasons} completed seasons`
        : `made the playoffs in ${result.playoffAppearances} of ${result.seasons} completed seasons`;
  const pointsResult =
    result.averagePoints === null
      ? ""
      : ` Those teams averaged ${Math.round(result.averagePoints).toLocaleString()} points.`;

  return `The ${result.opening} opening ${playoffResult}.${pointsResult}`;
};

const formatExpectedPositionPicks = (
  position: string,
  expectedPicks: number
) => {
  if (expectedPicks < 1) return `< 1 ${position} pick`;

  const lower = Math.floor(expectedPicks);
  const upper = Math.ceil(expectedPicks);
  const estimate = lower === upper ? String(lower) : `${lower}–${upper}`;
  return `~${estimate} ${position}`;
};
</script>

<template>
  <component
    :is="embedded ? 'div' : Card"
    v-if="cheatSheetRows.length"
    :class="embedded ? '' : 'p-4 md:p-6'"
  >
    <div
      v-if="!embedded"
      class="flex flex-wrap items-start justify-between gap-4"
    >
      <div class="flex min-w-0 gap-3">
        <div>
          <h2 class="heading-section">Draft Room</h2>
          <p class="mt-4 text-sm sm:text-base text-muted-foreground">
            Plan your draft and scout every league mate from one specific
            workspace.
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4 space-y-4">
      <Card class="overflow-hidden shadow-none">
        <div
          v-if="positionalDraftPlan"
          class="p-4 bg-background sm:p-5"
          data-testid="positional-draft-plan"
        >
          <div class="max-w-2xl">
            <h3 class="heading-card">Positional Draft Plan</h3>
            <p
              class="max-w-lg mt-1 text-sm leading-relaxed text-muted-foreground"
            >
              Estimates of which positions may thin out before each pick using
              this league’s
              {{ positionalDraftPlan.draftLabel.toLowerCase() }} draft history.
            </p>
          </div>

          <div
            v-if="draftRoomPulse.length"
            class="grid gap-4 mt-5 sm:grid-cols-2"
            :class="draftRoomPulseGridClass"
          >
            <div
              v-for="insight in draftRoomPulse"
              :key="insight.label"
              class="p-4 border rounded-md"
            >
              <p class="text-sm text-muted-foreground">
                {{ insight.label }}
              </p>
              <p class="mt-1 text-lg font-semibold tracking-tight">
                {{ insight.value }}
              </p>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                {{ insight.detail }}
              </p>
            </div>
          </div>

          <div class="grid gap-2 mt-5 sm:grid-cols-2 lg:w-[28rem]">
            <div>
              <label for="draft-plan-manager" class="text-sm font-medium">
                Build for
              </label>
              <Select v-model="selectedPlanManagerId">
                <SelectTrigger id="draft-plan-manager" class="w-full mt-1">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="row in cheatSheetRows"
                    :key="row.manager.userId"
                    :value="row.manager.userId"
                  >
                    {{ row.manager.displayName }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label for="draft-plan-slot" class="text-sm font-medium">
                Snake draft slot
              </label>
              <Select v-model="selectedDraftSlot">
                <SelectTrigger id="draft-plan-slot" class="w-full mt-1">
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="slot in draftSlotOptions"
                    :key="slot"
                    :value="slot"
                  >
                    Slot {{ slot }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid gap-4 mt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="round in positionalDraftPlan.rounds"
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
                    {{ round.picksBeforePick }}
                    {{ round.picksBeforePick === 1 ? "pick" : "picks" }}
                    before you
                  </p>
                </div>
                <Badge
                  :variant="
                    round.pressureLevel === 'High'
                      ? 'destructive'
                      : round.pressureLevel === 'Medium'
                        ? 'warning'
                        : round.pressureLevel === 'Low'
                          ? 'info'
                          : 'outline'
                  "
                  class="whitespace-nowrap"
                >
                  {{ round.pressureLevel }}
                </Badge>
              </div>

              <div v-if="round.pressure.length" class="mt-2">
                <div class="flex flex-wrap gap-1 mt-1">
                  <Badge
                    v-for="position in round.pressure"
                    :key="position.position"
                    variant="secondary"
                    class="px-2.5"
                  >
                    {{
                      formatExpectedPositionPicks(
                        position.position,
                        position.expectedPicks
                      )
                    }}
                  </Badge>
                </div>
              </div>

              <p class="mt-2 text-sm leading-relaxed">
                {{ round.guidance }}
              </p>
              <div class="pt-3 mt-auto text-sm">
                <p v-if="round.threats.length">
                  Likely {{ round.pressure[0]?.position }} drafters:
                  {{ round.threats.join(", ") }}
                </p>
              </div>
            </div>
          </div>
          <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
            Position estimates show how many players opponents may draft at each
            position before your pick. Pressure summarizes demand for the
            busiest position.
          </p>
        </div>
      </Card>

      <Card class="overflow-hidden shadow-none">
        <div
          class="flex flex-wrap items-start justify-between gap-3 p-3 sm:px-4 sm:py-3"
        >
          <div class="flex min-w-0 gap-3">
            <div>
              <h3 class="heading-card">Manager Draft Patterns</h3>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                Opening patterns, position timing, and recent strategy shifts.
              </p>
            </div>
          </div>
        </div>

        <Accordion type="multiple" class="w-full border-t bg-background">
          <AccordionItem
            v-for="row in cheatSheetRows"
            :key="row.manager.userId"
            :value="row.manager.userId"
            class="px-3 last:border-b-0 sm:px-4"
          >
            <AccordionTrigger class="py-2.5 hover:no-underline">
              <div
                class="grid flex-1 min-w-0 grid-cols-2 gap-2 pr-3 text-left sm:grid-cols-[minmax(180px,1.3fr)_1fr_1fr_1fr] sm:gap-3"
              >
                <div
                  class="flex items-center min-w-0 col-span-2 gap-2.5 sm:col-span-1"
                >
                  <ManagerAvatar
                    :src="row.manager.avatarImg"
                    :alt="row.manager.displayName + ' avatar'"
                  />
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <p class="font-semibold truncate">
                        {{ row.manager.displayName }}
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span class="text-sm text-muted-foreground">
                        {{ row.summary.trackedDrafts }}
                        {{
                          row.summary.trackedDrafts === 1 ? "draft" : "drafts"
                        }}
                      </span>
                      <Badge variant="outline">
                        {{ row.summary.patternStrength }}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div class="min-w-0 col-span-2 mt-1 sm:col-span-1">
                  <p class="text-xs text-muted-foreground">Projected</p>
                  <p
                    v-if="row.summary.projectedPositions"
                    class="mt-0.5 text-sm font-semibold sm:whitespace-nowrap"
                  >
                    {{ row.summary.projectedPositions.join(" → ") }}
                    <span class="font-normal text-muted-foreground">
                      · {{ row.summary.projectedObservedCount }}/{{
                        row.summary.trackedDrafts
                      }}
                    </span>
                  </p>
                  <p v-else class="mt-0.5 text-sm text-muted-foreground">
                    No pattern
                  </p>
                </div>

                <div class="min-w-0 mt-1">
                  <p class="text-xs text-muted-foreground">Early lean</p>
                  <p
                    v-if="row.summary.dominantPosition"
                    class="mt-0.5 text-sm font-semibold sm:whitespace-nowrap"
                  >
                    {{ row.summary.dominantPosition }}
                    <span class="font-normal text-muted-foreground">
                      ·
                      {{ Math.round(row.summary.dominantPositionShare * 100) }}%
                    </span>
                  </p>
                  <p v-else class="mt-0.5 text-sm text-muted-foreground">—</p>
                </div>

                <div class="min-w-0 mt-1">
                  <p class="text-xs text-muted-foreground">First QB</p>
                  <p
                    v-if="row.summary.averageFirstQBRound !== null"
                    class="mt-0.5 text-sm font-semibold sm:whitespace-nowrap"
                  >
                    Round {{ row.summary.averageFirstQBRound.toFixed(1) }}
                    <span class="font-normal text-muted-foreground">
                      · {{ row.summary.firstQBDraftCount }}/{{
                        row.summary.trackedDrafts
                      }}
                    </span>
                  </p>
                  <p
                    v-else
                    class="mt-0.5 text-sm text-muted-foreground sm:whitespace-nowrap"
                  >
                    Not drafted
                    <span class="text-xs">
                      · {{ row.summary.firstQBDraftCount }}/{{
                        row.summary.trackedDrafts
                      }}
                    </span>
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <div
                v-if="hasDetailedPremiumInsights(row.manager)"
                class="grid gap-3 p-3 border rounded-card bg-surface-subtle sm:grid-cols-2"
              >
                <div v-if="premiumInsightsFor(row.manager)?.shifts.length">
                  <p class="text-sm font-semibold">Recent strategy shift</p>
                  <ul
                    class="mt-1.5 space-y-1 text-sm leading-relaxed text-muted-foreground"
                  >
                    <li
                      v-for="insight in premiumInsightsFor(row.manager)?.shifts"
                      :key="insight"
                    >
                      {{ insight }}
                    </li>
                  </ul>
                </div>

                <div v-if="premiumInsightsFor(row.manager)?.relative.length">
                  <p class="text-sm font-semibold">League relative scouting</p>
                  <ul
                    class="mt-1.5 space-y-1 text-sm leading-relaxed text-muted-foreground"
                  >
                    <li
                      v-for="insight in premiumInsightsFor(row.manager)
                        ?.relative"
                      :key="insight"
                    >
                      {{ insight }}
                    </li>
                  </ul>
                </div>

                <div v-if="premiumInsightsFor(row.manager)?.strategyResult">
                  <p class="text-sm font-semibold">Strategy results</p>
                  <p
                    class="mt-1.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {{ formatStrategyResult(row.manager) }}
                  </p>
                </div>
              </div>
              <p
                v-else
                class="p-3 text-sm leading-relaxed border rounded-card bg-surface-subtle text-muted-foreground"
              >
                More comparable drafts are needed before showing league relative
                scouting or strategy-result connections.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>

    <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
      History-powered estimates vary with available comparable drafts. One-draft
      and sparse-history leagues may only show early or limited signals.
    </p>
  </component>
</template>
