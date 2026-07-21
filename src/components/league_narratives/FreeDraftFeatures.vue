<script setup lang="ts">
import { computed, ref } from "vue";

import {
  DRAFT_INSIGHT_PICK_LIMIT,
  getDraftGrade,
  getDraftRoundSummaries,
  getDraftStrategyLabel,
  getDraftTendency,
  type ManagerArchetype,
} from "@/lib/narratives";
import ManagerAvatar from "@/components/shared/ManagerAvatar.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card/Card.vue";

const props = defineProps<{
  archetypes: ManagerArchetype[];
  embedded?: boolean;
}>();

const showAll = ref(false);

const managersWithDraftHistory = computed(() =>
  props.archetypes.filter((manager) => manager.draftHistory?.length)
);

const visibleManagers = computed(() =>
  showAll.value
    ? managersWithDraftHistory.value
    : managersWithDraftHistory.value.slice(0, 3)
);

const hasHiddenManagers = computed(
  () => managersWithDraftHistory.value.length > 3
);

const draftRankByUserId = computed(() => {
  const rankedManagers = props.archetypes
    .filter((manager) => manager.averageDraftPickRank !== null)
    .sort(
      (left, right) =>
        (right.averageDraftPickRank ?? 0) - (left.averageDraftPickRank ?? 0)
    );
  const ranks: Record<string, number> = {};
  rankedManagers.forEach((manager, index) => {
    const previous = rankedManagers[index - 1];
    ranks[manager.userId] =
      previous && previous.averageDraftPickRank === manager.averageDraftPickRank
        ? ranks[previous.userId]
        : index + 1;
  });
  return ranks;
});

const roundSummariesByUserId = computed(() =>
  Object.fromEntries(
    props.archetypes.map((manager) => [
      manager.userId,
      getDraftRoundSummaries(manager.draftHistory ?? []),
    ])
  )
);

const roundSummariesFor = (manager: ManagerArchetype) =>
  roundSummariesByUserId.value[manager.userId] ?? [];

const formatRound = (round: number | null) =>
  round === null ? "Not drafted" : "R" + round.toFixed(1);

const formatCoverage = (draftedCount: number, eligibleDraftCount: number) =>
  draftedCount + "/" + eligibleDraftCount;

const getDraftLabel = (draft: ManagerArchetype["draftHistory"][number]) => {
  const label = draft.draftLabel ?? draft.seasonType;
  return label?.toLowerCase() === "redraft" ? null : label;
};
</script>

<template>
  <div v-if="managersWithDraftHistory.length">
    <component :is="embedded ? 'div' : Card" :class="embedded ? '' : 'p-4 md:p-6'">
      <div v-if="!embedded">
        <p class="text-2xl font-semibold tracking-tight">Draft Tendencies</p>
        <p class="mt-4 text-sm text-muted-foreground sm:max-w-2xl sm:text-base">
          Each manager’s draft day habits, favorite early round positions, and
          historical draft rankings
        </p>
      </div>

      <div class="grid gap-4 mt-4 sm:grid-cols-2 md:grid-cols-3">
        <div
          v-for="manager in visibleManagers"
          :key="manager.userId"
          class="p-4 border rounded-lg"
        >
          <div class="flex items-center gap-3">
            <ManagerAvatar
              :src="manager.avatarImg"
              :alt="`${manager.displayName} avatar`"
            />
            <div>
              <p class="font-semibold">{{ manager.displayName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ manager.draftHistory.length }}
                {{ manager.draftHistory.length === 1 ? "draft" : "drafts" }}
              </p>
            </div>
          </div>

          <Badge
            v-if="getDraftStrategyLabel(manager.draftHistory)"
            variant="secondary"
            class="mt-3"
          >
            {{ getDraftStrategyLabel(manager.draftHistory) }}
          </Badge>

          <p
            v-if="getDraftTendency(manager.draftHistory)"
            class="mt-3 text-sm font-medium leading-relaxed"
          >
            {{ getDraftTendency(manager.draftHistory) }}
          </p>

          <div class="mt-3 space-y-2">
            <div
              v-for="draft in manager.draftHistory"
              :key="draft.season"
              class="flex items-start gap-1.5"
            >
              <span
                class="w-10 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground"
              >
                {{ draft.season }}
              </span>
              <div class="flex flex-wrap items-center gap-1.5">
                <Badge
                  v-if="getDraftLabel(draft)"
                  variant="outline"
                  class="px-1.5 text-[10px]"
                >
                  {{ getDraftLabel(draft) }}
                </Badge>
                <span
                  v-for="(position, index) in draft.positions.slice(
                    0,
                    DRAFT_INSIGHT_PICK_LIMIT
                  )"
                  :key="`${draft.season}-${index}`"
                  class="inline-flex min-w-8 items-center justify-center rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold"
                >
                  {{ position }}
                </span>
              </div>
            </div>
          </div>

          <div class="pt-3 mt-3 space-y-3 border-t">
            <div
              v-for="summary in roundSummariesFor(manager)"
              :key="summary.draftLabel"
            >
              <p
                v-if="roundSummariesFor(manager).length > 1"
                class="mb-1.5 text-xs font-medium text-muted-foreground"
              >
                {{ summary.draftLabel }} timing
              </p>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="px-2.5 py-2 rounded-lg bg-secondary/60">
                  <p
                    class="text-[10px] tracking-wide uppercase text-muted-foreground"
                  >
                    Avg first QB
                  </p>
                  <p class="mt-0.5 font-semibold">
                    {{ formatRound(summary.firstQB.averageRound) }}
                    <span class="text-xs font-normal text-muted-foreground">
                      {{
                        formatCoverage(
                          summary.firstQB.draftedCount,
                          summary.firstQB.eligibleDraftCount
                        )
                      }}
                    </span>
                  </p>
                </div>
                <div
                  v-if="summary.firstTE"
                  class="px-2.5 py-2 rounded-md bg-secondary/60"
                >
                  <p
                    class="text-[10px] tracking-wide uppercase text-muted-foreground"
                  >
                    Avg first TE
                  </p>
                  <p class="mt-0.5 font-semibold">
                    {{ formatRound(summary.firstTE.averageRound) }}
                    <span class="text-xs font-normal text-muted-foreground">
                      {{
                        formatCoverage(
                          summary.firstTE.draftedCount,
                          summary.firstTE.eligibleDraftCount
                        )
                      }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="getDraftGrade(manager.averageDraftPickRank)"
            class="flex items-center justify-between gap-3 pt-3 mt-3 border-t"
          >
            <div>
              <p
                class="text-[10px] tracking-wide uppercase text-muted-foreground"
              >
                Draft results
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Historical pick performance
              </p>
            </div>
            <p class="font-semibold">
              #{{ draftRankByUserId[manager.userId] }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="hasHiddenManagers" class="flex justify-center mt-4">
        <Button
          :aria-label="
            showAll
              ? 'Show fewer draft tendencies'
              : 'Show all draft tendencies'
          "
          @click="showAll = !showAll"
        >
          {{
            showAll
              ? "Show Fewer Tendencies"
              : `Show All Tendencies (${managersWithDraftHistory.length})`
          }}
        </Button>
      </div>
    </component>
  </div>
</template>
